import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { getRevenueMetrics, getChurnMetrics } from '@/lib/revenuecat';
import { getUsers, type AdminUserRow } from '@/lib/users';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UsersTable, TierBadge, fmtRelative } from '@/components/admin/UsersTable';

export const dynamic = 'force-dynamic'; // always fresh, never cached

const RECENT_ROWS = 12;

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  const [users, revenue] = await Promise.all([getUsers(), getRevenueMetrics()]);
  const churn = await getChurnMetrics(revenue.activeSubscriptions);

  const paid = users.filter((u) => u.isPaid).length;
  const activeToday = users.filter((u) => isToday(u.lastActiveAt)).length;
  const cur = revenue.currency === 'USD' ? '$' : `${revenue.currency} `;
  const mrr = revenue.available && revenue.mrr !== null ? `${cur}${fmtNum(revenue.mrr)}` : '—';

  // Things a founder should act on, in priority order.
  const attention = buildAttention(users);
  const activity = buildActivity(users).slice(0, 8);
  const recentUsers = users.slice(0, RECENT_ROWS); // already sorted newest-first

  async function signOut() {
    'use server';
    const sb = await createSupabaseServerClient();
    await sb.auth.signOut();
    redirect('/admin/login');
  }

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Wayfinder · Admin</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/metrics" className="font-sans text-sm text-ink3 hover:text-ink">
            Metrics →
          </Link>
          <form action={signOut}>
            <button className="font-sans text-sm text-ink3 hover:text-ink">Sign out ({admin.email})</button>
          </form>
        </div>
      </header>

      {/* KPI bar — the few numbers that drive decisions */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Users" value={users.length} />
        <Kpi label="Paid" value={paid} accent />
        <Kpi label="MRR" value={mrr} accent />
        <Kpi label="Active today" value={activeToday} />
        <Kpi label="Churn · 30d" value={churn.churnRate === null ? '—' : `${churn.churnRate}%`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Needs attention */}
        <section>
          <h2 className="font-serif text-lg text-ink">Needs attention</h2>
          <div className="mt-3 rounded-md border border-white/10 bg-surface/40">
            {attention.length === 0 ? (
              <p className="px-4 py-6 font-sans text-sm text-ink3">All clear — nothing to act on.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {attention.map((a) => (
                  <li key={a.user.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-sans text-sm text-ink">
                        {a.user.name || a.user.email || a.user.id}
                      </div>
                      <div className="truncate font-sans text-xs text-ink3">{a.user.email}</div>
                    </div>
                    <span className={`shrink-0 font-sans text-xs ${a.tone}`}>{a.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="font-serif text-lg text-ink">Recent activity</h2>
          <div className="mt-3 rounded-md border border-white/10 bg-surface/40">
            {activity.length === 0 ? (
              <p className="px-4 py-6 font-sans text-sm text-ink3">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {activity.map((ev, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex items-center gap-2">
                      {ev.kind === 'payment' ? <TierBadge tier={ev.user.tier} /> : (
                        <span className="inline-block rounded bg-white/5 px-2 py-0.5 text-xs text-ink3">
                          signup
                        </span>
                      )}
                      <span className="truncate font-sans text-sm text-ink2">
                        {ev.user.name || ev.user.email || ev.user.id}
                      </span>
                    </div>
                    <span className="shrink-0 font-sans text-xs text-ink4">
                      {ev.kind === 'payment' ? 'paid ' : 'joined '}
                      {fmtRelative(ev.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Users — the operations table, inline */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">
            Users <span className="text-ink4">· {recentUsers.length} of {users.length}</span>
          </h2>
          <Link href="/admin/users" className="font-sans text-sm text-accent hover:underline">
            View all & search →
          </Link>
        </div>
        <div className="mt-3">
          <UsersTable users={recentUsers} />
        </div>
        <p className="mt-3 font-sans text-xs leading-relaxed text-ink4">
          Setting a tier grants/revokes in-app access instantly but does not bill anyone — real billing
          is in the App Store via RevenueCat.
        </p>
      </section>
    </main>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

type Attention = { user: AdminUserRow; reason: string; tone: string };

function buildAttention(users: AdminUserRow[]): Attention[] {
  const out: Attention[] = [];
  for (const u of users) {
    if (u.hasBillingIssue) out.push({ user: u, reason: 'billing issue', tone: 'text-red-400' });
    else if (u.isExpired) out.push({ user: u, reason: 'expired', tone: 'text-red-400' });
    else if (u.tier === 'monthly' && u.willRenew === false)
      out.push({ user: u, reason: "won't renew", tone: 'text-amber-400' });
  }
  // Most urgent first (red before amber).
  return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone.includes('red') ? -1 : 1));
}

type ActivityEvent = { kind: 'payment' | 'signup'; user: AdminUserRow; at: string };

function buildActivity(users: AdminUserRow[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const u of users) {
    if (u.lastPaymentAt) events.push({ kind: 'payment', user: u, at: u.lastPaymentAt });
    if (u.createdAt) events.push({ kind: 'signup', user: u, at: u.createdAt });
  }
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return new Date(t).toDateString() === new Date().toDateString();
}

function Kpi({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-white/10 bg-surface/40 px-4 py-3">
      <div className={`font-serif text-2xl ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      <div className="mt-0.5 font-sans text-xs text-ink3">{label}</div>
    </div>
  );
}

function fmtNum(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
