import { SiteNav, SiteFooter } from '@/components/SiteChrome';

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
    <main>
      <SiteNav />
      <div className="wrap">
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '150px 0 40px' }}>
          <h1 className="h2" style={{ marginBottom: 10 }}>{title}</h1>
          {updated ? <div className="kicker">{updated}</div> : null}
          <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 30 }}>
            {blocks.map((b, i) => (
              <section key={i}>
                {b.heading ? (
                  <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '0 0 8px' }}>
                    {b.heading}
                  </h2>
                ) : null}
                <p className="body" style={{ whiteSpace: 'pre-line', color: 'var(--text-2)' }}>{b.text}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
