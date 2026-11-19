'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { FALLBACK_PLANS, findPlan, formatPrice, planFeatureLines } from '@/lib/plans';
import useSignedIn from '@/lib/useSignedIn';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { CheckIcon } from '@/components/ui';

const FAQS = [
  {
    q: 'What counts as an analysis?',
    a: 'Each photo or video you submit counts as one analysis of that type, however many faces are in it. Photos count against your monthly photos and videos against your monthly videos. Live mode is measured separately, in minutes streamed.',
  },
  {
    q: 'What happens when I reach a limit?',
    a: "New photos or videos are paused until your allowance resets, and live mode stops when your live minutes run out. A single live session also ends when it reaches the per-session cap; you can start another while you still have minutes left. Files over the size limit are refused, and videos longer than your plan allows stop with a message instead of being analysed. Everything already in your archive stays available.",
  },
  {
    q: 'When do limits reset?',
    a: 'Monthly allowances reset on the first day of each month at 00:00 UTC. Unused allowance does not carry over. The hourly upload cap frees up again as the hour passes.',
  },
  {
    q: 'Are my uploads used for training?',
    a: 'No. Your photos, videos, live frames and results are used only to give you your results and show them in your archive. They are never used to train models and never sold.',
  },
  {
    q: 'Can I delete my data?',
    a: 'Yes. Email privacy@mntis.app from the address on your account and we will delete your files, results or whole account.',
  },
];

export default function PricingPage() {
  const signedIn = useSignedIn();
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .getPlans()
      .then((d) => {
        if (alive && Array.isArray(d?.plans) && d.plans.length) setPlans(d.plans);
      })
      .catch(() => {
        // Keep the fallback numbers.
      });
    return () => {
      alive = false;
    };
  }, []);

  const free = findPlan(plans, 'free');
  const pro = findPlan(plans, 'pro');

  const tiers = [
    {
      key: 'free',
      name: 'Free',
      price: formatPrice(free),
      tagline: 'Everything you need to start reading faces.',
      plan: free,
      available: free?.available !== false,
      extras: ['Annotated results in your archive'],
    },
    {
      key: 'pro',
      name: 'Pro',
      price: formatPrice(pro),
      tagline: 'For regular use: twenty times the photos, longer videos and hours of live mode.',
      plan: pro,
      available: pro?.available === true,
      extras: ['Annotated results in your archive'],
      highlight: true,
    },
  ];

  return (
    <main className="min-h-screen bg-ink text-bone flex flex-col">
      <SiteNav />

      <div className="flex-1 max-w-7xl w-full mx-auto px-5 md:px-8 pt-16 pb-24">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">── Pricing</div>
        <h1 className="font-display text-6xl md:text-8xl font-light tracking-tight leading-[0.95] mb-6">
          Free to begin.<br />
          <span className="italic text-rust">More, soon.</span>
        </h1>
        <p className="text-lg text-bone/75 font-light leading-relaxed max-w-xl mb-16">
          Start on the free plan with a monthly allowance of photos, videos and live minutes. Pro, with much
          higher limits, is coming soon.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          {tiers.map((t) => (
            <PlanCard key={t.key} tier={t} signedIn={signedIn} />
          ))}
        </div>

        {/* FAQ */}
        <section className="mt-28 max-w-3xl">
          <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">── Questions</div>
          <h2 className="font-display text-5xl md:text-6xl font-light tracking-tight mb-10">
            Before you <span className="italic">begin.</span>
          </h2>
          <div className="space-y-2">
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={f.q} className="panel overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-6 px-5 py-4 text-left"
                  >
                    <span className="font-display text-xl font-light">{f.q}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      className={`shrink-0 text-mist transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-bone/70 leading-relaxed font-light">{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-10 text-sm text-mist">
            Something else? <a href="mailto:hello@mntis.app" className="text-bone underline underline-offset-4 decoration-rust">hello@mntis.app</a>
          </p>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function PlanCard({ tier, signedIn }) {
  const lines = [...planFeatureLines(tier.plan), ...tier.extras];
  return (
    <div className={`panel relative p-8 flex flex-col ${tier.highlight ? 'border-rust/50' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-mist">{tier.name}</div>
        {!tier.available && (
          <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-rust/15 text-bone border border-rust/40">
            Coming soon
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-display text-6xl font-light tracking-tight">{tier.price || 'Free.'}</span>
        {tier.price && <span className="text-sm text-mist">/ month</span>}
      </div>
      <p className="text-sm text-mist font-light mb-8">{tier.tagline}</p>

      <ul className="space-y-3 mb-10 flex-1">
        {lines.map((l) => (
          <li key={l} className="flex items-start gap-2.5 text-sm text-bone/80">
            <CheckIcon size={14} className="text-rust mt-[3px] shrink-0" />
            {l}
          </li>
        ))}
      </ul>

      {tier.available ? (
        <Link
          href={signedIn ? '/upload' : '/auth?mode=register'}
          className="btn-primary w-full"
        >
          {signedIn ? 'Start analyzing' : 'Get started'}
        </Link>
      ) : (
        <button type="button" disabled className="btn-primary w-full">
          Coming soon
        </button>
      )}
    </div>
  );
}
