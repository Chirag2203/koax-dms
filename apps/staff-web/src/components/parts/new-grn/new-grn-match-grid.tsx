/**
 * GRN Match Grid — tabular 3-way match input per PO line.
 *
 * Spec reference: PLAN-PARTS-004 §10, §18.5, §18.7
 */

'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { NewGrnFormValues } from './new-grn-schema';

export function NewGrnMatchGrid() {
  const {
    control,
    formState: { errors },
  } = useFormContext<NewGrnFormValues>();

  const lines = useWatch({ control, name: 'lines' }) ?? [];

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Match Grid
      </h2>

      <div className="overflow-x-auto">
        {/* Header row */}
        <div
          className={cn(
            'min-w-[920px] grid',
            'grid-cols-[minmax(220px,1.5fr)_80px_100px_110px_130px_120px_minmax(200px,1.5fr)]',
            'gap-3 items-center pb-2 border-b border-line',
            'text-[11px] font-medium uppercase tracking-wide text-ink-muted',
          )}
        >
          <span>Part</span>
          <span className="text-right">Ordered</span>
          <span className="text-right">Received</span>
          <span className="text-right">Unit ₹</span>
          <span>Condition</span>
          <span>Batch No</span>
          <span>Serial Nos</span>
        </div>

        {/* Rows */}
        <ul className="flex flex-col">
          {lines.map((line, idx) => (
            <Row key={`${line.partCode}-${idx}`} idx={idx} />
          ))}
        </ul>
      </div>

      {/* Array-level error */}
      {errors.lines && (errors.lines as { message?: string }).message && (
        <p
          role="alert"
          className="mt-3 text-[12px] text-[rgb(var(--state-stale))]"
        >
          {(errors.lines as { message?: string }).message}
        </p>
      )}
    </section>
  );
}

// ─── Single row ──────────────────────────────────────────────────────────────

function Row({ idx }: { idx: number }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<NewGrnFormValues>();

  const line = useWatch({ control, name: `lines.${idx}` });

  const received = line?.receivedQty ?? 0;
  const ordered = line?.orderedQty ?? 0;
  const isShort = received > 0 && received < ordered;
  const isSkipped = received === 0;
  const isOver = received > ordered;

  const receivedInputCls = cn(
    'h-10 w-full rounded-md bg-bg-subtle border px-2',
    'text-sm text-right font-mono tabular-nums',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
    isShort
      ? 'border-[rgb(var(--state-overdue)/0.4)] text-[rgb(var(--state-overdue))]'
      : 'border-line text-ink-primary',
  );

  const condition = line?.condition;
  const conditionCls = cn(
    'h-10 w-full rounded-md bg-bg-subtle border px-2',
    'text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
    condition === 'DAMAGED'
      ? 'border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.05)] text-[rgb(var(--state-overdue))]'
      : condition === 'WRONG'
        ? 'border-[rgb(var(--state-stale)/0.4)] bg-[rgb(var(--state-stale)/0.05)] text-[rgb(var(--state-stale))]'
        : 'border-line text-ink-primary',
  );

  const rowCls = cn(
    'min-w-[920px] grid',
    'grid-cols-[minmax(220px,1.5fr)_80px_100px_110px_130px_120px_minmax(200px,1.5fr)]',
    'gap-3 items-start py-3 border-b border-line last:border-b-0',
    isSkipped && 'opacity-60',
  );

  const rowError = errors.lines?.[idx];

  return (
    <li className={rowCls}>
      <span className="pt-3 font-mono text-[12px] text-ink-primary truncate">
        {line?.partCode ?? '—'}
      </span>

      <span className="pt-3 text-right font-mono tabular-nums text-[13px] text-ink-secondary">
        {ordered}
      </span>

      <div className="flex flex-col gap-1">
        <input
          type="number"
          step="1"
          min="0"
          {...register(`lines.${idx}.receivedQty`, {
            setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10)),
          })}
          aria-label={`Received quantity for line ${idx + 1}`}
          className={receivedInputCls}
        />
        {isOver && (
          <span
            className={cn(
              'inline-flex items-center gap-1 w-fit rounded-full px-2 py-0.5',
              'text-[10px] font-medium',
              'border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
            )}
          >
            Over-receipt (+{received - ordered})
          </span>
        )}
        {rowError?.receivedQty && (
          <span className="text-[10px] text-[rgb(var(--state-stale))]">
            {rowError.receivedQty.message}
          </span>
        )}
      </div>

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

      <select
        {...register(`lines.${idx}.condition`)}
        aria-label={`Condition for line ${idx + 1}`}
        className={conditionCls}
      >
        <option value="OK">OK</option>
        <option value="DAMAGED">Damaged</option>
        <option value="WRONG">Wrong</option>
      </select>

      <input
        type="text"
        {...register(`lines.${idx}.batchNo`)}
        placeholder="—"
        aria-label={`Batch number for line ${idx + 1}`}
        className={cn(
          'h-10 w-full rounded-md bg-bg-subtle border border-line px-2',
          'text-sm text-ink-primary placeholder:text-ink-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        )}
      />

      <input
        type="text"
        {...register(`lines.${idx}.serialNosRaw`)}
        placeholder="comma-separated"
        aria-label={`Serial numbers for line ${idx + 1}`}
        className={cn(
          'h-10 w-full rounded-md bg-bg-subtle border border-line px-2',
          'text-sm text-ink-primary placeholder:text-ink-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        )}
      />
    </li>
  );
}
