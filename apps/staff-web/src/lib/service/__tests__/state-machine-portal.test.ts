/**
 * State machine tests — AWAITING_CONFIRMATION transitions.
 *
 * Covers 3 required test paths per SPEC-CUSTOMER-PORTAL-002 §17:
 *   1. AWAITING_CONFIRMATION → RECEIVED (SA confirm — JC-P2)
 *   2. AWAITING_CONFIRMATION → CANCELLED (SA decline — JC-P3)
 *   3. AWAITING_CONFIRMATION → DIAGNOSED (must be false — no skip allowed)
 *
 * Also tests role override helpers (L5 locked decision).
 */

import { describe, it, expect } from 'vitest';
import {
  canTransition,
  allowedNext,
  canCancelAwaitingConfirmation,
  TRANSITIONS,
} from '../state-machine';

describe('AWAITING_CONFIRMATION state machine', () => {
  it('path JC-P2: AWAITING_CONFIRMATION → RECEIVED is allowed', () => {
    expect(canTransition('AWAITING_CONFIRMATION', 'RECEIVED')).toBe(true);
  });

  it('path JC-P3: AWAITING_CONFIRMATION → CANCELLED is allowed', () => {
    expect(canTransition('AWAITING_CONFIRMATION', 'CANCELLED')).toBe(true);
  });

  it('AWAITING_CONFIRMATION → DIAGNOSED is NOT allowed (no status skipping)', () => {
    expect(canTransition('AWAITING_CONFIRMATION', 'DIAGNOSED')).toBe(false);
  });

  it('AWAITING_CONFIRMATION → IN_PROGRESS is NOT allowed', () => {
    expect(canTransition('AWAITING_CONFIRMATION', 'IN_PROGRESS')).toBe(false);
  });

  it('allowedNext returns exactly [RECEIVED, CANCELLED] for AWAITING_CONFIRMATION', () => {
    expect(allowedNext('AWAITING_CONFIRMATION')).toEqual(['RECEIVED', 'CANCELLED']);
  });

  it('TRANSITIONS record includes AWAITING_CONFIRMATION', () => {
    expect('AWAITING_CONFIRMATION' in TRANSITIONS).toBe(true);
  });
});

describe('L5 path-specific cancel role override', () => {
  it('R09 (Service Advisor) can cancel an AWAITING_CONFIRMATION booking', () => {
    expect(canCancelAwaitingConfirmation('R09')).toBe(true);
  });

  it('R03 (Outlet Manager) can cancel an AWAITING_CONFIRMATION booking', () => {
    expect(canCancelAwaitingConfirmation('R03')).toBe(true);
  });

  it('R01 (Admin) can cancel an AWAITING_CONFIRMATION booking', () => {
    expect(canCancelAwaitingConfirmation('R01')).toBe(true);
  });

  it('R20 (Customer Portal) can self-cancel their AWAITING_CONFIRMATION booking', () => {
    expect(canCancelAwaitingConfirmation('R20')).toBe(true);
  });

  it('R11 (Technician) cannot cancel an AWAITING_CONFIRMATION booking via L5 override', () => {
    expect(canCancelAwaitingConfirmation('R11')).toBe(false);
  });

  it('R19 (GM) is not in the L5 override (uses global gate instead)', () => {
    // R19 can use the global CANCELLED gate — but NOT the path-specific L5 override
    expect(canCancelAwaitingConfirmation('R19')).toBe(false);
  });
});
