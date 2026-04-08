'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LivePage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState(null);
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

      // Open WebSocket
      const ws = api.openLiveSocket(
        (data) => {
          setLatest(data);
          setHistory((h) => [data, ...h].slice(0, 8));
        },
        (err) => setError('WebSocket error: ' + (err.message || 'unknown')),
        () => setStreaming(false),
      );
      wsRef.current = ws;

      // Wait for socket to open then start frame loop
      ws.addEventListener('open', () => {
        setStreaming(true);
        let frames = 0;
        let lastTick = Date.now();

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
            0.7,
          );
        }, 200); // 5 fps
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
  }

  const currentEmotion = latest?.emotion || latest?.faces?.[0]?.emotion || latest?.predictions?.[0]?.emotion;
  const currentConf = latest?.confidence || latest?.faces?.[0]?.confidence;

  return (
    <main className="min-h-screen bg-ink text-bone">
      <header className="px-8 py-6 flex justify-between items-center border-b border-bone/10">
        <Link href="/" className="font-mono text-xs tracking-wider">
          <span className="text-rust">●</span> FEELER / LIVE
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

              {streaming && currentEmotion && (
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-ink via-ink/60 to-transparent">
                  <div className="font-mono text-xs uppercase tracking-wider text-mist mb-2">CURRENT</div>
                  <div className="font-display text-6xl italic font-light text-rust">
                    {currentEmotion.toUpperCase()}
                  </div>
                  {currentConf != null && (
                    <div className="font-mono text-xs text-mist mt-2">
                      {(currentConf * 100).toFixed(0)}% certain
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

          {/* History feed */}
          <div className="lg:col-span-4">
            <div className="font-mono text-xs uppercase tracking-wider text-mist mb-6">
              ── Stream feed
            </div>
            {history.length === 0 ? (
              <div className="font-display text-2xl italic text-mist">
                Nothing to read.
              </div>
            ) : (
              <ul className="space-y-3">
                {history.map((h, i) => {
                  const e = h.emotion || h.faces?.[0]?.emotion || '—';
                  const c = h.confidence || h.faces?.[0]?.confidence;
                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between border-b border-bone/10 pb-3"
                      style={{ opacity: 1 - i * 0.1 }}
                    >
                      <span className="font-display text-2xl italic">{e}</span>
                      <span className="font-mono text-xs text-mist">
                        {c != null ? `${(c * 100).toFixed(0)}%` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
