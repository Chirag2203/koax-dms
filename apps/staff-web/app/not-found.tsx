import Link from 'next/link';

/**
 * Staff 404 page.
 * Shown when a route is not matched.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-canvas text-ink-primary">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        404
      </p>
      <h1 className="text-[22px] font-semibold leading-[1.3]">
        Page not found
      </h1>
      <p className="text-[13px] text-ink-secondary">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-[6px] bg-accent px-4 py-2 text-[14px] font-medium text-white transition-colors duration-[120ms] hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
      >
        Return to dashboard
      </Link>
    </div>
  );
}
