/**
 * Wizard Step 2 — Pick vehicle (filtered to selected customer's owned vehicles).
 *
 * - Uses selectVehiclesByCustomer() so only customer-linked vehicles appear.
 * - New customer (zero vehicles): shows empty-state with "Link a Car" CTA.
 * - Existing customer: list + "+ Link Another Car" CTA.
 * - Inline "Link a car" sub-form: upsertVehicle + openOwnership + appendEvent.
 *   New VehicleTouchSource: 'CUSTOM_BUILD_LINKED' (L67).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §32 L66, L67
 */

'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Car, Plus, X } from 'lucide-react';
import { cn } from '@dms/ui';
import { normalizeVin, tryNormalizeVin } from '@dms/vehicles-core';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useOutlet } from '@/src/providers/outlet-provider';
import type { WizardData } from './new-build-wizard';

// ─── Link-car form schema ─────────────────────────────────────────────────────

const linkCarSchema = z.object({
  vin: z.string().length(17, 'VIN must be exactly 17 characters'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  year: z
    .string()
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= 1990 && Number(v) <= 2030,
      'Year must be 1990–2030',
    ),
  color: z.string().optional(),
  rcNumber: z.string().optional(),
  km: z
    .string()
    .refine(
      (v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0),
      'Must be a non-negative number',
    ),
});

type LinkCarFormValues = z.infer<typeof linkCarSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OUTLET_MAP = {
  bangalore: 'BLR-01',
  mumbai: 'MUM-01',
  chennai: 'CHE-01',
} as const;

const icls = (err?: boolean) =>
  cn(
    'h-9 w-full rounded-md border bg-bg-subtle px-3 text-[13px] text-ink-primary',
    'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
    'placeholder:text-ink-muted',
    err ? 'border-state-danger' : 'border-line',
  );

const Err = ({ m }: { m?: string }) =>
  m ? <p className="text-[11px] text-state-danger mt-0.5">{m}</p> : null;

const CURRENT_YEAR = new Date().getFullYear();

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardStepVehicle({ data, onUpdate }: Props) {
  const vehiclesState = useVehiclesStore((s) => s.vehicles);
  const selectVehiclesByCustomer = useVehiclesStore((s) => s.selectVehiclesByCustomer);
  const ownershipsState = useVehiclesStore((s) => s.ownerships);
  const { user } = useStaffAuth();
  const { outlet } = useOutlet();

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [vinWarning, setVinWarning] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  // Selector: ownership rows for this customer that are ACTIVE or GRACE
  const now = useMemo(() => new Date().toISOString(), []);

  const ownershipRows = useMemo(() => {
    if (!data.customerId) return [];
    // We need state object — use getState() to access pure selector
    const state = useVehiclesStore.getState();
    return selectVehiclesByCustomer(state, data.customerId, {
      includeGrace: true,
      now,
    });
  }, [data.customerId, selectVehiclesByCustomer, now, ownershipsState, vehiclesState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive VehicleMaster records from ownership rows
  const customerVehicles = useMemo(() => {
    return ownershipRows
      .map((row) => vehiclesState[row.vin])
      .filter(Boolean);
  }, [ownershipRows, vehiclesState]);

  const hasNoVehicles = customerVehicles.length === 0;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<LinkCarFormValues>({
    resolver: zodResolver(linkCarSchema),
    defaultValues: { year: String(CURRENT_YEAR), km: '0' },
  });

  const vinValue = watch('vin');

  // Warn on forbidden chars but don't block — safeVin fallback for legacy demo VINs
  const handleVinChange = (raw: string) => {
    if (/[IOQUZ]/i.test(raw.trim())) {
      setVinWarning(
        'VIN contains a non-standard character (I/O/Q/U/Z). Legacy VINs are accepted via safe-mode, but verify the VIN physically.',
      );
    } else {
      setVinWarning('');
    }
  };

  const handleSelect = (vin: string, label: string) => {
    onUpdate({ ...data, vin, vehicleLabel: label });
  };

  const onLinkCarSubmit = handleSubmit((values) => {
    if (!data.customerId) return;
    setLinkSubmitting(true);
    try {
      const actor = user
        ? { id: user.id, name: user.name, role: user.role }
        : { id: 'staff-system', name: 'Staff', role: 'R09' };

      // safeVin: try strict normalizeVin, fall back to trim+upper for legacy VINs
      let vin: string;
      try {
        vin = normalizeVin(values.vin);
      } catch {
        vin = values.vin.trim().toUpperCase();
      }

      const nowIso = new Date().toISOString();
      const km = values.km ? Number(values.km) : 0;
      // Map outlet slug to outletId string; default to 'BLR-01' if unrecognised
      const outletSlugToId: Record<string, 'BLR-01' | 'MUM-01' | 'CHE-01'> = {
        'bangalore': 'BLR-01',
        'mumbai': 'MUM-01',
        'chennai': 'CHE-01',
      };
      const outletId: 'BLR-01' | 'MUM-01' | 'CHE-01' =
        (outlet && outletSlugToId[outlet]) ?? 'BLR-01';

      const vehiclesStore = useVehiclesStore.getState();

      // Step a: upsertVehicle
      vehiclesStore.upsertVehicle(
        {
          vin,
          make: values.make,
          model: values.model,
          variant: values.variant || undefined,
          year: Number(values.year),
          color: values.color || 'Unknown',
          rcNumber: values.rcNumber || `RC-${vin.slice(-6)}`,
          firstTouchedAt: nowIso,
          firstTouchSource: 'CUSTOM_BUILD_LINKED',
          firstTouchOutletId: outletId,
          lastKnownKm: km,
          lastKnownKmAt: nowIso,
        },
        actor,
      );

      // Step b: openOwnership
      const ownershipId = vehiclesStore.openOwnership(
        {
          vin,
          customerId: data.customerId,
          source: 'CUSTOM_BUILD_LINKED',
          kmAtOpen: km,
          fromAt: nowIso,
        },
        actor,
      );

      // Step c: activity log via appendEvent
      vehiclesStore.appendEvent(
        'OPEN',
        {
          source: 'CUSTOM_BUILD_LINKED',
          linkedFromBuildJobWizard: true,
          kmAtOpen: km,
          customerId: data.customerId,
        },
        actor,
        { vin, ownershipId },
      );

      const label = `${values.year} ${values.make} ${values.model}`;
      onUpdate({
        ...data,
        vin,
        vehicleLabel: label,
        vehicleLinkedDuringWizard: true,
      });

      setShowLinkForm(false);
      reset();
      setVinWarning('');
    } finally {
      setLinkSubmitting(false);
    }
  });

  if (!data.customerId) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] text-ink-muted">Please select a customer first.</p>
      </div>
    );
  }

  const customerLabel = data.customerName || 'Customer';

  return (
    <div className="max-w-xl space-y-4">
      {/* Breadcrumb */}
      <div>
        <p className="text-[12px] text-ink-muted">
          Selected:{' '}
          <span className="font-medium text-ink-secondary">{customerLabel}</span>
          {' · '}
          <span className="text-ink-muted">
            {customerVehicles.length} car{customerVehicles.length !== 1 ? 's' : ''} linked
          </span>
        </p>
        <h2 className="text-[15px] font-semibold text-ink-primary mt-1">Select Vehicle</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">
          {hasNoVehicles
            ? `No vehicles linked to ${customerLabel} yet.`
            : `Vehicles owned by ${customerLabel}.`}
        </p>
      </div>

      {/* ── Empty state (new customer or no linked cars) ──────────────────────── */}
      {hasNoVehicles && !showLinkForm && (
        <div className="rounded-md border border-dashed border-line p-8 text-center space-y-3">
          <Car size={28} className="mx-auto text-ink-muted/50" aria-hidden="true" />
          <p className="text-[13px] text-ink-muted">No vehicles found for this customer.</p>
          <button
            type="button"
            onClick={() => setShowLinkForm(true)}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold',
              'bg-accent text-white hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            )}
          >
            <Plus size={14} aria-hidden="true" />
            Link a Car
          </button>
        </div>
      )}

      {/* ── Vehicle list ─────────────────────────────────────────────────────── */}
      {!hasNoVehicles && !showLinkForm && (
        <>
          <div className="rounded-md border border-line divide-y divide-line max-h-72 overflow-y-auto">
            {customerVehicles.map((v) => {
              if (!v) return null;
              const label = `${v.year} ${v.make} ${v.model}`;
              return (
                <button
                  key={v.vin}
                  type="button"
                  onClick={() => handleSelect(v.vin, label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    data.vin === v.vin ? 'bg-accent/10' : 'hover:bg-bg-hover',
                  )}
                  aria-pressed={data.vin === v.vin}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink-primary">{label}</p>
                    <p className="font-mono text-[10px] text-ink-muted">{v.vin}</p>
                  </div>
                  {data.vin === v.vin && (
                    <Check size={15} className="text-accent shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Link another car CTA */}
          <button
            type="button"
            onClick={() => setShowLinkForm(true)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            <Plus size={13} aria-hidden="true" />
            Link Another Car
          </button>
        </>
      )}

      {/* ── Inline link-car sub-form ──────────────────────────────────────────── */}
      {showLinkForm && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-ink-primary">Link a Car</h3>
            <button
              type="button"
              onClick={() => {
                setShowLinkForm(false);
                reset();
                setVinWarning('');
              }}
              className="p-1 rounded text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close link-car form"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={onLinkCarSubmit} noValidate className="space-y-3">
            {/* VIN */}
            <div className="space-y-1">
              <label htmlFor="lc-vin" className="text-[12px] font-medium text-ink-primary">
                VIN <span className="text-state-danger">*</span>
              </label>
              <input
                id="lc-vin"
                {...register('vin', {
                  onChange: (e) => handleVinChange(e.target.value),
                })}
                className={cn(icls(!!errors.vin), 'font-mono tracking-wide')}
                placeholder="WBA3A5C50DF123456"
                maxLength={17}
              />
              <Err m={errors.vin?.message} />
              {vinWarning && !errors.vin && (
                <p className="text-[11px] text-state-warning">{vinWarning}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label htmlFor="lc-make" className="text-[12px] font-medium text-ink-primary">
                  Make <span className="text-state-danger">*</span>
                </label>
                <input id="lc-make" {...register('make')} className={icls(!!errors.make)} placeholder="BMW" />
                <Err m={errors.make?.message} />
              </div>
              <div className="space-y-1">
                <label htmlFor="lc-model" className="text-[12px] font-medium text-ink-primary">
                  Model <span className="text-state-danger">*</span>
                </label>
                <input id="lc-model" {...register('model')} className={icls(!!errors.model)} placeholder="M3" />
                <Err m={errors.model?.message} />
              </div>
              <div className="space-y-1">
                <label htmlFor="lc-variant" className="text-[12px] font-medium text-ink-primary">
                  Variant
                </label>
                <input id="lc-variant" {...register('variant')} className={icls()} placeholder="Competition" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label htmlFor="lc-year" className="text-[12px] font-medium text-ink-primary">
                  Year <span className="text-state-danger">*</span>
                </label>
                <input
                  id="lc-year"
                  type="number"
                  min={1990}
                  max={2030}
                  {...register('year')}
                  className={icls(!!errors.year)}
                  placeholder={String(CURRENT_YEAR)}
                />
                <Err m={errors.year?.message} />
              </div>
              <div className="space-y-1">
                <label htmlFor="lc-color" className="text-[12px] font-medium text-ink-primary">
                  Color
                </label>
                <input id="lc-color" {...register('color')} className={icls()} placeholder="Frozen Black" />
              </div>
              <div className="space-y-1">
                <label htmlFor="lc-km" className="text-[12px] font-medium text-ink-primary">
                  Current km
                </label>
                <input
                  id="lc-km"
                  type="number"
                  min={0}
                  {...register('km')}
                  className={icls(!!errors.km)}
                  placeholder="0"
                />
                <Err m={errors.km?.message} />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="lc-rc" className="text-[12px] font-medium text-ink-primary">
                RC number <span className="text-[11px] text-ink-muted">(optional — auto-generated from VIN if blank)</span>
              </label>
              <input id="lc-rc" {...register('rcNumber')} className={icls()} placeholder="KA01AB1234" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowLinkForm(false);
                  reset();
                  setVinWarning('');
                }}
                className="h-8 px-3 rounded-md text-[12px] font-medium border border-line text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={linkSubmitting}
                className={cn(
                  'h-8 px-4 rounded-md text-[12px] font-semibold text-white bg-accent hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {linkSubmitting ? 'Linking...' : 'Link Car'}
              </button>
            </div>
          </form>
        </div>
      )}

      {data.vin && (
        <p className="text-[12px] text-[rgb(var(--state-listed))]">
          Selected:{' '}
          <span className="font-medium font-mono">{data.vin}</span>
          {data.vehicleLinkedDuringWizard && (
            <span className="ml-1.5 text-[11px] text-accent">(just linked)</span>
          )}
        </p>
      )}
    </div>
  );
}
