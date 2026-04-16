'use client';
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// ─── Trust Strip ──────────────────────────────────────────────────────────────

export function TrustStrip() {
  const t = useTranslations('trust');

  return (
    <section
      aria-label="The BN Standard"
      className="border-y border-line bg-bg-paper px-6 py-20 md:px-12 md:py-32 lg:px-24"
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        {/* Left — editorial text */}
        <div className="md:col-span-7">
          <h2 className="mb-8 font-display text-3xl font-normal text-ink-primary md:text-5xl">
            {t('headline')}
          </h2>

          <p className="mb-6 font-sans text-lg leading-relaxed text-ink-secondary">
            At BN Automobiles, we believe the purchase of a pre-owned vehicle
            should feel indistinguishable from a factory commission. Our process
            is quiet, thorough, and entirely focused on the mechanical and
            aesthetic integrity of the machine.
          </p>

          <p className="mb-6 font-sans text-lg leading-relaxed text-ink-secondary">
            Every car in our collection undergoes a rigorous 210-point technical
            validation by factory-trained specialists, followed by an intensive
            cosmetic restoration at our Bengaluru atelier.
          </p>

          <p className="mb-10 font-sans text-lg leading-relaxed text-ink-secondary">
            We don&apos;t just sell cars; we curate heritage. Our three-city
            network ensures that whether you are in Mumbai, Bangalore, or
            Chennai, the BN Standard remains absolute.
          </p>

          <Link
            href="/certification"
            className="font-mono text-xs uppercase tracking-widest text-accent transition-colors hover:text-accent-hover"
          >
            {t('learnMore')} →
          </Link>
        </div>

        {/* Right — stats panel */}
        <div className="md:col-start-9 md:col-span-4 flex flex-col items-end justify-center">
          <div className="space-y-12 text-right">
            {/* 210 checks */}
            <div className="space-y-2">
              <span className="font-display text-7xl font-light text-accent md:text-8xl">
                210
              </span>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {t('checks')}
              </p>
            </div>

            {/* 12 month */}
            <div className="space-y-2">
              <span className="font-display text-7xl font-light text-accent md:text-8xl">
                12
              </span>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {t('warranty')}
              </p>
            </div>

            {/* 3 outlet */}
            <div className="space-y-2">
              <span className="font-display text-7xl font-light text-accent md:text-8xl">
                03
              </span>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {t('network')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
