'use client';

/**
 * NewTestDriveWizard — staff-initiated 3-step test drive booking form.
 *
 * Step 1: Customer + Vehicle — search existing customer + pick inventory VIN
 * Step 2: Schedule — date, slot, outlet
 * Step 3: Review + Notes — summary, optional notes, submit
 *
 * Query params: ?customerId={id}&vehicleVin={vin} pre-fill from deal CTA.
 * On submit: useTestDriveStore.getState().createBooking(…) → redirects to queue.
 *
 * PRE-FLIGHT UI CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 * 1. No text-[NNpx] — text-xs/sm/base/lg/xl/2xl only.
 * 2. No oversized radius classes — rounded-md only.
 * 3. Gate for RBAC.
 * 4. i18n via useTranslations('testDrives.new.*').
 * 5. All hooks before any conditional return.
 * 6. Zustand: ONE base ref per selector call.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S1 (create path)
 */

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check, User, Car, CalendarCheck, StickyNote } from 'lucide-react';
import { cn } from '@dms/ui';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useTestDriveStore } from '@/src/lib/test-drive/test-drive-store';
import { TestDriveStoreHydrator } from '@/src/lib/test-drive/test-drive-store-hydrator';
import { Button } from '@/src/components/primitives/button';
import { ProgressStepper } from '@/src/components/primitives/progress-stepper';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import type { TestDriveSlot } from '@dms/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SLOTS: { value: TestDriveSlot; label: string }[] = [
  { value: 'MORNING', label: 'Morning (9:00–12:00)' },
  { value: 'AFTERNOON', label: 'Afternoon (12:00–17:00)' },
  { value: 'EVENING', label: 'Evening (17:00–20:00)' },
  { value: 'FULL_DAY', label: 'Full Day' },
];

const OUTLETS = [
  { value: 'bangalore', label: 'Bangalore — BLR-01' },
  { value: 'mumbai', label: 'Mumbai — MUM-01' },
  { value: 'chennai', label: 'Chennai — CHE-01' },
];

const STEPS = [
  { id: 'customer-vehicle', label: 'Customer & Vehicle' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'review', label: 'Review' },
];

// ─── Wizard state shape ─────────────────────────────────────────────────────

interface WizardData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleVin: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleLabel: string;
  requestedDate: string;
  requestedSlot: TestDriveSlot;
  outletId: string;
  notes: string;
}

const EMPTY_DATA: WizardData = {
  customerId: '',
  customerName: '',
  customerPhone: '',
  vehicleVin: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: 0,
  vehicleLabel: '',
  requestedDate: '',
  requestedSlot: 'MORNING',
  outletId: 'bangalore',
  notes: '',
};

// ─── Input style helper ─────────────────────────────────────────────────────

const icls = (err?: boolean) =>
  cn(
    'h-9 w-full rounded-md border bg-bg-subtle px-3 text-sm text-ink-primary',
    'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
    'placeholder:text-ink-muted',
    err ? 'border-state-danger' : 'border-line',
  );

// ─── Step 1: Customer + Vehicle ─────────────────────────────────────────────

interface Step1Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
}

function StepCustomerVehicle({ data, onUpdate }: Step1Props) {
  const t = useTranslations('testDrives.new');

  const customersMap = useCustomersStore((s) => s.customers);
  const vehiclesMap = useVehiclesStore((s) => s.vehicles);

  const [customerSearch, setCustomerSearch] = React.useState('');
  const [vehicleSearch, setVehicleSearch] = React.useState('');

  const customers = React.useMemo(() => Object.values(customersMap), [customersMap]);
  // VehicleMaster does not carry a listing status — all BN-owned VINs in the
  // vehicles store are available for test drive scheduling.
  const publishedVehicles = React.useMemo(
    () => Object.values(vehiclesMap),
    [vehiclesMap],
  );

  const filteredCustomers = React.useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 15);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email?.toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [customers, customerSearch]);

  const filteredVehicles = React.useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return publishedVehicles.slice(0, 15);
    return publishedVehicles
      .filter(
        (v) =>
          v.vin.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          String(v.year).includes(q),
      )
      .slice(0, 15);
  }, [publishedVehicles, vehicleSearch]);

  return (
    <div className="space-y-6">
      {/* Customer search */}
      <div>
        <p className="text-sm font-semibold text-ink-primary mb-2">{t('customerLabel')}</p>
        {data.customerId ? (
          <div className="flex items-center justify-between border border-accent rounded-md px-3 py-2 bg-bg-subtle">
            <div>
              <p className="text-sm font-semibold text-ink-primary">{data.customerName}</p>
              <p className="text-xs text-ink-secondary">{data.customerPhone}</p>
            </div>
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => {
                onUpdate({ ...data, customerId: '', customerName: '', customerPhone: '' });
                setCustomerSearch('');
              }}
            >
              {t('changeLabel')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder={t('customerSearchPlaceholder')}
              className={icls()}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <ul className="border border-line rounded-md divide-y divide-line max-h-48 overflow-y-auto">
              {filteredCustomers.length === 0 && (
                <li className="px-3 py-2 text-xs text-ink-muted">{t('noCustomersFound')}</li>
              )}
              {filteredCustomers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-bg-subtle transition-colors"
                    onClick={() =>
                      onUpdate({
                        ...data,
                        customerId: c.id,
                        customerName: c.name,
                        customerPhone: c.phone,
                      })
                    }
                  >
                    <p className="text-sm font-medium text-ink-primary">{c.name}</p>
                    <p className="text-xs text-ink-secondary">{c.phone}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Vehicle search */}
      <div>
        <p className="text-sm font-semibold text-ink-primary mb-2">{t('vehicleLabel')}</p>
        {data.vehicleVin ? (
          <div className="flex items-center justify-between border border-accent rounded-md px-3 py-2 bg-bg-subtle">
            <div>
              <p className="text-sm font-semibold text-ink-primary">{data.vehicleLabel}</p>
              <p className="text-xs font-mono text-ink-muted">{data.vehicleVin}</p>
            </div>
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => {
                onUpdate({
                  ...data,
                  vehicleVin: '',
                  vehicleMake: '',
                  vehicleModel: '',
                  vehicleYear: 0,
                  vehicleLabel: '',
                });
                setVehicleSearch('');
              }}
            >
              {t('changeLabel')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder={t('vehicleSearchPlaceholder')}
              className={icls()}
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
            />
            <ul className="border border-line rounded-md divide-y divide-line max-h-48 overflow-y-auto">
              {filteredVehicles.length === 0 && (
                <li className="px-3 py-2 text-xs text-ink-muted">{t('noVehiclesFound')}</li>
              )}
              {filteredVehicles.map((v) => (
                <li key={v.vin}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-bg-subtle transition-colors"
                    onClick={() =>
                      onUpdate({
                        ...data,
                        vehicleVin: v.vin,
                        vehicleMake: v.make,
                        vehicleModel: v.model,
                        vehicleYear: v.year,
                        vehicleLabel: `${v.year} ${v.make} ${v.model}`,
                      })
                    }
                  >
                    <p className="text-sm font-medium text-ink-primary">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="text-xs font-mono text-ink-muted">{v.vin}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Schedule ───────────────────────────────────────────────────────

interface Step2Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
}

function StepSchedule({ data, onUpdate }: Step2Props) {
  const t = useTranslations('testDrives.new');

  const tomorrow = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-ink-primary mb-1">
          {t('dateLabel')}
        </label>
        <input
          type="date"
          min={tomorrow}
          value={data.requestedDate}
          onChange={(e) => onUpdate({ ...data, requestedDate: e.target.value })}
          className={icls(!data.requestedDate)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink-primary mb-1">
          {t('slotLabel')}
        </label>
        <select
          value={data.requestedSlot}
          onChange={(e) =>
            onUpdate({ ...data, requestedSlot: e.target.value as TestDriveSlot })
          }
          className={icls()}
        >
          {SLOTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink-primary mb-1">
          {t('outletLabel')}
        </label>
        <select
          value={data.outletId}
          onChange={(e) => onUpdate({ ...data, outletId: e.target.value })}
          className={icls()}
        >
          {OUTLETS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Step 3: Review + Notes ─────────────────────────────────────────────────

interface Step3Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
  submitting: boolean;
}

function StepReview({ data, onUpdate, submitting }: Step3Props) {
  const t = useTranslations('testDrives.new');

  const slotLabel = SLOTS.find((s) => s.value === data.requestedSlot)?.label ?? data.requestedSlot;
  const outletLabel = OUTLETS.find((o) => o.value === data.outletId)?.label ?? data.outletId;

  return (
    <div className="space-y-5">
      <div className="border border-line rounded-md divide-y divide-line">
        <div className="px-4 py-3 flex items-start gap-3">
          <User size={14} className="text-ink-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-widest font-mono mb-0.5">
              {t('customerLabel')}
            </p>
            <p className="text-sm font-semibold text-ink-primary">{data.customerName}</p>
            <p className="text-xs text-ink-secondary">{data.customerPhone}</p>
          </div>
        </div>

        <div className="px-4 py-3 flex items-start gap-3">
          <Car size={14} className="text-ink-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-widest font-mono mb-0.5">
              {t('vehicleLabel')}
            </p>
            <p className="text-sm font-semibold text-ink-primary">{data.vehicleLabel}</p>
            <p className="text-xs font-mono text-ink-muted">{data.vehicleVin}</p>
          </div>
        </div>

        <div className="px-4 py-3 flex items-start gap-3">
          <CalendarCheck size={14} className="text-ink-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-widest font-mono mb-0.5">
              {t('scheduleLabel')}
            </p>
            <p className="text-sm font-semibold text-ink-primary">{data.requestedDate}</p>
            <p className="text-xs text-ink-secondary">
              {slotLabel} · {outletLabel}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary mb-1">
          <StickyNote size={14} className="text-ink-muted" />
          {t('notesLabel')}
        </label>
        <textarea
          rows={3}
          placeholder={t('notesPlaceholder')}
          value={data.notes}
          disabled={submitting}
          onChange={(e) => onUpdate({ ...data, notes: e.target.value })}
          className={cn(
            'w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary resize-none',
            'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
            'placeholder:text-ink-muted',
            submitting && 'opacity-60 cursor-not-allowed',
          )}
        />
      </div>
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

function WizardContent() {
  const t = useTranslations('testDrives.new');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, toast, dismiss } = useToast();

  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  // Pre-fill from query params (e.g. from sales deal "Book Test Drive" CTA)
  const prefillCustomerId = searchParams.get('customerId') ?? '';
  const prefillVin = searchParams.get('vehicleVin') ?? '';

  const customersMap = useCustomersStore((s) => s.customers);
  const vehiclesMap = useVehiclesStore((s) => s.vehicles);

  const prefillCustomer = prefillCustomerId ? customersMap[prefillCustomerId] : undefined;
  const prefillVehicle = prefillVin ? vehiclesMap[prefillVin] : undefined;

  const [data, setData] = React.useState<WizardData>(() => ({
    ...EMPTY_DATA,
    customerId: prefillCustomer?.id ?? '',
    customerName: prefillCustomer?.name ?? '',
    customerPhone: prefillCustomer?.phone ?? '',
    vehicleVin: prefillVehicle?.vin ?? '',
    vehicleMake: prefillVehicle?.make ?? '',
    vehicleModel: prefillVehicle?.model ?? '',
    vehicleYear: prefillVehicle?.year ?? 0,
    vehicleLabel: prefillVehicle
      ? `${prefillVehicle.year} ${prefillVehicle.make} ${prefillVehicle.model}`
      : '',
  }));

  const step1Valid = Boolean(data.customerId && data.vehicleVin);
  const step2Valid = Boolean(data.requestedDate && data.requestedSlot && data.outletId);

  const canNext =
    (step === 0 && step1Valid) ||
    (step === 1 && step2Valid) ||
    step === 2;

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      useTestDriveStore.getState().createBooking({
        customerId: data.customerId,
        customerName: data.customerName,
        vehicleVin: data.vehicleVin,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        vehicleYear: data.vehicleYear,
        outletId: data.outletId,
        requestedDate: data.requestedDate,
        requestedSlot: data.requestedSlot,
        notes: data.notes || undefined,
      });
      toast(t('successToast'), 'success');
      setTimeout(() => router.push('/test-drives'), 1200);
    } catch {
      toast(t('errorToast'), 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6 max-w-xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/test-drives')}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-secondary mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          {t('backLabel')}
        </button>
        <h1 className="text-xl font-semibold text-ink-primary">{t('pageTitle')}</h1>
        <p className="text-sm text-ink-secondary mt-0.5">{t('pageSubtitle')}</p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <ProgressStepper steps={STEPS} currentIndex={step} />
      </div>

      {/* Step content */}
      <div className="mb-8">
        {step === 0 && (
          <StepCustomerVehicle data={data} onUpdate={setData} />
        )}
        {step === 1 && (
          <StepSchedule data={data} onUpdate={setData} />
        )}
        {step === 2 && (
          <StepReview data={data} onUpdate={setData} submitting={submitting} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="md"
          onClick={() => (step === 0 ? router.push('/test-drives') : setStep(step - 1))}
          disabled={submitting}
        >
          {step === 0 ? (
            <>{t('cancelLabel')}</>
          ) : (
            <span className="flex items-center gap-1.5">
              <ArrowLeft size={14} />
              {t('backLabel')}
            </span>
          )}
        </Button>

        {step < 2 ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
          >
            <span className="flex items-center gap-1.5">
              {t('nextLabel')}
              <ArrowRight size={14} />
            </span>
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={submitting || !step2Valid || !step1Valid}
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {t('submittingLabel')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check size={14} />
                {t('confirmLabel')}
              </span>
            )}
          </Button>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export function NewTestDriveWizard() {
  return (
    <TestDriveStoreHydrator>
      <WizardContent />
    </TestDriveStoreHydrator>
  );
}
