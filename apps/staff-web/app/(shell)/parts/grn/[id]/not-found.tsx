import Link from 'next/link';

export default function GrnNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg-canvas px-6 py-24">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-3">
          404
        </p>
        <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary mb-2">
          GRN not found
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          We couldn&apos;t find that goods receipt note. It may have been
          removed or the ID is incorrect.
        </p>
        <Link
          href="/parts?tab=grn"
          className="inline-flex h-9 items-center px-4 rounded-md bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          ← Back to GRNs
        </Link>
      </div>
    </div>
  );
}
