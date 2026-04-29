/**
 * NewVendorDialog — create a new vendor in the Custom Builds module.
 *
 * L44 (locked): Add Vendor dialog at dialogs/new-vendor-dialog.tsx, R12+ gated.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §8, L11, L44
 */

'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives/dialog';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import type { AftermarketPartCategory } from '@dms/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SPECIALTIES: { value: AftermarketPartCategory; label: string }[] = [
  { value: 'aero',       label: 'Aero' },
  { value: 'wheels',     label: 'Wheels' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'exhaust',    label: 'Exhaust' },
  { value: 'paint',      label: 'Paint' },
  { value: 'interior',   label: 'Interior' },
  { value: 'ecu',        label: 'ECU' },
  { value: 'lighting',   label: 'Lighting' },
];

const CITIES = ['Bangalore', 'Mumbai', 'Chennai'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewVendorDialogProps {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  name: string;
  specialties: AftermarketPartCategory[];
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  paymentTerms: string;
  dayRate: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  specialties: [],
  city: 'Bangalore',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  paymentTerms: '',
  dayRate: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NewVendorDialog({ open, onClose }: NewVendorDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const createVendor = useCustomBuildsStore((s) => s.createVendor);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const handleClose = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  }, [onClose]);

  const toggleSpecialty = useCallback((val: AftermarketPartCategory) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(val)
        ? prev.specialties.filter((s) => s !== val)
        : [...prev.specialties, val],
    }));
  }, []);

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = 'Vendor name is required.';
    if (form.specialties.length === 0) errs.specialties = 'Select at least one specialty.';
    if (!form.contactName.trim()) errs.contactName = 'Contact name is required.';
    if (!form.contactPhone.trim()) errs.contactPhone = 'Contact phone is required.';
    if (!form.contactEmail.trim()) errs.contactEmail = 'Contact email is required.';
    if (!form.paymentTerms.trim()) errs.paymentTerms = 'Payment terms are required.';
    const rate = parseFloat(form.dayRate);
    if (isNaN(rate) || rate <= 0) errs.dayRate = 'Enter a valid day rate (₹).';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!user) return;

    setSubmitting(true);
    try {
      createVendor(
        {
          name: form.name.trim(),
          specialties: form.specialties,
          city: form.city,
          contactName: form.contactName.trim(),
          contactPhone: form.contactPhone.trim(),
          contactEmail: form.contactEmail.trim(),
          paymentTerms: form.paymentTerms.trim(),
          dayRate: parseFloat(form.dayRate),
          rating: 3,
          activeJobCount: 0,
          lifetimeJobCount: 0,
          onTimePct: 0,
          active: true,
        },
        { id: user.id, name: user.name, role: user.role },
      );
      toast(`Vendor "${form.name.trim()}" added successfully.`, 'success');
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create vendor.';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [validate, user, createVendor, form, toast, handleClose]);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Add Vendor"
        subtitle="Register a new build vendor (R12+ only)"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white',
                'bg-accent hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {submitting ? 'Saving…' : 'Add Vendor'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Vendor name */}
          <div>
            <label htmlFor="vendor-name" className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
              Vendor Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="vendor-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Prestige Auto Wraps"
              className={cn(
                'h-9 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary',
                'placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                errors.name ? 'border-[rgb(var(--state-overdue))]' : 'border-line',
              )}
            />
            {errors.name && <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{errors.name}</p>}
          </div>

          {/* Specialties */}
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
              Specialties <span aria-hidden="true">*</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SPECIALTIES.map(({ value, label }) => {
                const active = form.specialties.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleSpecialty(value)}
                    aria-pressed={active}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      active
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-bg-subtle border-line text-ink-secondary hover:text-ink-primary hover:border-line/70',
                    )}
                  >
                    {label}
                    {active && (
                      <X size={10} className="ml-1 inline-block" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
            {errors.specialties && <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{errors.specialties}</p>}
          </div>

          {/* City */}
          <div>
            <label htmlFor="vendor-city" className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
              City
            </label>
            <select
              id="vendor-city"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="h-9 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vendor-contact-name" className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
                Contact Name <span aria-hidden="true">*</span>
              </label>
              <input
                id="vendor-contact-name"
                type="text"
                value={form.contactName}
                onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="Full name"
                className={cn(
                  'h-9 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary',
                  'placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  errors.contactName ? 'border-[rgb(var(--state-overdue))]' : 'border-line',
                )}
              />
              {errors.contactName && <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{errors.contactName}</p>}
            </div>
            <div>
              <label htmlFor="vendor-contact-phone" className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
                Phone <span aria-hidden="true">*</span>
              </label>
              <input
                id="vendor-contact-phone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                placeholder="+91 98765 43210"
                className={cn(
                  'h-9 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary font-mono',
                  'placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  errors.contactPhone ? 'border-[rgb(var(--state-overdue))]' : 'border-line',
                )}
              />
              {errors.contactPhone && <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{errors.contactPhone}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="vendor-contact-email" className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
              Contact Email <span aria-hidden="true">*</span>
            </label>
            <input
              id="vendor-contact-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
              placeholder="vendor@example.com"
              className={cn(
                'h-9 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary',
                'placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                errors.contactEmail ? 'border-[rgb(var(--state-overdue))]' : 'border-line',
              )}
            />
            {errors.contactEmail && <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{errors.contactEmail}</p>}
          </div>

          {/* Payment terms + day rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vendor-payment-terms" className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
                Payment Terms <span aria-hidden="true">*</span>
              </label>
              <input
                id="vendor-payment-terms"
                type="text"
                value={form.paymentTerms}
                onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}
                placeholder="e.g. 30% advance"
                className={cn(
                  'h-9 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary',
                  'placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  errors.paymentTerms ? 'border-[rgb(var(--state-overdue))]' : 'border-line',
                )}
              />
              {errors.paymentTerms && <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{errors.paymentTerms}</p>}
            </div>
            <div>
              <label htmlFor="vendor-day-rate" className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
                Day Rate (₹) <span aria-hidden="true">*</span>
              </label>
              <input
                id="vendor-day-rate"
                type="number"
                min={1}
                value={form.dayRate}
                onChange={(e) => setForm((p) => ({ ...p, dayRate: e.target.value }))}
                placeholder="e.g. 5000"
                className={cn(
                  'h-9 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary font-mono',
                  'placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  errors.dayRate ? 'border-[rgb(var(--state-overdue))]' : 'border-line',
                )}
              />
              {errors.dayRate && <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{errors.dayRate}</p>}
            </div>
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
