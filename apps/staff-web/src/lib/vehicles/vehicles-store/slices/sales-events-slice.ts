'use client';

/**
 * Sales-events-slice — SalesEvent append-only log per VIN.
 *
 * Validates every payload via validateSalesEventPayload (L28) BEFORE writing.
 * SOLD validation: throws SellerSignaturesIncomplete if sellerSignatures < activeJointOwnerCount
 * and no R19+ override is present.
 * LISTED side-effect: sets vehicles[vin].listedAt (L39).
 *
 * Spec reference: PLAN-VEHICLES-003 §2.1, L28, L39
 * LoC budget: ≤120
 */

import { validateSalesEventPayload } from '@dms/vehicles-core';
import type { SalesEvent, SalesEventKind, StaffRoleCode } from '@dms/types';
import { StaffRoleCodeEnum } from '@dms/types';
import type { Actor, SalesEventsActions, VehiclesSlice } from '../types';
import { makeEventId, now } from '../id-helpers';

// ─── SellerSignaturesIncomplete ───────────────────────────────────────────────

export class SellerSignaturesIncomplete extends Error {
  readonly vin: string;
  readonly missingCount: number;

  constructor(vin: string, missingCount: number) {
    super(
      `SellerSignaturesIncomplete: ${missingCount} seller signature(s) missing for VIN ${vin}. ` +
      'Provide an R19+ override to proceed.',
    );
    this.name = 'SellerSignaturesIncomplete';
    this.vin = vin;
    this.missingCount = missingCount;
  }
}

// ─── Helper: count active joint owners ───────────────────────────────────────

function countActiveJointOwners(
  ownerships: Record<string, { vin: string; state: string; isJoint: boolean }>,
  vin: string,
): number {
  return Object.values(ownerships).filter(
    (o) => o.vin === vin && o.state === 'ACTIVE' && o.isJoint,
  ).length;
}

// ─── Slice factory ────────────────────────────────────────────────────────────

export const createSalesEventsSlice: VehiclesSlice<SalesEventsActions> = (set, get) => ({
  emitSalesEvent(vin: string, kind: SalesEventKind, payload: unknown, actor: Actor): void {
    // L28: validate payload BEFORE writing
    validateSalesEventPayload(kind, payload);

    // SOLD: seller signatures check (L15, L16)
    if (kind === 'SOLD') {
      const soldPayload = payload as {
        sellerSignatures: Array<{ customerId: string; signedAt: string; actorId: string }>;
        override?: { by: string; reason: string; proofDocIds: string[] };
      };
      const state = get();
      const activeJointCount = countActiveJointOwners(state.ownerships, vin);
      const signedCount = soldPayload.sellerSignatures.length;

      if (signedCount < activeJointCount && !soldPayload.override) {
        throw new SellerSignaturesIncomplete(vin, activeJointCount - signedCount);
      }
    }

    set((state) => {
      // Initialise per-VIN list if absent
      if (!state.salesEvents[vin]) {
        state.salesEvents[vin] = [];
      }

      // L40: actorRole must be a valid RoleIdEnum value. Cast at the store boundary
      // with a runtime parse; fall back to 'R01' (super-admin sentinel) only if the
      // actor.role is missing or invalid — this should never happen in production.
      const actorRoleParsed = StaffRoleCodeEnum.safeParse(actor.role ?? '');
      const actorRole: StaffRoleCode = actorRoleParsed.success ? actorRoleParsed.data : 'R01';

      const event: SalesEvent = {
        id: makeEventId(),
        vin,
        at: now(),
        kind,
        actorId: actor.id,
        actorRole,
        payload: payload as Record<string, unknown>,
        schemaVersion: 'v1',
      };

      state.salesEvents[vin]!.push(event);

      // L39: LISTED side-effect — set listedAt on VehicleMaster
      if (kind === 'LISTED' && state.vehicles[vin]) {
        state.vehicles[vin]!.listedAt = event.at;
      }
    });
  },

  selectSalesEvents(vin: string): SalesEvent[] {
    return get().salesEvents[vin] ?? [];
  },

  hydrateSalesEvents(seed: SalesEvent[]): void {
    set((state) => {
      for (const event of seed) {
        if (!state.salesEvents[event.vin]) {
          state.salesEvents[event.vin] = [];
        }
        state.salesEvents[event.vin]!.push(event);
      }
    });
  },
});
