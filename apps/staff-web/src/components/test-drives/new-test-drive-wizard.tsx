'use client';

/**
 * NewTestDriveWizard — staff-initiated multi-vehicle test drive booking form.
 *
 * Step 0 — Customer: existing search OR new walk-in form (DPDP consent required).
 * Step 1 — Vehicles: multi-select (up to MAX_VEHICLES); pre-selectable via ?vehicleVin=.
 * Step 2 — Schedule: per-vehicle date / slot / outlet card; collision guard.
 * Step 3 — Review + Notes: summary table, shared notes, confirm N bookings.
 *
 * On submit: loops createBooking() once per VIN via Seam 44.
 * Partial failures: kept successful bookings, toast lists failed VINs.
 *
 * PRE-FLIGHT UI CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 * 1. text-xs/sm/base/lg/xl/2xl only — no text-[NNpx].
 * 2. rounded-md only — no oversized radius classes.
 * 3. All hooks before any conditional return.
 * 4. Zustand: ONE base ref per selector call; computation in useMemo.
 * 5. i18n via useTranslations('testDrives.new').
 */

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Car,
  CalendarCheck,
  StickyNote,
  UserPlus,
  CheckSquare,
  Square,
} from 'lucide-react';
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

const MAX_VEHICLES = 5;

const SLOTS: { value: TestDriveSlot; label: string }[] = [
  { value: 'MORNING', label: 'Morning (9:00–12:00)' },
  { value: 'AFTERNOON', label: 'Afternoon (12:00–17:00)' },
  { value: 'EVENING', label: 'Evening (17:00–20:00)' },
  { value: 'FULL_DAY', label: 'Full Day' },
];

const OUTLETS = [
  { value: 'bangalore', label: 'Bangalore — BLR-01', city: 'bangalore' },
  { value: 'mumbai', label: 'Mumbai — MUM-01', city: 'mumbai' },
  { value: 'chennai', label: 'Chennai — CHE-01', city: 'chennai' },
];

const STEPS = [
  { id: 'customer', label: 'Customer' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'review', label: 'Review' },
];

// Phone validation: +91 prefix, 10-digit mobile
const PHONE_RE = /^\+91[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Per-vehicle schedule entry ─────────────────────────────────────────────

export interface VehicleSchedule {
  date: string;
  slot: TestDriveSlot;
  outlet: string;
}

// ─── New-customer form state ─────────────────────────────────────────────────

interface NewCustomerForm {
  name: string;
  phone: string;
  email: string;
  preferredCity: 'bangalore' | 'mumbai' | 'chennai';
  dpdpConsent: boolean;
}

const EMPTY_NC: NewCustomerForm = {
  name: '',
  phone: '+91',
  email: '',
  preferredCity: 'bangalore',
  dpdpConsent: false,
};

// ─── Selected customer ────────────────────────────────────────────────────────

interface ResolvedCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  isNew: boolean;
  preferredCity?: string;
}

// ─── Input style helper ─────────────────────────────────────────────────────

const icls = (err?: boolean) =>
  cn(
    'h-9 w-full rounded-md border bg-bg-subtle px-3 text-sm text-ink-primary',
    'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
    'placeholder:text-ink-muted',
    err ? 'border-state-danger' : 'border-line',
  );

// ─── Step 0: Customer ────────────────────────────────────────────────────────

interface Step0Props {
  resolved: ResolvedCustomer | null;
  onResolved: (c: ResolvedCustomer | null) => void;
}

function StepCustomer({ resolved, onResolved }: Step0Props) {
  const t = useTranslations('testDrives.new');

  const customersMap = useCustomersStore((s) => s.customers);
  const customers = React.useMemo(() => Object.values(customersMap), [customersMap]);

  const [tab, setTab] = React.useState<'existing' | 'new'>('existing');
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [nc, setNc] = React.useState<NewCustomerForm>(EMPTY_NC);
  const [ncErrors, setNcErrors] = React.useState<Partial<Record<keyof NewCustomerForm, string>>>({});

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

  function validateNc(): boolean {
    const errs: Partial<Record<keyof NewCustomerForm, string>> = {};
    if (!nc.name || nc.name.trim().length < 2) errs.name = t('nameError');
    if (!PHONE_RE.test(nc.phone)) errs.phone = t('phoneError');
    if (!EMAIL_RE.test(nc.email)) errs.email = t('emailError');
    if (!nc.dpdpConsent) errs.dpdpConsent = t('dpdpConsentRequired');
    setNcErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNewCustomerContinue() {
    if (!validateNc()) return;
    try {
      const customer = useCustomersStore.getState().createCustomer(
        {
          name: nc.name.trim(),
          phone: nc.phone.trim(),
          email: nc.email.trim(),
          preferredCity: nc.preferredCity,
          dpdpConsentGivenAt: new Date().toISOString(),
        },
        { id: 'staff-wizard', name: 'Staff Wizard' },
      );
      onResolved({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? nc.email.trim(),
        isNew: true,
        preferredCity: customer.preferredCity,
      });
    } catch (e) {
      // Idempotency — if createCustomer returns existing record, handle gracefully
      // (store never throws on idempotent match; only future DB layer would throw)
      setNcErrors({ phone: t('duplicatePhoneError') });
    }
  }

  if (resolved) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-ink-primary mb-2">{t('customerLabel')}</p>
        <div className="flex items-center justify-between border border-accent rounded-md px-3 py-2 bg-bg-subtle">
          <div className="flex items-center gap-2">
            <User size={14} className="text-ink-muted shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-ink-primary">{resolved.name}</p>
                {resolved.isNew && (
                  <span className="inline-flex items-center rounded-md border border-accent px-1.5 py-0.5 text-xs font-medium text-accent">
                    {t('newCustomerCreatedBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-secondary">{resolved.phone}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-xs text-accent hover:underline"
            onClick={() => onResolved(null)}
          >
            {t('changeLabel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tab toggle */}
      <div className="flex border border-line rounded-md overflow-hidden">
        <button
          type="button"
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors',
            tab === 'existing'
              ? 'bg-accent text-white'
              : 'bg-bg-subtle text-ink-secondary hover:text-ink-primary',
          )}
          onClick={() => setTab('existing')}
        >
          <User size={13} />
          {t('existingCustomerTab')}
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors',
            tab === 'new'
              ? 'bg-accent text-white'
              : 'bg-bg-subtle text-ink-secondary hover:text-ink-primary',
          )}
          onClick={() => setTab('new')}
        >
          <UserPlus size={13} />
          {t('newCustomerTab')}
        </button>
      </div>

      {/* Existing customer search */}
      {tab === 'existing' && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder={t('customerSearchPlaceholder')}
            className={icls()}
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          <ul className="border border-line rounded-md divide-y divide-line max-h-52 overflow-y-auto">
            {filteredCustomers.length === 0 && (
              <li className="px-3 py-2 text-xs text-ink-muted">{t('noCustomersFound')}</li>
            )}
            {filteredCustomers.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-bg-subtle transition-colors"
                  onClick={() =>
                    onResolved({
                      id: c.id,
                      name: c.name,
                      phone: c.phone,
                      email: c.email ?? '',
                      isNew: false,
                      preferredCity: c.preferredCity,
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

      {/* New customer form */}
      {tab === 'new' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink-primary">{t('newCustomerHeading')}</p>
            <p className="text-xs text-ink-secondary mt-0.5">{t('newCustomerSubtitle')}</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              {t('nameLabel')} <span className="text-state-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ravi Sharma"
              className={icls(!!ncErrors.name)}
              value={nc.name}
              onChange={(e) => setNc({ ...nc, name: e.target.value })}
            />
            {ncErrors.name && (
              <p className="text-xs text-state-danger mt-0.5">{ncErrors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              {t('phoneLabel')} <span className="text-state-danger">*</span>
            </label>
            <input
              type="tel"
              placeholder="+919876543210"
              className={icls(!!ncErrors.phone)}
              value={nc.phone}
              onChange={(e) => setNc({ ...nc, phone: e.target.value })}
            />
            {ncErrors.phone && (
              <p className="text-xs text-state-danger mt-0.5">{ncErrors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              {t('emailLabel')} <span className="text-state-danger">*</span>
            </label>
            <input
              type="email"
              placeholder="ravi@example.com"
              className={icls(!!ncErrors.email)}
              value={nc.email}
              onChange={(e) => setNc({ ...nc, email: e.target.value })}
            />
            {ncErrors.email && (
              <p className="text-xs text-state-danger mt-0.5">{ncErrors.email}</p>
            )}
          </div>

          {/* Preferred city */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              {t('preferredCityLabel')}
            </label>
            <select
              className={icls()}
              value={nc.preferredCity}
              onChange={(e) =>
                setNc({
                  ...nc,
                  preferredCity: e.target.value as NewCustomerForm['preferredCity'],
                })
              }
            >
              <option value="bangalore">Bangalore</option>
              <option value="mumbai">Mumbai</option>
              <option value="chennai">Chennai</option>
            </select>
          </div>

          {/* DPDP consent */}
          <div className="space-y-1">
            <label
              className={cn(
                'flex items-start gap-2 cursor-pointer',
                ncErrors.dpdpConsent ? 'text-state-danger' : 'text-ink-secondary',
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 shrink-0 accent-accent"
                checked={nc.dpdpConsent}
                onChange={(e) => setNc({ ...nc, dpdpConsent: e.target.checked })}
              />
              <span className="text-xs leading-relaxed">{t('dpdpConsentLabel')}</span>
            </label>
            {ncErrors.dpdpConsent && (
              <p className="text-xs text-state-danger">{ncErrors.dpdpConsent}</p>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleNewCustomerContinue}
            className="w-full"
          >
            {t('newCustomerTab')} →
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Vehicle multi-select ─────────────────────────────────────────────

interface Step1Props {
  selectedVins: Set<string>;
  onToggle: (vin: string) => void;
}

function StepVehicles({ selectedVins, onToggle }: Step1Props) {
  const t = useTranslations('testDrives.new');

  const vehiclesMap = useVehiclesStore((s) => s.vehicles);
  const [vehicleSearch, setVehicleSearch] = React.useState('');

  // VehicleMaster does not carry a listing status — all VINs in the
  // vehicles store are BN-owned and available for test-drive scheduling.
  const bookableVehicles = React.useMemo(
    () => Object.values(vehiclesMap),
    [vehiclesMap],
  );

  const filteredVehicles = React.useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return bookableVehicles.slice(0, 20);
    return bookableVehicles
      .filter(
        (v) =>
          v.vin.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          String(v.year).includes(q),
      )
      .slice(0, 20);
  }, [bookableVehicles, vehicleSearch]);

  const count = selectedVins.size;
  const atMax = count >= MAX_VEHICLES;

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-primary">
          {t('selectedVehiclesCount', { count })}
        </p>
        {atMax && (
          <p className="text-xs text-ink-muted">{t('maxVehiclesNote', { max: MAX_VEHICLES })}</p>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder={t('vehicleSearchPlaceholder')}
        className={icls()}
        value={vehicleSearch}
        onChange={(e) => setVehicleSearch(e.target.value)}
      />

      {/* List */}
      <ul className="border border-line rounded-md divide-y divide-line max-h-72 overflow-y-auto">
        {filteredVehicles.length === 0 && (
          <li className="px-3 py-2 text-xs text-ink-muted">{t('noVehiclesFound')}</li>
        )}
        {filteredVehicles.map((v) => {
          const checked = selectedVins.has(v.vin);
          const disabled = atMax && !checked;
          return (
            <li key={v.vin}>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors',
                  checked ? 'bg-accent/5' : 'hover:bg-bg-subtle',
                  disabled && 'opacity-40 cursor-not-allowed',
                )}
                onClick={() => !disabled && onToggle(v.vin)}
              >
                <span className="shrink-0 text-accent">
                  {checked ? <CheckSquare size={16} /> : <Square size={16} className="text-ink-muted" />}
                </span>
                <span className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-primary truncate">
                    {v.year} {v.make} {v.model}
                  </p>
                  <p className="text-xs font-mono text-ink-muted">{v.vin}</p>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {count === 0 && (
        <p className="text-xs text-ink-muted text-center">{t('noVehiclesSelected')}</p>
      )}
    </div>
  );
}

// ─── Step 2: Per-vehicle schedule ─────────────────────────────────────────────

interface Step2Props {
  selectedVins: Set<string>;
  schedules: Record<string, VehicleSchedule>;
  defaultOutlet: string;
  onUpdateSchedule: (vin: string, s: VehicleSchedule) => void;
}

function StepSchedule({ selectedVins, schedules, defaultOutlet, onUpdateSchedule }: Step2Props) {
  const t = useTranslations('testDrives.new');

  const vehiclesMap = useVehiclesStore((s) => s.vehicles);

  const tomorrow = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0]!;
  }, []);

  // Collision detection: same date+slot+outlet across multiple VINs in this submission
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
    <div className="space-y-4">
      {vins.map((vin) => {
        const vehicle = vehiclesMap[vin];
        const label = vehicle
          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
          : vin;

        const sched = schedules[vin] ?? { date: '', slot: 'MORNING' as TestDriveSlot, outlet: defaultOutlet };
        const collision = getCollision(vin);

        return (
          <div key={vin} className="border border-line rounded-md p-4 space-y-3">
            {/* Vehicle header */}
            <div className="flex items-center gap-2">
              <Car size={14} className="text-ink-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-primary truncate">{label}</p>
                <p className="text-xs font-mono text-ink-muted">{vin}</p>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">
                {t('dateLabel')} <span className="text-state-danger">*</span>
              </label>
              <input
                type="date"
                min={tomorrow}
                value={sched.date}
                onChange={(e) => onUpdateSchedule(vin, { ...sched, date: e.target.value })}
                className={icls(!sched.date)}
              />
            </div>

            {/* Slot */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">
                {t('slotLabel')}
              </label>
              <select
                value={sched.slot}
                onChange={(e) =>
                  onUpdateSchedule(vin, { ...sched, slot: e.target.value as TestDriveSlot })
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

            {/* Outlet */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">
                {t('outletLabel')}
              </label>
              <select
                value={sched.outlet}
                onChange={(e) => onUpdateSchedule(vin, { ...sched, outlet: e.target.value })}
                className={icls()}
              >
                {OUTLETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Collision error */}
            {collision && (
              <p className="text-xs text-state-danger">{collision}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 3: Review + Notes ──────────────────────────────────────────────────

interface Step3Props {
  customer: ResolvedCustomer;
  selectedVins: Set<string>;
  schedules: Record<string, VehicleSchedule>;
  notes: string;
  onNotesChange: (n: string) => void;
  submitting: boolean;
}

function StepReview({
  customer,
  selectedVins,
  schedules,
  notes,
  onNotesChange,
  submitting,
}: Step3Props) {
  const t = useTranslations('testDrives.new');

  const vehiclesMap = useVehiclesStore((s) => s.vehicles);
  const vins = Array.from(selectedVins);

  return (
    <div className="space-y-5">
      {/* Customer summary */}
      <div className="border border-line rounded-md p-4">
        <div className="flex items-start gap-3">
          <User size={14} className="text-ink-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-widest font-mono mb-0.5">
              {t('customerLabel')}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-ink-primary">{customer.name}</p>
              {customer.isNew && (
                <span className="inline-flex items-center rounded-md border border-accent px-1.5 py-0.5 text-xs font-medium text-accent">
                  {t('newCustomerCreatedBadge')}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-secondary">{customer.phone}</p>
            {customer.email && (
              <p className="text-xs text-ink-secondary">{customer.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Booking entries */}
      <div className="border border-line rounded-md divide-y divide-line">
        {vins.map((vin) => {
          const vehicle = vehiclesMap[vin];
          const label = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vin;
          const sched = schedules[vin];
          const slotLabel =
            SLOTS.find((s) => s.value === sched?.slot)?.label ?? sched?.slot ?? '—';
          const outletLabel =
            OUTLETS.find((o) => o.value === sched?.outlet)?.label ?? sched?.outlet ?? '—';

          return (
            <div key={vin} className="px-4 py-3 flex items-start gap-3">
              <CalendarCheck size={14} className="text-ink-muted mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-primary truncate">{label}</p>
                <p className="text-xs font-mono text-ink-muted">{vin}</p>
                {sched && (
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {sched.date} · {slotLabel} · {outletLabel}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shared notes */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary mb-1">
          <StickyNote size={14} className="text-ink-muted" />
          {t('notesLabel')}
        </label>
        <textarea
          rows={3}
          placeholder={t('notesPlaceholder')}
          value={notes}
          disabled={submitting}
          onChange={(e) => onNotesChange(e.target.value)}
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

  // ── All hooks first (Rules of Hooks) ────────────────────────────────────
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  const prefillCustomerId = searchParams.get('customerId') ?? '';
  const prefillVin = searchParams.get('vehicleVin') ?? '';

  const customersMap = useCustomersStore((s) => s.customers);
  const vehiclesMap = useVehiclesStore((s) => s.vehicles);

  // Resolved customer — either selected existing or newly created
  const [customer, setCustomer] = React.useState<ResolvedCustomer | null>(() => {
    if (!prefillCustomerId) return null;
    const c = customersMap[prefillCustomerId];
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email ?? '',
      isNew: false,
      preferredCity: c.preferredCity,
    };
  });

  // Multi-select VINs
  const [selectedVins, setSelectedVins] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    // VehicleMaster has no listing status — any VIN in the store is bookable
    if (prefillVin && vehiclesMap[prefillVin]) {
      initial.add(prefillVin);
    }
    return initial;
  });

  // Per-vehicle schedules
  const defaultOutlet = React.useMemo((): string => {
    if (customer?.preferredCity) {
      const match = OUTLETS.find((o) => o.city === customer.preferredCity);
      if (match) return match.value;
    }
    return 'bangalore';
  }, [customer?.preferredCity]);

  const [schedules, setSchedules] = React.useState<Record<string, VehicleSchedule>>({});

  function toggleVin(vin: string) {
    setSelectedVins((prev) => {
      const next = new Set(prev);
      if (next.has(vin)) {
        next.delete(vin);
        // Remove schedule for deselected VIN
        setSchedules((s) => {
          const ns = { ...s };
          delete ns[vin];
          return ns;
        });
      } else if (next.size < MAX_VEHICLES) {
        next.add(vin);
        // Initialise schedule with default outlet
        setSchedules((s) =>
          s[vin]
            ? s
            : {
                ...s,
                [vin]: { date: '', slot: 'MORNING', outlet: defaultOutlet },
              },
        );
      }
      return next;
    });
  }

  function updateSchedule(vin: string, s: VehicleSchedule) {
    setSchedules((prev) => ({ ...prev, [vin]: s }));
  }

  // ── Validation per step ─────────────────────────────────────────────────
  const step0Valid = customer !== null;
  const step1Valid = selectedVins.size > 0;
  const step2Valid = React.useMemo(() => {
    if (!step1Valid) return false;
    return Array.from(selectedVins).every((vin) => {
      const s = schedules[vin];
      return s?.date && s?.slot && s?.outlet;
    });
  }, [selectedVins, schedules, step1Valid]);

  // Collision check — any two VINs with same date+slot+outlet
  const hasCollision = React.useMemo(() => {
    const vins = Array.from(selectedVins);
    for (let i = 0; i < vins.length; i++) {
      for (let j = i + 1; j < vins.length; j++) {
        const a = schedules[vins[i]!];
        const b = schedules[vins[j]!];
        if (a && b && a.date && a.date === b.date && a.slot === b.slot && a.outlet === b.outlet) {
          return true;
        }
      }
    }
    return false;
  }, [selectedVins, schedules]);

  const canNext =
    (step === 0 && step0Valid) ||
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid && !hasCollision) ||
    step === 3;

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (submitting || !customer) return;
    setSubmitting(true);

    const vins = Array.from(selectedVins);
    const failures: string[] = [];

    for (const vin of vins) {
      const sched = schedules[vin];
      if (!sched) continue;

      const vehicle = vehiclesMap[vin];

      try {
        useTestDriveStore.getState().createBooking({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone || undefined,
          customerEmail: customer.email || undefined,
          vehicleVin: vin,
          vehicleMake: vehicle?.make ?? '',
          vehicleModel: vehicle?.model ?? '',
          vehicleYear: vehicle?.year ?? 0,
          outletId: sched.outlet,
          requestedDate: sched.date,
          requestedSlot: sched.slot,
          notes: notes || undefined,
        });
      } catch (e) {
        console.error(`[new-test-drive-wizard] booking failed for VIN ${vin}:`, e);
        failures.push(vin);
      }
    }

    const succeeded = vins.length - failures.length;

    if (failures.length === 0) {
      toast(t('successToast'), 'success');
    } else if (succeeded > 0) {
      toast(t('partialFailureToast', { succeeded, failed: failures.length }), 'error');
    } else {
      toast(t('errorToast'), 'error');
    }

    setTimeout(() => router.push('/test-drives'), 1200);
  }

  // ── Confirm label ─────────────────────────────────────────────────────────
  const confirmLabel = React.useMemo(
    () => t('confirmBookingsCta', { count: selectedVins.size }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedVins.size],
  );

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
        {step === 0 && <StepCustomer resolved={customer} onResolved={setCustomer} />}
        {step === 1 && <StepVehicles selectedVins={selectedVins} onToggle={toggleVin} />}
        {step === 2 && (
          <StepSchedule
            selectedVins={selectedVins}
            schedules={schedules}
            defaultOutlet={defaultOutlet}
            onUpdateSchedule={updateSchedule}
          />
        )}
        {step === 3 && customer && (
          <StepReview
            customer={customer}
            selectedVins={selectedVins}
            schedules={schedules}
            notes={notes}
            onNotesChange={setNotes}
            submitting={submitting}
          />
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

        {step < 3 ? (
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
            disabled={submitting || !step2Valid || !step0Valid}
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {t('submittingLabel')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check size={14} />
                {confirmLabel}
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
