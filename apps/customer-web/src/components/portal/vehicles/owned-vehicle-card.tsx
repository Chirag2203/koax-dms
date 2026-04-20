'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@dms/ui';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return vin.slice(0, 9) + '····' + vin.slice(-4);
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km);
}

function graceDaysRemaining(graceUntilAt: string): number {
  const diff = new Date(graceUntilAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── CPO Badge ────────────────────────────────────────────────────────────────

function CpoBadgeChip({ badge }: { badge: OwnedVehicleView['cpoEligibility'] }) {
  if (badge === 'NOT_ELIGIBLE') return null;
  return (
    <span
      className={cn(
        'inline-flex font-mono text-[9px] uppercase tracking-widest px-2 py-0.5',
        badge === 'ELIGIBLE'
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-warning/10 text-warning border border-warning/20',
      )}
    >
      {badge === 'ELIGIBLE' ? 'CPO' : 'CPO At Risk'}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OwnedVehicleCardProps {
  vehicle: OwnedVehicleView;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnedVehicleCard({ vehicle }: OwnedVehicleCardProps) {
  const t = useTranslations('portal.vehicles');
  const isGrace = vehicle.inGrace;
  const daysLeft = isGrace && vehicle.graceUntilAt ? graceDaysRemaining(vehicle.graceUntilAt) : 0;

  return (
    <Link href={`/vehicles/${vehicle.vin}`} className="group block h-full">
      <article
        className={cn(
          'h-full flex flex-col',
          'overflow-hidden rounded-sm transition-all duration-300',
          'border border-line hover:border-accent/40',
          'bg-bg-subtle hover:bg-bg-hover',
          isGrace && 'border-warning/30',
        )}
      >
        {/* Grace banner inline */}
        {isGrace && vehicle.graceUntilAt && (
          <div className="flex items-center gap-2 px-4 py-2 bg-warning/8 border-b border-warning/20">
            <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" aria-hidden="true" />
            <span className="font-mono text-[10px] text-warning">
              {t('graceInline', { days: daysLeft })}
            </span>
          </div>
        )}

        {/* Card body */}
        <div className="flex flex-col flex-1 p-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display text-lg text-ink-primary leading-snug line-clamp-2">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <ChevronRight
              className="h-4 w-4 text-ink-muted mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />
          </div>

          {/* Variant + color */}
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
            {vehicle.variant} · {vehicle.color}
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <CpoBadgeChip badge={vehicle.cpoEligibility} />
            {vehicle.isJoint && (
              <span className="inline-flex font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 bg-accent/10 text-accent border border-accent/20">
                {t('jointOwner')}
                {vehicle.jointPeerDisplayName && ` · ${vehicle.jointPeerDisplayName}`}
              </span>
            )}
            {isGrace && (
              <span className="inline-flex font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 bg-warning/10 text-warning border border-warning/20">
                {t('graceAccess')}
              </span>
            )}
          </div>

          {/* VIN */}
          <p className="font-mono text-[11px] text-ink-secondary mb-auto">
            {maskVin(vehicle.vin)}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 py-3 mt-4 border-t border-line">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">
                {t('currentMileage')}
              </p>
              <p className="font-mono text-sm text-ink-primary tabular-nums">
                {formatKm(vehicle.currentKm)} km
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">
                {t('serviceVisits')}
              </p>
              <p className="font-mono text-sm text-ink-primary tabular-nums">
                {vehicle.summary.totalBnServiceVisits}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
