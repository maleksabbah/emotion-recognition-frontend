'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register(email, username, password);
        await api.login(email, password);
      } else {
        await api.login(email, password);
      }
      router.push('/upload');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-bone flex">
      {/* Left visual panel */}
      <div className="hidden md:flex md:w-1/2 bg-rust relative overflow-hidden border-r border-bone/10">
        <Link href="/" className="absolute top-8 left-8 font-mono text-xs tracking-wider text-bone hover:text-ink transition-colors">
          ← FEELER
        </Link>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-display text-[18rem] leading-none italic font-light text-bone/95 select-none">
            f.
          </div>
        </div>

        <div className="absolute bottom-12 left-12 right-12 font-display text-3xl font-light italic leading-tight">
          "There is no language<br />without a face<br />behind it."
        </div>
        <div className="absolute bottom-12 right-12 font-mono text-xs text-bone/60">
          — composition no. 07
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="md:hidden font-mono text-xs tracking-wider text-mist mb-12 inline-block">
            ← FEELER
          </Link>

          <div className="font-mono text-xs tracking-[0.3em] uppercase text-mist mb-4">
            ── {mode === 'login' ? 'Re-entry' : 'New observer'}
          </div>

          <h1 className="font-display text-6xl font-light tracking-tight mb-12">
            {mode === 'login' ? (
              <><span>Welcome</span><br /><span className="italic">back.</span></>
            ) : (
              <><span>Begin</span><br /><span className="italic">looking.</span></>
            )}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Field label="Email" value={email} onChange={setEmail} type="email" required />

            {mode === 'register' && (
              <Field label="Username" value={username} onChange={setUsername} required />
            )}

            <Field label="Password" value={password} onChange={setPassword} type="password" required />

            {error && (
              <div className="font-mono text-xs text-rust border-l-2 border-rust pl-4 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Working...' : (mode === 'login' ? 'Sign in →' : 'Create account →')}
            </button>
          </form>

          <div className="mt-12 font-mono text-xs text-mist">
            {mode === 'login' ? (
              <>NO ACCOUNT? <button onClick={() => setMode('register')} className="text-rust hover:underline">CREATE ONE</button></>
            ) : (
              <>HAVE AN ACCOUNT? <button onClick={() => setMode('login')} className="text-rust hover:underline">SIGN IN</button></>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="block">
      <div className="font-mono text-xs uppercase tracking-wider text-mist mb-3">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-transparent border-b border-bone/30 py-3 text-2xl font-display font-light focus:border-rust transition-colors"
      />
    </label>
  );
}
