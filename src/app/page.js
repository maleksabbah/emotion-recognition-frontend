'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { TrustPoints, CheckIcon } from '@/components/ui';
import useSignedIn from '@/lib/useSignedIn';
import { FALLBACK_PLANS, findPlan, planFeatureLines } from '@/lib/plans';

const EMOTIONS = [
  { name: 'JOY', color: '#d4a574', meta: '01' },
  { name: 'GRIEF', color: '#5b7553', meta: '02' },
  { name: 'WRATH', color: '#c1440e', meta: '03' },
  { name: 'AWE', color: '#a8a29e', meta: '04' },
  { name: 'DREAD', color: '#3d2645', meta: '05' },
  { name: 'CONTEMPT', color: '#8b6914', meta: '06' },
  { name: 'STILLNESS', color: '#f5f1e8', meta: '07' },
];

export default function Home() {
  const [time, setTime] = useState('');
  const [hovered, setHovered] = useState(null);
  const signedIn = useSignedIn();
  const freeLines = planFeatureLines(findPlan(FALLBACK_PLANS, 'free')).slice(0, 3);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const hh = d.getUTCHours().toString().padStart(2, '0');
      const mm = d.getUTCMinutes().toString().padStart(2, '0');
      const ss = d.getUTCSeconds().toString().padStart(2, '0');
      setTime(`${hh}:${mm}:${ss} UTC`);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <main className="min-h-screen bg-ink text-bone overflow-x-clip">
      <SiteNav />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="min-h-[calc(100vh-4rem)] flex flex-col justify-center px-5 md:px-8 pt-16 pb-20 relative">
        {/* Opacity lives on the wrapper: the .reveal animation animates
            opacity to 1 and would otherwise override opacity-10. */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-10 pointer-events-none select-none" aria-hidden="true">
          <div className="font-display text-[20rem] leading-none text-rust reveal" style={{ animationDelay: '0.4s' }}>
            07
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="flex items-baseline justify-between gap-6 mb-8 reveal" style={{ animationDelay: '0.1s' }}>
            <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist">
              ── A study of seven feelings
            </div>
            <div className="font-mono text-xs tracking-wider text-mist hidden md:block">{time}</div>
          </div>

          <h1 className="font-display text-[15vw] md:text-[11vw] leading-[0.85] tracking-[-0.04em] font-light reveal" style={{ animationDelay: '0.2s' }}>
            <span className="block">Read the</span>
            <span className="block italic font-normal text-rust">unspoken.</span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-16 reveal" style={{ animationDelay: '0.5s' }}>
            <p className="md:col-span-5 md:col-start-1 text-lg leading-relaxed text-bone/80 font-light">
              Show it a photograph, a video, or your own face through the camera. mntis finds every face in the
              frame and reads what it carries
              <span className="text-bone"> — the feeling, how sure we are, how warm or cold it runs, how strongly it shows.</span>
            </p>

            <div className="md:col-span-6 md:col-start-7 flex flex-col gap-5 items-start">
              <div className="flex flex-wrap gap-3">
                <Link href={signedIn ? '/upload' : '/auth?mode=register'} className="btn-primary">
                  {signedIn ? 'Upload an image' : 'Get started free'}
                </Link>
                <Link href="/live" className="btn-ghost">
                  Try live mode
                </Link>
              </div>
              <TrustPoints items={['Free to start', 'No credit card', 'Photos, video and live']} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Emotion list ─────────────────────────────── */}
      <section className="border-t border-bone/10 py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-12">
            ── The Catalogue
          </div>

          <ul className="divide-y divide-bone/10">
            {EMOTIONS.map((e, i) => (
              <li
                key={e.name}
                className="group relative py-8 cursor-pointer transition-all"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-baseline justify-between gap-8">
                  <div className="flex items-baseline gap-8">
                    <span className="font-mono text-xs text-mist">{e.meta}</span>
                    <span
                      className="font-display text-6xl md:text-8xl font-light tracking-tight transition-all duration-500"
                      style={{
                        color: hovered === i ? e.color : '#f5f1e8',
                        fontStyle: hovered === i ? 'italic' : 'normal',
                        transform: hovered === i ? 'translateX(2rem)' : 'translateX(0)',
                      }}
                    >
                      {e.name}
                    </span>
                  </div>
                  <div
                    className="hidden md:block w-32 h-px transition-all duration-500"
                    style={{
                      background: hovered === i ? e.color : '#f5f1e8',
                      width: hovered === i ? '8rem' : '2rem',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── What you get ─────────────────────────── */}
      <section className="border-t border-bone/10 py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-12">
            ── What comes back
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat label="Feelings named" value="07" sub="from joy to stillness" />
            <Stat label="Readings per face" value="04" sub="emotion / valence / arousal / intensity" />
            <Stat label="Ways in" value="03" sub="photo / video / live camera" />
            <Stat label="To begin" value="Free" sub="no credit card" />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section className="border-t border-bone/10 py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <h2 className="font-display text-6xl md:text-8xl font-light tracking-tight mb-20">
            <span className="text-mist">How a face</span><br />
            <span className="italic">becomes a feeling.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step
              num="01"
              title="Show"
              body="Upload a photograph or a short video, or turn on your camera and go live. Nothing to install; it all happens in the browser."
            />
            <Step
              num="02"
              title="Read"
              body="We find each face in the frame and read the expression it wears — once for a photo, frame by frame for a video, moment by moment when live."
            />
            <Step
              num="03"
              title="Receive"
              body="Your image comes back annotated. Each face carries a name for what it shows, how certain we are, how positive or negative it reads, and how intense. Everything waits in your archive."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────── */}
      <section className="border-t border-bone/10 py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
          <div className="md:col-span-6">
            <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-6">── Pricing</div>
            <h2 className="font-display text-6xl md:text-7xl font-light tracking-tight leading-[0.95]">
              Free to begin.<br />
              <span className="italic text-rust">More, soon.</span>
            </h2>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <ul className="space-y-3 mb-5">
              {freeLines.map((l) => (
                <li key={l} className="flex items-start gap-2.5 text-bone/80 font-light">
                  <CheckIcon size={14} className="text-rust mt-[5px] shrink-0" />
                  {l}
                </li>
              ))}
            </ul>
            <p className="text-sm text-mist mb-8">
              Pro, with much higher limits, is coming soon at $10 a month.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className="btn-ghost">See pricing</Link>
              {signedIn === false && (
                <Link href="/auth?mode=register" className="btn-primary">Get started</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee strip ───────────────────────── */}
      <div className="border-t border-b border-bone/10 py-8 overflow-hidden bg-rust">
        <div className="marquee-track flex gap-12 whitespace-nowrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="font-display text-5xl text-bone italic font-light">
              joy · grief · wrath · awe · dread · contempt · stillness ·{' '}
            </span>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-wider text-mist mb-3">{label}</div>
      <div className="font-display text-3xl md:text-4xl font-light leading-tight">{value}</div>
      <div className="text-xs text-mist mt-2">{sub}</div>
    </div>
  );
}

function Step({ num, title, body }) {
  return (
    <div>
      <div className="font-mono text-xs text-rust mb-4">{num}</div>
      <div className="font-display text-3xl mb-4 italic">{title}</div>
      <p className="text-bone/70 leading-relaxed font-light">{body}</p>
    </div>
  );
}
