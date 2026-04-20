/**
 * Portal vehicles store — customer-web standalone instance.
 *
 * Intentionally separate from staff-web's useVehiclesStore so there is no
 * cross-app module coupling. Both apps read the same @dms/mocks fixtures and
 * @dms/types schemas; they just maintain independent in-memory states (fine
 * for the mock phase — in production both would hit the same backend).
 *
 * Mutation scope limited to what the portal needs:
 *   - submitClaim   — claim form
 *   - selfRevoke    — "I sold this vehicle" modal
 *   - logPdfExport  — PDF export audit log
 *   - read selectors for portal-vehicle-adapter
 *
 * Spec reference: SPEC-PORTAL-VEHICLES-001 §3 (vehicles-client-store)
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { normalizeVin, effectiveState } from '@dms/vehicles-core';
import type {
  VehicleMaster,
  VehicleOwnership,
  OwnershipClaim,
  OwnershipChangeEvent,
  CloseReason,
  RejectionReason,
} from '@dms/types';
import {
  vehicleMasters,
  ownershipRows,
  ownershipEvents,
  ownershipClaims,
} from '@dms/mocks/fixtures';

// ─── State ────────────────────────────────────────────────────────────────────

interface PortalVehiclesState {
  vehicles: Record<string, VehicleMaster>;
  ownerships: Record<string, VehicleOwnership>;
  claims: Record<string, OwnershipClaim>;
  events: OwnershipChangeEvent[];
  ownershipIdByVin: Record<string, string[]>;
  claimIdByVin: Record<string, string[]>;
  ownershipIdByCustomer: Record<string, string[]>;
  hydrated: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function nowIso(): string { return new Date().toISOString(); }
function addDays(iso: string, d: number): string {
  const dt = new Date(iso); dt.setDate(dt.getDate() + d); return dt.toISOString();
}

function addToList(map: Record<string, string[]>, key: string, val: string): void {
  if (!map[key]) map[key] = [];
  if (!map[key]!.includes(val)) map[key]!.push(val);
}

function rebuildIndices(s: PortalVehiclesState): void {
  s.ownershipIdByVin = {};
  s.claimIdByVin = {};
  s.ownershipIdByCustomer = {};
  for (const [id, row] of Object.entries(s.ownerships)) {
    addToList(s.ownershipIdByVin, row.vin, id);
    addToList(s.ownershipIdByCustomer, row.customerId, id);
  }
  for (const [id, c] of Object.entries(s.claims)) {
    addToList(s.claimIdByVin, c.vin, id);
  }
}

function peerCount(s: PortalVehiclesState, vin: string, ownershipId: string): number {
  return (s.ownershipIdByVin[vin] ?? []).filter(
    (id) => id !== ownershipId && s.ownerships[id]?.state === 'ACTIVE'
  ).length;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface PortalVehiclesActions {
  /** Hydrate from fixtures — idempotent. */
  hydrate(): void;

  /** Submit a portal ownership claim. */
  submitClaim(input: {
    vin: string;
    claimantCustomerId: string;
    rcScanUrl?: string;
    identityProofScanUrl?: string;
    autoMatchHit: boolean;
    matchedEntityId?: string;
  }): { claimId: string; autoApproved: boolean; duplicate?: boolean };

  /** Portal self-revoke — "I sold this vehicle". 7-day grace. */
  selfRevoke(
    ownershipId: string,
    reason: CloseReason,
    customerId: string,
    options?: { newOwnerHint?: { name: string; phone: string } },
  ): void;

  /** Append PDF export audit event. */
  logPdfExport(vin: string, customerId: string): void;

  // ── Selectors ──────────────────────────────────────────────────────────────

  /** ACTIVE + GRACE ownerships for a customer. */
  selectVehiclesByCustomer(
    customerId: string,
    opts: { includeGrace: boolean; now: string },
  ): VehicleOwnership[];

  /** All claims submitted by a customer. */
  selectClaimsByCustomer(customerId: string): OwnershipClaim[];

  /** All ownership rows for a given VIN. */
  selectOwnershipsByVin(vin: string): VehicleOwnership[];
}

export type PortalVehiclesStore = PortalVehiclesState & PortalVehiclesActions;

function initialState(): PortalVehiclesState {
  return {
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: false,
  };
}

export const usePortalVehiclesStore = create<PortalVehiclesStore>()(
  immer((set, get) => ({
    ...initialState(),

    hydrate() {
      if (get().hydrated) return;
      set((state) => {
        for (const v of vehicleMasters) state.vehicles[v.vin] = structuredClone(v);
        for (const r of ownershipRows) state.ownerships[r.id] = structuredClone(r);
        for (const c of ownershipClaims) state.claims[c.id] = structuredClone(c);
        state.events = structuredClone(ownershipEvents) as OwnershipChangeEvent[];
        state.hydrated = true;
        rebuildIndices(state);
      });
    },

    submitClaim(input) {
      const vin = normalizeVin(input.vin);
      let resultClaimId = '';
      let autoApproved = false;
      let isDuplicate = false;

      set((state) => {
        // Duplicate guard
        const existing = (state.claimIdByVin[vin] ?? [])
          .map((id) => state.claims[id])
          .find(
            (c): c is OwnershipClaim =>
              c !== undefined &&
              c.vin === vin &&
              c.claimantCustomerId === input.claimantCustomerId &&
              c.state === 'PENDING',
          );
        if (existing) {
          resultClaimId = existing.id;
          isDuplicate = true;
          return;
        }

        const claimId = makeId('clm');
        const submittedAt = nowIso();
        const claim: OwnershipClaim = {
          id: claimId,
          vin,
          claimantCustomerId: input.claimantCustomerId,
          submittedAt,
          rcScanUrl: input.rcScanUrl,
          identityProofScanUrl: input.identityProofScanUrl,
          autoMatchHit: input.autoMatchHit,
          matchedEntityId: input.matchedEntityId,
          state: input.autoMatchHit ? 'AUTO_APPROVED' : 'PENDING',
          schemaVersion: 'v1',
        };
        state.claims[claimId] = claim;
        addToList(state.claimIdByVin, vin, claimId);

        state.events.push({
          id: makeId('evt'),
          vin,
          at: submittedAt,
          kind: 'CLAIM_SUBMIT',
          actorId: input.claimantCustomerId,
          actorRole: 'PORTAL',
          claimId,
          payload: {
            claimantCustomerId: input.claimantCustomerId,
            autoMatchHit: input.autoMatchHit,
          },
          schemaVersion: 'v1',
        });

        if (input.autoMatchHit) autoApproved = true;
        resultClaimId = claimId;
      });

      return { claimId: resultClaimId, autoApproved, duplicate: isDuplicate || undefined };
    },

    selfRevoke(ownershipId, reason, customerId, options) {
      set((state) => {
        const row = state.ownerships[ownershipId];
        if (!row || row.customerId !== customerId) return;

        const revokeAt = nowIso();
        row.state = 'REVOKED';
        row.toAt = revokeAt;
        row.closeReason = reason;
        row.closedBy = customerId;
        row.closedAt = revokeAt;
        row.graceUntilAt = addDays(revokeAt, 7);
        row.piiRetentionUntil = addDays(revokeAt, 2555);

        state.events.push({
          id: makeId('evt'),
          vin: row.vin,
          at: revokeAt,
          kind: 'CLOSE',
          actorId: customerId,
          actorRole: 'PORTAL',
          ownershipId,
          payload: {
            reason,
            graceUntilAt: row.graceUntilAt,
            newOwnerHint: options?.newOwnerHint,
          },
          schemaVersion: 'v1',
        });
      });
    },

    logPdfExport(vin, customerId) {
      set((state) => {
        state.events.push({
          id: makeId('evt'),
          vin,
          at: nowIso(),
          kind: 'PDF_EXPORT',
          actorId: customerId,
          actorRole: 'PORTAL',
          payload: { customerId },
          schemaVersion: 'v1',
        });
      });
    },

    selectVehiclesByCustomer(customerId, opts) {
      const s = get();
      const ids = s.ownershipIdByCustomer[customerId] ?? [];
      return ids
        .map((id) => s.ownerships[id])
        .filter((r): r is VehicleOwnership => {
          if (!r) return false;
          const es = effectiveState(r, opts.now, peerCount(s, r.vin, r.id));
          if (es === 'ACTIVE' || es === 'ACTIVE_JOINT') return true;
          if (opts.includeGrace && es === 'GRACE') return true;
          return false;
        });
    },

    selectClaimsByCustomer(customerId) {
      return Object.values(get().claims).filter(
        (c): c is OwnershipClaim => c.claimantCustomerId === customerId,
      );
    },

    selectOwnershipsByVin(vin) {
      const s = get();
      return (s.ownershipIdByVin[vin] ?? [])
        .map((id) => s.ownerships[id])
        .filter((r): r is VehicleOwnership => r !== undefined);
    },
  })),
);
