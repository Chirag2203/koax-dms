'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VdpSpecGridProps {
  vehicle: Vehicle;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string like "2028-06-15" → "Jun 2028"
 */
function formatExpiry(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ─── Spec row ─────────────────────────────────────────────────────────────────

interface SpecRowProps {
  label: string;
  value: React.ReactNode;
}

function SpecRow({ label, value }: SpecRowProps) {
  return (
    <div className="flex justify-between items-end border-b border-line/20 pb-2 mb-6 last:mb-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="font-sans font-medium text-ink-primary text-right ml-4">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VdpSpecGrid({ vehicle, className }: VdpSpecGridProps) {
  const t = useTranslations('vdp.specs');

  return (
    <section
      className={cn(
        'bg-bg-subtle px-6 md:px-12 lg:px-24 py-16 md:py-24',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-y border-line">
          {/* Provenance column */}
          <div className="p-8 md:p-12 md:border-r border-line">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-accent mb-8 md:mb-12">
              {t('provenance')}
            </h3>
            <div>
              <SpecRow
                label={t('previousOwners')}
                value={String(vehicle.previousOwners)}
              />
              <SpecRow
                label={t('serviceHistory')}
                value={vehicle.serviceHistorySummary || 'N/A'}
              />
              <SpecRow
                label={t('originalRegion')}
                value={`${vehicle.city.charAt(0).toUpperCase()}${vehicle.city.slice(1)}, IN`}
              />
              <SpecRow
                label={t('keysProvided')}
                value={`${vehicle.keyCount} Set${vehicle.keyCount !== 1 ? 's' : ''}`}
              />
              <SpecRow
                label={t('accidentHistory')}
                value={
                  vehicle.accidentHistory && vehicle.accidentHistory.trim().length > 0
                    ? vehicle.accidentHistory
                    : 'Clean'
                }
              />
            </div>
          </div>

          {/* Technical column */}
          <div className="p-8 md:p-12 md:border-r border-line">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-accent mb-8 md:mb-12">
              {t('technical')}
            </h3>
            <div>
              <SpecRow label={t('engine')} value={vehicle.engine || 'N/A'} />
              <SpecRow label={t('power')} value={vehicle.power || 'N/A'} />
              <SpecRow label={t('torque')} value={vehicle.torque || 'N/A'} />
              <SpecRow label={t('transmission')} value={
                vehicle.transmission.charAt(0).toUpperCase() +
                vehicle.transmission.slice(1)
              } />
              <SpecRow label={t('topSpeed')} value={vehicle.topSpeed || 'N/A'} />
              <SpecRow label={t('acceleration')} value={vehicle.acceleration || 'N/A'} />
              <SpecRow label={t('driveType')} value={vehicle.driveType || 'N/A'} />
            </div>
          </div>

          {/* Ownership column */}
          <div className="p-8 md:p-12">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-accent mb-8 md:mb-12">
              {t('ownership')}
            </h3>
            <div>
              <SpecRow
                label={t('insuranceValidity')}
                value={
                  vehicle.insuranceExpiry
                    ? formatExpiry(vehicle.insuranceExpiry)
                    : 'N/A'
                }
              />
              <SpecRow
                label={t('tyreCondition')}
                value={vehicle.tyreCondition || 'N/A'}
              />
              <SpecRow
                label={t('warranty')}
                value={
                  vehicle.warrantyExpiry
                    ? `Until ${formatExpiry(vehicle.warrantyExpiry)}`
                    : 'N/A'
                }
              />
              <SpecRow
                label={t('roadTax')}
                value={`LTT Paid (${vehicle.registrationState})`}
              />
              <SpecRow
                label={t('registrationState')}
                value={vehicle.registrationState}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
