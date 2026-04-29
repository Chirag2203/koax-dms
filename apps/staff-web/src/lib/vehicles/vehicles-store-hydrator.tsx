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
  deals as salesDeals,
  vehicleDocuments,
} from '@dms/mocks/fixtures';
import type { JobCard, Vehicle, Customer, SalesEvent, Deal, Document, StaffDocumentMetadata } from '@dms/types';
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
        payload: { source: 'BN_SALE', kmAtOpen: priorKmAtOpen, buyerCustomerId: consignor.id },
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
      payload: { source: 'BN_CONSIGNMENT', kmAtOpen: priorKmAtClose, consignorCustomerId: consignor?.id },
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
        customerId: jc.customerId,
      },
      schemaVersion: 'v1',
    });
  }
}

// ─── Phase C: SalesEvents derived from inventory + deals fixtures ────────────
//
// Sales events MUST come from real cross-module data (inventory + sales deals),
// not hardcoded seeds. This ensures:
//   - VINs not in BN inventory (e.g. customer-owned legacy VINs) have no events
//   - VINs in inventory emit ACQUIRED + LISTED (using Vehicle.listedAt)
//   - Deals on inventory VINs emit RESERVED / SOLD / RESERVATION_LOST per stage
//   - "View Sale Details" links always resolve (the VIN is in inventory)
//
// Spec reference: PLAN-VEHICLES-003 §3.5 (cross-module derivation).

const CITY_TO_OUTLET: Record<string, 'BLR-01' | 'MUM-01' | 'CHE-01'> = {
  bangalore: 'BLR-01',
  mumbai: 'MUM-01',
  chennai: 'CHE-01',
};

/** Lowercase kebab-case the customer name for lookup — demo-level mapping. */
function customerIdFromName(name: string): string {
  return 'cust-' + name.toLowerCase().trim().replace(/\s+/g, '-');
}

function buildDerivedSalesEvents(
  invVehicles: Vehicle[],
  deals: Deal[],
): SalesEvent[] {
  const events: SalesEvent[] = [];
  const ACQUIRER_ID = 'staff-r10-001';
  const ACQUIRER_ROLE = 'R10';

  // ── C.1: ACQUIRED + LISTED per inventory vehicle ─────────────────────────
  for (const v of invVehicles) {
    const vin = safeVin(v.vin);
    const listedAt = v.listedAt ?? '2026-03-15T09:00:00.000Z';

    // Acquisition date: deterministically 15–45 days before listedAt
    const h = hashString(vin);
    const acquiredAt = offsetDays(listedAt, -(15 + (h % 30)));

    // List price from pricing.exShowroom (authoritative) or fallback to price
    const listPrice =
      (v as unknown as { pricing?: { exShowroom?: number } }).pricing?.exShowroom ??
      v.price ??
      0;
    // Acquisition cost: 85% of list price (demo heuristic)
    const acquisitionCost = Math.round(listPrice * 0.85);
    const outletId = CITY_TO_OUTLET[v.city] ?? 'BLR-01';

    events.push({
      id: `se-${vin}-acquired`,
      vin,
      at: acquiredAt,
      kind: 'ACQUIRED',
      actorId: ACQUIRER_ID,
      actorRole: ACQUIRER_ROLE,
      payload: {
        acquisitionCost,
        kmAtAcquisition: v.km ?? 0,
        source: 'BN_CONSIGNMENT',
      },
      schemaVersion: 'v1',
    });

    events.push({
      id: `se-${vin}-listed`,
      vin,
      at: listedAt,
      kind: 'LISTED',
      actorId: ACQUIRER_ID,
      actorRole: ACQUIRER_ROLE,
      payload: { listPrice, outletId },
      schemaVersion: 'v1',
    });
  }

  // ── C.2: Deal-derived events — RESERVED / SOLD / RESERVATION_LOST ────────
  // Fixture has many deals per VIN across stages (for Kanban demo). For the
  // per-VIN sales stream to be coherent, we pick the MOST-ADVANCED deal per
  // VIN (delivered > sales-order > reserved > lost > earlier stages).
  const invVinSet = new Set(invVehicles.map((v) => safeVin(v.vin)));
  const STAGE_RANK: Record<Deal['stage'], number> = {
    'new-lead': 0,
    contacted: 1,
    'test-drive': 2,
    'on-hold': 2,
    reserved: 3,
    'sales-order': 4,
    delivered: 5,
    lost: 6,
  };

  const mostAdvancedPerVin = new Map<string, Deal>();
  for (const deal of deals) {
    if (!deal.vehicleVin) continue;
    const vin = safeVin(deal.vehicleVin);
    if (!invVinSet.has(vin)) continue;
    const existing = mostAdvancedPerVin.get(vin);
    if (!existing || STAGE_RANK[deal.stage] > STAGE_RANK[existing.stage]) {
      mostAdvancedPerVin.set(vin, deal);
    }
  }

  for (const deal of mostAdvancedPerVin.values()) {
    const vin = safeVin(deal.vehicleVin!);

    const actorId = deal.assignedTo ?? 'staff-r09-001';
    const actorRole = 'R09';
    const activityAt = deal.lastActivityAt ?? deal.createdAt;

    // Active deal stages → RESERVED event (reservation was set at some point)
    if (
      deal.stage === 'reserved' ||
      deal.stage === 'sales-order' ||
      deal.stage === 'delivered'
    ) {
      const expiresAt =
        deal.reservationExpiresAt ?? offsetDays(activityAt, 7);
      events.push({
        id: `se-${deal.id}-reserved`,
        vin,
        at: activityAt,
        kind: 'RESERVED',
        actorId,
        actorRole,
        dealId: deal.id,
        payload: {
          dealId: deal.id,
          depositAmount: Math.max(0, Math.round(deal.amount * 0.1)),
          expiresAt,
        },
        schemaVersion: 'v1',
      });
    }

    // Delivered deals → SOLD event
    if (deal.stage === 'delivered') {
      const finalPrice = deal.amount;
      events.push({
        id: `se-${deal.id}-sold`,
        vin,
        at: activityAt,
        kind: 'SOLD',
        actorId,
        actorRole,
        dealId: deal.id,
        salesOrderId: `so-${deal.id}`,
        payload: {
          salesOrderId: `so-${deal.id}`,
          finalPrice,
          flow: 'MARGIN_SCHEME',
          tcsCollected:
            finalPrice > 1_000_000 ? Math.round(finalPrice * 0.01) : 0,
          buyerCustomerId: customerIdFromName(deal.customerName),
          sellerSignatures: [],
        },
        schemaVersion: 'v1',
      });
    }

    // Lost deals with cancellationReason → RESERVATION_LOST event
    if (deal.stage === 'lost' && deal.cancellationReason) {
      const reason: 'EXPIRED' | 'CANCELLED' | 'BUYER_WITHDREW' =
        deal.cancellationReason === 'EXPIRED'
          ? 'EXPIRED'
          : deal.cancellationReason === 'BUYER_WITHDREW'
            ? 'BUYER_WITHDREW'
            : 'CANCELLED';
      events.push({
        id: `se-${deal.id}-lost`,
        vin,
        at: activityAt,
        kind: 'RESERVATION_LOST',
        actorId,
        actorRole,
        dealId: deal.id,
        payload: { dealId: deal.id, reason },
        schemaVersion: 'v1',
      });
    }
  }

  // Sort chronologically so the timeline renders correctly
  events.sort((a, b) => a.at.localeCompare(b.at));
  return events;
}


// ─── Phase D: Documents — seed from vehicleDocuments fixture ─────────────────
//
// Converts inventory VehicleDocument (staff domain) into portal Document +
// StaffDocumentMetadata pairs. Each inventory VIN gets at least:
//   RC (rc), Insurance (insurance), and one PII-heavy doc (noc for even VINs,
//   form-29-30 for odd VINs) so the demo covers PII-heavy categories.
//
// Spec reference: PLAN-VEHICLES-003 §3 hydrator note + spec deliverable #7.

function buildDocumentSeed(
  invVehicles: Vehicle[],
): { docs: Document[]; meta: StaffDocumentMetadata[] } {
  const docs: Document[] = [];
  const meta: StaffDocumentMetadata[] = [];

  // Map VehicleDocument (inventory fixture) → portal Document
  for (const vd of vehicleDocuments) {
    // Derive portal Document type — map inventory types to portal types
    const portalType = (() => {
      switch ((vd as unknown as { type: string }).type) {
        case 'rc': return 'rc' as const;
        case 'insurance': return 'insurance' as const;
        case 'appraisal': return 'inspection-report' as const;
        case 'inspection': return 'inspection-report' as const;
        default: return 'service-record' as const;
      }
    })();

    const docId = vd.id;
    docs.push({
      id: docId,
      vehicleVin: vd.vin,
      vehicleName: '',    // resolved from vehicles map at display time
      type: portalType,
      name: vd.name,
      uploadedAt: vd.uploadedAt,
      fileUrl: vd.fileUrl,
      fileSize: vd.fileSize,
    });

    meta.push({
      docId,
      version: 1,
      schemaVersion: 'v1',
    });
  }

  // Add one PII-heavy demo doc per inventory VIN (ensures coverage for L13 flows)
  for (let i = 0; i < invVehicles.length; i++) {
    const inv = invVehicles[i]!;
    const vin = safeVin(inv.vin);
    const vinShort = vin.slice(-6);
    const listedAt = inv.listedAt ?? '2026-01-01T00:00:00.000Z';
    const uploadedAt = offsetDays(listedAt, -5);

    // Alternate between noc and form-29-30 per VIN
    const isPiiNoc = i % 2 === 0;
    const docId = `DOC-PII-${String(i + 1).padStart(3, '0')}-001`;

    docs.push({
      id: docId,
      vehicleVin: vin,
      vehicleName: '',
      type: 'purchase-agreement' as const, // closest portal type for NOC/form-29-30
      name: isPiiNoc
        ? `NOC_Financier_${vinShort}.pdf`
        : `Form2930_${vinShort}.pdf`,
      uploadedAt,
      fileUrl: `/api/staff/inventory/vehicles/${vin}/documents/${isPiiNoc ? 'noc' : 'form-29-30'}`,
      fileSize: '1.5 MB',
    });

    // Staff metadata marks this as the PII-heavy staff category
    meta.push({
      docId,
      version: 1,
      purposeOfCollection: isPiiNoc
        ? 'NOC obtained for financier clearance prior to sale'
        : 'Form 29/30 required for RTO transfer',
      schemaVersion: 'v1',
    });
  }

  return { docs, meta };
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

      // ── Phase C: Derive SalesEvents from inventory + deals (real data) ───
      const derivedEvents = buildDerivedSalesEvents(
        inventoryVehicles as Vehicle[],
        salesDeals as Deal[],
      );
      for (const event of derivedEvents) {
        if (!state.salesEvents[event.vin]) {
          state.salesEvents[event.vin] = [];
        }
        state.salesEvents[event.vin]!.push(event);
      }

      // L39: VehicleMaster.listedAt set at LISTED emission time
      for (const event of derivedEvents) {
        if (event.kind === 'LISTED' && state.vehicles[event.vin]) {
          if (!state.vehicles[event.vin]!.listedAt) {
            state.vehicles[event.vin]!.listedAt = event.at;
          }
        }
      }

      // ── Phase D: Seed Documents + StaffDocumentMetadata ──────────────────────
      const { docs, meta } = buildDocumentSeed(inventoryVehicles as Vehicle[]);
      for (const doc of docs) {
        if (!state.documents[doc.id]) {
          state.documents[doc.id] = structuredClone(doc);
        }
      }
      for (const m of meta) {
        if (!state.staffMeta[m.docId]) {
          state.staffMeta[m.docId] = structuredClone(m);
        }
      }
    });
  }, []);

  return null;
}
