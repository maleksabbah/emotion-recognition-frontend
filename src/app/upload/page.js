'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatBytes, formatDuration, formatResetDate, nextResetFallback } from '@/lib/plans';
import { friendlyError } from '@/lib/limitCopy';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { ErrorBox } from '@/components/ui';

function kindOf(f) {
  if (!f || !f.type) return null;
  if (f.type.startsWith('image/')) return 'photo';
  if (f.type.startsWith('video/')) return 'video';
  return null;
}

// Reads a video's duration from its metadata. Resolves null if the browser
// can't tell (the server still enforces the limit).
function readVideoDuration(f) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(f);
      const v = document.createElement('video');
      v.preload = 'metadata';
      const done = (val) => {
        URL.revokeObjectURL(url);
        resolve(val);
      };
      v.onloadedmetadata = () => done(isFinite(v.duration) ? v.duration : null);
      v.onerror = () => done(null);
      setTimeout(() => done(null), 4000);
      v.src = url;
    } catch (e) {
      resolve(null);
    }
  });
}

// Remaining allowance for a kind, or null when unknown / uncapped.
function remainingFor(quota, kind) {
  if (!quota || quota.unlimited || !quota.usage_available || !quota.limits || !quota.usage) return null;
  const limit = kind === 'video' ? quota.limits.videos_per_month : quota.limits.photos_per_month;
  const used = kind === 'video' ? quota.usage.videos : quota.usage.photos;
  if (limit == null || used == null) return null;
  return Math.max(0, limit - used);
}

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [quota, setQuota] = useState(null);

  const loadQuota = useCallback(async () => {
    try {
      setQuota(await api.getQuota());
    } catch (e) {
      // Panel just hides; the server still enforces limits.
    }
  }, []);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push('/auth');
      return;
    }
    loadQuota();
  }, [router, loadQuota]);

  const limits = quota && !quota.unlimited ? quota.limits || null : null;
  const resetsAt = quota?.resets_at || nextResetFallback();
  const kind = kindOf(file);
  const remaining = kind ? remainingFor(quota, kind) : null;
  const outOfAllowance = remaining === 0;

  async function handleFile(f) {
    if (!f) return;
    const k = kindOf(f);
    if (!k) {
      setError('Please choose an image or a video file.');
      return;
    }

    // Client-side checks against the plan, so we don't start an upload the
    // server will refuse.
    if (limits) {
      const cap = k === 'video' ? limits.max_video_bytes : limits.max_image_bytes;
      if (cap != null && f.size > cap) {
        setError({
          message: `That ${k} is ${formatBytes(f.size)}. Your plan allows up to ${formatBytes(cap)} per ${k}.`,
          pricing: true,
        });
        return;
      }
      if (k === 'video' && limits.max_video_seconds != null) {
        const secs = await readVideoDuration(f);
        if (secs != null && secs > limits.max_video_seconds + 0.5) {
          setError({
            message: `That video is ${formatDuration(secs)} long. Your plan allows videos up to ${formatDuration(limits.max_video_seconds)}.`,
            pricing: true,
          });
          return;
        }
      }
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setError(null);
    setPreview(URL.createObjectURL(f));
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function startAnalysis() {
    if (!file || outOfAllowance) return;
    setError(null);
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
      setError(friendlyError(err, { kind, limits, resetsAt }));
      // Rejected before anything started (limits, expired link): let the
      // user fix it and retry without re-choosing the file.
      const preStart = ['file_too_large', 'rate_limited', 'quota_exceeded', 'concurrent_limit', 'usage_unavailable', 'upload_expired', 'storage_upload_failed'];
      setPhase(preStart.includes(err?.code) ? 'idle' : 'error');
    } finally {
      setUploading(false);
      loadQuota();
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setProgress(0);
    setPhase('idle');
    setResult(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-ink text-bone flex flex-col">
      <SiteNav />

      <div className="flex-1 max-w-7xl w-full mx-auto px-5 md:px-8 py-16">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
          ── Composition no. 01
        </div>
        <h1 className="font-display text-7xl md:text-8xl font-light tracking-tight mb-10">
          Show me<br /><span className="italic text-rust">a face.</span>
        </h1>

        <UsagePanel quota={quota} resetsAt={resetsAt} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            {!preview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="aspect-[4/3] rounded-xl border-2 border-dashed border-bone/20 hover:border-rust/70 transition-colors cursor-pointer flex flex-col items-center justify-center gap-6 bg-bone/[0.02] px-6"
              >
                <div className="font-display text-7xl font-light italic text-mist">+</div>
                <div className="text-center">
                  <div className="font-display text-2xl mb-2">Drop a photo or video</div>
                  <div className="font-mono text-xs text-mist uppercase tracking-wider">or click to browse</div>
                  {limits && (
                    <div className="font-mono text-[11px] text-mist/80 mt-4">
                      {[
                        limits.max_image_bytes != null && `Photos up to ${formatBytes(limits.max_image_bytes)}`,
                        limits.max_video_bytes != null &&
                          `videos up to ${formatBytes(limits.max_video_bytes)}` +
                            (limits.max_video_seconds != null ? ` / ${formatDuration(limits.max_video_seconds)}` : ''),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            ) : (
              <div className="relative aspect-[4/3] rounded-xl border border-bone/15 overflow-hidden bg-ink">
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
                {phase !== 'done' && !uploading && (
                  <button
                    type="button"
                    onClick={reset}
                    className="btn-ghost btn-sm absolute top-4 right-4 bg-ink/80 backdrop-blur-sm"
                  >
                    Replace
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="font-mono text-xs uppercase tracking-wider text-mist mb-3">Status</div>
            <div className="font-display text-4xl mb-8 italic">
              {phase === 'idle' && (outOfAllowance ? 'Resting until the month turns.' : 'Awaiting subject.')}
              {phase === 'uploading' && 'Sending pixels...'}
              {phase === 'processing' && 'Reading the face...'}
              {phase === 'done' && 'Done.'}
              {phase === 'error' && 'A problem.'}
            </div>

            {(phase === 'uploading' || phase === 'processing') && (
              <div className="mb-8">
                <div className="font-mono text-xs text-mist mb-2">{progress}%</div>
                <div className="h-1 rounded-full bg-bone/10 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-rust rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <ErrorBox error={error} className="mb-6" />

            {phase === 'idle' && file && outOfAllowance && !error && (
              <ErrorBox
                className="mb-6"
                error={{
                  message: `You've used all of this month's ${kind} analyses. Your allowance resets on ${formatResetDate(resetsAt)}.`,
                  pricing: true,
                }}
              />
            )}

            {phase === 'done' && result && <ResultSummary result={result} />}

            {phase === 'idle' && file && (
              <button
                type="button"
                onClick={startAnalysis}
                disabled={uploading || outOfAllowance}
                className="btn-primary w-full"
              >
                Begin analysis
              </button>
            )}

            {(phase === 'done' || phase === 'error') && (
              <button type="button" onClick={reset} className="btn-ghost w-full mt-6">
                {phase === 'done' ? 'Analyze another' : 'Try another file'}
              </button>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function UsagePanel({ quota, resetsAt }) {
  if (!quota) return <div className="mb-10" />;
  const reset = formatResetDate(resetsAt);

  if (quota.unlimited) {
    return (
      <div className="panel inline-flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 mb-10 font-mono text-xs text-mist">
        <span className="text-bone uppercase tracking-wider">{quota.plan || 'Plan'}</span>
        <span>Unlimited</span>
      </div>
    );
  }

  const l = quota.limits || {};
  const u = quota.usage || {};
  const showUsage = quota.usage_available !== false;

  const item = (label, used, limit) => {
    if (limit == null) return null;
    const known = showUsage && used != null;
    const atLimit = known && used >= limit;
    return (
      <span key={label}>
        {label}{' '}
        <span className={atLimit ? 'text-rust' : 'text-bone'}>
          {known ? `${used} / ${limit}` : `up to ${limit}`}
        </span>
      </span>
    );
  };

  const parts = [item('Photos', u.photos, l.photos_per_month), item('Videos', u.videos, l.videos_per_month)].filter(Boolean);

  return (
    <div className="panel inline-flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 mb-10 font-mono text-xs text-mist">
      <span className="text-bone uppercase tracking-wider">{quota.plan || 'Free'}</span>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-4">
          {i > 0 && <span aria-hidden="true">·</span>}
          {p}
        </span>
      ))}
      <span>this month</span>
      {reset && <span>· resets {reset}</span>}
      {!showUsage && <span>· usage counts unavailable right now</span>}
      <Link href="/pricing" className="text-bone underline underline-offset-4 decoration-rust">Plans</Link>
    </div>
  );
}

function ResultSummary({ result }) {
  const total = result.total_faces ?? result.total_frames ?? null;
  return (
    <div className="panel p-6">
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
        <a href={result.download.download_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm mt-5">
          Open full-size
        </a>
      )}
    </div>
  );
}
