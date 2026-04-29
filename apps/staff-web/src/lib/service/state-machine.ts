/**
 * Service Job Card State Machine
 *
 * Single source of truth for allowed transitions, role gates, and helpers.
 * All mutation paths (Update Status dialog, Cancel JC, Reopen JC, etc.) MUST
 * use canTransition() and allowedNext() — no ad-hoc if/switch in components.
 *
 * Spec reference: SPEC-SERVICE-001 §3 + PLAN-SERVICE-002 reviewer changes §1,§2
 */

import type { JobCardStatus } from '@dms/types';

// ─── Locked decision L_SVC_BOOK_1 — self-cancel discriminator ────────────────

/**
 * L_SVC_BOOK_1: Self-cancel discriminator string (SPEC-CUSTOMER-PORTAL-002 §0).
 *
 * When a customer cancels an AWAITING_CONFIRMATION booking via the portal (S3),
 * the JobCard's `declineReason` is set to this exact string (case-sensitive).
 *
 * Both `ServiceBookingsPage` (list) and `ServiceBookingDetailPage` (detail) use
 * strict string equality against this constant to discriminate customer self-cancel
 * from SA-decline. UI components MUST import this constant — never inline the
 * literal string.
 *
 * Future API implementations of `POST /api/service/bookings/[id]/cancel` MUST
 * set this exact value. Any change to this string is a breaking change requiring
 * a migration across all JC records that carry the old value.
 *
 * See also: SPEC-CUSTOMER-PORTAL-002 §6 (JC-P3 transition), §8.1 (detail page),
 *           §15 (failure modes).
 */
export const SELF_CANCEL_REASON = 'Cancelled by customer' as const;

// ─── Transition table (authoritative) ────────────────────────────────────────

/**
 * Maps each status to the list of statuses it can transition to.
 * CANCELLED is terminal — no outgoing transitions.
 * REOPENED auto-advances to IN_PROGRESS (allowed via this table; the store
 * handles the auto-advance after emitting the `reopened` event).
 */
export const TRANSITIONS: Record<JobCardStatus, JobCardStatus[]> = {
  // SPEC-CUSTOMER-PORTAL-002 §5.3 — portal pre-state:
  // SA confirms (→ RECEIVED) or declines (→ CANCELLED).
  // Customer can also self-cancel (→ CANCELLED) while in this state (L5 path-specific override).
  AWAITING_CONFIRMATION: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['DIAGNOSED', 'CANCELLED'],
  DIAGNOSED: ['IN_PROGRESS', 'WAITING_PARTS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_PARTS', 'ADDITIONAL_WORK_APPROVAL', 'QC', 'CANCELLED'],
  WAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  ADDITIONAL_WORK_APPROVAL: ['IN_PROGRESS', 'DIAGNOSED', 'CANCELLED'],
  QC: ['IN_PROGRESS', 'READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['DELIVERED', 'IN_PROGRESS', 'CANCELLED'],
  DELIVERED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS'],
  CANCELLED: [],
};

/**
 * Returns the list of statuses reachable from `from`.
 */
export function allowedNext(from: JobCardStatus): JobCardStatus[] {
  return TRANSITIONS[from];
}

/**
 * Returns true if a transition from → to is permitted by the state machine.
 */
export function canTransition(from: JobCardStatus, to: JobCardStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// ─── Role gates ───────────────────────────────────────────────────────────────

/**
 * Lists the role codes that are permitted to *enter* (move a card into) each status.
 * Empty array means no additional restrictions beyond being an authenticated staff user.
 *
 * Key transitions requiring R19+:
 *   - CANCELLED  — any non-delivered card can be cancelled, but only by R19+
 *   - DELIVERED  — only R19+ can mark a card as delivered
 *   - REOPENED   — only R19+ can reopen a delivered card for rework
 */
export const ROLE_GATES: Record<JobCardStatus, string[]> = {
  // SPEC-CUSTOMER-PORTAL-002 §5.3 + L5:
  // Created by portal (R20); transitions by R09/R03/R01 (confirm/decline).
  // Customer self-cancel (→ CANCELLED) is enforced at the store action level
  // via createBookingFromPortal / cancelPortalBooking — NOT by this global gate.
  // The CANCELLED gate below remains unchanged (R19/R22/R24 for non-portal paths).
  AWAITING_CONFIRMATION: [],
  RECEIVED: [],
  DIAGNOSED: ['R09', 'R11', 'R12', 'R19', 'R22', 'R24'],
  IN_PROGRESS: ['R09', 'R11', 'R12', 'R19', 'R22', 'R24'],
  WAITING_PARTS: ['R09', 'R12', 'R19', 'R22', 'R24'],
  ADDITIONAL_WORK_APPROVAL: ['R09', 'R12', 'R19', 'R22', 'R24'],
  QC: ['R09', 'R11', 'R12', 'R19', 'R22', 'R24'],
  READY_FOR_DELIVERY: ['R09', 'R12', 'R19', 'R22', 'R24'],
  DELIVERED: ['R19', 'R22', 'R24'],
  REOPENED: ['R19', 'R22', 'R24'],
  CANCELLED: ['R19', 'R22', 'R24'],
};

/**
 * Returns true if the given role code is permitted to enter `status`.
 * If ROLE_GATES[status] is empty, any role is allowed.
 */
export function canEnterStatus(status: JobCardStatus, roleCode: string): boolean {
  const gates = ROLE_GATES[status];
  if (gates.length === 0) return true;
  return gates.includes(roleCode);
}

/**
 * Path-specific role override per SPEC-CUSTOMER-PORTAL-002 §5.3 locked decision L5.
 *
 * The AWAITING_CONFIRMATION → CANCELLED transition is permitted for:
 *   - R09 (Service Advisor), R03 (Outlet Manager), R01 (Admin) — SA decline
 *   - R20 (Customer Portal user) — customer self-cancel of their own pending booking
 *
 * This does NOT widen the global CANCELLED gate (which stays R19/R22/R24).
 * Only applies when fromStatus === 'AWAITING_CONFIRMATION'.
 */
export const AWAITING_CONFIRMATION_CANCEL_ROLES = ['R09', 'R03', 'R01', 'R20'] as const;

export function canCancelAwaitingConfirmation(roleCode: string): boolean {
  return (AWAITING_CONFIRMATION_CANCEL_ROLES as readonly string[]).includes(roleCode);
}
