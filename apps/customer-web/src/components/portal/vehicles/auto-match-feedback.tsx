'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock } from 'lucide-react';

interface AutoMatchFeedbackProps {
  hit: boolean | null;
}

/**
 * Inline chip shown on the claim form as the user types their VIN.
 * null = VIN not yet checked; true = auto-match found; false = pending review.
 */
export function AutoMatchFeedback({ hit }: AutoMatchFeedbackProps) {
  const t = useTranslations('portal.vehicles');

  if (hit === null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 px-3 py-2 text-sm border ${
        hit
          ? 'bg-success/8 border-success/20 text-success'
          : 'bg-bg-subtle border-line text-ink-secondary'
      }`}
    >
      {hit ? (
        <>
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{t('autoMatchHit')}</span>
        </>
      ) : (
        <>
          <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{t('autoMatchMiss')}</span>
        </>
      )}
    </div>
  );
}
