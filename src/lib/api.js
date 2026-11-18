// API client for the Emotion Recognition Gateway
// Handles auth, uploads, sessions, and live mode WebSocket

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

// Error with the backend's limit fields attached: .code, .status, .detail,
// .retryAfter (seconds, from Retry-After), plus any extra JSON fields
// such as .resets_at.
function apiError(message, fields) {
  const err = new Error(message);
  Object.keys(fields || {}).forEach(function(k) {
    if (k !== 'message' && k !== 'stack') err[k] = fields[k];
  });
  return err;
}

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

  _redirectToWake() {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/wake') return;
    const here = window.location.pathname + window.location.search;
    window.location.href = '/wake?next=' + encodeURIComponent(here);
  }

  // opts.wake === false: on a network failure, throw instead of sending the
  // user to /wake (used for public, best-effort calls like /plans).
  async request(method, path, body, isRetry = false, reqOpts = {}) {
    const headers = {};
    if (this.accessToken) headers['Authorization'] = 'Bearer ' + this.accessToken;
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = body instanceof FormData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(API_URL + path, opts);
    } catch (e) {
      if (reqOpts.wake === false) {
        throw apiError('Backend is unreachable.', { code: 'network_error', status: 0 });
      }
      this._redirectToWake();
      throw apiError('Backend is unreachable, redirecting to wake page.', { code: 'network_error', status: 0 });
    }

    if (res.status === 401 && !isRetry && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request(method, path, body, true, reqOpts);
    }

    if (!res.ok) {
      // Limit errors arrive as {"detail": "...", "code": "...", ...extra}.
      // Keep .message = detail so existing UI keeps working, and expose
      // .code / .status / extra fields (resets_at, ...) for friendlier copy.
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (err) { data = null; }
      let detail = data && data.detail != null ? data.detail : text;
      if (detail && typeof detail !== 'string') {
        // Validation errors (422) arrive as arrays of objects.
        detail = Array.isArray(detail)
          ? detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ')
          : JSON.stringify(detail);
      }
      const extra = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      // CORS doesn't expose Retry-After, so the gateway also puts it in the body.
      const retry = res.headers.get('Retry-After') ?? extra.retry_after ?? null;
      throw apiError(detail || 'Request failed: ' + res.status, Object.assign({}, extra, {
        detail: detail,
        code: extra.code || null,
        status: res.status,
        retryAfter: retry != null && !isNaN(Number(retry)) ? Number(retry) : null,
      }));
    }

    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  async tryRefresh() {
    try {
      const res = await fetch(API_URL + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token || this.refreshToken);
      return true;
    } catch (err) {
      return false;
    }
  }

  async register(email, username, password) {
    return this.request('POST', '/auth/register', { email: email, username: username, password: password });
  }

  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email: email, password: password });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async logout() {
    this.clearTokens();
  }

  async me() {
    return this.request('GET', '/auth/me');
  }

  // {plan, unlimited, limits, usage, usage_available, period_start, resets_at}
  async getQuota() {
    return this.request('GET', '/auth/quota');
  }

  // Public. {plans: [...]}. Never redirects to /wake; callers fall back to
  // the hardcoded limits in lib/plans.js.
  async getPlans() {
    return this.request('GET', '/plans', null, false, { wake: false });
  }

  async uploadFile(file, onProgress) {
    // The presigned URL is signed for this exact size and content type, so
    // the PUT below must send the same File object, unmodified.
    const contentType = file.type || 'image/jpeg';
    const presign = await this.request('POST', '/upload/request', {
      filename: file.name,
      content_type: contentType,
      size: file.size,
    });

    await this.putToS3(presign.upload_url, file, onProgress, contentType);

    var mode = 'photo';
    if (file.type && file.type.startsWith('video/')) {
      mode = 'video';
    }

    const result = await this.request('POST', '/upload/complete', {
      session_id: presign.session_id,
      s3_key: presign.s3_key,
      mode: mode,
    });

    return { session_id: presign.session_id, ...result };
  }

  putToS3(url, file, onProgress, contentType) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      // Content-Length is set by the browser from the File itself.
      xhr.setRequestHeader('Content-Type', contentType || file.type || 'image/jpeg');

      if (onProgress) {
        xhr.upload.addEventListener('progress', function(e) {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(apiError('Upload to storage failed: ' + xhr.status, { code: 'storage_upload_failed', status: xhr.status }));
      };
      xhr.onerror = function() { reject(apiError('Upload to storage failed: network error', { code: 'storage_upload_failed', status: 0 })); };
      xhr.send(file);
    });
  }

  async getSession(sessionId) {
    return this.request('GET', '/sessions/' + sessionId + '/status');
  }

  async getSessionDownload(sessionId) {
    return this.request('GET', '/sessions/' + sessionId + '/download');
  }

  async listSessions() {
    return this.request('GET', '/sessions');
  }

  async pollSession(sessionId, onUpdate, intervalMs) {
    if (!intervalMs) intervalMs = 1000;
    var DONE = new Set(['complete', 'completed']);
    var FAIL = new Set(['failed', 'error']);
    var self = this;

    return new Promise(function(resolve, reject) {
      var fake = 10;

      var tick = async function() {
        try {
          var status = await self.getSession(sessionId);
          var s = (status.status || status.state || '').toLowerCase();

          var progress;
          if (typeof status.progress === 'number' && status.progress > 0) {
            progress = Math.round(status.progress * 100);
          } else if (s === 'burning') {
            progress = Math.max(fake, 85);
          } else {
            fake = Math.min(80, fake + 7);
            progress = fake;
          }
          if (DONE.has(s)) progress = 100;

          if (onUpdate) onUpdate(Object.assign({}, status, { status: s, progress: progress }));

          if (DONE.has(s)) {
            var download = null;
            try {
              download = await self.getSessionDownload(sessionId);
            } catch (e) {
              // Non-fatal
            }
            resolve(Object.assign({}, status, { status: s, download: download }));
          } else if (FAIL.has(s)) {
            reject(apiError(status.error || 'Processing failed', { code: 'processing_failed', status: 200 }));
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

  openLiveSocket(onMessage, onError, onClose) {
    var url = WS_URL + '/live?token=' + (this.accessToken || '');
    var ws = new WebSocket(url);

    ws.onmessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        if (onMessage) onMessage({ raw: event.data });
      }
    };
    ws.onerror = function(err) { if (onError) onError(err); };
    // Passes the CloseEvent so callers can read code/reason
    // (4002 = live limit reached; reason explains which one).
    ws.onclose = function(event) { if (onClose) onClose(event); };

    return ws;
  }
}

export const api = new APIClient();
export default api;