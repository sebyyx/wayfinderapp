import 'server-only';
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

// ── Revenue (RevenueCat v2 "Overview metrics" API) ───────────────────────────
// Returns the same headline numbers as the RevenueCat dashboard Overview:
// MRR, active subscriptions, active trials, 28-day revenue, 28-day new customers.
// Requires a v2 secret API key (REVENUECAT_API_KEY) + project id.

const RC_BASE = 'https://api.revenuecat.com/v2';
const RC_V1 = 'https://api.revenuecat.com/v1';

// Entitlement ids must match the RevenueCat dashboard + the app's
// tierFromCustomerInfo (navigator = monthly, voyager = lifetime).
const TIER_ENTITLEMENT: Record<'monthly' | 'lifetime', { id: string; duration: string }> = {
  monthly: { id: 'navigator', duration: 'monthly' },
  lifetime: { id: 'voyager', duration: 'lifetime' },
};
const ALL_ENTITLEMENTS = ['navigator', 'voyager'];

export type GrantResult = { ok: boolean; error?: string };

// Applies an admin tier change as a RevenueCat *promotional* entitlement so the
// app (which reads RC, not profiles) actually honors it. Promotional grants
// never touch real paid subscriptions; revoking only clears promo grants.
//   monthly  → grant navigator (1 month), revoke voyager promo
//   lifetime → grant voyager (lifetime), revoke navigator promo
//   free     → revoke both promo grants
export async function applyTierToRevenueCat(
  appUserId: string,
  tier: 'free' | 'monthly' | 'lifetime',
): Promise<GrantResult> {
  const key = env.revenueCatSecretKey();
  if (!key) return { ok: false, error: 'RevenueCat secret key not configured' };

  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const sub = encodeURIComponent(appUserId);

  const revoke = (ent: string) =>
    fetch(`${RC_V1}/subscribers/${sub}/entitlements/${ent}/revoke_promotionals`, {
      method: 'POST',
      headers,
    });

  try {
    if (tier === 'free') {
      await Promise.all(ALL_ENTITLEMENTS.map(revoke));
      return { ok: true };
    }

    const { id, duration } = TIER_ENTITLEMENT[tier];
    // Clear the other tier's promo so two entitlements aren't active at once.
    await Promise.all(ALL_ENTITLEMENTS.filter((e) => e !== id).map(revoke));

    const res = await fetch(`${RC_V1}/subscribers/${sub}/entitlements/${id}/promotional`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ duration }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `RevenueCat ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'RevenueCat request failed' };
  }
}

export type RevenueMetrics = {
  available: boolean;
  mrr: number | null;
  activeSubscriptions: number | null;
  activeTrials: number | null;
  revenue28d: number | null;
  newCustomers28d: number | null;
  currency: string;
};

const EMPTY_REVENUE: RevenueMetrics = {
  available: false,
  mrr: null,
  activeSubscriptions: null,
  activeTrials: null,
  revenue28d: null,
  newCustomers28d: null,
  currency: 'USD',
};

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const apiKey = env.revenueCatApiKey();
  const projectId = env.revenueCatProjectId();
  if (!apiKey || !projectId) return EMPTY_REVENUE;

  try {
    const res = await fetch(`${RC_BASE}/projects/${projectId}/metrics/overview`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      // RevenueCat refreshes overview metrics roughly hourly; don't hammer it.
      next: { revalidate: 1800 },
    });
    if (!res.ok) return EMPTY_REVENUE;

    const json = (await res.json()) as {
      currency?: string;
      metrics?: Array<{ id: string; value: number; unit?: string }>;
    };
    const metrics = json.metrics ?? [];
    const get = (id: string) => metrics.find((m) => m.id === id)?.value ?? null;

    return {
      available: true,
      mrr: get('mrr'),
      activeSubscriptions: get('active_subscriptions'),
      activeTrials: get('active_trials'),
      revenue28d: get('revenue'),
      newCustomers28d: get('new_customers'),
      currency: json.currency ?? 'USD',
    };
  } catch {
    return EMPTY_REVENUE;
  }
}

// ── Churn (computed from stored RevenueCat webhook events) ────────────────────
// RevenueCat's overview API doesn't expose churn, so we derive it from the
// webhook event stream we persist in `rc_events` (see the webhook route + the
// 0005_rc_events migration). EXPIRATION = a subscription actually ended (real
// churn); CANCELLATION = auto-renew turned off (a leading indicator).

export type ChurnMetrics = {
  hasData: boolean;
  expired30d: number;
  cancelled30d: number;
  churnRate: number | null; // % over the last 30 days
};

export async function getChurnMetrics(activeSubscriptions: number | null): Promise<ChurnMetrics> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  try {
    const countByType = async (types: string[]) => {
      const { count } = await sb
        .from('rc_events')
        .select('*', { count: 'exact', head: true })
        .in('type', types)
        .gte('event_at', since);
      return count ?? 0;
    };

    const [expired30d, cancelled30d] = await Promise.all([
      countByType(['EXPIRATION', 'BILLING_ISSUE']),
      countByType(['CANCELLATION']),
    ]);

    // No events yet (table empty / webhook not wired) → no churn signal.
    const totalEvents = expired30d + cancelled30d;
    const { count: anyEvents } = await sb
      .from('rc_events')
      .select('*', { count: 'exact', head: true });

    const base = (activeSubscriptions ?? 0) + expired30d;
    const churnRate = base > 0 ? Math.round((expired30d / base) * 1000) / 10 : null;

    return {
      hasData: (anyEvents ?? 0) > 0,
      expired30d,
      cancelled30d,
      churnRate: totalEvents === 0 && (anyEvents ?? 0) === 0 ? null : churnRate,
    };
  } catch {
    // Table doesn't exist yet → migration not run.
    return { hasData: false, expired30d: 0, cancelled30d: 0, churnRate: null };
  }
}
