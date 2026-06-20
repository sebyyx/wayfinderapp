import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// All analytics are computed server-side with the service-role client. Queries
// are intentionally simple count/select operations (no migration required) so
// this works against the existing schema. At larger scale, move the group-bys
// into SQL views/RPCs for efficiency.

const DAY = 86_400_000;
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const isoAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

type Client = ReturnType<typeof createAdminClient>;

async function count(
  sb: Client,
  table: string,
  build?: (q: any) => any,
): Promise<number> {
  try {
    let q = sb.from(table).select('*', { count: 'exact', head: true });
    if (build) q = build(q);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Rough Claude (claude-haiku-4-5) cost per generation, USD. Tune to reality.
const COST_PER_READING = 0.0015;
const COST_PER_REVIEW = 0.003;

export type Overview = {
  acquisition: {
    usersTotal: number;
    free: number;
    monthly: number;
    lifetime: number;
    signupsToday: number;
    signups7d: number;
    signups30d: number;
    paidShare: number; // %
  };
  engagement: {
    dau: number;
    wau: number;
    syncs30d: number;
    readers30d: number;
    journalers30d: number;
    feedback30d: number;
    journalRate: number; // % of syncs that got a journal entry
    feedbackRate: number; // % of syncs that got resonance feedback
  };
  archetypes: { name: string; count: number }[];
  ai: {
    readingsToday: number;
    readings7d: number;
    reviews30d: number;
    estCost7d: number;
    estCost30d: number;
  };
};

async function distinctUsers(sb: Client, table: string, sinceIso: string): Promise<number> {
  try {
    const { data } = await sb.from(table).select('user_id').gte('synced_at', sinceIso).limit(50_000);
    if (!data) return 0;
    return new Set(data.map((r: any) => r.user_id)).size;
  } catch {
    return 0;
  }
}

export async function getOverview(): Promise<Overview> {
  const sb = createAdminClient();
  const today = dateStr(new Date());

  const [
    usersTotal, free, monthly, lifetime,
    signupsToday, signups7d, signups30d,
    dau, syncs30d, readers30d, journalers30d, feedback30d,
    readingsToday, readings7d, weekly30d, monthly30d,
  ] = await Promise.all([
    count(sb, 'profiles'),
    count(sb, 'profiles', (q) => q.eq('subscription_tier', 'free')),
    count(sb, 'profiles', (q) => q.eq('subscription_tier', 'monthly')),
    count(sb, 'profiles', (q) => q.eq('subscription_tier', 'lifetime')),
    count(sb, 'profiles', (q) => q.gte('created_at', `${today}T00:00:00Z`)),
    count(sb, 'profiles', (q) => q.gte('created_at', isoAgo(7))),
    count(sb, 'profiles', (q) => q.gte('created_at', isoAgo(30))),
    count(sb, 'movement_syncs', (q) => q.eq('date', today)),
    count(sb, 'movement_syncs', (q) => q.gte('date', dateStr(new Date(Date.now() - 30 * DAY)))),
    count(sb, 'readings', (q) => q.gte('created_at', isoAgo(30))),
    count(sb, 'journal_entries', (q) => q.gte('created_at', isoAgo(30))),
    count(sb, 'reading_feedback', (q) => q.gte('created_at', isoAgo(30))),
    count(sb, 'readings', (q) => q.gte('created_at', `${today}T00:00:00Z`)),
    count(sb, 'readings', (q) => q.gte('created_at', isoAgo(7))),
    count(sb, 'weekly_reviews', (q) => q.gte('created_at', isoAgo(30))),
    count(sb, 'monthly_reports', (q) => q.gte('created_at', isoAgo(30))),
  ]);

  const wau = await distinctUsers(sb, 'movement_syncs', isoAgo(7));
  const archetypes = await getArchetypeDistribution(sb);

  const paid = monthly + lifetime;
  const reviews30d = weekly30d + monthly30d;

  return {
    acquisition: {
      usersTotal, free, monthly, lifetime,
      signupsToday, signups7d, signups30d,
      paidShare: usersTotal ? Math.round((paid / usersTotal) * 1000) / 10 : 0,
    },
    engagement: {
      dau, wau, syncs30d, readers30d, journalers30d, feedback30d,
      journalRate: syncs30d ? Math.round((journalers30d / syncs30d) * 1000) / 10 : 0,
      feedbackRate: syncs30d ? Math.round((feedback30d / syncs30d) * 1000) / 10 : 0,
    },
    archetypes,
    ai: {
      readingsToday,
      readings7d,
      reviews30d,
      estCost7d: Math.round(readings7d * COST_PER_READING * 100) / 100,
      estCost30d:
        Math.round((readers30d * COST_PER_READING + reviews30d * COST_PER_REVIEW) * 100) / 100,
    },
  };
}

const ARCHETYPE_NAMES = ['Pacer', 'Weaver', 'Wanderer', 'Anchor', 'Spiral'];

async function getArchetypeDistribution(sb: Client) {
  try {
    const { data } = await sb
      .from('movement_syncs')
      .select('dna_type')
      .gte('date', dateStr(new Date(Date.now() - 30 * DAY)))
      .limit(50_000);
    const tally = new Map<string, number>(ARCHETYPE_NAMES.map((n) => [n, 0]));
    for (const row of data ?? []) {
      const t = (row as any).dna_type as string | null;
      if (t) tally.set(t, (tally.get(t) ?? 0) + 1);
    }
    return [...tally.entries()].map(([name, count]) => ({ name, count }));
  } catch {
    return ARCHETYPE_NAMES.map((name) => ({ name, count: 0 }));
  }
}
