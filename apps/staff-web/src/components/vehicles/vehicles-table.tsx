'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@dms/ui';
import { DataTable, VinBadge, StateChip } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { effectiveState } from '@dms/vehicles-core';
import type { EffectiveState } from '@dms/vehicles-core';
import type { VehicleMaster, VehicleOwnership } from '@dms/types';
import { VehicleRowActions } from './vehicle-row-actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleRow {
  vehicle: VehicleMaster;
  currentOwnership: VehicleOwnership | null;
  currentOwnerName: string | null;
  effectiveState: EffectiveState | null;
  peerCount: number;
}

export interface VehiclesTableProps {
  rows: VehicleRow[];
  onAssignOwner?: (vin: string) => void;
  onRevoke?: (vin: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EFFECTIVE_TO_CHIP: Record<EffectiveState, StateChipStatus> = {
  PENDING_CLAIM: 'own-pending-claim',
  ACTIVE: 'own-active',
  ACTIVE_JOINT: 'own-active-joint',
  GRACE: 'own-grace',
  REVOKED: 'own-revoked',
  TRANSFERRED: 'own-transferred',
  REJECTED: 'own-rejected',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VehiclesTable({
  rows,
  onAssignOwner,
  onRevoke,
}: VehiclesTableProps) {
  const router = useRouter();
  const now = useMemo(() => new Date().toISOString(), []);

  const columns = useMemo<ColumnDef<VehicleRow>[]>(() => [
    {
      id: 'vin',
      header: 'VIN',
      accessorFn: (r) => r.vehicle.vin,
      cell: ({ row }) => (
        <VinBadge vin={row.original.vehicle.vin} size="sm" />
      ),
      size: 200,
    },
    {
      id: 'makeModel',
      header: 'Make / Model',
      accessorFn: (r) => `${r.vehicle.make} ${r.vehicle.model}`,
      cell: ({ row }) => {
        const v = row.original.vehicle;
        return (
          <div>
            <div className="text-sm font-medium text-ink-primary">
              {v.make} {v.model}
            </div>
            {v.variant && (
              <div className="text-xs text-ink-muted">{v.variant} · {v.year}</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'owner',
      header: 'Current Owner',
      accessorFn: (r) => r.currentOwnerName ?? '—',
      cell: ({ row }) => {
        const name = row.original.currentOwnerName;
        const own = row.original.currentOwnership;
        if (!name || !own) return <span className="text-ink-muted text-sm">—</span>;
        const isAnon = own.customerId.startsWith('anon-');
        return (
          <span className={cn('text-sm', isAnon && 'text-ink-muted italic')}>
            {isAnon ? 'Owner #1' : name}
          </span>
        );
      },
    },
    {
      id: 'state',
      header: 'State',
      accessorFn: (r) => r.effectiveState ?? '',
      cell: ({ row }) => {
        const own = row.original.currentOwnership;
        if (!own) return <span className="text-ink-muted text-sm">—</span>;
        const es = effectiveState(own, now, row.original.peerCount);
        return <StateChip status={EFFECTIVE_TO_CHIP[es]} />;
      },
    },
    {
      id: 'firstTouch',
      header: 'First Touch',
      accessorFn: (r) => r.vehicle.firstTouchedAt,
      cell: ({ row }) => {
        const d = new Date(row.original.vehicle.firstTouchedAt);
        return (
          <span className="text-sm text-ink-secondary font-mono tabular-nums">
            {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      id: 'km',
      header: 'km',
      accessorFn: (r) => r.vehicle.lastKnownKm,
      cell: ({ row }) => (
        <span className="text-sm font-mono tabular-nums text-ink-secondary">
          {row.original.vehicle.lastKnownKm.toLocaleString('en-IN')}
        </span>
      ),
      size: 100,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <VehicleRowActions
          vin={row.original.vehicle.vin}
          onView={() => router.push(`/vehicles/${row.original.vehicle.vin}`)}
          onAssignOwner={() => onAssignOwner?.(row.original.vehicle.vin)}
          onRevoke={() => onRevoke?.(row.original.vehicle.vin)}
        />
      ),
      size: 60,
    },
  ], [router, now, onAssignOwner, onRevoke]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      density="default"
      onRowClick={(row) => router.push(`/vehicles/${row.vehicle.vin}`)}
      emptyState={
        <span className="text-sm text-ink-muted">No vehicles match your filters.</span>
      }
    />
  );
}
