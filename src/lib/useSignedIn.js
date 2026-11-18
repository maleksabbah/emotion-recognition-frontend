'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

// Fire after login/logout in this tab so every mounted nav updates.
export const AUTH_EVENT = 'mntis:auth';
export function notifyAuthChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EVENT));
}

// Signed-in state from the stored token. Starts as null ("unknown") and is
// resolved after mount so the server-rendered HTML and first client render
// match (localStorage is not available on the server).
export default function useSignedIn() {
  const [signedIn, setSignedIn] = useState(null);

  useEffect(() => {
    const sync = () => setSignedIn(api.isAuthenticated());
    sync();
    // Another tab signing in/out updates this one.
    const onStorage = (e) => {
      if (e.key === 'access_token') {
        api.accessToken = e.newValue;
        sync();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_EVENT, sync);
    };
  }, []);

  return signedIn;
}
