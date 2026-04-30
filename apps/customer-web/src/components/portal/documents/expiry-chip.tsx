'use client';

/**
 * ExpiryChip — amber (expiring-soon ≤30d) or red (expired).
 *
 * SPEC-PORTAL-DOCS-001 L4:
 *   - Amber if daysUntilExpiry ≤ 30 and > 0
 *   - Red if expired (days < 0)
 *   - Hidden for 'active' status or types that never expire
 *
 * No `text-[NNpx]` — uses text-xs per UI canon.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { DocExpiryStatus } from '@/src/lib/portal/portal-docs-adapter';

export interface ExpiryChipProps {
  status: DocExpiryStatus;
  daysUntilExpiry?: number;
}

export function ExpiryChip({ status, daysUntilExpiry }: ExpiryChipProps) {
  const t = useTranslations('portal.documents');

  if (status === 'active') return null;

  const isExpired = status === 'expired';

  return (
    <span
      role="status"
      aria-label={isExpired ? t('expired') : t('expiresIn', { days: daysUntilExpiry ?? 0 })}
      className={[
        'inline-flex items-center px-2 py-0.5',
        'font-mono text-xs uppercase tracking-widest flex-shrink-0',
        isExpired
          ? 'bg-danger/10 text-danger border border-danger/20'
          : 'bg-amber-50 text-amber-700 border border-amber-200',
      ].join(' ')}
    >
      {isExpired ? t('expired') : t('expiresIn', { days: daysUntilExpiry ?? 0 })}
    </span>
  );
}
