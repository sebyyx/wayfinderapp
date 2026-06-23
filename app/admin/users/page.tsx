import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { getUsers } from '@/lib/users';
import { UsersTable } from '@/components/admin/UsersTable';

export const dynamic = 'force-dynamic'; // always fresh, never cached

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  const { q } = await searchParams;
  const users = await getUsers(q);

  const paid = users.filter((u) => u.isPaid).length;
  const expired = users.filter((u) => u.isExpired).length;

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
          {expired > 0 && <span className="text-red-400"> · {expired} expired</span>}
        </p>
      </div>

      <div className="mt-6">
        <UsersTable users={users} />
      </div>

      <p className="mt-3 font-sans text-xs leading-relaxed text-ink4">
        Tier is the in-app access flag (<code>profiles.subscription_tier</code>). Setting it grants or
        revokes access instantly but does <strong>not</strong> bill anyone — real billing is in the App
        Store via RevenueCat. Payment dates are derived from stored RevenueCat webhook events
        (<code>rc_events</code>).
      </p>
    </main>
  );
}
