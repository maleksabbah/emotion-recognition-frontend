import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

// Shared shell for /privacy and /terms.
export default function LegalLayout({ eyebrow, title, italic, updated, intro, children }) {
  return (
    <main className="min-h-screen bg-ink text-bone flex flex-col">
      <SiteNav />

      <div className="flex-1 max-w-3xl w-full mx-auto px-5 md:px-8 pt-16 pb-24">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">── {eyebrow}</div>
        <h1 className="font-display text-6xl md:text-7xl font-light tracking-tight leading-[0.95] mb-6">
          {title}
          {italic && (
            <>
              <br />
              <span className="italic text-rust">{italic}</span>
            </>
          )}
        </h1>
        <div className="font-mono text-xs text-mist mb-10">Last updated {updated}</div>
        {intro && <p className="text-lg text-bone/80 font-light leading-relaxed mb-4">{intro}</p>}

        <article className="legal">{children}</article>
      </div>

      <SiteFooter />
    </main>
  );
}
