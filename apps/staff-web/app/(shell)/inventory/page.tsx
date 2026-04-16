'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Plus,
  Upload,
  Filter,
  SlidersHorizontal,
  Search,
  Car,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@dms/ui';
import { vehicles } from '@dms/mocks/fixtures';
import type { Vehicle } from '@dms/types';
import {
  DataTable,
  StateChip,
  OutletPill,
  AmountCell,
  Gate,
} from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import type { OutletCode } from '@/src/components/primitives';
import { SavedViewTabs } from '@/src/components/inventory/saved-view-tabs';
import type { SavedView } from '@/src/components/inventory/saved-view-tabs';
import { InventoryFilters } from '@/src/components/inventory/inventory-filters';
import type { InventoryFilterValues } from '@/src/components/inventory/inventory-filters';
import { EMPTY_FILTERS } from '@/src/components/inventory/inventory-filters';
import { InventoryBulkActions } from '@/src/components/inventory/inventory-bulk-actions';
import { InventoryRowActions } from '@/src/components/inventory/inventory-row-actions';

// ─── Extended status for staff surface (spec §3) ──────────────────────────────

type StaffVehicleStatus =
  | 'published'
  | 'reserved'
  | 'sold'
  | 'draft'
  | 'in-refurb'
  | 'stale'
  | 'archived'
  | 'unpublished'
  | 'in-review';

// Extend Vehicle with staff-surface status + extra fields
interface StaffVehicle extends Omit<Vehicle, 'status'> {
  status: StaffVehicleStatus;
  landedCost?: number;
  assignedTo?: string;
}

// ─── Derived data helpers ─────────────────────────────────────────────────────

function daysOnLot(listedAt: string): number {
  const listed = new Date(listedAt).getTime();
  const now = Date.now();
  return Math.floor((now - listed) / (1000 * 60 * 60 * 24));
}

function marginPercent(askPrice: number, landedCost: number): number {
  if (landedCost <= 0) return 0;
  return ((askPrice - landedCost) / landedCost) * 100;
}

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

// Map Vehicle.status to StaffVehicleStatus (enrich with stale logic)
function toStaffStatus(v: Vehicle): StaffVehicleStatus {
  if (v.status === 'published') {
    const days = daysOnLot(v.listedAt);
    if (days > 60) return 'stale';
    return 'published';
  }
  return v.status as StaffVehicleStatus;
}

// Map StaffVehicleStatus to StateChip status
const STATUS_TO_CHIP: Record<StaffVehicleStatus, StateChipStatus> = {
  published: 'listed',
  reserved: 'reserved',
  sold: 'sold',
  draft: 'draft',
  'in-refurb': 'in-refurb',
  stale: 'stale',
  archived: 'pending',
  unpublished: 'pending',
  'in-review': 'pending',
};

// Map city to OutletCode
const CITY_TO_OUTLET: Record<string, OutletCode> = {
  bangalore: 'bangalore',
  mumbai: 'mumbai',
  chennai: 'chennai',
};

// ─── Enrich fixtures with staff data ─────────────────────────────────────────

const STAFF_VEHICLES: StaffVehicle[] = vehicles.map((v, i) => {
  // Derive a plausible landed cost (~75-85% of ask price)
  const ratio = 0.75 + (i % 5) * 0.025;
  const landedCost = Math.round(v.price * ratio);
  return {
    ...v,
    status: toStaffStatus(v),
    landedCost,
    // Spread statuses across the full set for demo variety
    ...(i % 7 === 0 ? { status: 'draft' as StaffVehicleStatus } : {}),
    ...(i % 7 === 1 ? { status: 'in-refurb' as StaffVehicleStatus } : {}),
    ...(i % 7 === 6 ? { status: 'sold' as StaffVehicleStatus } : {}),
  };
});

// ─── Density toggle ───────────────────────────────────────────────────────────

type Density = 'compact' | 'default' | 'relaxed';

// ─── Days colour helper ───────────────────────────────────────────────────────

function DaysCell({ days }: { days: number }) {
  const colour =
    days < 30 ? 'text-state-success' : days <= 60 ? 'text-state-warning' : 'text-state-danger';
  return (
    <span className={cn('font-mono tabular-nums text-sm font-medium', colour)}>
      {days}d
    </span>
  );
}

// ─── CPO badge ────────────────────────────────────────────────────────────────

function CpoBadge() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest bg-accent/10 text-accent">
      CPO
    </span>
  );
}

// ─── Photo cell ───────────────────────────────────────────────────────────────

function PhotoCell({ vehicle }: { vehicle: StaffVehicle }) {
  const firstImage = vehicle.images[0];
  if (firstImage) {
    return (
      <div className="shrink-0 overflow-hidden rounded" style={{ width: 48, height: 36 }}>
        <Image
          src={firstImage.url}
          alt={firstImage.alt}
          width={48}
          height={36}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded bg-bg-subtle flex items-center justify-center text-[10px] font-mono text-ink-muted"
      style={{ width: 48, height: 36 }}
    >
      {vehicle.make.slice(0, 3).toUpperCase()}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();

  // ── View + filter state ──────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<SavedView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<InventoryFilterValues>(EMPTY_FILTERS);
  const [density, setDensity] = useState<Density>('default');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  // ── Filtered data ────────────────────────────────────────────────────────────

  const filteredVehicles = useMemo<StaffVehicle[]>(() => {
    let result = STAFF_VEHICLES;

    // Saved view preset filters
    if (activeView === 'listed') {
      result = result.filter((v) => v.status === 'published');
    } else if (activeView === 'in-refurb') {
      result = result.filter((v) => v.status === 'in-refurb');
    } else if (activeView === 'stale') {
      result = result.filter((v) => daysOnLot(v.listedAt) > 60);
    }
    // 'my-listings' → show all in v1 (no assignedTo filter)

    // Search (VIN, make+model, plate proxy via VIN)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.vin.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.variant.toLowerCase().includes(q),
      );
    }

    // Advanced filter — makes
    if (appliedFilters.makes.length > 0) {
      result = result.filter((v) =>
        appliedFilters.makes.some((m) => v.make.toLowerCase() === m.toLowerCase()),
      );
    }

    // Advanced filter — body types
    if (appliedFilters.bodyTypes.length > 0) {
      result = result.filter((v) =>
        appliedFilters.bodyTypes.some((b) => v.bodyType.toLowerCase() === b.toLowerCase()),
      );
    }

    // Advanced filter — outlets
    if (appliedFilters.outlets.length > 0) {
      result = result.filter((v) => appliedFilters.outlets.includes(v.city));
    }

    // Advanced filter — statuses
    if (appliedFilters.statuses.length > 0) {
      result = result.filter((v) => appliedFilters.statuses.includes(v.status));
    }

    // Advanced filter — price range
    if (appliedFilters.priceMin !== '') {
      result = result.filter((v) => v.price >= Number(appliedFilters.priceMin));
    }
    if (appliedFilters.priceMax !== '') {
      result = result.filter((v) => v.price <= Number(appliedFilters.priceMax));
    }

    // Advanced filter — km range
    if (appliedFilters.kmMin !== '') {
      result = result.filter((v) => v.km >= Number(appliedFilters.kmMin));
    }
    if (appliedFilters.kmMax !== '') {
      result = result.filter((v) => v.km <= Number(appliedFilters.kmMax));
    }

    // Advanced filter — age range
    if (appliedFilters.ageMin !== '') {
      result = result.filter((v) => daysOnLot(v.listedAt) >= Number(appliedFilters.ageMin));
    }
    if (appliedFilters.ageMax !== '') {
      result = result.filter((v) => daysOnLot(v.listedAt) <= Number(appliedFilters.ageMax));
    }

    // Advanced filter — certified only
    if (appliedFilters.certifiedOnly) {
      result = result.filter((v) => v.isCertified);
    }

    // Advanced filter — fuel types
    if (appliedFilters.fuelTypes.length > 0) {
      result = result.filter((v) =>
        appliedFilters.fuelTypes.some((f) => v.fuel.toLowerCase() === f.toLowerCase()),
      );
    }

    // Advanced filter — transmissions
    if (appliedFilters.transmissions.length > 0) {
      result = result.filter((v) =>
        appliedFilters.transmissions.some((t) => v.transmission.toLowerCase() === t.toLowerCase()),
      );
    }

    return result;
  }, [activeView, searchQuery, appliedFilters]);

  // ── Bulk action helpers ──────────────────────────────────────────────────────

  const selectedCount = Object.values(selectedRows).filter(Boolean).length;

  const handleClearSelection = useCallback(() => {
    setSelectedRows({});
  }, []);

  // ── Nav helpers ──────────────────────────────────────────────────────────────

  const handleView = useCallback(
    (vin: string) => router.push(`/inventory/${vin}`),
    [router],
  );

  const handleEdit = useCallback(
    (vin: string) => router.push(`/inventory/${vin}/edit`),
    [router],
  );

  // ── Clear all filters ────────────────────────────────────────────────────────

  function clearAllFilters() {
    setSearchQuery('');
    setAppliedFilters(EMPTY_FILTERS);
    setActiveView('all');
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    activeView !== 'all' ||
    appliedFilters.makes.length > 0 ||
    appliedFilters.statuses.length > 0 ||
    appliedFilters.outlets.length > 0 ||
    appliedFilters.certifiedOnly;

  // ── Active filter count badge ────────────────────────────────────────────────
  const activeFilterCount = [
    appliedFilters.makes.length > 0,
    appliedFilters.bodyTypes.length > 0,
    appliedFilters.outlets.length > 0,
    appliedFilters.statuses.length > 0,
    appliedFilters.priceMin !== '' || appliedFilters.priceMax !== '',
    appliedFilters.kmMin !== '' || appliedFilters.kmMax !== '',
    appliedFilters.ageMin !== '' || appliedFilters.ageMax !== '',
    appliedFilters.certifiedOnly,
    appliedFilters.fuelTypes.length > 0,
    appliedFilters.transmissions.length > 0,
  ].filter(Boolean).length;

  // ── Column definitions ───────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<StaffVehicle>[]>(
    () => [
      {
        id: 'photo',
        header: 'Photo',
        cell: ({ row }) => <PhotoCell vehicle={row.original} />,
        size: 72,
        enableSorting: false,
      },
      {
        id: 'vin',
        header: 'VIN',
        accessorFn: (v) => v.vin,
        cell: ({ getValue }) => {
          const vin = getValue<string>();
          return (
            <span className="font-mono text-[13px] text-ink-primary tabular-nums">
              {maskVin(vin)}
            </span>
          );
        },
        size: 160,
      },
      {
        id: 'year',
        header: 'Year',
        accessorFn: (v) => v.year,
        cell: ({ getValue }) => (
          <span className="text-sm text-ink-secondary tabular-nums">{getValue<number>()}</span>
        ),
        size: 64,
      },
      {
        id: 'details',
        header: 'Vehicle Details',
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink-primary truncate leading-tight">
                {v.make} {v.model}
              </p>
              <p className="text-[12px] text-ink-muted truncate leading-tight mt-0.5">
                {v.variant}
              </p>
            </div>
          );
        },
        size: 200,
        enableSorting: false,
      },
      {
        id: 'outlet',
        header: 'Outlet',
        cell: ({ row }) => (
          <OutletPill outlet={CITY_TO_OUTLET[row.original.city] ?? 'bangalore'} />
        ),
        size: 80,
        enableSorting: false,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (v) => v.status,
        cell: ({ row }) => {
          const s = row.original.status;
          const chipStatus = STATUS_TO_CHIP[s] ?? 'pending';
          return <StateChip status={chipStatus} />;
        },
        size: 120,
      },
      {
        id: 'days',
        header: 'Days',
        accessorFn: (v) => daysOnLot(v.listedAt),
        cell: ({ getValue }) => <DaysCell days={getValue<number>()} />,
        size: 72,
      },
      {
        id: 'askPrice',
        header: 'Ask Price',
        accessorFn: (v) => v.price,
        cell: ({ getValue }) => <AmountCell amount={getValue<number>()} align="right" />,
        size: 140,
        meta: { align: 'right' },
      },
      {
        id: 'landedCost',
        header: 'Landed Cost',
        accessorFn: (v) => v.landedCost ?? 0,
        cell: ({ getValue, row }) => {
          const cost = row.original.landedCost ?? 0;
          return (
            <Gate role={['R10', 'R16', 'R19', 'R22', 'R24']} fallback="hide">
              <AmountCell amount={cost} align="right" className="text-ink-muted" />
            </Gate>
          );
        },
        size: 140,
        meta: { align: 'right' },
      },
      {
        id: 'margin',
        header: 'Margin',
        accessorFn: (v) => {
          const lc = v.landedCost ?? 0;
          return lc > 0 ? marginPercent(v.price, lc) : 0;
        },
        cell: ({ row }) => {
          const v = row.original;
          const lc = v.landedCost ?? 0;
          if (lc <= 0) return <span className="text-ink-muted text-sm">—</span>;
          const pct = marginPercent(v.price, lc);
          const colour =
            pct >= 15
              ? 'text-state-success'
              : pct >= 5
                ? 'text-state-warning'
                : 'text-state-danger';
          return (
            <Gate role={['R10', 'R16', 'R19', 'R22', 'R24']} fallback="hide">
              <span className={cn('font-mono tabular-nums text-sm font-medium', colour)}>
                {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
              </span>
            </Gate>
          );
        },
        size: 80,
        meta: { align: 'right' },
      },
      {
        id: 'cpo',
        header: 'CPO',
        cell: ({ row }) =>
          row.original.isCertified ? <CpoBadge /> : null,
        size: 60,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <InventoryRowActions
            vin={row.original.vin}
            onView={handleView}
            onEdit={handleEdit}
          />
        ),
        size: 100,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [handleView, handleEdit],
  );

  // ── Bulk actions node (passed to DataTable) ─────────────────────────────────

  const bulkActionsNode =
    selectedCount > 0 ? (
      <InventoryBulkActions
        selectedCount={selectedCount}
        onClear={handleClearSelection}
        onExport={() => console.log('export')}
        onUpdateStatus={() => console.log('updateStatus')}
        onAssignOutlet={() => console.log('assignOutlet')}
        onArchive={() => console.log('archive')}
      />
    ) : null;

  // ── Empty state ──────────────────────────────────────────────────────────────

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-16">
      <Car className="h-12 w-12 text-ink-muted/40" aria-hidden="true" />
      <p className="text-sm font-medium text-ink-primary">No vehicles match your filters.</p>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-sm text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-[28px] font-semibold leading-tight text-ink-primary">
          Vehicles
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-2',
              'text-sm font-medium text-ink-secondary border border-line bg-bg-canvas',
              'hover:text-ink-primary hover:border-ink-secondary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
            aria-label="Import vehicles"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import
          </button>
          <Gate role={['R05', 'R10', 'R19', 'R22', 'R24']} fallback="disable">
            <button
              type="button"
              onClick={() => router.push('/inventory/new')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-2',
                'text-sm font-semibold text-white bg-accent',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              )}
              aria-label="Add new vehicle"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Vehicle
            </button>
          </Gate>
        </div>
      </div>

      {/* ── Saved view tabs ───────────────────────────────────────────────── */}
      <div className="px-6 shrink-0">
        <SavedViewTabs activeView={activeView} onChange={setActiveView} />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 shrink-0">
        {/* Search */}
        <div className="relative w-[240px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search VIN, Model, or Plate..."
            aria-label="Search inventory"
            className={cn(
              'w-full rounded-md border border-line bg-bg-subtle pl-9 pr-3 py-1.5',
              'text-sm text-ink-primary placeholder:text-ink-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
            )}
          />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Filter button */}
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Open filters'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5',
              'text-sm font-medium border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              activeFilterCount > 0
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
            )}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-accent text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Column config — delegated to DataTable internally; this triggers it */}
          <button
            type="button"
            aria-label="Configure columns"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5',
              'text-sm font-medium border border-line bg-bg-canvas text-ink-secondary',
              'hover:text-ink-primary hover:border-ink-secondary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Density toggle */}
          <div
            role="group"
            aria-label="Table density"
            className="inline-flex rounded-md border border-line overflow-hidden"
          >
            {(['compact', 'default', 'relaxed'] as Density[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                aria-pressed={density === d}
                aria-label={`${d} density`}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium capitalize transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                  density === d
                    ? 'bg-accent text-white'
                    : 'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
                )}
              >
                {d === 'compact' ? 'S' : d === 'default' ? 'M' : 'L'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bulk action strip (when rows selected) ───────────────────────── */}
      {selectedCount > 0 && bulkActionsNode && (
        <div className="px-6 shrink-0">{bulkActionsNode}</div>
      )}

      {/* ── Data table ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <DataTable<StaffVehicle>
          columns={columns}
          data={filteredVehicles}
          density={density}
          onRowClick={(v) => handleView(v.vin)}
          enableSelection
          enableColumnConfig
          pageSize={25}
          emptyState={emptyState}
        />
      </div>

      {/* ── Advanced filters panel ────────────────────────────────────────── */}
      <InventoryFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        values={appliedFilters}
        onApply={setAppliedFilters}
        onClear={() => setAppliedFilters(EMPTY_FILTERS)}
      />
    </div>
  );
}
