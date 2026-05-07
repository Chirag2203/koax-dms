'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car, ArrowRight, ChevronDown, X } from 'lucide-react';
import { cn } from '@dms/ui';
import { vehicles } from '@dms/mocks/fixtures';
import type { Vehicle } from '@dms/types';
import { ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';

// ─── Schema ───────────────────────────────────────────────────────────────────

const LeadCaptureSchema = z
  .object({
    clientName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be 80 characters or fewer'),
    phone: z
      .string()
      .regex(/^\d{10}$/, 'Enter exactly 10 digits after +91'),
    email: z
      .string()
      .email('Enter a valid email address')
      .optional()
      .or(z.literal('')),
    source: z.enum(['web', 'referral', 'walk-in', 'whatsapp', 'phone'], {
      required_error: 'Select a lead source',
    }),
    vehicleVin: z.string().optional(),
    budgetMin: z.coerce
      .number()
      .positive('Enter a positive amount')
      .optional()
      .or(z.literal('')),
    budgetMax: z.coerce
      .number()
      .positive('Enter a positive amount')
      .optional()
      .or(z.literal('')),
    notes: z
      .string()
      .max(1000, 'Notes must be 1000 characters or fewer')
      .optional(),
    isDraft: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const min = typeof data.budgetMin === 'number' ? data.budgetMin : undefined;
    const max = typeof data.budgetMax === 'number' ? data.budgetMax : undefined;
    if (min !== undefined && max !== undefined && max < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max budget must be greater than or equal to min',
        path: ['budgetMax'],
      });
    }
  });

type LeadCaptureFormData = z.infer<typeof LeadCaptureSchema>;

// ─── Source options ───────────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: LeadCaptureFormData['source']; label: string }[] = [
  { value: 'web', label: 'WEB' },
  { value: 'referral', label: 'REFERRAL' },
  { value: 'walk-in', label: 'WALK-IN' },
  { value: 'whatsapp', label: 'WHATSAPP' },
  { value: 'phone', label: 'PHONE' },
];

// ─── Input class helper ───────────────────────────────────────────────────────

const inputCls = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'transition-colors',
);

const labelCls = 'block text-xs uppercase tracking-wide text-ink-muted mb-1.5 font-medium';
const errorCls = 'text-xs text-state-danger mt-1';

// ─── Vehicle autocomplete ──────────────────────────────────────────────────────

function VehicleCombobox({
  value,
  onChange,
  error,
}: {
  value: string | undefined;
  onChange: (vin: string | undefined) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedVehicle = value
    ? vehicles.find((v) => v.vin === value) ?? null
    : null;

  const filtered = query.trim().length < 1
    ? []
    : vehicles.filter((v) => {
        const q = query.toLowerCase();
        return (
          v.vin.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          (v.variant?.toLowerCase().includes(q) ?? false)
        );
      }).slice(0, 8);

  function selectVehicle(vehicle: Vehicle) {
    onChange(vehicle.vin);
    setQuery('');
    setOpen(false);
  }

  function clearVehicle() {
    onChange(undefined);
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      {selectedVehicle ? (
        <div className={cn(
          'flex items-center gap-2 h-10 bg-bg-subtle border border-line rounded-md px-3',
          error && 'border-state-danger',
        )}>
          <Car className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex-1 text-sm text-ink-primary truncate">
            {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            {selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ''}
          </span>
          <span className="font-mono text-xs text-ink-muted bg-bg-canvas rounded px-1.5 py-0.5 shrink-0">
            {selectedVehicle.vin}
          </span>
          <button
            type="button"
            onClick={clearVehicle}
            aria-label="Clear selected vehicle"
            className="shrink-0 rounded p-0.5 text-ink-muted hover:text-ink-primary transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className={cn('relative', error && '[&_input]:border-state-danger')}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
            <Car className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(e.target.value.length > 0);
            }}
            onFocus={() => query.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Scan or enter VIN, Make, Model..."
            className={cn(inputCls, 'pl-9', error && 'border-state-danger')}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            role="combobox"
          />
        </div>
      )}

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className={cn(
            'absolute z-20 mt-1 w-full rounded-md border border-line',
            'bg-bg-surface shadow-xl overflow-hidden',
          )}
        >
          {filtered.map((v) => (
            <li key={v.vin}>
              <button
                type="button"
                onMouseDown={() => selectVehicle(v)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5',
                  'text-left hover:bg-bg-hover transition-colors',
                )}
                role="option"
                aria-selected={false}
              >
                <Car className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-ink-primary truncate">
                    {v.year} {v.make} {v.model} {v.variant ?? ''}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">{v.vin}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div className={cn(
          'absolute z-20 mt-1 w-full rounded-md border border-line',
          'bg-bg-surface shadow-xl px-3 py-3',
        )}>
          <p className="text-sm text-ink-muted">No matching vehicles found.</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewLeadPage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<LeadCaptureFormData>({
    resolver: zodResolver(LeadCaptureSchema),
    defaultValues: {
      clientName: '',
      phone: '',
      email: '',
      source: undefined,
      vehicleVin: undefined,
      budgetMin: '',
      budgetMax: '',
      notes: '',
      isDraft: false,
    },
  });

  const vehicleVin = watch('vehicleVin');
  const notesValue = watch('notes') ?? '';

  async function submitLead(data: LeadCaptureFormData, draft: boolean) {
    setSubmitting(true);
    try {
      const payload = { ...data, isDraft: draft };
      const res = await fetch('/api/staff/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Request failed');

      const { id } = (await res.json()) as { id: string };
      toast('Lead created', 'success');

      if (draft) {
        router.push('/sales');
      } else {
        router.push(`/sales/leads/${id}`);
      }
    } catch {
      toast('Could not create lead. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const onSubmit = handleSubmit((data) => submitLead(data, false));

  async function handleSaveDraft() {
    setValue('isDraft', true);
    await handleSubmit((data) => submitLead(data, true))();
  }

  return (
    <>
      <div className="min-h-full bg-bg-canvas px-6 py-8">
        {/* ── Breadcrumb ── */}
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-4">
          SALES / LEADS
        </p>

        {/* ── Header row ── */}
        <div className="flex items-start justify-between mb-8">
          <h1 className="text-2xl font-semibold leading-[1.2] text-ink-primary">
            New Lead Registration
          </h1>
          <span className="font-mono text-xs bg-bg-subtle rounded-md px-2 py-1 text-ink-muted border border-line shrink-0 mt-1.5">
            ID: AUTO-GEN
          </span>
        </div>

        {/* ── Form ── */}
        <form onSubmit={onSubmit} noValidate>
          <div className="max-w-[900px]">

            {/* Row 1: Client Name + Phone */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-5">
              <div>
                <label htmlFor="clientName" className={labelCls}>
                  Client Name <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <input
                  id="clientName"
                  type="text"
                  placeholder="Full Name"
                  {...register('clientName')}
                  aria-invalid={!!errors.clientName}
                  aria-describedby={errors.clientName ? 'clientName-error' : undefined}
                  className={cn(inputCls, errors.clientName && 'border-state-danger')}
                />
                {errors.clientName && (
                  <p id="clientName-error" className={errorCls} role="alert">
                    {errors.clientName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className={labelCls}>
                  Phone Number <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <div className="flex">
                  <span className={cn(
                    'flex items-center px-3 h-10 bg-bg-canvas border border-r-0 border-line',
                    'rounded-l-md text-sm text-ink-secondary font-mono shrink-0',
                    errors.phone && 'border-state-danger',
                  )}>
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="00000 00000"
                    {...register('phone')}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                    className={cn(
                      inputCls,
                      'rounded-l-none font-mono',
                      errors.phone && 'border-state-danger',
                    )}
                  />
                </div>
                {errors.phone && (
                  <p id="phone-error" className={errorCls} role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Email + Lead Source */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-7">
              <div>
                <label htmlFor="email" className={labelCls}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={cn(inputCls, errors.email && 'border-state-danger')}
                />
                {errors.email && (
                  <p id="email-error" className={errorCls} role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="source" className={labelCls}>
                  Lead Source <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    id="source"
                    {...register('source')}
                    aria-invalid={!!errors.source}
                    aria-describedby={errors.source ? 'source-error' : undefined}
                    className={cn(
                      inputCls,
                      'appearance-none pr-9 cursor-pointer',
                      errors.source && 'border-state-danger',
                    )}
                  >
                    <option value="" disabled>Select origin...</option>
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
                {errors.source && (
                  <p id="source-error" className={errorCls} role="alert">
                    {errors.source.message}
                  </p>
                )}
              </div>
            </div>

            {/* Separator */}
            <hr className="border-line mb-7" />

            {/* Target Vehicle */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-1.5">
                <label className={cn(labelCls, 'mb-0')}>Target Vehicle Lookup</label>
                <span className="font-mono text-xs text-ink-muted">
                  Press ⌘K to search global
                </span>
              </div>
              <VehicleCombobox
                value={vehicleVin}
                onChange={(vin) => setValue('vehicleVin', vin, { shouldDirty: true })}
                error={undefined}
              />
            </div>

            {/* Budget Range */}
            <div className="mb-7">
              <label className={labelCls}>Expected Budget Range</label>
              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <div className="flex">
                    <span className={cn(
                      'flex items-center px-3 h-10 bg-bg-canvas border border-r-0 border-line',
                      'rounded-l-md text-sm text-ink-secondary font-mono shrink-0',
                      errors.budgetMin && 'border-state-danger',
                    )}>
                      ₹
                    </span>
                    <input
                      id="budgetMin"
                      type="number"
                      min={0}
                      placeholder="Min (e.g. 50,00,000)"
                      {...register('budgetMin')}
                      aria-invalid={!!errors.budgetMin}
                      aria-describedby={errors.budgetMin ? 'budgetMin-error' : undefined}
                      aria-label="Minimum budget"
                      className={cn(
                        inputCls,
                        'rounded-l-none font-mono text-right',
                        errors.budgetMin && 'border-state-danger',
                      )}
                    />
                  </div>
                  {errors.budgetMin && (
                    <p id="budgetMin-error" className={errorCls} role="alert">
                      {errors.budgetMin.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex">
                    <span className={cn(
                      'flex items-center px-3 h-10 bg-bg-canvas border border-r-0 border-line',
                      'rounded-l-md text-sm text-ink-secondary font-mono shrink-0',
                      errors.budgetMax && 'border-state-danger',
                    )}>
                      ₹
                    </span>
                    <input
                      id="budgetMax"
                      type="number"
                      min={0}
                      placeholder="Max (e.g. 1,50,00,000)"
                      {...register('budgetMax')}
                      aria-invalid={!!errors.budgetMax}
                      aria-describedby={errors.budgetMax ? 'budgetMax-error' : undefined}
                      aria-label="Maximum budget"
                      className={cn(
                        inputCls,
                        'rounded-l-none font-mono text-right',
                        errors.budgetMax && 'border-state-danger',
                      )}
                    />
                  </div>
                  {errors.budgetMax && (
                    <p id="budgetMax-error" className={errorCls} role="alert">
                      {errors.budgetMax.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Operational Notes */}
            <div className="mb-9">
              <label htmlFor="notes" className={labelCls}>
                Operational Notes
              </label>
              <div className="relative">
                <textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Enter specific requirements, trade-in details, or urgency..."
                  rows={4}
                  maxLength={1000}
                  aria-invalid={!!errors.notes}
                  aria-describedby={errors.notes ? 'notes-error' : 'notes-count'}
                  className={cn(
                    'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                    'text-sm text-ink-primary placeholder:text-ink-muted resize-y min-h-[100px]',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                    'transition-colors',
                    errors.notes && 'border-state-danger',
                  )}
                />
                <p
                  id="notes-count"
                  className="absolute bottom-2 right-3 font-mono text-xs text-ink-muted pointer-events-none"
                >
                  {notesValue.length}/1000
                </p>
              </div>
              {errors.notes && (
                <p id="notes-error" className={errorCls} role="alert">
                  {errors.notes.message}
                </p>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => router.push('/sales')}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium text-ink-secondary',
                  'border border-line hover:border-ink-secondary hover:text-ink-primary',
                  'bg-transparent transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveDraft}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium text-ink-secondary',
                  'border border-line hover:border-ink-secondary hover:text-ink-primary',
                  'bg-transparent transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Save as Draft
              </button>

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'h-9 px-5 rounded-md text-sm font-semibold text-white',
                  'bg-accent hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2',
                )}
              >
                {submitting ? 'Creating...' : (
                  <>
                    Create Lead
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
