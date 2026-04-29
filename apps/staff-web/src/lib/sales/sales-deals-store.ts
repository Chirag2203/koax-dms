'use client';

/**
 * Sales-deals store — lightweight Zustand store (NOT immer) for Deal state.
 *
 * Initialised from @dms/mocks/fixtures `deals` array.
 * Provides stage advancement, lazy reservation expiry, and VIN-scoped selectors.
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §4
 * LoC budget: ≤140
 */

import { create } from 'zustand';
import { deals as fixtureDeals } from '@dms/mocks/fixtures';
import type { Deal, DealStage } from '@dms/types';

// ─── State & action shapes ────────────────────────────────────────────────────

interface SalesDealsState {
  deals: Record<string, Deal>; // keyed by id
}

interface SalesDealsActions {
  /**
   * Advance a deal to the given stage.
   * Optionally sets reservationExpiresAt + cancellationReason.
   * Returns the updated Deal.
   */
  advanceStage(
    dealId: string,
    next: DealStage,
    opts?: {
      reservationExpiresAt?: string;
      cancellationReason?: Deal['cancellationReason'];
    },
  ): Deal;

  /**
   * Idempotent reservation expiry.
   * If stage === 'reserved', sets stage = 'lost' + cancellationReason = 'EXPIRED'.
   * Subsequent calls on an already-expired deal are no-ops.
   * Returns the (possibly updated) Deal.
   */
  markReservationExpired(dealId: string): Deal;

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

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSalesDealsStore = create<SalesDealsStore>()((set, get) => ({
  deals: buildInitialDeals(),

  advanceStage(dealId, next, opts) {
    const current = get().deals[dealId];
    if (!current) {
      throw new Error(`advanceStage: deal "${dealId}" not found`);
    }

    const updated: Deal = {
      ...current,
      stage: next,
      lastActivityAt: new Date().toISOString(),
      cancellationReason: opts?.cancellationReason ?? (next !== 'lost' ? undefined : current.cancellationReason),
      reservationExpiresAt: opts?.reservationExpiresAt ?? (next === 'reserved' ? current.reservationExpiresAt : undefined),
    };

    // Apply reservationExpiresAt when advancing to reserved
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

    // Idempotency: already expired (or not reserved) — no-op
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

  selectDealsByVin(vin) {
    return Object.values(get().deals).filter((d) => d.vehicleVin === vin);
  },

  selectActiveDeals(vin) {
    return Object.values(get().deals).filter(
      (d) => d.vehicleVin === vin && ACTIVE_DEAL_STAGES.has(d.stage),
    );
  },
}));
