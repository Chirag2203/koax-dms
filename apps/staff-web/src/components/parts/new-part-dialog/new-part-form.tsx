/**
 * NewPartForm — RHF body used by New Part SlideInPanel.
 * Four sections: Identity / Commercial / Stock / Supply & Misc.
 *
 * Spec reference: PLAN-PARTS-005 §4.2, §18
 */

'use client';

import { cloneElement, isValidElement, useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { Supplier } from '@dms/types';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { OUTLET_NAMES } from '../helpers';
import { BRAND_OPTIONS } from './new-part-helpers';
import type { NewPartFormValues } from './new-part-schema';

export function NewPartForm() {
  const {
    register,
    watch,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<NewPartFormValues>();

  const suppliers = usePartsStore((s) => s.suppliers);
  const selectedSupplierIds = watch('supplierIds') ?? [];

  // On blur of avgCost, if lastPurchasePrice is 0/empty, sync it to avgCost.
  // Reads via `getValues` (not closure) so we always see fresh values.
  const handleAvgCostBlur = () => {
    const last = getValues('lastPurchasePrice');
    const avg = getValues('avgCost');
    if (!last || last === 0) {
      setValue('lastPurchasePrice', avg ?? 0, { shouldValidate: true });
    }
  };

  // On blur of partCode, check store for a duplicate and surface an inline
  // error immediately (spec §4.3 live uniqueness check). Cleared on change.
  const handlePartCodeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (!value) return;
    const exists = usePartsStore
      .getState()
      .parts.some((p) => p.partCode === value);
    if (exists) {
      setError('partCode', {
        type: 'manual',
        message: 'A part with this code already exists',
      });
    }
  };

  const toggleSupplier = (id: string) => {
    const next = selectedSupplierIds.includes(id)
      ? selectedSupplierIds.filter((x) => x !== id)
      : [...selectedSupplierIds, id];
    setValue('supplierIds', next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Identity ─────────────────────────────────────────────────── */}
      <Section title="Identity">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field
            label="Part Code *"
            error={errors.partCode?.message}
            hint="Uppercase letters, digits, dashes only"
          >
            <input
              type="text"
              placeholder="BMW-BRK-PAD-G20"
              {...register('partCode', {
                onChange: () => clearErrors('partCode'),
                onBlur: handlePartCodeBlur,
              })}
              className={cn(inputCls, 'font-mono uppercase')}
            />
          </Field>
          <Field label="Name *" error={errors.name?.message}>
            <input
              type="text"
              placeholder="Front Brake Pad Set"
              {...register('name')}
              className={inputCls}
            />
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

      {/* ── Commercial ───────────────────────────────────────────────── */}
      <Section title="Commercial">
        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
          <Field label="UoM *" error={errors.uom?.message}>
            <input type="text" {...register('uom')} className={inputCls} />
          </Field>
          <Field
            label="HSN Code *"
            error={errors.hsnCode?.message}
            hint="4–8 digits"
          >
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
                onBlur: handleAvgCostBlur,
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

      {/* ── Stock (3 fixed outlets) ──────────────────────────────────── */}
      <Section
        title="Stock — Opening per Outlet"
        hint="Opening quantities are typically 0 — stock arrives via GRN posts."
      >
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((idx) => (
            <StockRow key={idx} idx={idx} />
          ))}
        </div>
      </Section>

      {/* ── Supply & Misc ────────────────────────────────────────────── */}
      <Section title="Supply & Misc">
        <div className="flex flex-col gap-5">
          <Field label="Suppliers" hint="Pick any number (0 OK)">
            <div className="rounded-md border border-line bg-bg-subtle p-3 flex flex-col gap-2 max-h-52 overflow-y-auto">
              {suppliers.length === 0 ? (
                <p className="text-[12px] text-ink-muted italic">
                  No suppliers yet — create one from the Suppliers tab.
                </p>
              ) : (
                suppliers.map((s: Supplier) => (
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
                ))
              )}
            </div>
          </Field>
          <Field
            label="Fits Vehicles"
            hint="Comma-separated: e.g. 'BMW 3 Series 2012-2019, BMW 4 Series 2014-2020'"
          >
            <textarea
              rows={2}
              {...register('fitsVehicles')}
              className={cn(
                'w-full rounded-md bg-bg-subtle border border-line px-3 py-2',
                'text-sm text-ink-primary placeholder:text-ink-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'resize-y min-h-[56px]',
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Warranty Policy">
              <input
                type="text"
                placeholder="e.g. 12 months / 20,000 km"
                {...register('warrantyPolicy')}
                className={inputCls}
              />
            </Field>
            <Field label="Superseded By" hint="Optional successor part code">
              <input
                type="text"
                placeholder="BMW-BRK-PAD-G20-V2"
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

// ─── Stock row ───────────────────────────────────────────────────────────────

function StockRow({ idx }: { idx: number }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<NewPartFormValues>();
  const outletId = watch(`stock.${idx}.outletId`);
  const rowError = errors.stock?.[idx];

  return (
    <div className="grid grid-cols-[80px_1fr_1fr_1.5fr] gap-3 items-start">
      <span className="h-10 inline-flex items-center font-mono text-[12px] text-ink-primary">
        {OUTLET_NAMES[outletId] ?? outletId}
      </span>
      <Field label="Qty" error={rowError?.qty?.message}>
        <input
          type="number"
          step="1"
          min="0"
          {...register(`stock.${idx}.qty`, {
            setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10)),
          })}
          className={cn(inputCls, 'text-right font-mono tabular-nums')}
          aria-label={`Qty for ${outletId}`}
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
          aria-label={`Reorder level for ${outletId}`}
        />
      </Field>
      <Field label="Location">
        <input
          type="text"
          placeholder="A-12-03"
          {...register(`stock.${idx}.location`)}
          className={cn(inputCls, 'font-mono')}
          aria-label={`Location for ${outletId}`}
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
