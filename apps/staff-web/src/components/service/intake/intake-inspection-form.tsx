'use client';

/**
 * IntakeInspectionForm — digital intake inspection form.
 *
 * Sections A/B/C/D/E sourced from INTAKE_FIELDS field-definitions (L4).
 * Auto-fills derived fields from vehicles-store + customers-store (Seam 45/46, L10).
 * L4: form iterates field-defs by section; never hand-rolls field lists.
 * L2: calls service-store actions only; does NOT mutate vehicles or customers.
 * L9: soft-warn banner shown if JC is RECEIVED and intake not yet completed.
 *
 * SPEC-ARCH-UI-001:
 *   - Card + Field from custom-builds/shared/detail-card (§3.1)
 *   - Gate for RBAC (§3.10 / L49)
 *   - No text-[NNpx], no large radii (rounded-md only)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Info } from 'lucide-react';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { Gate } from '@/src/components/primitives/gate';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import {
  buildIntakeFormSchema,
  getFieldsBySection,
  IntakePhotoSlotEnum,
} from '@/src/lib/service/intake/field-definitions';
import { DamageCalloutsEditor } from './damage-callouts-editor';
import { IntakePhotosGrid } from './intake-photos-grid';
import { SignaturePad } from './signature-pad';
import type { IntakeFormValues } from '@/src/lib/service/intake/field-definitions';
import type { DamageCalloutDraft } from '@/src/components/service/intake/damage-callouts-editor';
import type {
  IntakePhotoSlot,
  IntakeDamageCallout,
  IntakeInspectionPhoto,
} from '@dms/types';

// Stable empty arrays for derived selectors below — fresh `[]` literals
// returned from a Zustand selector trigger infinite re-renders
// (CLAUDE.md §17 #14, enforced by zustand-selector-anti-patterns.test.ts).
const EMPTY_CALLOUTS: IntakeDamageCallout[] = [];
const EMPTY_PHOTOS: IntakeInspectionPhoto[] = [];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IntakeInspectionFormProps {
  jobCardId: string;
  existingIntakeId?: string;
  onComplete: (intakeId: string) => void;
  onCancel: () => void;
}

// ── Section heading map ────────────────────────────────────────────────────────

const SECTION_TITLES = {
  A: 'Section A — Vehicle Identification',
  B: 'Section B — Body Damage',
  C: 'Section C — Inventory Checklist',
  D: 'Section D — Functional Checks',
  E: 'Section E — Signatures',
};

// ── Fuel level options (from field-defs) ──────────────────────────────────────

const FUEL_LEVELS = ['EMPTY', 'Q1', 'Q2', 'Q3', 'FULL'] as const;
const FUEL_LABELS: Record<string, string> = {
  EMPTY: 'Empty', Q1: '1/4', Q2: '1/2', Q3: '3/4', FULL: 'Full',
};

const PRESENCE_OPTIONS = ['NOT_VERIFIED', 'PRESENT', 'ABSENT'] as const;
const PRESENCE_LABELS: Record<string, string> = {
  NOT_VERIFIED: 'Not Verified', PRESENT: 'Present', ABSENT: 'Absent',
};

const KEY_COUNT_OPTIONS = ['1', '2', '3+'] as const;
const KEY_TYPE_OPTIONS = ['SMART_ONLY', 'SMART_PLUS_VALET', 'BOTH', 'NA'] as const;
const KEY_TYPE_LABELS: Record<string, string> = {
  SMART_ONLY: 'Smart Only', SMART_PLUS_VALET: 'Smart + Valet', BOTH: 'Both', NA: 'N/A',
};

const BATTERY_OPTIONS = ['OK', 'LOW', 'DEAD', 'NOT_TESTED'] as const;
const TYRE_COND_OPTIONS = ['GOOD', 'WORN', 'DAMAGED'] as const;
const TYRE_POSITIONS = ['FL', 'FR', 'RL', 'RR'] as const;
const TYRE_LABELS: Record<string, string> = {
  FL: 'Front Left', FR: 'Front Right', RL: 'Rear Left', RR: 'Rear Right',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function IntakeInspectionForm({
  jobCardId,
  existingIntakeId,
  onComplete,
  onCancel,
}: IntakeInspectionFormProps) {
  const t = useTranslations('serviceIntake');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // ── Store selectors ────────────────────────────────────────────────────────
  const jobCard = useServiceStore((s) => s.jobCards.find((jc) => jc.id === jobCardId));
  const existingIntake = useServiceStore((s) =>
    existingIntakeId ? s.intakeInspections.find((i) => i.id === existingIntakeId) : undefined,
  );
  // Read base array refs from the store — DO NOT call `.filter()`-based
  // selector functions inside useStore, since they return a fresh array
  // each render → infinite re-render. Filter in useMemo below instead.
  const allCallouts = useServiceStore((s) => s.intakeDamageCallouts);
  const allPhotos   = useServiceStore((s) => s.intakeInspectionPhotos);
  const intakeCallouts = useMemo(
    () =>
      existingIntakeId
        ? allCallouts.filter((c) => c.intakeInspectionId === existingIntakeId)
        : EMPTY_CALLOUTS,
    [allCallouts, existingIntakeId],
  );
  const intakePhotos = useMemo(
    () =>
      existingIntakeId
        ? allPhotos.filter((p) => p.intakeInspectionId === existingIntakeId)
        : EMPTY_PHOTOS,
    [allPhotos, existingIntakeId],
  );

  // Seam 46 — Service Intake → Vehicles (READ, L10). NEVER stored.
  const vehicle = useVehiclesStore((s) =>
    jobCard?.vin ? s.vehicles[jobCard.vin] : undefined,
  );

  // Seam 45 — Service Intake → Customers (READ, L10). NEVER stored.
  const customer = useCustomersStore((s) =>
    jobCard?.customerId ? s.customers[jobCard.customerId] : undefined,
  );

  const recordIntakeInspection = useServiceStore((s) => s.recordIntakeInspection);
  const captureCustomerSignature = useServiceStore((s) => s.captureCustomerSignature);
  const addDamageCallout = useServiceStore((s) => s.addDamageCallout);
  const removeDamageCallout = useServiceStore((s) => s.removeDamageCallout);
  const addIntakePhoto = useServiceStore((s) => s.addIntakePhoto);

  // ── Local state ────────────────────────────────────────────────────────────
  const [currentIntakeId, setCurrentIntakeId] = useState<string | undefined>(existingIntakeId);
  const [customerSigDataUrl, setCustomerSigDataUrl] = useState('');
  const [saSigDataUrl, setSaSigDataUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Form setup ─────────────────────────────────────────────────────────────
  const schema = buildIntakeFormSchema();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      regNumber: jobCard?.vin ? `KA01-XX-${jobCard.vin.slice(-4)}` : '',
      odometerKm: jobCard?.odometerIn ?? 0,
      fuelLevel: 'Q2',
      spareTyrePresent: true,
      toolKitPresent: true,
      keyCount: '2',
      keyType: 'SMART_ONLY',
      serviceBookPresent: false,
      rcInVehicle: 'NOT_VERIFIED',
      insuranceCertInVehicle: 'NOT_VERIFIED',
      cabinAccessoriesNote: '',
      battery12VCondition: 'NOT_TESTED',
      tyreCondition: { FL: 'GOOD', FR: 'GOOD', RL: 'GOOD', RR: 'GOOD' },
      acFunctional: true,
      wipersFunctional: true,
      lightsFunctional: true,
      infotainmentFunctional: true,
      dashboardWarningLightsNote: '',
      saSignatureDataUrl: '',
      saSignedAt: new Date().toISOString(),
      nextActionNoteForWorkshop: '',
    },
  });

  // Track dirty state for soft-warn on navigate
  useEffect(() => {
    const subscription = watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [watch]);

  // Warn on browser navigate away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Damage callout handlers ────────────────────────────────────────────────
  const handleAddCallout = useCallback((draft: DamageCalloutDraft) => {
    if (!currentIntakeId) {
      toast('Please save the form first before adding damage callouts', 'warning');
      return;
    }
    addDamageCallout(currentIntakeId, {
      view: draft.view,
      locationText: draft.locationText,
      code: draft.code,
      severity: draft.severity,
      observedAt: new Date().toISOString(),
    }, { id: user?.id ?? 'unknown', name: user?.name ?? 'SA' });
  }, [currentIntakeId, addDamageCallout, user, toast]);

  const handleRemoveCallout = useCallback((calloutId: string) => {
    removeDamageCallout(calloutId, { id: user?.id ?? 'unknown', name: user?.name ?? 'SA' });
  }, [removeDamageCallout, user]);

  // ── Photo capture handler ──────────────────────────────────────────────────
  const handlePhotoCapture = useCallback((slot: IntakePhotoSlot, dataUrl: string) => {
    if (!currentIntakeId) {
      toast('Please save the form first before adding photos', 'warning');
      return;
    }
    const result = addIntakePhoto(
      currentIntakeId,
      dataUrl,
      slot,
      { id: user?.id ?? 'unknown', name: user?.name ?? 'SA', role: user?.role ?? 'R09' },
    );
    if (result?.ok === false) {
      if (result.error === 'PHOTO_TOO_LARGE') toast(t('errors.photoOver1MB'), 'error');
    }
  }, [currentIntakeId, addIntakePhoto, user, toast, t]);

  // ── Submit handler ─────────────────────────────────────────────────────────
  const onSubmit = useCallback(async (values: IntakeFormValues) => {
    if (!saSigDataUrl) {
      toast('Service Advisor signature is required before saving', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const actor = {
        id: user?.id ?? 'staff-r09-001',
        name: user?.name ?? 'Service Advisor',
        role: user?.role ?? 'R09',
      };

      const now = new Date().toISOString();

      // L4: derived fields are NOT stored on IntakeInspection — they are
      // resolved at render time from vehicles-store / customers-store (§8.4).
      const intakeId = recordIntakeInspection(
        {
          jobCardId,
          outletId: jobCard?.outletId ?? 'BLR-01',
          inspectionAt: now,
          regNumber: values.regNumber,
          odometerKm: values.odometerKm,
          fuelLevel: values.fuelLevel,
          // Section C
          spareTyrePresent: values.spareTyrePresent,
          toolKitPresent: values.toolKitPresent,
          keyCount: values.keyCount,
          keyType: values.keyType,
          serviceBookPresent: values.serviceBookPresent,
          rcInVehicle: values.rcInVehicle,
          insuranceCertInVehicle: values.insuranceCertInVehicle,
          cabinAccessoriesNote: values.cabinAccessoriesNote,
          // Section D
          battery12VCondition: values.battery12VCondition,
          tyreCondition: values.tyreCondition,
          acFunctional: values.acFunctional,
          wipersFunctional: values.wipersFunctional,
          lightsFunctional: values.lightsFunctional,
          infotainmentFunctional: values.infotainmentFunctional,
          dashboardWarningLightsNote: values.dashboardWarningLightsNote,
          // Section B
          damageCalloutIds: [],
          // Section E — SA sig
          saName: actor.name,
          saEmployeeId: actor.id,
          saSignatureDataUrl: saSigDataUrl,
          saSignedAt: now,
          // DMS-only
          nextActionNoteForWorkshop: values.nextActionNoteForWorkshop,
        },
        actor,
      );

      setCurrentIntakeId(intakeId);
      setIsDirty(false);
      toast(t('toasts.recorded'), 'success');

      // If customer already signed (re-entry flow), complete immediately
      if (customerSigDataUrl) {
        captureCustomerSignature(intakeId, customerSigDataUrl, actor);
        toast(t('toasts.signed'), 'success');
      }

      onComplete(intakeId);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save intake', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    saSigDataUrl, customerSigDataUrl, user, jobCard, vehicle, jobCardId,
    recordIntakeInspection, captureCustomerSignature, onComplete, toast, t,
  ]);

  // ── Capture customer signature ─────────────────────────────────────────────
  const handleCustomerSig = useCallback((dataUrl: string) => {
    setCustomerSigDataUrl(dataUrl);
    if (currentIntakeId) {
      captureCustomerSignature(
        currentIntakeId,
        dataUrl,
        { id: user?.id ?? 'unknown', name: user?.name ?? 'SA', role: user?.role ?? 'R09' },
      );
      toast(t('toasts.signed'), 'success');
    }
  }, [currentIntakeId, captureCustomerSignature, user, toast, t]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!jobCard) {
    return (
      <div className="p-6 text-sm text-ink-muted" role="alert">
        Job card not found.
      </div>
    );
  }

  // L9: derived fields shown as read-only (§8.4 — not editable on intake form)
  const derivedVehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model} — ${vehicle.color ?? '—'}`
    : jobCard.vin;
  const customerName = customer?.name ?? jobCard.customerId;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Dirty-state warning banner */}
      {isDirty && !currentIntakeId && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-pending)/0.08)] border border-[rgb(var(--state-pending)/0.3)]" role="alert">
          <Info size={18} className="text-[rgb(var(--state-pending))] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink-primary">Unsaved changes</p>
            <p className="text-xs text-ink-secondary mt-0.5">Submit or cancel to avoid losing your work.</p>
          </div>
        </div>
      )}

      <form
        id="intake-inspection-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Vehicle Intake Inspection Form"
      >
        {/* ── Section A — Vehicle Ident ────────────────────────────────── */}
        <div className="space-y-6">
          <Card title={SECTION_TITLES.A}>
            {/* Derived fields (read-only — §8.4) */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
              {/* L4/§8.4: derived from vehicle-store via Seam 46 */}
              <Field label="VIN" value={
                <span className="font-mono text-xs">{vehicle?.vin ?? jobCard.vin}</span>
              } />
              <Field label="Vehicle" value={derivedVehicleLabel} />
              {/* L4/§8.4: derived from customer-store via Seam 45 */}
              <Field label="Customer" value={customerName} />
              <Field label="Outlet" value={jobCard.outletId} />
            </dl>

            {/* User-editable Section A fields */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Registration number */}
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="regNumber" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Registration Number <span className="text-state-danger">*</span>
                </label>
                <input
                  id="regNumber"
                  type="text"
                  {...register('regNumber')}
                  placeholder="KA01-XX-1234"
                  className={`h-10 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 ${errors.regNumber ? 'border-state-danger' : 'border-line'}`}
                  aria-describedby={errors.regNumber ? 'regNumber-error' : undefined}
                />
                {errors.regNumber && (
                  <p id="regNumber-error" className="text-xs text-state-danger mt-1">{errors.regNumber.message}</p>
                )}
              </div>

              {/* Odometer */}
              <div>
                <label htmlFor="odometerKm" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Odometer (km) <span className="text-state-danger">*</span>
                </label>
                <input
                  id="odometerKm"
                  type="number"
                  min={0}
                  max={9_999_999}
                  {...register('odometerKm', { valueAsNumber: true })}
                  className={`h-10 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-mono tabular-nums ${errors.odometerKm ? 'border-state-danger' : 'border-line'}`}
                  aria-describedby={errors.odometerKm ? 'odometer-error' : undefined}
                />
                {errors.odometerKm && (
                  <p id="odometer-error" className="text-xs text-state-danger mt-1">{errors.odometerKm.message}</p>
                )}
              </div>

              {/* Fuel level */}
              <div>
                <label htmlFor="fuelLevel" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Fuel Level <span className="text-state-danger">*</span>
                </label>
                <select
                  id="fuelLevel"
                  {...register('fuelLevel')}
                  className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                >
                  {FUEL_LEVELS.map((f) => (
                    <option key={f} value={f}>{FUEL_LABELS[f]}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* ── Section B — Body Damage ──────────────────────────────────── */}
          <DamageCalloutsEditor
            callouts={intakeCallouts}
            onAdd={handleAddCallout}
            onRemove={handleRemoveCallout}
            disabled={!!existingIntake && existingIntake.state === 'COMPLETED'}
          />

          {/* Photos grid — L5 */}
          <IntakePhotosGrid
            photos={intakePhotos}
            onCapture={handlePhotoCapture}
            disabled={!!existingIntake && existingIntake.state === 'COMPLETED'}
          />

          {/* ── Section C — Inventory ────────────────────────────────────── */}
          <Card title={SECTION_TITLES.C}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Boolean checkboxes */}
              {(['spareTyrePresent', 'toolKitPresent', 'serviceBookPresent'] as const).map((key) => {
                const labels: Record<string, string> = {
                  spareTyrePresent: 'Spare Tyre Present',
                  toolKitPresent: 'Tool Kit Present',
                  serviceBookPresent: 'Service Book Present',
                };
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      id={key}
                      type="checkbox"
                      {...register(key)}
                      className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                    />
                    <label htmlFor={key} className="text-sm text-ink-primary">{labels[key]}</label>
                  </div>
                );
              })}

              {/* Key count */}
              <div>
                <label htmlFor="keyCount" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Number of Keys
                </label>
                <select id="keyCount" {...register('keyCount')} className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30">
                  {KEY_COUNT_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* Key type */}
              <div>
                <label htmlFor="keyType" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Key Type
                </label>
                <select id="keyType" {...register('keyType')} className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30">
                  {KEY_TYPE_OPTIONS.map((k) => <option key={k} value={k}>{KEY_TYPE_LABELS[k]}</option>)}
                </select>
              </div>

              {/* RC in vehicle — tri-state per MV Act §130 (Sec wave-2 #9) */}
              <div>
                <label htmlFor="rcInVehicle" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  RC in Vehicle (MV Act §130)
                </label>
                <select id="rcInVehicle" {...register('rcInVehicle')} className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30">
                  {PRESENCE_OPTIONS.map((p) => <option key={p} value={p}>{PRESENCE_LABELS[p]}</option>)}
                </select>
              </div>

              {/* Insurance cert — tri-state per MV Act §145 (Sec wave-2 #9) */}
              <div>
                <label htmlFor="insuranceCertInVehicle" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Insurance Cert (MV Act §145)
                </label>
                <select id="insuranceCertInVehicle" {...register('insuranceCertInVehicle')} className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30">
                  {PRESENCE_OPTIONS.map((p) => <option key={p} value={p}>{PRESENCE_LABELS[p]}</option>)}
                </select>
              </div>

              {/* Cabin accessories note */}
              <div className="col-span-2">
                <label htmlFor="cabinAccessoriesNote" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Cabin Accessories Note
                </label>
                <textarea
                  id="cabinAccessoriesNote"
                  {...register('cabinAccessoriesNote')}
                  rows={2}
                  maxLength={200}
                  className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                  placeholder="e.g. dash cam, child seat, boot organiser…"
                />
              </div>
            </div>
          </Card>

          {/* ── Section D — Functional Checks ───────────────────────────── */}
          <Card title={SECTION_TITLES.D}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Boolean functional checks */}
              {(['acFunctional', 'wipersFunctional', 'lightsFunctional', 'infotainmentFunctional'] as const).map((key) => {
                const labels: Record<string, string> = {
                  acFunctional: 'Air Conditioning Functional',
                  wipersFunctional: 'Wipers Functional',
                  lightsFunctional: 'Lights Functional',
                  infotainmentFunctional: 'Infotainment Functional',
                };
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      id={key}
                      type="checkbox"
                      {...register(key)}
                      className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                    />
                    <label htmlFor={key} className="text-sm text-ink-primary">{labels[key]}</label>
                  </div>
                );
              })}

              {/* Battery condition */}
              <div>
                <label htmlFor="battery12VCondition" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  12V Battery Condition
                </label>
                <select id="battery12VCondition" {...register('battery12VCondition')} className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30">
                  {BATTERY_OPTIONS.map((b) => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
                </select>
              </div>

              {/* Tyre condition per wheel */}
              {TYRE_POSITIONS.map((pos) => (
                <div key={pos}>
                  <label htmlFor={`tyre-${pos}`} className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                    {TYRE_LABELS[pos]} Tyre
                  </label>
                  <select
                    id={`tyre-${pos}`}
                    {...register(`tyreCondition.${pos}` as `tyreCondition.FL`)}
                    className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  >
                    {TYRE_COND_OPTIONS.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
                  </select>
                </div>
              ))}

              {/* Dashboard warning lights note */}
              <div className="col-span-2">
                <label htmlFor="dashboardWarningLightsNote" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Dashboard Warning Lights Note
                </label>
                <textarea
                  id="dashboardWarningLightsNote"
                  {...register('dashboardWarningLightsNote')}
                  rows={2}
                  maxLength={200}
                  className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                  placeholder="Note any illuminated warning lights…"
                />
              </div>

              {/* DMS-only: Workshop action note (never on customer copy) */}
              <div className="col-span-2">
                <label htmlFor="nextActionNoteForWorkshop" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                  Workshop Action Note <span className="text-ink-muted normal-case">(internal only)</span>
                </label>
                <textarea
                  id="nextActionNoteForWorkshop"
                  {...register('nextActionNoteForWorkshop')}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                  placeholder="Internal note for workshop team — not shown to customer"
                />
              </div>
            </div>
          </Card>

          {/* ── Section E — Signatures ───────────────────────────────────── */}
          <Card title={SECTION_TITLES.E}>
            {/* L11: Customer signature — pii_sensitivity:medium; gated to R09/R19+ */}
            {/* Customer signature shown to authorised roles only (Gate handles fallback) */}
            <Gate role={['R09', 'R03', 'R19', 'R24']} fallback="hide">
              <div className="mb-6">
                <SignaturePad
                  label={`Customer Signature — ${customerName}`}
                  onSign={handleCustomerSig}
                  onClear={() => setCustomerSigDataUrl('')}
                />
              </div>
            </Gate>

            {/* SA signature — always required */}
            <div>
              <SignaturePad
                label={`Service Advisor Signature — ${user?.name ?? 'SA'}`}
                onSign={(dataUrl) => {
                  setSaSigDataUrl(dataUrl);
                  // Sync to form state
                  reset((vals) => ({
                    ...vals,
                    saSignatureDataUrl: dataUrl,
                    saSignedAt: new Date().toISOString(),
                  }));
                }}
              />
              {!saSigDataUrl && (
                <p className="text-xs text-state-danger mt-1" role="alert">
                  Service Advisor signature is required
                </p>
              )}
            </div>

            {/* DPDP consent notice (L11 / L12) */}
            <div className="mt-6 p-4 rounded-md bg-bg-subtle border border-line">
              <p className="text-xs text-ink-muted leading-relaxed">
                {t('consent.text').slice(0, 280)}…
                <button
                  type="button"
                  onClick={() => toast(t('consent.text'), 'info', 12000)}
                  className="ml-1 text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                >
                  Read full notice
                </button>
              </p>
            </div>
          </Card>
        </div>

        {/* ── Form actions ──────────────────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <Gate role={['R09', 'R03', 'R19', 'R24']} fallback="disable">
            <button
              type="submit"
              form="intake-inspection-form"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {isSubmitting ? 'Saving…' : currentIntakeId ? 'Update Intake' : 'Save Intake'}
            </button>
          </Gate>
        </div>
      </form>
    </div>
  );
}
