import Constellation from '@/components/Constellation';
import { Nav, Footer, AppStoreButton } from '@/components/SiteChrome';

const ARCHETYPES = [
  { name: 'Pacer', line: 'Always in motion. Stillness feels like falling behind.' },
  { name: 'Weaver', line: 'Your day connects people and places — the quiet glue.' },
  { name: 'Wanderer', line: 'No map, on purpose. You find the places nobody else does.' },
  { name: 'Anchor', line: 'Deep roots, few places. Steady is your superpower.' },
  { name: 'Spiral', line: 'You circle back to grow — same loops, new lessons.' },
];

const STEPS = [
  {
    k: '01',
    title: 'It reads your day',
    body: 'With your permission, Wayfinder sees your real path and pace — your GPS trace and step count, nothing borrowed from the stars.',
  },
  {
    k: '02',
    title: 'It draws a constellation',
    body: 'Your movement becomes a personal constellation, and your day is classified into one of five movement archetypes.',
  },
  {
    k: '03',
    title: 'It reflects it back',
    body: 'A calm, three-layer reading — observe, reflect, act — written for the shape of your day. Over time it becomes a story of who you are becoming.',
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Nav />

      {/* Hero */}
      <section className="starfield relative mx-auto max-w-content px-6 pb-16 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="relative z-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Daily reflection · iOS
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Find meaning in every step.
            </h1>
            <p className="mt-6 max-w-md font-sans text-lg leading-relaxed text-ink2">
              Wayfinder turns how you move through the world into a daily
              constellation and a quiet moment of reflection. It&rsquo;s not
              astrology — it&rsquo;s your real path, made meaningful.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <AppStoreButton />
              <span className="font-sans text-sm text-ink3">
                Free daily reading · no card to start
              </span>
            </div>
          </div>
          <div className="relative z-10">
            <Constellation className="mx-auto w-full max-w-md" />
          </div>
        </div>
      </section>

      {/* Not astrology */}
      <section className="mx-auto max-w-content px-6 py-12">
        <div className="rounded-lg border border-white/10 bg-surface/60 p-8 sm:p-10">
          <h2 className="font-serif text-2xl text-ink">Not prediction. A mirror.</h2>
          <p className="mt-4 max-w-2xl font-sans leading-relaxed text-ink2">
            Wayfinder makes no claims about the future. It&rsquo;s a wellness and
            self-awareness companion — a calm way to notice your patterns,
            reflect, and watch yourself grow over time. The constellation is
            built from where you actually went today, not from the stars.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-content px-6 py-12">
        <h2 className="font-serif text-3xl text-ink">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.k} className="rounded-md border border-white/10 bg-surface/40 p-6">
              <div className="font-mono text-sm text-accent">{s.k}</div>
              <h3 className="mt-3 font-serif text-xl text-ink">{s.title}</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Archetypes */}
      <section id="archetypes" className="mx-auto max-w-content px-6 py-12">
        <h2 className="font-serif text-3xl text-ink">Five ways people move</h2>
        <p className="mt-3 max-w-2xl font-sans text-ink2">
          Each day settles into one of five movement archetypes. Which one are you today?
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHETYPES.map((a) => (
            <div key={a.name} className="rounded-md border border-white/10 bg-surface/40 p-6">
              <h3 className="font-serif text-xl text-accent2">{a.name}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-ink2">{a.line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-content px-6 py-12">
        <h2 className="font-serif text-3xl text-ink">Simple pricing</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <PriceCard
            name="Free"
            price="$0"
            cadence="forever"
            features={['Daily constellation', 'Full three-layer reading', "Today's journal entry"]}
          />
          <PriceCard
            name="Navigator"
            price="$4.99"
            cadence="/ month · 7-day free trial"
            highlight
            features={[
              'Everything in Free',
              'Weekly review & monthly identity report',
              'Identity evolution & share cards',
              'Full history, all themes & time windows',
            ]}
          />
          <PriceCard
            name="Voyager"
            price="$149"
            cadence="once · lifetime"
            features={['Everything in Navigator', 'Forever — never expires']}
          />
        </div>
        <div className="mt-10">
          <AppStoreButton />
        </div>
      </section>

      <Footer />
    </main>
  );
}

function PriceCard({
  name,
  price,
  cadence,
  features,
  highlight = false,
}: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-7 ${
        highlight ? 'border-accent/50 bg-surface2/60' : 'border-white/10 bg-surface/40'
      }`}
    >
      <h3 className="font-serif text-2xl text-ink">{name}</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-serif text-4xl text-ink">{price}</span>
        <span className="font-sans text-sm text-ink3">{cadence}</span>
      </div>
      <ul className="mt-6 space-y-3 font-sans text-sm text-ink2">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-accent">·</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
