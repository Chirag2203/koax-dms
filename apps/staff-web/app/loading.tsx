/**
 * App-level loading skeleton.
 * Shown by Next.js during route transitions at the root segment.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas">
      <div className="h-8 w-8 animate-pulse rounded-full bg-bg-surface" />
    </div>
  );
}
