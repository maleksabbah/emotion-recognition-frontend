'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';
import useSignedIn, { notifyAuthChanged } from '@/lib/useSignedIn';

const APP_LINKS = [
  { label: 'Analyze', href: '/upload' },
  { label: 'Live', href: '/live' },
  { label: 'Archive', href: '/sessions' },
];
const PUBLIC_LINKS = [{ label: 'Pricing', href: '/pricing' }];

export default function SiteNav() {
  const router = useRouter();
  const pathname = usePathname();
  const signedIn = useSignedIn();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = signedIn ? [...APP_LINKS, ...PUBLIC_LINKS] : PUBLIC_LINKS;
  const solid = scrolled || open;

  function signOut() {
    api.logout();
    notifyAuthChanged();
    setOpen(false);
    router.push('/');
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 border-b ${
        solid ? 'bg-ink/85 backdrop-blur-md border-bone/10' : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-baseline gap-2 shrink-0" aria-label="mntis home">
          <span className="text-rust text-xs leading-none">●</span>
          <span className="font-display text-2xl italic font-light tracking-tight leading-none">mntis.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-8" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.href} {...l} active={pathname === l.href} />
          ))}
        </nav>

        <span className="flex-1" />

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {signedIn === false && (
            <>
              <Link href="/auth" className="btn-ghost btn-sm">Sign in</Link>
              <Link href="/auth?mode=register" className="btn-primary btn-sm">Get started</Link>
            </>
          )}
          {signedIn === true && (
            <button type="button" onClick={signOut} className="btn-ghost btn-sm">Sign out</button>
          )}
        </div>

        {/* Mobile: primary action stays visible, the rest goes in the menu */}
        <div className="flex md:hidden items-center gap-2">
          {signedIn === false && (
            <Link href="/auth?mode=register" className="btn-primary btn-sm">Get started</Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="btn-ghost btn-sm !px-3"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="md:hidden border-t border-bone/10 px-5 pb-5 pt-2">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`py-3 border-b border-bone/10 font-display text-2xl font-light ${
                  pathname === l.href ? 'italic text-rust' : 'text-bone'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5">
            {signedIn === false && (
              <Link href="/auth" className="btn-ghost w-full">Sign in</Link>
            )}
            {signedIn === true && (
              <button type="button" onClick={signOut} className="btn-ghost w-full">Sign out</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, label, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active ? 'text-bone bg-bone/[0.06]' : 'text-bone/60 hover:text-bone'
      }`}
    >
      {label}
    </Link>
  );
}
