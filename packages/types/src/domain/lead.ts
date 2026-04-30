import { z } from 'zod';

/**
 * Lead → Sale conversion funnel types.
 *
 * SPEC-LEADS-001 §3.
 *
 * L3: LeadScore is a display enum only — never stored on the Lead entity.
 *     Always computed by computeLeadScore() pure helper.
 * L2: Stage machine: NEW → CONTACTED → QUALIFIED → TEST_DRIVE → QUOTED → SO_RAISED → DELIVERED
 *     LOST is reachable from any active stage.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export const LeadStageEnum = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'TEST_DRIVE',
  'QUOTED',
  'SO_RAISED',
  'DELIVERED',
  'LOST',
]);
export type LeadStage = z.infer<typeof LeadStageEnum>;

export const LeadSourceEnum = z.enum([
  'walk-in',
  'web-form',
  'phone',
  'referral',
  'service-upgrade',
]);
export type LeadSource = z.infer<typeof LeadSourceEnum>;

/** Display-only score — L3: always computed, never stored */
export const LeadScoreEnum = z.enum(['COLD', 'WARM', 'HOT']);
export type LeadScore = z.infer<typeof LeadScoreEnum>;

// ─── Activity ─────────────────────────────────────────────────────────────────

export const LeadActivityKindEnum = z.enum([
  'note',
  'call',
  'whatsapp',
  'stage-change',
  'assign',
]);
export type LeadActivityKind = z.infer<typeof LeadActivityKindEnum>;

export const LeadActivitySchema = z.object({
  id: z.string(),
  leadId: z.string(),
  kind: LeadActivityKindEnum,
  at: z.string().datetime(),
  actorId: z.string(),
  /** Denormalised for fast display — L7: append-only, never update */
  actorName: z.string(),
  /** Arbitrary per-kind metadata (e.g. { toStage: 'QUALIFIED' } for stage-change) */
  payload: z.record(z.string()).optional(),
});
export type LeadActivity = z.infer<typeof LeadActivitySchema>;

// ─── Lead ─────────────────────────────────────────────────────────────────────

export const LeadSchema = z.object({
  id: z.string(),
  source: LeadSourceEnum,
  stage: LeadStageEnum,
  /** FK → customers-store — L16 (Seam 39) */
  customerId: z.string(),
  /** FK → vehicles-store — L8, L17 (Seam 40) */
  vehicleInterestVin: z.string().optional(),
  /** FK → staff-store; assignment requires R09+ — L5 */
  assignedAdvisorId: z.string().optional(),
  createdAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  /** Advisory timer — L6 */
  nextActionAt: z.string().datetime().optional(),
  /** L9: read-only after creation */
  outletId: z.enum(['bangalore', 'mumbai', 'chennai']),
  /** L12: web-form source URL */
  leadOriginUrl: z.string().optional(),
  /** Required when stage = LOST — SC-08/09 */
  lostReason: z.string().optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

// ─── Store input params ───────────────────────────────────────────────────────

export const CreateLeadParamsSchema = z.object({
  source: LeadSourceEnum,
  customerId: z.string(),
  outletId: z.enum(['bangalore', 'mumbai', 'chennai']),
  vehicleInterestVin: z.string().optional(),
  assignedAdvisorId: z.string().optional(),
  nextActionAt: z.string().datetime().optional(),
  leadOriginUrl: z.string().optional(),
  /** Optional initial note, e.g. "Service upgrade trigger: <VIN>" — SC-14 */
  initialNote: z.string().optional(),
});
export type CreateLeadParams = z.infer<typeof CreateLeadParamsSchema>;

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Thrown by transitionStage on backward move — L2 */
export class InvalidLeadStageTransitionError extends Error {
  constructor(from: LeadStage, to: LeadStage) {
    super(`Cannot transition lead from ${from} to ${to} — backward transitions are blocked.`);
    this.name = 'InvalidLeadStageTransitionError';
  }
}

/** Thrown by assignAdvisor when actor is below R09 — L5 */
export class LeadAssignmentPermissionError extends Error {
  constructor(actorRole: string) {
    super(`Role ${actorRole} cannot assign advisors. Requires R09 or above.`);
    this.name = 'LeadAssignmentPermissionError';
  }
}

/** Thrown by bulkImportFromCsv — L10 */
export class LeadBulkImportNotImplementedError extends Error {
  constructor() {
    super('Bulk CSV import is a P2 feature.');
    this.name = 'LeadBulkImportNotImplementedError';
  }
}

// ─── Stage order for transition validation — L2 ───────────────────────────────

export const LEAD_STAGE_ORDER: LeadStage[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'TEST_DRIVE',
  'QUOTED',
  'SO_RAISED',
  'DELIVERED',
];

export const LEAD_TERMINAL_STAGES: Set<LeadStage> = new Set(['DELIVERED', 'LOST']);

/** Returns true if a forward (or LOST) transition is valid — L2 */
export function isValidLeadTransition(from: LeadStage, to: LeadStage): boolean {
  if (LEAD_TERMINAL_STAGES.has(from)) return false;
  if (to === 'LOST') return true; // LOST always reachable — L2
  const fromIdx = LEAD_STAGE_ORDER.indexOf(from);
  const toIdx = LEAD_STAGE_ORDER.indexOf(to);
  return toIdx > fromIdx;
}

// ─── Role rank constants for RBAC checks — SPEC-LEADS-001 L5 ─────────────────

/** Roles allowed to assign/re-assign advisors */
export const LEAD_ASSIGN_ROLES = ['R09', 'R10', 'R12', 'R13', 'R19', 'R22', 'R24'] as const;
