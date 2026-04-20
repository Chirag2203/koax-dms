'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';
import { OwnedVehicleCard } from './owned-vehicle-card';
import { ClaimCta } from './claim-cta';

interface OwnedVehiclesGridProps {
  vehicles: OwnedVehicleView[];
  hasClaims?: boolean;
}

export function OwnedVehiclesGrid({ vehicles, hasClaims }: OwnedVehiclesGridProps) {
  const t = useTranslations('portal.vehicles');

  if (vehicles.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-xl italic text-ink-secondary mb-4">
          {t('empty')}
        </p>
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
    <div>
      {/* Claims link */}
      {hasClaims && (
        <div className="mb-6">
          <Link
            href="/vehicles/my-claims"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-accent hover:underline underline-offset-4"
          >
            {t('viewMyClaims')} →
          </Link>
        </div>
      )}

      {/* Grid */}
      <div
        className={cn('grid grid-cols-1 md:grid-cols-2 gap-6')}
        role="list"
        aria-label={t('listLabel')}
      >
        {vehicles.map((vehicle) => (
          <div key={vehicle.ownershipId} role="listitem">
            <OwnedVehicleCard vehicle={vehicle} />
          </div>
        ))}
        {/* Claim CTA always last */}
        <div role="listitem">
          <ClaimCta />
        </div>
      </div>
    </div>
  );
}
