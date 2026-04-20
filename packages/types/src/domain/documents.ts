/**
 * Document-related schemas for staff surface.
 *
 * Split from portal.ts per L9 (reviewer blocker #2): portal Document stays
 * lean; staff-only metadata lives here as a sibling entity keyed by docId.
 *
 * Spec reference: PLAN-VEHICLES-003 §1.2, §1.4
 * LoC budget: ≤120
 */

import { z } from 'zod';

// ─── DocumentAccessKindEnum ───────────────────────────────────────────────────

export const DocumentAccessKindEnum = z.enum([
  'UPLOAD',
  'UPDATE',   // metadata edit (expiresAt bumped, category reclassified)
  'REPLACE',  // new version supersedes old (old.supersededBy set)
  'DELETE',   // soft-delete; sets deletedAt
  'DOWNLOAD',
]);
export type DocumentAccessKind = z.infer<typeof DocumentAccessKindEnum>;

// ─── DocumentAccessEventSchema ────────────────────────────────────────────────

/**
 * Append-only access log for every document operation.
 * Renamed from DocumentAuditEvent per L3 (addendum §3).
 * Retention: 7yr; actor + purpose anonymized after TTL (L6).
 * actorRole: z.string() — TODO(L40): tighten to RoleIdEnum when added to @dms/types.
 */
export const DocumentAccessEventSchema = z.object({
  id: z.string(),
  docId: z.string(),
  vin: z.string(),
  customerId: z.string().optional(),
  kind: DocumentAccessKindEnum,
  at: z.string().datetime(),
  actorId: z.string(),
  actorRole: z.string(), // TODO(L40): tighten to RoleIdEnum when added
  purpose: z.enum(['CUSTOMER_HANDOFF', 'AUDIT', 'RTO_FILING', 'OTHER']).optional(),
  purposeNote: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type DocumentAccessEvent = z.infer<typeof DocumentAccessEventSchema>;

// ─── DownloadPurpose ──────────────────────────────────────────────────────────

export type DownloadPurpose = 'CUSTOMER_HANDOFF' | 'AUDIT' | 'RTO_FILING' | 'OTHER';

// ─── StaffDocumentCategoryEnum ────────────────────────────────────────────────

/**
 * 6 new staff-only document categories (PLAN-VEHICLES-003 L10).
 * Extends the portal-visible categories (rc, insurance, etc.) on the staff surface.
 */
export const StaffDocumentCategoryEnum = z.enum([
  'tcs-certificate-27d',
  'form-29-30',
  'noc',
  'consignment-agreement',
  'cpo-certificate',
  'sale-agreement',
]);
export type StaffDocumentCategory = z.infer<typeof StaffDocumentCategoryEnum>;

// ─── StaffDocumentMetadataSchema ─────────────────────────────────────────────

/**
 * Staff-only sibling to the portal Document entity (keyed by docId).
 * Customer-web never sees this entity. Staff-web joins on docId.
 * PLAN-VEHICLES-003 §1.4, L9.
 */
export const StaffDocumentMetadataSchema = z.object({
  docId: z.string(),
  version: z.number().int().min(1).default(1),
  /** Only meaningful when category === 'noc' (addendum §1.2) */
  subtype: z.enum(['financier', 'rto']).optional(),
  deletedAt: z.string().datetime().optional(),
  /** FK to SalesOrder id when doc supports a closed sale (L14 immutable guard) */
  supportingSalesOrderId: z.string().optional(),
  /** DPDP consent purpose recorded at upload time */
  purposeOfCollection: z.string().optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type StaffDocumentMetadata = z.infer<typeof StaffDocumentMetadataSchema>;

// ─── DocumentAccessEventPayloads (TypeScript-only discriminated union) ────────

/**
 * Per-kind payload shapes for DocumentAccessEvent.
 * TypeScript-only — Zod envelope uses z.record(z.unknown()) for forward-compat.
 * Every key must appear in translation-table.ts PAYLOAD_KEY_LABELS.
 * PLAN-VEHICLES-003 §1.2 / §12.
 */
export type DocumentAccessEventPayloads = {
  UPLOAD: { category: StaffDocumentCategory; subtype?: 'financier' | 'rto'; fileName: string; expiresAt?: string };
  UPDATE: { before: Partial<Record<string, unknown>>; after: Partial<Record<string, unknown>> };
  REPLACE: { previousDocId: string; previousVersion: number; newVersion: number };
  DELETE: { reason?: string; blockedByClosedSaleId?: string };
  DOWNLOAD: { purpose?: DownloadPurpose; purposeNote?: string };
};
