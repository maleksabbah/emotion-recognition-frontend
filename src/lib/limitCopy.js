// Friendly copy for the backend's limit error codes.
// Returns {message, pricing} for <ErrorBox />.

import { formatBytes, formatDuration, formatResetDate } from '@/lib/plans';

function minutesFrom(seconds) {
  if (seconds == null) return null;
  return Math.max(1, Math.ceil(seconds / 60));
}

// kind: 'photo' | 'video' | null — what the user was trying to analyse.
export function friendlyError(err, { kind = null, limits = null, resetsAt = null } = {}) {
  if (!err) return null;
  const code = err.code || null;
  const raw = err.message || 'Something went wrong.';
  const resets = formatResetDate(err.resets_at || resetsAt);

  switch (code) {
    case 'file_too_large': {
      const cap = limits
        ? kind === 'video'
          ? limits.max_video_bytes
          : limits.max_image_bytes
        : null;
      return {
        message: cap
          ? `That file is larger than your plan allows (${formatBytes(cap)} per ${kind === 'video' ? 'video' : 'photo'}).`
          : 'That file is larger than your plan allows.',
        pricing: true,
      };
    }
    case 'rate_limited': {
      const mins = minutesFrom(err.retryAfter);
      return {
        message: mins
          ? `You've uploaded a lot in a short time. Try again in about ${mins} ${mins === 1 ? 'minute' : 'minutes'}.`
          : "You've uploaded a lot in a short time. Try again in a little while.",
        pricing: true,
      };
    }
    case 'quota_exceeded': {
      const what = kind === 'video' ? 'video ' : kind === 'photo' ? 'photo ' : '';
      return {
        message: `You've used this month's ${what}allowance.` + (resets ? ` It resets on ${resets}.` : ''),
        pricing: true,
      };
    }
    case 'concurrent_limit':
      return {
        message: 'An analysis is already running. Wait for it to finish, then try again.',
        pricing: true,
      };
    case 'usage_unavailable':
      return {
        message: "We can't check your usage right now, so new analyses are paused. Please try again in a minute.",
        pricing: false,
      };
    case 'upload_expired':
      return {
        message: 'The upload link expired before the file finished sending. Please try again.',
        pricing: false,
      };
    case 'storage_upload_failed':
      return {
        message: "The file couldn't be sent. Check your connection and try again.",
        pricing: false,
      };
    case 'processing_failed':
      return {
        message: raw,
        // e.g. "Video is longer than your plan allows (30s)"
        pricing: /plan allows/i.test(raw),
      };
    default:
      return { message: raw, pricing: /plan allows/i.test(raw) };
  }
}

export function videoDurationCopy(limits) {
  return limits?.max_video_seconds != null ? formatDuration(limits.max_video_seconds) : null;
}
