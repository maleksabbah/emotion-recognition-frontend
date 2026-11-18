'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { notifyAuthChanged } from '@/lib/useSignedIn';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { ErrorBox } from '@/components/ui';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // /auth?mode=register opens straight into sign-up (nav "Get started").
  // Read from window instead of useSearchParams to avoid a Suspense boundary.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('mode');
    if (m === 'register') setMode('register');
  }, []);

  function switchMode(m) {
    setMode(m);
    setError('');
  }

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
      notifyAuthChanged();
      router.push('/upload');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-bone flex flex-col">
      <SiteNav />
      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
      {/* Left visual panel */}
      <div className="hidden md:flex md:w-1/2 bg-rust relative overflow-hidden border-r border-bone/10">

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-display text-[18rem] leading-none italic font-light text-bone/95 select-none">
            m.
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
      <div className="w-full md:w-1/2 flex items-center justify-center px-5 py-12 md:p-8">
        <div className="w-full max-w-md">

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

          <form onSubmit={handleSubmit} className="space-y-6">
            <Field label="Email" value={email} onChange={setEmail} type="email" required />

            {mode === 'register' && (
              <Field label="Username" value={username} onChange={setUsername} required />
            )}

            <Field label="Password" value={password} onChange={setPassword} type="password" required />

            <ErrorBox error={error} />

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Working…' : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>

            {mode === 'register' && (
              <p className="text-xs text-mist leading-relaxed">
                By creating an account you agree to the{' '}
                <Link href="/terms" className="text-bone underline underline-offset-4 decoration-rust">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-bone underline underline-offset-4 decoration-rust">Privacy Policy</Link>.
              </p>
            )}
          </form>

          <div className="mt-10 text-sm text-mist">
            {mode === 'login' ? (
              <>No account?{' '}<button type="button" onClick={() => switchMode('register')} className="text-bone font-medium underline underline-offset-4 decoration-rust hover:decoration-bone">Create one</button></>
            ) : (
              <>Have an account?{' '}<button type="button" onClick={() => switchMode('login')} className="text-bone font-medium underline underline-offset-4 decoration-rust hover:decoration-bone">Sign in</button></>
            )}
          </div>
        </div>
      </div>
      </div>
      <SiteFooter />
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="block">
      <div className="font-mono text-xs uppercase tracking-wider text-mist mb-2">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'username'}
        className="field-input"
      />
    </label>
  );
}
