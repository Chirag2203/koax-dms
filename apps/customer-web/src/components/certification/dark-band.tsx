'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Component ────────────────────────────────────────────────────────────────

export function DarkBand() {
  const t = useTranslations('certification');

  return (
    <section
      className="bg-[#0A0908] text-white px-6 md:px-12 lg:px-24 py-20 md:py-32 overflow-hidden relative"
    >
      {/* Decorative SVG diagram */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1/2 opacity-[0.04] pointer-events-none hidden lg:block"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
        >
          <circle cx="200" cy="200" r="150" strokeDasharray="4,4" />
          <circle cx="200" cy="200" r="80" />
          <circle cx="200" cy="200" r="30" strokeDasharray="2,2" />
          <line x1="200" y1="30" x2="200" y2="370" strokeDasharray="2,2" />
          <line x1="30" y1="200" x2="370" y2="200" strokeDasharray="2,2" />
          <rect x="175" y="175" width="50" height="50" />
          <text x="20" y="30" fontSize="8" fill="white" opacity="0.3" className="font-mono">
            Chassis_Verify_v7.4
          </text>
        </svg>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-16 relative z-10">

        {/* Text block */}
        <div className="lg:col-span-7">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 mb-8 block">
            {t('darkBandEyebrow')}
          </span>
          <h2
            className={cn(
              'font-display text-5xl md:text-6xl tracking-[-0.04em] text-white',
              'leading-[1.05] mb-8',
            )}
          >
            {t('darkBandHeadline')}
          </h2>
          <p className="font-sans text-lg text-white/60 leading-relaxed max-w-xl">
            {t('darkBandBody')}
          </p>
        </div>

        {/* Stat block */}
        <div
          className={cn(
            'lg:col-span-5',
            'border border-white/10 p-10 rounded-sm',
            'flex flex-col items-center justify-center text-center',
          )}
        >
          <span className="font-display text-[6rem] leading-none tracking-[-0.04em] text-accent mb-2">
            210
          </span>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/40 mb-6">
            {t('statLabel')}
          </p>
          <div className="w-8 h-px bg-white/20 mb-6" />
          <p className="font-sans text-sm text-white/50 leading-relaxed">
            {t('statCaption')}
          </p>
        </div>

      </div>
    </section>
  );
}
