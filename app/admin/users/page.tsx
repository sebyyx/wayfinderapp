import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { getUsers, type AdminUserRow } from '@/lib/users';
import { UsersTable } from '@/components/admin/UsersTable';

export const dynamic = 'force-dynamic'; // always fresh, never cached

type Status = 'all' | 'paid' | 'free' | 'expired' | 'billing' | 'monthly' | 'lifetime' | 'pending';
type Sort = 'recent' | 'active' | 'name';

const STATUS_FILTERS: { key: Status; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'free', label: 'Free' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'lifetime', label: 'Lifetime' },
  { key: 'expired', label: 'Expired' },
  { key: 'billing', label: 'Billing issue' },
  { key: 'pending', label: 'Pending onboarding' },
];

const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Newest' },
  { key: 'active', label: 'Last active' },
  { key: 'name', label: 'Name' },
];

function matchesStatus(u: AdminUserRow, s: Status): boolean {
  switch (s) {
    case 'paid': return u.isPaid;
    case 'free': return !u.isPaid;
    case 'monthly': return u.tier === 'monthly';
    case 'lifetime': return u.tier === 'lifetime';
    case 'expired': return u.isExpired;
    case 'billing': return u.hasBillingIssue;
    case 'pending': return u.pendingOnboarding;
    default: return true;
  }
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: Status; sort?: Sort }>;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  const { q, status = 'all', sort = 'recent' } = await searchParams;
  const all = await getUsers(q);

  let users = all.filter((u) => matchesStatus(u, status));
  users = sortUsers(users, sort);

  const paid = all.filter((u) => u.isPaid).length;
  const expired = all.filter((u) => u.isExpired).length;
  const pending = all.filter((u) => u.pendingOnboarding).length;

  // Preserve the current query string on filter/sort links and the CSV export.
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (status !== 'all') p.set('status', status);
    if (sort !== 'recent') p.set('sort', sort);
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Wayfinder · Admin</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Users</h1>
        </div>
        <Link href="/admin" className="font-sans text-sm text-ink3 hover:text-ink">
          ← Dashboard
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form className="flex-1">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          {sort !== 'recent' && <input type="hidden" name="sort" value={sort} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by email, name, or id…"
            className="w-full max-w-sm rounded-md border border-white/10 bg-surface/40 px-3 py-2 font-sans text-sm text-ink placeholder:text-ink4 focus:border-accent focus:outline-none"
          />
        </form>
        <p className="font-sans text-sm text-ink3">
          {users.length} shown · <span className="text-accent">{paid} paid</span>
          {pending > 0 && <span className="text-amber-400"> · {pending} pending</span>}
          {expired > 0 && <span className="text-red-400"> · {expired} expired</span>}
        </p>
        <Link
          href={`/admin/users/export${qs({})}`}
          prefetch={false}
          className="rounded-md border border-white/10 px-3 py-2 font-sans text-sm text-ink3 hover:border-accent hover:text-ink"
        >
          Export CSV
        </Link>
      </div>

      {/* Status filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/users${qs({ status: f.key === 'all' ? '' : f.key })}`}
            className={`rounded-full px-3 py-1 font-sans text-xs transition ${
              status === f.key
                ? 'bg-accent/20 text-accent'
                : 'border border-white/10 text-ink3 hover:text-ink'
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-1 text-ink4">·</span>
        <span className="font-sans text-xs text-ink4">Sort:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={`/admin/users${qs({ sort: s.key === 'recent' ? '' : s.key })}`}
            className={`rounded-full px-3 py-1 font-sans text-xs transition ${
              sort === s.key
                ? 'bg-accent/20 text-accent'
                : 'border border-white/10 text-ink3 hover:text-ink'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <UsersTable users={users} />
      </div>

      <p className="mt-3 font-sans text-xs leading-relaxed text-ink4">
        Setting a tier grants or revokes a <strong>RevenueCat promotional entitlement</strong>
        (navigator/voyager) so it takes effect in the app, and mirrors it to{' '}
        <code>profiles.subscription_tier</code>. It does <strong>not</strong> bill anyone and never
        touches a real paid subscription. Payment dates are derived from stored RevenueCat webhook
        events (<code>rc_events</code>).
      </p>
    </main>
  );
}

function sortUsers(users: AdminUserRow[], sort: Sort): AdminUserRow[] {
  const copy = [...users];
  if (sort === 'name') {
    return copy.sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));
  }
  if (sort === 'active') {
    return copy.sort((a, b) => ms(b.lastActiveAt) - ms(a.lastActiveAt));
  }
  return copy.sort((a, b) => ms(b.createdAt) - ms(a.createdAt)); // recent
}

function ms(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}
