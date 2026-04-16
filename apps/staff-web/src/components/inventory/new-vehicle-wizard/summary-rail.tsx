'use client';

import { cn } from '@dms/ui';
import type { WizardFormValues } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatInr(value: number | undefined): string {
  if (value === undefined || isNaN(value) || value <= 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-line last:border-0">
      <span className="text-xs text-ink-muted shrink-0">{label}</span>
      <span className={cn('text-xs text-ink-primary text-right', mono && 'font-mono tabular-nums')}>
        {value}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SummaryRailProps {
  values: Partial<WizardFormValues>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SummaryRail({ values }: SummaryRailProps) {
  const {
    acquisitionSource,
    acquisitionDate,
    acquisitionCost,
    outlet,
    vin,
    make,
    model,
    variant,
    year,
    color,
    fuel,
    transmission,
    odometer,
    targetPrice,
    minimumPrice,
  } = values;

  const sourceLabel: Record<string, string> = {
    TRADE_IN: 'Trade-in',
    AUCTION: 'Auction',
    DIRECT_PURCHASE: 'Direct purchase',
    CONSIGNMENT: 'Consignment',
  };

  const outletLabel: Record<string, string> = {
    BLR: 'Bangalore',
    MUM: 'Mumbai',
    CHE: 'Chennai',
  };

  const hasAcquisition = acquisitionSource || acquisitionDate || (acquisitionCost && acquisitionCost > 0);
  const hasSpecs = vin || make || year;
  const hasPricing = (targetPrice && targetPrice > 0) || (minimumPrice && minimumPrice > 0);

  return (
    <div className="rounded-xl border border-line bg-bg-surface shadow-sm">
      <div className="px-4 py-3 border-b border-line">
        <h3 className="text-sm font-semibold text-ink-primary">Summary</h3>
        <p className="text-xs text-ink-muted mt-0.5">Fields captured so far</p>
      </div>

      <div className="px-4 py-2">
        {/* Acquisition */}
        {hasAcquisition && (
          <>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mt-2 mb-1">Acquisition</p>
            {acquisitionSource && (
              <Row label="Source" value={sourceLabel[acquisitionSource] ?? acquisitionSource} />
            )}
            {acquisitionDate && (
              <Row label="Date" value={acquisitionDate} />
            )}
            {acquisitionCost && acquisitionCost > 0 && (
              <Row label="Cost" value={formatInr(acquisitionCost)} mono />
            )}
            {outlet && (
              <Row label="Outlet" value={outletLabel[outlet] ?? outlet} />
            )}
          </>
        )}

        {/* Vehicle */}
        {hasSpecs && (
          <>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mt-3 mb-1">Vehicle</p>
            {vin && <Row label="VIN" value={vin.toUpperCase()} mono />}
            {make && model && (
              <Row label="Make / Model" value={`${make} ${model}`} />
            )}
            {variant && <Row label="Variant" value={variant} />}
            {year && year > 0 && <Row label="Year" value={String(year)} mono />}
            {color && <Row label="Color" value={color} />}
            {fuel && <Row label="Fuel" value={fuel} />}
            {transmission && <Row label="Transmission" value={transmission} />}
            {odometer !== undefined && odometer >= 0 && !isNaN(odometer) && (
              <Row label="Odometer" value={`${odometer.toLocaleString('en-IN')} km`} mono />
            )}
          </>
        )}

        {/* Pricing */}
        {hasPricing && (
          <>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mt-3 mb-1">Pricing</p>
            {targetPrice && targetPrice > 0 && (
              <Row label="Target" value={formatInr(targetPrice)} mono />
            )}
            {minimumPrice && minimumPrice > 0 && (
              <Row label="Minimum" value={formatInr(minimumPrice)} mono />
            )}
            {acquisitionCost && acquisitionCost > 0 && targetPrice && targetPrice > 0 && (
              <Row
                label="Gross margin"
                value={`${(((targetPrice - acquisitionCost) / acquisitionCost) * 100).toFixed(1)}%`}
                mono
              />
            )}
          </>
        )}

        {!hasAcquisition && !hasSpecs && !hasPricing && (
          <p className="text-xs text-ink-muted py-4 text-center">
            Fields will appear here as you complete each step.
          </p>
        )}
      </div>
    </div>
  );
}
