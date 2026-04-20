'use client';

import { SlideInPanel } from '@/src/components/primitives';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { VehicleDetailBody } from '@/src/components/vehicles/detail/vehicle-detail-body';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerVehicleHistoryDrawerProps {
  open: boolean;
  vin: string | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerVehicleHistoryDrawer({
  open,
  vin,
  onClose,
}: CustomerVehicleHistoryDrawerProps) {
  const vehicle = useVehiclesStore((s) => (vin ? s.vehicles[vin] : undefined));

  return (
    <SlideInPanel
      open={open}
      onClose={onClose}
      width="60%"
      title={vin ? `Vehicle History — ${vin}` : 'Vehicle History'}
    >
      <div className="p-6">
        {vehicle ? (
          <VehicleDetailBody vehicle={vehicle} defaultTab="overview" />
        ) : (
          <p className="text-sm text-ink-muted">Vehicle not found.</p>
        )}
      </div>
    </SlideInPanel>
  );
}
