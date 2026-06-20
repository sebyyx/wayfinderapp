import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { getOverview } from '@/lib/metrics';
import { getRevenueMetrics, getChurnMetrics } from '@/lib/revenuecat';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'; // always fresh, never cached

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  const [o, revenue] = await Promise.all([getOverview(), getRevenueMetrics()]);
  const churn = await getChurnMetrics(revenue.activeSubscriptions);
  const maxArch = Math.max(1, ...o.archetypes.map((a) => a.count));
  const cur = revenue.currency === 'USD' ? '$' : `${revenue.currency} `;

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
          <h1 className="mt-1 font-serif text-3xl text-ink">App health</h1>
        </div>
        <form action={signOut}>
          <button className="font-sans text-sm text-ink3 hover:text-ink">Sign out ({admin.email})</button>
        </form>
      </header>

      {/* Acquisition & revenue */}
      <Section title="Acquisition & revenue">
        <Stat label="Total users" value={o.acquisition.usersTotal} />
        <Stat label="New today" value={o.acquisition.signupsToday} />
        <Stat label="New · 7d" value={o.acquisition.signups7d} />
        <Stat label="New · 30d" value={o.acquisition.signups30d} />
        <Stat label="Monthly subs" value={o.acquisition.monthly} accent />
        <Stat label="Lifetime" value={o.acquisition.lifetime} accent />
        <Stat label="Free" value={o.acquisition.free} />
        <Stat label="Paid share" value={`${o.acquisition.paidShare}%`} accent />
      </Section>
      <Note>
        User & tier counts come from <code>profiles.subscription_tier</code>. Exact revenue is from
        RevenueCat below.
      </Note>

      {/* Revenue & churn (RevenueCat) */}
      <Section title="Revenue & churn (RevenueCat)">
        {revenue.available ? (
          <>
            <Stat label="MRR" value={`${cur}${fmt(revenue.mrr)}`} accent />
            <Stat label="Active subscriptions" value={fmt(revenue.activeSubscriptions)} />
            <Stat label="Active trials" value={fmt(revenue.activeTrials)} />
            <Stat label="Revenue · 28d" value={`${cur}${fmt(revenue.revenue28d)}`} accent />
            <Stat label="New customers · 28d" value={fmt(revenue.newCustomers28d)} />
            <Stat
              label="Churn rate · 30d"
              value={churn.churnRate === null ? '—' : `${churn.churnRate}%`}
              accent
            />
            <Stat label="Expired · 30d" value={churn.expired30d} />
            <Stat label="Cancellations · 30d" value={churn.cancelled30d} />
          </>
        ) : (
          <div className="col-span-full rounded-md border border-white/10 bg-surface/40 p-5 font-sans text-sm text-ink3">
            RevenueCat not connected. Set <code>REVENUECAT_API_KEY</code> (v2 secret) and{' '}
            <code>REVENUECAT_PROJECT_ID</code> to show MRR, trials, and revenue.
          </div>
        )}
      </Section>
      <Note>
        MRR / trials / revenue come live from the RevenueCat Overview API. Churn is computed from
        RevenueCat webhook events stored in <code>rc_events</code>
        {churn.hasData ? '' : ' (no events yet — wire the webhook to admin.wayfinderapp.life/api/revenuecat/webhook)'}.
      </Note>

      {/* Retention & engagement */}
      <Section title="Retention & engagement">
        <Stat label="DAU (synced today)" value={o.engagement.dau} />
        <Stat label="WAU (7d)" value={o.engagement.wau} />
        <Stat label="Syncs · 30d" value={o.engagement.syncs30d} />
        <Stat label="Readings · 30d" value={o.engagement.readers30d} />
        <Stat label="Journaled · 30d" value={o.engagement.journalers30d} />
        <Stat label="Resonance · 30d" value={o.engagement.feedback30d} />
        <Stat label="Journal rate" value={`${o.engagement.journalRate}%`} accent />
        <Stat label="Feedback rate" value={`${o.engagement.feedbackRate}%`} accent />
      </Section>

      {/* Archetype distribution */}
      <Section title="Archetype distribution · 30d">
        <div className="col-span-full space-y-3">
          {o.archetypes.map((a) => (
            <div key={a.name} className="flex items-center gap-4">
              <span className="w-24 font-sans text-sm text-ink2">{a.name}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-accent2"
                  style={{ width: `${(a.count / maxArch) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-sm text-ink3">{a.count}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* AI health & cost */}
      <Section title="AI health & cost (estimated)">
        <Stat label="Readings today" value={o.ai.readingsToday} />
        <Stat label="Readings · 7d" value={o.ai.readings7d} />
        <Stat label="Reviews · 30d" value={o.ai.reviews30d} />
        <Stat label="Est. cost · 7d" value={`$${o.ai.estCost7d}`} accent />
        <Stat label="Est. cost · 30d" value={`$${o.ai.estCost30d}`} accent />
      </Section>
      <Note>
        Cost is derived from generated rows × a per-call estimate. For exact token cost & errors, log
        each Claude call from the Edge Functions into an <code>ai_call_log</code> table.
      </Note>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl text-ink">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-white/10 bg-surface/40 p-5">
      <div className={`font-serif text-3xl ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      <div className="mt-1 font-sans text-xs text-ink3">{label}</div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 font-sans text-xs leading-relaxed text-ink4">{children}</p>;
}

function fmt(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
