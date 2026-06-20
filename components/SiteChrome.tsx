import Link from 'next/link';

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#';

export function AppStoreButton({ className = '' }: { className?: string }) {
  return (
    <a
      href={APP_STORE_URL}
      className={`inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-sans font-semibold text-bg transition hover:opacity-90 ${className}`}
    >
      <span aria-hidden></span> Download on the App Store
    </a>
  );
}

export function Nav() {
  return (
    <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
      <Link href="/" className="font-serif text-xl tracking-tight text-ink">
        Wayfinder
      </Link>
      <nav className="flex items-center gap-6 font-sans text-sm text-ink2">
        <a href="/#how" className="hidden hover:text-ink sm:inline">How it works</a>
        <a href="/#archetypes" className="hidden hover:text-ink sm:inline">Archetypes</a>
        <a href="/#pricing" className="hidden hover:text-ink sm:inline">Pricing</a>
        <AppStoreButton className="px-4 py-2 text-sm" />
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 mx-auto mt-24 max-w-content border-t border-white/10 px-6 py-10 font-sans text-sm text-ink3">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="font-serif text-lg text-ink2">Wayfinder</div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <a href="mailto:privacy@wayfinderapp.life" className="hover:text-ink">Contact</a>
        </nav>
      </div>
      <p className="mt-6 text-ink4">
        © {new Date().getFullYear()} Wayfinder. Find meaning in every step.
      </p>
    </footer>
  );
}
