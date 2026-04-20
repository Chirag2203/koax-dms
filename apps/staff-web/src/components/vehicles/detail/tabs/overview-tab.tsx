'use client';

import { useMemo } from 'react';
import { cn } from '@dms/ui';
import { effectiveState } from '@dms/vehicles-core';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import type { VehicleMaster } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OverviewTabProps {
  vehicle: VehicleMaster;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <p className="text-xs text-ink-muted uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-xl font-semibold font-mono text-ink-primary tabular-nums">{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OverviewTab({ vehicle }: OverviewTabProps) {
  const now = useMemo(() => new Date().toISOString(), []);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);

  const ownershipRows = useMemo(() => {
    const ids = ownershipIdByVin[vehicle.vin] ?? [];
    return ids.map((id) => ownerships[id]).filter(Boolean);
  }, [ownerships, ownershipIdByVin, vehicle.vin]);

  const activeRows = useMemo(() => {
    return ownershipRows.filter((r) => {
      if (!r) return false;
      const es = effectiveState(r, now, 0);
      return es === 'ACTIVE' || es === 'ACTIVE_JOINT';
    });
  }, [ownershipRows, now]);

  const transferCount = useMemo(() => {
    return ownershipRows.filter((r) => {
      if (!r) return false;
      return effectiveState(r, now, 0) === 'TRANSFERRED';
    }).length;
  }, [ownershipRows, now]);

  const currentEs = useMemo(() => {
    const active = activeRows[0];
    if (!active) return 'No owner';
    const peerCount = activeRows.length - 1;
    return effectiveState(active, now, peerCount);
  }, [activeRows, now]);

  const age = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear - vehicle.year} years old`;
  }, [vehicle.year]);

  const kmFormatted = vehicle.lastKnownKm.toLocaleString('en-IN') + ' km';
  const firstTouchDate = new Date(vehicle.firstTouchedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Odometer" value={kmFormatted} sub={`Updated ${new Date(vehicle.lastKnownKmAt).toLocaleDateString('en-IN')}`} />
        <StatCard label="Age" value={`${vehicle.year}`} sub={age} />
        <StatCard label="Owners" value={String(ownershipRows.length)} sub={`${transferCount} transfer(s)`} />
        <StatCard label="Ownership Status" value={currentEs} sub={vehicle.firstTouchSource.replace(/_/g, ' ')} />
      </div>

      {/* Vehicle details card */}
      <div className="rounded-md border border-line bg-bg-surface p-6">
        <h3 className="text-sm font-semibold text-ink-primary mb-4">Vehicle Details</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            { label: 'Make', value: vehicle.make },
            { label: 'Model', value: vehicle.model },
            { label: 'Variant', value: vehicle.variant ?? '—' },
            { label: 'Year', value: String(vehicle.year) },
            { label: 'Color', value: vehicle.color },
            { label: 'RC Number', value: vehicle.rcNumber },
            { label: 'First Touch', value: firstTouchDate },
            { label: 'Source', value: vehicle.firstTouchSource.replace(/_/g, ' ') },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="text-sm text-ink-primary font-medium mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Warranty stub */}
      <div className={cn(
        'rounded-md border border-line bg-bg-surface p-6',
        'flex items-center justify-between',
      )}>
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Warranty</h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Warranty tracking will be available in v2 when linked to OEM data.
          </p>
        </div>
        <span className="text-xs text-ink-muted font-mono">—</span>
      </div>
    </div>
  );
}
