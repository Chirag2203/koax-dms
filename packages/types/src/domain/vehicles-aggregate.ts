/**
 * Vehicles aggregate — Zod schemas and TypeScript types.
 *
 * VIN is the aggregate root for the DMS. Every ownership, claim, and audit
 * event attaches to a VIN and flows into the staff lifetime detail page.
 *
 * Spec reference: SPEC-VEHICLES-001 §2 (entities)
 * LoC budget: ≤200
 */

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const VehicleTouchSourceEnum = z.enum([
  'BN_SALE',
  'BN_CONSIGNMENT',
  'SERVICE_ONLY_WALKIN',
  'LEGACY_IMPORT',
]);
export type VehicleTouchSource = z.infer<typeof VehicleTouchSourceEnum>;

export const OwnershipStateEnum = z.enum([
  'PENDING_CLAIM',
  'ACTIVE',
  'TRANSFERRED',
  'REVOKED',
  'REJECTED',
]);
export type OwnershipState = z.infer<typeof OwnershipStateEnum>;

export const CloseReasonEnum = z.enum([
  'BN_SALE_TRANSFER',
  'MANUAL_REVOKE',
  'SELF_REVOKE_SOLD',
  'CLAIM_OVERLAP',
  'DECEASED_FORM31',
  'ERASURE_REQUEST',
  'REJECTED_CLAIM',
]);
export type CloseReason = z.infer<typeof CloseReasonEnum>;

export const ClaimStateEnum = z.enum([
  'PENDING',
  'AUTO_APPROVED',
  'APPROVED',
  'REJECTED',
]);
export type ClaimState = z.infer<typeof ClaimStateEnum>;

export const RejectionReasonEnum = z.enum([
  'DOC_MISMATCH',
  'DUPLICATE',
  'IDENTITY_FAILED',
  'VIN_NOT_ELIGIBLE',
  'OTHER',
]);
export type RejectionReason = z.infer<typeof RejectionReasonEnum>;

export const OwnershipEventKindEnum = z.enum([
  'OPEN',
  'CLOSE',
  'TRANSFER',
  'CLAIM_SUBMIT',
  'CLAIM_APPROVE',
  'CLAIM_REJECT',
  'RESTORE',
  'ANONYMIZE',
  'PDF_EXPORT',
  'JOINT_ADD',
  'FORM31_APPROVE',
]);
export type OwnershipEventKind = z.infer<typeof OwnershipEventKindEnum>;

// ─── VehicleMaster ────────────────────────────────────────────────────────────

/** Master record for any VIN BN has touched. Auto-upserted on first touch. */
export const VehicleMasterSchema = z.object({
  vin: z.string().length(17),
  make: z.string(),
  model: z.string(),
  variant: z.string().optional(),
  year: z.number().int().min(1990).max(2030),
  color: z.string(),
  rcNumber: z.string(),
  firstTouchedAt: z.string().datetime(),
  firstTouchSource: VehicleTouchSourceEnum,
  firstTouchOutletId: z.enum(['BLR-01', 'MUM-01', 'CHE-01']),
  lastKnownKm: z.number().int().nonnegative(),
  lastKnownKmAt: z.string().datetime(),
  /** Link to inventory.Vehicle if applicable */
  inventoryVehicleVin: z.string().optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type VehicleMaster = z.infer<typeof VehicleMasterSchema>;

// ─── VehicleOwnership ─────────────────────────────────────────────────────────

/**
 * Time-sliced ledger row. Append-heavy; closures set `toAt` but the row is
 * never deleted (until TTL anonymization per DPDP 7-yr retention rule).
 */
export const VehicleOwnershipSchema = z.object({
  id: z.string(),
  vin: z.string(),
  customerId: z.string(),
  source: VehicleTouchSourceEnum,
  state: OwnershipStateEnum,
  isJoint: z.boolean().default(false),
  fromAt: z.string().datetime(),
  toAt: z.string().datetime().optional(),
  kmAtOpen: z.number().int().nonnegative(),
  kmAtClose: z.number().int().nonnegative().optional(),
  /** true if close km was staff-estimated (last JC > 90 days old) */
  kmStale: z.boolean().default(false),
  graceUntilAt: z.string().datetime().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  closedBy: z.string().optional(),
  closedAt: z.string().datetime().optional(),
  closeReason: CloseReasonEnum.optional(),
  /** toAt + 2555 days — after this anonymizeRow() is triggered */
  piiRetentionUntil: z.string().datetime().optional(),
  linkedSalesOrderId: z.string().optional(),
  linkedJobCardId: z.string().optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type VehicleOwnership = z.infer<typeof VehicleOwnershipSchema>;

// ─── OwnershipClaim ───────────────────────────────────────────────────────────

/** Pending-queue entity for portal ownership claims. */
export const OwnershipClaimSchema = z.object({
  id: z.string(),
  vin: z.string(),
  claimantCustomerId: z.string(),
  submittedAt: z.string().datetime(),
  rcScanUrl: z.string().url().optional(),
  identityProofScanUrl: z.string().url().optional(),
  /** Pre-computed in UI before submit (§7.3 — claim-slice stays pure) */
  autoMatchHit: z.boolean(),
  /** SalesOrder id or JobCard id that matched */
  matchedEntityId: z.string().optional(),
  state: ClaimStateEnum,
  decidedBy: z.string().optional(),
  decidedAt: z.string().datetime().optional(),
  rejectionReasonCategory: RejectionReasonEnum.optional(),
  /** ACTIVE ownership row that this claim would displace */
  overlapsOwnershipId: z.string().optional(),
  /** Prior PENDING claim on same VIN (different claimant) */
  overlapsClaimId: z.string().optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type OwnershipClaim = z.infer<typeof OwnershipClaimSchema>;

// ─── OwnershipChangeEvent ─────────────────────────────────────────────────────

/** Append-only audit log. Every ownership/claim action emits one event. */
export const OwnershipChangeEventSchema = z.object({
  id: z.string(),
  vin: z.string(),
  at: z.string().datetime(),
  kind: OwnershipEventKindEnum,
  actorId: z.string(),
  actorRole: z.string(),
  ownershipId: z.string().optional(),
  claimId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type OwnershipChangeEvent = z.infer<typeof OwnershipChangeEventSchema>;
