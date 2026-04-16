/**
 * Storefront loading skeleton.
 *
 * Shown by Next.js while route segments and data are loading.
 * Uses pulse animation so the skeleton feels alive without jarring motion.
 */
export default function StorefrontLoading() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-paper px-4"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Wordmark skeleton */}
      <div className="h-3 w-24 animate-pulse rounded-full bg-line-strong" />

      {/* Headline skeleton — two lines */}
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-72 animate-pulse rounded-md bg-line-strong" />
        <div className="h-8 w-56 animate-pulse rounded-md bg-line" />
      </div>

      {/* Sub-copy skeleton — three lines */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-4 w-64 animate-pulse rounded bg-line" />
        <div className="h-4 w-56 animate-pulse rounded bg-line" />
        <div className="h-4 w-40 animate-pulse rounded bg-line" />
      </div>

      {/* Accent rule skeleton */}
      <div className="h-px w-16 animate-pulse bg-accent/30" />
    </div>
  );
}
