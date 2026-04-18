/**
 * PO Header section — supplier / outlet / expected delivery / import / linked JC / notes.
 *
 * Spec reference: PLAN-PARTS-004 §9 + §18.2
 */

'use client';

import { cloneElement, isValidElement, useEffect, useId, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { Supplier } from '@dms/types';
import { OUTLET_NAMES, OUTLET_ORDER } from '../helpers';
import { deriveImportFromSupplier } from './new-po-helpers';
import { emptyLine } from './new-po-schema';
import type { NewPoFormValues } from './new-po-schema';
import { NewSupplierDialog } from '../new-supplier-dialog';

const SENTINEL_ADD_SUPPLIER = '__add_new_supplier__';

export interface NewPoHeaderSectionProps {
  suppliers: Supplier[];
}

export function NewPoHeaderSection({ suppliers }: NewPoHeaderSectionProps) {
  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<NewPoFormValues>();

  const mode = watch('mode') ?? 'single';
  const supplierId = watch('supplierId');
  const isImport = watch('isImport');
  const linkedJobCardId = watch('linkedJobCardId');

  const [newSupplierOpen, setNewSupplierOpen] = useState(false);

  // Auto-select newly-created supplier
  const handleSupplierCreated = (supplier: Supplier) => {
    setValue('supplierId', supplier.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Mode toggle: when switching, re-seed lines so the qty/qtyByOutlet shape
  // matches the new mode. Preserve partCode + unitPrice across the toggle.
  const handleModeChange = (next: 'single' | 'split') => {
    if (next === mode) return;
    const lines = getValues('lines');
    const reshaped = lines.map((l) => {
      const emptyForNext = emptyLine(next);
      return {
        ...emptyForNext,
        partCode: l.partCode,
        unitPrice: l.unitPrice,
      };
    });
    setValue('mode', next, { shouldDirty: true });
    setValue('lines', reshaped, { shouldDirty: true, shouldValidate: true });
  };

  // Auto-toggle isImport when supplier currency != INR
  useEffect(() => {
    if (!supplierId) return;
    const supplier = suppliers.find((s) => s.id === supplierId);
    const shouldBeImport = deriveImportFromSupplier(supplier);
    setValue('isImport', shouldBeImport, { shouldDirty: false, shouldTouch: false });
  }, [supplierId, suppliers, setValue]);

  // Group suppliers for the <select>
  const oem = suppliers.filter(
    (s) => !s.isImport && ['sup-001', 'sup-002', 'sup-003', 'sup-004'].includes(s.id),
  );
  const tier1 = suppliers.filter(
    (s) => !s.isImport && ['sup-005', 'sup-006', 'sup-007'].includes(s.id),
  );
  const imports = suppliers.filter((s) => s.isImport);

  // Register + onChange intercept for the supplier select (sentinel handling)
  const supplierRegistration = register('supplierId');

  return (
    <>
      <section className="rounded-md border border-line bg-bg-surface p-6">
        {/* Mode segmented toggle */}
        <div className="mb-5 flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted mr-2">
            Mode
          </span>
          <div
            role="tablist"
            aria-label="PO mode"
            className="inline-flex rounded-md border border-line bg-bg-subtle p-0.5"
          >
            {(['single', 'split'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  'h-8 px-3 rounded text-[13px] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  mode === m
                    ? 'bg-bg-surface text-ink-primary shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary',
                )}
              >
                {m === 'single' ? 'Single outlet' : 'Split across outlets'}
              </button>
            ))}
          </div>
        </div>

        <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
          Header
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        {/* Supplier */}
        <Field label="Supplier *" error={errors.supplierId?.message}>
          <select
            {...supplierRegistration}
            onChange={(e) => {
              if (e.target.value === SENTINEL_ADD_SUPPLIER) {
                e.preventDefault();
                // Revert to the currently-watched supplierId (pre-change value
                // on this render) — preserves the user's existing selection
                // when they open the dialog without committing the sentinel.
                setValue('supplierId', supplierId ?? '', {
                  shouldValidate: true,
                });
                setNewSupplierOpen(true);
                return;
              }
              supplierRegistration.onChange(e);
            }}
            className={selectCls}
            aria-label="Supplier"
          >
            <option value="">— Select supplier —</option>
            {oem.length > 0 && (
              <optgroup label="OEM Captives">
                {oem.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {tier1.length > 0 && (
              <optgroup label="Tier-1 Aftermarket">
                {tier1.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {imports.length > 0 && (
              <optgroup label="Imports">
                {imports.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currency})
                  </option>
                ))}
              </optgroup>
            )}
            {/* Sentinel — always last */}
            <optgroup label="—">
              <option value={SENTINEL_ADD_SUPPLIER}>+ Add new supplier</option>
            </optgroup>
          </select>
        </Field>

        {/* Outlet — hidden in split mode (one PO per outlet) */}
        {mode === 'single' && (
          <Field label="Outlet *" error={errors.outletId?.message}>
            <select
              {...register('outletId')}
              className={selectCls}
              aria-label="Outlet"
            >
              {OUTLET_ORDER.map((id) => (
                <option key={id} value={id}>
                  {OUTLET_NAMES[id] ?? id}
                </option>
              ))}
            </select>
          </Field>
        )}

        {mode === 'split' && (
          <div className="md:col-start-2 flex flex-col gap-1.5 justify-end">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              Split
            </span>
            <div
              className={cn(
                'h-10 flex items-center gap-2 rounded-md px-3',
                'border-l-4 border-l-accent border border-line bg-bg-subtle',
                'text-[13px] text-ink-secondary',
              )}
            >
              Splitting across BLR / MUM / CHE — 1 PO per non-empty outlet on submit.
            </div>
          </div>
        )}

        {/* Expected Delivery */}
        <Field
          label="Expected Delivery *"
          error={errors.expectedDeliveryAt?.message}
        >
          <input
            type="date"
            {...register('expectedDeliveryAt')}
            className={inputCls}
            aria-label="Expected delivery date"
          />
        </Field>

        {/* Import checkbox */}
        <Field label="Import" error={undefined}>
          <label className="inline-flex items-center gap-2 h-10 text-sm text-ink-secondary">
            <input
              type="checkbox"
              {...register('isImport')}
              className="h-4 w-4 rounded border-line bg-bg-subtle"
            />
            This is an import PO
          </label>
        </Field>

        {/* FX Rate (conditional) */}
        {isImport && (
          <Field
            label="FX Rate *"
            error={errors.fxRate?.message}
            className="md:col-start-1"
          >
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('fxRate', {
                setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
              })}
              className={inputCls}
              placeholder="e.g. 92.5"
              aria-label="FX rate"
            />
          </Field>
        )}

        {/* Linked Job Card (read-only, only when pre-filled) */}
        {linkedJobCardId && (
          <Field label="Linked Job Card" error={undefined}>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 h-10 px-3 rounded-md',
                'border border-accent/30 bg-accent/5',
                'font-mono text-[12px] text-accent',
              )}
            >
              {linkedJobCardId}
            </span>
          </Field>
        )}

        {/* Notes */}
        <Field label="Notes" className="md:col-span-2">
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Optional — context, authorization code, vendor-specific instructions…"
            className={cn(
              'w-full rounded-md bg-bg-subtle border border-line px-3 py-2',
              'text-sm text-ink-primary placeholder:text-ink-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              'resize-y min-h-[80px]',
            )}
          />
        </Field>
        </div>
      </section>

      <NewSupplierDialog
        open={newSupplierOpen}
        onClose={() => setNewSupplierOpen(false)}
        onCreated={handleSupplierCreated}
      />
    </>
  );
}

// ─── Local helpers ────────────────────────────────────────────────────────────

const inputCls = cn(
  'h-10 w-full rounded-md bg-bg-subtle border border-line px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
);

const selectCls = inputCls;

/**
 * `Field` links a `<label htmlFor>` to its child form control via a generated
 * id (spec §12 accessibility). The child is cloned so the id is injected
 * automatically — consumers don't need to pass ids. For composite controls
 * that are already self-labeled (e.g. a `<label>` wrapping a checkbox), the
 * outer Field label is still present as the section eyebrow.
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
