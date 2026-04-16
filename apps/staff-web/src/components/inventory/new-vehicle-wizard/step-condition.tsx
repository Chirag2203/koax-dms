'use client';

import { useFormContext } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { WizardFormValues } from './types';

// ─── Options ──────────────────────────────────────────────────────────────────

const ACCIDENT_OPTIONS = ['None', 'Minor', 'Major'] as const;

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputBase = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'placeholder:text-ink-muted',
);

const labelBase = 'block text-sm font-medium text-ink-secondary mb-1.5';
const fieldError = 'text-xs text-state-danger mt-1';

// ─── Component ────────────────────────────────────────────────────────────────

export function StepCondition() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  const accidentHistory = watch('accidentHistory');
  const serviceHistory = watch('serviceHistoryAvailable');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-primary">Condition &amp; history</h2>
        <p className="text-sm text-ink-muted mt-1">
          All fields are optional at draft stage — fill what you know now.
        </p>
      </div>

      {/* Previous owners */}
      <div>
        <label htmlFor="previousOwners" className={labelBase}>
          Previous owners
        </label>
        <input
          id="previousOwners"
          type="number"
          min={1}
          max={10}
          placeholder="e.g., 1"
          {...register('previousOwners', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums')}
        />
        {errors.previousOwners && (
          <p className={fieldError} role="alert">{errors.previousOwners.message}</p>
        )}
      </div>

      {/* Accident history */}
      <div>
        <p id="accident-label" className={labelBase}>Accident history</p>
        <div
          role="group"
          aria-labelledby="accident-label"
          className="inline-flex rounded-md border border-line overflow-hidden w-full"
        >
          {ACCIDENT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={accidentHistory === opt}
              onClick={() => setValue('accidentHistory', opt, { shouldValidate: true })}
              className={cn(
                'flex-1 h-10 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                accidentHistory === opt
                  ? opt === 'None'
                    ? 'bg-state-success text-white'
                    : opt === 'Minor'
                      ? 'bg-state-warning text-white'
                      : 'bg-state-danger text-white'
                  : 'bg-bg-subtle text-ink-secondary hover:text-ink-primary hover:bg-bg-hover',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {errors.accidentHistory && (
          <p className={fieldError} role="alert">{errors.accidentHistory.message}</p>
        )}
      </div>

      {/* Service history toggle */}
      <div className="flex items-center justify-between rounded-lg border border-line bg-bg-subtle px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink-primary">Service history available</p>
          <p className="text-xs text-ink-muted mt-0.5">Documents or records present</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={serviceHistory ?? false}
          onClick={() => setValue('serviceHistoryAvailable', !(serviceHistory ?? false), { shouldValidate: true })}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            serviceHistory ? 'bg-accent' : 'bg-bg-hover',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
              'transform transition duration-200 ease-in-out',
              serviceHistory ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {/* Condition notes */}
      <div>
        <label htmlFor="conditionNotes" className={labelBase}>
          Condition notes
        </label>
        <textarea
          id="conditionNotes"
          rows={5}
          maxLength={2000}
          placeholder="Describe the overall condition, any cosmetic or mechanical issues observed…"
          {...register('conditionNotes')}
          className={cn(
            'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
            'text-sm text-ink-primary placeholder:text-ink-muted',
            'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            'resize-y min-h-[120px]',
          )}
        />
        {errors.conditionNotes && (
          <p className={fieldError} role="alert">{errors.conditionNotes.message}</p>
        )}
        <p className="text-xs text-ink-muted mt-1">Maximum 2,000 characters</p>
      </div>
    </div>
  );
}
