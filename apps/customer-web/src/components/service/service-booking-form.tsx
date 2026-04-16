'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BookingFormData {
  name: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  serviceType: string;
  preferredDate: string;
  city: string;
}

type FormState = 'idle' | 'loading' | 'success';

// ─── Constants ─────────────────────────────────────────────────────────────────

const VEHICLE_MAKES = [
  'Porsche',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Land Rover',
  'Jaguar',
  'Volvo',
  'Maserati',
  'Bentley',
  'Rolls-Royce',
  'Other',
];

const SERVICE_TYPES = [
  'Annual Service',
  'Master Inspection',
  'Aesthetic Detailing',
  'Mechanical Repair',
  'Pre-Purchase Inspection',
  'Accessory Installation',
];

const CITIES = ['Bangalore', 'Mumbai', 'Chennai'];

// ─── Input classes ─────────────────────────────────────────────────────────────

const inputClass = cn(
  'w-full rounded-sm border border-line bg-bg-elevated px-4 py-3',
  'font-sans text-sm text-ink-primary',
  'focus:border-accent focus:outline-none',
  'disabled:opacity-50',
  'transition-colors motion-safe:duration-200',
);

// ─── Service Booking Form ──────────────────────────────────────────────────────

export function ServiceBookingForm() {
  const t = useTranslations('service');

  const [formState, setFormState] = React.useState<FormState>('idle');
  const [successVisible, setSuccessVisible] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof BookingFormData, string>>>({});

  const [data, setData] = React.useState<BookingFormData>({
    name: '',
    phone: '',
    vehicleMake: '',
    vehicleModel: '',
    serviceType: '',
    preferredDate: '',
    city: '',
  });

  function update(field: keyof BookingFormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};
    if (!data.name.trim()) newErrors.name = t('booking.required');
    if (!data.phone.trim()) newErrors.phone = t('booking.required');
    if (!data.vehicleMake) newErrors.vehicleMake = t('booking.required');
    if (!data.serviceType) newErrors.serviceType = t('booking.required');
    if (!data.preferredDate) newErrors.preferredDate = t('booking.required');
    if (!data.city) newErrors.city = t('booking.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setFormState('loading');
    // Simulate a network call
    await new Promise((resolve) => setTimeout(resolve, 600));
    setFormState('success');
    setSuccessVisible(true);
    setData({
      name: '',
      phone: '',
      vehicleMake: '',
      vehicleModel: '',
      serviceType: '',
      preferredDate: '',
      city: '',
    });
  }

  return (
    <section
      id="service-booking"
      aria-label="Book a service"
      className="px-6 py-16 md:px-12 md:py-20 lg:px-24"
    >
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 font-display text-3xl">
          {t('booking.heading')}
        </h2>

        {/* Success message */}
        {successVisible && (
          <div
            role="status"
            aria-live="polite"
            className="mb-8 rounded-sm border border-accent/30 bg-accent/5 px-5 py-4"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              {t('booking.successMessage')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="svc-name"
              className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
            >
              {t('booking.name')}
            </label>
            <input
              id="svc-name"
              type="text"
              autoComplete="name"
              value={data.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={formState === 'loading'}
              className={inputClass}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'svc-name-err' : undefined}
            />
            {errors.name && (
              <p id="svc-name-err" role="alert" className="mt-1 font-mono text-[10px] text-danger">
                {errors.name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="svc-phone"
              className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
            >
              {t('booking.phone')}
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-sm border border-r-0 border-line bg-bg-hover px-3 font-mono text-sm text-ink-muted">
                +91
              </span>
              <input
                id="svc-phone"
                type="tel"
                autoComplete="tel"
                value={data.phone}
                onChange={(e) => update('phone', e.target.value)}
                disabled={formState === 'loading'}
                className={cn(inputClass, 'rounded-l-none')}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'svc-phone-err' : undefined}
              />
            </div>
            {errors.phone && (
              <p id="svc-phone-err" role="alert" className="mt-1 font-mono text-[10px] text-danger">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Vehicle Make + Model row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="svc-make"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('booking.vehicleMake')}
              </label>
              <select
                id="svc-make"
                value={data.vehicleMake}
                onChange={(e) => update('vehicleMake', e.target.value)}
                disabled={formState === 'loading'}
                className={inputClass}
                aria-invalid={!!errors.vehicleMake}
              >
                <option value="">{t('booking.select')}</option>
                {VEHICLE_MAKES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {errors.vehicleMake && (
                <p role="alert" className="mt-1 font-mono text-[10px] text-danger">
                  {errors.vehicleMake}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="svc-model"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('booking.vehicleModel')}
              </label>
              <input
                id="svc-model"
                type="text"
                placeholder="e.g. 911 Carrera"
                value={data.vehicleModel}
                onChange={(e) => update('vehicleModel', e.target.value)}
                disabled={formState === 'loading'}
                className={inputClass}
              />
            </div>
          </div>

          {/* Service type */}
          <div>
            <label
              htmlFor="svc-type"
              className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
            >
              {t('booking.serviceType')}
            </label>
            <select
              id="svc-type"
              value={data.serviceType}
              onChange={(e) => update('serviceType', e.target.value)}
              disabled={formState === 'loading'}
              className={inputClass}
              aria-invalid={!!errors.serviceType}
            >
              <option value="">{t('booking.select')}</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.serviceType && (
              <p role="alert" className="mt-1 font-mono text-[10px] text-danger">
                {errors.serviceType}
              </p>
            )}
          </div>

          {/* Date + City row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="svc-date"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('booking.preferredDate')}
              </label>
              <input
                id="svc-date"
                type="date"
                value={data.preferredDate}
                onChange={(e) => update('preferredDate', e.target.value)}
                disabled={formState === 'loading'}
                className={inputClass}
                aria-invalid={!!errors.preferredDate}
              />
              {errors.preferredDate && (
                <p role="alert" className="mt-1 font-mono text-[10px] text-danger">
                  {errors.preferredDate}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="svc-city"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('booking.city')}
              </label>
              <select
                id="svc-city"
                value={data.city}
                onChange={(e) => update('city', e.target.value)}
                disabled={formState === 'loading'}
                className={inputClass}
                aria-invalid={!!errors.city}
              >
                <option value="">{t('booking.select')}</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.city && (
                <p role="alert" className="mt-1 font-mono text-[10px] text-danger">
                  {errors.city}
                </p>
              )}
            </div>
          </div>

          {/* Consent */}
          <p className="font-mono text-[10px] leading-relaxed text-ink-muted">
            {t('booking.consent')}
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={formState === 'loading'}
            className={cn(
              'rounded-full bg-accent px-10 py-4',
              'font-mono text-xs uppercase tracking-widest text-white',
              'hover:bg-accent-hover transition-colors motion-safe:duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          >
            {formState === 'loading' ? t('booking.submitting') : t('booking.submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
