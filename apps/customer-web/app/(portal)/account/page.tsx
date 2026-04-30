'use client';

import * as React from 'react';
import {
  mockCustomer,
  ownedVehicles,
  savedVehicles,
  reservations,
  bookings,
  serviceRecords,
  documents,
  vehicles,
} from '@dms/mocks/fixtures';
import {
  PortalGreeting,
  SavedCarsShelf,
  ReservationsPanel,
  UpcomingVisitsPanel,
  ServiceHistoryPreview,
  OwnedVehiclesStrip,
  DocumentsPreview,
} from '@/src/components/portal/account';
import type { SavedVehicleDisplay } from '@/src/components/portal/account';
import { SavedSearchList } from '@/src/components/portal/account/saved-search-list';

// ─── Data join ────────────────────────────────────────────────────────────────

/**
 * Join the SavedVehicle records (VIN + savedAt) with full Vehicle data
 * to produce the display shape needed by SavedCarsShelf.
 */
function buildSavedVehicleDisplays(): SavedVehicleDisplay[] {
  const result: SavedVehicleDisplay[] = [];
  for (const saved of savedVehicles) {
    const vehicle = vehicles.find((v) => v.vin === saved.vehicleVin);
    if (!vehicle) continue;
    const primaryImage = vehicle.images[0];
    result.push({
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      km: vehicle.km,
      city: vehicle.city,
      price: saved.savedAtPrice,
      imageUrl: primaryImage?.url ?? '',
      imageAlt: primaryImage?.alt,
      savedAt: saved.savedAt,
    });
  }
  return result;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const savedVehicleDisplays = buildSavedVehicleDisplays();

  return (
    <div className="max-w-5xl">
      {/* ── 1. Greeting ──────────────────────────────────────────────────────── */}
      <PortalGreeting customer={mockCustomer} />

      {/* ── 2. Saved Acquisitions shelf ──────────────────────────────────────── */}
      <SavedCarsShelf vehicles={savedVehicleDisplays} />

      {/* ── 3. Two-column: Current Holds + Upcoming Visits ───────────────────── */}
      <section className="px-6 md:px-12 lg:px-16 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <ReservationsPanel reservations={reservations} />
          <UpcomingVisitsPanel bookings={bookings} />
        </div>
      </section>

      {/* ── 4. Service & Restoration History ledger ──────────────────────────── */}
      <div className="border-t border-[var(--color-line)] mt-8" />
      <ServiceHistoryPreview records={serviceRecords} />

      {/* ── 5. Your Vehicles strip ───────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-line)]" />
      <OwnedVehiclesStrip vehicles={ownedVehicles} />

      {/* ── 6. Archive of Documents ──────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-line)]" />
      <DocumentsPreview documents={documents} />

      {/* ── 7. Saved inventory searches ──────────────────────────────────────── */}
      <div className="border-t border-[var(--color-line)]" />
      <section className="px-6 md:px-12 lg:px-16 py-8">
        <h2 className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">
          Saved Searches
        </h2>
        <p className="mb-6 text-sm text-ink-secondary">
          Your pinned inventory filters — pick up right where you left off.
        </p>
        <SavedSearchList />
      </section>

      {/* Bottom padding */}
      <div className="pb-16" />
    </div>
  );
}
