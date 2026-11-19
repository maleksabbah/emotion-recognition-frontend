import Link from 'next/link';

export function CheckIcon({ size = 12, className = 'text-rust' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// Small row of check-marked reassurance points under a CTA.
export function TrustPoints({ items, className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-xs text-mist ${className}`}>
      {items.map((t) => (
        <li key={t} className="flex items-center gap-1.5">
          <CheckIcon />
          {t}
        </li>
      ))}
    </ul>
  );
}

// Rounded rust-tinted error box. `error` is a string or
// {message, pricing} where pricing=true adds a link to /pricing.
export function ErrorBox({ error, className = '' }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  const pricing = typeof error === 'object' && error.pricing;
  return (
    <div role="alert" className={`alert-error ${className}`}>
      {message}
      {pricing && (
        <>
          {' '}
          <Link href="/pricing">See plans</Link>
        </>
      )}
    </div>
  );
}
