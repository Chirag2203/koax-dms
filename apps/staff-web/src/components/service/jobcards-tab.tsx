'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { useServiceStore } from '@/src/lib/service/service-store';
import { cn } from '@dms/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StateChip, Gate, AmountCell } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import type { JobCard } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADVISOR_NAMES: Record<string, string> = {
  'staff-r09-001': 'Priya Sharma',
  'staff-r09-002': 'Rajesh Kumar',
  'staff-r09-003': 'Deepa Nair',
};

const OUTLET_NAMES: Record<string, string> = {
  'BLR-01': 'Bangalore',
  'MUM-01': 'Mumbai',
  'CHE-01': 'Chennai',
};

const JC_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  RECEIVED: 'svc-received',
  DIAGNOSED: 'svc-diagnosed',
  IN_PROGRESS: 'svc-in-progress',
  WAITING_PARTS: 'svc-waiting-parts',
  ADDITIONAL_WORK_APPROVAL: 'svc-approval',
  QC: 'svc-qc',
  READY_FOR_DELIVERY: 'svc-ready',
  DELIVERED: 'svc-delivered',
  CANCELLED: 'svc-cancelled',
  REOPENED: 'svc-reopened',
};

const PRIORITY_TO_CHIP: Record<string, StateChipStatus> = {
  LOW: 'priority-low',
  NORMAL: 'priority-normal',
  HIGH: 'priority-high',
  VIP: 'priority-vip',
};

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

// ─── Saved view type ──────────────────────────────────────────────────────────

type JcView = 'all' | 'mine' | 'due-today' | 'waiting-parts' | 'ready' | 'completed';

const JC_VIEWS: { id: JcView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'due-today', label: 'Due Today' },
  { id: 'waiting-parts', label: 'Waiting on Parts' },
  { id: 'ready', label: 'Ready for Delivery' },
  { id: 'completed', label: 'Completed' },
];

// Mock current user advisor ID — in production this comes from auth context
const CURRENT_ADVISOR_ID = 'staff-r09-001';

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardsTab() {
  const [activeView, setActiveView] = useState<JcView>('all');
  const [advisorFilter, setAdvisorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const jobCards = useServiceStore((s) => s.jobCards);

  const filtered = useMemo(() => {
    let result = [...jobCards];

    // Saved view filter
    if (activeView === 'mine') {
      result = result.filter((jc) => jc.advisorId === CURRENT_ADVISOR_ID);
    } else if (activeView === 'due-today') {
      result = result.filter((jc) => isToday(jc.promisedAt));
    } else if (activeView === 'waiting-parts') {
      result = result.filter((jc) => jc.status === 'WAITING_PARTS');
    } else if (activeView === 'ready') {
      result = result.filter((jc) => jc.status === 'READY_FOR_DELIVERY');
    } else if (activeView === 'completed') {
      result = result.filter((jc) => jc.status === 'DELIVERED');
    }

    // Advisor filter
    if (advisorFilter !== 'ALL') {
      result = result.filter((jc) => jc.advisorId === advisorFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((jc) => jc.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      result = result.filter((jc) => jc.priority === priorityFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (jc) =>
          jc.jobNo.toLowerCase().includes(q) ||
          jc.vin.toLowerCase().includes(q) ||
          jc.customerId.toLowerCase().includes(q),
      );
    }

    // Default sort: receivedAt desc
    return result.sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
  }, [jobCards, activeView, advisorFilter, statusFilter, priorityFilter, search]);

  const columns = useMemo<ColumnDef<JobCard>[]>(
    () => [
      {
        id: 'jobNo',
        header: 'JC No.',
        accessorFn: (jc) => jc.jobNo,
        cell: ({ getValue }) => (
          <span className="font-mono text-[13px] text-ink-primary tabular-nums whitespace-nowrap">
            {getValue<string>()}
          </span>
        ),
        size: 140,
      },
      {
        id: 'vin',
        header: 'VIN',
        accessorFn: (jc) => jc.vin,
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px] text-ink-muted whitespace-nowrap">
            {maskVin(getValue<string>())}
          </span>
        ),
        size: 150,
      },
      {
        id: 'customer',
        header: 'Customer',
        accessorFn: (jc) => jc.customerId,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-ink-secondary">{getValue<string>()}</span>
        ),
        size: 130,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (jc) => jc.status,
        cell: ({ row }) => {
          const chip = JC_STATUS_TO_CHIP[row.original.status] ?? 'pending';
          return <StateChip status={chip} />;
        },
        size: 150,
      },
      {
        id: 'priority',
        header: 'Priority',
        accessorFn: (jc) => jc.priority,
        cell: ({ row }) => {
          const chip = PRIORITY_TO_CHIP[row.original.priority] ?? 'priority-normal';
          return <StateChip status={chip} />;
        },
        size: 100,
      },
      {
        id: 'advisor',
        header: 'Advisor',
        accessorFn: (jc) => jc.advisorId,
        cell: ({ getValue }) => {
          const id = getValue<string>();
          return (
            <span className="text-[13px] text-ink-secondary">
              {ADVISOR_NAMES[id] ?? id}
            </span>
          );
        },
        size: 130,
      },
      {
        id: 'outlet',
        header: 'Outlet',
        accessorFn: (jc) => jc.outletId,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-ink-secondary">
            {OUTLET_NAMES[getValue<string>()] ?? getValue<string>()}
          </span>
        ),
        size: 100,
      },
      {
        id: 'receivedAt',
        header: 'Received',
        accessorFn: (jc) => jc.receivedAt,
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px] text-ink-muted tabular-nums whitespace-nowrap">
            {formatDate(getValue<string>())}
          </span>
        ),
        size: 110,
      },
      {
        id: 'promisedAt',
        header: 'Promised',
        accessorFn: (jc) => jc.promisedAt,
        cell: ({ row }) => {
          const iso = row.original.promisedAt;
          const overdue = isOverdue(iso) && !['DELIVERED', 'READY_FOR_DELIVERY'].includes(row.original.status);
          return (
            <span
              className={cn(
                'font-mono text-[12px] tabular-nums whitespace-nowrap',
                overdue ? 'text-state-danger font-semibold' : 'text-ink-muted',
              )}
            >
              {formatDate(iso)}
            </span>
          );
        },
        size: 110,
      },
      {
        id: 'estimate',
        header: 'Estimate',
        accessorFn: (jc) => jc.estimatedTotal,
        cell: ({ getValue }) => <AmountCell amount={getValue<number>()} align="right" />,
        size: 120,
        meta: { align: 'right' },
      },
      {
        id: 'finalTotal',
        header: 'Final Total',
        accessorFn: (jc) => jc.finalTotal ?? 0,
        cell: ({ row }) => {
          const total = row.original.finalTotal;
          return (
            <Gate role={['R19', 'R22', 'R24']} fallback="hide">
              {total != null ? (
                <AmountCell amount={total} align="right" />
              ) : (
                <span className="text-ink-muted text-[12px]">—</span>
              )}
            </Gate>
          );
        },
        size: 120,
        meta: { align: 'right' },
      },
      {
        id: 'labourProgress',
        header: 'Progress',
        cell: ({ row }) => {
          const jc = row.original;
          const total = jc.labourLines.length;
          const done = jc.labourLines.filter((l) => l.status === 'DONE').length;
          if (total === 0) return <span className="text-ink-muted text-[12px]">—</span>;
          return (
            <span className="font-mono text-[12px] text-ink-secondary tabular-nums">
              {done}/{total}
            </span>
          );
        },
        size: 80,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Link
            href={`/service/jobcards/${row.original.id}`}
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
      <p className="text-sm font-medium text-ink-primary">No job cards match your filters.</p>
      <button
        type="button"
        onClick={() => {
          setActiveView('all');
          setAdvisorFilter('ALL');
          setStatusFilter('ALL');
          setPriorityFilter('ALL');
          setSearch('');
        }}
        className="text-sm text-accent hover:underline focus-visible:outline-none"
      >
        Clear filters
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Tab header: saved views + New JC button ────────────────────────── */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex items-end justify-between mb-0">
          <div
            role="tablist"
            aria-label="Job card saved views"
            className="flex items-center gap-0 border-b border-line flex-1"
          >
            {JC_VIEWS.map((view) => {
            const isActive = view.id === activeView;
            return (
              <button
                key={view.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  'relative px-4 py-2.5 text-[13px] font-medium whitespace-nowrap',
                  'transition-colors focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                  isActive
                    ? 'text-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent after:rounded-t'
                    : 'text-ink-secondary hover:text-ink-primary',
                )}
              >
                {view.label}
              </button>
            );
          })}
          </div>
          <Link
            href="/service/jobcards/new"
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-accent text-white',
              'text-[13px] font-medium hover:bg-accent-hover transition-colors mb-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New Job Card
          </Link>
        </div>
      </div>

      {/* ── Filter row ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-3 shrink-0">
        <div className="rounded-md border border-line bg-bg-surface p-3 flex flex-wrap items-center gap-3">

          {/* Advisor */}
          <select
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            aria-label="Filter by advisor"
            className={cn(
              'h-9 rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
          >
            <option value="ALL">All Advisors</option>
            <option value="staff-r09-001">Priya Sharma</option>
            <option value="staff-r09-002">Rajesh Kumar</option>
            <option value="staff-r09-003">Deepa Nair</option>
          </select>

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
            <option value="RECEIVED">Received</option>
            <option value="DIAGNOSED">Diagnosed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_PARTS">Waiting Parts</option>
            <option value="ADDITIONAL_WORK_APPROVAL">Awaiting Approval</option>
            <option value="QC">QC</option>
            <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
            className={cn(
              'h-9 rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="VIP">VIP</option>
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
              placeholder="Search JC No., VIN, customer…"
              aria-label="Search job cards"
              className={cn(
                'h-9 w-full rounded-md border border-line bg-bg-subtle pl-9 pr-3 text-sm text-ink-primary',
                'placeholder:text-ink-muted',
                'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
              )}
            />
          </div>

          {/* Count */}
          <span className="text-[12px] text-ink-muted whitespace-nowrap">
            {filtered.length} job card{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <DataTable<JobCard>
          columns={columns}
          data={filtered}
          density="compact"
          pageSize={25}
          onRowClick={(jc) => {
            window.location.href = `/service/jobcards/${jc.id}`;
          }}
          emptyState={emptyState}
        />
      </div>
    </div>
  );
}
