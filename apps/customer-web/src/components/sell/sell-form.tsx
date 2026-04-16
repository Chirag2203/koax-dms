'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SellFormData {
  // Vehicle details
  make: string;
  model: string;
  year: string;
  kilometres: string;
  condition: string;
  vehicleCity: string;
  // Contact details
  fullName: string;
  phone: string;
  email: string;
  contactMethod: string;
  notes: string;
}

type FormState = 'idle' | 'loading' | 'success';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAKES = [
  'Porsche',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Land Rover',
  'Jaguar',
  'Volvo',
  'Other',
];

const YEARS = Array.from({ length: 8 }, (_, i) => String(2025 - i));

const CONDITIONS = ['Excellent', 'Good', 'Fair'];

const CITIES = ['Bangalore', 'Mumbai', 'Chennai'];

const CONTACT_METHODS = ['WhatsApp', 'Phone', 'Email'];

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputClass = cn(
  'w-full rounded-sm border border-line bg-bg-elevated px-4 py-3',
  'font-sans text-sm text-ink-primary',
  'focus:border-accent focus:outline-none',
  'disabled:opacity-50',
  'transition-colors motion-safe:duration-200',
);

// ─── Sell Form ────────────────────────────────────────────────────────────────

export function SellForm() {
  const t = useTranslations('sell');

  const [formState, setFormState] = React.useState<FormState>('idle');
  const [successVisible, setSuccessVisible] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof SellFormData, string>>>({});

  const [data, setData] = React.useState<SellFormData>({
    make: '',
    model: '',
    year: '',
    kilometres: '',
    condition: '',
    vehicleCity: '',
    fullName: '',
    phone: '',
    email: '',
    contactMethod: '',
    notes: '',
  });

  function update(field: keyof SellFormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof SellFormData, string>> = {};
    const req = t('form.required');
    if (!data.make) newErrors.make = req;
    if (!data.model.trim()) newErrors.model = req;
    if (!data.year) newErrors.year = req;
    if (!data.kilometres.trim()) newErrors.kilometres = req;
    if (!data.condition) newErrors.condition = req;
    if (!data.vehicleCity) newErrors.vehicleCity = req;
    if (!data.fullName.trim()) newErrors.fullName = req;
    if (!data.phone.trim()) newErrors.phone = req;
    if (!data.email.trim()) newErrors.email = req;
    if (!data.contactMethod) newErrors.contactMethod = req;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setFormState('loading');
    await new Promise((resolve) => setTimeout(resolve, 700));
    setFormState('success');
    setSuccessVisible(true);
    setData({
      make: '',
      model: '',
      year: '',
      kilometres: '',
      condition: '',
      vehicleCity: '',
      fullName: '',
      phone: '',
      email: '',
      contactMethod: '',
      notes: '',
    });
  }

  const isLoading = formState === 'loading';

  return (
    <section
      aria-label="Sell your car form"
      className="px-6 py-16 md:px-12 md:py-20 lg:px-24"
    >
      <div className="mx-auto max-w-2xl">
        {/* Success message */}
        {successVisible && (
          <div
            role="status"
            aria-live="polite"
            className="mb-10 rounded-sm border border-accent/30 bg-accent/5 px-5 py-4"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              {t('form.successMessage')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Vehicle details ──────────────────────────────────────────── */}
          <h2 className="mb-8 font-display text-2xl">
            {t('form.vehicleHeading')}
          </h2>

          <div className="mb-16 space-y-6">
            {/* Make */}
            <div>
              <label
                htmlFor="sell-make"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('form.make')}
              </label>
              <select
                id="sell-make"
                value={data.make}
                onChange={(e) => update('make', e.target.value)}
                disabled={isLoading}
                className={inputClass}
                aria-invalid={!!errors.make}
              >
                <option value="">{t('form.select')}</option>
                {MAKES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {errors.make && (
                <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.make}</p>
              )}
            </div>

            {/* Model */}
            <div>
              <label
                htmlFor="sell-model"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('form.model')}
              </label>
              <input
                id="sell-model"
                type="text"
                placeholder="e.g. 911 Carrera"
                value={data.model}
                onChange={(e) => update('model', e.target.value)}
                disabled={isLoading}
                className={inputClass}
                aria-invalid={!!errors.model}
              />
              {errors.model && (
                <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.model}</p>
              )}
            </div>

            {/* Year + Kilometres */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sell-year"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
                >
                  {t('form.year')}
                </label>
                <select
                  id="sell-year"
                  value={data.year}
                  onChange={(e) => update('year', e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                  aria-invalid={!!errors.year}
                >
                  <option value="">{t('form.select')}</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {errors.year && (
                  <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.year}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="sell-km"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
                >
                  {t('form.kilometres')}
                </label>
                <input
                  id="sell-km"
                  type="number"
                  min="0"
                  placeholder="e.g. 18000"
                  value={data.kilometres}
                  onChange={(e) => update('kilometres', e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                  aria-invalid={!!errors.kilometres}
                />
                {errors.kilometres && (
                  <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.kilometres}</p>
                )}
              </div>
            </div>

            {/* Condition + City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sell-condition"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
                >
                  {t('form.condition')}
                </label>
                <select
                  id="sell-condition"
                  value={data.condition}
                  onChange={(e) => update('condition', e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                  aria-invalid={!!errors.condition}
                >
                  <option value="">{t('form.select')}</option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.condition && (
                  <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.condition}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="sell-city"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
                >
                  {t('form.city')}
                </label>
                <select
                  id="sell-city"
                  value={data.vehicleCity}
                  onChange={(e) => update('vehicleCity', e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                  aria-invalid={!!errors.vehicleCity}
                >
                  <option value="">{t('form.select')}</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.vehicleCity && (
                  <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.vehicleCity}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Contact details ──────────────────────────────────────────── */}
          <h2 className="mb-8 font-display text-2xl">
            {t('form.contactHeading')}
          </h2>

          <div className="space-y-6">
            {/* Full name */}
            <div>
              <label
                htmlFor="sell-fullname"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('form.fullName')}
              </label>
              <input
                id="sell-fullname"
                type="text"
                autoComplete="name"
                value={data.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                disabled={isLoading}
                className={inputClass}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && (
                <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.fullName}</p>
              )}
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="sell-phone"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
                >
                  {t('form.phone')}
                </label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-sm border border-r-0 border-line bg-bg-hover px-3 font-mono text-sm text-ink-muted">
                    +91
                  </span>
                  <input
                    id="sell-phone"
                    type="tel"
                    autoComplete="tel"
                    value={data.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    disabled={isLoading}
                    className={cn(inputClass, 'rounded-l-none')}
                    aria-invalid={!!errors.phone}
                  />
                </div>
                {errors.phone && (
                  <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.phone}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="sell-email"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
                >
                  {t('form.email')}
                </label>
                <input
                  id="sell-email"
                  type="email"
                  autoComplete="email"
                  value={data.email}
                  onChange={(e) => update('email', e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Contact method */}
            <div>
              <label
                htmlFor="sell-contact-method"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('form.contactMethod')}
              </label>
              <select
                id="sell-contact-method"
                value={data.contactMethod}
                onChange={(e) => update('contactMethod', e.target.value)}
                disabled={isLoading}
                className={inputClass}
                aria-invalid={!!errors.contactMethod}
              >
                <option value="">{t('form.select')}</option>
                {CONTACT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {errors.contactMethod && (
                <p role="alert" className="mt-1 font-mono text-[10px] text-danger">{errors.contactMethod}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="sell-notes"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-muted"
              >
                {t('form.notes')}
              </label>
              <textarea
                id="sell-notes"
                rows={4}
                placeholder={t('form.notesPlaceholder')}
                value={data.notes}
                onChange={(e) => update('notes', e.target.value)}
                disabled={isLoading}
                className={cn(inputClass, 'resize-none')}
              />
            </div>

            {/* Consent */}
            <p className="font-mono text-[10px] leading-relaxed text-ink-muted">
              {t('form.consent')}
            </p>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'rounded-full bg-accent px-10 py-4',
                  'font-mono text-xs uppercase tracking-widest text-white',
                  'w-full md:w-auto',
                  'hover:bg-accent-hover transition-colors motion-safe:duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                )}
              >
                {isLoading ? t('form.submitting') : t('form.submit')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
