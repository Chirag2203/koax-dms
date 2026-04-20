'use client';

import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { VehicleDetailHeader } from './vehicle-detail-header';
import { VehicleDetailBody } from './vehicle-detail-body';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleDetailViewProps {
  vin: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleDetailView({ vin }: VehicleDetailViewProps) {
  const vehicle = useVehiclesStore((s) => s.vehicles[vin]);

  if (!vehicle) return null;

  return (
    <div className="w-full px-6 pb-12 pt-6">
      <VehicleDetailHeader vehicle={vehicle} />
      <VehicleDetailBody vehicle={vehicle} />
    </div>
  );
}
