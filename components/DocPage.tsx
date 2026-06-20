import { Nav, Footer } from '@/components/SiteChrome';

export type Block = { heading?: string; text: string };

export default function DocPage({
  title,
  updated,
  blocks,
}: {
  title: string;
  updated?: string;
  blocks: Block[];
}) {
  return (
    <main className="relative min-h-screen">
      <Nav />
      <article className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-serif text-4xl tracking-tight text-ink">{title}</h1>
        {updated ? (
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-ink4">{updated}</p>
        ) : null}
        <div className="mt-10 space-y-8">
          {blocks.map((b, i) => (
            <section key={i}>
              {b.heading ? (
                <h2 className="font-serif text-xl text-ink">{b.heading}</h2>
              ) : null}
              <p className="mt-2 whitespace-pre-line font-sans leading-relaxed text-ink2">
                {b.text}
              </p>
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </main>
  );
}
