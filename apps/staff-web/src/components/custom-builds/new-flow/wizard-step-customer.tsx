/**
 * Wizard Step 1 — Pick customer.
 *
 * Search + select from customers-store.
 * "+ Create New Customer" CTA opens an inline Dialog with DPDP consent capture.
 * On submit: calls createCustomer() → auto-selects new customer + sets
 * customerCreatedDuringWizard: true in wizard state.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §32 L65
 */

'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Check, Plus, X } from 'lucide-react';
import { cn } from '@dms/ui';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import type { WizardData } from './new-build-wizard';

// ─── New-customer form schema ─────────────────────────────────────────────────

const newCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required (min 2 chars)'),
  phone: z.string().regex(/^\+91\d{10}$/, 'Use +91XXXXXXXXXX format'),
  email: z.string().email('Valid email required'),
  preferredCity: z.enum(['bangalore', 'mumbai', 'chennai'], {
    errorMap: () => ({ message: 'Select a city' }),
  }),
  preferredLanguage: z.enum(['en-IN', 'hi-IN', 'kn-IN', 'ta-IN', 'mr-IN'], {
    errorMap: () => ({ message: 'Select a language' }),
  }),
  dpdpConsent: z.literal(true, {
    errorMap: () => ({ message: 'DPDP consent is required to proceed' }),
  }),
});

type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const icls = (err?: boolean) =>
  cn(
    'h-9 w-full rounded-md border bg-bg-subtle px-3 text-[13px] text-ink-primary',
    'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
    'placeholder:text-ink-muted',
    err ? 'border-state-danger' : 'border-line',
  );

const Err = ({ m }: { m?: string }) =>
  m ? <p className="text-[11px] text-state-danger mt-0.5">{m}</p> : null;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardStepCustomer({ data, onUpdate }: Props) {
  const customersMap = useCustomersStore((s) => s.customers);
  const createCustomer = useCustomersStore((s) => s.createCustomer);
  const { user } = useStaffAuth();

  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const customers = useMemo(() => Object.values(customersMap), [customersMap]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers.slice(0, 20);
    const q = search.trim().toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [customers, search]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      preferredCity: 'bangalore',
      preferredLanguage: 'en-IN',
    },
  });

  const handleSelect = (id: string, name: string) => {
    onUpdate({
      ...data,
      customerId: id,
      customerName: name,
      vin: '',
      vehicleLabel: '',
      // preserve wizard flags — don't clear customerCreatedDuringWizard if switching
    });
  };

  const onNewCustomerSubmit = handleSubmit((values) => {
    setFormSubmitting(true);
    try {
      const actor = user
        ? { id: user.id, name: user.name, role: user.role }
        : { id: 'staff-system', name: 'Staff', role: 'R09' };

      const now = new Date().toISOString();
      const newCust = createCustomer(
        {
          name: values.name,
          phone: values.phone,
          email: values.email,
          preferredCity: values.preferredCity,
          preferredLanguage: values.preferredLanguage as 'en-IN' | 'hi-IN',
          dpdpConsentGivenAt: now,
        },
        actor,
      );

      onUpdate({
        ...data,
        customerId: newCust.id,
        customerName: newCust.name,
        vin: '',
        vehicleLabel: '',
        customerCreatedDuringWizard: true,
      });

      setShowNewForm(false);
      reset();
    } finally {
      setFormSubmitting(false);
    }
  });

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-primary">Select Customer</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Search for the customer placing this build order, or create a new one.
        </p>
      </div>

      {/* Search + CTA row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full h-9 pl-8 pr-3 rounded-md bg-bg-subtle border border-line text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            aria-label="Search customers"
            autoFocus={!showNewForm}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowNewForm((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-medium border transition-colors shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            showNewForm
              ? 'bg-accent text-white border-accent'
              : 'border-line text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
          )}
          aria-expanded={showNewForm}
        >
          {showNewForm ? <X size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
          {showNewForm ? 'Cancel' : 'Create New Customer'}
        </button>
      </div>

      {/* ── Inline new-customer form ──────────────────────────────────────────── */}
      {showNewForm && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
          <h3 className="text-[13px] font-semibold text-ink-primary">New Customer</h3>

          <form onSubmit={onNewCustomerSubmit} noValidate className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="nc-name" className="text-[12px] font-medium text-ink-primary">
                  Full name <span className="text-state-danger">*</span>
                </label>
                <input
                  id="nc-name"
                  {...register('name')}
                  className={icls(!!errors.name)}
                  placeholder="Rajesh Sharma"
                />
                <Err m={errors.name?.message} />
              </div>
              <div className="space-y-1">
                <label htmlFor="nc-phone" className="text-[12px] font-medium text-ink-primary">
                  Phone (+91) <span className="text-state-danger">*</span>
                </label>
                <input
                  id="nc-phone"
                  {...register('phone')}
                  className={icls(!!errors.phone)}
                  placeholder="+91XXXXXXXXXX"
                />
                <Err m={errors.phone?.message} />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="nc-email" className="text-[12px] font-medium text-ink-primary">
                Email <span className="text-state-danger">*</span>
              </label>
              <input
                id="nc-email"
                type="email"
                {...register('email')}
                className={icls(!!errors.email)}
                placeholder="customer@email.com"
              />
              <Err m={errors.email?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="nc-city" className="text-[12px] font-medium text-ink-primary">
                  Preferred city <span className="text-state-danger">*</span>
                </label>
                <select
                  id="nc-city"
                  {...register('preferredCity')}
                  className={icls(!!errors.preferredCity)}
                >
                  <option value="bangalore">Bangalore</option>
                  <option value="mumbai">Mumbai</option>
                  <option value="chennai">Chennai</option>
                </select>
                <Err m={errors.preferredCity?.message} />
              </div>
              <div className="space-y-1">
                <label htmlFor="nc-lang" className="text-[12px] font-medium text-ink-primary">
                  Preferred language
                </label>
                <select id="nc-lang" {...register('preferredLanguage')} className={icls()}>
                  <option value="en-IN">English</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="kn-IN">Kannada</option>
                  <option value="ta-IN">Tamil</option>
                  <option value="mr-IN">Marathi</option>
                </select>
              </div>
            </div>

            {/* DPDP consent — required per CLAUDE §9 */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                {...register('dpdpConsent')}
                className="mt-0.5 h-4 w-4 rounded border-line accent-accent"
              />
              <span className="text-[12px] text-ink-secondary leading-relaxed">
                I confirm this customer has provided consent for BN Automobiles to collect and
                process their personal data for vehicle enquiry and service purposes per the
                Digital Personal Data Protection Act 2023.{' '}
                <span className="text-state-danger">*</span>
              </span>
            </label>
            {errors.dpdpConsent && (
              <Err m="DPDP consent is required to create a customer" />
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(false);
                  reset();
                }}
                className="h-8 px-3 rounded-md text-[12px] font-medium border border-line text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className={cn(
                  'h-8 px-4 rounded-md text-[12px] font-semibold text-white bg-accent hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {formSubmitting ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Customer list ─────────────────────────────────────────────────────── */}
      {!showNewForm && (
        <div className="rounded-md border border-line divide-y divide-line max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-ink-muted text-center py-8">No customers found.</p>
          ) : (
            filtered.map((c) => {
              const isNew = c.id === data.customerId && data.customerCreatedDuringWizard;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id, c.name)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    data.customerId === c.id ? 'bg-accent/10' : 'hover:bg-bg-hover',
                  )}
                  aria-pressed={data.customerId === c.id}
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-mono text-[11px] font-semibold text-accent uppercase shrink-0">
                    {c.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-medium text-ink-primary truncate">{c.name}</p>
                      {isNew && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent uppercase tracking-wide">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted">
                      {c.phone} · {c.preferredCity ?? ''}
                    </p>
                  </div>
                  {data.customerId === c.id && (
                    <Check size={15} className="text-accent shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {data.customerName && (
        <p className="text-[12px] text-[rgb(var(--state-listed))]">
          Selected:{' '}
          <span className="font-medium">{data.customerName}</span>
          {data.customerCreatedDuringWizard && (
            <span className="ml-1.5 text-[11px] text-accent">(just created)</span>
          )}
        </p>
      )}
    </div>
  );
}
