'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@dms/ui';
import { ArrowRight } from 'lucide-react';

// ─── Hero Section ─────────────────────────────────────────────────────────────

export function HeroSection() {
  const t = useTranslations('hero');
  const prefersReducedMotion = useReducedMotion();

  const { scrollY } = useScroll();
  const imageY = useTransform(
    scrollY,
    [0, 800],
    prefersReducedMotion ? [0, 0] : [0, 96],
  );

  return (
    <header className="grain-overlay relative flex min-h-screen flex-col justify-end overflow-hidden bg-[#0A0908]">
      {/* Background image with subtle parallax */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: imageY }}
      >
        <Image
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2400&q=80"
          alt="A classic sports car silhouette in a dark architectural setting"
          fill
          priority
          className="object-cover opacity-60 mix-blend-luminosity"
          sizes="100vw"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 grid grid-cols-12 gap-6 px-6 pb-16 md:px-12 md:pb-24 lg:px-24">
        <div className="col-span-12 lg:col-span-10">
          {/* Headline */}
          <h1 className="mb-12 font-display text-5xl font-normal leading-[0.9] tracking-[-0.04em] text-white md:text-7xl lg:text-[112px]">
            {t('headline')}
          </h1>

          {/* Subline + CTAs grid */}
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-8 lg:col-span-6">
              <p className="mb-10 max-w-lg font-sans text-lg leading-relaxed text-stone-400 md:text-xl">
                {t('subline')}
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap items-center gap-8">
                <Link
                  href="/collection"
                  className={buttonVariants({ variant: 'primary', size: 'md' })}
                >
                  {t('cta')}
                  <ArrowRight className="h-[1em] w-[1em] shrink-0" aria-hidden="true" />
                </Link>

                <Link
                  href="/sell"
                  className="border-b border-stone-800 pb-1 font-mono text-xs uppercase tracking-widest text-stone-400 transition-colors hover:border-stone-500 hover:text-white"
                >
                  {t('sellLink')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Season label */}
      <div className="absolute bottom-12 left-6 z-10 md:left-12 lg:left-24">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500">
          {t('season')}
        </span>
      </div>
    </header>
  );
}
