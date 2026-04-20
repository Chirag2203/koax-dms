/**
 * Ownership-slice — core VehicleOwnership ledger mutations.
 *
 * Critical correctness constraints (spec §3.3 + reviewer notes):
 * 1. ALL state reads inside set((state) => {...}) — never getState() inside actions.
 * 2. transferOwnership is a single immer transaction — discovers ACTIVE rows and
 *    closes + opens atomically. No partial commits possible.
 * 4. selfRevoke affects only the actor's own row (D16 — joint peer untouched).
 * 5. restoreOwnership emits RESTORE event with { priorCloseReason } in payload.
 *
 * PII/anonymization actions (forceRevoke, anonymizeRow, scheduleAnonymization,
 * runAnonymizationSweep, approveForm31Transfer) live in ownership-pii-slice.ts.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.3 (ownership-slice actions)
 */

import { normalizeVin } from '@dms/vehicles-core';
import type { OwnershipActions, VehiclesSlice } from '../types';
import { makeOwnershipId, makeEventId, now, addDays, addPiiRetentionDays } from '../id-helpers';
import { indexOwnershipByVin, indexOwnershipByCustomer } from '../index-maintenance';
import type { VehicleOwnership } from '@dms/types';

const GRACE_DAYS = 7;

type CoreOwnershipActions = Pick<
  OwnershipActions,
  | 'openOwnership'
  | 'closeOwnership'
  | 'transferOwnership'
  | 'manualRevoke'
  | 'selfRevoke'
  | 'restoreOwnership'
  | 'addJointOwner'
>;

export const createOwnershipSlice: VehiclesSlice<CoreOwnershipActions> = (set) => ({
  openOwnership(input, actor) {
    const vin = normalizeVin(input.vin);
    let ownershipId = '';

    set((state) => {
      // Precondition: VIN must exist
      if (!state.vehicles[vin]) return;

      // Precondition: no ACTIVE row unless both isJoint:true AND total ≤ 2
      const existingIds = state.ownershipIdByVin[vin] ?? [];
      const activeRows = existingIds
        .map((id) => state.ownerships[id])
        .filter((r): r is VehicleOwnership => r?.state === 'ACTIVE');

      if (activeRows.length >= 1) {
        const allJoint = activeRows.every((r) => r.isJoint) && (input.isJoint === true);
        if (!allJoint || activeRows.length >= 2) return;
      }

      const id = makeOwnershipId();
      const fromAt = input.fromAt ?? now();
      const row: VehicleOwnership = {
        id,
        vin,
        customerId: input.customerId,
        source: input.source,
        state: 'ACTIVE',
        isJoint: input.isJoint ?? false,
        fromAt,
        kmAtOpen: input.kmAtOpen,
        kmStale: false,
        linkedSalesOrderId: input.linkedSalesOrderId,
        linkedJobCardId: input.linkedJobCardId,
        createdBy: actor.id,
        createdAt: now(),
        schemaVersion: 'v1',
      };
      state.ownerships[id] = row;
      indexOwnershipByVin(state, vin, id);
      indexOwnershipByCustomer(state, input.customerId, id);

      state.events.push({
        id: makeEventId(),
        vin,
        at: fromAt,
        kind: 'OPEN',
        actorId: actor.id,
        actorRole: actor.role ?? 'UNKNOWN',
        ownershipId: id,
        payload: { source: input.source, kmAtOpen: input.kmAtOpen, isJoint: row.isJoint },
        schemaVersion: 'v1',
      });

      ownershipId = id;
    });

    return ownershipId;
  },

  closeOwnership(id, opts, actor) {
    set((state) => {
      const row = state.ownerships[id];
      if (!row) return;
      const closeAt = opts.toAt ?? now();
      const newState = opts.reason === 'BN_SALE_TRANSFER' ? 'TRANSFERRED' : 'REVOKED';

      row.state = newState;
      row.toAt = closeAt;
      row.closeReason = opts.reason;
      row.closedBy = actor.id;
      row.closedAt = now();
      if (opts.kmAtClose !== undefined) row.kmAtClose = opts.kmAtClose;
      if (newState === 'REVOKED') row.graceUntilAt = addDays(closeAt, GRACE_DAYS);
      row.piiRetentionUntil = addPiiRetentionDays(closeAt);

      state.events.push({
        id: makeEventId(),
        vin: row.vin,
        at: closeAt,
        kind: 'CLOSE',
        actorId: actor.id,
        actorRole: actor.role ?? 'UNKNOWN',
        ownershipId: id,
        payload: {
          reason: opts.reason,
          kmAtClose: opts.kmAtClose,
          ...(newState === 'REVOKED' ? { graceUntilAt: row.graceUntilAt } : {}),
        },
        schemaVersion: 'v1',
      });
    });
  },

  transferOwnership(input, actor) {
    const vin = normalizeVin(input.vin);
    let closedIds: string[] = [];
    let openedIds: string[] = [];

    set((state) => {
      // All state reads inside set() — never getState()
      const vehicle = state.vehicles[vin];
      if (!vehicle) return;

      const existingIds = state.ownershipIdByVin[vin] ?? [];
      const activeRows = existingIds
        .map((id) => state.ownerships[id])
        .filter((r): r is VehicleOwnership => r?.state === 'ACTIVE');

      const transferAt = now();
      const localClosedIds: string[] = [];
      for (const row of activeRows) {
        row.state = 'TRANSFERRED';
        row.toAt = transferAt;
        row.closeReason = 'BN_SALE_TRANSFER';
        row.closedBy = actor.id;
        row.closedAt = transferAt;
        row.kmAtClose = input.kmAtClose;
        row.piiRetentionUntil = addPiiRetentionDays(transferAt);
        localClosedIds.push(row.id);

        state.events.push({
          id: makeEventId(), vin, at: transferAt, kind: 'CLOSE',
          actorId: actor.id, actorRole: actor.role ?? 'UNKNOWN',
          ownershipId: row.id,
          payload: { reason: 'BN_SALE_TRANSFER', kmAtClose: input.kmAtClose },
          schemaVersion: 'v1',
        });
      }

      const localOpenedIds: string[] = [];
      function openRow(customerId: string, isJoint: boolean): string {
        const newId = makeOwnershipId();
        state.ownerships[newId] = {
          id: newId, vin, customerId, source: input.source, state: 'ACTIVE',
          isJoint, fromAt: transferAt, kmAtOpen: input.kmAtOpen, kmStale: false,
          linkedSalesOrderId: input.linkedSalesOrderId,
          createdBy: actor.id, createdAt: transferAt, schemaVersion: 'v1',
        };
        indexOwnershipByVin(state, vin, newId);
        indexOwnershipByCustomer(state, customerId, newId);
        state.events.push({
          id: makeEventId(), vin, at: transferAt, kind: 'OPEN',
          actorId: actor.id, actorRole: actor.role ?? 'UNKNOWN',
          ownershipId: newId,
          payload: { source: input.source, kmAtOpen: input.kmAtOpen, isJoint },
          schemaVersion: 'v1',
        });
        return newId;
      }

      const isJoint = input.joint !== undefined;
      localOpenedIds.push(openRow(input.toCustomerId, isJoint));
      if (input.joint) localOpenedIds.push(openRow(input.joint.withCustomerId, true));

      state.events.push({
        id: makeEventId(), vin, at: transferAt, kind: 'TRANSFER',
        actorId: actor.id, actorRole: actor.role ?? 'UNKNOWN',
        payload: { closedIds: localClosedIds, openedIds: localOpenedIds, joint: isJoint },
        schemaVersion: 'v1',
      });

      if (input.kmAtClose > vehicle.lastKnownKm) {
        vehicle.lastKnownKm = input.kmAtClose;
        vehicle.lastKnownKmAt = transferAt;
      }

      closedIds = localClosedIds;
      openedIds = localOpenedIds;
    });

    return { closedIds, openedIds };
  },

  manualRevoke(id, reason, actor) {
    set((state) => {
      const row = state.ownerships[id];
      if (!row || row.state !== 'ACTIVE') return;
      const closeAt = now();
      row.state = 'REVOKED';
      row.toAt = closeAt;
      row.closeReason = reason;
      row.closedBy = actor.id;
      row.closedAt = closeAt;
      row.graceUntilAt = addDays(closeAt, GRACE_DAYS);
      row.piiRetentionUntil = addPiiRetentionDays(closeAt);
      state.events.push({
        id: makeEventId(), vin: row.vin, at: closeAt, kind: 'CLOSE',
        actorId: actor.id, actorRole: actor.role ?? 'R09', ownershipId: id,
        payload: { reason, graceUntilAt: row.graceUntilAt }, schemaVersion: 'v1',
      });
    });
  },

  selfRevoke(id, reason, actor, _options) {
    // D16: only this row is affected — joint peer untouched
    set((state) => {
      const row = state.ownerships[id];
      if (!row || row.state !== 'ACTIVE') return;
      const closeAt = now();
      row.state = 'REVOKED';
      row.toAt = closeAt;
      row.closeReason = reason;
      row.closedBy = actor.id;
      row.closedAt = closeAt;
      row.graceUntilAt = addDays(closeAt, GRACE_DAYS);
      row.piiRetentionUntil = addPiiRetentionDays(closeAt);
      state.events.push({
        id: makeEventId(), vin: row.vin, at: closeAt, kind: 'CLOSE',
        actorId: actor.id, actorRole: actor.role ?? 'PORTAL', ownershipId: id,
        payload: { reason, graceUntilAt: row.graceUntilAt }, schemaVersion: 'v1',
      });
    });
  },

  restoreOwnership(id, reason, actor) {
    set((state) => {
      const row = state.ownerships[id];
      if (!row || row.state !== 'REVOKED') return;
      const priorCloseReason = row.closeReason;
      row.state = 'ACTIVE';
      row.toAt = undefined;
      row.graceUntilAt = undefined;
      row.closeReason = undefined;
      row.closedBy = undefined;
      row.closedAt = undefined;
      row.piiRetentionUntil = undefined;
      state.events.push({
        id: makeEventId(), vin: row.vin, at: now(), kind: 'RESTORE',
        actorId: actor.id, actorRole: actor.role ?? 'R09', ownershipId: id,
        payload: { priorCloseReason, reason }, schemaVersion: 'v1',
      });
    });
  },

  addJointOwner(existingId, newCustomerId, actor) {
    set((state) => {
      const existing = state.ownerships[existingId];
      if (!existing || existing.state !== 'ACTIVE') return;
      const vinIds = state.ownershipIdByVin[existing.vin] ?? [];
      const activeCount = vinIds.filter((id) => state.ownerships[id]?.state === 'ACTIVE').length;
      if (activeCount >= 2) return;
      existing.isJoint = true;
      const newId = makeOwnershipId();
      const vehicle = state.vehicles[existing.vin];
      state.ownerships[newId] = {
        id: newId, vin: existing.vin, customerId: newCustomerId,
        source: existing.source, state: 'ACTIVE', isJoint: true,
        fromAt: now(), kmAtOpen: vehicle?.lastKnownKm ?? existing.kmAtOpen,
        kmStale: false, linkedSalesOrderId: existing.linkedSalesOrderId,
        createdBy: actor.id, createdAt: now(), schemaVersion: 'v1',
      };
      indexOwnershipByVin(state, existing.vin, newId);
      indexOwnershipByCustomer(state, newCustomerId, newId);
      state.events.push({
        id: makeEventId(), vin: existing.vin, at: now(), kind: 'JOINT_ADD',
        actorId: actor.id, actorRole: actor.role ?? 'R09', ownershipId: newId,
        payload: { peerId: existingId, newCustomerId }, schemaVersion: 'v1',
      });
    });
  },
});
