'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ?? 'https://apps.apple.com/app/id6781383516';

// ── trace math ───────────────────────────────────────────────────────────────
function smoothPath(pts: number[][], w: number, h: number, k = 0.17) {
  const P = pts.map(([x, y]) => [x * w, y * h]);
  if (P.length < 2) return '';
  let d = `M ${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

type Archetype = { name: string; trait: string; line: string; pts: number[][]; peak: number };

const ARCH: Archetype[] = [
  { name: 'Pacer', trait: 'Rhythm & consistency', line: 'Always in motion. Stillness feels like falling behind.',
    pts: [[0.12,0.78],[0.26,0.66],[0.40,0.54],[0.54,0.42],[0.68,0.31],[0.82,0.20],[0.92,0.12]], peak: 3 },
  { name: 'Weaver', trait: 'Connection & integration', line: 'Your day connects people and places — the quiet glue.',
    pts: [[0.14,0.50],[0.30,0.74],[0.42,0.40],[0.54,0.70],[0.66,0.36],[0.78,0.66],[0.90,0.46]], peak: 3 },
  { name: 'Wanderer', trait: 'Curiosity & openness', line: 'No map, on purpose. You find the places nobody else does.',
    pts: [[0.18,0.30],[0.36,0.58],[0.22,0.78],[0.50,0.66],[0.68,0.82],[0.74,0.46],[0.88,0.22]], peak: 5 },
  { name: 'Anchor', trait: 'Stillness & depth', line: 'Deep roots, few places. Steady is your superpower.',
    pts: [[0.46,0.42],[0.54,0.40],[0.60,0.48],[0.58,0.58],[0.50,0.62],[0.42,0.56],[0.44,0.46]], peak: 2 },
  { name: 'Spiral', trait: 'Iteration & growth', line: 'You circle back to grow — same loops, new lessons.',
    pts: [[0.50,0.30],[0.66,0.40],[0.68,0.58],[0.54,0.68],[0.38,0.62],[0.34,0.44],[0.48,0.36]], peak: 0 },
];

// ── icons / glyphs ────────────────────────────────────────────────────────────
function Glyph({ name, size = 22, sw = 1.6 }: { name: string; size?: number; sw?: number }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactNode> = {
    Pacer: <g {...p}><path d="M3 16 L21 8" /><path d="M5.6 16.4 L6.7 13.6" /><path d="M9.6 15 L10.7 12.2" /><path d="M13.6 13.6 L14.7 10.8" /><path d="M17.6 12.2 L18.7 9.4" /></g>,
    Weaver: <g {...p}><path d="M3 9c4.5 0 4.5 6 9 6s4.5-6 9-6" /><path d="M3 15c4.5 0 4.5-6 9-6s4.5 6 9 6" opacity="0.55" /></g>,
    Wanderer: <g {...p}><path d="M4 19c1.5-4.5 4.5-2.5 5.5-6.5S13 8 15 10.5" /><circle cx="17.5" cy="8" r="1.4" fill="currentColor" stroke="none" /></g>,
    Anchor: <g {...p}><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="5.4" opacity="0.8" /><path d="M3.5 12a8.5 8.5 0 0 1 17 0" opacity="0.4" /></g>,
    Spiral: <g {...p}><path d="M12 12c0-1 1.4-1 1.4.3 0 2-3 2-3-1.1 0-3.6 4.5-3.6 5.6.4 1.2 4.1 1 6.2-2.5 6.2-4 0-6.4-3-6.4-6.3" /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>{paths[name]}</svg>;
}

function SiteIcon({ name, size = 24, sw = 1.7, style }: { name: string; size?: number; sw?: number; style?: CSSProperties }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactNode> = {
    compass: <g {...p}><circle cx="12" cy="12" r="8.2" /><path d="M14.8 9.2 11 11l-1.8 3.8L13 13z" fill="currentColor" stroke="none" /></g>,
    check: <path {...p} d="M5 12.5 10 17l9-10" />,
    apple: <g fill="currentColor"><path d="M16.3 12.3c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3 0 0-2.1-.8-2.1-3.2zM14.4 6.2c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-1 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z" /></g>,
    pin: <g {...p}><path d="M12 21c4-4.2 6.5-7.5 6.5-11A6.5 6.5 0 0 0 5.5 10c0 3.5 2.5 6.8 6.5 11z" /><circle cx="12" cy="10" r="2.2" /></g>,
    reading: <g {...p}><path d="M12 6.5C10.5 5 8 4.6 5.5 5.2v12.4C8 17 10.5 17.4 12 18.9" /><path d="M12 6.5C13.5 5 16 4.6 18.5 5.2v12.4C16 17 13.5 17.4 12 18.9" /><path d="M12 6.5v12.4" /></g>,
    growth: <g {...p}><path d="M4 19 L9 13 L13 16 L20 7" /><path d="M15 7h5v5" /></g>,
    arrowR: <path {...p} d="M5 12h14M13 6l6 6-6 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', ...style }}>{paths[name]}</svg>;
}

// ── morphing constellation ────────────────────────────────────────────────────
function Constellation({ sel = 0, W = 460, H = 460, draw = false, idle = true }:
  { sel?: number; W?: number; H?: number; draw?: boolean; idle?: boolean }) {
  const target = ARCH[sel].pts;
  const peak = ARCH[sel].peak;
  const cur = useRef<number[][]>(target.map((p) => [...p]));
  const [, force] = useReducer((x: number) => x + 1, 0);
  const raf = useRef(0);
  const phase = useRef(Math.random() * 6.28);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [drawn, setDrawn] = useState(!draw);

  useEffect(() => {
    if (!draw) return;
    if (pathRef.current) setLen(Math.ceil(pathRef.current.getTotalLength()));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDrawn(true); return; }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      phase.current += dt * 0.0009;
      cur.current = cur.current.map((pt, i) => {
        const tx = target[i][0], ty = target[i][1];
        let nx = pt[0] + (tx - pt[0]) * 0.12;
        let ny = pt[1] + (ty - pt[1]) * 0.12;
        if (idle) {
          nx += Math.sin(phase.current + i * 1.3) * 0.0016;
          ny += Math.cos(phase.current + i * 0.9) * 0.0016;
        }
        return [nx, ny];
      });
      force();
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, idle]);

  const pts = cur.current;
  const d = smoothPath(pts, W, H, 0.17);
  const pk = pts[peak] || pts[0];

  const bg = useMemo(
    () => Array.from({ length: 34 }).map(() => [Math.random(), Math.random(), 0.4 + Math.random() * 1.1]),
    [],
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <radialGradient id="cGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g opacity="0.5">
        {bg.map(([x, y, r], i) => (
          <circle key={i} className="twinkle" style={{ animationDelay: `${i * 0.2}s` }}
            cx={x * W} cy={y * H} r={r} fill="var(--text-3)" />
        ))}
      </g>
      <g fill="none" stroke="var(--accent)" opacity="0.16">
        {[34, 62, 96, 134].map((r, i) => <circle key={i} cx={pk[0] * W} cy={pk[1] * H} r={r} strokeWidth="0.8" />)}
      </g>
      <path ref={pathRef} className="route"
        style={draw ? { strokeDasharray: len || 1, strokeDashoffset: drawn ? 0 : (len || 1), transition: 'stroke-dashoffset 2.8s var(--ease)' } : undefined}
        d={d} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
      {pts.map(([x, y], i) => {
        const isPk = i === peak;
        return (
          <g key={i}>
            {isPk && <circle cx={x * W} cy={y * H} r="46" fill="url(#cGlow)" />}
            <circle cx={x * W} cy={y * H} r={isPk ? 8 : 5} fill="var(--accent)" opacity="0.18" />
            <circle cx={x * W} cy={y * H} r={isPk ? 4.5 : 3} fill={isPk ? 'var(--accent)' : 'var(--text)'} />
          </g>
        );
      })}
    </svg>
  );
}

// ── reveal-on-scroll ──────────────────────────────────────────────────────────
function useReveal(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.18 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}
function Reveal({ children, delay = 0, style, className = '' }:
  { children: ReactNode; delay?: number; style?: CSSProperties; className?: string }) {
  const [ref, seen] = useReveal();
  return (
    <div ref={ref} className={'reveal ' + className} data-in={seen}
      style={{ transitionDelay: `${delay}s`, ...style }}>{children}</div>
  );
}

// ── sections ──────────────────────────────────────────────────────────────────
function Nav() {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > 30);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className="nav" data-scrolled={s}>
      <div className="wrap nav-inner">
        <a href="#top" className="brand"><span className="mk"><SiteIcon name="compass" size={18} /></span>WAYFINDER</a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#archetypes">Archetypes</a>
          <a href="#pricing">Pricing</a>
          <a href={APP_URL} className="btn btn-primary" style={{ padding: '10px 18px' }}>
            <SiteIcon name="apple" size={16} /> Download
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const [sel, setSel] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setSel((x) => (x + 1) % ARCH.length), 4200);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div>
          <div className="hero-pill"><span className="dot" /> Daily reflection · iOS</div>
          <h1 className="display">Find meaning<br />in every step.</h1>
          <p className="lead" style={{ marginTop: 28, maxWidth: '30ch' }}>
            Wayfinder draws how you actually moved today as a living constellation — then reflects it back in one calm reading.
          </p>
          <div className="hero-cta">
            <a href={APP_URL} className="btn btn-primary"><SiteIcon name="apple" size={18} /> Download on the App Store</a>
            <span className="hero-note">Free daily reading · no card to start</span>
          </div>
        </div>
        <div className="hero-art">
          <Constellation sel={sel} draw idle />
        </div>
      </div>
    </section>
  );
}

function Mirror() {
  return (
    <section className="sec-pad">
      <div className="wrap mirror">
        <Reveal><div className="rule" /></Reveal>
        <Reveal delay={0.05}><div className="kicker" style={{ marginBottom: 26 }}>Not astrology</div></Reveal>
        <Reveal delay={0.1}><h2 className="h2">Not a prediction.<br />A mirror.</h2></Reveal>
        <Reveal delay={0.15}>
          <p className="lead">
            Wayfinder makes no claims about your future. It&rsquo;s a quiet way to notice your patterns, reflect,
            and watch yourself grow. The constellation is built from where you actually went today — never from the stars.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', t: 'It reads your day', b: 'With your permission, Wayfinder sees your real path and pace — your GPS trace and steps. Nothing borrowed from the sky.', a: 0 },
  { n: '02', t: 'It draws your shape', b: 'Your movement becomes a personal constellation, and the day settles into one of five movement archetypes.', a: 1 },
  { n: '03', t: 'It reflects it back', b: 'A calm, three-layer reading — observe, reflect, act — written for the shape of your day. Over time, a story of who you’re becoming.', a: 4 },
];

function HowItWorks() {
  return (
    <section className="sec-pad" id="how" style={{ background: 'var(--bg-2)' }}>
      <div className="wrap">
        <Reveal><div className="kicker" style={{ marginBottom: 18 }}>How it works</div></Reveal>
        <Reveal delay={0.05}><h2 className="h2" style={{ maxWidth: '16ch' }}>Three steps, once a day.</h2></Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={0.1 + i * 0.08}>
              <div className="step">
                <div className="step-art"><Constellation sel={s.a} W={300} H={150} idle /></div>
                <div className="step-num">{s.n}</div>
                <h3>{s.t}</h3>
                <p className="body">{s.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Archetypes() {
  const [sel, setSel] = useState(0);
  const a = ARCH[sel];
  return (
    <section className="sec-pad" id="archetypes">
      <div className="wrap">
        <Reveal><div className="kicker" style={{ marginBottom: 18 }}>Five ways people move</div></Reveal>
        <Reveal delay={0.05}>
          <h2 className="h2" style={{ maxWidth: '20ch', marginBottom: 14 }}>Which one are you today?</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="lead" style={{ maxWidth: '52ch', marginBottom: 50 }}>
            Every day settles into one movement archetype — a piece of your movement DNA. Tap one to see its shape.
          </p>
        </Reveal>
        <div className="arch-wrap">
          <Reveal className="arch-stage-wrap">
            <div className="arch-stage">
              <Constellation sel={sel} W={420} H={420} idle />
              <div className="arch-caption">
                <div className="kicker" style={{ marginBottom: 6 }}>{a.trait}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 26 }}>The {a.name}</div>
              </div>
            </div>
          </Reveal>
          <div className="arch-list">
            {ARCH.map((x, i) => (
              <div key={x.name} className="arch-item" data-on={i === sel}
                onMouseEnter={() => setSel(i)} onClick={() => setSel(i)}>
                <span className="ai-glyph"><Glyph name={x.name} size={24} /></span>
                <div>
                  <h4>{x.name}</h4>
                  <p>{x.line}</p>
                </div>
                <span className="idx">0{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="pm">
          <div className="pm-kicker">Tuesday · June 9</div>
          <div className="pm-title">Your day,<br />drawn.</div>
          <div className="pm-trace"><Constellation sel={1} W={264} H={190} idle /></div>
          <div className="pm-chip"><span className="g"><Glyph name="Weaver" size={16} /></span> The Weaver</div>
          <div className="pm-read">
            &ldquo;A woven day — you kept returning to one center, then reaching out from it.&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATS = [
  { i: 'pin', t: 'Your places, read by heart rate', b: 'Where your hours settled — sorted into Recovery, Focus & Flow, and Peak Energy.' },
  { i: 'reading', t: 'A three-layer reading', b: 'Observe, reflect, act — plus a daily question and a private journal that’s yours alone.' },
  { i: 'growth', t: 'Watch yourself grow', b: 'Weekly reviews, a monthly identity report, and a shareable evolution as you change over time.' },
];

function Showcase() {
  return (
    <section className="sec-pad" style={{ background: 'var(--bg-2)' }}>
      <div className="wrap show-grid">
        <Reveal><PhoneMock /></Reveal>
        <div>
          <Reveal><div className="kicker" style={{ marginBottom: 18 }}>The daily ritual</div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2" style={{ maxWidth: '14ch' }}>A quiet, expensive ritual.</h2>
          </Reveal>
          <div className="feat-list">
            {FEATS.map((f, i) => (
              <Reveal key={f.t} delay={0.1 + i * 0.07}>
                <div className="feat">
                  <span className="fi"><SiteIcon name={f.i} size={19} /></span>
                  <div>
                    <h4>{f.t}</h4>
                    <p>{f.b}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EvolutionTrace() {
  const W = 560, H = 350;
  const pts = [[0.10,0.86],[0.26,0.66],[0.18,0.50],[0.38,0.54],[0.30,0.34],[0.52,0.40],[0.46,0.22],[0.68,0.30],[0.62,0.14],[0.84,0.20],[0.92,0.08]];
  const ref = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(2000);
  const [r, seen] = useReveal();
  useEffect(() => { if (ref.current) setLen(Math.ceil(ref.current.getTotalLength())); }, []);
  const d = smoothPath(pts, W, H, 0.16);
  const phases = [0, 5, 10];
  return (
    <div ref={r}>
      <svg viewBox={`0 0 ${W} ${H}`}>
        <defs><radialGradient id="evG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient></defs>
        <path ref={ref} d={d} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round"
          style={{ strokeDasharray: len, strokeDashoffset: seen ? 0 : len, transition: 'stroke-dashoffset 2.8s var(--ease)' }} />
        {pts.map(([x, y], i) => <circle key={i} cx={x * W} cy={y * H} r="2.6" fill="var(--text)" opacity="0.85" />)}
        {phases.map((p, i) => (
          <g key={i}>
            <circle cx={pts[p][0] * W} cy={pts[p][1] * H} r="34" fill="url(#evG)" />
            <circle cx={pts[p][0] * W} cy={pts[p][1] * H} r="5" fill="var(--accent)" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function Evolution() {
  return (
    <section className="sec-pad evo">
      <div className="wrap">
        <Reveal><div className="kicker" style={{ marginBottom: 22 }}>Identity evolution</div></Reveal>
        <Reveal delay={0.05}><h2 className="h2" style={{ maxWidth: '16ch', margin: '0 auto' }}>From who you were to who you&rsquo;re becoming.</h2></Reveal>
        <Reveal delay={0.1}><div className="evo-stage"><EvolutionTrace /></div></Reveal>
        <Reveal delay={0.15}>
          <div className="evo-stats">
            {[['1,240', 'km moved'], ['62', 'days drawn'], ['5', 'archetypes']].map(([n, k]) => (
              <div key={k}><div className="n">{n}</div><div className="k">{k}</div></div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="lead" style={{ maxWidth: '44ch', margin: '36px auto 0', fontStyle: 'italic' }}>
            &ldquo;You stopped searching for the path, and started weaving your own.&rdquo;
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const TIERS = [
  { name: 'Free', amt: '$0', per: 'forever', sub: 'The daily hook — yours always.',
    feats: ['Daily constellation', 'Full three-layer reading', "Today's journal entry"], cta: 'Start free', best: false },
  { name: 'Navigator', amt: '$4.99', per: '/ month', sub: '7-day free trial.',
    feats: ['Everything in Free', 'Weekly review & monthly report', 'Identity evolution & share cards', 'Full history, all themes & windows'], cta: 'Start 7-day trial', best: true },
  { name: 'Voyager', amt: '$149', per: 'once', sub: 'Lifetime — never expires.',
    feats: ['Everything in Navigator', 'Every future season included', 'Forever'], cta: 'Become a Voyager', best: false },
];

function Pricing() {
  return (
    <section className="sec-pad" id="pricing" style={{ background: 'var(--bg-2)' }}>
      <div className="wrap">
        <Reveal><div className="kicker" style={{ marginBottom: 18 }}>Pricing</div></Reveal>
        <Reveal delay={0.05}><h2 className="h2" style={{ maxWidth: '18ch' }}>Begin free. Upgrade when it&rsquo;s earned.</h2></Reveal>
        <div className="price-grid">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={0.1 + i * 0.07} style={{ display: 'flex' }}>
              <div className="tier" data-best={t.best} style={{ width: '100%' }}>
                {t.best && <div className="tier-badge">MOST POPULAR</div>}
                <h3>{t.name}</h3>
                <div className="price"><span className="amt">{t.amt}</span><span className="per">{t.per}</span></div>
                <div className="sub">{t.sub}</div>
                <ul>
                  {t.feats.map((f) => <li key={f}><span className="ck"><SiteIcon name="check" size={17} sw={2.1} /></span>{f}</li>)}
                </ul>
                <a href={APP_URL} className={'btn ' + (t.best ? 'btn-primary' : 'btn-ghost')} style={{ justifyContent: 'center' }}>{t.cta}</a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Closer() {
  return (
    <section className="closer">
      <div className="glow" />
      <div className="wrap" style={{ position: 'relative' }}>
        <Reveal><div style={{ color: 'var(--accent)', display: 'flex', justifyContent: 'center', marginBottom: 26 }}><SiteIcon name="compass" size={34} sw={1.4} /></div></Reveal>
        <Reveal delay={0.05}><h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 74px)' }}>Meet your day<br />tonight.</h2></Reveal>
        <Reveal delay={0.1}>
          <div style={{ marginTop: 34, display: 'flex', justifyContent: 'center' }}>
            <a href={APP_URL} className="btn btn-primary" style={{ padding: '16px 26px', fontSize: 16 }}>
              <SiteIcon name="apple" size={19} /> Download on the App Store
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.15}><div className="hero-note" style={{ marginTop: 16 }}>Free daily reading · no card to start</div></Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <a href="#top" className="brand"><span className="mk"><SiteIcon name="compass" size={18} /></span>WAYFINDER</a>
          <div className="foot-links">
            <a href="#how">How it works</a><a href="#archetypes">Archetypes</a><a href="#pricing">Pricing</a>
            <a href="/about">About</a><a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a><a href="mailto:privacy@wayfinderapp.life">Contact</a>
          </div>
        </div>
        <div className="foot-copy">© 2026 Wayfinder. Find meaning in every step.</div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <>
      <Nav />
      <Hero />
      <Mirror />
      <HowItWorks />
      <Archetypes />
      <Showcase />
      <Evolution />
      <Pricing />
      <Closer />
      <Footer />
    </>
  );
}
