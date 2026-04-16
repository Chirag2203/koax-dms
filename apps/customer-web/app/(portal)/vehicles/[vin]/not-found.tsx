'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

export default function VehicleNotFound() {
  const t = useTranslations('portal.vehicles');

  return (
    <div className="max-w-5xl px-6 md:px-12 lg:px-16 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-4">
        404
      </p>
      <h1 className="font-display text-2xl md:text-3xl text-[var(--color-ink)] mb-6">
        {t('notFound')}
      </h1>
      <Link
        href="/vehicles"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        {t('backToVehicles')}
      </Link>
    </div>
  );
}
