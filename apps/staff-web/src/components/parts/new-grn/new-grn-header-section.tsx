/**
 * GRN Header section — read-only PO ref / supplier / outlet + editable datetime + notes.
 *
 * Spec reference: PLAN-PARTS-004 §18.6
 */

'use client';

import { cloneElement, isValidElement, useId } from 'react';
import Link from 'next/link';
import { useFormContext } from 'react-hook-form';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { PurchaseOrder, Supplier } from '@dms/types';
import { OUTLET_NAMES } from '../helpers';
import { validateGrnEligibility } from './new-grn-helpers';
import type { NewGrnFormValues } from './new-grn-schema';

export interface NewGrnHeaderSectionProps {
  po: PurchaseOrder;
  supplier: Supplier | undefined;
}

export function NewGrnHeaderSection({ po, supplier }: NewGrnHeaderSectionProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<NewGrnFormValues>();

  const eligibility = validateGrnEligibility(po);

  return (
    <>
      {/* Status warning banner (non-blocking) */}
      {!eligibility.ok && (
        <div
          role="note"
          className={cn(
            'rounded-md px-4 py-3 mb-6 flex items-start gap-3',
            'border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.1)]',
          )}
        >
          <AlertTriangle
            aria-hidden="true"
            className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm text-ink-primary">{eligibility.warning}</p>
            <p className="text-[11px] font-mono text-ink-muted mt-0.5">
              Current PO status: {po.status}
            </p>
          </div>
        </div>
      )}

      <section className="rounded-md border border-line bg-bg-surface p-6">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
          Header
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-5">
          {/* PO Reference — read-only link pill */}
          <Field label="PO Reference">
            <Link
              href={`/parts/po/${po.id}`}
              className={cn(
                'inline-flex items-center gap-1.5 h-10 px-3 rounded-md',
                'border border-accent/30 bg-accent/5',
                'font-mono text-[12px] text-accent',
                'hover:bg-accent/10 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              {po.poNo}
              <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
            </Link>
          </Field>

          {/* Supplier — read-only */}
          <Field label="Supplier">
            <span className="inline-flex items-center h-10 text-sm text-ink-primary truncate">
              {supplier?.name ?? po.supplierId}
            </span>
          </Field>

          {/* Outlet — read-only */}
          <Field label="Outlet">
            <span className="inline-flex items-center h-10 text-sm text-ink-primary">
              {OUTLET_NAMES[po.outletId] ?? po.outletId} ({po.outletId})
            </span>
          </Field>

          {/* Received At — editable datetime */}
          <Field label="Received At *" error={errors.receivedAt?.message}>
            <input
              type="datetime-local"
              {...register('receivedAt')}
              className={cn(
                'h-10 w-full rounded-md bg-bg-subtle border border-line px-3',
                'text-sm text-ink-primary font-mono',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
              aria-label="Received at timestamp"
            />
          </Field>

          {/* Notes — full width */}
          <Field label="Notes" className="md:col-span-4">
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional — inspection notes, delivery courier, damage observations…"
              className={cn(
                'w-full rounded-md bg-bg-subtle border border-line px-3 py-2',
                'text-sm text-ink-primary placeholder:text-ink-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'resize-y min-h-[60px]',
              )}
            />
          </Field>
        </div>
      </section>
    </>
  );
}

// ─── Local bit ────────────────────────────────────────────────────────────────

/**
 * `Field` links a `<label htmlFor>` to its child form control via useId
 * (spec §12 accessibility). Cloned id injection means consumers pass a bare
 * input/select/textarea. Non-form-control children (read-only pills, spans)
 * harmlessly receive an unused id.
 */
function Field({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: React.ReactElement;
  className?: string;
  error?: string;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string }>, { id })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-wide text-ink-muted"
      >
        {label}
      </label>
      {control}
      {error && (
        <p
          role="alert"
          className="text-[12px] text-[rgb(var(--state-stale))]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
