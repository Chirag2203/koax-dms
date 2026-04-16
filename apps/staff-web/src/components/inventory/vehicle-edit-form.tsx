'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, PencilLine } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types';
import {
  VinBadge,
  OutletPill,
  AlertDialog,
  ToastContainer,
  Gate,
} from '@/src/components/primitives';
import type { OutletCode } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { StepAcquisition } from '@/src/components/inventory/new-vehicle-wizard/step-acquisition';
import { StepCondition } from '@/src/components/inventory/new-vehicle-wizard/step-condition';
import { StepPricing } from '@/src/components/inventory/new-vehicle-wizard/step-pricing';
import type {
  WizardFormValues,
  FuelType,
  TransmissionType,
  AcquisitionSource,
  AccidentHistory,
  OutletCode as WizardOutletCode,
} from '@/src/components/inventory/new-vehicle-wizard/types';

// ─── Combined schema (all 4 steps) ───────────────────────────────────────────
// step1Schema and step4Schema are ZodEffects (from .superRefine), so we cannot
// call .merge()/.omit() on them directly. Build the combined object schema
// separately and then apply the cross-field validations via a single superRefine.

const editBaseSchema = z.object({
  // Step 1 fields
  acquisitionSource: z.enum(['TRADE_IN', 'AUCTION', 'DIRECT_PURCHASE', 'CONSIGNMENT'], {
    required_error: 'Acquisition source is required',
    invalid_type_error: 'Select a valid source',
  }),
  sourceReference: z.string().optional(),
  acquisitionDate: z
    .string()
    .min(1, 'Acquisition date is required')
    .refine((d) => !d || new Date(d) <= new Date(), 'Acquisition date cannot be in the future'),
  acquisitionCost: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .gt(0, 'Acquisition cost must be greater than 0'),
  outlet: z.enum(['BLR', 'MUM', 'CHE'], {
    required_error: 'Outlet is required',
    invalid_type_error: 'Select a valid outlet',
  }),
  // Step 2 fields
  vin: z
    .string()
    .min(17, 'VIN must be exactly 17 characters')
    .max(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN contains invalid characters'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().min(1, 'Variant is required'),
  year: z
    .number({ invalid_type_error: 'Enter a valid year' })
    .int()
    .min(1990, 'Year must be 1990 or later')
    .max(new Date().getFullYear(), `Year cannot exceed ${new Date().getFullYear()}`),
  color: z.string().min(1, 'Color is required'),
  fuel: z.enum(['Petrol', 'Diesel', 'Hybrid', 'EV'], {
    required_error: 'Fuel type is required',
    invalid_type_error: 'Select a valid fuel type',
  }),
  transmission: z.enum(['Manual', 'Automatic', 'CVT', 'DCT'], {
    required_error: 'Transmission is required',
    invalid_type_error: 'Select a valid transmission',
  }),
  odometer: z
    .number({ invalid_type_error: 'Enter a valid odometer reading' })
    .min(0, 'Odometer cannot be negative')
    .max(500000, 'Odometer cannot exceed 500,000 km'),
  registrationCity: z.string().min(1, 'Registration city is required'),
  // Step 3 fields
  previousOwners: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .or(z.nan().transform(() => undefined)),
  accidentHistory: z.enum(['None', 'Minor', 'Major']).optional(),
  serviceHistoryAvailable: z.boolean().optional(),
  conditionNotes: z.string().max(2000, 'Notes cannot exceed 2,000 characters').optional(),
  // Step 4 fields
  targetPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .gt(0, 'Target price must be greater than 0'),
  minimumPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .gt(0, 'Minimum price must be greater than 0'),
  expectedRefurbBudget: z
    .number()
    .min(0, 'Budget cannot be negative')
    .optional()
    .or(z.nan().transform(() => undefined)),
});

const editSchema = editBaseSchema.superRefine((data, ctx) => {
  // Acquisition: sourceReference required for trade-in / consignment
  const needsRef =
    data.acquisitionSource === 'TRADE_IN' || data.acquisitionSource === 'CONSIGNMENT';
  if (needsRef && (!data.sourceReference || data.sourceReference.trim() === '')) {
    ctx.addIssue({
      path: ['sourceReference'],
      code: z.ZodIssueCode.custom,
      message: 'Source reference is required for Trade-in and Consignment',
    });
  }
  // Pricing: target > acquisition cost
  if (data.targetPrice > 0 && data.acquisitionCost > 0) {
    if (data.targetPrice <= data.acquisitionCost) {
      ctx.addIssue({
        path: ['targetPrice'],
        code: z.ZodIssueCode.custom,
        message: 'Target price must be greater than the acquisition cost',
      });
    }
  }
  // Pricing: minimum >= 90% of target
  if (data.minimumPrice > 0 && data.targetPrice > 0) {
    if (data.minimumPrice < data.targetPrice * 0.9) {
      ctx.addIssue({
        path: ['minimumPrice'],
        code: z.ZodIssueCode.custom,
        message: 'Minimum price must be at least 90% of the target price',
      });
    }
  }
});

// ─── Value mapping helpers ────────────────────────────────────────────────────

const cityToOutlet: Record<string, WizardOutletCode> = {
  bangalore: 'BLR',
  mumbai: 'MUM',
  chennai: 'CHE',
};

const fuelMap: Record<string, FuelType> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  electric: 'EV',
  hybrid: 'Hybrid',
};

const transmissionMap: Record<string, TransmissionType> = {
  automatic: 'Automatic',
  manual: 'Manual',
};

// ─── Map Vehicle → WizardFormValues ──────────────────────────────────────────

function mapVehicleToWizardValues(vehicle: Vehicle): WizardFormValues {
  const accidentText = vehicle.accidentHistory?.toLowerCase() ?? '';
  let accidentHistory: AccidentHistory = 'None';
  if (accidentText.includes('major')) accidentHistory = 'Major';
  else if (accidentText.includes('minor')) accidentHistory = 'Minor';

  const outlet = cityToOutlet[vehicle.city] ?? 'BLR';
  const fuel = fuelMap[vehicle.fuel] ?? 'Petrol';
  const transmission = transmissionMap[vehicle.transmission] ?? 'Automatic';
  const acquisitionCost = Math.round(vehicle.price * 0.8);

  return {
    // Step 1 — Acquisition
    acquisitionSource: 'DIRECT_PURCHASE' as AcquisitionSource,
    sourceReference: '',
    acquisitionDate: vehicle.listedAt.slice(0, 10),
    acquisitionCost,
    outlet,

    // Step 2 — Specs
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    color: vehicle.color,
    fuel,
    transmission,
    odometer: vehicle.km,
    registrationCity: vehicle.registrationState ?? vehicle.city,

    // Step 3 — Condition
    previousOwners: vehicle.previousOwners ?? 1,
    accidentHistory,
    serviceHistoryAvailable: !!vehicle.serviceHistorySummary,
    conditionNotes: vehicle.editorialCopy ?? '',

    // Step 4 — Pricing
    targetPrice: vehicle.price,
    minimumPrice: Math.round(vehicle.price * 0.92),
    expectedRefurbBudget: 0,
  };
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const inputBase = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'placeholder:text-ink-muted',
);

const labelBase = 'block text-sm font-medium text-ink-secondary mb-1.5';

// ─── VIN read-only field ──────────────────────────────────────────────────────

function VinReadOnlyField({ vin }: { vin: string }) {
  return (
    <div className="mb-6">
      <label className={labelBase}>
        VIN
      </label>
      <div className="relative">
        <input
          type="text"
          value={vin}
          readOnly
          disabled
          aria-describedby="vin-readonly-hint"
          className={cn(
            inputBase,
            'font-mono uppercase tracking-widest pr-10 cursor-not-allowed',
          )}
        />
        <Lock
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
          aria-hidden="true"
        />
      </div>
      <p id="vin-readonly-hint" className="text-xs text-ink-muted mt-1">
        VIN cannot be changed after creation
      </p>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-ink-primary">{title}</h2>
        <div className="mt-3 border-t border-line" />
      </div>
      <div>{children}</div>
    </section>
  );
}

// ─── StepSpecs without VIN field ─────────────────────────────────────────────
// Renders all spec fields except VIN (which is read-only and handled by VinReadOnlyField)

const MAKES = [
  'Porsche', 'BMW', 'Mercedes-Benz', 'Audi', 'Land Rover', 'Jaguar', 'Volvo',
] as const;

const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Hybrid', 'EV'] as const;
const TRANSMISSION_OPTIONS = ['Manual', 'Automatic', 'CVT', 'DCT'] as const;
const CURRENT_YEAR = new Date().getFullYear();

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
      {error && <p className="text-xs text-state-danger mt-1" role="alert">{error}</p>}
    </div>
  );
}

function StepSpecsWithoutVin() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  const fuel = watch('fuel');
  const transmission = watch('transmission');

  return (
    <div className="space-y-6">
      {/* Make */}
      <div>
        <label htmlFor="edit-make" className={labelBase}>
          Make <span className="text-state-danger">*</span>
        </label>
        <select
          id="edit-make"
          {...register('make')}
          className={cn(inputBase, 'appearance-none')}
        >
          <option value="">Select make…</option>
          {MAKES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {errors.make && (
          <p className="text-xs text-state-danger mt-1" role="alert">{errors.make.message}</p>
        )}
      </div>

      {/* Model */}
      <div>
        <label htmlFor="edit-model" className={labelBase}>
          Model <span className="text-state-danger">*</span>
        </label>
        <input
          id="edit-model"
          type="text"
          placeholder="e.g., 911, X5, GLE 400"
          {...register('model')}
          className={inputBase}
        />
        {errors.model && (
          <p className="text-xs text-state-danger mt-1" role="alert">{errors.model.message}</p>
        )}
      </div>

      {/* Variant */}
      <div>
        <label htmlFor="edit-variant" className={labelBase}>
          Variant <span className="text-state-danger">*</span>
        </label>
        <input
          id="edit-variant"
          type="text"
          placeholder="e.g., Carrera 4S, xDrive40d"
          {...register('variant')}
          className={inputBase}
        />
        {errors.variant && (
          <p className="text-xs text-state-danger mt-1" role="alert">{errors.variant.message}</p>
        )}
      </div>

      {/* Year */}
      <div>
        <label htmlFor="edit-year" className={labelBase}>
          Year <span className="text-state-danger">*</span>
        </label>
        <input
          id="edit-year"
          type="number"
          min={1990}
          max={CURRENT_YEAR}
          {...register('year', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums')}
        />
        {errors.year && (
          <p className="text-xs text-state-danger mt-1" role="alert">{errors.year.message}</p>
        )}
      </div>

      {/* Color */}
      <div>
        <label htmlFor="edit-color" className={labelBase}>
          Color <span className="text-state-danger">*</span>
        </label>
        <input
          id="edit-color"
          type="text"
          placeholder="e.g., Carmine Red, Moonlight Blue"
          {...register('color')}
          className={inputBase}
        />
        {errors.color && (
          <p className="text-xs text-state-danger mt-1" role="alert">{errors.color.message}</p>
        )}
      </div>

      {/* Fuel */}
      <SegmentedControl
        id="edit-fuel"
        label="Fuel"
        required
        options={FUEL_OPTIONS}
        value={fuel ?? ''}
        onChange={(v) => setValue('fuel', v, { shouldValidate: true })}
        error={errors.fuel?.message}
      />

      {/* Transmission */}
      <SegmentedControl
        id="edit-transmission"
        label="Transmission"
        required
        options={TRANSMISSION_OPTIONS}
        value={transmission ?? ''}
        onChange={(v) => setValue('transmission', v, { shouldValidate: true })}
        error={errors.transmission?.message}
      />

      {/* Odometer */}
      <div>
        <label htmlFor="edit-odometer" className={labelBase}>
          Odometer (km) <span className="text-state-danger">*</span>
        </label>
        <input
          id="edit-odometer"
          type="number"
          min={0}
          max={500000}
          placeholder="e.g., 42000"
          {...register('odometer', { valueAsNumber: true })}
          className={cn(inputBase, 'font-mono tabular-nums text-right')}
        />
        {errors.odometer && (
          <p className="text-xs text-state-danger mt-1" role="alert">{errors.odometer.message}</p>
        )}
      </div>

      {/* Registration city */}
      <div>
        <label htmlFor="edit-regCity" className={labelBase}>
          Registration city <span className="text-state-danger">*</span>
        </label>
        <input
          id="edit-regCity"
          type="text"
          placeholder="e.g., Bangalore, Mumbai"
          {...register('registrationCity')}
          className={inputBase}
        />
        {errors.registrationCity && (
          <p className="text-xs text-state-danger mt-1" role="alert">{errors.registrationCity.message}</p>
        )}
      </div>
    </div>
  );
}

// ─── Count dirty fields ───────────────────────────────────────────────────────

function countDirtyFields(dirtyFields: object): number {
  return Object.values(dirtyFields).filter(Boolean).length;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VehicleEditFormProps {
  vehicle: Vehicle;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VehicleEditForm({ vehicle }: VehicleEditFormProps) {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const [showDiscard, setShowDiscard] = useState(false);

  const vinShort = vehicle.vin.slice(-6);
  const outletCode = (cityToOutlet[vehicle.city] ?? 'bangalore').toLowerCase() as OutletCode;

  const methods = useForm<WizardFormValues>({
    defaultValues: mapVehicleToWizardValues(vehicle),
    resolver: zodResolver(editSchema),
    mode: 'onBlur',
  });

  const {
    formState: { isDirty, dirtyFields, isSubmitting },
    handleSubmit,
    reset,
  } = methods;

  const dirtyCount = countDirtyFields(dirtyFields);

  // ⌘S / Ctrl+S keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSubmitting) {
          void handleSubmit(onSave)();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDirty, isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSave(values: WizardFormValues) {
    try {
      const res = await fetch(`/api/staff/inventory/vehicles/${vehicle.vin}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error('Save failed');

      toast('Vehicle updated', 'success');
      reset(values); // clear dirty state before navigation
      router.push(`/inventory/${vehicle.vin}`);
    } catch {
      toast('Could not save changes. Please try again.', 'error');
    }
  }

  function handleCancel() {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      router.push(`/inventory/${vehicle.vin}`);
    }
  }

  function handleDiscardConfirm() {
    setShowDiscard(false);
    router.push(`/inventory/${vehicle.vin}`);
  }

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-bg-canvas">

        {/* ── Sticky header ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 h-14 bg-bg-surface border-b border-line flex items-center px-6 gap-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-ink-muted min-w-0 flex-1">
            <a
              href="/inventory"
              className="hover:text-ink-primary transition-colors"
            >
              Inventory
            </a>
            <span aria-hidden="true">/</span>
            <a
              href={`/inventory/${vehicle.vin}`}
              className="font-mono text-xs hover:text-ink-primary transition-colors"
            >
              {vinShort}
            </a>
            <span aria-hidden="true">/</span>
            <span className="text-ink-primary font-medium">Edit</span>
            <VinBadge vin={vehicle.vin} className="ml-2" />
            <OutletPill outlet={outletCode} className="ml-1" />
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {isDirty && (
              <span className="text-[13px] text-ink-muted flex items-center gap-1.5" aria-live="polite">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-state-warning"
                  aria-hidden="true"
                />
                {dirtyCount > 0
                  ? `${dirtyCount} field${dirtyCount !== 1 ? 's' : ''} modified`
                  : 'Unsaved changes'}
              </span>
            )}

            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                'h-8 px-3 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!isDirty || isSubmitting}
              onClick={handleSubmit(onSave)}
              className={cn(
                'h-8 px-4 rounded-md text-sm font-semibold text-white',
                'bg-accent hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'inline-flex items-center gap-2',
              )}
            >
              {isSubmitting ? (
                'Saving…'
              ) : (
                <>
                  <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Save changes
                  <kbd className="font-mono text-[10px] opacity-70 ml-0.5 hidden sm:inline">⌘S</kbd>
                </>
              )}
            </button>
          </div>
        </header>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main className="max-w-[720px] mx-auto py-10 px-8 space-y-12">

          {/* Section 1: Acquisition */}
          <EditSection title="Acquisition">
            <Gate
              role={['R19', 'R22', 'R24']}
              fallback="disable"
              tooltipMessage="Only GM or above can correct acquisition data"
            >
              <StepAcquisition />
            </Gate>
          </EditSection>

          {/* Section 2: Vehicle Specs */}
          <EditSection title="Vehicle Specs">
            <VinReadOnlyField vin={vehicle.vin} />
            <StepSpecsWithoutVin />
          </EditSection>

          {/* Section 3: Condition & History */}
          <EditSection title="Condition &amp; History">
            <StepCondition />
          </EditSection>

          {/* Section 4: Pricing */}
          <EditSection title="Pricing">
            <StepPricing />
          </EditSection>

        </main>
      </div>

      {/* ── Toast container ──────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Discard changes confirm dialog ───────────────────────────────────── */}
      <AlertDialog
        open={showDiscard}
        onClose={() => setShowDiscard(false)}
        title="Discard changes?"
        description="Any unsaved edits will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={handleDiscardConfirm}
      />
    </FormProvider>
  );
}
