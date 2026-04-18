/**
 * NewSupplierForm — RHF form body used by the New Supplier Dialog.
 *
 * Spec reference: PLAN-PARTS-005 §3.2, §18 (wireframe)
 */

'use client';

import { cloneElement, isValidElement, useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { NewSupplierFormValues } from './new-supplier-schema';

export function NewSupplierForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<NewSupplierFormValues>();

  return (
    <div className="flex flex-col gap-5">
      {/* Name — full width */}
      <Field label="Supplier Name *" error={errors.name?.message}>
        <input
          type="text"
          placeholder="e.g. Bosch India Pvt Ltd"
          {...register('name')}
          className={inputCls}
        />
      </Field>

      {/* GSTIN + Contact — 2 col */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Field label="GSTIN" error={errors.gstin?.message} hint="Optional — 15 chars">
          <input
            type="text"
            placeholder="29ABCDE1234F1Z5"
            {...register('gstin')}
            className={cn(inputCls, 'font-mono uppercase')}
          />
        </Field>
        <Field
          label="Contact *"
          error={errors.contact?.message}
          hint="Phone or email"
        >
          <input
            type="text"
            placeholder="+91 98xxx xxxxx"
            {...register('contact')}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Address — full width */}
      <Field label="Address *" error={errors.address?.message}>
        <textarea
          rows={3}
          placeholder="12, Industrial Area, Whitefield, Bengaluru 560066"
          {...register('address')}
          className={cn(
            'w-full rounded-md bg-bg-subtle border border-line px-3 py-2',
            'text-sm text-ink-primary placeholder:text-ink-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            'resize-y min-h-[76px]',
          )}
        />
      </Field>

      {/* Payment Terms + Currency — 2 col */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Field label="Payment Terms *" error={errors.paymentTerms?.message}>
          <select {...register('paymentTerms')} className={inputCls}>
            <option value="NET_30">Net 30</option>
            <option value="NET_45">Net 45</option>
            <option value="ADVANCE">Advance</option>
          </select>
        </Field>
        <Field label="Currency *" error={errors.currency?.message}>
          <select {...register('currency')} className={inputCls}>
            <option value="INR">INR</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </Field>
      </div>

      {/* Active checkbox */}
      <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          {...register('active')}
          className="h-4 w-4 rounded border-line bg-bg-subtle"
        />
        Active
      </label>
    </div>
  );
}

// ─── Shared Field helper (cloneElement for proper label-htmlFor pairing) ─────

const inputCls = cn(
  'h-10 w-full rounded-md bg-bg-subtle border border-line px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
);

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: React.ReactElement;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-wide text-ink-muted"
      >
        {label}
      </label>
      {control}
      {error ? (
        <p role="alert" className="text-[12px] text-[rgb(var(--state-stale))]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
