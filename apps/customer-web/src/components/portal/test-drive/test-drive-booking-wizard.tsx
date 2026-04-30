'use client';

/**
 * TestDriveBookingWizard — 4-step multi-vehicle booking flow for the customer portal.
 *
 * Step 1 — Vehicles: multi-select (up to MAX_VEHICLES=3), checkbox cards.
 * Step 2 — Customer: govt ID + details from auth context.
 * Step 3 — Schedule: per-vehicle date / slot / outlet; collision guard.
 * Step 4 — Review + Notes: summary list of N bookings, shared notes.
 *
 * On submit: loops createBooking() once per VIN via portal bridge (Seam 44 portal variant).
 * All-or-nothing: if ANY booking fails, surface inline error — DO NOT navigate away.
 *
 * Design: Editorial Luxury / Dark Premium (customer surface).
 * NO text-[NNpx]. NO rounded-lg/xl.
 *
 * PRE-FLIGHT UI CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 * 1. text-xs/sm/base/lg/xl/2xl only — no text-[NNpx].
 * 2. rounded-md only — no oversized radius classes.
 * 3. All hooks before any conditional return.
 * 4. Zustand: ONE base ref per selector call; computation in useMemo.
 * 5. i18n via useTranslations('portal.testDrive').
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S1 S6 L3 L8
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, ChevronLeft, ChevronRight, CheckSquare, Square, Car, CalendarCheck } from 'lucide-react';
import { vehicles as allVehicles } from '@dms/mocks/fixtures';
import {
  useTestDriveStore,
  seedPortalTestDriveStore,
  type PortalCreateTestDriveInput,
} from '@/src/lib/test-drive/test-drive-store-bridge';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import type { TestDriveSlot } from '@dms/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Cap at 3 for portal customers — shopping for 5+ cars at once is unusual. */
const MAX_VEHICLES = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 'vehicle' | 'customer' | 'schedule' | 'review' | 'success';

type GovtIdType = 'AADHAAR_L4' | 'PAN' | 'DL';

interface CustomerFields {
  name: string;
  phone: string;
  email: string;
  govtIdType: GovtIdType;
  govtIdValue: string;
}

export interface VehicleSchedule {
  date: string;
  slot: TestDriveSlot;
  outlet: string;
}

// ─── Option constants ─────────────────────────────────────────────────────────

const SLOT_OPTIONS: { key: TestDriveSlot; label: string; desc: string }[] = [
  { key: 'MORNING', label: 'Morning', desc: '9am – 12pm' },
  { key: 'AFTERNOON', label: 'Afternoon', desc: '12pm – 4pm' },
  { key: 'EVENING', label: 'Evening', desc: '4pm – 7pm' },
  { key: 'FULL_DAY', label: 'Full Day', desc: 'By appointment' },
];

const OUTLET_OPTIONS = [
  { id: 'bangalore', label: 'Bangalore' },
  { id: 'mumbai', label: 'Mumbai' },
  { id: 'chennai', label: 'Chennai' },
];

// Vehicle statuses that customers can book a test drive on.
const BOOKABLE_STATUSES = new Set(['published']);

// ─── Validation helpers ───────────────────────────────────────────────────────

const AADHAAR_RE = /^\d{4}$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const DL_RE = /^[A-Z0-9]{9,20}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;

function validateGovtId(type: GovtIdType, value: string): string | null {
  if (type === 'AADHAAR_L4') return AADHAAR_RE.test(value) ? null : 'AADHAAR_L4';
  if (type === 'PAN') return PAN_RE.test(value) ? null : 'PAN';
  if (type === 'DL') return DL_RE.test(value) ? null : 'DL';
  return null;
}

/** Detect same date+slot+outlet collision across two VINs. */
export function hasSlotCollision(
  selectedVins: Set<string>,
  schedules: Record<string, VehicleSchedule>,
): boolean {
  const vins = Array.from(selectedVins);
  for (let i = 0; i < vins.length; i++) {
    for (let j = i + 1; j < vins.length; j++) {
      const a = schedules[vins[i]!];
      const b = schedules[vins[j]!];
      if (
        a && b &&
        a.date && a.date === b.date &&
        a.slot === b.slot &&
        a.outlet === b.outlet
      ) {
        return true;
      }
    }
  }
  return false;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: WizardStep }) {
  const steps: WizardStep[] = ['vehicle', 'customer', 'schedule', 'review'];
  const labels = ['Vehicle', 'Your Details', 'Schedule', 'Review'];
  const current = steps.indexOf(step);
  return (
    <div className="flex items-center gap-2 mb-8" aria-label="Booking steps">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={[
            'flex items-center gap-1.5',
            current === i ? 'text-[var(--color-brass)]' : i < current ? 'text-[var(--color-ink-secondary)]' : 'text-[var(--color-ink-muted)]',
          ].join(' ')}>
            <span className={[
              'inline-flex items-center justify-center w-6 h-6 rounded-full border font-mono text-xs font-semibold',
              i < current ? 'bg-[var(--color-brass)] border-[var(--color-brass)] text-white' :
              current === i ? 'border-[var(--color-brass)] text-[var(--color-brass)]' :
              'border-[var(--color-line)] text-[var(--color-ink-muted)]',
            ].join(' ')} aria-current={current === i ? 'step' : undefined}>
              {i < current ? '✓' : i + 1}
            </span>
            <span className="text-xs font-mono uppercase tracking-widest hidden sm:inline">
              {labels[i]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-px bg-[var(--color-line)]" aria-hidden="true" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Step 1: Vehicle multi-select ────────────────────────────────────────────

interface StepVehicleProps {
  selectedVins: Set<string>;
  onToggle: (vin: string) => void;
}

function StepVehicle({ selectedVins, onToggle }: StepVehicleProps) {
  const t = useTranslations('portal.testDrive');
  const listedVehicles = React.useMemo(
    () => allVehicles.filter((v) => BOOKABLE_STATUSES.has(v.status ?? '')).slice(0, 12),
    [],
  );

  const count = selectedVins.size;
  const atMax = count >= MAX_VEHICLES;

  return (
    <div>
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-2">{t('stepVehicleTitle')}</h2>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-2">{t('stepVehicleSubtitle')}</p>

      {/* Counter + max note */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono text-[var(--color-ink-secondary)]">
          {t('selectedVehiclesCount', { count })}
        </p>
        <p className="text-xs text-[var(--color-ink-muted)]">
          {t('maxVehiclesNote', { max: MAX_VEHICLES })}
        </p>
      </div>

      <div className="space-y-2">
        {listedVehicles.length === 0 && (
          <p className="text-sm text-[var(--color-ink-muted)]">{t('noVehiclesSelected')}</p>
        )}
        {listedVehicles.map((v) => {
          const checked = selectedVins.has(v.vin);
          const disabled = atMax && !checked;
          return (
            <button
              key={v.vin}
              type="button"
              onClick={() => !disabled && onToggle(v.vin)}
              disabled={disabled}
              aria-pressed={checked}
              className={[
                'w-full text-left p-4 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                checked
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass,#C9A96E)/0.06]'
                  : 'border-[var(--color-line)] hover:border-[var(--color-ink-muted)] bg-transparent',
                disabled ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 text-[var(--color-brass)]">
                  {checked
                    ? <CheckSquare size={16} aria-hidden="true" />
                    : <Square size={16} className="text-[var(--color-ink-muted)]" aria-hidden="true" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {v.year} {v.make} {v.model}
                  </p>
                  <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-0.5">
                    {v.vin}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    ₹{v.price ? (v.price / 100000).toFixed(1) : '—'}L
                  </p>
                  <p className="font-mono text-xs text-[var(--color-ink-muted)]">{v.km?.toLocaleString('en-IN')} km</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Customer info + Govt ID ─────────────────────────────────────────
// Portal customer is already authenticated — NO walk-in path.
// This step only collects govt ID + confirms/fills optional details.

interface StepCustomerProps {
  fields: CustomerFields;
  onChange: (fields: CustomerFields) => void;
}

const GOVT_ID_TYPES: { key: GovtIdType; labelKey: string }[] = [
  { key: 'AADHAAR_L4', labelKey: 'govtIdAadhaar' },
  { key: 'PAN', labelKey: 'govtIdPan' },
  { key: 'DL', labelKey: 'govtIdDl' },
];

function StepCustomer({ fields, onChange }: StepCustomerProps) {
  const t = useTranslations('portal.testDrive');

  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  function mark(field: string) {
    setTouched((p) => ({ ...p, [field]: true }));
  }

  function set(patch: Partial<CustomerFields>) {
    onChange({ ...fields, ...patch });
  }

  const govtIdError = touched.govtIdValue
    ? validateGovtId(fields.govtIdType, fields.govtIdValue)
    : null;

  function govtIdPlaceholder(): string {
    if (fields.govtIdType === 'AADHAAR_L4') return t('govtIdAadhaarPlaceholder');
    if (fields.govtIdType === 'PAN') return t('govtIdPanPlaceholder');
    return t('govtIdDlPlaceholder');
  }

  function govtIdErrorMsg(): string | null {
    if (!govtIdError) return null;
    if (govtIdError === 'AADHAAR_L4') return t('govtIdAadhaarError');
    if (govtIdError === 'PAN') return t('govtIdPanError');
    return t('govtIdDlError');
  }

  const nameError = touched.name && fields.name.trim().length < 2 ? t('customerNameError') : null;
  const phoneError = touched.phone && !PHONE_RE.test(fields.phone.replace(/\s/g, '')) ? t('customerPhoneError') : null;
  const emailError = touched.email && !EMAIL_RE.test(fields.email) ? t('customerEmailError') : null;

  return (
    <div>
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-2">{t('stepCustomerTitle')}</h2>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-6">{t('stepCustomerSubtitle')}</p>

      <div className="space-y-5">
        {/* Full name */}
        <div>
          <label htmlFor="td-cust-name" className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
            {t('customerNameLabel')} *
          </label>
          <input
            id="td-cust-name"
            type="text"
            value={fields.name}
            onChange={(e) => set({ name: e.target.value })}
            onBlur={() => mark('name')}
            autoComplete="name"
            className="w-full border border-[var(--color-line)] px-3 h-10 text-sm bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1"
          />
          {nameError && (
            <p className="mt-1 text-xs text-red-600" role="alert">{nameError}</p>
          )}
        </div>

        {/* Mobile */}
        <div>
          <label htmlFor="td-cust-phone" className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
            {t('customerPhoneLabel')} *
          </label>
          <div className="flex">
            <span className="inline-flex items-center border border-r-0 border-[var(--color-line)] px-3 text-sm text-[var(--color-ink-muted)] bg-transparent">+91</span>
            <input
              id="td-cust-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={fields.phone}
              onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '') })}
              onBlur={() => mark('phone')}
              autoComplete="tel-national"
              className="flex-1 border border-[var(--color-line)] px-3 h-10 text-sm bg-transparent text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1"
            />
          </div>
          {phoneError && (
            <p className="mt-1 text-xs text-red-600" role="alert">{phoneError}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="td-cust-email" className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
            {t('customerEmailLabel')} *
          </label>
          <input
            id="td-cust-email"
            type="email"
            value={fields.email}
            onChange={(e) => set({ email: e.target.value })}
            onBlur={() => mark('email')}
            autoComplete="email"
            className="w-full border border-[var(--color-line)] px-3 h-10 text-sm bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1"
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-600" role="alert">{emailError}</p>
          )}
        </div>

        {/* Govt ID type */}
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
            {t('govtIdTypeLabel')} *
          </p>
          <div className="flex flex-col gap-2">
            {GOVT_ID_TYPES.map(({ key, labelKey }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="govtIdType"
                  value={key}
                  checked={fields.govtIdType === key}
                  onChange={() => {
                    set({ govtIdType: key, govtIdValue: '' });
                    setTouched((p) => ({ ...p, govtIdValue: false }));
                  }}
                  className="accent-[var(--color-brass)]"
                />
                <span className="text-sm text-[var(--color-ink)]">{t(labelKey as Parameters<typeof t>[0])}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Govt ID value */}
        <div>
          <label htmlFor="td-govt-id" className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
            {t('govtIdValueLabel')} *
          </label>
          <input
            id="td-govt-id"
            type="text"
            value={fields.govtIdValue}
            onChange={(e) => {
              const v = fields.govtIdType === 'PAN' ? e.target.value.toUpperCase() : e.target.value;
              set({ govtIdValue: v });
            }}
            onBlur={() => mark('govtIdValue')}
            placeholder={govtIdPlaceholder()}
            maxLength={fields.govtIdType === 'AADHAAR_L4' ? 4 : fields.govtIdType === 'PAN' ? 10 : 20}
            className="w-full border border-[var(--color-line)] px-3 h-10 text-sm bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1"
          />
          {govtIdErrorMsg() && (
            <p className="mt-1 text-xs text-red-600" role="alert">{govtIdErrorMsg()}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Per-vehicle Schedule ────────────────────────────────────────────

interface StepScheduleProps {
  selectedVins: Set<string>;
  schedules: Record<string, VehicleSchedule>;
  onUpdateSchedule: (vin: string, s: VehicleSchedule) => void;
}

function StepSchedule({ selectedVins, schedules, onUpdateSchedule }: StepScheduleProps) {
  const t = useTranslations('portal.testDrive');

  const tomorrow = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0]!;
  }, []);

  // Collision detection: same date+slot+outlet across multiple VINs
  function getCollision(vin: string): string | null {
    const me = schedules[vin];
    if (!me?.date || !me?.slot || !me?.outlet) return null;
    for (const otherVin of selectedVins) {
      if (otherVin === vin) continue;
      const other = schedules[otherVin];
      if (
        other?.date === me.date &&
        other?.slot === me.slot &&
        other?.outlet === me.outlet
      ) {
        return t('conflictSameSlot');
      }
    }
    return null;
  }

  const vins = Array.from(selectedVins);

  return (
    <div>
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-2">{t('stepScheduleTitle')}</h2>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-6">{t('stepScheduleSubtitle')}</p>

      <div className="space-y-4">
        {vins.map((vin) => {
          const vehicle = allVehicles.find((v) => v.vin === vin);
          const label = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vin;
          const sched = schedules[vin] ?? { date: '', slot: 'MORNING' as TestDriveSlot, outlet: 'bangalore' };
          const collision = getCollision(vin);

          return (
            <div key={vin} className="border border-[var(--color-line)] p-4 space-y-4">
              {/* Vehicle header */}
              <div className="flex items-center gap-2">
                <Car size={14} className="text-[var(--color-ink-muted)] shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{label}</p>
                  <p className="font-mono text-xs text-[var(--color-ink-muted)]">{vin}</p>
                </div>
              </div>

              {/* Outlet */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
                  {t('outletLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {OUTLET_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onUpdateSchedule(vin, { ...sched, outlet: o.id })}
                      aria-pressed={sched.outlet === o.id}
                      className={[
                        'px-4 py-2 border font-mono text-xs uppercase tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                        sched.outlet === o.id
                          ? 'border-[var(--color-brass)] text-[var(--color-brass)] bg-[var(--color-brass,#C9A96E)/0.06]'
                          : 'border-[var(--color-line)] text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-muted)]',
                      ].join(' ')}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
                  {t('dateLabel')} *
                </label>
                <input
                  type="date"
                  min={tomorrow}
                  value={sched.date}
                  onChange={(e) => onUpdateSchedule(vin, { ...sched, date: e.target.value })}
                  className="w-full border border-[var(--color-line)] px-3 h-10 text-sm bg-transparent text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1"
                />
              </div>

              {/* Slot */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
                  {t('slotLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SLOT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => onUpdateSchedule(vin, { ...sched, slot: s.key })}
                      aria-pressed={sched.slot === s.key}
                      className={[
                        'p-3 border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                        sched.slot === s.key
                          ? 'border-[var(--color-brass)] bg-[var(--color-brass,#C9A96E)/0.06]'
                          : 'border-[var(--color-line)] hover:border-[var(--color-ink-muted)]',
                      ].join(' ')}
                    >
                      <p className="text-sm font-semibold text-[var(--color-ink)]">{s.label}</p>
                      <p className="font-mono text-xs text-[var(--color-ink-muted)] mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Collision error */}
              {collision && (
                <p className="text-xs text-red-600" role="alert">{collision}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

interface StepReviewProps {
  selectedVins: Set<string>;
  schedules: Record<string, VehicleSchedule>;
  customer: CustomerFields;
  notes: string;
  onNotes: (n: string) => void;
}

function StepReview({ selectedVins, schedules, customer, notes, onNotes }: StepReviewProps) {
  const t = useTranslations('portal.testDrive');
  const vins = Array.from(selectedVins);

  const govtIdTypeLabel =
    customer.govtIdType === 'AADHAAR_L4' ? t('govtIdAadhaar')
    : customer.govtIdType === 'PAN' ? t('govtIdPan')
    : t('govtIdDl');

  return (
    <div>
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-2">{t('stepReviewTitle')}</h2>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-6">{t('stepReviewSubtitle')}</p>

      {/* Booking entries — one per VIN */}
      <div className="border border-[var(--color-line)] divide-y divide-[var(--color-line)] mb-4">
        {vins.map((vin) => {
          const vehicle = allVehicles.find((v) => v.vin === vin);
          const label = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vin;
          const sched = schedules[vin];
          const slotEntry = SLOT_OPTIONS.find((s) => s.key === sched?.slot);
          const outletLabel = OUTLET_OPTIONS.find((o) => o.id === sched?.outlet)?.label ?? sched?.outlet ?? '—';

          return (
            <div key={vin} className="px-4 py-3 flex items-start gap-3">
              <CalendarCheck size={14} className="text-[var(--color-ink-muted)] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{label}</p>
                <p className="font-mono text-xs text-[var(--color-ink-muted)]">{vin}</p>
                {sched && (
                  <p className="text-xs text-[var(--color-ink-secondary)] mt-0.5">
                    {sched.date} · {slotEntry?.label ?? sched.slot} · {outletLabel}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer summary */}
      <div className="border border-[var(--color-line)] p-4 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('customerNameLabel')}</span>
          <span className="text-[var(--color-ink)]">{customer.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('customerPhoneLabel')}</span>
          <span className="text-[var(--color-ink)] font-mono">+91 {customer.phone}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('customerEmailLabel')}</span>
          <span className="text-[var(--color-ink)]">{customer.email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('govtIdTypeLabel')}</span>
          <span className="text-[var(--color-ink)]">{govtIdTypeLabel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('govtIdValueLabel')}</span>
          <span className="text-[var(--color-ink)] font-mono">{customer.govtIdValue}</span>
        </div>
      </div>

      {/* Shared notes */}
      <div>
        <label htmlFor="td-notes" className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
          {t('notesLabel')} ({t('optional')})
        </label>
        <textarea
          id="td-notes"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={3}
          placeholder={t('notesPlaceholder')}
          className="w-full border border-[var(--color-line)] px-3 py-2 text-sm bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] focus:ring-offset-1 resize-none"
        />
      </div>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────────

function StepSuccess({ bookingIds }: { bookingIds: string[] }) {
  const t = useTranslations('portal.testDrive');
  return (
    <div className="text-center py-12">
      <CheckCircle size={48} className="mx-auto mb-4 text-[var(--color-brass)]" strokeWidth={1} aria-hidden="true" />
      <h2 className="font-display text-2xl text-[var(--color-ink)] mb-3">{t('successTitle')}</h2>
      <p className="text-base text-[var(--color-ink-secondary)] mb-2">{t('successBody')}</p>
      <div className="space-y-1 mb-8">
        {bookingIds.map((id) => (
          <p key={id} className="font-mono text-xs text-[var(--color-ink-muted)]">
            {t('bookingRef')}: {id}
          </p>
        ))}
      </div>
      <a
        href="/test-drive"
        className="font-mono text-xs uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        {t('viewAllBookings')} →
      </a>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function TestDriveBookingWizard({ customerName }: { customerName?: string }) {
  const t = useTranslations('portal.testDrive');
  const { customerId } = usePortalAuth();

  // ── All hooks first (Rules of Hooks) ───────────────────────────────────────
  const createBooking = useTestDriveStore((s) => s.createBooking);

  // Seed store once
  React.useEffect(() => { seedPortalTestDriveStore(); }, []);

  const [step, setStep] = React.useState<WizardStep>('vehicle');
  const [submitting, setSubmitting] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [successIds, setSuccessIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState('');

  // Multi-select VINs (cap at MAX_VEHICLES)
  const [selectedVins, setSelectedVins] = React.useState<Set<string>>(new Set());

  // Per-vehicle schedules
  const [schedules, setSchedules] = React.useState<Record<string, VehicleSchedule>>({});

  // Customer fields — pre-fill name from auth context prop
  const [customerFields, setCustomerFields] = React.useState<CustomerFields>({
    name: customerName ?? '',
    phone: '',
    email: '',
    govtIdType: 'AADHAAR_L4',
    govtIdValue: '',
  });

  // ── Toggle VIN selection ────────────────────────────────────────────────────
  function toggleVin(vin: string) {
    setSelectedVins((prev) => {
      const next = new Set(prev);
      if (next.has(vin)) {
        next.delete(vin);
        setSchedules((s) => {
          const ns = { ...s };
          delete ns[vin];
          return ns;
        });
      } else if (next.size < MAX_VEHICLES) {
        next.add(vin);
        setSchedules((s) =>
          s[vin]
            ? s
            : { ...s, [vin]: { date: '', slot: 'MORNING', outlet: 'bangalore' } },
        );
      }
      return next;
    });
  }

  function updateSchedule(vin: string, s: VehicleSchedule) {
    setSchedules((prev) => ({ ...prev, [vin]: s }));
  }

  // ── Customer validation ─────────────────────────────────────────────────────
  function isCustomerValid(): boolean {
    const { name, phone, email, govtIdType, govtIdValue } = customerFields;
    if (name.trim().length < 2) return false;
    if (!PHONE_RE.test(phone.replace(/\s/g, ''))) return false;
    if (!EMAIL_RE.test(email)) return false;
    if (validateGovtId(govtIdType, govtIdValue) !== null) return false;
    return true;
  }

  // ── Schedule validation ─────────────────────────────────────────────────────
  const scheduleValid = React.useMemo(() => {
    if (selectedVins.size === 0) return false;
    return Array.from(selectedVins).every((vin) => {
      const s = schedules[vin];
      return s?.date && s?.slot && s?.outlet;
    });
  }, [selectedVins, schedules]);

  const collisionDetected = React.useMemo(
    () => hasSlotCollision(selectedVins, schedules),
    [selectedVins, schedules],
  );

  // ── Navigation ──────────────────────────────────────────────────────────────
  function canProceed(): boolean {
    if (step === 'vehicle') return selectedVins.size > 0;
    if (step === 'customer') return isCustomerValid();
    if (step === 'schedule') return scheduleValid && !collisionDetected;
    return true;
  }

  function handleNext() {
    setError('');
    if (step === 'vehicle') setStep('customer');
    else if (step === 'customer') setStep('schedule');
    else if (step === 'schedule') setStep('review');
  }

  function handleBack() {
    setError('');
    if (step === 'customer') setStep('vehicle');
    else if (step === 'schedule') setStep('customer');
    else if (step === 'review') setStep('schedule');
  }

  // ── Submit — all-or-nothing ─────────────────────────────────────────────────
  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    const vins = Array.from(selectedVins);
    const createdIds: string[] = [];

    try {
      for (const vin of vins) {
        const sched = schedules[vin];
        if (!sched) throw new Error(`missing-schedule:${vin}`);

        const vehicle = allVehicles.find((v) => v.vin === vin);

        const input: PortalCreateTestDriveInput = {
          customerId,
          customerName: customerFields.name || (customerName ?? 'Portal Customer'),
          customerPhone: customerFields.phone ? `+91${customerFields.phone}` : undefined,
          customerEmail: customerFields.email || undefined,
          vehicleVin: vin,
          vehicleMake: vehicle?.make ?? '',
          vehicleModel: vehicle?.model ?? '',
          vehicleYear: vehicle?.year ?? 0,
          outletId: sched.outlet,
          requestedDate: sched.date,
          requestedSlot: sched.slot,
          notes: notes || undefined,
          governmentIdType: customerFields.govtIdType,
          governmentIdValue: customerFields.govtIdValue || undefined,
        };

        const booking = createBooking(input);
        createdIds.push(booking.id);
      }

      // All bookings created — navigate to success screen
      setSuccessIds(createdIds);
      setStep('success');
    } catch (err) {
      // All-or-nothing: surface error inline, do NOT navigate away
      const msg = err instanceof Error && err.message === 'duplicate-active-booking'
        ? t('errorDuplicate')
        : t('errorGeneric');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return <StepSuccess bookingIds={successIds} />;
  }

  const confirmLabel = t('confirmBookingsCta', { count: selectedVins.size });

  return (
    <div>
      <StepIndicator step={step} />

      {step === 'vehicle' && (
        <StepVehicle selectedVins={selectedVins} onToggle={toggleVin} />
      )}
      {step === 'customer' && (
        <StepCustomer fields={customerFields} onChange={setCustomerFields} />
      )}
      {step === 'schedule' && (
        <StepSchedule
          selectedVins={selectedVins}
          schedules={schedules}
          onUpdateSchedule={updateSchedule}
        />
      )}
      {step === 'review' && (
        <StepReview
          selectedVins={selectedVins}
          schedules={schedules}
          customer={customerFields}
          notes={notes}
          onNotes={setNotes}
        />
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2" role="alert">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step !== 'vehicle' && (
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)] disabled:opacity-50"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            {t('back')}
          </button>
        )}
        <div className="flex-1" />
        {step !== 'review' ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className={[
              'flex items-center gap-1 px-6 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
              canProceed()
                ? 'bg-[var(--color-brass)] text-white hover:opacity-90'
                : 'bg-[var(--color-line)] text-[var(--color-ink-muted)] cursor-not-allowed',
            ].join(' ')}
          >
            {t('next')}
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-[var(--color-brass)] text-white font-mono text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            {submitting ? t('booking') : confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}
