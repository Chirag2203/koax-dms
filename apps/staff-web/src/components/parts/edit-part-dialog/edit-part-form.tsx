/**
 * EditPartForm — RHF body for Edit Part Master panel.
 *
 * Shape matches NewPartForm but: partCode is NOT editable (displayed as a
 * mono chip by the dialog wrapper), and per-stock-row qty is read-only.
 *
 * Spec reference: PLAN-PARTS-005 §5.2, §18
 */

'use client';

import { cloneElement, isValidElement, useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { Supplier } from '@dms/types';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { OUTLET_NAMES } from '../helpers';
import { BRAND_OPTIONS } from '../new-part-dialog/new-part-helpers';
import type { EditPartFormValues } from './edit-part-schema';

export function EditPartForm() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<EditPartFormValues>();

  const suppliers = usePartsStore((s) => s.suppliers);
  const selectedSupplierIds = watch('supplierIds') ?? [];

  const toggleSupplier = (id: string) => {
    const next = selectedSupplierIds.includes(id)
      ? selectedSupplierIds.filter((x) => x !== id)
      : [...selectedSupplierIds, id];
    setValue('supplierIds', next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Identity */}
      <Section title="Identity">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="Name *" error={errors.name?.message}>
            <input type="text" {...register('name')} className={inputCls} />
          </Field>
          <Field label="Brand *" error={errors.brand?.message}>
            <select {...register('brand')} className={inputCls}>
              <option value="">— Select brand —</option>
              {BRAND_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category *" error={errors.category?.message}>
            <select {...register('category')} className={inputCls}>
              <option value="MECHANICAL">Mechanical</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="TRIM">Trim</option>
              <option value="CONSUMABLE">Consumable</option>
            </select>
          </Field>
          <Field label="Criticality *" error={errors.criticality?.message}>
            <select {...register('criticality')} className={inputCls}>
              <option value="ROUTINE">Routine</option>
              <option value="COMMON">Common</option>
              <option value="CRITICAL">Critical</option>
              <option value="SAFETY">Safety</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Commercial */}
      <Section title="Commercial">
        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
          <Field label="UoM *" error={errors.uom?.message}>
            <input type="text" {...register('uom')} className={inputCls} />
          </Field>
          <Field label="HSN Code *" error={errors.hsnCode?.message}>
            <input
              type="text"
              {...register('hsnCode')}
              className={cn(inputCls, 'font-mono')}
            />
          </Field>
          <Field label="MRP * (₹)" error={errors.mrp?.message}>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('mrp', {
                setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
              })}
              className={cn(inputCls, 'text-right font-mono tabular-nums')}
            />
          </Field>
          <Field label="Avg Cost * (₹)" error={errors.avgCost?.message}>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('avgCost', {
                setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
              })}
              className={cn(inputCls, 'text-right font-mono tabular-nums')}
            />
          </Field>
          <Field
            label="Last Purchase Price * (₹)"
            error={errors.lastPurchasePrice?.message}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('lastPurchasePrice', {
                setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
              })}
              className={cn(inputCls, 'text-right font-mono tabular-nums')}
            />
          </Field>
        </div>
      </Section>

      {/* Stock — qty read-only */}
      <Section
        title="Stock per Outlet"
        hint="Quantities change via GRN POST / adjustment / transfer only — they cannot be edited here."
      >
        <div className="flex flex-col gap-3">
          {watch('stock').map((_row, idx) => (
            <EditStockRow key={idx} idx={idx} />
          ))}
        </div>
      </Section>

      {/* Supply & Misc */}
      <Section title="Supply & Misc">
        <div className="flex flex-col gap-5">
          <Field label="Suppliers" hint="Pick any number (0 OK)">
            <div className="rounded-md border border-line bg-bg-subtle p-3 flex flex-col gap-2 max-h-52 overflow-y-auto">
              {suppliers.map((s: Supplier) => (
                <label
                  key={s.id}
                  className="inline-flex items-center gap-2 text-sm text-ink-primary"
                >
                  <input
                    type="checkbox"
                    checked={selectedSupplierIds.includes(s.id)}
                    onChange={() => toggleSupplier(s.id)}
                    className="h-4 w-4 rounded border-line"
                  />
                  <span>{s.name}</span>
                  {s.isImport && (
                    <span className="text-[10px] uppercase tracking-widest text-ink-muted bg-bg-surface border border-line px-1.5 py-0.5 rounded ml-1">
                      Import · {s.currency}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Fits Vehicles" hint="Comma-separated">
            <textarea
              rows={2}
              {...register('fitsVehicles')}
              className={cn(
                'w-full rounded-md bg-bg-subtle border border-line px-3 py-2',
                'text-sm text-ink-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'resize-y min-h-[56px]',
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Warranty Policy">
              <input
                type="text"
                {...register('warrantyPolicy')}
                className={inputCls}
              />
            </Field>
            <Field label="Superseded By">
              <input
                type="text"
                {...register('supersededBy')}
                className={cn(inputCls, 'font-mono')}
              />
            </Field>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Stock row (qty read-only) ───────────────────────────────────────────────

function EditStockRow({ idx }: { idx: number }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<EditPartFormValues>();
  const row = watch(`stock.${idx}`);
  const rowError = errors.stock?.[idx];

  return (
    <div className="grid grid-cols-[80px_1fr_1fr_1.5fr] gap-3 items-start">
      <span className="h-10 inline-flex items-center font-mono text-[12px] text-ink-primary">
        {OUTLET_NAMES[row?.outletId ?? ''] ?? row?.outletId}
      </span>
      <Field label="Qty (read-only)">
        <input
          type="number"
          value={row?.qtyReadOnly ?? 0}
          readOnly
          aria-readonly="true"
          aria-label={`Qty for ${row?.outletId}`}
          className={cn(
            inputCls,
            'text-right font-mono tabular-nums bg-bg-surface text-ink-muted cursor-not-allowed',
          )}
        />
      </Field>
      <Field label="Reorder Level" error={rowError?.reorderLevel?.message}>
        <input
          type="number"
          step="1"
          min="0"
          {...register(`stock.${idx}.reorderLevel`, {
            setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10)),
          })}
          className={cn(inputCls, 'text-right font-mono tabular-nums')}
          aria-label={`Reorder level for ${row?.outletId}`}
        />
      </Field>
      <Field label="Location">
        <input
          type="text"
          {...register(`stock.${idx}.location`)}
          className={cn(inputCls, 'font-mono')}
          aria-label={`Location for ${row?.outletId}`}
        />
      </Field>
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

const inputCls = cn(
  'h-10 w-full rounded-md bg-bg-subtle border border-line px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
);

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        {title}
      </h3>
      {hint && <p className="text-[11px] text-ink-muted mb-3">{hint}</p>}
      {children}
    </section>
  );
}

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
