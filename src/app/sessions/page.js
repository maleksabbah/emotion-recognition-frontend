'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { ErrorBox } from '@/components/ui';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push('/auth');
      return;
    }
    loadSessions();
  }, [router]);

  async function loadSessions() {
    try {
      const data = await api.listSessions();
      setSessions(Array.isArray(data) ? data : data.sessions || []);
    } catch (err) {
      setError(err.message || 'Could not load archive');
    } finally {
      setLoading(false);
    }
  }

  async function openSession(s) {
    const id = s.id;
    if (!id) return;
    setOpening(id);
    try {
      const dl = await api.getSessionDownload(id);
      if (dl?.download_url) {
        window.open(dl.download_url, '_blank', 'noopener');
      } else {
        setError('No annotated output available for this session');
      }
    } catch (err) {
      setError(err.message || 'Could not open session');
    } finally {
      setOpening(null);
    }
  }

  function humanDate(d) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return String(d);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-bone flex flex-col">
      <SiteNav />

      <div className="flex-1 max-w-7xl w-full mx-auto px-5 md:px-8 py-16">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
          ── Composition no. 03
        </div>
        <h1 className="font-display text-7xl md:text-8xl font-light tracking-tight mb-16">
          The<br /><span className="italic text-rust">archive.</span>
        </h1>

        {loading && (
          <div className="font-display text-2xl italic text-mist">Loading...</div>
        )}

        <ErrorBox error={error} className="mb-6" />

        {!loading && !error && sessions.length === 0 && (
          <div className="panel p-12 text-center">
            <div className="font-display text-4xl italic text-mist mb-6">
              Nothing yet.
            </div>
            <Link href="/upload" className="btn-primary">
              Analyze your first face
            </Link>
          </div>
        )}

        {sessions.length > 0 && (
          <ul className="divide-y divide-bone/10">
            {sessions.map((s, i) => {
              const id = s.id;
              const mode = (s.mode || 'session').toLowerCase();
              const status = (s.status || s.state || '').toLowerCase();
              const viewable = !!s.burned_s3_key && status === 'complete';
              const isOpening = opening === id;
              return (
                <li
                  key={id || i}
                  onClick={() => viewable && openSession(s)}
                  className={`py-6 flex items-baseline justify-between gap-8 group px-4 -mx-4 rounded-lg transition-colors ${
                    viewable ? 'cursor-pointer hover:bg-bone/[0.02]' : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-baseline gap-8 min-w-0">
                    <span className="font-mono text-xs text-mist shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-3xl group-hover:italic group-hover:text-rust transition-all truncate">
                        {mode} · <span className="text-mist text-xl">{id?.slice(0, 8) || 'untitled'}</span>
                      </div>
                      <div className="font-mono text-xs text-mist mt-1">
                        {humanDate(s.created_at)}
                        {status && ` · ${status.toUpperCase()}`}
                        {s.total_faces != null && ` · ${s.total_faces} ${s.total_faces === 1 ? 'FACE' : 'FACES'}`}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-mist group-hover:text-rust shrink-0">
                    {isOpening ? 'OPENING…' : viewable ? 'VIEW →' : status.toUpperCase() || '—'}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}