'use client';

/**
 * NewCustomerDialog — Add Customer flow (GAP-7).
 *
 * RBAC: R09+ only (Gate enforced by caller in customers-index-view).
 * On submit:
 *  1. Creates customer via createCustomer (idempotency check on phone+email).
 *  2. Captures DATA_PROCESSING consent via captureConsent.
 *  3. Emits one ConsentEntry per enabled communication-pref toggle
 *     via recordCreateConsentEntries (DPDP-C2 / staff-consent-bridge).
 *  4. Toast success → navigate to /customers/{id}.
 *
 * Spec: SPEC-CUSTOMERS-001 §2 + scenario S-C-13
 * DPDP: DPDP Act 2023 §6 (consent), §11 (right to withdraw)
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { recordCreateConsentEntries } from '@/src/lib/customers/staff-consent-bridge';
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
  /** DPDP-C2: communication channel preferences — each maps to a ConsentPurpose */
  commPrefs: {
    whatsappUpdates: boolean;
    smsAlerts: boolean;
    emailNewsletter: boolean;
    callConsent: boolean;
    marketingConsent: boolean;
  };
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  dpdpConsent?: string;
}

// ─── DPDP purpose text (DPDP Act 2023 §6 — purpose-text requirement) ─────────

/**
 * Purpose descriptions shown next to each consent toggle.
 * DPDP Act 2023 §6: consent must be accompanied by a notice that specifies
 * the purpose for which personal data is being processed.
 * Keys under staff.customers.consent.<purpose> in en-IN.json / hi-IN.json.
 */
const CONSENT_TOGGLE_CONFIG: Array<{
  key: keyof FormState['commPrefs'];
  label: string;
  purposeText: string;
}> = [
  {
    key: 'whatsappUpdates',
    label: 'WhatsApp Updates',
    purposeText:
      'By enabling WhatsApp updates, you consent to receive marketing messages about new arrivals, offers, and service reminders. You may withdraw consent at any time via your customer portal.',
  },
  {
    key: 'smsAlerts',
    label: 'SMS Alerts',
    purposeText:
      'By enabling SMS alerts, you consent to receive transactional and marketing SMS messages including service booking confirmations and promotional offers.',
  },
  {
    key: 'emailNewsletter',
    label: 'Email Newsletter',
    purposeText:
      'By enabling the email newsletter, you consent to receive email communications including new vehicle arrivals, special offers, and BN Automobiles news.',
  },
  {
    key: 'callConsent',
    label: 'Call Consent',
    purposeText:
      'By enabling call consent, you agree to receive outbound calls from BN Automobiles sales and service team for follow-ups and offers.',
  },
  {
    key: 'marketingConsent',
    label: 'General Marketing Consent',
    purposeText:
      'By enabling general marketing consent, you agree to receive marketing communications across all channels as permitted under the DPDP Act 2023.',
  },
];

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

const INITIAL_COMM_PREFS: FormState['commPrefs'] = {
  whatsappUpdates: false,
  smsAlerts: false,
  emailNewsletter: false,
  callConsent: false,
  marketingConsent: false,
};

const INITIAL_FORM: FormState = {
  name: '',
  phone: '+91',
  email: '',
  preferredCity: '',
  dpdpConsent: true,
  commPrefs: INITIAL_COMM_PREFS,
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
            communicationPreferences: form.commPrefs,
          },
          actor,
        );

        // Capture DATA_PROCESSING consent (base DPDP acknowledgement)
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

        // DPDP-C2: emit one ConsentEntry per enabled communication-pref toggle.
        // FALSE toggles → no row (never-granted prefs need no revocation record).
        // Captured by = user.id so DSR can answer WHO captured each consent.
        recordCreateConsentEntries(
          customer.id,
          customer.name,
          { ...form.commPrefs },
          user.id,
          user.name,
        );

        onSuccess?.(customer);
        handleClose();
        router.push(`/customers/${customer.id}`);
      } finally {
        setSubmitting(false);
      }
    },
    [form, user, createCustomer, captureConsent, onSuccess, handleClose, router], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleCommPrefChange = useCallback(
    (key: keyof FormState['commPrefs'], checked: boolean) => {
      setForm((prev) => ({
        ...prev,
        commPrefs: { ...prev.commPrefs, [key]: checked },
      }));
    },
    [],
  );

  const isDirty =
    form.name !== INITIAL_FORM.name ||
    form.phone !== INITIAL_FORM.phone ||
    form.email !== INITIAL_FORM.email ||
    Object.keys(form.commPrefs).some(
      (k) => form.commPrefs[k as keyof FormState['commPrefs']] !== INITIAL_COMM_PREFS[k as keyof FormState['commPrefs']],
    );

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

        {/* DPDP-C2: Communication channel preferences (DPDP Act 2023 §6) */}
        <fieldset className="rounded-md border border-line bg-bg-subtle p-4">
          <legend className="text-xs text-ink-muted uppercase tracking-wider px-1">
            Communication Preferences
          </legend>
          <p className="text-xs text-ink-muted mt-1 mb-3">
            Select which channels the customer consents to. Each toggle creates a separate DPDP
            consent record linked to your staff ID.
          </p>
          <div className="flex flex-col gap-3">
            {CONSENT_TOGGLE_CONFIG.map(({ key, label, purposeText }) => (
              <div key={key} className="rounded-md border border-line bg-bg-canvas p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id={`nc-pref-${key}`}
                    checked={form.commPrefs[key]}
                    onChange={(e) => handleCommPrefChange(key, e.target.checked)}
                    aria-describedby={`nc-pref-${key}-purpose`}
                    className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-ink-primary">{label}</span>
                    {/* DPDP §6 purpose text — rendered next to each toggle per CLAUDE.md §9 */}
                    <p
                      id={`nc-pref-${key}-purpose`}
                      className="text-xs text-ink-muted mt-0.5 leading-relaxed"
                    >
                      {purposeText}
                    </p>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </fieldset>

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
