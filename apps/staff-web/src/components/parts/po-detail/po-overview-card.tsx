/**
 * PoOverviewCard — stat grid for PO summary metrics.
 *
 * Spec reference: PLAN-PARTS-006 §4.2
 */

import type { PurchaseOrder } from '@dms/types';
import { AmountCell } from '@/src/components/primitives';
import { staffName, formatDate, formatDateTime, OUTLET_NAMES } from '../helpers';

export interface PoOverviewCardProps {
  po: PurchaseOrder;
}

export function PoOverviewCard({ po }: PoOverviewCardProps) {
  const DISPATCHED_OR_LATER: Array<typeof po.status> = [
    'DISPATCHED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CLOSED',
  ];

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Overview
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
        <MoneyTile label="Subtotal" amount={po.subtotal} />
        <MoneyTile label="GST" amount={po.gst} />
        <MoneyTile label="Grand Total" amount={po.total} highlight />
        <TextTile
          label="Expected Delivery"
          value={formatDate(po.expectedDeliveryAt)}
        />
        <TextTile label="Lines" value={String(po.lines.length)} mono />
        <TextTile
          label="Created By"
          value={`${staffName(po.createdBy)} · ${formatDate(po.createdAt)}`}
          small
        />
        {po.approvedAt && po.approverId && (
          <TextTile
            label="Approved By"
            value={`${staffName(po.approverId)} · ${formatDate(po.approvedAt)}`}
            small
          />
        )}
        {po.dispatchedAt && DISPATCHED_OR_LATER.includes(po.status) && (
          <TextTile
            label="Dispatched At"
            value={formatDateTime(po.dispatchedAt)}
            small
          />
        )}
        <TextTile
          label="Outlet"
          value={OUTLET_NAMES[po.outletId] ?? po.outletId}
        />
        {po.isImport && po.fxRate && (
          <TextTile
            label="FX Rate (EUR)"
            value={`₹ ${po.fxRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            mono
          />
        )}
        {po.notes && (
          <div className="col-span-2 lg:col-span-4 flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
              Notes
            </span>
            <p className="text-[13px] text-ink-secondary">{po.notes}</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Tiles ────────────────────────────────────────────────────────────────────

function MoneyTile({
  label,
  amount,
  highlight,
}: {
  label: string;
  amount: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <AmountCell amount={amount} align="left" size={highlight ? 'lg' : 'md'} />
    </div>
  );
}

function TextTile({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <span
        className={[
          'font-medium text-ink-primary',
          mono ? 'font-mono' : '',
          small ? 'text-[13px]' : 'text-[15px]',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
