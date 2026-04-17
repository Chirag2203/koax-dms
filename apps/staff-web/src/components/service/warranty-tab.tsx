'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useServiceStore } from '@/src/lib/service/service-store';
import { cn } from '@dms/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StateChip, AmountCell } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import type { WarrantyClaim } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WC_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  DRAFT: 'wc-draft',
  SUBMITTED: 'wc-submitted',
  UNDER_REVIEW: 'wc-under-review',
  APPROVED: 'wc-approved',
  REJECTED: 'wc-rejected',
  PAID: 'wc-paid',
};

const WC_TYPE_LABELS: Record<string, string> = {
  MANUFACTURER: 'Manufacturer',
  EXTENDED: 'Extended',
  CPO: 'CPO',
  GOODWILL: 'Goodwill',
};

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── Date range ───────────────────────────────────────────────────────────────

type DateRangeFilter = 'today' | 'this-week' | 'all';

function isThisWeek(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return d >= weekStart && d <= weekEnd;
}

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WarrantyTab() {
  const { toasts, dismiss } = useToast();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [search, setSearch] = useState('');

  const claims = useServiceStore((s) => s.warrantyClaims);

  const filtered = useMemo(() => {
    let result = [...claims];

    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (typeFilter !== 'ALL') {
      result = result.filter((c) => c.type === typeFilter);
    }
    if (dateRange === 'today') {
      result = result.filter((c) => isToday(c.submittedAt));
    } else if (dateRange === 'this-week') {
      result = result.filter((c) => isThisWeek(c.submittedAt));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.claimNo.toLowerCase().includes(q) ||
          c.vin.toLowerCase().includes(q) ||
          c.reason.toLowerCase().includes(q),
      );
    }

    return result.sort((a, b) => {
      // Sort by submittedAt desc, drafts first without date
      if (!a.submittedAt && b.submittedAt) return -1;
      if (a.submittedAt && !b.submittedAt) return 1;
      if (!a.submittedAt && !b.submittedAt) return 0;
      return new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime();
    });
  }, [claims, statusFilter, typeFilter, dateRange, search]);

  const columns = useMemo<ColumnDef<WarrantyClaim>[]>(
    () => [
      {
        id: 'claimNo',
        header: 'Claim No.',
        accessorFn: (c) => c.claimNo,
        cell: ({ getValue }) => (
          <span className="font-mono text-[13px] text-ink-primary tabular-nums whitespace-nowrap">
            {getValue<string>()}
          </span>
        ),
        size: 150,
      },
      {
        id: 'vin',
        header: 'VIN',
        accessorFn: (c) => c.vin,
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px] text-ink-muted whitespace-nowrap">
            {maskVin(getValue<string>())}
          </span>
        ),
        size: 150,
      },
      {
        id: 'type',
        header: 'Type',
        accessorFn: (c) => c.type,
        cell: ({ getValue }) => {
          const type = getValue<string>();
          return (
            <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
              {WC_TYPE_LABELS[type] ?? type}
            </span>
          );
        },
        size: 120,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (c) => c.status,
        cell: ({ row }) => {
          const chip = WC_STATUS_TO_CHIP[row.original.status] ?? 'pending';
          return <StateChip status={chip} />;
        },
        size: 130,
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorFn: (c) => c.amount,
        cell: ({ getValue }) => (
          <AmountCell amount={getValue<number>()} align="right" />
        ),
        size: 130,
        meta: { align: 'right' },
      },
      {
        id: 'submittedAt',
        header: 'Submitted',
        accessorFn: (c) => c.submittedAt ?? '',
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-ink-muted tabular-nums whitespace-nowrap">
            {formatDate(row.original.submittedAt)}
          </span>
        ),
        size: 120,
      },
      {
        id: 'reason',
        header: 'Reason',
        accessorFn: (c) => c.reason,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-ink-secondary line-clamp-1 max-w-[240px]">
            {getValue<string>()}
          </span>
        ),
        size: 240,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Link
            href={`/service/warranty/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'text-[12px] text-accent hover:underline',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded',
            )}
          >
            View
          </Link>
        ),
        size: 60,
        enableSorting: false,
      },
    ],
    [],
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-2 py-16">
      <p className="text-sm font-medium text-ink-primary">No warranty claims match your filters.</p>
      <button
        type="button"
        onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setDateRange('all'); setSearch(''); }}
        className="text-sm text-accent hover:underline focus-visible:outline-none"
      >
        Clear filters
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Filter row ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0">
        <div className="rounded-md border border-line bg-bg-surface p-3 flex flex-wrap items-center gap-3">

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={cn(
              'h-9 rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by claim type"
            className={cn(
              'h-9 rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
          >
            <option value="ALL">All Types</option>
            <option value="MANUFACTURER">Manufacturer</option>
            <option value="EXTENDED">Extended</option>
            <option value="CPO">CPO</option>
            <option value="GOODWILL">Goodwill</option>
          </select>

          {/* Date range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
            aria-label="Filter by date range"
            className={cn(
              'h-9 rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
          >
            <option value="all">All Dates</option>
            <option value="today">Submitted Today</option>
            <option value="this-week">Submitted This Week</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search claim no., VIN, reason…"
              aria-label="Search warranty claims"
              className={cn(
                'h-9 w-full rounded-md border border-line bg-bg-subtle pl-9 pr-3 text-sm text-ink-primary',
                'placeholder:text-ink-muted',
                'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
              )}
            />
          </div>

          {/* Count */}
          <span className="text-[12px] text-ink-muted whitespace-nowrap">
            {filtered.length} claim{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <DataTable<WarrantyClaim>
          columns={columns}
          data={filtered}
          density="compact"
          pageSize={25}
          emptyState={emptyState}
        />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
