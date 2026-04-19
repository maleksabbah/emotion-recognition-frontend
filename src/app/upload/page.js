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
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      setError('Please select an image or video');
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
    setProgress(0);

    try {
      const upload = await api.uploadFile(file, (p) => setProgress(p));
      setPhase('processing');
      setProgress(10);

      const final = await api.pollSession(upload.session_id, (s) => {
        if (typeof s.progress === 'number') setProgress(s.progress);
      });

      setResult(final);
      setProgress(100);
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
          {/* Drop zone / preview */}
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
                  <div className="font-display text-2xl mb-2">Drop a photo or video</div>
                  <div className="font-mono text-xs text-mist uppercase tracking-wider">or click to browse</div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="relative aspect-[4/3] border border-bone/20 overflow-hidden bg-ink">
                {phase === 'done' && result?.download?.download_url ? (
                  result.download.file_type === 'video' || (result.download.download_url || '').toLowerCase().includes('.mp4') ? (
                    <video
                      src={result.download.download_url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={result.download.download_url}
                      alt="annotated"
                      className="w-full h-full object-contain"
                    />
                  )
                ) : file?.type.startsWith('video/') ? (
                  <video src={preview} className="w-full h-full object-contain" controls />
                ) : (
                  <img src={preview} alt="preview" className="w-full h-full object-contain" />
                )}
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

          {/* Side panel */}
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

            {phase === 'done' && result && <ResultSummary result={result} />}

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

function ResultSummary({ result }) {
  const total = result.total_faces ?? result.total_frames ?? null;
  return (
    <div className="border border-bone/20 p-6">
      <div className="font-mono text-xs text-mist mb-2">SESSION COMPLETE</div>
      <div className="font-display text-4xl italic font-light text-rust mb-4">
        Analysed.
      </div>
      {total != null && (
        <div className="font-mono text-xs text-mist">
          {total} {total === 1 ? 'face' : 'faces'} read
        </div>
      )}
      {result.download?.download_url && (
        <a
          href={result.download.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-mono text-xs uppercase tracking-wider text-rust hover:underline mt-4"
        >
          Open full-size →
        </a>
      )}
    </div>
  );
}
