/**
 * VehiclesStoreHydrator
 *
 * Client-only component that seeds the Zustand vehicles store from fixtures
 * on first client mount, preventing SSR/hydration mismatches.
 *
 * Phase B (PLAN-VEHICLES-002 §B): after the canonical fixture load, walks the
 * inventory Vehicle fixtures and service JobCard fixtures to backfill every
 * BN-touched VIN into VehicleMaster + VehicleOwnership + OPEN event.
 *
 * Idempotency: guarded by `store.hydrated` (outer) and per-VIN `if (!state.vehicles[vin])`
 * checks (inner). Per-row indexOwnership is used during loops; rebuildIndices is NOT
 * called a second time (concern 8 trap avoidance per spec §12).
 *
 * Spec reference: SPEC-VEHICLES-001 P1 scope (hydrator mount)
 *                 PLAN-VEHICLES-002 §B (backfill hydration)
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
} from '@dms/mocks/fixtures';
import type { JobCard, Vehicle } from '@dms/types';
import type { VehicleMaster } from '@dms/types';
import { useVehiclesStore } from './vehicles-store';
import { rebuildIndices, indexOwnershipByVin, indexOwnershipByCustomer } from './vehicles-store/index-maintenance';
import { makeOwnershipId, makeEventId } from './vehicles-store/id-helpers';
import type { VehiclesState } from './vehicles-store/types';

// ─── Safe VIN canonicalization for fixture backfill ───────────────────────────
//
// The strict normalizeVin() from @dms/vehicles-core rejects chars I, O, Q, U, Z
// per ISO 3779 §4. Several legacy fixture VINs (e.g. WP0ZZZ97ZNS112045) contain
// Z. These are valid demo VINs that pre-date the strict normalizer. For backfill
// we use a lenient canonical form (trim + uppercase) to avoid throwing during
// the hydration cycle. normalizeVin is still enforced at all user-facing entry
// points (forms, claim submit, etc.) — only fixture seeding uses safeVin.
function safeVin(raw: string): string {
  return raw.trim().toUpperCase();
}

// ─── Helper: index a single ownership row into both vin + customer indices ────

function indexOwnership(
  state: VehiclesState,
  ownership: { id: string; vin: string; customerId: string },
): void {
  indexOwnershipByVin(state, ownership.vin, ownership.id);
  indexOwnershipByCustomer(state, ownership.customerId, ownership.id);
}

// ─── Helper: infer a VehicleMaster from a JobCard ────────────────────────────

/**
 * Infer a VehicleMaster from a JobCard for SERVICE_ONLY_WALKIN backfill.
 *
 * The JobCard schema does not carry vehicle make/model/etc. (those live on the
 * Vehicle entity). Every walk-in backfill therefore marks metadataIncomplete: true
 * so the amber banner appears on the detail page and staff can enrich via
 * VehicleIntakeDialog. (PLAN-VEHICLES-002 §B.3 + concern 6)
 *
 * Exported for unit testing — hydrator-backfill.test.ts.
 */
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
 * Called inside a single immer setState transaction. Operates purely on the
 * state arg — no external reads (correctness constraint).
 *
 * Phase B.1: inventory vehicles → BN_CONSIGNMENT ownership against cust-bn-dealer
 * Phase B.2: service JobCard VINs → SERVICE_ONLY_WALKIN ownership per JC customer
 *
 * Exported so the pure logic can be unit-tested without React or Zustand.
 * (PLAN-VEHICLES-002 §B.5 — test idempotency + inferVehicleFromJC)
 */
export function applyBackfillToState(
  state: VehiclesState,
  invVehicles: Vehicle[],
  jcList: JobCard[],
): void {
  // ── Phase B.1: Inventory backfill ────────────────────────────────────────────
  for (const inv of invVehicles) {
    const vin = safeVin(inv.vin);

    if (state.vehicles[vin]) {
      // Already exists — link inventoryVehicleVin (vestigial but harmless per concern 8)
      state.vehicles[vin]!.inventoryVehicleVin = vin;
      continue;
    }

    // Derive outletId from city field
    const outletId = (
      inv.city === 'mumbai' ? 'MUM-01'
      : inv.city === 'chennai' ? 'CHE-01'
      : 'BLR-01'
    ) as 'BLR-01' | 'MUM-01' | 'CHE-01';

    const touchedAt = inv.listedAt ?? '2023-01-01T00:00:00.000Z';

    state.vehicles[vin] = {
      vin,
      make: inv.make,
      model: inv.model,
      variant: inv.variant ?? '',
      year: inv.year,
      color: inv.color ?? 'Unknown',
      rcNumber: `RC-${vin.slice(-6)}`,
      firstTouchedAt: touchedAt,
      firstTouchSource: 'BN_CONSIGNMENT',
      firstTouchOutletId: outletId,
      lastKnownKm: inv.km ?? 0,
      lastKnownKmAt: touchedAt,
      inventoryVehicleVin: vin,
      schemaVersion: 'v1',
    };

    // Inner idempotency guard: check for existing ACTIVE row (can happen if
    // this function is called a second time on an already-populated state)
    const existingOwnershipIds = state.ownershipIdByVin[vin] ?? [];
    const hasActiveOwnership = existingOwnershipIds.some((id) => {
      const o = state.ownerships[id];
      return o?.state === 'ACTIVE';
    });
    if (hasActiveOwnership) continue;

    // Open BN_CONSIGNMENT ownership against cust-bn-dealer
    const ownershipId = makeOwnershipId();
    state.ownerships[ownershipId] = {
      id: ownershipId,
      vin,
      customerId: 'cust-bn-dealer',
      source: 'BN_CONSIGNMENT',
      state: 'ACTIVE',
      isJoint: false,
      fromAt: touchedAt,
      kmAtOpen: inv.km ?? 0,
      kmStale: false,
      createdBy: 'system-auto-backfill',
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    indexOwnership(state, state.ownerships[ownershipId]!);

    state.events.push({
      id: makeEventId(),
      vin,
      at: new Date().toISOString(),
      kind: 'OPEN',
      actorId: 'system-auto-backfill',
      actorRole: 'SYSTEM',
      ownershipId,
      payload: {
        meta: { backfill: true, backfillSource: 'INVENTORY' },
        source: 'BN_CONSIGNMENT',
      },
      schemaVersion: 'v1',
    });
  }

  // ── Phase B.2: Service walk-in backfill ──────────────────────────────────────
  // Walk every JobCard. For VINs not yet in state.vehicles, create VehicleMaster
  // (metadataIncomplete: true) + SERVICE_ONLY_WALKIN ownership + OPEN event.
  //
  // Per L10: if VIN exists and current ACTIVE owner differs from jc.customerId,
  // do NOT open a second ownership row.

  const seenWalkinVins = new Set<string>();

  for (const jc of jcList) {
    const vin = safeVin(jc.vin);

    if (state.vehicles[vin]) {
      // VIN already tracked — apply L10 conflict check
      const activeOwnerships = (state.ownershipIdByVin[vin] ?? [])
        .map((id) => state.ownerships[id])
        .filter((o): o is NonNullable<typeof o> => o !== undefined && o.state === 'ACTIVE');

      const currentOwnerId = activeOwnerships[0]?.customerId;
      if (currentOwnerId && currentOwnerId !== jc.customerId) {
        // L10: conflicting owner — JC keeps its own customerId, skip
        continue;
      }
      // Same owner OR no current owner — nothing to do
      continue;
    }

    // New VIN — only backfill the first JC seen for this VIN
    if (seenWalkinVins.has(vin)) continue;
    seenWalkinVins.add(vin);

    state.vehicles[vin] = inferVehicleFromJC(jc);

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
      createdBy: 'system-auto-backfill',
      createdAt: new Date().toISOString(),
      linkedJobCardId: jc.id,
      schemaVersion: 'v1',
    };

    indexOwnership(state, state.ownerships[ownershipId]!);

    state.events.push({
      id: makeEventId(),
      vin,
      at: new Date().toISOString(),
      kind: 'OPEN',
      actorId: 'system-auto-backfill',
      actorRole: 'SYSTEM',
      ownershipId,
      payload: {
        meta: { backfill: true, backfillSource: 'SERVICE' },
        source: 'SERVICE_ONLY_WALKIN',
        linkedJobCardId: jc.id,
      },
      schemaVersion: 'v1',
    });
  }

  // NOTE: Do NOT call rebuildIndices(state) here.
  // Per-row indexOwnership during loops is sufficient.
  // A second rebuildIndices call would reset then re-scan correctly, but spec
  // §12 concern 8 explicitly warns against it in the hydrator path.
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

      // Rebuild indices from canonical fixture data
      rebuildIndices(state);

      // ── Phase B: inventory + service backfill ─────────────────────────────────
      applyBackfillToState(state, inventoryVehicles as Vehicle[], jobCards as JobCard[]);
    });
  }, []);

  return null;
}
