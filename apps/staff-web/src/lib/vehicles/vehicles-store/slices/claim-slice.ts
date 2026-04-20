/**
 * Claim-slice — OwnershipClaim queue mutations.
 *
 * This slice is PURE — it imports nothing from other slices or stores.
 * Cross-store reads (salesOrders, jobCards) live in the UI layer.
 * Auto-match is pre-computed by computeAutoMatch() in @dms/vehicles-core and
 * passed as a boolean flag into submitClaim (D9, §7.3).
 *
 * §7.2 Overlap approval: approveClaim runs as a single immer transaction —
 * closes all ACTIVE rows on the VIN, opens new row for claimant.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.3 (claim-slice) + §7.2 + §7.3
 */

import { normalizeVin } from '@dms/vehicles-core';
import type { ClaimActions, VehiclesSlice } from '../types';
import { makeClaimId, makeEventId, makeOwnershipId, now, addDays, addPiiRetentionDays } from '../id-helpers';
import { indexClaimByVin, indexOwnershipByVin, indexOwnershipByCustomer } from '../index-maintenance';
import type { OwnershipClaim, VehicleOwnership } from '@dms/types';

const GRACE_DAYS = 7;

export const createClaimSlice: VehiclesSlice<ClaimActions> = (set) => ({
  submitClaim(input, actor) {
    const vin = normalizeVin(input.vin);
    let resultClaimId = '';
    let autoApproved = false;
    let overlapsClaimId: string | undefined;
    let overlapsOwnershipId: string | undefined;
    let duplicate = false;

    set((state) => {
      // ── Duplicate guard: same (vin, claimantCustomerId) already PENDING ──────
      const vinClaimIds = state.claimIdByVin[vin] ?? [];
      const existingPending = vinClaimIds
        .map((id) => state.claims[id])
        .find(
          (c): c is OwnershipClaim =>
            c !== undefined &&
            c.vin === vin &&
            c.claimantCustomerId === input.claimantCustomerId &&
            c.state === 'PENDING',
        );

      if (existingPending) {
        resultClaimId = existingPending.id;
        duplicate = true;
        return; // No new row created
      }

      // ── Detect overlaps ───────────────────────────────────────────────────
      const vinIds = state.ownershipIdByVin[vin] ?? [];
      const activeOwnership = vinIds
        .map((id) => state.ownerships[id])
        .find((r): r is VehicleOwnership => r?.state === 'ACTIVE');

      if (activeOwnership) overlapsOwnershipId = activeOwnership.id;

      const otherPending = vinClaimIds
        .map((id) => state.claims[id])
        .find(
          (c): c is OwnershipClaim =>
            c !== undefined &&
            c.state === 'PENDING' &&
            c.claimantCustomerId !== input.claimantCustomerId,
        );
      if (otherPending) overlapsClaimId = otherPending.id;

      // ── Create claim row ──────────────────────────────────────────────────
      const claimId = makeClaimId();
      const submitAt = now();

      const claim: OwnershipClaim = {
        id: claimId,
        vin,
        claimantCustomerId: input.claimantCustomerId,
        submittedAt: submitAt,
        rcScanUrl: input.rcScanUrl,
        identityProofScanUrl: input.identityProofScanUrl,
        autoMatchHit: input.autoMatchHit,
        matchedEntityId: input.matchedEntityId,
        state: input.autoMatchHit ? 'AUTO_APPROVED' : 'PENDING',
        overlapsClaimId,
        overlapsOwnershipId,
        schemaVersion: 'v1',
      };
      state.claims[claimId] = claim;
      indexClaimByVin(state, vin, claimId);

      // ── Emit CLAIM_SUBMIT ─────────────────────────────────────────────────
      state.events.push({
        id: makeEventId(),
        vin,
        at: submitAt,
        kind: 'CLAIM_SUBMIT',
        actorId: actor.id,
        actorRole: actor.role ?? 'PORTAL',
        claimId,
        payload: {
          claimantCustomerId: input.claimantCustomerId,
          autoMatchHit: input.autoMatchHit,
          overlapsOwnershipId,
          overlapsClaimId,
        },
        schemaVersion: 'v1',
      });

      // ── Auto-approve path: immediately open ownership ─────────────────────
      if (input.autoMatchHit) {
        // Close all ACTIVE rows (overlap approval — §7.2)
        const activeRows = vinIds
          .map((id) => state.ownerships[id])
          .filter((r): r is VehicleOwnership => r?.state === 'ACTIVE');

        const approveAt = now();
        for (const row of activeRows) {
          row.state = 'REVOKED';
          row.toAt = approveAt;
          row.closeReason = 'CLAIM_OVERLAP';
          row.closedBy = actor.id;
          row.closedAt = approveAt;
          row.graceUntilAt = addDays(approveAt, GRACE_DAYS);
          row.piiRetentionUntil = addPiiRetentionDays(approveAt);
        }

        // Open new ACTIVE row for claimant
        const vehicle = state.vehicles[vin];
        const newOwnershipId = makeOwnershipId();
        const newRow: VehicleOwnership = {
          id: newOwnershipId,
          vin,
          customerId: input.claimantCustomerId,
          source: 'BN_SALE',
          state: 'ACTIVE',
          isJoint: false,
          fromAt: approveAt,
          kmAtOpen: vehicle?.lastKnownKm ?? 0,
          kmStale: false,
          createdBy: actor.id,
          createdAt: approveAt,
          schemaVersion: 'v1',
        };
        state.ownerships[newOwnershipId] = newRow;
        indexOwnershipByVin(state, vin, newOwnershipId);
        indexOwnershipByCustomer(state, input.claimantCustomerId, newOwnershipId);

        // Update claim state to AUTO_APPROVED + mark decided
        claim.decidedBy = actor.id;
        claim.decidedAt = approveAt;

        state.events.push({
          id: makeEventId(),
          vin,
          at: approveAt,
          kind: 'CLAIM_APPROVE',
          actorId: actor.id,
          actorRole: actor.role ?? 'PORTAL',
          claimId,
          ownershipId: newOwnershipId,
          payload: { autoApproved: true },
          schemaVersion: 'v1',
        });

        autoApproved = true;
      }

      resultClaimId = claimId;
    });

    return {
      claimId: resultClaimId,
      autoApproved,
      overlapsClaimId,
      overlapsOwnershipId,
      duplicate: duplicate || undefined,
    };
  },

  approveClaim(claimId, actor) {
    const ownershipIds: string[] = [];

    set((state) => {
      const claim = state.claims[claimId];
      if (!claim || claim.state !== 'PENDING') return;

      const vin = claim.vin;
      const approveAt = now();

      // §7.2 — single immer transaction: close all ACTIVE rows + open new
      const vinIds = state.ownershipIdByVin[vin] ?? [];
      const activeRows = vinIds
        .map((id) => state.ownerships[id])
        .filter((r): r is VehicleOwnership => r?.state === 'ACTIVE');

      for (const row of activeRows) {
        row.state = 'REVOKED';
        row.toAt = approveAt;
        row.closeReason = 'CLAIM_OVERLAP';
        row.closedBy = actor.id;
        row.closedAt = approveAt;
        row.graceUntilAt = addDays(approveAt, GRACE_DAYS);
        row.piiRetentionUntil = addPiiRetentionDays(approveAt);

        state.events.push({
          id: makeEventId(),
          vin,
          at: approveAt,
          kind: 'CLOSE',
          actorId: actor.id,
          actorRole: actor.role ?? 'R09',
          ownershipId: row.id,
          payload: { reason: 'CLAIM_OVERLAP', graceUntilAt: row.graceUntilAt },
          schemaVersion: 'v1',
        });
      }

      // Open new ACTIVE row
      const vehicle = state.vehicles[vin];
      const newOwnershipId = makeOwnershipId();
      const newRow: VehicleOwnership = {
        id: newOwnershipId,
        vin,
        customerId: claim.claimantCustomerId,
        source: 'BN_SALE',
        state: 'ACTIVE',
        isJoint: false,
        fromAt: approveAt,
        kmAtOpen: vehicle?.lastKnownKm ?? 0,
        kmStale: false,
        createdBy: actor.id,
        createdAt: approveAt,
        schemaVersion: 'v1',
      };
      state.ownerships[newOwnershipId] = newRow;
      indexOwnershipByVin(state, vin, newOwnershipId);
      indexOwnershipByCustomer(state, claim.claimantCustomerId, newOwnershipId);
      ownershipIds.push(newOwnershipId);

      // Update claim
      claim.state = 'APPROVED';
      claim.decidedBy = actor.id;
      claim.decidedAt = approveAt;

      state.events.push({
        id: makeEventId(),
        vin,
        at: approveAt,
        kind: 'CLAIM_APPROVE',
        actorId: actor.id,
        actorRole: actor.role ?? 'R09',
        claimId,
        ownershipId: newOwnershipId,
        payload: { overlapsCount: activeRows.length },
        schemaVersion: 'v1',
      });
    });

    return { ownershipIds };
  },

  rejectClaim(claimId, category, actor) {
    set((state) => {
      const claim = state.claims[claimId];
      if (!claim) return;

      const rejectAt = now();
      claim.state = 'REJECTED';
      claim.decidedBy = actor.id;
      claim.decidedAt = rejectAt;
      claim.rejectionReasonCategory = category;

      state.events.push({
        id: makeEventId(),
        vin: claim.vin,
        at: rejectAt,
        kind: 'CLAIM_REJECT',
        actorId: actor.id,
        actorRole: actor.role ?? 'R09',
        claimId,
        payload: { category },
        schemaVersion: 'v1',
      });
    });
  },
});
