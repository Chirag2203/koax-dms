'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useServiceStore } from '@/src/lib/service/service-store';
import { cn } from '@dms/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StateChip } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import type { Appointment } from '@dms/types';
import { AppointmentCheckinDialog } from './action-flows/appointment-checkin-dialog';
import { CancelAppointmentDialog } from './action-flows/cancel-appointment-dialog';

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

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'annual-service': 'Annual Service',
  'mechanical-repair': 'Mechanical Repair',
  'aesthetic-detailing': 'Detailing',
  'pre-purchase-inspection': 'Pre-Purchase PPI',
  'brake-service': 'Brake Service',
  'electrical-diagnostic': 'Electrical Diag.',
  'body-shop': 'Body Shop',
  'accessory-installation': 'Accessories',
  'wheel-alignment': 'Wheel Alignment',
};

const APT_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  SCHEDULED: 'apt-scheduled',
  CONFIRMED: 'apt-confirmed',
  CHECKED_IN: 'apt-checked-in',
  CANCELLED: 'apt-cancelled',
  NO_SHOW: 'apt-no-show',
};

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

// ─── Date range filter helper ─────────────────────────────────────────────────

type DateRangeFilter = 'today' | 'this-week' | 'all';

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isThisWeek(iso: string): boolean {
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

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentsTab() {
  const { toasts, toast, dismiss } = useToast();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [outletFilter, setOutletFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [search, setSearch] = useState('');
  const router = useRouter();

  // Dialogs
  const [checkinTarget, setCheckinTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const appointments = useServiceStore((s) => s.appointments);

  const filtered = useMemo(() => {
    let result = appointments;

    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (outletFilter !== 'ALL') {
      result = result.filter((a) => a.outletId === outletFilter);
    }
    if (dateRange === 'today') {
      result = result.filter((a) => isToday(a.scheduledAt));
    } else if (dateRange === 'this-week') {
      result = result.filter((a) => isThisWeek(a.scheduledAt));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          (a.vin && a.vin.toLowerCase().includes(q)) ||
          a.serviceTypeId.toLowerCase().includes(q) ||
          a.customerId.toLowerCase().includes(q),
      );
    }

    return [...result].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }, [appointments, statusFilter, outletFilter, dateRange, search]);

  const columns = useMemo<ColumnDef<Appointment>[]>(
    () => [
      {
        id: 'scheduledAt',
        header: 'Date & Time',
        accessorFn: (a) => a.scheduledAt,
        cell: ({ getValue }) => (
          <span className="font-mono text-[13px] text-ink-primary tabular-nums whitespace-nowrap">
            {formatDateTime(getValue<string>())}
          </span>
        ),
        size: 180,
      },
      {
        id: 'customer',
        header: 'Customer ID',
        accessorFn: (a) => a.customerId,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-ink-primary">{getValue<string>()}</span>
        ),
        size: 140,
      },
      {
        id: 'vin',
        header: 'VIN',
        accessorFn: (a) => a.vin ?? '',
        cell: ({ getValue }) => {
          const v = getValue<string>();
          return v ? (
            <span className="font-mono text-[12px] text-ink-muted">{maskVin(v)}</span>
          ) : (
            <span className="text-ink-muted">—</span>
          );
        },
        size: 150,
      },
      {
        id: 'serviceType',
        header: 'Service Type',
        accessorFn: (a) => a.serviceTypeId,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-ink-secondary">
            {SERVICE_TYPE_LABELS[getValue<string>()] ?? getValue<string>()}
          </span>
        ),
        size: 160,
      },
      {
        id: 'advisor',
        header: 'Advisor',
        accessorFn: (a) => a.advisorId ?? '',
        cell: ({ getValue }) => {
          const id = getValue<string>();
          return (
            <span className="text-[13px] text-ink-secondary">
              {id ? (ADVISOR_NAMES[id] ?? id) : '—'}
            </span>
          );
        },
        size: 140,
      },
      {
        id: 'outlet',
        header: 'Outlet',
        accessorFn: (a) => a.outletId,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-ink-secondary">
            {OUTLET_NAMES[getValue<string>()] ?? getValue<string>()}
          </span>
        ),
        size: 110,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (a) => a.status,
        cell: ({ row }) => {
          const chipStatus = APT_STATUS_TO_CHIP[row.original.status] ?? 'pending';
          return <StateChip status={chipStatus} />;
        },
        size: 130,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const apt = row.original;
          return (
            <div className="flex items-center gap-2">
              {(apt.status === 'CONFIRMED' || apt.status === 'SCHEDULED') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCheckinTarget(apt); }}
                  className="text-[12px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                >
                  Check-In
                </button>
              )}
              {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCancelTarget(apt.id); }}
                  className="text-[12px] text-state-danger hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          );
        },
        size: 140,
        enableSorting: false,
      },
    ],
    [],
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-2 py-16">
      <p className="text-sm font-medium text-ink-primary">No appointments match your filters.</p>
      <button
        type="button"
        onClick={() => { setStatusFilter('ALL'); setOutletFilter('ALL'); setDateRange('all'); setSearch(''); }}
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
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>

          {/* Outlet */}
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            aria-label="Filter by outlet"
            className={cn(
              'h-9 rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
          >
            <option value="ALL">All Outlets</option>
            <option value="BLR-01">Bangalore</option>
            <option value="MUM-01">Mumbai</option>
            <option value="CHE-01">Chennai</option>
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
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
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
              placeholder="Search VIN, customer, service type…"
              aria-label="Search appointments"
              className={cn(
                'h-9 w-full rounded-md border border-line bg-bg-subtle pl-9 pr-3 text-sm text-ink-primary',
                'placeholder:text-ink-muted',
                'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
              )}
            />
          </div>

          {/* Count */}
          <span className="text-[12px] text-ink-muted whitespace-nowrap">
            {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <DataTable<Appointment>
          columns={columns}
          data={filtered}
          density="compact"
          pageSize={25}
          emptyState={emptyState}
          onRowClick={(apt) => router.push(`/service/appointments/${apt.id}`)}
        />
      </div>

      {/* ── Check-In dialog ──────────────────────────────────────────────── */}
      {checkinTarget && (
        <AppointmentCheckinDialog
          open={!!checkinTarget}
          onClose={() => setCheckinTarget(null)}
          appointment={checkinTarget}
        />
      )}

      {/* ── Cancel dialog ─────────────────────────────────────────────────── */}
      {cancelTarget && (
        <CancelAppointmentDialog
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          appointmentId={cancelTarget}
          onComplete={() => toast('Appointment cancelled.', 'warning')}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
