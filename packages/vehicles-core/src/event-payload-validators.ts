/**
 * Runtime payload validators for SalesEvent and DocumentAccessEvent.
 *
 * The Zod envelope schemas use z.record(z.unknown()) for forward-compat.
 * This file provides per-kind Zod objects validated at EVERY write boundary:
 *   - sales-events-slice.emitSalesEvent
 *   - docs-access-emitter.emitDocAccessEvent
 *   - fixture loaders (hydrator)
 *   - MSW handlers
 *
 * Invalid payload throws PayloadValidationError — the translation table
 * never sees malformed data. (L28)
 *
 * Spec reference: PLAN-VEHICLES-003 §2.5, L28
 * LoC budget: ≤220
 */

import { z } from 'zod';
import { VehicleTouchSourceEnum, SalesEventKindEnum } from '@dms/types';
import { DocumentAccessKindEnum, StaffDocumentCategoryEnum } from '@dms/types';
import type { SalesEventKind, DocumentAccessKind } from '@dms/types';

// ─── PayloadValidationError ───────────────────────────────────────────────────

export class PayloadValidationError extends Error {
  readonly kind: string;
  readonly issues: z.ZodIssue[];

  constructor(message: string, zodError: z.ZodError) {
    super(message);
    this.name = 'PayloadValidationError';
    this.kind = message;
    this.issues = zodError.issues;
  }
}

// ─── SalesEventPayloadValidators ──────────────────────────────────────────────

const outletIdEnum = z.enum(['BLR-01', 'MUM-01', 'CHE-01']);

/**
 * One z.object per SalesEventKind — validates the exact shape of event.payload.
 * Keyed by SalesEventKind for O(1) lookup at write time.
 */
export const SalesEventPayloadValidators: Record<SalesEventKind, z.ZodTypeAny> = {
  ACQUIRED: z.object({
    acquisitionCost: z.number().nonnegative(),
    kmAtAcquisition: z.number().int().nonnegative(),
    source: VehicleTouchSourceEnum,
    consignorCustomerId: z.string().optional(),
  }),

  LISTED: z.object({
    listPrice: z.number().positive(),
    outletId: outletIdEnum,
  }),

  PRICE_CHANGED: z.object({
    fromPrice: z.number().nonnegative(),
    toPrice: z.number().positive(),
    reason: z.string().optional(),
  }),

  RESERVED: z.object({
    dealId: z.string(),
    depositAmount: z.number().nonnegative(),
    expiresAt: z.string().datetime(),
  }),

  RESERVATION_LOST: z.object({
    dealId: z.string(),
    reason: z.enum(['EXPIRED', 'CANCELLED', 'BUYER_WITHDREW']),
  }),

  SOLD: z.object({
    salesOrderId: z.string(),
    finalPrice: z.number().positive(),
    flow: z.enum(['MARGIN_SCHEME', 'CONSIGNMENT_COMMISSION']),
    tcsCollected: z.number().nonnegative(),
    tcsWaived: z.boolean().optional(),
    tcsWaivedReason: z.string().optional(),
    gstMargin: z.number().nonnegative().optional(),
    commissionEarned: z.number().nonnegative().optional(),
    sellerSignatures: z.array(z.object({
      customerId: z.string(),
      signedAt: z.string().datetime(),
      actorId: z.string(),
    })),
    override: z.object({
      by: z.string(),
      reason: z.string().min(1),
      proofDocIds: z.array(z.string()).min(1),
    }).optional(),
    buyerCustomerId: z.string(),
  }),

  RETURNED: z.object({
    salesOrderId: z.string(),
    reason: z.string().min(1),
    noteForFinance: z.string().optional(),
  }),
};

// ─── DocumentAccessPayloadValidators ─────────────────────────────────────────

/**
 * One z.object per DocumentAccessKind — validates event.payload at write time.
 */
export const DocumentAccessPayloadValidators: Record<DocumentAccessKind, z.ZodTypeAny> = {
  UPLOAD: z.object({
    category: StaffDocumentCategoryEnum,
    subtype: z.enum(['financier', 'rto']).optional(),
    fileName: z.string(),
    expiresAt: z.string().datetime().optional(),
  }),

  UPDATE: z.object({
    before: z.record(z.unknown()),
    after: z.record(z.unknown()),
  }),

  REPLACE: z.object({
    previousDocId: z.string(),
    previousVersion: z.number().int().min(1),
    newVersion: z.number().int().min(1),
  }),

  DELETE: z.object({
    reason: z.string().optional(),
    blockedByClosedSaleId: z.string().optional(),
  }),

  DOWNLOAD: z.object({
    purpose: z.enum(['CUSTOMER_HANDOFF', 'AUDIT', 'RTO_FILING', 'OTHER']).optional(),
    purposeNote: z.string().optional(),
  }),
};

// ─── Validate helpers ─────────────────────────────────────────────────────────

/**
 * Validates a payload for the given SalesEventKind.
 * Throws PayloadValidationError on failure. (L28)
 *
 * Call at every write boundary — emitSalesEvent, hydrator, MSW handler.
 */
export function validateSalesEventPayload(kind: SalesEventKind, payload: unknown): void {
  const validator = SalesEventPayloadValidators[kind];
  const result = validator.safeParse(payload);
  if (!result.success) {
    throw new PayloadValidationError(
      `Invalid payload for SalesEvent kind ${kind}`,
      result.error,
    );
  }
}

/**
 * Validates a payload for the given DocumentAccessKind.
 * Throws PayloadValidationError on failure. (L28)
 *
 * Call at every write boundary — emitDocAccessEvent, hydrator, MSW handler.
 */
export function validateDocumentAccessPayload(kind: DocumentAccessKind, payload: unknown): void {
  const validator = DocumentAccessPayloadValidators[kind];
  const result = validator.safeParse(payload);
  if (!result.success) {
    throw new PayloadValidationError(
      `Invalid payload for DocumentAccessEvent kind ${kind}`,
      result.error,
    );
  }
}

// Re-export the enums so callers have a single import point
export { SalesEventKindEnum, DocumentAccessKindEnum };
