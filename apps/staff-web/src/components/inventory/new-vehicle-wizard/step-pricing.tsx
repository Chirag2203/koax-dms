'use client';

import { useFormContext } from 'react-hook-form';
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

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputBase = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'placeholder:text-ink-muted',
);

const labelBase = 'block text-sm font-medium text-ink-secondary mb-1.5';
const fieldError = 'text-xs text-state-danger mt-1';

// ─── Component ────────────────────────────────────────────────────────────────

export function StepPricing() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  const acquisitionCost = watch('acquisitionCost');
  const targetPrice = watch('targetPrice');
  const minimumPrice = watch('minimumPrice');
  const refurbBudget = watch('expectedRefurbBudget');

  // Compute derived values
  const totalCost = (acquisitionCost > 0 ? acquisitionCost : 0) + (refurbBudget ?? 0);
  const grossMargin =
    targetPrice > 0 && totalCost > 0
      ? ((targetPrice - totalCost) / totalCost) * 100
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-primary">Pricing</h2>
        <p className="text-sm text-ink-muted mt-1">
          Set the target sale price, minimum floor, and expected refurbishment budget.
        </p>
      </div>

      {/* Acquisition cost reminder */}
      {acquisitionCost > 0 && (
        <div className="rounded-lg border border-line bg-bg-subtle px-4 py-3">
          <p className="text-xs text-ink-muted">Acquisition cost (from Step 1)</p>
          <p className="text-base font-mono font-semibold text-ink-primary mt-0.5 tabular-nums">
            {formatInr(acquisitionCost)}
          </p>
        </div>
      )}

      {/* Target price */}
      <div>
        <label htmlFor="targetPrice" className={labelBase}>
          Target sale price (₹) <span className="text-state-danger">*</span>
        </label>
        <input
          id="targetPrice"
          type="number"
          min={1}
          placeholder="e.g., 5500000"
          {...register('targetPrice', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums text-right')}
        />
        {errors.targetPrice && (
          <p className={fieldError} role="alert">{errors.targetPrice.message}</p>
        )}
      </div>

      {/* Minimum price */}
      <div>
        <label htmlFor="minimumPrice" className={labelBase}>
          Minimum acceptable price (₹) <span className="text-state-danger">*</span>
        </label>
        <input
          id="minimumPrice"
          type="number"
          min={1}
          placeholder={
            targetPrice > 0
              ? String(Math.round(targetPrice * 0.9))
              : 'e.g., 4950000'
          }
          {...register('minimumPrice', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums text-right')}
        />
        {errors.minimumPrice && (
          <p className={fieldError} role="alert">{errors.minimumPrice.message}</p>
        )}
        {targetPrice > 0 && (
          <p className="text-xs text-ink-muted mt-1">
            Must be ≥ {formatInr(Math.round(targetPrice * 0.9))} (90% of target price)
          </p>
        )}
      </div>

      {/* Expected refurb budget */}
      <div>
        <label htmlFor="expectedRefurbBudget" className={labelBase}>
          Expected refurb budget (₹)
        </label>
        <input
          id="expectedRefurbBudget"
          type="number"
          min={0}
          placeholder="e.g., 80000 (optional)"
          {...register('expectedRefurbBudget', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums text-right')}
        />
        {errors.expectedRefurbBudget && (
          <p className={fieldError} role="alert">{errors.expectedRefurbBudget.message}</p>
        )}
      </div>

      {/* Margin preview */}
      {grossMargin !== null && (
        <div className={cn(
          'rounded-lg border px-4 py-3',
          grossMargin >= 15
            ? 'border-state-success/30 bg-state-success/5'
            : grossMargin >= 5
              ? 'border-state-warning/30 bg-state-warning/5'
              : 'border-state-danger/30 bg-state-danger/5',
        )}>
          <p className="text-xs text-ink-muted">Projected gross margin</p>
          <p className={cn(
            'text-lg font-mono font-bold tabular-nums mt-0.5',
            grossMargin >= 15
              ? 'text-state-success'
              : grossMargin >= 5
                ? 'text-state-warning'
                : 'text-state-danger',
          )}>
            {grossMargin > 0 ? '+' : ''}{grossMargin.toFixed(1)}%
          </p>
          <p className="text-xs text-ink-muted mt-1">
            Total cost: {formatInr(totalCost)} · Target: {formatInr(targetPrice)}
          </p>
        </div>
      )}

      {/* Minimum floor warning */}
      {minimumPrice > 0 && acquisitionCost > 0 && minimumPrice < acquisitionCost && (
        <div className="rounded-lg border border-state-danger/30 bg-state-danger/5 px-4 py-3">
          <p className="text-sm font-medium text-state-danger">
            Minimum price is below acquisition cost
          </p>
          <p className="text-xs text-ink-secondary mt-0.5">
            Selling at minimum would result in a loss of {formatInr(acquisitionCost - minimumPrice)}
          </p>
        </div>
      )}
    </div>
  );
}
