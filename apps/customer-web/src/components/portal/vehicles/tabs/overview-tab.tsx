'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km) + ' km';
}

interface OverviewTabProps {
  vehicle: OwnedVehicleView;
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b border-line">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <span className="text-sm text-ink-primary text-right">{value}</span>
    </div>
  );
}

export function OverviewTab({ vehicle }: OverviewTabProps) {
  const t = useTranslations('portal.vehicles');
  const { summary } = vehicle;

  return (
    <div className="space-y-8">
      {/* Current state */}
      <section>
        <h3 className="font-display text-xl text-ink-primary mb-4">{t('currentStatus')}</h3>
        <div>
          <StatRow label={t('currentMileage')} value={formatKm(vehicle.currentKm)} />
          <StatRow label={t('registration')} value={vehicle.registrationNumber} />
          <StatRow label={t('color')} value={vehicle.color} />
          <StatRow label={t('outletId')} value={vehicle.outletId} />
          <StatRow
            label={t('ownershipStatus')}
            value={
              <span
                className={
                  vehicle.inGrace
                    ? 'text-warning'
                    : vehicle.isCurrentlyOwned
                      ? 'text-success'
                      : 'text-ink-muted'
                }
              >
                {vehicle.inGrace
                  ? t('graceAccess')
                  : vehicle.isCurrentlyOwned
                    ? t('activeOwner')
                    : vehicle.ownershipState}
              </span>
            }
          />
        </div>
      </section>

      {/* Aggregate history — DPDP safe, no prior owner PII */}
      <section>
        <h3 className="font-display text-xl text-ink-primary mb-4">{t('vehicleHistory')}</h3>
        <div className="bg-bg-subtle border border-line rounded-sm p-5 space-y-1">
          <div>
            <StatRow
              label={t('previousOwners')}
              value={summary.previousOwnerCount}
            />
            <StatRow
              label={t('firstBnTouch')}
              value={formatDate(summary.firstTouchedAt)}
            />
            <StatRow
              label={t('totalServiceVisits')}
              value={summary.totalBnServiceVisits}
            />
            {summary.lastServiceAt && (
              <StatRow
                label={t('lastService')}
                value={formatDate(summary.lastServiceAt)}
              />
            )}
            <StatRow
              label={t('openWarranties')}
              value={summary.warrantyClaims.open}
            />
            <StatRow
              label={t('historicalWarranties')}
              value={summary.warrantyClaims.historical}
            />
          </div>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-3">
          {t('aggregateDisclaimer')}
        </p>
      </section>
    </div>
  );
}
