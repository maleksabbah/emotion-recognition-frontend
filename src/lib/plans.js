// Plan limits. The backend is the source of truth (GET /plans, GET /auth/quota);
// these numbers are only a fallback for when /plans cannot be reached.

export const FALLBACK_PLANS = [
  {
    name: 'free',
    available: true,
    price_cents_monthly: 0,
    currency: 'usd',
    photos_per_month: 50,
    videos_per_month: 5,
    max_image_bytes: 10485760,
    max_video_bytes: 52428800,
    max_video_seconds: 30,
    uploads_per_hour: 20,
    max_concurrent_jobs: 1,
    live_minutes_per_month: 15,
    live_session_max_seconds: 120,
  },
  {
    name: 'pro',
    available: false,
    price_cents_monthly: 1000,
    currency: 'usd',
    photos_per_month: 1000,
    videos_per_month: 100,
    max_image_bytes: 26214400,
    max_video_bytes: 524288000,
    max_video_seconds: 300,
    uploads_per_hour: 200,
    max_concurrent_jobs: 3,
    live_minutes_per_month: 300,
    live_session_max_seconds: 1800,
  },
];

// { price_cents_monthly: 1000, currency: 'usd' } -> "$10"; 0 -> null (free)
export function formatPrice(plan) {
  const cents = plan?.price_cents_monthly;
  if (cents == null || isNaN(cents) || Number(cents) <= 0) return null;
  const amount = Number(cents) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (plan.currency || 'usd').toUpperCase(),
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return '$' + amount;
  }
}

export function findPlan(plans, name) {
  const list = Array.isArray(plans) && plans.length ? plans : FALLBACK_PLANS;
  return (
    list.find((p) => p.name === name) ||
    FALLBACK_PLANS.find((p) => p.name === name) ||
    null
  );
}

// 10485760 -> "10 MB", 524288000 -> "500 MB"
export function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = Number(bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const rounded = v >= 10 || Number.isInteger(v) ? Math.round(v) : Math.round(v * 10) / 10;
  return rounded + ' ' + units[i];
}

// 30 -> "30 seconds", 120 -> "2 minutes", 90 -> "1 min 30 s"
export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return s + (s === 1 ? ' second' : ' seconds');
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (rest === 0) return m + (m === 1 ? ' minute' : ' minutes');
  return m + ' min ' + rest + ' s';
}

// 125 -> "2:05"
export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// First day of next month, 00:00 UTC — used when the server gives no resets_at.
export function nextResetFallback(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

// ISO -> "1 Dec" (UTC, so the date matches the server's reset boundary)
export function formatResetDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// True when a limit value means "no cap" (null/undefined) rather than a number.
export function isUncapped(v) {
  return v == null;
}

function plural(n, one, many) {
  return n + ' ' + (String(n) === '1' ? one : many);
}

// Human-readable limit lines for a plan card.
export function planFeatureLines(p) {
  if (!p) return [];
  const lines = [];
  if (p.photos_per_month != null) lines.push(plural(p.photos_per_month.toLocaleString('en-US'), 'photo', 'photos') + ' a month');
  if (p.videos_per_month != null) {
    lines.push(
      plural(p.videos_per_month.toLocaleString('en-US'), 'video', 'videos') +
        ' a month' +
        (p.max_video_seconds != null ? ', up to ' + formatDuration(p.max_video_seconds) + ' each' : '')
    );
  }
  if (p.live_minutes_per_month != null) {
    lines.push(
      plural(p.live_minutes_per_month.toLocaleString('en-US'), 'live minute', 'live minutes') +
        ' a month' +
        (p.live_session_max_seconds != null ? ', ' + formatDuration(p.live_session_max_seconds) + ' per session' : '')
    );
  }
  if (p.max_image_bytes != null || p.max_video_bytes != null) {
    const parts = [];
    if (p.max_image_bytes != null) parts.push('photos up to ' + formatBytes(p.max_image_bytes));
    if (p.max_video_bytes != null) parts.push('videos up to ' + formatBytes(p.max_video_bytes));
    const s = parts.join(', ');
    lines.push(s.charAt(0).toUpperCase() + s.slice(1));
  }
  if (p.uploads_per_hour != null) lines.push(plural(p.uploads_per_hour, 'upload', 'uploads') + ' an hour');
  if (p.max_concurrent_jobs != null) lines.push(plural(p.max_concurrent_jobs, 'analysis', 'analyses') + ' at a time');
  return lines;
}
