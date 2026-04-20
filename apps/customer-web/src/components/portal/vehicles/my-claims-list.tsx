'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { OwnershipClaim } from '@dms/types';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function maskVin(vin: string): string {
  return '·'.repeat(11) + vin.slice(-6);
}

interface ClaimStateBadgeProps {
  state: OwnershipClaim['state'];
}

function ClaimStateBadge({ state }: ClaimStateBadgeProps) {
  const colorMap: Record<OwnershipClaim['state'], string> = {
    PENDING: 'bg-warning/10 text-warning border-warning/20',
    AUTO_APPROVED: 'bg-success/10 text-success border-success/20',
    APPROVED: 'bg-success/10 text-success border-success/20',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <span
      className={cn(
        'inline-flex font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border',
        colorMap[state],
      )}
    >
      {state.replace('_', ' ')}
    </span>
  );
}

interface MyClaimsListProps {
  claims: OwnershipClaim[];
}

export function MyClaimsList({ claims }: MyClaimsListProps) {
  const t = useTranslations('portal.vehicles');

  if (claims.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-lg italic text-ink-secondary mb-4">{t('noClaimsYet')}</p>
        <Link
          href="/vehicles/claim"
          className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline underline-offset-4"
        >
          {t('claimFirstVehicle')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-line" role="list" aria-label={t('myClaimsListLabel')}>
      {claims.map((claim) => (
        <div
          key={claim.id}
          role="listitem"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5"
        >
          {/* Left: VIN + date */}
          <div className="min-w-0">
            <p className="font-mono text-sm text-ink-primary tabular-nums">
              {maskVin(claim.vin)}
            </p>
            <p className="font-mono text-[10px] text-ink-muted mt-0.5">
              {t('claimSubmittedOn')} {formatDate(claim.submittedAt)}
            </p>
          </div>

          {/* Right: state + rejection + resubmit */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ClaimStateBadge state={claim.state} />

            {claim.state === 'REJECTED' && claim.rejectionReasonCategory && (
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                {claim.rejectionReasonCategory.replace(/_/g, ' ')}
              </span>
            )}

            {claim.state === 'REJECTED' && (
              <Link
                href={`/vehicles/claim?vin=${claim.vin}`}
                className="font-mono text-[10px] uppercase tracking-widest text-accent hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {t('resubmit')}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
