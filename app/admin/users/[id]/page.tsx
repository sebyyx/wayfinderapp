import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { getUserDetail, type AdminUserRow, type Tier } from '@/lib/users';
import { setTier } from '../actions';
import { TierBadge, fmtDate, fmtRelative } from '@/components/admin/UsersTable';
import { SyncHeatmap } from '@/components/admin/SyncHeatmap';
import { DeleteUser } from '@/components/admin/DeleteUser';
import { CopyButton } from '@/components/admin/CopyButton';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { row: u, purpose, theme, stats, streak, events, activity, readings, journals } = detail;

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Wayfinder · Admin</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">{u.name || u.email || 'User'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {u.email ? (
              <a
                href={`mailto:${u.email}`}
                className="font-sans text-sm text-accent hover:underline"
              >
                {u.email}
              </a>
            ) : (
              <span className="font-sans text-sm text-ink3">no email</span>
            )}
            <CopyButton value={u.id} label="Copy id" />
          </div>
        </div>
        <Link href="/admin/users" className="font-sans text-sm text-ink3 hover:text-ink">
          ← Users
        </Link>
      </header>

      {u.pendingOnboarding && (
        <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 font-sans text-sm text-amber-200">
          This account signed up but hasn&apos;t completed onboarding yet — no profile, syncs, or
          readings exist. Tier controls are unavailable until they finish.
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Subscription */}
        <Card title="Subscription">
          <Field label="Tier">
            {u.pendingOnboarding ? <span className="text-ink4">—</span> : <TierBadge tier={u.tier} />}
          </Field>
          <Field label="Status">
            <StatusText u={u} />
          </Field>
          <Field label="Last payment">{fmtDate(u.lastPaymentAt)}</Field>
          <Field label="Next due">
            {u.tier === 'lifetime' ? <span className="text-ink4">never</span> : fmtDate(u.nextDueAt)}
            {u.willRenew === false && u.tier === 'monthly' && !u.isExpired && (
              <span className="ml-2 text-xs text-amber-400">won&apos;t renew</span>
            )}
          </Field>
          <Field label="Store">{u.store ?? <span className="text-ink4">—</span>}</Field>

          {!u.pendingOnboarding && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="font-sans text-xs text-ink3">Set tier (in-app access only)</p>
            <form action={setTier} className="mt-2 flex gap-2">
              <input type="hidden" name="userId" value={u.id} />
              {(['free', 'monthly', 'lifetime'] as Tier[]).map((t) => (
                <button
                  key={t}
                  name="tier"
                  value={t}
                  disabled={u.tier === t}
                  className={`rounded px-3 py-1.5 text-sm transition ${
                    u.tier === t
                      ? 'cursor-default bg-accent/20 text-accent'
                      : 'border border-white/10 text-ink3 hover:border-accent hover:text-ink'
                  }`}
                >
                  {t === 'free' ? 'Free' : t === 'monthly' ? 'Monthly' : 'Lifetime'}
                </button>
              ))}
            </form>
          </div>
          )}
        </Card>

        {/* Profile & activity */}
        <Card title="Profile & activity">
          <Field label="Archetype">{u.archetype ?? <span className="text-ink4">—</span>}</Field>
          <Field label="Purpose">{purpose ?? <span className="text-ink4">—</span>}</Field>
          <Field label="Theme">{theme ?? <span className="text-ink4">—</span>}</Field>
          <Field label="Joined">{fmtDate(u.createdAt)}</Field>
          <Field label="Last active">{fmtRelative(u.lastActiveAt)}</Field>
          <Field label="Streak">
            <span className="text-ink">{streak.current}d</span>
            <span className="text-ink4"> current · {streak.longest}d longest</span>
          </Field>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <Mini label="Syncs" value={stats.syncs} />
            <Mini label="Readings" value={stats.readings} />
            <Mini label="Journals" value={stats.journals} />
          </div>
          <Field label="User id">
            <span className="font-mono text-xs text-ink3">{u.id}</span>
          </Field>
        </Card>
      </div>

      {/* Sync activity timeline */}
      <section className="mt-10">
        <h2 className="font-serif text-lg text-ink">Sync activity</h2>
        <div className="mt-3 rounded-md border border-white/10 bg-surface/40 p-5">
          <SyncHeatmap activity={activity} />
        </div>
      </section>

      {/* Readings & journals content */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-lg text-ink">
            Readings <span className="text-ink4">· {readings.length} latest</span>
          </h2>
          <div className="mt-3 space-y-2">
            {readings.length === 0 && (
              <p className="rounded-md border border-white/10 bg-surface/40 px-4 py-6 font-sans text-sm text-ink3">
                No readings yet.
              </p>
            )}
            {readings.map((r) => (
              <details key={r.date} className="rounded-md border border-white/10 bg-surface/40 px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-sans text-sm text-ink">
                  <span className="truncate">{r.title || r.archetype || 'Reading'}</span>
                  <span className="shrink-0 font-mono text-xs text-ink4">{r.date}</span>
                </summary>
                <div className="mt-3 space-y-2 font-sans text-sm leading-relaxed">
                  <Layer label="Observation" text={r.observation} />
                  <Layer label="Reflection" text={r.reflection} />
                  <Layer label="Action" text={r.action} />
                  <Layer label="Question" text={r.reflectionQuestion} />
                </div>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-lg text-ink">
            Journal <span className="text-ink4">· {journals.length} latest</span>
          </h2>
          <div className="mt-3 space-y-2">
            {journals.length === 0 && (
              <p className="rounded-md border border-white/10 bg-surface/40 px-4 py-6 font-sans text-sm text-ink3">
                No journal entries yet.
              </p>
            )}
            {journals.map((j) => (
              <div key={j.date} className="rounded-md border border-white/10 bg-surface/40 px-4 py-3">
                <div className="font-mono text-xs text-ink4">{j.date}</div>
                <p className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink2">
                  {j.text || <span className="text-ink4">(empty)</span>}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* RevenueCat event history */}
      <section className="mt-10">
        <h2 className="font-serif text-lg text-ink">RevenueCat events</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-white/10">
          <table className="w-full border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-surface/40 text-left text-xs uppercase tracking-wide text-ink4">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-2 text-ink">{e.type}</td>
                  <td className="px-4 py-2 text-ink2">{fmtDate(e.at)}</td>
                  <td className="px-4 py-2 text-ink3">{e.product ?? '—'}</td>
                  <td className="px-4 py-2 text-ink3">{e.store ?? '—'}</td>
                  <td className="px-4 py-2 text-ink2">{e.price ?? '—'}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink4">
                    No RevenueCat events for this user yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DeleteUser userId={u.id} email={u.email} />
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-white/10 bg-surface/40 p-5">
      <h2 className="font-serif text-lg text-ink">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-sans text-xs text-ink3">{label}</span>
      <span className="text-right font-sans text-sm text-ink2">{children}</span>
    </div>
  );
}

function Layer({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <p className="text-ink2">
      <span className="font-mono text-xs uppercase tracking-wide text-ink4">{label} </span>
      {text}
    </p>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-white/10 bg-surface/40 px-3 py-2 text-center">
      <div className="font-serif text-xl text-ink">{value}</div>
      <div className="font-sans text-xs text-ink4">{label}</div>
    </div>
  );
}

function StatusText({ u }: { u: AdminUserRow }) {
  if (u.pendingOnboarding) return <span className="text-amber-400">pending onboarding</span>;
  if (u.hasBillingIssue) return <span className="text-red-400">billing issue</span>;
  if (!u.isPaid) return <span className="text-ink4">free</span>;
  if (u.isExpired) return <span className="text-red-400">expired</span>;
  return <span className="text-emerald-400">paid · active</span>;
}
