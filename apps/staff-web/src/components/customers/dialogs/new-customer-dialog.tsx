'use client';

/**
 * NewCustomerDialog — Add Customer flow (GAP-7).
 *
 * RBAC: R09+ only (Gate enforced by caller in customers-index-view).
 * On submit:
 *  1. Creates customer via createCustomer (idempotency check on phone+email).
 *  2. Captures DATA_PROCESSING consent via captureConsent.
 *  3. Toast success → navigate to /customers/{id}.
 *
 * Spec: SPEC-CUSTOMERS-001 §2 + scenario S-C-13
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/** Loose E.164 match for Indian numbers: +91 followed by 10 digits */
const PHONE_REGEX = /^\+91[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  name: string;
  phone: string;
  email: string;
  preferredCity: '' | Customer['preferredCity'];
  dpdpConsent: boolean;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  dpdpConsent?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Full name is required';
  if (!form.phone.trim()) {
    errors.phone = 'Phone is required';
  } else if (!PHONE_REGEX.test(form.phone.trim())) {
    errors.phone = 'Enter a valid Indian mobile number (+91XXXXXXXXXX)';
  }
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (!form.dpdpConsent) {
    errors.dpdpConsent = 'You must acknowledge DPDP data processing consent before creating the customer record';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

const INITIAL_FORM: FormState = {
  name: '',
  phone: '+91',
  email: '',
  preferredCity: '',
  dpdpConsent: true,
};

export function NewCustomerDialog({ open, onClose, onSuccess }: NewCustomerDialogProps) {
  const router = useRouter();
  const { user } = useStaffAuth();
  const createCustomer = useCustomersStore((s) => s.createCustomer);
  const captureConsent = useCustomersStore((s) => s.captureConsent);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    // Clear error for changed fields
    const keys = Object.keys(patch) as (keyof FormState)[];
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k as keyof FormErrors];
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitting(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validate(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      if (!user) return;
      setSubmitting(true);
      try {
        const now = new Date().toISOString();
        const actor = { id: user.id, name: user.name, role: user.role };

        // Create customer (idempotent — returns existing if phone+email match)
        const customer = createCustomer(
          {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            preferredCity: form.preferredCity || 'bangalore',
            dpdpConsentGivenAt: now,
          },
          actor,
        );

        // Capture DATA_PROCESSING consent simultaneously
        captureConsent(
          {
            customerId: customer.id,
            purpose: 'DATA_PROCESSING',
            capturedAt: now,
            capturedBy: user.id,
            capturedByName: user.name,
            source: 'STAFF_FORM',
          },
          actor,
        );

        onSuccess?.(customer);
        handleClose();
        router.push(`/customers/${customer.id}`);
      } finally {
        setSubmitting(false);
      }
    },
    [form, user, createCustomer, captureConsent, onSuccess, handleClose, router],
  );

  const isDirty =
    form.name !== INITIAL_FORM.name ||
    form.phone !== INITIAL_FORM.phone ||
    form.email !== INITIAL_FORM.email;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add Customer"
      subtitle="Create a new customer record with DPDP consent"
      size="md"
      dirty={isDirty}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium border border-line',
              'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'disabled:opacity-40',
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-customer-form"
            disabled={submitting}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
              'bg-accent hover:bg-accent/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {submitting ? 'Creating…' : 'Create Customer'}
          </button>
        </>
      }
    >
      <form
        id="new-customer-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        {/* Full Name */}
        <div>
          <label htmlFor="nc-name" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
            Full Name <span className="text-state-danger" aria-label="required">*</span>
          </label>
          <input
            id="nc-name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange({ name: e.target.value })}
            placeholder="e.g. Arjun Mehta"
            autoComplete="name"
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'nc-name-error' : undefined}
            className={cn(
              'h-10 w-full rounded-md border bg-bg-canvas px-3',
              'text-sm text-ink-primary placeholder:text-ink-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              errors.name ? 'border-state-danger' : 'border-line',
            )}
          />
          {errors.name && (
            <p id="nc-name-error" role="alert" className="mt-1 text-xs text-state-danger">{errors.name}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="nc-phone" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
            Mobile Number <span className="text-state-danger" aria-label="required">*</span>
          </label>
          <input
            id="nc-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange({ phone: e.target.value })}
            placeholder="+91XXXXXXXXXX"
            autoComplete="tel"
            aria-required="true"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'nc-phone-error' : 'nc-phone-hint'}
            className={cn(
              'h-10 w-full rounded-md border bg-bg-canvas px-3 font-mono',
              'text-sm text-ink-primary placeholder:text-ink-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              errors.phone ? 'border-state-danger' : 'border-line',
            )}
          />
          <p id="nc-phone-hint" className="mt-1 text-xs text-ink-muted">Indian mobile — format +91XXXXXXXXXX</p>
          {errors.phone && (
            <p id="nc-phone-error" role="alert" className="mt-1 text-xs text-state-danger">{errors.phone}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="nc-email" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
            Email Address <span className="text-state-danger" aria-label="required">*</span>
          </label>
          <input
            id="nc-email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange({ email: e.target.value })}
            placeholder="arjun@example.com"
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'nc-email-error' : undefined}
            className={cn(
              'h-10 w-full rounded-md border bg-bg-canvas px-3',
              'text-sm text-ink-primary placeholder:text-ink-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              errors.email ? 'border-state-danger' : 'border-line',
            )}
          />
          {errors.email && (
            <p id="nc-email-error" role="alert" className="mt-1 text-xs text-state-danger">{errors.email}</p>
          )}
        </div>

        {/* Preferred City (optional) */}
        <div>
          <label htmlFor="nc-city" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
            Preferred City
          </label>
          <select
            id="nc-city"
            value={form.preferredCity}
            onChange={(e) => handleChange({ preferredCity: e.target.value as FormState['preferredCity'] })}
            className={cn(
              'h-10 w-full rounded-md border border-line bg-bg-canvas px-3',
              'text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
            )}
          >
            <option value="">Select city (defaults to Bangalore)</option>
            <option value="bangalore">Bangalore</option>
            <option value="mumbai">Mumbai</option>
            <option value="chennai">Chennai</option>
          </select>
        </div>

        {/* DPDP Consent acknowledgement */}
        <div className={cn(
          'rounded-md border p-4',
          errors.dpdpConsent ? 'border-state-danger bg-state-danger/5' : 'border-line bg-bg-subtle',
        )}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="nc-dpdp"
              checked={form.dpdpConsent}
              onChange={(e) => handleChange({ dpdpConsent: e.target.checked })}
              aria-required="true"
              aria-invalid={!!errors.dpdpConsent}
              aria-describedby={errors.dpdpConsent ? 'nc-dpdp-error' : 'nc-dpdp-hint'}
              className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent"
            />
            <span className="text-sm text-ink-secondary leading-relaxed">
              I confirm that this customer has given informed consent for their personal data to be
              processed by BN Automobiles for vehicle ownership, service, and communications per the{' '}
              <strong className="text-ink-primary">DPDP Act 2023</strong> (purpose: DATA_PROCESSING).
            </span>
          </label>
          <p id="nc-dpdp-hint" className="text-xs text-ink-muted mt-2 ml-7">
            This consent is logged with your staff ID, timestamp, and source.
          </p>
          {errors.dpdpConsent && (
            <p id="nc-dpdp-error" role="alert" className="mt-1 ml-7 text-xs text-state-danger">
              {errors.dpdpConsent}
            </p>
          )}
        </div>
      </form>
    </Dialog>
  );
}
