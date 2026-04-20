'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusCircle } from 'lucide-react';

export function ClaimCta() {
  const t = useTranslations('portal.vehicles');

  return (
    <Link
      href="/vehicles/claim"
      className="group flex flex-col items-center justify-center h-full min-h-[180px] border border-dashed border-line hover:border-accent/60 rounded-sm transition-colors p-6 text-center"
    >
      <PlusCircle
        className="h-8 w-8 text-ink-muted group-hover:text-accent transition-colors mb-3"
        aria-hidden="true"
      />
      <p className="font-display text-base text-ink-secondary group-hover:text-ink-primary transition-colors leading-snug">
        {t('claimCtaTitle')}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mt-1">
        {t('claimCtaSubtitle')}
      </p>
    </Link>
  );
}
