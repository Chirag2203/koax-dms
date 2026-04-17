import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StateChipStatus =
  | 'listed'
  | 'reserved'
  | 'in-refurb'
  | 'stale'
  | 'sold'
  | 'draft'
  | 'overdue'
  | 'cpo'
  | 'pending'
  // ── Service: Job Card statuses ───────────────────────────────────────────────
  | 'svc-received'
  | 'svc-diagnosed'
  | 'svc-in-progress'
  | 'svc-waiting-parts'
  | 'svc-approval'
  | 'svc-qc'
  | 'svc-ready'
  | 'svc-delivered'
  | 'svc-cancelled'
  | 'svc-reopened'
  // ── Service: Bay statuses ────────────────────────────────────────────────────
  | 'bay-free'
  | 'bay-occupied'
  | 'bay-reserved'
  | 'bay-maintenance'
  // ── Service: Appointment statuses ────────────────────────────────────────────
  | 'apt-scheduled'
  | 'apt-confirmed'
  | 'apt-checked-in'
  | 'apt-cancelled'
  | 'apt-no-show'
  // ── Service: Warranty claim statuses ────────────────────────────────────────
  | 'wc-draft'
  | 'wc-submitted'
  | 'wc-under-review'
  | 'wc-approved'
  | 'wc-rejected'
  | 'wc-paid'
  // ── Service: Priority ────────────────────────────────────────────────────────
  | 'priority-low'
  | 'priority-normal'
  | 'priority-high'
  | 'priority-vip'
  // ── Parts: Stock status ──────────────────────────────────────────────────────
  | 'stock-ok'
  | 'stock-low'
  | 'stock-out'
  // ── Parts: Purchase Order statuses ───────────────────────────────────────────
  | 'po-draft'
  | 'po-pending-approval'
  | 'po-approved'
  | 'po-rejected'
  | 'po-cancelled'
  | 'po-dispatched'
  | 'po-partially-received'
  | 'po-received'
  | 'po-closed'
  // ── Parts: GRN statuses ──────────────────────────────────────────────────────
  | 'grn-draft'
  | 'grn-pending-qc'
  | 'grn-matched'
  | 'grn-rejected'
  | 'grn-posted';

export interface StateChipProps {
  status: StateChipStatus;
  /** Override label; defaults to formatted status name */
  label?: string;
  className?: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StateChipStatus,
  { label: string; dot: string; chip: string }
> = {
  listed: {
    label: 'Listed',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  reserved: {
    label: 'Reserved',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'in-refurb': {
    label: 'In Refurb',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  stale: {
    label: 'Stale',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
  sold: {
    label: 'Sold',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  draft: {
    label: 'Draft',
    dot: 'bg-[rgb(var(--state-draft))]',
    chip: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
  },
  overdue: {
    label: 'Overdue',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  cpo: {
    label: 'CPO',
    dot: 'bg-[rgb(var(--state-cpo))]',
    chip: 'bg-[rgb(var(--state-cpo)/0.1)] text-[rgb(var(--state-cpo))]',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  // ── Service: Job Card statuses ─────────────────────────────────────────────
  'svc-received': {
    label: 'Received',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  'svc-diagnosed': {
    label: 'Diagnosed',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'svc-in-progress': {
    label: 'In Progress',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  'svc-waiting-parts': {
    label: 'Waiting Parts',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  'svc-approval': {
    label: 'Awaiting Approval',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  'svc-qc': {
    label: 'QC',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'svc-ready': {
    label: 'Ready',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  'svc-delivered': {
    label: 'Delivered',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  'svc-cancelled': {
    label: 'Cancelled',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
  'svc-reopened': {
    label: 'Reopened',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  // ── Service: Bay statuses ──────────────────────────────────────────────────
  'bay-free': {
    label: 'Free',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  'bay-occupied': {
    label: 'Occupied',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  'bay-reserved': {
    label: 'Reserved',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'bay-maintenance': {
    label: 'Maintenance',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
  // ── Service: Appointment statuses ─────────────────────────────────────────
  'apt-scheduled': {
    label: 'Scheduled',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  'apt-confirmed': {
    label: 'Confirmed',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'apt-checked-in': {
    label: 'Checked In',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  'apt-cancelled': {
    label: 'Cancelled',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
  'apt-no-show': {
    label: 'No Show',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  // ── Service: Warranty statuses ─────────────────────────────────────────────
  'wc-draft': {
    label: 'Draft',
    dot: 'bg-[rgb(var(--state-draft))]',
    chip: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
  },
  'wc-submitted': {
    label: 'Submitted',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'wc-under-review': {
    label: 'Under Review',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'wc-approved': {
    label: 'Approved',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  'wc-rejected': {
    label: 'Rejected',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  'wc-paid': {
    label: 'Paid',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  // ── Service: Priority ──────────────────────────────────────────────────────
  'priority-low': {
    label: 'Low',
    dot: 'bg-[rgb(var(--state-draft))]',
    chip: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
  },
  'priority-normal': {
    label: 'Normal',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  'priority-high': {
    label: 'High',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  'priority-vip': {
    label: 'VIP',
    dot: 'bg-[rgb(var(--state-cpo))]',
    chip: 'bg-[rgb(var(--state-cpo)/0.1)] text-[rgb(var(--state-cpo))]',
  },
  // ── Parts: Stock status ────────────────────────────────────────────────────
  'stock-ok': {
    label: 'OK',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  'stock-low': {
    label: 'Low',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  'stock-out': {
    label: 'Out',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
  // ── Parts: Purchase Order statuses ─────────────────────────────────────────
  'po-draft': {
    label: 'Draft',
    dot: 'bg-[rgb(var(--state-draft))]',
    chip: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
  },
  'po-pending-approval': {
    label: 'Pending Approval',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  'po-approved': {
    label: 'Approved',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'po-rejected': {
    label: 'Rejected',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  'po-cancelled': {
    label: 'Cancelled',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
  'po-dispatched': {
    label: 'Dispatched',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  'po-partially-received': {
    label: 'Partially Received',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  'po-received': {
    label: 'Received',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  'po-closed': {
    label: 'Closed',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  // ── Parts: GRN statuses ────────────────────────────────────────────────────
  'grn-draft': {
    label: 'Draft',
    dot: 'bg-[rgb(var(--state-draft))]',
    chip: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
  },
  'grn-pending-qc': {
    label: 'Pending QC',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  'grn-matched': {
    label: 'Matched',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'grn-rejected': {
    label: 'Rejected',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  'grn-posted': {
    label: 'Posted',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StateChip({ status, label, className }: StateChipProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5',
        'font-mono text-[10px] uppercase tracking-widest',
        config.chip,
        className,
      )}
      aria-label={`Status: ${displayLabel}`}
    >
      <span
        className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', config.dot)}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}
