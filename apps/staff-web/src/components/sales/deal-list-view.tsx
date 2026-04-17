'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Deal, DealStage } from '@dms/types';
import { DataTable, StateChip, AmountCell } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { cn } from '@dms/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<DealStage, string> = {
  'new-lead': 'New Lead',
  contacted: 'Contacted',
  'test-drive': 'Test Drive',
  reserved: 'Reserved',
  'sales-order': 'Sales Order',
  delivered: 'Delivered',
  lost: 'Lost',
  'on-hold': 'On Hold',
};

const STAGE_STATUS_MAP: Record<DealStage, StateChipStatus> = {
  'new-lead': 'draft',
  contacted: 'pending',
  'test-drive': 'listed',
  reserved: 'reserved',
  'sales-order': 'cpo',
  delivered: 'sold',
  lost: 'stale',
  'on-hold': 'stale',
};

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length >= 10) {
    const last2 = cleaned.slice(-2);
    const first5 = cleaned.slice(0, 5);
    return `${first5}···  ···${last2}`;
  }
  return phone;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: ColumnDef<Deal>[] = [
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <div className="min-w-[140px]">
        <p className="text-sm font-medium text-ink-primary truncate max-w-[180px]">
          {row.original.customerName}
        </p>
        <p className="font-mono text-[11px] text-ink-muted mt-0.5">
          {maskPhone(row.original.customerPhone)}
        </p>
      </div>
    ),
  },
  {
    id: 'vehicle',
    header: 'Vehicle',
    cell: ({ row }) => (
      <span className="text-sm text-ink-secondary truncate max-w-[180px] block">
        {row.original.vehicleName ?? (
          <span className="text-ink-muted">—</span>
        )}
      </span>
    ),
  },
  {
    id: 'stage',
    header: 'Stage',
    cell: ({ row }) => (
      <StateChip
        status={STAGE_STATUS_MAP[row.original.stage]}
        label={STAGE_LABEL[row.original.stage]}
      />
    ),
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      row.original.amount > 0 ? (
        <AmountCell amount={row.original.amount} align="right" size="sm" />
      ) : (
        <span className="text-ink-muted text-xs block text-right">—</span>
      )
    ),
  },
  {
    id: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
        {row.original.source === 'walk-in' ? 'WALK-IN' : row.original.source.toUpperCase()}
      </span>
    ),
  },
  {
    id: 'assigned',
    header: 'Advisor',
    cell: ({ row }) => (
      <span className="text-sm text-ink-secondary">
        {row.original.assignedToName ?? <span className="text-ink-muted">—</span>}
      </span>
    ),
  },
  {
    id: 'daysInStage',
    header: 'Days in Stage',
    cell: ({ row }) => (
      <span className={cn(
        'font-mono text-sm tabular-nums',
        row.original.daysInStage > 14 ? 'text-[rgb(var(--state-overdue))]' : 'text-ink-secondary',
      )}>
        {row.original.daysInStage}d
      </span>
    ),
  },
  {
    id: 'priority',
    header: 'P',
    cell: ({ row }) => {
      const { priority } = row.original;
      return (
        <span
          className={cn(
            'inline-block w-2 h-2 rounded-full',
            priority === 'high' && 'bg-[rgb(var(--state-overdue))]',
            priority === 'medium' && 'bg-[rgb(var(--state-pending))]',
            priority === 'low' && 'bg-bg-hover',
          )}
          aria-label={`${priority} priority`}
          title={`${priority} priority`}
        />
      );
    },
    size: 40,
  },
  {
    id: 'lastActivity',
    header: 'Last Activity',
    cell: ({ row }) => (
      <span className="text-xs text-ink-muted font-mono">
        {timeAgo(row.original.lastActivityAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
    ),
    size: 40,
    enableSorting: false,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealListViewProps {
  deals: Deal[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DealListView({ deals }: DealListViewProps) {
  const router = useRouter();

  return (
    <DataTable<Deal>
      columns={COLUMNS}
      data={deals}
      density="default"
      onRowClick={(deal) => router.push(`/sales/leads/${deal.id}`)}
      emptyState={
        <div className="text-center py-12">
          <p className="text-sm text-ink-muted">No deals match the current filters.</p>
        </div>
      }
      pageSize={25}
    />
  );
}
