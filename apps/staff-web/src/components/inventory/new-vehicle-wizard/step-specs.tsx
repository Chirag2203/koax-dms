'use client';

import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { cn } from '@dms/ui';
import type { WizardFormValues } from './types';

// ─── Options ──────────────────────────────────────────────────────────────────

const MAKES = [
  'Porsche', 'BMW', 'Mercedes-Benz', 'Audi', 'Land Rover', 'Jaguar', 'Volvo',
] as const;

const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Hybrid', 'EV'] as const;
const TRANSMISSION_OPTIONS = ['Manual', 'Automatic', 'CVT', 'DCT'] as const;

const CURRENT_YEAR = new Date().getFullYear();

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputBase = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'placeholder:text-ink-muted',
);

const labelBase = 'block text-sm font-medium text-ink-secondary mb-1.5';
const fieldError = 'text-xs text-state-danger mt-1';

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  id,
  options,
  value,
  onChange,
  error,
  label,
  required,
}: {
  id: string;
  options: readonly T[];
  value: T | '';
  onChange: (v: T) => void;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <p id={`${id}-label`} className={labelBase}>
        {label} {required && <span className="text-state-danger">*</span>}
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="inline-flex rounded-md border border-line overflow-hidden w-full"
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 h-10 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              value === opt
                ? 'bg-accent text-white'
                : 'bg-bg-subtle text-ink-secondary hover:text-ink-primary hover:bg-bg-hover',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className={fieldError} role="alert">{error}</p>}
    </div>
  );
}

// ─── VIN status indicator ─────────────────────────────────────────────────────

type VinStatus = 'idle' | 'checking' | 'ok' | 'exists' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export function StepSpecs() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  const vin = watch('vin');
  const fuel = watch('fuel');
  const transmission = watch('transmission');

  const [vinStatus, setVinStatus] = useState<VinStatus>('idle');

  // VIN check on blur
  async function checkVin(value: string) {
    if (value.length !== 17) return;
    setVinStatus('checking');
    try {
      const res = await fetch(`/api/staff/inventory/vin-check?vin=${encodeURIComponent(value)}`);
      const data = (await res.json()) as { exists: boolean };
      setVinStatus(data.exists ? 'exists' : 'ok');
    } catch {
      setVinStatus('error');
    }
  }

  // Reset vin status when value changes
  useEffect(() => {
    setVinStatus('idle');
  }, [vin]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-primary">Vehicle specifications</h2>
        <p className="text-sm text-ink-muted mt-1">
          Enter the vehicle&apos;s identity and specification details.
        </p>
      </div>

      {/* VIN */}
      <div>
        <label htmlFor="vin" className={labelBase}>
          VIN <span className="text-state-danger">*</span>
        </label>
        <div className="relative">
          <input
            id="vin"
            type="text"
            maxLength={17}
            placeholder="e.g., WP0ZZZ99ZTS123456"
            {...register('vin')}
            onBlur={(e) => {
              void checkVin(e.target.value);
            }}
            className={cn(
              inputBase,
              'font-mono uppercase tracking-widest pr-20',
              vinStatus === 'exists' && 'border-state-danger focus:border-state-danger',
              vinStatus === 'ok' && 'border-state-success focus:border-state-success',
            )}
            style={{ textTransform: 'uppercase' }}
          />
          {/* VIN status badge */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none">
            {vinStatus === 'checking' && (
              <span className="text-ink-muted">Checking…</span>
            )}
            {vinStatus === 'ok' && (
              <span className="text-state-success">Available</span>
            )}
            {vinStatus === 'exists' && (
              <span className="text-state-danger">Already exists</span>
            )}
          </span>
        </div>
        {(errors.vin || vinStatus === 'exists') && (
          <p className={fieldError} role="alert">
            {vinStatus === 'exists' ? 'A vehicle with this VIN already exists in the system.' : errors.vin?.message}
          </p>
        )}
        <p className="text-xs text-ink-muted mt-1">17-character Vehicle Identification Number</p>
      </div>

      {/* Make */}
      <div>
        <label htmlFor="make" className={labelBase}>
          Make <span className="text-state-danger">*</span>
        </label>
        <select
          id="make"
          {...register('make')}
          className={cn(inputBase, 'appearance-none')}
        >
          <option value="">Select make…</option>
          {MAKES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {errors.make && (
          <p className={fieldError} role="alert">{errors.make.message}</p>
        )}
      </div>

      {/* Model */}
      <div>
        <label htmlFor="model" className={labelBase}>
          Model <span className="text-state-danger">*</span>
        </label>
        <input
          id="model"
          type="text"
          placeholder="e.g., 911, X5, GLE 400"
          {...register('model')}
          className={inputBase}
        />
        {errors.model && (
          <p className={fieldError} role="alert">{errors.model.message}</p>
        )}
      </div>

      {/* Variant */}
      <div>
        <label htmlFor="variant" className={labelBase}>
          Variant <span className="text-state-danger">*</span>
        </label>
        <input
          id="variant"
          type="text"
          placeholder="e.g., Carrera 4S, xDrive40d"
          {...register('variant')}
          className={inputBase}
        />
        {errors.variant && (
          <p className={fieldError} role="alert">{errors.variant.message}</p>
        )}
      </div>

      {/* Year */}
      <div>
        <label htmlFor="year" className={labelBase}>
          Year <span className="text-state-danger">*</span>
        </label>
        <input
          id="year"
          type="number"
          min={1990}
          max={CURRENT_YEAR}
          placeholder={String(CURRENT_YEAR - 2)}
          {...register('year', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums')}
        />
        {errors.year && (
          <p className={fieldError} role="alert">{errors.year.message}</p>
        )}
      </div>

      {/* Color */}
      <div>
        <label htmlFor="color" className={labelBase}>
          Color <span className="text-state-danger">*</span>
        </label>
        <input
          id="color"
          type="text"
          placeholder="e.g., Carmine Red, Moonlight Blue"
          {...register('color')}
          className={inputBase}
        />
        {errors.color && (
          <p className={fieldError} role="alert">{errors.color.message}</p>
        )}
      </div>

      {/* Fuel */}
      <SegmentedControl
        id="fuel"
        label="Fuel"
        required
        options={FUEL_OPTIONS}
        value={fuel ?? ''}
        onChange={(v) => setValue('fuel', v, { shouldValidate: true })}
        error={errors.fuel?.message}
      />

      {/* Transmission */}
      <SegmentedControl
        id="transmission"
        label="Transmission"
        required
        options={TRANSMISSION_OPTIONS}
        value={transmission ?? ''}
        onChange={(v) => setValue('transmission', v, { shouldValidate: true })}
        error={errors.transmission?.message}
      />

      {/* Odometer */}
      <div>
        <label htmlFor="odometer" className={labelBase}>
          Odometer (km) <span className="text-state-danger">*</span>
        </label>
        <input
          id="odometer"
          type="number"
          min={0}
          max={500000}
          placeholder="e.g., 42000"
          {...register('odometer', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums text-right')}
        />
        {errors.odometer && (
          <p className={fieldError} role="alert">{errors.odometer.message}</p>
        )}
      </div>

      {/* Registration city */}
      <div>
        <label htmlFor="registrationCity" className={labelBase}>
          Registration city <span className="text-state-danger">*</span>
        </label>
        <input
          id="registrationCity"
          type="text"
          placeholder="e.g., Bangalore, Mumbai"
          {...register('registrationCity')}
          className={inputBase}
        />
        {errors.registrationCity && (
          <p className={fieldError} role="alert">{errors.registrationCity.message}</p>
        )}
      </div>
    </div>
  );
}
