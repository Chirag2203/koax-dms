/**
 * Vendor invoice status chip — SPEC-FINANCE-001 §5.1
 *
 * L22: Status lifecycle: pending → approved → paid; dispute reverts to pending.
 * SPEC-ARCH-UI-001 §StateChip pattern.
 */

'use client';

import type { VendorInvoiceStatus } from '@dms/types';

interface VendorInvoiceStatusChipProps {
  status: VendorInvoiceStatus;
}

const STATUS_CONFIG: Record<VendorInvoiceStatus, { chip: string; dot: string; label: string }> = {
  pending: {
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
    dot: 'bg-ink-muted',
    label: 'Pending',
  },
  approved: {
    chip: 'bg-[rgb(var(--state-pending)/0.08)] text-[rgb(var(--state-pending))]',
    dot: 'bg-[rgb(var(--state-pending))]',
    label: 'Approved',
  },
  paid: {
    chip: 'bg-[rgb(var(--state-listed)/0.08)] text-[rgb(var(--state-listed))]',
    dot: 'bg-[rgb(var(--state-listed))]',
    label: 'Paid',
  },
  disputed: {
    chip: 'bg-[rgb(var(--state-overdue)/0.08)] text-[rgb(var(--state-overdue))]',
    dot: 'bg-[rgb(var(--state-overdue))]',
    label: 'Disputed',
  },
};

export function VendorInvoiceStatusChip({ status }: VendorInvoiceStatusChipProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cfg.chip}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
