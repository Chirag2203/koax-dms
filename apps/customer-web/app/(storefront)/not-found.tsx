import Link from 'next/link';

/**
 * Storefront 404 page.
 *
 * Shown when no matching route is found within the storefront group.
 * Maintains the luxury editorial tone and guides the visitor back home.
 */
export default function StorefrontNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-paper px-4">
      {/* Error code */}
      <p className="mono-label text-ink-muted">404</p>

      {/* Headline */}
      <h1 className="serif-tight text-center text-display-sm font-normal text-ink-primary">
        Page not found.
      </h1>

      {/* Sub-copy */}
      <p className="max-w-xs text-center font-sans text-body-md text-ink-secondary">
        The page you are looking for has moved, or may never have existed.
      </p>

      {/* Accent rule */}
      <div className="h-px w-16 bg-accent/40" />

      {/* Back home CTA */}
      <Link
        href="/"
        className="font-sans text-label-md text-accent underline underline-offset-4 transition-colors duration-quick hover:text-accent-hover focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        Return to home
      </Link>
    </main>
  );
}
