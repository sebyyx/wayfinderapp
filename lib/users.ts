import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-user admin view. Joins three sources:
//   profiles            → name, archetype, subscription_tier (authoritative
//                         in-app access flag), created_at
//   auth.users          → email (profiles has no email column)
//   rc_events           → real billing facts derived from the stored RevenueCat
//                         webhook stream: last payment + next due date + store
//   movement_syncs      → last activity (most recent sync)
//
// Pre-launch scale, so we fetch in bulk and reduce in memory rather than adding
// SQL views. Revisit with an RPC/materialized view if the user base grows.

export type Tier = 'free' | 'monthly' | 'lifetime';

export type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  archetype: string | null;
  tier: Tier;
  createdAt: string | null;
  // Billing — derived from rc_events (RevenueCat is the source of truth for money)
  isPaid: boolean; // tier !== 'free'
  lastPaymentAt: string | null;
  nextDueAt: string | null; // subscription expiration / renewal date; null for lifetime
  store: string | null; // app_store / play_store / promotional / stripe
  willRenew: boolean | null; // null when not applicable (free / lifetime)
  isExpired: boolean; // paid tier but nextDueAt is in the past
  hasBillingIssue: boolean; // most recent RC event was a billing problem
  // Engagement
  lastActiveAt: string | null;
};

const CAP = 2000;
const DAY = 86_400_000;
const dateStr = (d: Date) => d.toISOString().slice(0, 10);

// RevenueCat event types that represent (or revise) a paid period.
const PAYMENT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
]);

type RcAgg = {
  lastPaymentAt: number | null;
  nextDueAt: number | null;
  store: string | null;
  willRenew: boolean | null;
  lastEventType: string | null; // most recent event, for billing-issue detection
};

export async function getUsers(q?: string): Promise<AdminUserRow[]> {
  const sb = createAdminClient();

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, name, archetype, subscription_tier, created_at')
    .order('created_at', { ascending: false })
    .limit(CAP);

  const rows = profiles ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r: any) => r.id);

  const [emailById, rcById, activeById] = await Promise.all([
    fetchEmails(sb),
    fetchBilling(sb, ids),
    fetchLastActive(sb, ids),
  ]);

  const now = Date.now();

  let out: AdminUserRow[] = rows.map((r: any) => {
    const tier = (r.subscription_tier ?? 'free') as Tier;
    const rc = rcById.get(r.id);
    const nextDueAt = tier === 'lifetime' ? null : rc?.nextDueAt ?? null;
    return {
      id: r.id,
      email: emailById.get(r.id) ?? null,
      name: r.name ?? null,
      archetype: r.archetype ?? null,
      tier,
      createdAt: r.created_at ?? null,
      isPaid: tier !== 'free',
      lastPaymentAt: rc?.lastPaymentAt ? new Date(rc.lastPaymentAt).toISOString() : null,
      nextDueAt: nextDueAt ? new Date(nextDueAt).toISOString() : null,
      store: rc?.store ?? null,
      willRenew: tier === 'monthly' ? rc?.willRenew ?? null : null,
      isExpired: tier !== 'free' && nextDueAt !== null && nextDueAt < now,
      hasBillingIssue: rc?.lastEventType === 'BILLING_ISSUE',
      lastActiveAt: activeById.get(r.id) ?? null,
    };
  });

  const term = q?.trim().toLowerCase();
  if (term) {
    out = out.filter(
      (u) =>
        (u.email?.toLowerCase().includes(term) ?? false) ||
        (u.name?.toLowerCase().includes(term) ?? false) ||
        u.id.toLowerCase().includes(term),
    );
  }

  return out;
}

// Build an id → email map from the Auth admin API (paginated).
async function fetchEmails(sb: ReturnType<typeof createAdminClient>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    let page = 1;
    // perPage max is 1000; stop at CAP to bound work pre-launch.
    while (map.size < CAP) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) if (u.email) map.set(u.id, u.email);
      if (data.users.length < 1000) break;
      page += 1;
    }
  } catch {
    // Auth admin unavailable → fall back to no emails.
  }
  return map;
}

// Reduce the rc_events stream into per-user billing facts.
async function fetchBilling(
  sb: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Map<string, RcAgg>> {
  const map = new Map<string, RcAgg>();
  try {
    const { data } = await sb
      .from('rc_events')
      .select('app_user_id, type, event_at, raw')
      .in('app_user_id', ids)
      .order('event_at', { ascending: true })
      .limit(50_000);

    for (const ev of data ?? []) {
      const uid = (ev as any).app_user_id as string | null;
      if (!uid) continue;
      const raw = ((ev as any).raw ?? {}) as Record<string, any>;
      const type = (ev as any).type as string;

      const agg = map.get(uid) ?? {
        lastPaymentAt: null,
        nextDueAt: null,
        store: null,
        willRenew: null,
        lastEventType: null,
      };

      // Events arrive ascending by event_at, so the last write wins = newest.
      agg.lastEventType = type;
      if (raw.store) agg.store = raw.store;

      if (PAYMENT_EVENTS.has(type)) {
        const purchased = numOrNull(raw.purchased_at_ms) ?? Date.parse((ev as any).event_at);
        if (purchased && (agg.lastPaymentAt === null || purchased >= agg.lastPaymentAt)) {
          agg.lastPaymentAt = purchased;
        }
        const exp = numOrNull(raw.expiration_at_ms);
        if (exp) agg.nextDueAt = exp;
        agg.willRenew = true; // a fresh payment/uncancel means auto-renew is on
      } else if (type === 'CANCELLATION') {
        agg.willRenew = false; // auto-renew off, still entitled until nextDueAt
      } else if (type === 'EXPIRATION') {
        agg.willRenew = false;
      }

      map.set(uid, agg);
    }
  } catch {
    // rc_events missing → no billing detail.
  }
  return map;
}

// id → most recent movement_syncs.synced_at
async function fetchLastActive(
  sb: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { data } = await sb
      .from('movement_syncs')
      .select('user_id, synced_at')
      .in('user_id', ids)
      .order('synced_at', { ascending: false })
      .limit(50_000);
    for (const row of data ?? []) {
      const uid = (row as any).user_id as string;
      if (uid && !map.has(uid)) map.set(uid, (row as any).synced_at);
    }
  } catch {
    // table/column missing → no activity data.
  }
  return map;
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

// ── Single-user detail ───────────────────────────────────────────────────────

export type RcEvent = {
  type: string;
  at: string;
  product: string | null;
  store: string | null;
  price: string | null; // formatted, e.g. "$4.99"
};

export type UserDetail = {
  row: AdminUserRow;
  purpose: string | null;
  theme: string | null;
  stats: { syncs: number; readings: number; journals: number };
  events: RcEvent[];
  activity: { date: string; count: number }[]; // per-day sync counts, oldest→newest
};

const TIMELINE_DAYS = 119; // 17 weeks for a clean calendar heatmap

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const sb = createAdminClient();

  const { data: profile } = await sb
    .from('profiles')
    .select('id, name, archetype, purpose, theme, subscription_tier, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!profile) return null;
  const p = profile as any;

  const [emailById, rcById, activeById, events, activity, syncs, readings, journals] =
    await Promise.all([
      fetchEmails(sb),
      fetchBilling(sb, [id]),
      fetchLastActive(sb, [id]),
      fetchEvents(sb, id),
      fetchSyncTimeline(sb, id),
      count(sb, 'movement_syncs', (q) => q.eq('user_id', id)),
      count(sb, 'readings', (q) => q.eq('user_id', id)),
      count(sb, 'journal_entries', (q) => q.eq('user_id', id)),
    ]);

  const tier = (p.subscription_tier ?? 'free') as Tier;
  const rc = rcById.get(id);
  const now = Date.now();
  const nextDueAt = tier === 'lifetime' ? null : rc?.nextDueAt ?? null;

  const row: AdminUserRow = {
    id: p.id,
    email: emailById.get(p.id) ?? null,
    name: p.name ?? null,
    archetype: p.archetype ?? null,
    tier,
    createdAt: p.created_at ?? null,
    isPaid: tier !== 'free',
    lastPaymentAt: rc?.lastPaymentAt ? new Date(rc.lastPaymentAt).toISOString() : null,
    nextDueAt: nextDueAt ? new Date(nextDueAt).toISOString() : null,
    store: rc?.store ?? null,
    willRenew: tier === 'monthly' ? rc?.willRenew ?? null : null,
    isExpired: tier !== 'free' && nextDueAt !== null && nextDueAt < now,
    hasBillingIssue: rc?.lastEventType === 'BILLING_ISSUE',
    lastActiveAt: activeById.get(p.id) ?? null,
  };

  return {
    row,
    purpose: p.purpose ?? null,
    theme: p.theme ?? null,
    stats: { syncs, readings, journals },
    events,
    activity,
  };
}

// Per-day sync counts over the trailing TIMELINE_DAYS window, filled with zeros
// for days with no sync so the heatmap renders a continuous calendar.
async function fetchSyncTimeline(
  sb: ReturnType<typeof createAdminClient>,
  id: string,
): Promise<{ date: string; count: number }[]> {
  const start = new Date(Date.now() - TIMELINE_DAYS * DAY);
  const startStr = dateStr(start);
  const tally = new Map<string, number>();
  try {
    const { data } = await sb
      .from('movement_syncs')
      .select('date')
      .eq('user_id', id)
      .gte('date', startStr)
      .limit(10_000);
    for (const row of data ?? []) {
      const d = (row as any).date as string;
      if (d) tally.set(d, (tally.get(d) ?? 0) + 1);
    }
  } catch {
    // table/column missing → empty timeline
  }

  const out: { date: string; count: number }[] = [];
  for (let i = TIMELINE_DAYS; i >= 0; i--) {
    const d = dateStr(new Date(Date.now() - i * DAY));
    out.push({ date: d, count: tally.get(d) ?? 0 });
  }
  return out;
}

async function count(
  sb: ReturnType<typeof createAdminClient>,
  table: string,
  build: (q: any) => any,
): Promise<number> {
  try {
    const { count: c } = await build(sb.from(table).select('*', { count: 'exact', head: true }));
    return c ?? 0;
  } catch {
    return 0;
  }
}

async function fetchEvents(
  sb: ReturnType<typeof createAdminClient>,
  id: string,
): Promise<RcEvent[]> {
  try {
    const { data } = await sb
      .from('rc_events')
      .select('type, event_at, raw')
      .eq('app_user_id', id)
      .order('event_at', { ascending: false })
      .limit(200);

    return (data ?? []).map((ev: any) => {
      const raw = (ev.raw ?? {}) as Record<string, any>;
      const price = numOrNull(raw.price);
      const currency = typeof raw.currency === 'string' ? raw.currency : null;
      return {
        type: ev.type as string,
        at: ev.event_at as string,
        product: (raw.product_id as string) ?? null,
        store: (raw.store as string) ?? null,
        price:
          price !== null
            ? `${currency === 'USD' || !currency ? '$' : `${currency} `}${price.toFixed(2)}`
            : null,
      };
    });
  } catch {
    return [];
  }
}
