'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

// ── Tunables ──────────────────────────────────────────────────────────
const SEND_FPS = 1.5;
const STABILITY_FRAMES = 3;
const CONFIDENCE_THRESHOLD = 0.40;
const TOP_N = 3;

function extractPrediction(raw) {
  if (!raw) return null;
  const payload = raw.type === 'result' && raw.data ? raw.data : raw;
  const face = payload.faces?.[0] || payload.predictions?.[0] || null;
  const emotion =
    payload.top_emotion ||
    payload.emotion ||
    face?.top_emotion ||
    face?.emotion ||
    null;
  if (!emotion) return null;
  const probs =
    payload.emotions ||
    payload.probabilities ||
    face?.emotions ||
    face?.probabilities ||
    null;
  return {
    emotion,
    confidence:
      payload.top_confidence ??
      payload.confidence ??
      face?.top_confidence ??
      face?.confidence ??
      null,
    valence: payload.valence ?? face?.valence ?? null,
    arousal: payload.arousal ?? face?.arousal ?? null,
    intensity: payload.intensity ?? face?.intensity ?? null,
    probs,
  };
}


export default function LivePage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const streakRef = useRef({ label: null, count: 0 });

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState(null);
  const [stable, setStable] = useState(null);
  const [history, setHistory] = useState([]);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push('/auth');
    }
  }, [router]);

  useEffect(() => {
    return () => stopStream();
  }, []);

  async function startStream() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const ws = api.openLiveSocket(
        (data) => {
          if (data?.type && data.type !== 'result') return;
          const pred = extractPrediction(data);
          if (!pred) return;

          setLatest(pred);
          setHistory((h) => [pred, ...h].slice(0, 8));

          const confOk =
            pred.confidence == null || pred.confidence >= CONFIDENCE_THRESHOLD;
          const streak = streakRef.current;
          if (pred.emotion === streak.label) {
            streak.count += 1;
          } else {
            streak.label = pred.emotion;
            streak.count = 1;
          }
          if (confOk && streak.count >= STABILITY_FRAMES) {
            setStable(pred);
          } else if (!confOk && streak.count >= STABILITY_FRAMES) {
            setStable(null);
          }
        },
        (err) => setError('WebSocket error: ' + (err.message || 'unknown')),
        () => setStreaming(false),
      );
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        setStreaming(true);
        let frames = 0;
        let lastTick = Date.now();
        const intervalMs = Math.round(1000 / SEND_FPS);

        intervalRef.current = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video || video.readyState < 2) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);

          canvas.toBlob(
            (blob) => {
              if (blob && ws.readyState === WebSocket.OPEN) {
                blob.arrayBuffer().then((buf) => ws.send(buf));
                frames++;
                const now = Date.now();
                if (now - lastTick >= 1000) {
                  setFps(frames);
                  frames = 0;
                  lastTick = now;
                }
              }
            },
            'image/jpeg',
            1.0,
          );
        }, intervalMs);
      });
    } catch (err) {
      setError(err.message || 'Could not access camera');
    }
  }

  function stopStream() {
    setStreaming(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setFps(0);
    streakRef.current = { label: null, count: 0 };
    setStable(null);
  }

  const display = stable || latest;
  const topN = display?.probs
    ? Object.entries(display.probs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_N)
    : null;
  const showUnknown =
    streaming &&
    latest &&
    latest.confidence != null &&
    latest.confidence < CONFIDENCE_THRESHOLD;

  return (
    <main className="min-h-screen bg-ink text-bone">
      <header className="px-8 py-6 flex justify-between items-center border-b border-bone/10">
        <Link href="/" className="font-mono text-xs tracking-wider">
          <span className="text-rust">●</span> MNTIS / LIVE
        </Link>
        <nav className="flex gap-8 text-xs font-mono tracking-wider uppercase">
          <Link href="/upload">Analyze</Link>
          <Link href="/live" className="text-rust">Live</Link>
          <Link href="/sessions">Archive</Link>
          <button onClick={() => { api.logout(); router.push('/'); }}>Sign out</button>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
          ── Composition no. 02
        </div>
        <div className="flex items-end justify-between mb-16">
          <h1 className="font-display text-7xl md:text-8xl font-light tracking-tight">
            Live<br /><span className="italic text-rust">reading.</span>
          </h1>
          {streaming && (
            <div className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rust pulse-live" />
              LIVE · {fps} FPS
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Video */}
          <div className="lg:col-span-8">
            <div className="relative aspect-[4/3] border border-bone/20 bg-ink overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!streaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/90">
                  <div className="text-center">
                    <div className="font-display text-6xl italic font-light text-mist mb-6">
                      Camera<br />off.
                    </div>
                    <button onClick={startStream} className="btn-primary">
                      Begin streaming →
                    </button>
                  </div>
                </div>
              )}

              {streaming && (stable?.emotion || showUnknown) && (
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-ink via-ink/60 to-transparent">
                  <div className="font-mono text-xs uppercase tracking-wider text-mist mb-2">CURRENT</div>
                  <div className="font-display text-6xl italic font-light text-rust">
                    {stable?.emotion ? stable.emotion.toUpperCase() : 'READING…'}
                  </div>
                  {stable?.confidence != null && (
                    <div className="font-mono text-xs text-mist mt-2">
                      {(stable.confidence * 100).toFixed(0)}% certain
                    </div>
                  )}

                  {(stable?.valence || stable?.arousal || stable?.intensity) && (
                    <div className="flex gap-6 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
                      {stable.valence && (
                        <span>
                          val <span className="text-bone">{stable.valence}</span>
                        </span>
                      )}
                      {stable.arousal && (
                        <span>
                          arousal <span className="text-bone">{stable.arousal}</span>
                        </span>
                      )}
                      {stable.intensity && (
                        <span>
                          intensity <span className="text-bone">{stable.intensity}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {streaming && (
              <button onClick={stopStream} className="btn-ghost mt-6">
                Stop streaming
              </button>
            )}

            {error && (
              <div className="font-mono text-xs text-rust border-l-2 border-rust pl-4 py-2 mt-6">
                {error}
              </div>
            )}
          </div>

          {/* Right column: top-N bars + history feed */}
          <div className="lg:col-span-4 space-y-12">
            {topN && topN.length > 0 && (
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-mist mb-6">
                  ── Top {topN.length}
                </div>
                <ul className="space-y-3">
                  {topN.map(([emotion, prob]) => (
                    <li key={emotion} className="font-mono text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="uppercase tracking-wider">{emotion}</span>
                        <span className="text-mist">{(prob * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-[2px] bg-bone/10 overflow-hidden">
                        <div
                          className="h-full bg-rust transition-all duration-300"
                          style={{ width: `${Math.max(2, prob * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-mist mb-6">
                ── Stream feed
              </div>
              {history.length === 0 ? (
                <div className="font-display text-2xl italic text-mist">
                  Nothing to read.
                </div>
              ) : (
                <ul className="space-y-3">
                  {history.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between border-b border-bone/10 pb-3"
                      style={{ opacity: 1 - i * 0.1 }}
                    >
                      <span className="font-display text-2xl italic">{h.emotion || '—'}</span>
                      <span className="font-mono text-xs text-mist">
                        {h.confidence != null ? `${(h.confidence * 100).toFixed(0)}%` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}