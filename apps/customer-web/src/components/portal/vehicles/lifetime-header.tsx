'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@dms/ui';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';
import { ExportPdfButton } from './export-pdf-button';

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km) + ' km';
}

interface LifetimeHeaderProps {
  vehicle: OwnedVehicleView;
}

function CpoBadge({ badge }: { badge: OwnedVehicleView['cpoEligibility'] }) {
  if (badge === 'NOT_ELIGIBLE') return null;
  return (
    <span
      className={cn(
        'inline-flex font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border',
        badge === 'ELIGIBLE'
          ? 'bg-success/10 text-success border-success/20'
          : 'bg-warning/10 text-warning border-warning/20',
      )}
    >
      {badge === 'ELIGIBLE' ? '✓ Certified Pre-Owned' : '⚠ CPO At Risk'}
    </span>
  );
}

export function LifetimeHeader({ vehicle }: LifetimeHeaderProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <div className="px-6 md:px-12 lg:px-16 pt-8 pb-10 border-b border-line">
      {/* Back link */}
      <Link
        href="/vehicles"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink-primary transition-colors mb-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        {t('backToVehicles')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
        {/* Vehicle identity */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2">
            {vehicle.make} · {vehicle.year}
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-ink-primary leading-tight mb-1">
            {vehicle.model}
          </h1>
          {vehicle.variant && (
            <p className="text-sm text-ink-secondary mb-3">
              {vehicle.variant} · {vehicle.color}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <CpoBadge badge={vehicle.cpoEligibility} />
            {vehicle.isJoint && (
              <span className="inline-flex font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 bg-accent/10 text-accent border border-accent/20">
                {t('jointOwner')}
                {vehicle.jointPeerDisplayName && ` · ${vehicle.jointPeerDisplayName}`}
              </span>
            )}
            {vehicle.inGrace && (
              <span className="inline-flex font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 bg-warning/10 text-warning border border-warning/20">
                {t('graceAccess')}
              </span>
            )}
          </div>

          {/* Key stats row */}
          <div className="flex flex-wrap items-center gap-6 mt-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">
                {t('currentMileage')}
              </p>
              <p className="font-mono text-lg text-ink-primary tabular-nums">
                {formatKm(vehicle.currentKm)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">
                {t('registration')}
              </p>
              <p className="font-mono text-sm text-ink-primary tabular-nums">
                {vehicle.registrationNumber}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">
                {t('totalServiceVisits')}
              </p>
              <p className="font-mono text-sm text-ink-primary tabular-nums">
                {vehicle.summary.totalBnServiceVisits}
              </p>
            </div>
          </div>
        </div>

        {/* Export PDF */}
        <div className="flex-shrink-0">
          <ExportPdfButton vin={vehicle.vin} />
        </div>
      </div>
    </div>
  );
}
