'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { effectiveState } from '@dms/vehicles-core';
import type { VehicleRow } from './vehicles-table';
import { VehiclesFilters } from './vehicles-filters';
import type { VehiclesFilter } from './vehicles-filters';
import { VehiclesTable } from './vehicles-table';

// ─── Default filter state ─────────────────────────────────────────────────────

const DEFAULT_FILTERS: VehiclesFilter = {
  city: '',
  state: '',
  source: '',
  cpo: '',
  search: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VehiclesIndexView() {
  const [filters, setFilters] = useState<VehiclesFilter>(DEFAULT_FILTERS);

  const vehicles = useVehiclesStore((s) => s.vehicles);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);
  const customers = useCustomersStore((s) => s.customers);

  const now = useMemo(() => new Date().toISOString(), []);

  const nameFor = (customerId: string | undefined): string | null => {
    if (!customerId) return null;
    if (customerId.startsWith('anon-')) {
      const n = customerId.slice(5);
      return `Owner #${n}`;
    }
    return customers[customerId]?.name ?? null;
  };

  // Use effectiveState to find active rows — no raw state comparison in UI
  const rows = useMemo<VehicleRow[]>(() => {
    return Object.values(vehicles).map((vehicle) => {
      const ids = ownershipIdByVin[vehicle.vin] ?? [];
      const allRows = ids.map((id) => ownerships[id]).filter(Boolean);

      // First pass: count rows whose raw ACTIVE state can be confirmed via effectiveState
      // We use peerCount=0 initially to identify candidates, then re-derive with correct peer
      const candidateActives = allRows.filter((r) => {
        if (!r) return false;
        // effectiveState with peerCount=0 gives ACTIVE (not joint)
        // effectiveState with peerCount=1 gives ACTIVE_JOINT
        // We just need to know if the raw state is ACTIVE — we check by calling
        // effectiveState with both 0 and 1 peer counts
        const es0 = effectiveState(r, now, 0);
        const es1 = effectiveState(r, now, 1);
        return es0 === 'ACTIVE' || es1 === 'ACTIVE_JOINT';
      });

      const peerCount = candidateActives.length > 1 ? candidateActives.length - 1 : 0;
      const currentOwnership = candidateActives[0] ?? null;

      const es = currentOwnership
        ? effectiveState(currentOwnership, now, peerCount)
        : null;

      return {
        vehicle,
        currentOwnership,
        currentOwnerName: nameFor(currentOwnership?.customerId),
        effectiveState: es,
        peerCount,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, ownerships, ownershipIdByVin, now, customers]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const { search, city, source } = filters;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          r.vehicle.vin.toLowerCase().includes(q) ||
          r.vehicle.make.toLowerCase().includes(q) ||
          r.vehicle.model.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (city && r.vehicle.firstTouchOutletId !== city) return false;
      if (source && r.vehicle.firstTouchSource !== source) return false;
      return true;
    });
  }, [rows, filters]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            Vehicles
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted leading-[1.5]">
            Lifetime records, ownership, and service history
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/vehicles/ownership-queue"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line',
              'bg-bg-surface text-sm font-medium text-ink-primary',
              'hover:bg-bg-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            Ownership Queue
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-line shrink-0">
        <VehiclesFilters
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <VehiclesTable rows={filteredRows} />
      </div>
    </div>
  );
}
