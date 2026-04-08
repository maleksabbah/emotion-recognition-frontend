'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | uploading | processing | done | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push('/auth');
    }
  }, [router]);

  function handleFile(f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setFile(f);
    setError('');
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  }

  async function startAnalysis() {
    if (!file) return;
    setError('');
    setUploading(true);
    setPhase('uploading');

    try {
      const upload = await api.uploadFile(file, (p) => setProgress(p));
      setPhase('processing');

      const final = await api.pollSession(upload.session_id, (s) => {
        if (s.progress != null) setProgress(s.progress);
      });

      setResult(final);
      setPhase('done');
    } catch (err) {
      setError(err.message || 'Upload failed');
      setPhase('error');
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setPhase('idle');
    setResult(null);
    setError('');
  }

  return (
    <main className="min-h-screen bg-ink text-bone">
      {/* Top bar */}
      <header className="px-8 py-6 flex justify-between items-center border-b border-bone/10">
        <Link href="/" className="font-mono text-xs tracking-wider">
          <span className="text-rust">●</span> FEELER / ANALYZE
        </Link>
        <nav className="flex gap-8 text-xs font-mono tracking-wider uppercase">
          <Link href="/upload" className="text-rust">Analyze</Link>
          <Link href="/live">Live</Link>
          <Link href="/sessions">Archive</Link>
          <button onClick={() => { api.logout(); router.push('/'); }}>Sign out</button>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
          ── Composition no. 01
        </div>
        <h1 className="font-display text-7xl md:text-8xl font-light tracking-tight mb-16">
          Show me<br /><span className="italic text-rust">a face.</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* ── Drop zone / preview ─────────────────── */}
          <div className="lg:col-span-7">
            {!preview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="aspect-[4/3] border-2 border-dashed border-bone/30 hover:border-rust transition-colors cursor-pointer flex flex-col items-center justify-center gap-6 bg-bone/[0.02]"
              >
                <div className="font-display text-7xl font-light italic text-mist">+</div>
                <div className="text-center">
                  <div className="font-display text-2xl mb-2">Drop an image here</div>
                  <div className="font-mono text-xs text-mist uppercase tracking-wider">or click to browse</div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="relative aspect-[4/3] border border-bone/20 overflow-hidden bg-ink">
                <img src={preview} alt="preview" className="w-full h-full object-contain" />
                {phase !== 'done' && (
                  <button
                    onClick={reset}
                    className="absolute top-4 right-4 font-mono text-xs px-3 py-2 bg-ink/80 border border-bone/30 hover:border-rust hover:text-rust"
                  >
                    REPLACE ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Side panel ──────────────────────────── */}
          <div className="lg:col-span-5">
            <div className="font-mono text-xs uppercase tracking-wider text-mist mb-3">Status</div>
            <div className="font-display text-4xl mb-8 italic">
              {phase === 'idle' && 'Awaiting subject.'}
              {phase === 'uploading' && 'Sending pixels...'}
              {phase === 'processing' && 'Reading the face...'}
              {phase === 'done' && 'Done.'}
              {phase === 'error' && 'A problem.'}
            </div>

            {(phase === 'uploading' || phase === 'processing') && (
              <div className="mb-8">
                <div className="font-mono text-xs text-mist mb-2">{progress}%</div>
                <div className="h-px bg-bone/20 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-rust transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="font-mono text-xs text-rust border-l-2 border-rust pl-4 py-2 mb-6">
                {error}
              </div>
            )}

            {phase === 'done' && result && <ResultPanel result={result} />}

            {phase === 'idle' && file && (
              <button onClick={startAnalysis} className="btn-primary w-full">
                Begin analysis →
              </button>
            )}

            {phase === 'done' && (
              <button onClick={reset} className="btn-ghost w-full mt-6">
                Analyze another
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ResultPanel({ result }) {
  // Try to handle multiple possible response shapes from the backend
  const faces = result.faces || result.predictions || result.results || [];
  const single = result.emotion || result.prediction;

  if (single && faces.length === 0) {
    return <SingleResult data={single} />;
  }

  if (faces.length === 0) {
    return (
      <div className="border border-bone/20 p-6">
        <div className="font-mono text-xs text-mist mb-2">RAW RESPONSE</div>
        <pre className="text-xs font-mono overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {faces.map((f, i) => (
        <SingleResult key={i} data={f} idx={i + 1} total={faces.length} />
      ))}
    </div>
  );
}

function SingleResult({ data, idx, total }) {
  const emotion = (data.emotion || data.label || 'unknown').toUpperCase();
  const confidence = data.confidence || data.score || data.probability;
  const valence = data.valence;
  const arousal = data.arousal;
  const intensity = data.intensity;

  return (
    <div className="border border-bone/20 p-6">
      {idx && total > 1 && (
        <div className="font-mono text-xs text-mist mb-2">FACE {idx} OF {total}</div>
      )}
      <div className="font-display text-6xl italic font-light text-rust mb-2">{emotion}</div>
      {confidence != null && (
        <div className="font-mono text-xs text-mist">
          {(confidence * 100).toFixed(1)}% CONFIDENCE
        </div>
      )}

      {(valence || arousal || intensity) && (
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-bone/10">
          {valence && <Dim label="Valence" value={valence} />}
          {arousal && <Dim label="Arousal" value={arousal} />}
          {intensity && <Dim label="Intensity" value={intensity} />}
        </div>
      )}
    </div>
  );
}

function Dim({ label, value }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-mist mb-1">{label}</div>
      <div className="font-display text-lg italic">{typeof value === 'string' ? value : JSON.stringify(value)}</div>
    </div>
  );
}
