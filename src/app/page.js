'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
    <main className="min-h-screen bg-ink text-bone overflow-hidden">
      {/* ── Top bar ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex justify-between items-center">
        <div className="font-mono text-xs tracking-wider">
          <span className="text-rust">●</span> FEELER / v1.0
        </div>
        <nav className="flex gap-8 text-xs font-mono tracking-wider uppercase">
          <Link href="/upload" className="hover:text-rust transition-colors">Analyze</Link>
          <Link href="/live" className="hover:text-rust transition-colors">Live</Link>
          <Link href="/sessions" className="hover:text-rust transition-colors">Archive</Link>
          <Link href="/auth" className="hover:text-rust transition-colors">Sign in</Link>
        </nav>
        <div className="font-mono text-xs tracking-wider hidden md:block">{time}</div>
      </header>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col justify-center px-8 pt-32 pb-20 relative">
        {/* Background composition number */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 font-display text-[20rem] leading-none text-rust opacity-10 pointer-events-none select-none reveal" style={{ animationDelay: '0.4s' }}>
          07
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          {/* Tagline */}
          <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-8 reveal" style={{ animationDelay: '0.1s' }}>
            ── A study of seven feelings
          </div>

          {/* Massive title */}
          <h1 className="font-display text-[15vw] md:text-[11vw] leading-[0.85] tracking-[-0.04em] font-light reveal" style={{ animationDelay: '0.2s' }}>
            <span className="block">Read the</span>
            <span className="block italic font-normal text-rust">unspoken.</span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-16 reveal" style={{ animationDelay: '0.5s' }}>
            <p className="md:col-span-5 md:col-start-1 text-lg leading-relaxed text-bone/80 font-light">
              A multi-stream neural architecture trained on
              <span className="text-bone"> 88,192 faces </span>
              across six datasets. Five region streams attend to each other through transformer fusion to recognize seven core emotional states with state-of-the-art precision.
            </p>

            <div className="md:col-span-5 md:col-start-8 flex flex-col gap-4 items-start">
              <Link href="/upload" className="btn-primary inline-block">
                Upload an image →
              </Link>
              <Link href="/live" className="btn-ghost inline-block">
                Try live mode
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Emotion list ─────────────────────────────── */}
      <section className="border-t border-bone/10 py-20">
        <div className="max-w-7xl mx-auto px-8">
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

      {/* ── Architecture stats ────────────────────── */}
      <section className="border-t border-bone/10 py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat label="Faces trained" value="88,192" sub="across 6 datasets" />
            <Stat label="Region streams" value="05" sub="face / eyes / mouth / cheeks / forehead" />
            <Stat label="Output dimensions" value="04" sub="emotion / valence / arousal / intensity" />
            <Stat label="Architecture" value="ResNet18 + Transformer" sub="multi-stream fusion" />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section className="border-t border-bone/10 py-32">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="font-display text-6xl md:text-8xl font-light tracking-tight mb-20">
            <span className="text-mist">How a face</span><br />
            <span className="italic">becomes a feeling.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step
              num="01"
              title="Detect"
              body="MTCNN locates the face. MediaPipe maps 468 landmarks. Five regions are isolated with surgical precision: the whole face, the eyes, the mouth, the cheeks, the forehead."
            />
            <Step
              num="02"
              title="Encode"
              body="A pretrained ResNet18 reads the face. Four region CNNs read their patches. Each stream returns a vector of features — a numerical fingerprint of what is there."
            />
            <Step
              num="03"
              title="Attend"
              body="A two-layer transformer lets the regions look at each other. Wide eyes ask the mouth what it means. The mouth answers. A single state emerges. Seven emotions. One label. One number."
            />
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

      {/* ── Footer ───────────────────────────────── */}
      <footer className="py-16 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          <div>
            <div className="font-display text-4xl font-light italic">feeler.</div>
            <div className="font-mono text-xs text-mist mt-2">A research instrument · 2026</div>
          </div>
          <div className="font-mono text-xs text-mist space-y-1">
            <div>BUILT WITH PYTORCH</div>
            <div>RESNET18 / TRANSFORMER FUSION</div>
            <div>FASTAPI / NEXT.JS / S3</div>
          </div>
          <div className="flex gap-6 md:justify-end font-mono text-xs uppercase tracking-wider">
            <Link href="/upload" className="hover:text-rust">Analyze</Link>
            <Link href="/live" className="hover:text-rust">Live</Link>
            <Link href="/auth" className="hover:text-rust">Sign in</Link>
          </div>
        </div>
      </footer>
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
