'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <main className="min-h-screen bg-ink text-bone">
      <header className="px-8 py-6 flex justify-between items-center border-b border-bone/10">
        <Link href="/" className="font-mono text-xs tracking-wider">
          <span className="text-rust">●</span> FEELER / ARCHIVE
        </Link>
        <nav className="flex gap-8 text-xs font-mono tracking-wider uppercase">
          <Link href="/upload">Analyze</Link>
          <Link href="/live">Live</Link>
          <Link href="/sessions" className="text-rust">Archive</Link>
          <button onClick={() => { api.logout(); router.push('/'); }}>Sign out</button>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
          ── Composition no. 03
        </div>
        <h1 className="font-display text-7xl md:text-8xl font-light tracking-tight mb-16">
          The<br /><span className="italic text-rust">archive.</span>
        </h1>

        {loading && (
          <div className="font-display text-2xl italic text-mist">Loading...</div>
        )}

        {error && (
          <div className="font-mono text-xs text-rust border-l-2 border-rust pl-4 py-2">
            {error}
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="border border-bone/20 p-12 text-center">
            <div className="font-display text-4xl italic text-mist mb-6">
              Nothing yet.
            </div>
            <Link href="/upload" className="btn-primary inline-block">
              Analyze your first face →
            </Link>
          </div>
        )}

        {sessions.length > 0 && (
          <ul className="divide-y divide-bone/10">
            {sessions.map((s, i) => (
              <li key={s.id || i} className="py-6 flex items-baseline justify-between gap-8 group cursor-pointer hover:bg-bone/[0.02] px-4 -mx-4 transition-colors">
                <div className="flex items-baseline gap-8">
                  <span className="font-mono text-xs text-mist">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-display text-3xl group-hover:italic group-hover:text-rust transition-all">
                      {s.filename || s.name || s.id || 'Untitled'}
                    </div>
                    <div className="font-mono text-xs text-mist mt-1">
                      {s.created_at && new Date(s.created_at).toLocaleString()}
                      {s.state && ` · ${s.state.toUpperCase()}`}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs text-mist group-hover:text-rust">
                  VIEW →
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
