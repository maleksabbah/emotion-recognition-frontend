'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatClock, formatDuration, formatResetDate, nextResetFallback } from '@/lib/plans';
import { friendlyError } from '@/lib/limitCopy';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { ErrorBox } from '@/components/ui';

// ── Tunables ──────────────────────────────────────────────────────────
const SEND_FPS = 1.5;
const STABILITY_FRAMES = 3;
const CONFIDENCE_THRESHOLD = 0.40;
const TOP_N = 3;
// Server closes the socket with this code when a live limit is hit
// (per-session cap, monthly allowance used up, or a session already open).
const LIVE_LIMIT_CLOSE = 4002;
// If the per-session countdown reaches zero and the server hasn't closed
// the socket yet, stop on our side after this grace period.
const CAP_GRACE_MS = 3000;

// Live allowance from /auth/quota. Values are null when unknown.
function liveAllowance(quota) {
  if (!quota) return { known: false };
  if (quota.unlimited) return { known: true, unlimited: true };
  const l = quota.limits || {};
  const monthSecs = l.live_minutes_per_month != null ? l.live_minutes_per_month * 60 : null;
  const used = quota.usage_available !== false ? quota.usage?.live_seconds ?? null : null;
  const remaining = monthSecs != null && used != null ? Math.max(0, monthSecs - used) : null;
  return {
    known: true,
    unlimited: false,
    monthSecs,
    used,
    remaining,
    sessionCap: l.live_session_max_seconds ?? null,
  };
}

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
  const limitMsgRef = useRef(null);
  const userStopRef = useRef(false);
  const capTimerRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState(null);
  const [stable, setStable] = useState(null);
  const [history, setHistory] = useState([]);
  const [fps, setFps] = useState(0);
  const [quota, setQuota] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const loadQuota = useCallback(async () => {
    try {
      setQuota(await api.getQuota());
    } catch (e) {
      // Allowance line just hides; the server still enforces limits.
    }
  }, []);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push('/auth');
      return;
    }
    loadQuota();
  }, [router, loadQuota]);

  const allowance = liveAllowance(quota);
  const noneLeft = allowance.known && !allowance.unlimited && allowance.remaining === 0;
  // Seconds this session may run: per-session cap, or what's left this
  // month if that's smaller.
  const sessionBudget = (() => {
    if (!allowance.known || allowance.unlimited) return null;
    const caps = [allowance.sessionCap, allowance.remaining].filter((v) => v != null);
    return caps.length ? Math.min(...caps) : null;
  })();
  const secondsLeft =
    streaming && startedAt && sessionBudget != null
      ? Math.max(0, sessionBudget - (now - startedAt) / 1000)
      : null;

  // Countdown tick while streaming.
  useEffect(() => {
    if (!streaming || sessionBudget == null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [streaming, sessionBudget]);

  // Countdown reached zero: the server should close the socket; if it
  // hasn't after a short grace period, stop locally.
  useEffect(() => {
    if (secondsLeft !== 0 || capTimerRef.current) return;
    capTimerRef.current = setTimeout(() => {
      capTimerRef.current = null;
      if (wsRef.current) {
        limitMsgRef.current = limitMsgRef.current || 'This live session reached its time limit.';
        setError({ message: limitMsgRef.current, pricing: true });
        userStopRef.current = true;
        stopStream();
      }
    }, CAP_GRACE_MS);
  }, [secondsLeft]);

  useEffect(() => {
    return () => stopStream();
  }, []);

  async function startStream() {
    if (noneLeft) return;
    setError('');
    limitMsgRef.current = null;
    userStopRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const ws = api.openLiveSocket(
        (data) => {
          if (data?.type === 'limit') {
            // e.g. {"type":"limit","code":"live_limit","detail":"..."}; the
            // server closes with 4002 right after.
            limitMsgRef.current = data.detail || 'Live limit reached.';
            setError({ message: limitMsgRef.current, pricing: true });
            return;
          }
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
        () => {
          // A limit close may also fire onerror in some browsers; the close
          // handler below sets the right message either way.
          if (!limitMsgRef.current) setError('Lost the connection to the live service.');
        },
        (event) => {
          const byUser = userStopRef.current;
          if (event && event.code === LIVE_LIMIT_CLOSE) {
            const msg = limitMsgRef.current || event.reason || 'Live limit reached.';
            limitMsgRef.current = msg;
            setError({ message: msg, pricing: true });
          } else if (!byUser && !limitMsgRef.current && event && event.code !== 1000) {
            setError('The live session ended unexpectedly. Please try again.');
          }
          // Release the camera and timers however the socket closed.
          wsRef.current = null;
          stopStream();
          loadQuota();
        },
      );
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        setStreaming(true);
        setStartedAt(Date.now());
        setNow(Date.now());
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
      setError(friendlyError(err) || 'Could not access camera');
      stopStream();
    }
  }

  function handleStopClick() {
    userStopRef.current = true;
    stopStream();
  }

  function stopStream() {
    setStreaming(false);
    setStartedAt(null);
    if (capTimerRef.current) {
      clearTimeout(capTimerRef.current);
      capTimerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.close(1000);
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
    <main className="min-h-screen bg-ink text-bone flex flex-col">
      <SiteNav />

      <div className="flex-1 max-w-7xl w-full mx-auto px-5 md:px-8 py-16">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
          ── Composition no. 02
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <h1 className="font-display text-7xl md:text-8xl font-light tracking-tight">
            Live<br /><span className="italic text-rust">reading.</span>
          </h1>
          {streaming && (
            <div className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rust pulse-live" />
              LIVE · {fps} FPS
              {secondsLeft != null && (
                <span className={`ml-2 px-2 py-0.5 rounded-md border ${secondsLeft <= 15 ? 'border-rust/60 text-bone bg-rust/15' : 'border-bone/15 text-mist'}`}>
                  {formatClock(secondsLeft)} left
                </span>
              )}
            </div>
          )}
        </div>

        <LiveAllowance allowance={allowance} resetsAt={quota?.resets_at || nextResetFallback()} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Video */}
          <div className="lg:col-span-8">
            <div className="relative aspect-[4/3] rounded-xl border border-bone/15 bg-ink overflow-hidden">
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
                    <button type="button" onClick={startStream} disabled={noneLeft} className="btn-primary">
                      Begin streaming
                    </button>
                    {noneLeft && (
                      <div className="font-mono text-xs text-mist mt-4 max-w-xs mx-auto px-4">
                        No live minutes left this month. Resets {formatResetDate(quota?.resets_at || nextResetFallback())}.{' '}
                        <Link href="/pricing" className="text-bone underline underline-offset-4 decoration-rust">See plans</Link>
                      </div>
                    )}
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
              <button type="button" onClick={handleStopClick} className="btn-ghost mt-6">
                Stop streaming
              </button>
            )}

            <ErrorBox error={error} className="mt-6" />
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
                      <div className="h-[3px] rounded-full bg-bone/10 overflow-hidden">
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

      <SiteFooter />
    </main>
  );
}

function LiveAllowance({ allowance, resetsAt }) {
  if (!allowance.known) return <div className="mb-10" />;
  const reset = formatResetDate(resetsAt);
  if (allowance.unlimited) {
    return (
      <div className="panel inline-flex items-center gap-4 px-4 py-2.5 mb-10 font-mono text-xs text-mist">
        <span className="text-bone uppercase tracking-wider">Live</span>
        <span>Unlimited</span>
      </div>
    );
  }
  const mins = (s) => Math.floor(s / 60);
  return (
    <div className="panel inline-flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 mb-10 font-mono text-xs text-mist">
      <span className="text-bone uppercase tracking-wider">Live</span>
      {allowance.remaining != null ? (
        <span>
          <span className={allowance.remaining === 0 ? 'text-rust' : 'text-bone'}>
            {mins(allowance.remaining)} of {mins(allowance.monthSecs)} min
          </span>{' '}
          left this month
        </span>
      ) : allowance.monthSecs != null ? (
        <span>
          <span className="text-bone">{mins(allowance.monthSecs)} min</span> a month
        </span>
      ) : null}
      {allowance.sessionCap != null && (
        <span>· up to {formatDuration(allowance.sessionCap)} per session</span>
      )}
      {reset && <span>· resets {reset}</span>}
      <Link href="/pricing" className="text-bone underline underline-offset-4 decoration-rust">Plans</Link>
    </div>
  );
}