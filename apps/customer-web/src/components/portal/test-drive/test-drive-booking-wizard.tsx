'use client';

/**
 * TestDriveBookingWizard — 4-step booking flow for the customer portal.
 *
 * Step 1: Vehicle picker (from available vehicles fixture)
 * Step 2: Customer info + government ID (DPDP Act 2023 — Aadhaar last-4 only)
 * Step 3: Date + slot + outlet
 * Step 4: Review + confirm
 *
 * Design: Editorial Luxury / Dark Premium (customer surface).
 * NO text-[NNpx]. NO rounded-lg/xl.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S1 S6 L3 L8
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { vehicles as allVehicles } from '@dms/mocks/fixtures';
import {
  useTestDriveStore,
  seedPortalTestDriveStore,
  type PortalCreateTestDriveInput,
} from '@/src/lib/test-drive/test-drive-store-bridge';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import type { TestDriveSlot } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 'vehicle' | 'customer' | 'datetime' | 'review' | 'success';

type GovtIdType = 'AADHAAR_L4' | 'PAN' | 'DL';

interface CustomerFields {
  name: string;
  phone: string;
  email: string;
  govtIdType: GovtIdType;
  govtIdValue: string;
}

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

// Vehicle statuses that customers can book a test drive on. Sourced from
// the @dms/types Vehicle status enum: only 'published' (actively listed)
// vehicles are bookable. 'reserved' and 'sold' are excluded.
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

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: WizardStep }) {
  const steps: WizardStep[] = ['vehicle', 'customer', 'datetime', 'review'];
  const labels = ['Vehicle', 'Your Details', 'Date & Slot', 'Review'];
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

// ─── Step 1: Vehicle picker ───────────────────────────────────────────────────

function StepVehicle({
  selectedVin,
  onSelect,
}: {
  selectedVin: string;
  onSelect: (vin: string) => void;
}) {
  const t = useTranslations('portal.testDrive');
  const listedVehicles = allVehicles.filter((v) => BOOKABLE_STATUSES.has(v.status ?? '')).slice(0, 12);

  return (
    <div>
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-2">{t('stepVehicleTitle')}</h2>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-6">{t('stepVehicleSubtitle')}</p>
      <div className="space-y-2">
        {listedVehicles.map((v) => {
          const selected = selectedVin === v.vin;
          return (
            <button
              key={v.vin}
              type="button"
              onClick={() => onSelect(v.vin)}
              className={[
                'w-full text-left p-4 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                selected
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass,#C9A96E)/0.06]'
                  : 'border-[var(--color-line)] hover:border-[var(--color-ink-muted)] bg-transparent',
              ].join(' ')}
              aria-pressed={selected}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
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
              {selected && (
                <div className="mt-2 flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-[var(--color-brass)]">
                  <CheckCircle size={12} strokeWidth={2} aria-hidden="true" />
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Customer info + Govt ID ─────────────────────────────────────────

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

// ─── Step 3: Date + Slot + Outlet ─────────────────────────────────────────────

function StepDateTime({
  date, slot, outletId,
  onDate, onSlot, onOutlet,
}: {
  date: string; slot: TestDriveSlot; outletId: string;
  onDate: (d: string) => void; onSlot: (s: TestDriveSlot) => void; onOutlet: (o: string) => void;
}) {
  const t = useTranslations('portal.testDrive');
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // at least tomorrow
  const minDateStr = minDate.toISOString().slice(0, 10);

  return (
    <div>
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-2">{t('stepDateTitle')}</h2>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-6">{t('stepDateSubtitle')}</p>
      <div className="space-y-6">
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
                onClick={() => onOutlet(o.id)}
                aria-pressed={outletId === o.id}
                className={[
                  'px-4 py-2 border font-mono text-xs uppercase tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                  outletId === o.id
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
          <label htmlFor="td-date" className="block font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
            {t('dateLabel')}
          </label>
          <input
            id="td-date"
            type="date"
            value={date}
            min={minDateStr}
            onChange={(e) => onDate(e.target.value)}
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
                onClick={() => onSlot(s.key)}
                aria-pressed={slot === s.key}
                className={[
                  'p-3 border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                  slot === s.key
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
      </div>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({
  vin, date, slot, outletId, notes, onNotes, customer,
}: {
  vin: string; date: string; slot: TestDriveSlot; outletId: string;
  notes: string; onNotes: (n: string) => void;
  customer: CustomerFields;
}) {
  const t = useTranslations('portal.testDrive');
  const vehicle = allVehicles.find((v) => v.vin === vin);
  const outletLabel = OUTLET_OPTIONS.find((o) => o.id === outletId)?.label ?? outletId;
  const slotLabel = SLOT_OPTIONS.find((s) => s.key === slot);

  const govtIdTypeLabel =
    customer.govtIdType === 'AADHAAR_L4' ? t('govtIdAadhaar')
    : customer.govtIdType === 'PAN' ? t('govtIdPan')
    : t('govtIdDl');

  return (
    <div>
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-2">{t('stepReviewTitle')}</h2>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-6">{t('stepReviewSubtitle')}</p>
      <div className="border border-[var(--color-line)] p-4 mb-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('vehicle')}</span>
          <span className="text-[var(--color-ink)] font-semibold">
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vin}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('dateLabel')}</span>
          <span className="text-[var(--color-ink)]">{date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('slotLabel')}</span>
          <span className="text-[var(--color-ink)]">{slotLabel?.label} · {slotLabel?.desc}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-ink-muted)] font-mono text-xs uppercase tracking-widest">{t('outletLabel')}</span>
          <span className="text-[var(--color-ink)]">{outletLabel}</span>
        </div>
      </div>

      {/* Customer summary block */}
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

// ─── Success ─────────────────────────────────────────────────────────────────

function StepSuccess({ bookingId }: { bookingId: string }) {
  const t = useTranslations('portal.testDrive');
  return (
    <div className="text-center py-12">
      <CheckCircle size={48} className="mx-auto mb-4 text-[var(--color-brass)]" strokeWidth={1} aria-hidden="true" />
      <h2 className="font-display text-2xl text-[var(--color-ink)] mb-3">{t('successTitle')}</h2>
      <p className="text-base text-[var(--color-ink-secondary)] mb-2">{t('successBody')}</p>
      <p className="font-mono text-xs text-[var(--color-ink-muted)] mb-8">
        {t('bookingRef')}: {bookingId}
      </p>
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
  const createBooking = useTestDriveStore((s) => s.createBooking);

  // Seed store once
  React.useEffect(() => { seedPortalTestDriveStore(); }, []);

  const [step, setStep] = React.useState<WizardStep>('vehicle');
  const [selectedVin, setSelectedVin] = React.useState('');
  const [date, setDate] = React.useState('');
  const [slot, setSlot] = React.useState<TestDriveSlot>('MORNING');
  const [outletId, setOutletId] = React.useState('bangalore');
  const [notes, setNotes] = React.useState('');
  const [successId, setSuccessId] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Customer fields — pre-fill name from prop (passed from auth context by page)
  const [customerFields, setCustomerFields] = React.useState<CustomerFields>({
    name: customerName ?? '',
    phone: '',
    email: '',
    govtIdType: 'AADHAAR_L4',
    govtIdValue: '',
  });

  const vehicle = allVehicles.find((v) => v.vin === selectedVin);

  function isCustomerValid(): boolean {
    const { name, phone, email, govtIdType, govtIdValue } = customerFields;
    if (name.trim().length < 2) return false;
    if (!PHONE_RE.test(phone.replace(/\s/g, ''))) return false;
    if (!EMAIL_RE.test(email)) return false;
    if (validateGovtId(govtIdType, govtIdValue) !== null) return false;
    return true;
  }

  function canProceed(): boolean {
    if (step === 'vehicle') return !!selectedVin;
    if (step === 'customer') return isCustomerValid();
    if (step === 'datetime') return !!date && !!outletId;
    return true;
  }

  function handleNext() {
    setError('');
    if (step === 'vehicle') setStep('customer');
    else if (step === 'customer') setStep('datetime');
    else if (step === 'datetime') setStep('review');
  }

  function handleBack() {
    setError('');
    if (step === 'customer') setStep('vehicle');
    else if (step === 'datetime') setStep('customer');
    else if (step === 'review') setStep('datetime');
  }

  function handleSubmit() {
    if (!vehicle) return;
    setSubmitting(true);
    setError('');
    const input: PortalCreateTestDriveInput = {
      customerId,
      customerName: customerFields.name || (customerName ?? 'Portal Customer'),
      customerPhone: customerFields.phone ? `+91${customerFields.phone}` : undefined,
      customerEmail: customerFields.email || undefined,
      vehicleVin: vehicle.vin,
      vehicleMake: vehicle.make,
      vehicleModel: vehicle.model,
      vehicleYear: vehicle.year,
      outletId,
      requestedDate: date,
      requestedSlot: slot,
      notes: notes || undefined,
      governmentIdType: customerFields.govtIdType,
      governmentIdValue: customerFields.govtIdValue || undefined,
    };
    try {
      const booking = createBooking(input);
      setSuccessId(booking.id);
      setStep('success');
    } catch (err) {
      const msg = err instanceof Error && err.message === 'duplicate-active-booking'
        ? t('errorDuplicate')
        : t('errorGeneric');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'success') {
    return <StepSuccess bookingId={successId} />;
  }

  return (
    <div>
      <StepIndicator step={step} />

      {step === 'vehicle' && (
        <StepVehicle selectedVin={selectedVin} onSelect={setSelectedVin} />
      )}
      {step === 'customer' && (
        <StepCustomer fields={customerFields} onChange={setCustomerFields} />
      )}
      {step === 'datetime' && (
        <StepDateTime
          date={date} slot={slot} outletId={outletId}
          onDate={setDate} onSlot={setSlot} onOutlet={setOutletId}
        />
      )}
      {step === 'review' && (
        <StepReview
          vin={selectedVin} date={date} slot={slot} outletId={outletId}
          notes={notes} onNotes={setNotes} customer={customerFields}
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
            className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
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
            {submitting ? t('booking') : t('confirmBooking')}
          </button>
        )}
      </div>
    </div>
  );
}
