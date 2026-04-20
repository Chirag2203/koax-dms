/**
 * Ownership PII/lifecycle slice.
 *
 * Handles DPDP compliance actions (forceRevoke, anonymizeRow, scheduleAnonymization,
 * runAnonymizationSweep) and Form 31 deceased transfer.
 *
 * D15: anonymizeRow is production-safe (replaces customerId with anon-N, emits ANONYMIZE).
 *      runAnonymizationSweep is the dev-only walker.
 *      forceRevoke calls anonymize logic inline (no grace, no retention).
 *
 * Spec reference: SPEC-VEHICLES-001 §3.3 (ownership-slice PII actions), D15
 */

import { normalizeVin } from '@dms/vehicles-core';
import type { VehiclesSlice } from '../types';
import type { Actor } from '../types';
import {
  makeOwnershipId,
  makeEventId,
  now,
  addPiiRetentionDays,
  nextAnonSentinel,
} from '../id-helpers';
import { indexOwnershipByVin, indexOwnershipByCustomer } from '../index-maintenance';
import type { VehicleOwnership } from '@dms/types';

type PiiOwnershipActions = {
  forceRevoke: (id: string, reason: 'ERASURE_REQUEST', actor: Actor) => void;
  approveForm31Transfer: (
    vin: string,
    heirCustomerId: string,
    scanUrl: string,
    actor: Actor,
  ) => void;
  anonymizeRow: (id: string, actor: Actor) => void;
  scheduleAnonymization: (id: string) => void;
  runAnonymizationSweep: (sweepNow: string) => void;
};

export const createOwnershipPiiSlice: VehiclesSlice<PiiOwnershipActions> = (set) => ({
  forceRevoke(id, _reason, actor) {
    // R19+ DPDP erasure: immediate revoke + anonymize, no grace, no 7-yr retention
    set((state) => {
      const row = state.ownerships[id];
      if (!row) return;
      const closeAt = now();
      row.state = 'REVOKED';
      row.toAt = closeAt;
      row.closeReason = 'ERASURE_REQUEST';
      row.closedBy = actor.id;
      row.closedAt = closeAt;
      // piiRetentionUntil = now (already due — bypasses 7-yr rule per §7.4)
      row.piiRetentionUntil = closeAt;
      // Inline anonymize
      const sentinel = nextAnonSentinel();
      row.customerId = sentinel;

      state.events.push({
        id: makeEventId(), vin: row.vin, at: closeAt, kind: 'ANONYMIZE',
        actorId: actor.id, actorRole: actor.role ?? 'R19', ownershipId: id,
        payload: { anonSentinel: sentinel, reason: 'ERASURE_REQUEST' },
        schemaVersion: 'v1',
      });
    });
  },

  approveForm31Transfer(vin, heirCustomerId, _scanUrl, actor) {
    const normalizedVin = normalizeVin(vin);
    set((state) => {
      const vehicle = state.vehicles[normalizedVin];
      if (!vehicle) return;

      const vinIds = state.ownershipIdByVin[normalizedVin] ?? [];
      const activeRows = vinIds
        .map((id) => state.ownerships[id])
        .filter((r): r is VehicleOwnership => r?.state === 'ACTIVE');

      const transferAt = now();
      for (const row of activeRows) {
        row.state = 'TRANSFERRED';
        row.toAt = transferAt;
        row.closeReason = 'DECEASED_FORM31';
        row.closedBy = actor.id;
        row.closedAt = transferAt;
        row.piiRetentionUntil = addPiiRetentionDays(transferAt);
      }

      const newId = makeOwnershipId();
      state.ownerships[newId] = {
        id: newId, vin: normalizedVin, customerId: heirCustomerId,
        source: 'LEGACY_IMPORT', state: 'ACTIVE', isJoint: false,
        fromAt: transferAt, kmAtOpen: vehicle.lastKnownKm, kmStale: false,
        createdBy: actor.id, createdAt: transferAt, schemaVersion: 'v1',
      };
      indexOwnershipByVin(state, normalizedVin, newId);
      indexOwnershipByCustomer(state, heirCustomerId, newId);

      state.events.push({
        id: makeEventId(), vin: normalizedVin, at: transferAt, kind: 'FORM31_APPROVE',
        actorId: actor.id, actorRole: actor.role ?? 'R12', ownershipId: newId,
        payload: { heirCustomerId }, schemaVersion: 'v1',
      });
    });
  },

  anonymizeRow(id, actor) {
    set((state) => {
      const row = state.ownerships[id];
      if (!row) return;
      const sentinel = nextAnonSentinel();
      row.customerId = sentinel;
      state.events.push({
        id: makeEventId(), vin: row.vin, at: now(), kind: 'ANONYMIZE',
        actorId: actor.id, actorRole: actor.role ?? 'SYSTEM', ownershipId: id,
        payload: { anonSentinel: sentinel }, schemaVersion: 'v1',
      });
    });
  },

  scheduleAnonymization(id) {
    set((state) => {
      const row = state.ownerships[id];
      if (!row || !row.toAt) return;
      row.piiRetentionUntil = addPiiRetentionDays(row.toAt);
    });
  },

  runAnonymizationSweep(sweepNow) {
    // Dev-only walker — called from dev-tools panel by R24 only
    set((state) => {
      const nowMs = new Date(sweepNow).getTime();
      for (const [id, row] of Object.entries(state.ownerships)) {
        if (
          row.piiRetentionUntil &&
          new Date(row.piiRetentionUntil).getTime() <= nowMs &&
          !row.customerId.startsWith('anon-')
        ) {
          const sentinel = nextAnonSentinel();
          row.customerId = sentinel;
          state.events.push({
            id: makeEventId(), vin: row.vin, at: sweepNow, kind: 'ANONYMIZE',
            actorId: 'system', actorRole: 'R24', ownershipId: id,
            payload: { anonSentinel: sentinel, sweep: true }, schemaVersion: 'v1',
          });
        }
      }
    });
  },
});
