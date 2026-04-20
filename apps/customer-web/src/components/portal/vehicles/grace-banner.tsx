'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface GraceBannerProps {
  graceUntilAt: string;
  vin: string;
}

function daysRemaining(graceUntilAt: string): number {
  const diff = new Date(graceUntilAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function GraceBanner({ graceUntilAt, vin }: GraceBannerProps) {
  const t = useTranslations('portal.vehicles');
  const days = daysRemaining(graceUntilAt);

  return (
    <div
      role="alert"
      className="flex items-start gap-3 px-4 py-3 bg-[var(--color-state-overdue,#fef3c7)] border border-[var(--color-warning,#f59e0b)] rounded-sm"
    >
      <AlertTriangle
        className="h-4 w-4 text-[var(--color-warning,#b45309)] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-warning,#b45309)] mb-0.5">
          {t('graceBannerTitle', { days })}
        </p>
        <p className="text-sm text-[var(--color-ink-secondary)]">
          {t('graceBannerBody')}
        </p>
        <Link
          href={`/vehicles/${vin}`}
          className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--color-warning,#b45309)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-warning,#b45309)]"
        >
          {t('graceBannerCta')} →
        </Link>
      </div>
    </div>
  );
}
