'use client';

/**
 * Sales-deals store — lightweight Zustand store (NOT immer) for Deal state.
 *
 * Initialised from @dms/mocks/fixtures `deals` array.
 * Provides stage advancement, lazy reservation expiry, VIN-scoped selectors,
 * concurrent reservation guard (W3.1), deal-lost reason capture (W3.2), and
 * refund / cancellation flow (W3.3).
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §4 / SPEC-SALES-001 §12–14
 * W3 fixes: 2026-05-07
 */

import { create } from 'zustand';
import { deals as fixtureDeals } from '@dms/mocks/fixtures';
import type {
  Deal,
  DealStage,
  LostReason,
  LostReasonCategory,
  RefundBlock,
  RefundCategory,
} from '@dms/types';
import { isReservationConflictError } from '@dms/types';
import type { ReservationConflictError } from '@dms/types';

export { isReservationConflictError };

// ─── Typed errors (store-level, non-throwing variants) ────────────────────────

export interface MarkLostError {
  ok: false;
  error: 'MISSING_CATEGORY' | 'OTHER_REQUIRES_FREE_TEXT';
}

export interface RefundError {
  ok: false;
  error: 'UNAUTHORIZED' | 'INVALID_STAGE' | 'MISSING_REASON' | 'REASON_TOO_SHORT';
}

// ─── Audit event shape (in-memory mock) ──────────────────────────────────────

export interface SalesAuditEvent {
  kind: string;
  dealId: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
  emittedAt: string;
}

// ─── ROLE_RANK for sales module ───────────────────────────────────────────────
// Doc 14 §2.3; mirrors vehicles/state-machine.ts.

const SALES_ROLE_RANK: Record<string, number> = {
  R03: 0.5, // Receptionist
  R05: 1,   // Sales Associate
  R07: 2,   // Sales Advisor
  R09: 3,   // Sales Manager / Branch Manager
  R10: 3.5, // Senior Sales Manager
  R11: 3.8, // Accounts Exec
  R12: 4,   // Accounts Manager
  R13: 5,   // Parts Counter (irrelevant here, added for completeness)
  R19: 6,   // General Manager
  R22: 7,   // CFO
  R24: 8,   // CEO
};

function meetsRole(actorRole: string, minRole: string): boolean {
  return (SALES_ROLE_RANK[actorRole] ?? 0) >= (SALES_ROLE_RANK[minRole] ?? 999);
}

// ─── State & action shapes ────────────────────────────────────────────────────

interface SalesDealsState {
  deals: Record<string, Deal>; // keyed by id
  /** In-memory audit log (mock-phase only; real phase: server-side). */
  auditEvents: SalesAuditEvent[];
}

interface SalesDealsActions {
  /**
   * Seam 44: Test Drive → Sales Deals cross-module upsert.
   */
  upsertDealFromTestDrive(input: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    vehicleVin: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: number;
    outletId: string;
    city: string;
  }): Deal;

  /**
   * Create a lead deal from a service-upgrade trigger (B4 service-to-sale loop).
   */
  createLeadFromService(input: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    vehicleVin: string;
    vehicleName: string;
    outletId: string;
    city: string;
    sourceJobCardId: string;
  }): Deal;

  /**
   * Advance a deal to the given stage.
   * Optionally sets reservationExpiresAt + cancellationReason.
   *
   * W3.1: if next === 'reserved', throws ReservationConflictError if another
   * active reservation exists for the same VIN. To skip the guard (e.g. after
   * forceReserveOverride), pass opts.skipReservationGuard = true.
   *
   * Returns the updated Deal.
   */
  advanceStage(
    dealId: string,
    next: DealStage,
    opts?: {
      reservationExpiresAt?: string;
      cancellationReason?: Deal['cancellationReason'];
      skipReservationGuard?: boolean;
    },
  ): Deal;

  /**
   * Idempotent reservation expiry.
   * If stage === 'reserved', sets stage = 'lost' + cancellationReason = 'EXPIRED'.
   */
  markReservationExpired(dealId: string): Deal;

  /**
   * W3.1 — Check if another deal already holds an active reservation for VIN.
   * Returns true if ANY deal has:
   *   - vehicleVin === vin
   *   - stage === 'reserved'
   *   - (no expiry OR reservationExpiresAt > now)
   *   - id !== excludeDealId
   */
  hasActiveReservationForVin(vin: string, excludeDealId?: string): boolean;

  /**
   * W3.1 — Force-override an existing reservation (R19+ only).
   * Marks conflicting reservation as lost (cancellationReason = 'MANUAL_CANCEL')
   * with kind='OVERRIDDEN_BY_R19+', then advances dealId to 'reserved'.
   * Emits audit event.
   *
   * Throws if actorRole is not R19, R22, or R24.
   */
  forceReserveOverride(
    dealId: string,
    opts: {
      reason: string;
      actor: { id: string; name: string; role: string };
    },
  ): Deal;

  /**
   * W3.2 — Mark a deal as lost with a structured reason.
   * Returns MarkLostError on validation failure.
   * Emits audit event with category + freeText length (NOT the text itself).
   */
  markDealLost(
    dealId: string,
    lostReason: LostReason,
    actor: { id: string; name: string; role: string },
  ): Deal | MarkLostError;

  /**
   * W3.3 — Refund a deal. R12+ only. Stage must be 'sales-order' or 'delivered'.
   * Sets stage → 'refunded' + populates refund block.
   * Emits audit event with category + amount + reason length (NOT reason text).
   */
  refundDeal(
    dealId: string,
    refundDetails: {
      category: RefundCategory;
      reason: string;
      refundedAmount: number;
    },
    actor: { id: string; name: string; role: string },
  ): Deal | RefundError;

  /** All deals for a VIN (any stage). */
  selectDealsByVin(vin: string): Deal[];

  /** Active deals for a VIN: stage in ['reserved', 'sales-order', 'delivered']. */
  selectActiveDeals(vin: string): Deal[];
}

type SalesDealsStore = SalesDealsState & SalesDealsActions;

// ─── Initial state from fixtures ─────────────────────────────────────────────

function buildInitialDeals(): Record<string, Deal> {
  const map: Record<string, Deal> = {};
  for (const deal of fixtureDeals) {
    map[deal.id] = { ...deal };
  }
  return map;
}

// ─── Active stages set ────────────────────────────────────────────────────────

const ACTIVE_DEAL_STAGES: ReadonlySet<DealStage> = new Set([
  'reserved',
  'sales-order',
  'delivered',
]);

const REFUNDABLE_STAGES: ReadonlySet<DealStage> = new Set([
  'sales-order',
  'delivered',
]);

// ─── Stages that block upsert advancement ──────────────────────────────────

const NON_UPSERTABLE_STAGES: ReadonlySet<DealStage> = new Set([
  'lost',
  'delivered',
]);

const EARLY_STAGES: ReadonlySet<DealStage> = new Set(['new-lead', 'contacted']);

// ─── R19+ override roles ────────────────────────────────────────────────────

const R19_PLUS_ROLES = new Set(['R19', 'R22', 'R24']);
const R12_PLUS_MIN = 'R12';

// ─── ID counters for cross-module deal creation ───────────────────────────────

let _dealSeq = 1000;
function nextDealId(): string {
  return `td-${String(++_dealSeq)}`;
}

let _serviceLeadSeq = 2000;
function nextServiceLeadId(): string {
  return `srv-lead-${String(++_serviceLeadSeq)}`;
}

let _auditSeq = 0;
function nextAuditId(): string {
  return `audit-${String(++_auditSeq)}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSalesDealsStore = create<SalesDealsStore>()((set, get) => ({
  deals: buildInitialDeals(),
  auditEvents: [],

  upsertDealFromTestDrive(input) {
    const now = new Date().toISOString();

    const existing = Object.values(get().deals).find(
      (d) =>
        d.customerName === input.customerName &&
        d.vehicleVin === input.vehicleVin &&
        !NON_UPSERTABLE_STAGES.has(d.stage),
    );

    if (existing) {
      if (!EARLY_STAGES.has(existing.stage)) {
        return existing;
      }
      const advanced: Deal = {
        ...existing,
        stage: 'test-drive',
        lastActivityAt: now,
        daysInStage: 0,
      };
      set((state) => ({
        deals: { ...state.deals, [existing.id]: advanced },
      }));
      return advanced;
    }

    const newDeal: Deal = {
      id: nextDealId(),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      vehicleVin: input.vehicleVin,
      vehicleName: `${input.vehicleYear} ${input.vehicleMake} ${input.vehicleModel}`,
      amount: 0,
      stage: 'test-drive',
      source: 'walk-in',
      priority: 'medium',
      city: input.city,
      outlet: input.outletId,
      createdAt: now,
      lastActivityAt: now,
      daysInStage: 0,
    };

    set((state) => ({
      deals: { ...state.deals, [newDeal.id]: newDeal },
    }));
    return newDeal;
  },

  createLeadFromService(input) {
    const now = new Date().toISOString();

    const existing = Object.values(get().deals).find(
      (d) =>
        d.customerName === input.customerName &&
        d.vehicleVin === input.vehicleVin &&
        !NON_UPSERTABLE_STAGES.has(d.stage),
    );
    if (existing) return existing;

    const newDeal: Deal = {
      id: nextServiceLeadId(),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      vehicleVin: input.vehicleVin,
      vehicleName: input.vehicleName,
      amount: 0,
      stage: 'new-lead',
      source: 'walk-in',
      priority: 'medium',
      city: input.city,
      outlet: input.outletId,
      microStatus: `service-upgrade:${input.sourceJobCardId}`,
      createdAt: now,
      lastActivityAt: now,
      daysInStage: 0,
    };

    set((state) => ({
      deals: { ...state.deals, [newDeal.id]: newDeal },
    }));
    return newDeal;
  },

  advanceStage(dealId, next, opts) {
    const current = get().deals[dealId];
    if (!current) {
      throw new Error(`advanceStage: deal "${dealId}" not found`);
    }

    // W3.1 — Concurrent reservation guard (L_S-RES-1)
    if (next === 'reserved' && !opts?.skipReservationGuard) {
      const vin = current.vehicleVin;
      if (vin && get().hasActiveReservationForVin(vin, dealId)) {
        // Find conflicting deal for the error payload
        const conflicting = Object.values(get().deals).find(
          (d) =>
            d.vehicleVin === vin &&
            d.stage === 'reserved' &&
            d.id !== dealId &&
            (!d.reservationExpiresAt || new Date(d.reservationExpiresAt) > new Date()),
        );
        const conflictError: ReservationConflictError = {
          ok: false,
          error: 'VIN_ALREADY_RESERVED',
          conflictingDealId: conflicting?.id ?? '',
          conflictingCustomerName: conflicting?.customerName ?? 'Unknown',
        };
        throw conflictError;
      }
    }

    const updated: Deal = {
      ...current,
      stage: next,
      lastActivityAt: new Date().toISOString(),
      cancellationReason:
        opts?.cancellationReason ??
        (next !== 'lost' ? undefined : current.cancellationReason),
      reservationExpiresAt:
        opts?.reservationExpiresAt ??
        (next === 'reserved' ? current.reservationExpiresAt : undefined),
    };

    if (next === 'reserved' && opts?.reservationExpiresAt) {
      updated.reservationExpiresAt = opts.reservationExpiresAt;
    }

    set((state) => ({
      deals: { ...state.deals, [dealId]: updated },
    }));

    return updated;
  },

  markReservationExpired(dealId) {
    const current = get().deals[dealId];
    if (!current) {
      throw new Error(`markReservationExpired: deal "${dealId}" not found`);
    }

    if (current.stage !== 'reserved') {
      return current;
    }

    const updated: Deal = {
      ...current,
      stage: 'lost',
      cancellationReason: 'EXPIRED',
      lastActivityAt: new Date().toISOString(),
    };

    set((state) => ({
      deals: { ...state.deals, [dealId]: updated },
    }));

    return updated;
  },

  // W3.1 — selector (L_S-RES-1)
  hasActiveReservationForVin(vin, excludeDealId) {
    const now = new Date();
    return Object.values(get().deals).some(
      (d) =>
        d.vehicleVin === vin &&
        d.stage === 'reserved' &&
        d.id !== excludeDealId &&
        (!d.reservationExpiresAt || new Date(d.reservationExpiresAt) > now),
    );
  },

  // W3.1 — force override (R19+ only; L_S-RES-1)
  forceReserveOverride(dealId, opts) {
    if (!R19_PLUS_ROLES.has(opts.actor.role)) {
      throw new Error(
        `forceReserveOverride: UNAUTHORIZED — actor role ${opts.actor.role} is not R19+`,
      );
    }

    const targetDeal = get().deals[dealId];
    if (!targetDeal) {
      throw new Error(`forceReserveOverride: deal "${dealId}" not found`);
    }

    const vin = targetDeal.vehicleVin;
    const now = new Date().toISOString();

    // Release conflicting reservation(s)
    const conflicting = vin
      ? Object.values(get().deals).filter(
          (d) =>
            d.vehicleVin === vin &&
            d.stage === 'reserved' &&
            d.id !== dealId &&
            (!d.reservationExpiresAt || new Date(d.reservationExpiresAt) > new Date()),
        )
      : [];

    // Mutate all conflicting deals to lost + emit audit per conflict
    const updatedDeals: Record<string, Deal> = { ...get().deals };
    for (const conflict of conflicting) {
      updatedDeals[conflict.id] = {
        ...conflict,
        stage: 'lost',
        cancellationReason: 'MANUAL_CANCEL',
        lastActivityAt: now,
      };
    }

    // Advance the target deal to reserved (skip guard — we just cleared conflicts)
    const advanced: Deal = {
      ...targetDeal,
      stage: 'reserved',
      lastActivityAt: now,
      cancellationReason: undefined,
    };
    updatedDeals[dealId] = advanced;

    // Emit audit event
    const auditEvent: SalesAuditEvent = {
      kind: 'RESERVATION_FORCE_OVERRIDE',
      dealId,
      actorId: opts.actor.id,
      actorRole: opts.actor.role,
      payload: {
        reason: opts.reason,
        releasedDealIds: conflicting.map((c) => c.id),
        vin: vin ?? null,
      },
      emittedAt: now,
    };

    set((state) => ({
      deals: updatedDeals,
      auditEvents: [...state.auditEvents, auditEvent],
    }));

    return advanced;
  },

  // W3.2 — mark deal lost with structured reason (L_S-LOST-1)
  markDealLost(dealId, lostReason, actor) {
    // Validate
    if (!lostReason.category) {
      return { ok: false, error: 'MISSING_CATEGORY' } satisfies MarkLostError;
    }
    if (
      lostReason.category === 'OTHER' &&
      (!lostReason.freeText || lostReason.freeText.trim().length < 10)
    ) {
      return { ok: false, error: 'OTHER_REQUIRES_FREE_TEXT' } satisfies MarkLostError;
    }

    const current = get().deals[dealId];
    if (!current) {
      throw new Error(`markDealLost: deal "${dealId}" not found`);
    }

    const now = new Date().toISOString();
    const updated: Deal = {
      ...current,
      stage: 'lost',
      lastActivityAt: now,
      lostReason: {
        ...lostReason,
        capturedAt: now,
        capturedByEmployeeId: actor.id,
      },
    };

    // Audit event — freeText length for analytics; NOT the text itself (privacy)
    const auditEvent: SalesAuditEvent = {
      kind: 'deal_lost',
      dealId,
      actorId: actor.id,
      actorRole: actor.role,
      payload: {
        category: lostReason.category,
        freeTextLength: lostReason.freeText?.length ?? 0,
      },
      emittedAt: now,
    };

    set((state) => ({
      deals: { ...state.deals, [dealId]: updated },
      auditEvents: [...state.auditEvents, auditEvent],
    }));

    return updated;
  },

  // W3.3 — refund deal (R12+ only; L_S-REFUND-1)
  refundDeal(dealId, refundDetails, actor) {
    // Authorization check (R12+)
    if (!meetsRole(actor.role, R12_PLUS_MIN)) {
      return { ok: false, error: 'UNAUTHORIZED' } satisfies RefundError;
    }

    const current = get().deals[dealId];
    if (!current) {
      throw new Error(`refundDeal: deal "${dealId}" not found`);
    }

    // Stage guard
    if (!REFUNDABLE_STAGES.has(current.stage)) {
      return { ok: false, error: 'INVALID_STAGE' } satisfies RefundError;
    }

    // Reason validation
    if (!refundDetails.reason || refundDetails.reason.trim().length < 30) {
      return { ok: false, error: 'REASON_TOO_SHORT' } satisfies RefundError;
    }

    const now = new Date().toISOString();
    const refundBlock: RefundBlock = {
      category: refundDetails.category,
      reason: refundDetails.reason.trim(),
      refundedAmount: refundDetails.refundedAmount,
      refundedAt: now,
      refundedByEmployeeId: actor.id,
    };

    const updated: Deal = {
      ...current,
      stage: 'refunded',
      lastActivityAt: now,
      refund: refundBlock,
    };

    // Audit event — reason length + category; NOT the reason text (privacy)
    const auditEvent: SalesAuditEvent = {
      kind: 'deal_refunded',
      dealId,
      actorId: actor.id,
      actorRole: actor.role,
      payload: {
        category: refundDetails.category,
        refundedAmount: refundDetails.refundedAmount,
        reasonLength: refundDetails.reason.trim().length,
        priorStage: current.stage,
      },
      emittedAt: now,
    };

    set((state) => ({
      deals: { ...state.deals, [dealId]: updated },
      auditEvents: [...state.auditEvents, auditEvent],
    }));

    return updated;
  },

  selectDealsByVin(vin) {
    return Object.values(get().deals).filter((d) => d.vehicleVin === vin);
  },

  selectActiveDeals(vin) {
    return Object.values(get().deals).filter(
      (d) => d.vehicleVin === vin && ACTIVE_DEAL_STAGES.has(d.stage),
    );
  },
}));
