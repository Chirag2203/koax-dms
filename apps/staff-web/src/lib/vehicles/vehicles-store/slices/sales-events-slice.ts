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

// ─── InsufficientRoleError (SPEC-INVENTORY-AGING-001 L6) ─────────────────────

export class InsufficientRoleError extends Error {
  readonly vin: string;
  readonly actorRole: string;

  constructor(vin: string, actorRole: string) {
    super(
      `InsufficientRoleError: actor role ${actorRole} is below R10 — cannot apply suggested price drop for VIN ${vin}. ` +
      'Requires R10, R11, R12, R19, R22, or R24.',
    );
    this.name = 'InsufficientRoleError';
    this.vin = vin;
    this.actorRole = actorRole;
  }
}

// Roles allowed to apply a suggested price drop (SPEC-INVENTORY-AGING-001 L6)
const PRICE_DROP_ALLOWED_ROLES = new Set([
  'R10', 'R11', 'R12', 'R19', 'R22', 'R24',
]);

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

    // ── LISTED guard: Seam 40 (SPEC-SHOOTS-001 L2) ───────────────────────────
    // The ≥10 photos + ≥1 video threshold guard is enforced at the UI call site
    // via assertShootComplete() before emitSalesEvent is called. This keeps the
    // slice pure (no cross-store imports per ARCH-CROSS-MODULE-001 invariant #2).
    // The UI layer MUST call assertShootComplete(vin) before emitting LISTED.
    // See: apps/staff-web/src/lib/shoots/shoots-listed-guard.ts (Seam 40).

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

  // SPEC-INVENTORY-AGING-001 L6, L11
  applySuggestedPriceDrop(vin: string, newPrice: number, reason: string, actor: Actor): void {
    // L6: R10+ gate — throws InsufficientRoleError if below threshold
    const actorRole = actor.role ?? '';
    if (!PRICE_DROP_ALLOWED_ROLES.has(actorRole)) {
      throw new InsufficientRoleError(vin, actorRole);
    }

    // Derive previous price from LISTED + PRICE_CHANGED event stream
    // (VehicleMaster has no price field — price lives in the event stream)
    const state = get();
    const vinEvents = state.salesEvents[vin] ?? [];
    let previousPrice = 0;
    for (const ev of vinEvents) {
      if (ev.kind === 'LISTED') {
        const p = ev.payload as { listPrice?: number };
        previousPrice = p.listPrice ?? 0;
      } else if (ev.kind === 'PRICE_CHANGED') {
        const p = ev.payload as { toPrice?: number };
        if (p.toPrice != null) previousPrice = p.toPrice;
      }
    }

    // L11: emit PRICE_CHANGED with source = 'AGING_SUGGESTION'
    // Payload uses fromPrice/toPrice (schema canonical names from validateSalesEventPayload).
    // Extra fields (reason, source) are pass-through metadata the schema allows via .passthrough().
    // Delegates to existing emitSalesEvent for validation + append (L28)
    get().emitSalesEvent(
      vin,
      'PRICE_CHANGED',
      {
        fromPrice: previousPrice,
        toPrice: newPrice,
        reason,
        source: 'AGING_SUGGESTION',
      },
      actor,
    );
  },
});
