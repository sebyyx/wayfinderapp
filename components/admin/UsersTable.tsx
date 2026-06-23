import Link from 'next/link';
import type { AdminUserRow, Tier } from '@/lib/users';
import { setTier } from '@/app/admin/users/actions';

// Operations table: one row per user, with inline tier controls. Used both on
// the admin home (recent slice) and the full /admin/users page.
export function UsersTable({ users }: { users: AdminUserRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-white/10">
      <table className="w-full border-collapse font-sans text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-surface/40 text-left text-xs uppercase tracking-wide text-ink4">
            <Th>User</Th>
            <Th>Tier</Th>
            <Th>Status</Th>
            <Th>Last payment</Th>
            <Th>Next due</Th>
            <Th>Last active</Th>
            <Th>Set tier</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} u={u} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-ink4">
                No users.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ u }: { u: AdminUserRow }) {
  return (
    <tr className="border-b border-white/5 align-top hover:bg-surface/20">
      <td className="px-4 py-3">
        <Link href={`/admin/users/${u.id}`} className="group">
          <div className="text-ink group-hover:text-accent">{u.name || '—'}</div>
          <div className="text-xs text-ink3 group-hover:text-ink2">{u.email || u.id}</div>
          {u.archetype && <div className="mt-0.5 text-xs text-ink4">{u.archetype}</div>}
        </Link>
      </td>
      <td className="px-4 py-3">
        <TierBadge tier={u.tier} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge u={u} />
      </td>
      <td className="px-4 py-3 text-ink2">{fmtDate(u.lastPaymentAt)}</td>
      <td className="px-4 py-3 text-ink2">
        {u.tier === 'lifetime' ? <span className="text-ink4">never</span> : fmtDate(u.nextDueAt)}
        {u.willRenew === false && u.tier === 'monthly' && !u.isExpired && (
          <div className="text-xs text-amber-400">won&apos;t renew</div>
        )}
      </td>
      <td className="px-4 py-3 text-ink2">{fmtRelative(u.lastActiveAt)}</td>
      <td className="px-4 py-3">
        <form action={setTier} className="flex gap-1">
          <input type="hidden" name="userId" value={u.id} />
          {(['free', 'monthly', 'lifetime'] as Tier[]).map((t) => (
            <button
              key={t}
              name="tier"
              value={t}
              disabled={u.tier === t}
              className={`rounded px-2 py-1 text-xs transition ${
                u.tier === t
                  ? 'cursor-default bg-accent/20 text-accent'
                  : 'border border-white/10 text-ink3 hover:border-accent hover:text-ink'
              }`}
            >
              {t === 'free' ? 'Free' : t === 'monthly' ? 'Monthly' : 'Lifetime'}
            </button>
          ))}
        </form>
      </td>
    </tr>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  const styles: Record<Tier, string> = {
    free: 'bg-white/5 text-ink3',
    monthly: 'bg-accent/15 text-accent',
    lifetime: 'bg-accent2/15 text-accent2',
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${styles[tier]}`}>
      {tier === 'free' ? 'Free' : tier === 'monthly' ? 'Monthly' : 'Lifetime'}
    </span>
  );
}

function StatusBadge({ u }: { u: AdminUserRow }) {
  if (u.hasBillingIssue) return <span className="text-xs text-red-400">billing issue</span>;
  if (!u.isPaid) return <span className="text-xs text-ink4">free</span>;
  if (u.isExpired) return <span className="text-xs text-red-400">expired</span>;
  return <span className="text-xs text-emerald-400">paid · active</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export function fmtDate(iso: string | null): React.ReactNode {
  if (!iso) return <span className="text-ink4">—</span>;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return <span className="text-ink4">—</span>;
  return dateFmt.format(new Date(t));
}

export function fmtRelative(iso: string | null): React.ReactNode {
  if (!iso) return <span className="text-ink4">never</span>;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return <span className="text-ink4">never</span>;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return dateFmt.format(new Date(t));
}
