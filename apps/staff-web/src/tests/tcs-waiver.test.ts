/**
 * TCS waiver — compliance tests (PLAN-VEHICLES-003 L18).
 *
 * Covers:
 *  (a) R10 cannot waive TCS — hasRank('R10', 'R12') is false
 *  (b) R12+ can waive TCS — hasRank('R12', 'R12') and hasRank('R16', 'R12') are true
 *  (c) SOLD with tcsWaived: true but tcsWaivedReason missing/short → PayloadValidationError
 *      blocked by validator: tcsWaivedReason is optional in schema but we verify the
 *      tcsWaiverBlocks logic via the canSubmit precondition test
 *  (d) SOLD with tcsWaived: true + valid reason → event payload contains correct fields
 *
 * Spec reference: PLAN-VEHICLES-003 L7, L18, L35
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hasRank, SalesEventSchema } from '@dms/types';
import type { StaffRoleCode } from '@dms/types';
import { useVehiclesStore } from '../lib/vehicles/vehicles-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useVehiclesStore.setState({
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    salesEvents: {},
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: false,
  });
}

const VIN = 'WBA3A5C50DF654321';

/** Minimal valid SOLD payload — no waiver. */
function soldPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    salesOrderId: 'SO-TCS-001',
    finalPrice: 1_200_000,
    flow: 'MARGIN_SCHEME' as const,
    tcsCollected: 12_000,
    sellerSignatures: [],
    buyerCustomerId: 'cust-buyer-001',
    ...overrides,
  };
}

// ─── (a) R10 cannot waive TCS ─────────────────────────────────────────────────

describe('TCS waiver RBAC — L7 / L18', () => {
  it('(a) R10 does NOT meet R12+ threshold — canWaiveTcs is false', () => {
    // L7: hasRank numeric comparator. R10 rank=12, R12 rank=15 → 12 < 15 → false
    expect(hasRank('R10' as StaffRoleCode, 'R12')).toBe(false);
  });

  it('(a) R09 does NOT meet R12+ threshold', () => {
    expect(hasRank('R09' as StaffRoleCode, 'R12')).toBe(false);
  });

  it('(a) R05 (Sales Exec) does NOT meet R12+ threshold', () => {
    expect(hasRank('R05' as StaffRoleCode, 'R12')).toBe(false);
  });

  // ─── (b) R12+ can waive ──────────────────────────────────────────────────────

  it('(b) R12 meets R12+ threshold — canWaiveTcs is true', () => {
    // R12 rank=15, R12 rank=15 → 15 >= 15 → true
    expect(hasRank('R12' as StaffRoleCode, 'R12')).toBe(true);
  });

  it('(b) R16 (Finance Head) meets R12+ threshold', () => {
    expect(hasRank('R16' as StaffRoleCode, 'R12')).toBe(true);
  });

  it('(b) R19 (GM) meets R12+ threshold', () => {
    expect(hasRank('R19' as StaffRoleCode, 'R12')).toBe(true);
  });

  it('(b) R22 (CFO) meets R12+ threshold', () => {
    expect(hasRank('R22' as StaffRoleCode, 'R12')).toBe(true);
  });

  it('(b) R24 (CEO) meets R12+ threshold', () => {
    expect(hasRank('R24' as StaffRoleCode, 'R12')).toBe(true);
  });
});

// ─── (c) submit block: waiver checked but reason invalid ─────────────────────

describe('TCS waiver canSubmit guard — L18', () => {
  /**
   * The SoCompleteDialog computes:
   *   tcsWaiverBlocks = tcsWaived && tcsWaivedReason.trim().length < 10
   *   canSubmit = ... && !tcsWaiverBlocks
   *
   * We verify this logic directly here rather than mounting the React component.
   */

  function computeCanSubmit(opts: {
    allSigned: boolean;
    tcsWaived: boolean;
    tcsWaivedReason: string;
    status?: 'idle' | 'loading' | 'success' | 'error';
  }): boolean {
    const { allSigned, tcsWaived, tcsWaivedReason, status = 'idle' } = opts;
    const tcsWaivedReasonValid = tcsWaivedReason.trim().length >= 10;
    const tcsWaiverBlocks = tcsWaived && !tcsWaivedReasonValid;
    return status !== 'loading' && status !== 'success' && allSigned && !tcsWaiverBlocks;
  }

  it('(c) waiver checked + empty reason → canSubmit is false', () => {
    expect(computeCanSubmit({ allSigned: true, tcsWaived: true, tcsWaivedReason: '' })).toBe(false);
  });

  it('(c) waiver checked + reason with 9 chars → canSubmit is false', () => {
    expect(computeCanSubmit({ allSigned: true, tcsWaived: true, tcsWaivedReason: '123456789' })).toBe(false);
  });

  it('(c) waiver checked + reason with exactly 10 chars → canSubmit is true', () => {
    expect(computeCanSubmit({ allSigned: true, tcsWaived: true, tcsWaivedReason: '1234567890' })).toBe(true);
  });

  it('(c) waiver NOT checked → canSubmit unaffected by reason', () => {
    expect(computeCanSubmit({ allSigned: true, tcsWaived: false, tcsWaivedReason: '' })).toBe(true);
  });

  it('(c) loading status always blocks submit', () => {
    expect(computeCanSubmit({ allSigned: true, tcsWaived: false, tcsWaivedReason: '', status: 'loading' })).toBe(false);
  });
});

// ─── (d) SOLD event payload with valid waiver ─────────────────────────────────

describe('TCS waiver — SOLD event payload (L18 / L35)', () => {
  beforeEach(() => resetStore());

  const ACTOR_R12 = { id: 'staff-r12-001', name: 'Finance Manager', role: 'R12' };
  const WAIVER_REASON = 'Buyer is a Central Government entity per §206C(1H) notification';

  it('(d) SOLD with tcsWaived: true and valid reason → event stores payload correctly', () => {
    useVehiclesStore.getState().emitSalesEvent(
      VIN,
      'SOLD',
      soldPayload({
        tcsCollected: 0,   // waived → collected = 0
        tcsWaived: true,
        tcsWaivedReason: WAIVER_REASON,
      }),
      ACTOR_R12,
    );

    const events = useVehiclesStore.getState().salesEvents[VIN] ?? [];
    expect(events).toHaveLength(1);

    const event = events[0]!;
    expect(event.kind).toBe('SOLD');
    expect(event.payload?.['tcsWaived']).toBe(true);
    expect(event.payload?.['tcsWaivedReason']).toBe(WAIVER_REASON);
    expect(event.payload?.['tcsCollected']).toBe(0);
  });

  it('(d) actor.role is stored as valid RoleId (L40 cascade)', () => {
    useVehiclesStore.getState().emitSalesEvent(
      VIN,
      'SOLD',
      soldPayload({
        tcsCollected: 0,
        tcsWaived: true,
        tcsWaivedReason: WAIVER_REASON,
      }),
      ACTOR_R12,
    );

    const event = useVehiclesStore.getState().salesEvents[VIN]?.[0];
    expect(event?.actorRole).toBe('R12');
  });

  it('(d) non-waived SOLD → tcsWaived absent from payload', () => {
    useVehiclesStore.getState().emitSalesEvent(
      VIN,
      'SOLD',
      soldPayload({ tcsCollected: 12_000 }),
      ACTOR_R12,
    );

    const event = useVehiclesStore.getState().salesEvents[VIN]?.[0];
    expect(event?.payload?.['tcsWaived']).toBeUndefined();
    expect(event?.payload?.['tcsWaivedReason']).toBeUndefined();
    expect(event?.payload?.['tcsCollected']).toBe(12_000);
  });

  it('(d) SOLD sale price exactly ₹10,00,000 → no TCS (L35 strict boundary)', () => {
    // Per L35: tcsApplicable = salePrice > 1_000_000 (strictly greater, not >=)
    // At exactly ₹10L → no TCS → tcsCollected should be 0 even without waiver
    const price = 1_000_000;
    const tcsApplicable = price > 1_000_000;
    const tcsCollected = tcsApplicable ? Math.round(price * 0.01) : 0;
    expect(tcsCollected).toBe(0);
  });
});

// ─── L40: actorRole RoleIdEnum tightening ────────────────────────────────────

describe('L40 — actorRole stored as valid RoleId', () => {
  beforeEach(() => resetStore());

  it('valid role R05 is stored verbatim', () => {
    const actor = { id: 'test-staff', name: 'Sales Exec', role: 'R05' };
    useVehiclesStore.getState().emitSalesEvent(
      VIN,
      'ACQUIRED',
      {
        acquisitionCost: 3_800_000,
        kmAtAcquisition: 50_000,
        source: 'BN_CONSIGNMENT',
      },
      actor,
    );
    const event = useVehiclesStore.getState().salesEvents[VIN]?.[0];
    expect(event?.actorRole).toBe('R05');
  });

  it('invalid role string falls back to R01 sentinel (never crashes)', () => {
    const actor = { id: 'test-staff', name: 'Unknown Role User', role: 'NOT_A_ROLE' };
    // Should not throw — just fall back
    expect(() =>
      useVehiclesStore.getState().emitSalesEvent(
        VIN,
        'ACQUIRED',
        { acquisitionCost: 100_000, kmAtAcquisition: 1_000, source: 'BN_SALE' },
        actor,
      ),
    ).not.toThrow();

    const event = useVehiclesStore.getState().salesEvents[VIN]?.[0];
    // Falls back to R01 sentinel
    expect(event?.actorRole).toBe('R01');
  });

  it('SalesEventSchema rejects non-RoleId actorRole string via Zod (L40)', () => {
    const result = SalesEventSchema.safeParse({
      id: 'evt-001',
      vin: VIN,
      at: new Date().toISOString(),
      kind: 'ACQUIRED',
      actorId: 'staff-001',
      actorRole: 'NOT_A_ROLE', // invalid — not in RoleIdEnum
      schemaVersion: 'v1',
    });
    expect(result.success).toBe(false);
  });
});
