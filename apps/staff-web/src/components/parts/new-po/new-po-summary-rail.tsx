/**
 * PO Summary Rail — sticky right-side card with live totals.
 *
 * Spec reference: PLAN-PARTS-004 §18.4
 */

'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { cn } from '@dms/ui';
import type { Supplier } from '@dms/types';
import { AmountCell } from '@/src/components/primitives';
import { OUTLET_NAMES } from '../helpers';
import { computePoTotals } from './new-po-helpers';
import type { NewPoFormValues } from './new-po-schema';

export interface NewPoSummaryRailProps {
  suppliers: Supplier[];
  onCancel: () => void;
  isSubmitting: boolean;
}

export function NewPoSummaryRail({
  suppliers,
  onCancel,
  isSubmitting,
}: NewPoSummaryRailProps) {
  const { control } = useFormContext<NewPoFormValues>();

  const supplierId = useWatch({ control, name: 'supplierId' });
  const outletId = useWatch({ control, name: 'outletId' });
  const lines = useWatch({ control, name: 'lines' });

  const supplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId],
  );

  const totals = useMemo(() => computePoTotals(lines ?? []), [lines]);
  const lineCount = (lines ?? []).filter((l) => l.partCode && l.qty > 0).length;

  return (
    <aside
      className={cn(
        'xl:sticky xl:top-6 self-start',
        'rounded-md border border-line bg-bg-surface p-5',
        'flex flex-col gap-5',
      )}
      aria-label="Purchase order summary"
    >
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
        Summary
      </h2>

      {supplier ? (
        <div>
          <LabelRow label="Supplier" />
          <p className="text-sm font-medium text-ink-primary mt-0.5">
            {supplier.name}
          </p>
          <p className="text-[11px] font-mono text-ink-muted mt-0.5">
            {supplier.paymentTerms} · {supplier.currency}
          </p>
        </div>
      ) : (
        <p className="text-xs text-ink-muted italic text-center py-4">
          Pick a supplier and add lines to see the total.
        </p>
      )}

      {supplier && (
        <div>
          <LabelRow label="Outlet" />
          <p className="text-sm text-ink-primary mt-0.5">
            {OUTLET_NAMES[outletId] ?? outletId} ({outletId})
          </p>
        </div>
      )}

      <div className="border-t border-line pt-4 flex flex-col gap-2">
        <SummaryLine label="Lines" value={String(lineCount)} />
        <SummaryLine
          label="Subtotal"
          value={<AmountCell amount={totals.subtotal} size="sm" align="left" />}
        />
        <SummaryLine
          label="GST (28%)"
          value={<AmountCell amount={totals.gst} size="sm" align="left" />}
        />
        <div className="border-t border-line pt-2" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Grand Total
          </span>
          <AmountCell amount={totals.total} size="md" align="left" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'h-10 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary',
            'hover:bg-bg-subtle transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className={cn(
            'h-10 rounded-md bg-accent text-white text-sm font-medium',
            'hover:bg-accent/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting ? 'Creating…' : 'Submit'}
        </button>
      </div>
    </aside>
  );
}

// ─── Local bits ───────────────────────────────────────────────────────────────

function LabelRow({ label }: { label: string }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
      {label}
    </span>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-ink-secondary">{label}</span>
      <span className="text-[13px] font-mono tabular-nums text-ink-primary">
        {value}
      </span>
    </div>
  );
}
