/**
 * deriveSalesEvent — pure function mapping Deal stage transitions to SalesEvents.
 *
 * No store access. Called in page/component handlers after advanceStage().
 * Returns null when no SalesEvent should be emitted for a given transition.
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §5
 * LoC budget: ≤120
 */

import type { Deal, DealStage, SalesEventKind } from '@dms/types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function addHours(isoStr: string, h: number): string {
  const d = new Date(isoStr);
  d.setTime(d.getTime() + h * 60 * 60 * 1000);
  return d.toISOString();
}

// ─── Stages that are "before reserved" ───────────────────────────────────────

const PRE_RESERVED_STAGES: ReadonlySet<DealStage> = new Set([
  'new-lead',
  'contacted',
  'test-drive',
  'on-hold',
]);

// ─── deriveSalesEvent ─────────────────────────────────────────────────────────

/**
 * Maps a Deal stage transition (prev → next) to a SalesEvent kind + payload.
 *
 * Returns null when no event should be emitted.
 *
 * Mapping table (PLAN-VEHICLES-003 P2 §5):
 * - any pre-reserved → 'reserved'   → RESERVED
 * - 'reserved' → 'lost' (EXPIRED)   → RESERVATION_LOST(EXPIRED)
 * - 'reserved' → 'lost' (other)     → RESERVATION_LOST(CANCELLED)
 * - 'sales-order' → 'delivered'     → null (SOLD via SoCompleteDialog only)
 * - 'delivered' → 'lost'            → RETURNED
 * - all others                      → null
 */
export function deriveSalesEvent(
  prev: DealStage,
  next: DealStage,
  deal: Deal,
): { kind: SalesEventKind; payload: unknown } | null {
  const now = new Date().toISOString();

  // any non-reserved → 'reserved': emit RESERVED
  if (next === 'reserved' && prev !== 'reserved') {
    const depositAmount = deal.amount ?? 0;
    const expiresAt = deal.reservationExpiresAt ?? addHours(now, 72);
    return {
      kind: 'RESERVED',
      payload: {
        dealId: deal.id,
        depositAmount,
        expiresAt,
      },
    };
  }

  // 'reserved' → 'lost': emit RESERVATION_LOST — branch on cancellationReason (L26)
  if (prev === 'reserved' && next === 'lost') {
    const reason = deal.cancellationReason === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED';
    return {
      kind: 'RESERVATION_LOST',
      payload: {
        dealId: deal.id,
        reason,
      },
    };
  }

  // 'sales-order' → 'delivered': SOLD is emitted exclusively via SoCompleteDialog
  if (prev === 'sales-order' && next === 'delivered') {
    return null;
  }

  // 'delivered' → 'lost': emit RETURNED
  if (prev === 'delivered' && next === 'lost') {
    return {
      kind: 'RETURNED',
      payload: {
        salesOrderId: deal.id,
        reason: deal.cancellationReason ?? 'MANUAL_CANCEL',
      },
    };
  }

  // All other transitions — no SalesEvent
  return null;
}

// Keep PRE_RESERVED_STAGES available for tests
export { PRE_RESERVED_STAGES, addHours };
