'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { tryNormalizeVin } from '@dms/vehicles-core';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';
import { VehicleDetailView } from '@/src/components/vehicles/detail/vehicle-detail-view';

/**
 * /vehicles/[vin] — Vehicle lifetime detail page.
 *
 * S-V-10: Normalize VIN on mount; router.replace if case mismatch.
 * Calls notFound() if VIN not in store.
 *
 * Spec reference: SPEC-VEHICLES-001 §6, S-V-10
 */

interface PageProps {
  params: { vin: string };
}

export default function VehicleDetailPage({ params }: PageProps) {
  const router = useRouter();
  const rawVin = params.vin.toUpperCase();

  // Attempt normalization — tryNormalizeVin returns null on invalid VIN
  const normalizedVin = tryNormalizeVin(rawVin) ?? rawVin;

  const vehicle = useVehiclesStore((s) => s.vehicles[normalizedVin]);
  const hydrated = useVehiclesStore((s) => s.hydrated);

  // S-V-10: redirect if URL VIN does not match normalized form
  useEffect(() => {
    if (rawVin !== normalizedVin) {
      router.replace(`/vehicles/${normalizedVin}`);
    }
  }, [rawVin, normalizedVin, router]);

  // Lazy reservation expiry — runs once on mount per VIN (PLAN-VEHICLES-003 L37)
  useEffect(() => {
    const deals = useSalesDealsStore.getState().deals;
    const nowIso = new Date().toISOString();
    for (const deal of Object.values(deals)) {
      if (
        deal.vehicleVin === normalizedVin &&
        deal.stage === 'reserved' &&
        deal.reservationExpiresAt &&
        deal.reservationExpiresAt < nowIso
      ) {
        useSalesDealsStore.getState().markReservationExpired(deal.id);
        useVehiclesStore.getState().emitSalesEvent(
          normalizedVin,
          'RESERVATION_LOST',
          { dealId: deal.id, reason: 'EXPIRED' },
          { id: 'system', name: 'System', role: 'R24' },
        );
      }
    }
  }, [normalizedVin]); // runs once on mount per VIN

  // Wait for store to hydrate before calling notFound
  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    );
  }

  if (!vehicle) {
    notFound();
  }

  return <VehicleDetailView vin={normalizedVin} />;
}
