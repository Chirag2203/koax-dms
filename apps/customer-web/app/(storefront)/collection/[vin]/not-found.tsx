import * as React from 'react';
import Link from 'next/link';

export default function VdpNotFound() {
  return (
    <div className="bg-[#171413] min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-stone-500 mb-6">
          404 · Vehicle Not Found
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-white tracking-[-0.04em] leading-tight mb-6">
          This vehicle is no longer in our collection.
        </h1>
        <p className="text-stone-400 text-sm leading-relaxed mb-10">
          It may have been reserved, sold, or removed from our listings. Our
          collection changes regularly — something equally compelling awaits.
        </p>
        <Link
          href="/collection"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent border-b border-accent pb-1 hover:text-accent/80 hover:border-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#171413]"
        >
          Browse the collection
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
