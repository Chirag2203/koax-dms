'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ClaimForm } from '@/src/components/portal/vehicles/claim-form';

export default function ClaimPage() {
  const t = useTranslations('portal.vehicles');

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <div className="px-6 md:px-12 lg:px-16 pt-10 pb-8 border-b border-line">
        <h1 className="font-display text-3xl md:text-4xl text-ink-primary leading-tight mb-2">
          {t('claimTitle')}
        </h1>
        <p className="text-sm text-ink-secondary max-w-xl">{t('claimSubtitle')}</p>
      </div>

      {/* Form */}
      <div className="px-6 md:px-12 lg:px-16 py-10">
        <ClaimForm />
      </div>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
