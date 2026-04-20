'use client';

import * as React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { normalizeVin, effectiveState } from '@dms/vehicles-core';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import {
  buildOwnedVehicleView,
  buildServiceRecordViews,
} from '@/src/lib/portal/portal-vehicle-adapter';
import { LifetimeHeader } from '@/src/components/portal/vehicles/lifetime-header';
import { LifetimeVehicleView } from '@/src/components/portal/vehicles/lifetime-vehicle-view';
import {
  jobCards,
  warrantyClaims,
  ownershipRows,
  documents,
  ownershipEvents,
  vehicleModuleCustomers,
} from '@dms/mocks/fixtures';

// ─── Staff directory ─────────────────────────────────────────────────────────

const STAFF_DIRECTORY = {
  'staff-r09-001': { status: 'active' as const, displayName: 'Priya Sharma' },
  'staff-r09-002': { status: 'active' as const, displayName: 'Rajesh Kumar' },
  'staff-r09-003': { status: 'active' as const, displayName: 'Deepa Nair' },
};

const CUSTOMER_NAME_MAP: Record<string, string> = Object.fromEntries(
  vehicleModuleCustomers.map((c) => [c.id, c.name]),
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehicleDetailPage() {
  const params = useParams<{ vin: string }>();
  const router = useRouter();
  const { customerId } = usePortalAuth();
  const store = usePortalVehiclesStore();

  // Normalize VIN — redirect if lowercase/invalid
  const rawVin = params.vin ?? '';
  const normalizedVin = React.useMemo(() => {
    try {
      return normalizeVin(rawVin);
    } catch {
      return null;
    }
  }, [rawVin]);

  React.useEffect(() => {
    if (normalizedVin === null) return;
    // Redirect if case differs (e.g. lowercase in URL)
    if (rawVin !== normalizedVin) {
      router.replace(`/vehicles/${normalizedVin}`);
    }
  }, [rawVin, normalizedVin, router]);

  React.useEffect(() => {
    store.hydrate();
  }, [store]);

  const now = new Date().toISOString();

  // Resolve ownership row for this VIN + customer
  const { ownershipRow, vehicle } = React.useMemo(() => {
    if (!store.hydrated || !normalizedVin) return { ownershipRow: null, vehicle: null };

    const veh = store.vehicles[normalizedVin];
    if (!veh) return { ownershipRow: null, vehicle: null };

    const vinOwnerships = store.selectOwnershipsByVin(normalizedVin);
    const customerRow = vinOwnerships.find((r) => r.customerId === customerId);
    if (!customerRow) return { ownershipRow: null, vehicle: null };

    // Check it's accessible (ACTIVE, ACTIVE_JOINT, or GRACE)
    const peers = vinOwnerships.filter(
      (r) => r.id !== customerRow.id && r.state === 'ACTIVE',
    ).length;
    const es = effectiveState(customerRow, now, peers);
    if (es !== 'ACTIVE' && es !== 'ACTIVE_JOINT' && es !== 'GRACE') {
      return { ownershipRow: null, vehicle: null };
    }

    return { ownershipRow: customerRow, vehicle: veh };
  }, [store, store.hydrated, normalizedVin, customerId, now]);

  const vehicleView = React.useMemo(() => {
    if (!ownershipRow || !vehicle || !normalizedVin) return null;
    const allOwnerships = store.selectOwnershipsByVin(normalizedVin);
    return buildOwnedVehicleView(
      normalizedVin,
      ownershipRow,
      vehicle,
      jobCards,
      warrantyClaims,
      allOwnerships,
      now,
      customerId,
      CUSTOMER_NAME_MAP,
    );
  }, [ownershipRow, vehicle, normalizedVin, now, customerId, store]);

  const { serviceRecords, earlierCount } = React.useMemo(() => {
    if (!ownershipRow || !normalizedVin) return { serviceRecords: [], earlierCount: 0 };
    const result = buildServiceRecordViews(
      normalizedVin,
      { fromAt: ownershipRow.fromAt, toAt: ownershipRow.toAt },
      jobCards,
      STAFF_DIRECTORY,
    );
    return { serviceRecords: result.owned, earlierCount: result.earlierCount };
  }, [ownershipRow, normalizedVin]);

  const vinEvents = React.useMemo(() => {
    if (!normalizedVin) return [];
    return ownershipEvents.filter((e) => e.vin === normalizedVin);
  }, [normalizedVin]);

  const vinDocuments = React.useMemo(() => {
    if (!normalizedVin) return [];
    return documents.filter((d) => d.vehicleVin === normalizedVin);
  }, [normalizedVin]);

  // Not yet hydrated — show loading
  if (!store.hydrated) {
    return (
      <div className="max-w-5xl px-6 md:px-12 lg:px-16 py-16 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Loading…</p>
      </div>
    );
  }

  // Invalid VIN or no access
  if (!vehicleView) {
    // Use notFound() for 404 experience
    notFound();
  }

  return (
    <div>
      <LifetimeHeader vehicle={vehicleView} />
      <LifetimeVehicleView
        vehicle={vehicleView}
        serviceRecords={serviceRecords}
        earlierServiceCount={earlierCount}
        documents={vinDocuments}
        events={vinEvents}
      />
    </div>
  );
}
