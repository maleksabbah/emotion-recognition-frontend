'use client';

/**
 * /wake — the bridge page users land on when the backend is asleep.
 *
 * Flow:
 *   1. On mount, call the waker Lambda to start the EC2 (idempotent).
 *   2. Poll /health on the backend every 3s until it responds 200.
 *   3. Redirect to / once the backend is reachable.
 *
 * The waker URL and the backend health URL come from env vars so we
 * can swap them without code edits.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const WAKER_URL = process.env.NEXT_PUBLIC_WAKER_URL;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mntis.app';
// How often to poll the backend's /health endpoint. 3s is gentle on
// the server during startup and still feels responsive.
const POLL_MS = 3000;
// How long to wait before giving up and showing an error. A cold start
// of the EC2 + container stack is usually 60–90s; allow plenty of room.
const TIMEOUT_MS = 5 * 60 * 1000;


// Phases tracked in UI state. Drive the headline + spinner + button.
const PHASE = {
  WAKING: 'waking',   // POST'd to waker, waiting on instance to come up
  POLLING: 'polling', // EC2 is starting/running, waiting for backend /health
  READY: 'ready',     // /health returned 200 — redirect imminent
  ERROR: 'error',     // gave up
};


export default function WakePage() {
  const router = useRouter();
  const params = useSearchParams();
  // Where to send the user once the backend is alive. Default to /
  // (home) but let callers pass ?next=/upload or ?next=/live.
  const next = params.get('next') || '/';

  const [phase, setPhase] = useState(PHASE.WAKING);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  // Single useEffect drives the whole lifecycle: wake → poll → redirect.
  // Cleanup cancels every timer/interval/in-flight fetch so a quick
  // back-button press doesn't leave stragglers.
  useEffect(() => {
    let alive = true;
    let pollTimer = null;
    let counterTimer = null;
    const startedAt = Date.now();

    counterTimer = setInterval(() => {
      if (!alive) return;
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    async function wake() {
      // Step 1: tell the Lambda to start the EC2 (or no-op if running).
      if (!WAKER_URL) {
        setPhase(PHASE.ERROR);
        setError('NEXT_PUBLIC_WAKER_URL is not configured.');
        return;
      }
      try {
        await fetch(WAKER_URL, { method: 'POST' });
      } catch (e) {
        // Network errors talking to Lambda usually mean the user is
        // offline; still try polling in case the backend is already up.
        // eslint-disable-next-line no-console
        console.warn('waker call failed', e);
      }
      if (!alive) return;
      setPhase(PHASE.POLLING);
      poll();
    }

    async function poll() {
      const tick = async () => {
        if (!alive) return;
        if (Date.now() - startedAt > TIMEOUT_MS) {
          setPhase(PHASE.ERROR);
          setError(
            'The backend is taking longer than expected to start. ' +
            'Try refreshing in a minute.'
          );
          return;
        }
        try {
          const res = await fetch(`${API_URL}/health`, {
            cache: 'no-store',
            // Short per-request timeout so a hung connection doesn't
            // block the next poll. AbortController is the standard way.
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            setPhase(PHASE.READY);
            // Give the user a moment to see the "ready" state before
            // redirecting, so the transition isn't jarring.
            setTimeout(() => alive && router.replace(next), 800);
            return;
          }
        } catch (_) {
          // Expected during startup — fetch will throw until nginx is
          // accepting connections. Swallow and try again.
        }
        pollTimer = setTimeout(tick, POLL_MS);
      };
      tick();
    }

    wake();

    return () => {
      alive = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (counterTimer) clearInterval(counterTimer);
    };
  }, [next, router]);

  // ── Render ────────────────────────────────────────────────────────
  const headline =
    phase === PHASE.WAKING
      ? 'Waking the backend.'
      : phase === PHASE.POLLING
      ? 'Almost there.'
      : phase === PHASE.READY
      ? 'Ready.'
      : 'Something went wrong.';

  const subline =
    phase === PHASE.WAKING
      ? 'The server sleeps when no one is around. Starting it up — usually under a minute.'
      : phase === PHASE.POLLING
      ? "Waiting for the services to come online. We'll redirect you the moment they're ready."
      : phase === PHASE.READY
      ? 'Taking you in.'
      : error;

  return (
    <main className="min-h-screen bg-ink text-bone flex items-center justify-center px-8">
      <div className="max-w-2xl w-full">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
          ── Standby
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-light tracking-tight leading-none mb-6">
          {headline.split('.')[0]}
          <span className="italic text-rust">.</span>
        </h1>
        <p className="text-mist text-lg max-w-xl mb-12">{subline}</p>

        {phase !== PHASE.ERROR && (
          <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wider text-mist">
            <span
              className={
                phase === PHASE.READY
                  ? 'w-2 h-2 rounded-full bg-rust'
                  : 'w-2 h-2 rounded-full bg-rust pulse-live'
              }
            />
            <span>
              {phase === PHASE.READY ? 'Connected' : `Elapsed ${seconds}s`}
            </span>
          </div>
        )}

        {phase === PHASE.ERROR && (
          <button
            className="btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Try again →
          </button>
        )}
      </div>
    </main>
  );
}