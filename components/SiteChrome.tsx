'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ?? 'https://apps.apple.com/app/id6781383516';

function Icon({ name, size = 18, sw = 1.7, style }: { name: string; size?: number; sw?: number; style?: CSSProperties }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactNode> = {
    compass: <g {...p}><circle cx="12" cy="12" r="8.2" /><path d="M14.8 9.2 11 11l-1.8 3.8L13 13z" fill="currentColor" stroke="none" /></g>,
    apple: <g fill="currentColor"><path d="M16.3 12.3c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3 0 0-2.1-.8-2.1-3.2zM14.4 6.2c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-1 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z" /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', ...style }}>{paths[name]}</svg>;
}

export function SiteNav() {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > 30);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className="nav" data-scrolled={s}>
      <div className="wrap nav-inner">
        <a href="/" className="brand"><span className="mk"><Icon name="compass" size={18} /></span>WAYFINDER</a>
        <div className="nav-links">
          <a href="/#how">How it works</a>
          <a href="/#archetypes">Archetypes</a>
          <a href="/#pricing">Pricing</a>
          <a href={APP_URL} className="btn btn-primary" style={{ padding: '10px 18px' }}>
            <Icon name="apple" size={16} /> Download
          </a>
        </div>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <a href="/" className="brand"><span className="mk"><Icon name="compass" size={18} /></span>WAYFINDER</a>
          <div className="foot-links">
            <a href="/#how">How it works</a><a href="/#archetypes">Archetypes</a><a href="/#pricing">Pricing</a>
            <a href="/about">About</a><a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a><a href="mailto:privacy@wayfinderapp.life">Contact</a>
          </div>
        </div>
        <div className="foot-copy">© 2026 Wayfinder. Find meaning in every step.</div>
      </div>
    </footer>
  );
}
