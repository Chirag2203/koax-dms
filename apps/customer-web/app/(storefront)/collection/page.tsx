import * as React from 'react';
import type { Metadata } from 'next';
import { CollectionView } from '@/src/components/collection';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'The Collection | BN Automobiles',
  description:
    'Browse our hand-selected inventory of pre-owned luxury vehicles, available in Bangalore, Mumbai, and Chennai.',
};

// ─── Page ─────────────────────────────────────────────────────────────────────
// useSearchParams inside CollectionView requires a Suspense boundary.
// The fallback renders the page chrome so layout shift is minimal.

function CollectionFallback() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 md:px-12 lg:px-24 py-16">
      <header className="mb-16">
        <span className="mb-4 block font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
          THE COLLECTION
        </span>
        <div className="h-14 w-80 rounded-sm bg-bg-subtle animate-pulse mb-4" />
        <div className="h-4 w-64 rounded-sm bg-bg-subtle animate-pulse" />
      </header>
      {/* Skeleton grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="aspect-[4/5] rounded-sm bg-bg-subtle animate-pulse" />
            <div className="h-3 w-40 rounded-sm bg-bg-subtle animate-pulse" />
            <div className="h-6 w-32 rounded-sm bg-bg-subtle animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CollectionPage() {
  return (
    <React.Suspense fallback={<CollectionFallback />}>
      <CollectionView />
    </React.Suspense>
  );
}
