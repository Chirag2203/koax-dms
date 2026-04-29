'use client';

/**
 * Wizard step components for service booking flow.
 *
 * StepVehicle   — Step 1: pick a vehicle
 * StepService   — Step 2: pick a service type
 * StepDateTime  — Step 3: pick a date + slot
 * StepLocation  — Step 4: workshop drop-off or home pickup
 * StepReview    — Step 5: review + concerns
 * BookingSuccess — post-submit confirmation screen
 *
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §8.2, §8.3
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import { Car, CheckCircle2 } from 'lucide-react';
import type { ServiceType } from '@dms/types';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';
import type { WizardFormData } from '@/src/lib/service/service-booking-store';
import type { SubmitResult } from '@/src/lib/service/service-booking-store';
import { SERVICEABLE_CITIES } from './booking-wizard';

// ─── Shared primitive: Section title ─────────────────────────────────────────

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl md:text-3xl text-[var(--color-ink)] leading-tight mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[14px] text-[var(--color-ink-secondary)] leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Step 1: Vehicle picker ───────────────────────────────────────────────────

interface StepVehicleProps {
  vehicles: OwnedVehicleView[];
  selectedVin: string | null;
  onSelect: (vin: string) => void;
}

export function StepVehicle({ vehicles, selectedVin, onSelect }: StepVehicleProps) {
  const t = useTranslations('portal.serviceBooking.book');

  if (vehicles.length === 0) {
    return (
      <div>
        <StepHeader title={t('step1Title')} subtitle={t('step1Subtitle')} />
        <div className="py-16 text-center border border-dashed border-[var(--color-line)]">
          <Car size={36} className="mx-auto mb-4 text-[var(--color-ink-muted)]" strokeWidth={1} />
          <p className="font-display text-lg italic text-[var(--color-ink-secondary)] mb-4">
            {t('noVehiclesTitle')}
          </p>
          <p className="text-[13px] text-[var(--color-ink-muted)] mb-6">
            {t('noVehiclesBody')}
          </p>
          <Link
            href="/vehicles/claim"
            className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            {t('addVehicle')} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader title={t('step1Title')} subtitle={t('step1Subtitle')} />
      <div
        role="radiogroup"
        aria-label={t('step1Title')}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {vehicles.map((v) => {
          const isSelected = v.vin === selectedVin;
          return (
            <button
              key={v.vin}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(v.vin)}
              className={cn(
                'text-left p-4 border transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                isSelected
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/5'
                  : 'border-[var(--color-line)] hover:border-[var(--color-ink-muted)]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-[15px] text-[var(--color-ink)] leading-tight truncate">
                    {v.year} {v.make} {v.model}{v.variant ? ` ${v.variant}` : ''}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--color-ink-muted)] mt-0.5 tracking-widest uppercase">
                    {v.vin}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2
                    size={18}
                    className="text-[var(--color-brass)] shrink-0 mt-0.5"
                    strokeWidth={2}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Service type picker ──────────────────────────────────────────────

interface StepServiceProps {
  serviceTypes: ServiceType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatPrice(min: number): string {
  return `₹${(min / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function StepService({ serviceTypes, selectedId, onSelect }: StepServiceProps) {
  const t = useTranslations('portal.serviceBooking.book');

  return (
    <div>
      <StepHeader title={t('step2Title')} subtitle={t('step2Subtitle')} />
      <div
        role="radiogroup"
        aria-label={t('step2Title')}
        className="grid grid-cols-1 gap-3"
      >
        {serviceTypes.map((st) => {
          const isSelected = st.id === selectedId;
          return (
            <button
              key={st.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(st.id)}
              className={cn(
                'text-left p-4 border transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                isSelected
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/5'
                  : 'border-[var(--color-line)] hover:border-[var(--color-ink-muted)]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-display text-[15px] text-[var(--color-ink)] leading-tight">
                      {st.name}
                    </p>
                    {isSelected && (
                      <CheckCircle2
                        size={15}
                        className="text-[var(--color-brass)] shrink-0"
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <p className="text-[13px] text-[var(--color-ink-secondary)] leading-relaxed line-clamp-2">
                    {st.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[12px] text-[var(--color-brass)] font-semibold whitespace-nowrap">
                    {t('from', { min: (st.priceRange.min / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) })}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--color-ink-muted)] whitespace-nowrap mt-0.5">
                    {t('hours', { n: st.durationHours })}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Date + slot ──────────────────────────────────────────────────────

interface StepDateTimeProps {
  selectedDate: string | null;
  selectedSlot: 'MORNING' | 'AFTERNOON' | null;
  onDateSelect: (date: string) => void;
  onSlotSelect: (slot: 'MORNING' | 'AFTERNOON') => void;
}

function generateDates(): { value: string; label: string; dayLabel: string }[] {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    dates.push({ value, label, dayLabel });
  }
  return dates;
}

export function StepDateTime({ selectedDate, selectedSlot, onDateSelect, onSlotSelect }: StepDateTimeProps) {
  const t = useTranslations('portal.serviceBooking.book');
  const dates = React.useMemo(() => generateDates(), []);

  return (
    <div>
      <StepHeader title={t('step3Title')} subtitle={t('step3Subtitle')} />

      {/* Date strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1"
        role="group"
        aria-label="Select a date"
      >
        {dates.map((d) => {
          const isSelected = d.value === selectedDate;
          return (
            <button
              key={d.value}
              type="button"
              aria-label={`${d.dayLabel} ${d.label}`}
              aria-pressed={isSelected}
              onClick={() => onDateSelect(d.value)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2.5 border shrink-0 min-w-[52px] transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                isSelected
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)] text-white'
                  : 'border-[var(--color-line)] text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-muted)]',
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-widest">
                {d.dayLabel}
              </span>
              <span className="font-display text-[15px] leading-tight">{d.label}</span>
            </button>
          );
        })}
      </div>

      {/* Slot selector */}
      {selectedDate && (
        <div
          role="radiogroup"
          aria-label="Select a time slot"
          className="grid grid-cols-2 gap-3"
        >
          {(['MORNING', 'AFTERNOON'] as const).map((slot) => {
            const isSelected = selectedSlot === slot;
            const label = slot === 'MORNING' ? t('morning') : t('afternoon');
            const time = slot === 'MORNING' ? t('morningTime') : t('afternoonTime');
            return (
              <button
                key={slot}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSlotSelect(slot)}
                className={cn(
                  'p-4 border text-left transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                  isSelected
                    ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/5'
                    : 'border-[var(--color-line)] hover:border-[var(--color-ink-muted)]',
                )}
              >
                <p className="font-display text-[15px] text-[var(--color-ink)]">{label}</p>
                <p className="font-mono text-[11px] text-[var(--color-ink-muted)] mt-0.5">{time}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Location ─────────────────────────────────────────────────────────

interface StepLocationProps {
  pickupMode: 'WORKSHOP_DROP' | 'HOME_PICKUP';
  pickupAddress: WizardFormData['pickupAddress'];
  onModeChange: (mode: 'WORKSHOP_DROP' | 'HOME_PICKUP') => void;
  onAddressChange: (addr: WizardFormData['pickupAddress']) => void;
}

export function StepLocation({ pickupMode, pickupAddress, onModeChange, onAddressChange }: StepLocationProps) {
  const t = useTranslations('portal.serviceBooking.book');

  const [localAddr, setLocalAddr] = React.useState(
    pickupAddress ?? { line1: '', line2: '', city: '', pinCode: '' },
  );
  const [pinError, setPinError] = React.useState<string | null>(null);

  function handleAddrChange(field: keyof NonNullable<WizardFormData['pickupAddress']>, value: string) {
    const next = { ...localAddr, [field]: value };
    setLocalAddr(next);

    // Validate PIN serviceability
    if (field === 'pinCode' || field === 'city') {
      const city = field === 'city' ? value : localAddr.city;
      const pin = field === 'pinCode' ? value : localAddr.pinCode;
      if (pin && /^\d{6}$/.test(pin)) {
        const serviceable = SERVICEABLE_CITIES.some((c) =>
          city.toLowerCase().includes(c.toLowerCase()),
        );
        setPinError(serviceable ? null : t('pinNotServiceable'));
      } else {
        setPinError(null);
      }
    }

    // Only update parent if all required fields are set and valid
    if (next.line1 && next.city && /^\d{6}$/.test(next.pinCode)) {
      const cityServiceable = SERVICEABLE_CITIES.some((c) =>
        next.city.toLowerCase().includes(c.toLowerCase()),
      );
      if (cityServiceable) {
        onAddressChange(next);
      } else {
        onAddressChange(null);
      }
    } else {
      onAddressChange(null);
    }
  }

  return (
    <div>
      <StepHeader title={t('step4Title')} subtitle={t('step4Subtitle')} />

      {/* Mode toggle */}
      <div
        role="radiogroup"
        aria-label="Pickup mode"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"
      >
        {(['WORKSHOP_DROP', 'HOME_PICKUP'] as const).map((mode) => {
          const isSelected = pickupMode === mode;
          const label = mode === 'WORKSHOP_DROP' ? t('workshopDrop') : t('homePick');
          const desc = mode === 'WORKSHOP_DROP' ? t('workshopDropDesc') : t('homePickDesc');
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onModeChange(mode)}
              className={cn(
                'text-left p-4 border transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
                isSelected
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/5'
                  : 'border-[var(--color-line)] hover:border-[var(--color-ink-muted)]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-[15px] text-[var(--color-ink)]">{label}</p>
                  <p className="text-[12px] text-[var(--color-ink-muted)] mt-1 leading-relaxed">{desc}</p>
                </div>
                {isSelected && (
                  <CheckCircle2 size={16} className="text-[var(--color-brass)] shrink-0 mt-0.5" strokeWidth={2} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Workshop address */}
      {pickupMode === 'WORKSHOP_DROP' && (
        <div className="p-4 border border-[var(--color-line)] bg-[var(--color-bg-paper)]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
            Workshop Address
          </p>
          <p className="text-[14px] text-[var(--color-ink-secondary)] leading-relaxed">
            {t('outletAddress')}
          </p>
        </div>
      )}

      {/* Home pickup address form */}
      {pickupMode === 'HOME_PICKUP' && (
        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-secondary)] mb-1" htmlFor="addr-line1">
              {t('addressLine1')} *
            </label>
            <input
              id="addr-line1"
              type="text"
              autoComplete="address-line1"
              value={localAddr.line1}
              onChange={(e) => handleAddrChange('line1', e.target.value)}
              className="w-full border border-[var(--color-line)] bg-transparent px-3 py-2 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-brass)]"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-secondary)] mb-1" htmlFor="addr-line2">
              {t('addressLine2')}
            </label>
            <input
              id="addr-line2"
              type="text"
              autoComplete="address-line2"
              value={localAddr.line2}
              onChange={(e) => handleAddrChange('line2', e.target.value)}
              className="w-full border border-[var(--color-line)] bg-transparent px-3 py-2 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-brass)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-secondary)] mb-1" htmlFor="addr-city">
                {t('addressCity')} *
              </label>
              <input
                id="addr-city"
                type="text"
                autoComplete="address-level2"
                value={localAddr.city}
                onChange={(e) => handleAddrChange('city', e.target.value)}
                className="w-full border border-[var(--color-line)] bg-transparent px-3 py-2 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-brass)]"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-secondary)] mb-1" htmlFor="addr-pin">
                {t('addressPin')} *
              </label>
              <input
                id="addr-pin"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={localAddr.pinCode}
                onChange={(e) => handleAddrChange('pinCode', e.target.value.replace(/\D/g, ''))}
                className={cn(
                  'w-full border bg-transparent px-3 py-2 text-[14px] text-[var(--color-ink)] focus:outline-none',
                  pinError
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[var(--color-line)] focus:border-[var(--color-brass)]',
                )}
                aria-describedby={pinError ? 'pin-error' : undefined}
              />
              {pinError && (
                <p id="pin-error" role="alert" className="mt-1 text-[12px] text-red-600 font-mono">
                  {pinError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Review + concerns ────────────────────────────────────────────────

interface StepReviewProps {
  formData: WizardFormData;
  selectedVehicle: OwnedVehicleView | null;
  selectedService: ServiceType | null;
  onConcernsChange: (text: string) => void;
}

export function StepReview({ formData, selectedVehicle, selectedService, onConcernsChange }: StepReviewProps) {
  const t = useTranslations('portal.serviceBooking.book');

  const slotLabel = formData.selectedSlot === 'MORNING' ? t('morningTime') : t('afternoonTime');
  const locationLabel =
    formData.pickupMode === 'WORKSHOP_DROP'
      ? t('workshopDrop')
      : `${t('homePick')} — ${formData.pickupAddress?.city ?? ''}`;

  const vehicleLabel = selectedVehicle
    ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}${selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ''}`
    : formData.selectedVin ?? '—';

  const rows = [
    { key: 'reviewVehicle', value: vehicleLabel },
    { key: 'reviewService', value: selectedService?.name ?? formData.selectedServiceTypeId ?? '—' },
    { key: 'reviewDate', value: formData.selectedDate ?? '—' },
    { key: 'reviewSlot', value: slotLabel },
    { key: 'reviewLocation', value: locationLabel },
  ] as const;

  return (
    <div>
      <StepHeader title={t('step5Title')} subtitle={t('step5Subtitle')} />

      {/* Summary table */}
      <div className="border border-[var(--color-line)] divide-y divide-[var(--color-line)] mb-6">
        {rows.map(({ key, value }) => (
          <div key={key} className="flex items-start gap-4 px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] w-24 shrink-0 pt-0.5">
              {t(key as Parameters<typeof t>[0])}
            </span>
            <span className="text-[14px] text-[var(--color-ink)] leading-relaxed">{value}</span>
          </div>
        ))}
      </div>

      {/* Concerns field */}
      <div>
        <label
          htmlFor="concerns"
          className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-secondary)] mb-2"
        >
          {t('reviewConcerns')}
        </label>
        <textarea
          id="concerns"
          rows={3}
          maxLength={500}
          placeholder={t('concernsPlaceholder')}
          value={formData.concerns}
          onChange={(e) => onConcernsChange(e.target.value)}
          className="w-full border border-[var(--color-line)] bg-transparent px-3 py-2 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-brass)] resize-none"
        />
        <p className="mt-1 text-[11px] text-[var(--color-ink-muted)] font-mono text-right">
          {formData.concerns.length}/500
        </p>
      </div>
    </div>
  );
}

// ─── Booking success screen ───────────────────────────────────────────────────

interface BookingSuccessProps {
  result: SubmitResult;
  onReset: () => void;
}

export function BookingSuccess({ result, onReset }: BookingSuccessProps) {
  const t = useTranslations('portal.serviceBooking.book');

  return (
    <div className="py-12 text-center max-w-lg mx-auto">
      <CheckCircle2
        size={48}
        className="mx-auto mb-6 text-[var(--color-brass)]"
        strokeWidth={1.5}
      />
      <h2 className="font-display text-3xl text-[var(--color-ink)] mb-3">
        {t('successTitle')}
      </h2>
      <p className="text-[14px] text-[var(--color-ink-secondary)] leading-relaxed mb-6">
        {t('successSubtitle', { jobNo: result.jobNo })}
      </p>

      <div className="border border-[var(--color-line)] p-4 mb-8 text-left space-y-2">
        <p className="font-mono text-[12px] text-[var(--color-ink-secondary)]">
          {t('successDate', { date: result.scheduledDate })}
        </p>
        <p className="font-mono text-[12px] text-[var(--color-ink-secondary)]">
          {t('successService', { service: result.serviceTypeName })}
        </p>
        <p className="font-mono text-[12px] text-[var(--color-brass)] font-semibold">
          REF: {result.jobNo}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/service/bookings"
          className="block px-6 py-2.5 bg-[var(--color-brass)] text-white font-mono text-[12px] uppercase tracking-widest hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          {t('viewBookings')}
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-2.5 border border-[var(--color-line)] text-[var(--color-ink-secondary)] font-mono text-[12px] uppercase tracking-widest hover:bg-[var(--color-bg-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          {t('bookAnother')}
        </button>
      </div>
    </div>
  );
}
