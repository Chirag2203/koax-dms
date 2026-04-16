import * as React from 'react';

// ─── Skeleton primitives ──────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={[
        'animate-pulse rounded-sm bg-stone-800/60',
        className ?? '',
      ].join(' ')}
      aria-hidden="true"
    />
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export default function VdpLoading() {
  return (
    <div aria-busy="true" aria-label="Loading vehicle details">
      {/* Breadcrumb skeleton */}
      <div className="bg-[#171413] pt-24 pb-4 px-6 md:px-12 lg:px-24">
        <Shimmer className="h-3 w-48" />
      </div>

      {/* Hero gallery skeleton — full-width dark rect */}
      <div className="bg-[#171413] px-6 md:px-12 lg:px-24 pb-8">
        <Shimmer className="w-full aspect-[16/9] md:aspect-[21/9] rounded-sm bg-stone-900/80" />
        {/* Thumbnail strip */}
        <div className="flex gap-3 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-16 w-24 flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Title block skeleton */}
      <div className="bg-[#171413] px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-7xl mx-auto">
          <Shimmer className="h-3 w-32 mb-4" />
          <Shimmer className="h-12 w-3/4 mb-3" />
          <Shimmer className="h-8 w-1/2 mb-8" />
          <Shimmer className="h-10 w-36 mb-3 rounded-full" />
          <Shimmer className="h-10 w-40 rounded-full" />
        </div>
      </div>

      {/* Editorial skeleton */}
      <div className="bg-bg-paper px-6 md:px-12 lg:px-24 py-16">
        <div className="max-w-3xl mx-auto space-y-3">
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-5/6" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-4/5" />
        </div>
      </div>

      {/* Spec grid skeleton */}
      <div className="bg-bg-paper px-6 md:px-12 lg:px-24 py-16">
        <div className="max-w-7xl mx-auto">
          <Shimmer className="h-6 w-48 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Shimmer className="h-3 w-20" />
                <Shimmer className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
