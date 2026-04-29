'use client';

/**
 * ActiveDealCard — pinned card showing the current active deal for this VIN.
 *
 * Shows: stage chip, customer name, amount, deposit, reservation expiry.
 * Spec reference: PLAN-VEHICLES-003 P2 §8
 * LoC budget: ≤160
 */

import { cn } from '@dms/ui';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Stage chip config ────────────────────────────────────────────────────────

const STAGE_CHIP: Record<string, { label: string; cls: string }> = {
  reserved: { label: 'Reserved', cls: 'bg-state-warning/15 text-state-warning border-state-warning/25' },
  'sales-order': { label: 'Sales Order', cls: 'bg-accent/15 text-accent border-accent/25' },
  delivered: { label: 'Delivered', cls: 'bg-state-success/15 text-state-success border-state-success/25' },
};

function StageChip({ stage }: { stage: string }) {
  const config = STAGE_CHIP[stage] ?? { label: stage, cls: 'bg-bg-subtle text-ink-muted border-line' };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
      config.cls,
    )}>
      {config.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface ActiveDealCardProps {
  deal: Deal;
}

export function ActiveDealCard({ deal }: ActiveDealCardProps) {
  const depositLine = deal.stage === 'reserved' && deal.amount > 0;

  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-4 mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StageChip stage={deal.stage} />
          <span className="text-xs font-mono text-ink-muted">{deal.id}</span>
        </div>
        {deal.assignedToName && (
          <span className="text-xs text-ink-muted">
            Assigned: <span className="text-ink-secondary">{deal.assignedToName}</span>
          </span>
        )}
      </div>

      {/* Customer + amount */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-ink-muted text-xs">Customer</span>
          <p className="font-medium text-ink-primary">{deal.customerName}</p>
        </div>
        <div>
          <span className="text-ink-muted text-xs">Deal amount</span>
          <p className="font-medium text-ink-primary tabular-nums">
            {deal.amount > 0 ? formatINR(deal.amount) : '—'}
          </p>
        </div>

        {depositLine && (
          <>
            <div>
              <span className="text-ink-muted text-xs">Deposit</span>
              <p className="text-ink-secondary tabular-nums">{formatINR(deal.amount)}</p>
            </div>
          </>
        )}

        {deal.stage === 'reserved' && deal.reservationExpiresAt && (
          <div className={depositLine ? 'col-span-1' : 'col-span-2'}>
            <span className="text-ink-muted text-xs">Expires</span>
            <p className={cn(
              'text-sm tabular-nums',
              new Date(deal.reservationExpiresAt) < new Date()
                ? 'text-state-danger font-medium'
                : 'text-ink-secondary',
            )}>
              {formatDate(deal.reservationExpiresAt)}
            </p>
          </div>
        )}
      </div>

      {/* Phone / email */}
      <div className="mt-2 pt-2 border-t border-accent/20 text-xs text-ink-muted flex gap-4">
        <span>{deal.customerPhone}</span>
        {deal.customerEmail && <span>{deal.customerEmail}</span>}
      </div>
    </div>
  );
}
