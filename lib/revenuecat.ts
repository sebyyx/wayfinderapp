import 'server-only';
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

// ── Revenue (RevenueCat v2 "Overview metrics" API) ───────────────────────────
// Returns the same headline numbers as the RevenueCat dashboard Overview:
// MRR, active subscriptions, active trials, 28-day revenue, 28-day new customers.
// Requires a v2 secret API key (REVENUECAT_API_KEY) + project id.

const RC_BASE = 'https://api.revenuecat.com/v2';

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

    const json = (await res.json()) as { metrics?: Array<{ id: string; value: number; unit?: string }> };
    const metrics = json.metrics ?? [];
    const get = (id: string) => metrics.find((m) => m.id === id)?.value ?? null;

    return {
      available: true,
      mrr: get('mrr'),
      activeSubscriptions: get('active_subscriptions'),
      activeTrials: get('active_trials'),
      revenue28d: get('revenue'),
      newCustomers28d: get('new_customers'),
      currency: metrics.find((m) => m.id === 'mrr')?.unit ?? 'USD',
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
