// API client for the Emotion Recognition Gateway
// Handles auth, uploads, sessions, and live mode WebSocket

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

class APIClient {
  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  async request(method, path, body, isRetry = false) {
    const headers = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = body instanceof FormData ? body : JSON.stringify(body);

    const res = await fetch(`${API_URL}${path}`, opts);

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
      return false;
    }
  }

  // ── Auth ────────────────────────────────────────────
  async register(email, username, password) {
    return this.request('POST', '/auth/register', { email, username, password });
  }

  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async logout() {
    this.clearTokens();
  }

  async me() {
    return this.request('GET', '/auth/me');
  }

  // ── Upload (presigned URL flow) ─────────────────────
  async uploadFile(file, onProgress) {
    const presign = await this.request('POST', '/upload/request', {
      filename: file.name,
      content_type: file.type || 'image/jpeg',
      size: file.size,
    });

    await this.putToS3(presign.upload_url, file, onProgress);

    const result = await this.request('POST', '/upload/complete', {
      session_id: presign.session_id,
      s3_key: presign.s3_key,
    });

    return { session_id: presign.session_id, ...result };
  }

  putToS3(url, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`S3 upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('S3 upload network error'));
      xhr.send(file);
    });
  }

  // ── Sessions ────────────────────────────────────────
  async getSession(sessionId) {
    return this.request('GET', `/sessions/${sessionId}/status`);
  }

  async getSessionDownload(sessionId) {
    return this.request('GET', `/sessions/${sessionId}/download`);
  }

  async listSessions() {
    return this.request('GET', '/sessions');
  }

  // Poll session until completion.
  // Backend status values: "active" | "processing" | "burning" | "complete" | "failed"
  // Frontend animates a smooth fake progress while waiting.
  async pollSession(sessionId, onUpdate, intervalMs = 1000) {
    const DONE = new Set(['complete', 'completed']);
    const FAIL = new Set(['failed', 'error']);

    return new Promise((resolve, reject) => {
      let fake = 10; // fake progress so the UI moves even when backend sends nothing

      const tick = async () => {
        try {
          const status = await this.getSession(sessionId);
          const s = (status.status || status.state || '').toLowerCase();

          // Pick the best progress number to show the user.
          let progress;
          if (typeof status.progress === 'number' && status.progress > 0) {
            progress = Math.round(status.progress * 100);
          } else if (s === 'burning') {
            progress = Math.max(fake, 85);
          } else {
            fake = Math.min(80, fake + 7);
            progress = fake;
          }
          if (DONE.has(s)) progress = 100;

          onUpdate?.({ ...status, status: s, progress });

          if (DONE.has(s)) {
            // Try to fetch the burned download URL + raw session record so the result panel has data.
            let download = null;
            try {
              download = await this.getSessionDownload(sessionId);
            } catch (e) {
              // Non-fatal — just means we can't show the image.
            }
            resolve({ ...status, status: s, download });
          } else if (FAIL.has(s)) {
            reject(new Error(status.error || 'Processing failed'));
          } else {
            setTimeout(tick, intervalMs);
          }
        } catch (err) {
          reject(err);
        }
      };
      tick();
    });
  }

  // ── Live mode WebSocket ─────────────────────────────
  openLiveSocket(onMessage, onError, onClose) {
    const url = `${WS_URL}/live?token=${this.accessToken || ''}`;
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch {
        onMessage?.({ raw: event.data });
      }
    };
    ws.onerror = (err) => onError?.(err);
    ws.onclose = () => onClose?.();

    return ws;
  }
}

export const api = new APIClient();
export default api;
