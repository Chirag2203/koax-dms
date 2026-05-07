'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@dms/ui';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { serviceTypes } from '@dms/mocks/fixtures';
import { normalizeVin, VinError } from '@dms/vehicles-core';
import { VehicleIntakeDialog } from '@/src/components/vehicles/detail/dialogs/vehicle-intake-dialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADVISOR_OPTIONS = [
  { id: 'staff-r09-001', name: 'Priya Sharma' },
  { id: 'staff-r09-002', name: 'Rajesh Kumar' },
  { id: 'staff-r09-003', name: 'Deepa Nair' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW',    label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH',   label: 'High' },
  { value: 'VIP',    label: 'VIP' },
] as const;

const OUTLET_OPTIONS = [
  { id: 'BLR-01', name: 'Bangalore' },
  { id: 'MUM-01', name: 'Mumbai' },
  { id: 'CHE-01', name: 'Chennai' },
];

// Stable empty-array references for store selectors below. Returning a
// fresh `[]` literal from a Zustand selector triggers infinite re-renders
// (CLAUDE.md §17 #14, enforced by zustand-selector-anti-patterns.test.ts).
const EMPTY_OWNERSHIP_IDS: readonly string[] = [];

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  customerType: z.enum(['walkin', 'existing']),
  // Walk-in fields
  walkinName:  z.string().optional(),
  walkinPhone: z.string().optional(),
  walkinEmail: z.string().email().optional().or(z.literal('')),
  // Existing customer
  customerId: z.string().optional(),
  // Vehicle
  vin:       z.string().min(1, 'VIN is required'),
  year:      z.string().optional(),
  make:      z.string().optional(),
  model:     z.string().optional(),
  odometerIn: z.coerce.number().min(0, 'Odometer must be >= 0'),
  // Service protocol
  customerComplaint: z.string().min(10, 'Minimum 10 characters'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'VIP']),
  serviceTypeIds: z.array(z.string()).min(1, 'Select at least one service type'),
  /**
   * Free-text "Describe the issue" — required only when the catch-all
   * "Other" service type is selected (per SPEC-SERVICE-001 §6.3 / L_S6).
   * Validated via superRefine below.
   */
  otherDescription: z.string().optional(),
  initialNotes: z.string().optional(),
  // Bay & advisor
  bayId:     z.string().optional(),
  advisorId: z.string().min(1, 'Advisor is required'),
  outletId:  z.string().min(1, 'Outlet is required'),
  promisedDate: z.string().min(1, 'Date is required'),
  promisedTime: z.string().min(1, 'Time is required'),
}).superRefine((data, ctx) => {
  if (data.customerType === 'walkin') {
    if (!data.walkinName || data.walkinName.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['walkinName'], message: 'Name is required' });
    }
    if (!data.walkinPhone || !/^\d{10}$/.test(data.walkinPhone)) {
      ctx.addIssue({ code: 'custom', path: ['walkinPhone'], message: 'Valid 10-digit phone required' });
    }
  }
  if (data.customerType === 'existing' && !data.customerId) {
    ctx.addIssue({ code: 'custom', path: ['customerId'], message: 'Select a customer' });
  }
  // "Other" service type requires a description (per SPEC-SERVICE-001 §6.3)
  if (
    data.serviceTypeIds.includes('other') &&
    (!data.otherDescription || data.otherDescription.trim().length < 10)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['otherDescription'],
      message: 'Describe the issue (at least 10 characters)',
    });
  }
  // promisedAt >= today
  if (data.promisedDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promised = new Date(data.promisedDate);
    if (promised < today) {
      ctx.addIssue({ code: 'custom', path: ['promisedDate'], message: 'Promised date must be today or later' });
    }
  }
});

type FormValues = z.infer<typeof schema>;

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary mb-5">{title}</h2>
      {children}
    </div>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  helperText,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-wide text-ink-muted block">
        {label}{required && <span className="text-ink-muted ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-state-danger">{error}</p>}
      {!error && helperText && <p className="text-xs text-ink-muted">{helperText}</p>}
    </div>
  );
}

const INPUT_CLASS = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
);

const SELECT_CLASS = cn(INPUT_CLASS, 'cursor-pointer');

// ─── Component ────────────────────────────────────────────────────────────────

export function NewJobCardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const bayParam          = searchParams.get('bay') ?? '';
  const appointmentIdParam = searchParams.get('appointmentId') ?? '';

  const bays      = useServiceStore((s) => s.bays);
  const jobCards  = useServiceStore((s) => s.jobCards);
  const appointments = useServiceStore((s) => s.appointments);
  const createJobCard = useServiceStore((s) => s.createJobCard);
  const assignBay     = useServiceStore((s) => s.assignBay);

  // ── Cross-store reads (Seam 48 — Service JC creation → Customers READ;
  //    Seam 49 — Service JC creation → Vehicles ownership READ).
  //    Read-only — never mutated from this surface. Per SPEC-SERVICE-001 §6.3.
  const customersById        = useCustomersStore((s) => s.customers);
  const ownerships           = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);
  const vehiclesByVin        = useVehiclesStore((s) => s.vehicles);

  // ── Vehicle intake dialog state (1A cross-store wiring) ───────────────────
  const [intakeDialogVin, setIntakeDialogVin] = useState<string | null>(null);
  // Pending JC data to create after intake dialog confirms
  const [pendingJcData, setPendingJcData] = useState<{
    vin: string; customerId: string; outletId: string; advisorId: string;
    technicianIds: string[]; bayId?: string; priority: 'LOW' | 'NORMAL' | 'HIGH' | 'VIP';
    promisedAt: string; customerComplaint: string; diagnosticNotes?: string;
    odometerIn: number; estimatedTotal: number; attachments: string[];
  } | null>(null);

  const freeBays = useMemo(() => bays.filter((b) => b.status === 'FREE'), [bays]);

  // If ?appointmentId present, pre-fill from appointment
  const linkedAppointment = useMemo(
    () => appointmentIdParam ? appointments.find((a) => a.id === appointmentIdParam) : undefined,
    [appointments, appointmentIdParam],
  );

  // Estimated duration from selected service types
  const allServiceTypes = serviceTypes;

  const todayStr = new Date().toISOString().split('T')[0]!;

  // Pre-select bay from query param
  const preselectedBayId = useMemo(
    () => {
      if (!bayParam) return '';
      const found = bays.find((b) => b.code === bayParam || b.id === bayParam);
      return found?.id ?? '';
    },
    [bays, bayParam],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerType: 'walkin',
      priority: 'NORMAL',
      serviceTypeIds: [],
      bayId: preselectedBayId,
      advisorId: '',
      outletId: 'BLR-01',
      promisedDate: todayStr,
      promisedTime: '18:00',
      odometerIn: 0,
    },
  });

  // Pre-fill from appointment if present
  useEffect(() => {
    if (linkedAppointment) {
      setValue('vin', linkedAppointment.vin ?? '');
      setValue('customerId', linkedAppointment.customerId);
      setValue('advisorId', linkedAppointment.advisorId ?? '');
      if (linkedAppointment.bayId) setValue('bayId', linkedAppointment.bayId);
    }
  }, [linkedAppointment, setValue]);

  const customerType     = watch('customerType');
  const selectedCustomerId = watch('customerId') ?? '';
  const selectedTypeIds  = watch('serviceTypeIds');

  /** Existing customers, alphabetised. Sourced from customers-store via Seam 48. */
  const customerOptions = useMemo(() => {
    return Object.values(customersById)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customersById]);

  /**
   * Vehicles owned by the selected existing customer (ACTIVE ownerships only).
   * Resolved through the `ownershipIdByCustomer` index → `ownerships` →
   * `vehicles` join (Seam 49). Empty array when walk-in or no customer
   * selected.
   */
  const customerVehicles = useMemo(() => {
    if (customerType !== 'existing' || !selectedCustomerId) return [];
    const ownershipIds = ownershipIdByCustomer[selectedCustomerId] ?? EMPTY_OWNERSHIP_IDS;
    return ownershipIds
      .map((oid) => ownerships[oid])
      .filter((o) => o && o.state === 'ACTIVE')
      .map((o) => {
        const v = vehiclesByVin[o!.vin];
        return {
          vin: o!.vin,
          year: v?.year,
          make: v?.make,
          model: v?.model,
          variant: v?.variant,
          // Display label for the dropdown — informative without overflow
          label: v
            ? `${v.year ?? '—'} ${v.make ?? ''} ${v.model ?? ''}${v.variant ? ` ${v.variant}` : ''} · ${o!.vin}`
            : o!.vin,
        };
      });
  }, [customerType, selectedCustomerId, ownershipIdByCustomer, ownerships, vehiclesByVin]);

  /**
   * When the existing-customer VIN dropdown selection changes, auto-fill
   * year/make/model from the vehicles-store record so the SA doesn't
   * re-type known data. Per SPEC-SERVICE-001 §6.3 / Seam 49.
   */
  const handleExistingVinSelect = useCallback((vin: string) => {
    setValue('vin', vin, { shouldValidate: true });
    if (!vin) return;
    const match = customerVehicles.find((v) => v.vin === vin);
    if (!match) return;
    if (match.year != null) setValue('year', String(match.year));
    if (match.make) setValue('make', match.make);
    if (match.model) setValue('model', match.model);
  }, [customerVehicles, setValue]);

  /** Clear VIN auto-fills when the selected customer changes. */
  useEffect(() => {
    if (customerType === 'existing' && !linkedAppointment) {
      setValue('vin', '');
      setValue('year', '');
      setValue('make', '');
      setValue('model', '');
    }
    // intentional dep on selectedCustomerId only — clears on each switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId, customerType]);

  const estimatedHours = useMemo(() => {
    return selectedTypeIds.reduce((sum, id) => {
      const st = allServiceTypes.find((s) => s.id === id);
      return sum + (st?.durationHours ?? 0);
    }, 0);
  }, [selectedTypeIds, allServiceTypes]);

  const actorId = user?.id ?? 'unknown';
  const actorName = user?.name ?? 'Unknown';

  // ── After intake dialog confirms, open ownership + create JC ─────────────────
  const handleIntakeConfirm = useCallback(() => {
    if (!pendingJcData) return;
    const actor = { id: actorId, name: actorName };
    const vehiclesStore = useVehiclesStore.getState();

    // Open ownership for walk-in (intake dialog already upserted the vehicle)
    try {
      vehiclesStore.openOwnership({
        vin: pendingJcData.vin,
        customerId: pendingJcData.customerId,
        source: 'SERVICE_ONLY_WALKIN',
        kmAtOpen: pendingJcData.odometerIn,
      }, actor);
    } catch {
      // Vehicle may already have an ACTIVE ownership — proceed to create JC anyway
    }

    const jc = createJobCard(pendingJcData, actor);
    if (pendingJcData.bayId) assignBay(pendingJcData.bayId, jc.id, actor);

    toast('Vehicle auto-registered · first BN touch recorded', 'success');
    setPendingJcData(null);
    setIntakeDialogVin(null);
    // W4-B.2: ?openIntake=1 triggers intake panel auto-open on JC detail (spec §15 Q7).
    router.push(`/service/jobcards/${jc.id}?openIntake=1`);
  }, [pendingJcData, actorId, actorName, createJobCard, assignBay, toast, router]);

  const onSubmit = handleSubmit(async (data) => {
    const actor = { id: actorId, name: actorName };
    const promisedAt = `${data.promisedDate}T${data.promisedTime}:00`;
    const effectiveCustomerId =
      data.customerType === 'existing' && data.customerId
        ? data.customerId
        : data.walkinName ?? 'Walk-in';

    // ── 1A: Normalize VIN and check vehicles store ──────────────────────────
    let normalizedVin = data.vin;
    try {
      normalizedVin = normalizeVin(data.vin);
    } catch (e) {
      if (e instanceof VinError) {
        // Non-standard VIN (e.g. test data) — proceed without normalization
      }
    }

    const vehiclesStore = useVehiclesStore.getState();
    const vehicleExists = Boolean(vehiclesStore.vehicles[normalizedVin]);

    // Fold the "Other" description into diagnosticNotes so the workshop sees
    // the customer's stated concern alongside any additional internal notes.
    // Per SPEC-SERVICE-001 §6.3 (L_S6).
    const composedNotes = (() => {
      const parts: string[] = [];
      if (data.serviceTypeIds.includes('other') && data.otherDescription?.trim()) {
        parts.push(`Other — customer concern:\n${data.otherDescription.trim()}`);
      }
      if (data.initialNotes?.trim()) {
        parts.push(data.initialNotes.trim());
      }
      return parts.length > 0 ? parts.join('\n\n') : undefined;
    })();

    const jcPayload = {
      vin: normalizedVin,
      customerId: effectiveCustomerId,
      outletId: data.outletId,
      advisorId: data.advisorId,
      technicianIds: [] as string[],
      bayId: data.bayId || undefined,
      priority: data.priority,
      promisedAt,
      customerComplaint: data.customerComplaint,
      diagnosticNotes: composedNotes,
      odometerIn: data.odometerIn,
      estimatedTotal: 0,
      attachments: [] as string[],
    };

    if (!vehicleExists) {
      // Unknown VIN — first upsert a skeleton vehicle record, then show intake dialog
      vehiclesStore.upsertVehicle({
        vin: normalizedVin,
        make: data.make ?? '',
        model: data.model ?? '',
        year: Number(data.year) || new Date().getFullYear(),
        variant: undefined,
        color: '',
        rcNumber: '',
        firstTouchedAt: new Date().toISOString(),
        firstTouchSource: 'SERVICE_ONLY_WALKIN',
        firstTouchOutletId: (data.outletId as 'BLR-01' | 'MUM-01' | 'CHE-01') ?? 'BLR-01',
        lastKnownKm: data.odometerIn,
        lastKnownKmAt: new Date().toISOString(),
      }, actor);

      // Store pending JC data and open intake dialog to complete vehicle metadata
      setPendingJcData(jcPayload);
      setIntakeDialogVin(normalizedVin);
      return; // Wait for dialog confirm
    }

    // Known VIN — proceed directly
    const jc = createJobCard(jcPayload, actor);
    if (data.bayId) assignBay(data.bayId, jc.id, actor);
    toast(`Job card ${jc.jobNo} created`, 'success');
    // W4-B.2: ?openIntake=1 triggers intake panel auto-open on JC detail (spec §15 Q7).
    router.push(`/service/jobcards/${jc.id}?openIntake=1`);
  });

  const fromAppointment = !!linkedAppointment;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Vehicle intake dialog — opens when a walk-in JC is created for an unknown VIN */}
      {intakeDialogVin && (
        <VehicleIntakeDialog
          open={Boolean(intakeDialogVin)}
          onClose={() => { setIntakeDialogVin(null); setPendingJcData(null); }}
          vin={intakeDialogVin}
          onConfirm={handleIntakeConfirm}
        />
      )}

      <div className="px-6 py-5 max-w-[900px] mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
          <Link href="/service" className="hover:text-ink-primary transition-colors">Service</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/service?tab=jobcards" className="hover:text-ink-primary transition-colors">Job Cards</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-ink-primary font-medium">New</span>
        </nav>

        <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">New Job Card</h1>

        {fromAppointment && (
          <div className="flex items-center gap-2 rounded-md bg-bg-subtle border border-line px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-hover text-ink-muted px-1.5 py-0.5 rounded">
              From appointment
            </span>
            <span className="text-[13px] text-ink-secondary font-mono">{appointmentIdParam}</span>
            <span className="text-[12px] text-ink-muted ml-1">Customer and vehicle pre-filled from appointment.</span>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-6">

            {/* ── Section 1: Customer & Asset ────────────────────────────── */}
            <SectionCard title="Customer & Asset">
              {!fromAppointment && (
                <div className="flex items-center gap-4 mb-6">
                  {(['walkin', 'existing'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        {...register('customerType')}
                        value={type}
                        className="accent-accent"
                      />
                      <span className="text-sm text-ink-primary capitalize">
                        {type === 'walkin' ? 'Walk-in' : 'Existing customer'}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {!fromAppointment && customerType === 'walkin' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Field label="Full Name" required error={errors.walkinName?.message}>
                    <input
                      {...register('walkinName')}
                      placeholder="e.g. Ravi Shankar"
                      className={cn(INPUT_CLASS, errors.walkinName && 'border-state-danger')}
                    />
                  </Field>
                  <Field label="Phone (+91)" required error={errors.walkinPhone?.message}>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 h-10 border border-r-0 border-line rounded-l-md bg-bg-hover text-sm text-ink-muted">+91</span>
                      <input
                        {...register('walkinPhone')}
                        type="tel"
                        placeholder="9876543210"
                        maxLength={10}
                        className={cn(INPUT_CLASS, 'rounded-l-none', errors.walkinPhone && 'border-state-danger')}
                      />
                    </div>
                  </Field>
                  <Field label="Email (optional)" error={errors.walkinEmail?.message}>
                    <input
                      {...register('walkinEmail')}
                      type="email"
                      placeholder="customer@email.com"
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              )}

              {!fromAppointment && customerType === 'existing' && (
                <div className="mb-4">
                  <Field label="Customer" required error={errors.customerId?.message}>
                    <select
                      {...register('customerId')}
                      className={cn(SELECT_CLASS, errors.customerId && 'border-state-danger')}
                    >
                      <option value="">Select customer…</option>
                      {customerOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.phone ? ` · ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="VIN"
                  required
                  error={errors.vin?.message}
                  helperText={
                    customerType === 'existing' && selectedCustomerId
                      ? customerVehicles.length === 0
                        ? 'No vehicles on file for this customer — enter VIN manually below.'
                        : 'Pick a car already on file for this customer.'
                      : undefined
                  }
                >
                  {customerType === 'existing' &&
                  selectedCustomerId &&
                  customerVehicles.length > 0 &&
                  !fromAppointment ? (
                    <select
                      value={watch('vin') ?? ''}
                      onChange={(e) => handleExistingVinSelect(e.target.value)}
                      className={cn(
                        SELECT_CLASS,
                        'font-mono',
                        errors.vin && 'border-state-danger',
                      )}
                    >
                      <option value="">Select a car…</option>
                      {customerVehicles.map((v) => (
                        <option key={v.vin} value={v.vin}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...register('vin')}
                      placeholder="e.g. WP0AB2A91MS247831"
                      disabled={fromAppointment}
                      className={cn(
                        INPUT_CLASS,
                        'font-mono',
                        errors.vin && 'border-state-danger',
                        fromAppointment && 'opacity-60 cursor-not-allowed',
                      )}
                    />
                  )}
                </Field>
                <Field label="Odometer at Arrival (km)" required error={errors.odometerIn?.message}>
                  <input
                    {...register('odometerIn')}
                    type="number"
                    min={0}
                    placeholder="e.g. 32000"
                    className={cn(INPUT_CLASS, 'font-mono tabular-nums text-right', errors.odometerIn && 'border-state-danger')}
                  />
                </Field>
                <Field label="Year (if known)">
                  <input
                    {...register('year')}
                    type="number"
                    placeholder="e.g. 2022"
                    disabled={fromAppointment}
                    className={cn(INPUT_CLASS, fromAppointment && 'opacity-60 cursor-not-allowed')}
                  />
                </Field>
                <Field label="Make">
                  <input
                    {...register('make')}
                    placeholder="e.g. Porsche"
                    disabled={fromAppointment}
                    className={cn(INPUT_CLASS, fromAppointment && 'opacity-60 cursor-not-allowed')}
                  />
                </Field>
                <Field label="Model">
                  <input
                    {...register('model')}
                    placeholder="e.g. 911 Carrera S"
                    disabled={fromAppointment}
                    className={cn(INPUT_CLASS, fromAppointment && 'opacity-60 cursor-not-allowed')}
                  />
                </Field>
                <Field label="Outlet" required error={errors.outletId?.message}>
                  <select
                    {...register('outletId')}
                    className={SELECT_CLASS}
                  >
                    {OUTLET_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </SectionCard>

            {/* ── Section 2: Service Protocol ────────────────────────────── */}
            <SectionCard title="Service Protocol">
              <div className="space-y-4">
                <Field label="Customer Complaint" required error={errors.customerComplaint?.message}>
                  <textarea
                    {...register('customerComplaint')}
                    rows={3}
                    placeholder="Describe what the customer has reported… (min. 10 characters)"
                    className={cn(
                      'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                      'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      errors.customerComplaint && 'border-state-danger',
                    )}
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Priority" required error={errors.priority?.message}>
                    <select {...register('priority')} className={SELECT_CLASS}>
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Estimated Duration" error={undefined}>
                    <div className={cn(INPUT_CLASS, 'flex items-center font-mono text-ink-muted cursor-not-allowed opacity-70')}>
                      {estimatedHours > 0 ? `${estimatedHours} hr${estimatedHours !== 1 ? 's' : ''}` : '—'}
                    </div>
                  </Field>
                </div>

                <Field label="Service Types" required error={errors.serviceTypeIds?.message}>
                  <div className="flex flex-wrap gap-2">
                    <Controller
                      control={control}
                      name="serviceTypeIds"
                      render={({ field }) => (
                        <>
                          {allServiceTypes.map((st) => {
                            const checked = field.value.includes(st.id);
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  const next = checked
                                    ? field.value.filter((v) => v !== st.id)
                                    : [...field.value, st.id];
                                  field.onChange(next);
                                }}
                                className={cn(
                                  'h-9 px-3 rounded-md border text-sm font-medium transition-colors',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                                  checked
                                    ? 'bg-accent text-white border-accent'
                                    : 'bg-bg-subtle border-line text-ink-secondary hover:border-accent hover:text-ink-primary',
                                )}
                              >
                                {st.name}
                              </button>
                            );
                          })}
                        </>
                      )}
                    />
                  </div>
                </Field>

                {/*
                  L_S6 (SPEC-SERVICE-001 §6.3): when "Other" service type is
                  selected, advisor MUST describe the issue (≥10 chars). The
                  text becomes part of the JC's initial-notes audit trail so
                  technicians have context for diagnosis + quoting.
                */}
                {selectedTypeIds.includes('other') && (
                  <Field
                    label="Describe the Issue"
                    required
                    error={errors.otherDescription?.message}
                    helperText='Used when "Other" is chosen — captures the customer concern in their words for the workshop.'
                  >
                    <textarea
                      {...register('otherDescription')}
                      rows={3}
                      placeholder="e.g. Engine makes a knocking sound when idling cold; started after the long highway run last weekend…"
                      className={cn(
                        'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                        errors.otherDescription && 'border-state-danger',
                      )}
                    />
                  </Field>
                )}

                <Field label="Initial Notes (optional)">
                  <textarea
                    {...register('initialNotes')}
                    rows={2}
                    placeholder="Any internal notes for the advisor…"
                    className={cn(
                      'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                      'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                    )}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* ── Section 3: Bay & Advisor ───────────────────────────────── */}
            <SectionCard title="Bay & Advisor">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Bay (optional)">
                  <select
                    {...register('bayId')}
                    className={SELECT_CLASS}
                  >
                    <option value="">No bay assigned</option>
                    {freeBays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.type}
                      </option>
                    ))}
                    {/* If the pre-selected bay isn't free (e.g. from a query param), still show it */}
                    {preselectedBayId &&
                      !freeBays.find((b) => b.id === preselectedBayId) &&
                      (() => {
                        const b = bays.find((x) => x.id === preselectedBayId);
                        return b ? (
                          <option key={b.id} value={b.id}>
                            {b.code} — {b.type}
                          </option>
                        ) : null;
                      })()
                    }
                  </select>
                </Field>

                <Field label="Service Advisor" required error={errors.advisorId?.message}>
                  <select
                    {...register('advisorId')}
                    className={cn(SELECT_CLASS, errors.advisorId && 'border-state-danger')}
                    disabled={fromAppointment && !!linkedAppointment?.advisorId}
                  >
                    <option value="">Select advisor…</option>
                    {ADVISOR_OPTIONS.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Promised Date" required error={errors.promisedDate?.message}>
                  <input
                    {...register('promisedDate')}
                    type="date"
                    min={todayStr}
                    className={cn(INPUT_CLASS, errors.promisedDate && 'border-state-danger')}
                  />
                </Field>

                <Field label="Promised Time" required error={errors.promisedTime?.message}>
                  <input
                    {...register('promisedTime')}
                    type="time"
                    className={cn(INPUT_CLASS, errors.promisedTime && 'border-state-danger')}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* ── Sticky footer ──────────────────────────────────────────── */}
            <div className={cn(
              'sticky bottom-0 z-10 -mx-6 px-6 py-4',
              'bg-bg-canvas border-t border-line',
              'flex items-center justify-end gap-3',
            )}>
              <button
                type="button"
                onClick={() => router.back()}
                className={cn(
                  'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line',
                  'bg-bg-surface text-sm font-medium text-ink-primary',
                  'hover:bg-bg-subtle transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 h-10 px-5 rounded-md bg-accent text-white',
                  'text-sm font-medium hover:bg-accent-hover transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {isSubmitting ? 'Creating…' : 'Create Job Card'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
