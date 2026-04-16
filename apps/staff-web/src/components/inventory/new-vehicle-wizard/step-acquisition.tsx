'use client';

import { useFormContext } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { WizardFormValues } from './types';

// ─── Options ──────────────────────────────────────────────────────────────────

const ACQUISITION_SOURCES = [
  { value: 'TRADE_IN',        label: 'Trade-in' },
  { value: 'AUCTION',         label: 'Auction' },
  { value: 'DIRECT_PURCHASE', label: 'Direct purchase' },
  { value: 'CONSIGNMENT',     label: 'Consignment' },
] as const;

const OUTLETS = [
  { value: 'BLR', label: 'Bangalore' },
  { value: 'MUM', label: 'Mumbai' },
  { value: 'CHE', label: 'Chennai' },
] as const;

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputBase = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'placeholder:text-ink-muted',
);

const labelBase = 'block text-sm font-medium text-ink-secondary mb-1.5';
const fieldError = 'text-xs text-state-danger mt-1';

// ─── Component ────────────────────────────────────────────────────────────────

export function StepAcquisition() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  const source = watch('acquisitionSource');
  const needsRef = source === 'TRADE_IN' || source === 'CONSIGNMENT';

  // Today's date string for max date constraint
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-primary">Acquisition details</h2>
        <p className="text-sm text-ink-muted mt-1">
          Record how and when this vehicle was acquired.
        </p>
      </div>

      {/* Acquisition source */}
      <div>
        <label htmlFor="acquisitionSource" className={labelBase}>
          Acquisition source <span className="text-state-danger">*</span>
        </label>
        <select
          id="acquisitionSource"
          {...register('acquisitionSource')}
          className={cn(inputBase, 'appearance-none bg-[image:var(--select-chevron,none)]')}
        >
          <option value="">Select source…</option>
          {ACQUISITION_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.acquisitionSource && (
          <p className={fieldError} role="alert">{errors.acquisitionSource.message}</p>
        )}
      </div>

      {/* Source reference (conditional) */}
      {needsRef && (
        <div>
          <label htmlFor="sourceReference" className={labelBase}>
            Source reference <span className="text-state-danger">*</span>
          </label>
          <input
            id="sourceReference"
            type="text"
            placeholder={source === 'TRADE_IN' ? 'e.g., Trade-in from KA-01-AB-1234' : 'e.g., Consignor ID or name'}
            {...register('sourceReference')}
            className={inputBase}
          />
          {errors.sourceReference && (
            <p className={fieldError} role="alert">{errors.sourceReference.message}</p>
          )}
        </div>
      )}

      {/* Acquisition date */}
      <div>
        <label htmlFor="acquisitionDate" className={labelBase}>
          Acquisition date <span className="text-state-danger">*</span>
        </label>
        <input
          id="acquisitionDate"
          type="date"
          max={todayStr}
          {...register('acquisitionDate')}
          className={inputBase}
        />
        {errors.acquisitionDate && (
          <p className={fieldError} role="alert">{errors.acquisitionDate.message}</p>
        )}
      </div>

      {/* Acquisition cost */}
      <div>
        <label htmlFor="acquisitionCost" className={labelBase}>
          Acquisition cost (₹) <span className="text-state-danger">*</span>
        </label>
        <input
          id="acquisitionCost"
          type="number"
          min={1}
          placeholder="e.g., 4500000"
          {...register('acquisitionCost', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums text-right')}
        />
        {errors.acquisitionCost && (
          <p className={fieldError} role="alert">{errors.acquisitionCost.message}</p>
        )}
      </div>

      {/* Outlet */}
      <div>
        <label htmlFor="outlet" className={labelBase}>
          Outlet <span className="text-state-danger">*</span>
        </label>
        <select
          id="outlet"
          {...register('outlet')}
          className={cn(inputBase, 'appearance-none')}
        >
          <option value="">Select outlet…</option>
          {OUTLETS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.outlet && (
          <p className={fieldError} role="alert">{errors.outlet.message}</p>
        )}
      </div>
    </div>
  );
}
