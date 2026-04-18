/**
 * PO Line Builder — dynamic useFieldArray list of line rows.
 *
 * Spec reference: PLAN-PARTS-004 §9, §18.3
 */

'use client';

// Table-style form: column headers serve as implicit labels for each row's
// inputs, and each input carries `aria-label` with a 1-indexed line number
// for SR context. This matches WAI-ARIA guidance for tabular form controls
// and the service module's warranty-form useFieldArray precedent — no
// per-cell `<label htmlFor>` needed.

import { useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Part } from '@dms/types';
import { AmountCell } from '@/src/components/primitives';
import {
  computeLineTotal,
  findFirstDuplicateIndex,
} from './new-po-helpers';
import type { NewPoFormValues } from './new-po-schema';

export interface NewPoLineBuilderProps {
  parts: Part[];
}

export function NewPoLineBuilder({ parts }: NewPoLineBuilderProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<NewPoFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  // Grouping for <select> <optgroup> — memoized on parts identity
  const grouped = useMemo(() => {
    const map = new Map<string, Part[]>();
    for (const p of parts) {
      const list = map.get(p.brand) ?? [];
      list.push(p);
      map.set(p.brand, list);
    }
    // Sort parts within each group by partCode
    for (const list of map.values()) {
      list.sort((a, b) => a.partCode.localeCompare(b.partCode));
    }
    // Sort groups by brand name (OEM brands first, Universal last)
    const order = ['BMW', 'Audi', 'Mercedes-Benz', 'Porsche', 'Universal'];
    return Array.from(map.entries()).sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [parts]);

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
          Line Items
        </h2>
        <button
          type="button"
          onClick={() =>
            append({ partCode: '', qty: 1, unitPrice: 0 })
          }
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line',
            'bg-bg-surface text-[13px] font-medium text-ink-primary',
            'hover:bg-bg-subtle hover:border-accent hover:text-accent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          )}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          Add line
        </button>
      </div>

      {/* Header row (labels) */}
      <div className="hidden md:grid grid-cols-[32px_1fr_80px_140px_140px_40px] gap-3 items-center pb-2 border-b border-line text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        <span>#</span>
        <span>Part</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit Price ₹</span>
        <span className="text-right">Line Total ₹</span>
        <span className="sr-only">Remove</span>
      </div>

      {/* Dynamic rows */}
      <ul className="flex flex-col">
        {fields.map((field, idx) => (
          <LineRow
            key={field.id}
            idx={idx}
            canRemove={fields.length > 1}
            onRemove={() => remove(idx)}
            parts={parts}
            grouped={grouped}
          />
        ))}
      </ul>

      {/* Add line footer button (full-width for keyboard reach) */}
      <button
        type="button"
        onClick={() =>
          append({ partCode: '', qty: 1, unitPrice: 0 })
        }
        className={cn(
          'mt-4 w-full h-10 rounded-md border border-dashed border-line',
          'text-[13px] text-ink-secondary hover:text-accent hover:border-accent/50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        )}
        aria-label="Add another line"
      >
        + Add line
      </button>

      {/* Array-level error */}
      {errors.lines && (errors.lines as { message?: string }).message && (
        <p
          role="alert"
          className="mt-2 text-[12px] text-[rgb(var(--state-stale))]"
        >
          {(errors.lines as { message?: string }).message}
        </p>
      )}
    </section>
  );
}

// ─── Single row ──────────────────────────────────────────────────────────────

interface LineRowProps {
  idx: number;
  canRemove: boolean;
  onRemove: () => void;
  parts: Part[];
  grouped: [string, Part[]][];
}

function LineRow({ idx, canRemove, onRemove, parts, grouped }: LineRowProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<NewPoFormValues>();

  // Watch this line and the full lines array for live computations
  const lineValues = useWatch({ control, name: `lines.${idx}` });
  const allLines = useWatch({ control, name: 'lines' });

  const qty = lineValues?.qty ?? 0;
  const unitPrice = lineValues?.unitPrice ?? 0;
  const lineTotal = computeLineTotal(qty, unitPrice);

  const selectedPart = parts.find((p) => p.partCode === lineValues?.partCode);

  const duplicateIndex = findFirstDuplicateIndex(allLines ?? [], idx);

  const rowError = errors.lines?.[idx];

  return (
    <li className="py-3 border-b border-line last:border-b-0">
      <div className="grid grid-cols-[32px_1fr_80px_140px_140px_40px] gap-3 items-start">
        <span className="text-[11px] font-mono text-ink-muted pt-3">
          {idx + 1}
        </span>

        <div className="flex flex-col gap-1">
          <select
            {...register(`lines.${idx}.partCode`, {
              onChange: (e) => {
                // Pre-fill unit price from part.lastPurchasePrice
                const p = parts.find((pp) => pp.partCode === e.target.value);
                if (p) {
                  setValue(`lines.${idx}.unitPrice`, p.lastPurchasePrice, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              },
            })}
            aria-label={`Part for line ${idx + 1}`}
            className={cn(
              'h-10 w-full rounded-md bg-bg-subtle border border-line px-3',
              'text-sm text-ink-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            <option value="">— Select part —</option>
            {grouped.map(([brand, list]) => (
              <optgroup key={brand} label={brand}>
                {list.map((p) => (
                  <option key={p.partCode} value={p.partCode}>
                    {p.partCode} — {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedPart && (
            <span className="text-[11px] text-ink-muted -mt-0.5">
              ↳ {selectedPart.name} · HSN {selectedPart.hsnCode}
            </span>
          )}
          {duplicateIndex !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 w-fit rounded-full px-2 py-0.5 mt-1',
                'text-[11px] font-medium',
                'border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
              )}
            >
              Already on line {duplicateIndex + 1}
            </span>
          )}
          {rowError?.partCode && (
            <span className="text-[11px] text-[rgb(var(--state-stale))]">
              {rowError.partCode.message}
            </span>
          )}
        </div>

        <input
          type="number"
          step="1"
          min="1"
          {...register(`lines.${idx}.qty`, {
            setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10)),
          })}
          aria-label={`Qty for line ${idx + 1}`}
          className={cn(
            'h-10 w-full rounded-md bg-bg-subtle border border-line px-2',
            'text-sm text-right font-mono tabular-nums text-ink-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          )}
        />

        <input
          type="number"
          step="0.01"
          min="0"
          {...register(`lines.${idx}.unitPrice`, {
            setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
          })}
          aria-label={`Unit price for line ${idx + 1}`}
          className={cn(
            'h-10 w-full rounded-md bg-bg-subtle border border-line px-2',
            'text-sm text-right font-mono tabular-nums text-ink-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          )}
        />

        <div className="h-10 flex items-center justify-end">
          <AmountCell amount={lineTotal} size="sm" align="left" />
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove line ${idx + 1}`}
          className={cn(
            'h-10 w-10 rounded-md flex items-center justify-center',
            'text-ink-muted hover:text-[rgb(var(--state-stale))] hover:bg-bg-subtle transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            !canRemove && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-ink-muted',
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
