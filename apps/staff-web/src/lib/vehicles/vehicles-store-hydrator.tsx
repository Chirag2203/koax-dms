/**
 * VehiclesStoreHydrator
 *
 * Client-only component that seeds the Zustand vehicles store from fixtures
 * on first client mount, preventing SSR/hydration mismatches.
 *
 * Phase B (PLAN-VEHICLES-002 §B): after the canonical fixture load, walks the
 * inventory Vehicle fixtures and service JobCard fixtures to backfill every
 * BN-touched VIN into the ledger.
 *
 * Inventory backfill generates a realistic 2-row ownership chain:
 *   1. Prior-owner row — TRANSFERRED on the acquisition date, closeReason
 *      CONSIGNED_TO_BN. Consignor is deterministically picked from the
 *      city-matched customer pool via VIN-hash (so repeated hydrations
 *      produce identical fixtures).
 *   2. BN_CONSIGNMENT ACTIVE row against the cust-bn-dealer sentinel,
 *      opened on the same acquisition date.
 *
 * Service walk-in backfill opens a single ACTIVE ownership row against the
 * JC's real customerId with the advisor as actor. No anonymous actors, no
 * sentinel placeholders surfaced to the UI.
 *
 * Idempotency: guarded by `store.hydrated` (outer) and per-VIN
 * `if (!state.vehicles[vin])` checks (inner).
 *
 * Spec reference: SPEC-VEHICLES-001 P1 scope (hydrator mount)
 *                 PLAN-VEHICLES-002 §B (backfill hydration)
 *                 PLAN-VEHICLES-002 §B.enrichment (2-row chain)
 */

'use client';

import { useEffect } from 'react';
import {
  vehicleMasters,
  ownershipRows,
  ownershipEvents,
  ownershipClaims,
  vehicles as inventoryVehicles,
  jobCards,
  vehicleModuleCustomers,
} from '@dms/mocks/fixtures';
import type { JobCard, Vehicle, Customer } from '@dms/types';
import type { VehicleMaster } from '@dms/types';
import { useVehiclesStore } from './vehicles-store';
import { rebuildIndices, indexOwnershipByVin, indexOwnershipByCustomer } from './vehicles-store/index-maintenance';
import { makeOwnershipId, makeEventId } from './vehicles-store/id-helpers';
import type { VehiclesState } from './vehicles-store/types';

// ─── Safe VIN canonicalization for fixture backfill ───────────────────────────
//
// The strict normalizeVin() from @dms/vehicles-core rejects chars I, O, Q, U, Z
// per ISO 3779 §4. Several legacy fixture VINs (e.g. WP0ZZZ97ZNS112045) contain
// Z. These are valid demo VINs that pre-date the strict normalizer.
function safeVin(raw: string): string {
  return raw.trim().toUpperCase();
}

// ─── Deterministic helpers ───────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function offsetDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function offsetYears(isoDate: string, years: number): string {
  const d = new Date(isoDate);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString();
}

// ─── Staff actor mapping per outlet ──────────────────────────────────────────
//
// Sales Manager role (R10) is the standard acquirer for consignment intake.
// Using the same staff-r10-001 actor that the inventory cost ledger uses
// (see packages/mocks/src/fixtures/inventory.ts cost ledger `addedBy`).

const ACQUIRING_STAFF_BY_OUTLET: Record<string, string> = {
  'BLR-01': 'staff-r10-001', // Arjun Mehta — Sales Manager
  'MUM-01': 'staff-r10-001',
  'CHE-01': 'staff-r10-001',
};

function acquiringStaffFor(outletId: string): string {
  return ACQUIRING_STAFF_BY_OUTLET[outletId] ?? 'staff-r10-001';
}

// ─── Helper: index a single ownership row into both vin + customer indices ────

function indexOwnership(
  state: VehiclesState,
  ownership: { id: string; vin: string; customerId: string },
): void {
  indexOwnershipByVin(state, ownership.vin, ownership.id);
  indexOwnershipByCustomer(state, ownership.customerId, ownership.id);
}

// ─── Consignor pool ──────────────────────────────────────────────────────────
//
// City-scoped pools. Deterministic VIN-hash picks one per inventory vehicle.
// Excludes the BN dealer sentinel and all customers already in canonical
// ownership fixtures (so we don't pick Arjun Mehta as the consignor for a
// random Porsche — he's the current owner of VIN-A).

function buildConsignorPool(customers: Customer[]): Record<string, Customer[]> {
  const EXCLUDED = new Set([
    'cust-bn-dealer',
    'cust-rohan-desai',
    'cust-neha-kapoor',
    'cust-arjun-mehta',
    'cust-priya-mehta',
    'cust-vikram-singh',
    'cust-meera-iyer',
    'cust-rahul-kumar',
    'cust-sunita-reddy',
    'cust-karan-shah',
    'cust-pooja-desai',
  ]);

  const pool: Record<string, Customer[]> = { bangalore: [], mumbai: [], chennai: [] };
  for (const c of customers) {
    if (EXCLUDED.has(c.id)) continue;
    const bucket = pool[c.preferredCity];
    if (bucket) bucket.push(c);
  }
  return pool;
}

function pickConsignor(
  pool: Customer[],
  vin: string,
  fallbackCity: Customer[],
): Customer | null {
  const effective = pool.length > 0 ? pool : fallbackCity;
  if (effective.length === 0) return null;
  const idx = hashString(vin) % effective.length;
  return effective[idx] ?? null;
}

// ─── Helper: infer a VehicleMaster from a JobCard ────────────────────────────

export function inferVehicleFromJC(jc: JobCard): VehicleMaster {
  const vin = safeVin(jc.vin);
  return {
    vin,
    make: 'Unknown',
    model: 'Unknown',
    variant: '',
    year: 2020,
    color: 'Unknown',
    rcNumber: `RC-${vin.slice(-6)}`,
    firstTouchedAt: jc.receivedAt,
    firstTouchSource: 'SERVICE_ONLY_WALKIN',
    firstTouchOutletId: jc.outletId as 'BLR-01' | 'MUM-01' | 'CHE-01',
    lastKnownKm: jc.odometerIn ?? 0,
    lastKnownKmAt: jc.receivedAt,
    metadataIncomplete: true,
    schemaVersion: 'v1',
  };
}

// ─── Pure backfill logic (exported for testing) ───────────────────────────────

/**
 * Apply Phase B backfill mutations to a mutable VehiclesState draft.
 *
 * Phase B.1: inventory vehicles → 2-row chain (prior TRANSFERRED + BN_CONSIGNMENT ACTIVE)
 * Phase B.2: service JobCard VINs → SERVICE_ONLY_WALKIN ownership per JC customer
 */
export function applyBackfillToState(
  state: VehiclesState,
  invVehicles: Vehicle[],
  jcList: JobCard[],
  customers: Customer[],
): void {
  const consignorPool = buildConsignorPool(customers);

  // ── Phase B.1: Inventory backfill ────────────────────────────────────────────
  for (const inv of invVehicles) {
    const vin = safeVin(inv.vin);

    if (state.vehicles[vin]) {
      state.vehicles[vin]!.inventoryVehicleVin = vin;
      continue;
    }

    const outletId = (
      inv.city === 'mumbai' ? 'MUM-01'
      : inv.city === 'chennai' ? 'CHE-01'
      : 'BLR-01'
    ) as 'BLR-01' | 'MUM-01' | 'CHE-01';

    const listedAt = inv.listedAt ?? '2026-01-01T00:00:00.000Z';
    const h = hashString(vin);

    // acquiredAt = 15–45 days before listedAt (deterministic via hash)
    const daysBeforeListing = 15 + (h % 30);
    const acquiredAt = offsetDays(listedAt, -daysBeforeListing);
    // priorOwnedSince = 2–5 years before acquiredAt
    const yearsOwned = 2 + (h % 3);
    const priorOwnedSince = offsetYears(acquiredAt, -yearsOwned);

    const actor = acquiringStaffFor(outletId);
    const consignor = pickConsignor(
      consignorPool[inv.city] ?? [],
      vin,
      consignorPool['bangalore'] ?? [],
    );

    // firstTouchedAt = acquisition date (first time we saw the vehicle)
    state.vehicles[vin] = {
      vin,
      make: inv.make,
      model: inv.model,
      variant: inv.variant ?? '',
      year: inv.year,
      color: inv.color ?? 'Unknown',
      rcNumber: `RC-${vin.slice(-6)}`,
      firstTouchedAt: acquiredAt,
      firstTouchSource: 'BN_CONSIGNMENT',
      firstTouchOutletId: outletId,
      lastKnownKm: inv.km ?? 0,
      lastKnownKmAt: acquiredAt,
      inventoryVehicleVin: vin,
      schemaVersion: 'v1',
    };

    // Idempotency inner-guard: skip if an ACTIVE row already exists
    const existingIds = state.ownershipIdByVin[vin] ?? [];
    const hasActive = existingIds.some(
      (id) => state.ownerships[id]?.state === 'ACTIVE',
    );
    if (hasActive) continue;

    const priorKmAtOpen = Math.max(0, (inv.km ?? 0) - (500 + (h % 2000)));
    const priorKmAtClose = Math.max(priorKmAtOpen, (inv.km ?? 0) - (50 + (h % 300)));

    // Row 1: prior owner (TRANSFERRED on consignment)
    if (consignor) {
      const priorId = makeOwnershipId();
      state.ownerships[priorId] = {
        id: priorId,
        vin,
        customerId: consignor.id,
        source: 'BN_SALE',
        state: 'TRANSFERRED',
        isJoint: false,
        fromAt: priorOwnedSince,
        toAt: acquiredAt,
        kmAtOpen: priorKmAtOpen,
        kmAtClose: priorKmAtClose,
        kmStale: false,
        closedBy: actor,
        closedAt: acquiredAt,
        closeReason: 'CONSIGNED_TO_BN',
        createdBy: actor,
        createdAt: priorOwnedSince,
        schemaVersion: 'v1',
      };
      indexOwnership(state, state.ownerships[priorId]!);

      state.events.push({
        id: makeEventId(),
        vin,
        at: priorOwnedSince,
        kind: 'OPEN',
        actorId: actor,
        actorRole: 'R10',
        ownershipId: priorId,
        payload: { source: 'BN_SALE', kmAtOpen: priorKmAtOpen },
        schemaVersion: 'v1',
      });

      state.events.push({
        id: makeEventId(),
        vin,
        at: acquiredAt,
        kind: 'CLOSE',
        actorId: actor,
        actorRole: 'R10',
        ownershipId: priorId,
        payload: {
          closeReason: 'CONSIGNED_TO_BN',
          kmAtClose: priorKmAtClose,
        },
        schemaVersion: 'v1',
      });
    }

    // Row 2: BN_CONSIGNMENT ACTIVE
    const bnId = makeOwnershipId();
    state.ownerships[bnId] = {
      id: bnId,
      vin,
      customerId: 'cust-bn-dealer',
      source: 'BN_CONSIGNMENT',
      state: 'ACTIVE',
      isJoint: false,
      fromAt: acquiredAt,
      kmAtOpen: priorKmAtClose,
      kmStale: false,
      createdBy: actor,
      createdAt: acquiredAt,
      schemaVersion: 'v1',
    };
    indexOwnership(state, state.ownerships[bnId]!);

    state.events.push({
      id: makeEventId(),
      vin,
      at: acquiredAt,
      kind: 'OPEN',
      actorId: actor,
      actorRole: 'R10',
      ownershipId: bnId,
      payload: { source: 'BN_CONSIGNMENT', kmAtOpen: priorKmAtClose },
      schemaVersion: 'v1',
    });
  }

  // ── Phase B.2: Service walk-in backfill ──────────────────────────────────────
  const seenWalkinVins = new Set<string>();

  for (const jc of jcList) {
    const vin = safeVin(jc.vin);

    if (state.vehicles[vin]) {
      const activeOwnerships = (state.ownershipIdByVin[vin] ?? [])
        .map((id) => state.ownerships[id])
        .filter((o): o is NonNullable<typeof o> => o !== undefined && o.state === 'ACTIVE');

      const currentOwnerId = activeOwnerships[0]?.customerId;
      if (currentOwnerId && currentOwnerId !== jc.customerId) {
        // L10: conflicting owner — JC keeps its own customerId, skip
        continue;
      }
      continue;
    }

    if (seenWalkinVins.has(vin)) continue;
    seenWalkinVins.add(vin);

    state.vehicles[vin] = inferVehicleFromJC(jc);

    // Use the JC's advisor (if present) as the acquiring actor — real staff,
    // not a synthetic sentinel.
    const jcActor = jc.advisorId ?? acquiringStaffFor(jc.outletId);

    const ownershipId = makeOwnershipId();
    state.ownerships[ownershipId] = {
      id: ownershipId,
      vin,
      customerId: jc.customerId,
      source: 'SERVICE_ONLY_WALKIN',
      state: 'ACTIVE',
      isJoint: false,
      fromAt: jc.receivedAt,
      kmAtOpen: jc.odometerIn ?? 0,
      kmStale: false,
      createdBy: jcActor,
      createdAt: jc.receivedAt,
      linkedJobCardId: jc.id,
      schemaVersion: 'v1',
    };

    indexOwnership(state, state.ownerships[ownershipId]!);

    state.events.push({
      id: makeEventId(),
      vin,
      at: jc.receivedAt,
      kind: 'OPEN',
      actorId: jcActor,
      actorRole: 'R09',
      ownershipId,
      payload: {
        source: 'SERVICE_ONLY_WALKIN',
        linkedJobCardId: jc.id,
        kmAtOpen: jc.odometerIn ?? 0,
      },
      schemaVersion: 'v1',
    });
  }
}

// ─── Hydrator component ───────────────────────────────────────────────────────

export function VehiclesStoreHydrator() {
  useEffect(() => {
    const store = useVehiclesStore.getState();

    // Only hydrate once — idempotent outer guard
    if (store.hydrated) return;

    useVehiclesStore.setState((state) => {
      // ── Phase A: canonical fixture load ──────────────────────────────────────
      const vehicles: typeof state.vehicles = {};
      for (const v of vehicleMasters) {
        vehicles[v.vin] = structuredClone(v);
      }

      const ownerships: typeof state.ownerships = {};
      for (const row of ownershipRows) {
        ownerships[row.id] = structuredClone(row);
      }

      const claims: typeof state.claims = {};
      for (const claim of ownershipClaims) {
        claims[claim.id] = structuredClone(claim);
      }

      state.vehicles = vehicles;
      state.ownerships = ownerships;
      state.claims = claims;
      state.events = structuredClone(ownershipEvents);
      state.hydrated = true;

      rebuildIndices(state);

      // ── Phase B: inventory + service backfill ────────────────────────────────
      applyBackfillToState(
        state,
        inventoryVehicles as Vehicle[],
        jobCards as JobCard[],
        vehicleModuleCustomers as Customer[],
      );
    });
  }, []);

  return null;
}
