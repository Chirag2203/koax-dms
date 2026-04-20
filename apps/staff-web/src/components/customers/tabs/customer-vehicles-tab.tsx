'use client';

import { useState, useMemo } from 'react';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { effectiveState } from '@dms/vehicles-core';
import type { Customer, VehicleOwnership } from '@dms/types';
import { CustomerVehicleCard } from '../vehicles-tab/customer-vehicle-card';
import { CustomerVehicleHistoryDrawer } from '../vehicles-tab/customer-vehicle-history-drawer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerVehiclesTabProps {
  customer: Customer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerVehiclesTab({ customer }: CustomerVehiclesTabProps) {
  const [drawerVin, setDrawerVin] = useState<string | null>(null);
  const now = useMemo(() => new Date().toISOString(), []);

  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);
  const vehicles = useVehiclesStore((s) => s.vehicles);

  const customerOwnerships = useMemo(() => {
    const ids = ownershipIdByCustomer[customer.id] ?? [];
    return ids
      .map((id) => ownerships[id])
      .filter((r): r is VehicleOwnership => r !== undefined)
      .sort((a, b) => {
        // Active rows first
        const aEs = effectiveState(a, now, 0);
        const bEs = effectiveState(b, now, 0);
        const aActive = aEs === 'ACTIVE' || aEs === 'ACTIVE_JOINT';
        const bActive = bEs === 'ACTIVE' || bEs === 'ACTIVE_JOINT';
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return new Date(b.fromAt).getTime() - new Date(a.fromAt).getTime();
      });
  }, [ownerships, ownershipIdByCustomer, customer.id, now]);

  const peerCountFor = (ownership: VehicleOwnership) => {
    const ids = ownershipIdByVin[ownership.vin] ?? [];
    return ids.filter((id) => {
      if (id === ownership.id) return false;
      const peer = ownerships[id];
      if (!peer) return false;
      const es = effectiveState(peer, now, 0);
      return es === 'ACTIVE' || es === 'ACTIVE_JOINT';
    }).length;
  };

  if (customerOwnerships.length === 0) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
        <p className="text-sm text-ink-muted">No vehicles associated with this customer.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {customerOwnerships.map((ownership) => (
          <CustomerVehicleCard
            key={ownership.id}
            ownership={ownership}
            vehicle={vehicles[ownership.vin]}
            peerCount={peerCountFor(ownership)}
            now={now}
            onClick={() => setDrawerVin(ownership.vin)}
          />
        ))}
      </div>

      <CustomerVehicleHistoryDrawer
        open={drawerVin !== null}
        vin={drawerVin}
        onClose={() => setDrawerVin(null)}
      />
    </>
  );
}
