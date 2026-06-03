// ── Patch for src/lib/api.js ──────────────────────────────────────
//
// Two small edits. (1) Catch network errors in request() and redirect
// to /wake. (2) Same in tryRefresh() so a refresh failure doesn't
// silently fall through.
//
// Replace your existing request() and tryRefresh() methods with these.

  // Centralised network error handling. If fetch itself throws (DNS
  // miss, connection refused, TLS error) it almost always means the
  // backend is asleep — kick the user to /wake which calls the Lambda
  // and polls until /health is up. The `?next=...` param preserves
  // the path they were trying to reach.
  _redirectToWake() {
    if (typeof window === 'undefined') return; // SSR safety
    const here = window.location.pathname + window.location.search;
    if (window.location.pathname === '/wake') return; // avoid loops
    window.location.href = `/wake?next=${encodeURIComponent(here)}`;
  }

  async request(method, path, body, isRetry = false) {
    const headers = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = body instanceof FormData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${API_URL}${path}`, opts);
    } catch (e) {
      // TypeError from fetch = backend unreachable. Send the user to
      // /wake; this throw is a fallback in case the redirect can't run.
      this._redirectToWake();
      throw new Error('Backend is unreachable, redirecting to wake page.');
    }

    if (res.status === 401 && !isRetry && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request(method, path, body, true);
    }

    if (!res.ok) {
      const text = await res.text();
      let detail;
      try { detail = JSON.parse(text).detail || text; } catch { detail = text; }
      throw new Error(detail || `Request failed: ${res.status}`);
    }

    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  async tryRefresh() {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token || this.refreshToken);
      return true;
    } catch {
      // Network error here = backend asleep. Don't bother redirecting
      // from refresh itself; let the original request() retry path
      // handle it on the next attempt.
      return false;
    }
  }
