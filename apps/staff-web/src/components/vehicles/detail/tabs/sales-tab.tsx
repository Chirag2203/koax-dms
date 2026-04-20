'use client';

import type { VehicleMaster } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalesTabProps {
  vehicle: VehicleMaster;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SalesTab({ vehicle: _vehicle }: SalesTabProps) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
      <p className="text-sm text-ink-muted">Sales orders for this vehicle.</p>
      <p className="text-xs text-ink-muted mt-2">
        Full sales order linking available in P3 when sales-store VIN index ships.
      </p>
    </div>
  );
}
