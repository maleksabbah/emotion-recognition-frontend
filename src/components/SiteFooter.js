import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Analyze', href: '/upload' },
      { label: 'Live', href: '/live' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export const CONTACT_EMAIL = 'hello@mntis.app';

export default function SiteFooter() {
  return (
    <footer className="border-t border-bone/10">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 flex flex-col md:flex-row md:justify-between gap-10">
        <div className="max-w-xs">
          <div className="font-display text-4xl font-light italic">mntis.</div>
          <p className="text-sm text-mist mt-3 leading-relaxed font-light">
            Reads the expression on a face, in photos, video and live camera.
          </p>
        </div>

        <div className="flex flex-wrap gap-12">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist mb-4">{col.title}</div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-bone/70 hover:text-bone transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist mb-4">Contact</div>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-bone/70 hover:text-bone transition-colors">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 pb-8 font-mono text-[11px] text-mist">
        © {new Date().getFullYear()} mntis. All rights reserved.
      </div>
    </footer>
  );
}
