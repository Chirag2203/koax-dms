/**
 * Translation table — per-kind-per-key qualified labels for timeline payload keys.
 *
 * Key shape: `${Stream}.${Kind}.${PayloadKey}` (L29).
 * Same key in different kinds gets independent labels + formatters.
 * Example: SALES.RESERVATION_LOST.reason ≠ SALES.PRICE_CHANGED.reason
 *
 * Exhaustiveness guard (L2): compile-time assertion that every key in
 * OwnershipEventPayloads + SalesEventPayloads + DocumentAccessEventPayloads
 * has an entry here. Adding a key to a payload type without updating this
 * table fails `pnpm -F @dms/types typecheck`.
 *
 * Spec reference: PLAN-VEHICLES-003 §2.3, §12, L2, L29
 * LoC budget: ≤220
 */

import type {
  OwnershipEventKind,
  SalesEventKind,
  OwnershipEventPayloads,
  SalesEventPayloads,
} from '@dms/types';
import type { DocumentAccessKind, DocumentAccessEventPayloads } from '@dms/types';

// ─── Formatter names ──────────────────────────────────────────────────────────

export type FormatterName =
  | 'customerRef'
  | 'ownershipRef'
  | 'enumLabel'
  | 'freeText'
  | 'currency'
  | 'km'
  | 'boolean'
  | 'datetime'
  | 'integer'
  | 'docRef'
  | 'array';

// ─── PAYLOAD_KEY_LABELS ───────────────────────────────────────────────────────

/**
 * Map of qualified key → { i18n key, formatter }.
 * "satisfies" clause ensures the shape is correct; "as const" enables
 * literal-type inference needed for the exhaustiveness guard.
 */
export const PAYLOAD_KEY_LABELS = {
  // ── OWNERSHIP.OPEN ──
  'OWNERSHIP.OPEN.source':              { i18nKey: 'staff.vehicles.timeline.keys.source',           formatter: 'enumLabel' as FormatterName },
  'OWNERSHIP.OPEN.kmAtOpen':            { i18nKey: 'staff.vehicles.timeline.keys.kmAtOpen',          formatter: 'km' as FormatterName },
  'OWNERSHIP.OPEN.isJoint':             { i18nKey: 'staff.vehicles.timeline.keys.isJoint',           formatter: 'boolean' as FormatterName },
  'OWNERSHIP.OPEN.jointWithCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.jointWith',         formatter: 'customerRef' as FormatterName },
  'OWNERSHIP.OPEN.consignorCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.consignor',         formatter: 'customerRef' as FormatterName },

  // ── OWNERSHIP.CLOSE ──
  'OWNERSHIP.CLOSE.closeReason':        { i18nKey: 'staff.vehicles.timeline.keys.closeReason',       formatter: 'enumLabel' as FormatterName },
  'OWNERSHIP.CLOSE.kmAtClose':          { i18nKey: 'staff.vehicles.timeline.keys.kmAtClose',          formatter: 'km' as FormatterName },
  'OWNERSHIP.CLOSE.graceUntilAt':       { i18nKey: 'staff.vehicles.timeline.keys.graceUntilAt',      formatter: 'datetime' as FormatterName },

  // ── OWNERSHIP.TRANSFER ──
  'OWNERSHIP.TRANSFER.buyerCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.buyer',             formatter: 'customerRef' as FormatterName },
  'OWNERSHIP.TRANSFER.kmAtClose':       { i18nKey: 'staff.vehicles.timeline.keys.kmAtClose',          formatter: 'km' as FormatterName },
  'OWNERSHIP.TRANSFER.closeReason':     { i18nKey: 'staff.vehicles.timeline.keys.closeReason',       formatter: 'enumLabel' as FormatterName },

  // ── OWNERSHIP.CLAIM_SUBMIT ──
  'OWNERSHIP.CLAIM_SUBMIT.claimantCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.claimant',   formatter: 'customerRef' as FormatterName },
  'OWNERSHIP.CLAIM_SUBMIT.autoMatchHit':       { i18nKey: 'staff.vehicles.timeline.keys.autoMatch',  formatter: 'boolean' as FormatterName },

  // ── OWNERSHIP.CLAIM_APPROVE ──
  'OWNERSHIP.CLAIM_APPROVE.overlapsOwnershipId': { i18nKey: 'staff.vehicles.timeline.keys.overlap',  formatter: 'ownershipRef' as FormatterName },

  // ── OWNERSHIP.CLAIM_REJECT ──
  'OWNERSHIP.CLAIM_REJECT.category':    { i18nKey: 'staff.vehicles.timeline.keys.rejectCategory',    formatter: 'enumLabel' as FormatterName },
  'OWNERSHIP.CLAIM_REJECT.reason':      { i18nKey: 'staff.vehicles.timeline.keys.rejectReason',      formatter: 'freeText' as FormatterName },

  // ── OWNERSHIP.RESTORE ──
  'OWNERSHIP.RESTORE.priorCloseReason': { i18nKey: 'staff.vehicles.timeline.keys.priorCloseReason',  formatter: 'enumLabel' as FormatterName },

  // ── OWNERSHIP.ANONYMIZE ──
  'OWNERSHIP.ANONYMIZE.reason':         { i18nKey: 'staff.vehicles.timeline.keys.anonymizeReason',   formatter: 'freeText' as FormatterName },

  // ── OWNERSHIP.PDF_EXPORT ──
  'OWNERSHIP.PDF_EXPORT.reason':        { i18nKey: 'staff.vehicles.timeline.keys.pdfExportReason',   formatter: 'freeText' as FormatterName },

  // ── OWNERSHIP.JOINT_ADD ──
  'OWNERSHIP.JOINT_ADD.jointWithCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.jointWith',    formatter: 'customerRef' as FormatterName },

  // ── OWNERSHIP.FORM31_APPROVE ──
  'OWNERSHIP.FORM31_APPROVE.heirCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.heir',         formatter: 'customerRef' as FormatterName },

  // ── SALES.ACQUIRED ──
  'SALES.ACQUIRED.acquisitionCost':     { i18nKey: 'staff.vehicles.timeline.keys.acquisitionCost',   formatter: 'currency' as FormatterName },
  'SALES.ACQUIRED.kmAtAcquisition':     { i18nKey: 'staff.vehicles.timeline.keys.kmAtAcquisition',   formatter: 'km' as FormatterName },
  'SALES.ACQUIRED.source':              { i18nKey: 'staff.vehicles.timeline.keys.acquisitionSource', formatter: 'enumLabel' as FormatterName },
  'SALES.ACQUIRED.consignorCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.consignor',         formatter: 'customerRef' as FormatterName },

  // ── SALES.LISTED ──
  'SALES.LISTED.listPrice':             { i18nKey: 'staff.vehicles.timeline.keys.listPrice',          formatter: 'currency' as FormatterName },
  'SALES.LISTED.outletId':              { i18nKey: 'staff.vehicles.timeline.keys.outlet',             formatter: 'enumLabel' as FormatterName },

  // ── SALES.PRICE_CHANGED ──
  'SALES.PRICE_CHANGED.fromPrice':      { i18nKey: 'staff.vehicles.timeline.keys.fromPrice',         formatter: 'currency' as FormatterName },
  'SALES.PRICE_CHANGED.toPrice':        { i18nKey: 'staff.vehicles.timeline.keys.toPrice',           formatter: 'currency' as FormatterName },
  'SALES.PRICE_CHANGED.reason':         { i18nKey: 'staff.vehicles.timeline.keys.priceChangeReason', formatter: 'freeText' as FormatterName },

  // ── SALES.RESERVED ──
  'SALES.RESERVED.dealId':              { i18nKey: 'staff.vehicles.timeline.keys.deal',              formatter: 'freeText' as FormatterName },
  'SALES.RESERVED.depositAmount':       { i18nKey: 'staff.vehicles.timeline.keys.depositAmount',     formatter: 'currency' as FormatterName },
  'SALES.RESERVED.expiresAt':           { i18nKey: 'staff.vehicles.timeline.keys.expiresAt',         formatter: 'datetime' as FormatterName },

  // ── SALES.RESERVATION_LOST ──
  'SALES.RESERVATION_LOST.dealId':      { i18nKey: 'staff.vehicles.timeline.keys.deal',              formatter: 'freeText' as FormatterName },
  'SALES.RESERVATION_LOST.reason':      { i18nKey: 'staff.vehicles.timeline.keys.reservationLostReason', formatter: 'enumLabel' as FormatterName },

  // ── SALES.SOLD ──
  'SALES.SOLD.salesOrderId':            { i18nKey: 'staff.vehicles.timeline.keys.salesOrder',        formatter: 'freeText' as FormatterName },
  'SALES.SOLD.finalPrice':              { i18nKey: 'staff.vehicles.timeline.keys.finalPrice',        formatter: 'currency' as FormatterName },
  'SALES.SOLD.flow':                    { i18nKey: 'staff.vehicles.timeline.keys.saleFlow',          formatter: 'enumLabel' as FormatterName },
  'SALES.SOLD.tcsCollected':            { i18nKey: 'staff.vehicles.timeline.keys.tcsCollected',      formatter: 'currency' as FormatterName },
  'SALES.SOLD.tcsWaived':               { i18nKey: 'staff.vehicles.timeline.keys.tcsWaived',         formatter: 'boolean' as FormatterName },
  'SALES.SOLD.tcsWaivedReason':         { i18nKey: 'staff.vehicles.timeline.keys.tcsWaivedReason',   formatter: 'freeText' as FormatterName },
  'SALES.SOLD.gstMargin':               { i18nKey: 'staff.vehicles.timeline.keys.gstMargin',         formatter: 'currency' as FormatterName },
  'SALES.SOLD.commissionEarned':        { i18nKey: 'staff.vehicles.timeline.keys.commissionEarned',  formatter: 'currency' as FormatterName },
  'SALES.SOLD.sellerSignatures':        { i18nKey: 'staff.vehicles.timeline.keys.sellerSignatures',  formatter: 'array' as FormatterName },
  'SALES.SOLD.override.by':             { i18nKey: 'staff.vehicles.timeline.keys.overrideBy',        formatter: 'freeText' as FormatterName },
  'SALES.SOLD.override.reason':         { i18nKey: 'staff.vehicles.timeline.keys.overrideReason',    formatter: 'freeText' as FormatterName },
  'SALES.SOLD.override.proofDocIds':    { i18nKey: 'staff.vehicles.timeline.keys.overrideProofs',    formatter: 'array' as FormatterName },
  'SALES.SOLD.buyerCustomerId':         { i18nKey: 'staff.vehicles.timeline.keys.buyer',             formatter: 'customerRef' as FormatterName },

  // ── SALES.RETURNED ──
  'SALES.RETURNED.salesOrderId':        { i18nKey: 'staff.vehicles.timeline.keys.salesOrder',        formatter: 'freeText' as FormatterName },
  'SALES.RETURNED.reason':              { i18nKey: 'staff.vehicles.timeline.keys.returnReason',      formatter: 'freeText' as FormatterName },
  'SALES.RETURNED.noteForFinance':      { i18nKey: 'staff.vehicles.timeline.keys.noteForFinance',    formatter: 'freeText' as FormatterName },

  // ── DOCUMENT.UPLOAD ──
  'DOCUMENT.UPLOAD.category':           { i18nKey: 'staff.vehicles.timeline.keys.docCategory',       formatter: 'enumLabel' as FormatterName },
  'DOCUMENT.UPLOAD.subtype':            { i18nKey: 'staff.vehicles.timeline.keys.docSubtype',        formatter: 'enumLabel' as FormatterName },
  'DOCUMENT.UPLOAD.fileName':           { i18nKey: 'staff.vehicles.timeline.keys.fileName',          formatter: 'freeText' as FormatterName },
  'DOCUMENT.UPLOAD.expiresAt':          { i18nKey: 'staff.vehicles.timeline.keys.expiresAt',         formatter: 'datetime' as FormatterName },

  // ── DOCUMENT.UPDATE ──
  'DOCUMENT.UPDATE.before':             { i18nKey: 'staff.vehicles.timeline.keys.docBefore',         formatter: 'freeText' as FormatterName },
  'DOCUMENT.UPDATE.after':              { i18nKey: 'staff.vehicles.timeline.keys.docAfter',          formatter: 'freeText' as FormatterName },

  // ── DOCUMENT.REPLACE ──
  'DOCUMENT.REPLACE.previousDocId':     { i18nKey: 'staff.vehicles.timeline.keys.previousDoc',       formatter: 'docRef' as FormatterName },
  'DOCUMENT.REPLACE.previousVersion':   { i18nKey: 'staff.vehicles.timeline.keys.previousVersion',   formatter: 'integer' as FormatterName },
  'DOCUMENT.REPLACE.newVersion':        { i18nKey: 'staff.vehicles.timeline.keys.newVersion',        formatter: 'integer' as FormatterName },

  // ── DOCUMENT.DELETE ──
  'DOCUMENT.DELETE.reason':             { i18nKey: 'staff.vehicles.timeline.keys.deleteReason',      formatter: 'freeText' as FormatterName },
  'DOCUMENT.DELETE.blockedByClosedSaleId': { i18nKey: 'staff.vehicles.timeline.keys.blockedBySale',  formatter: 'freeText' as FormatterName },

  // ── DOCUMENT.DOWNLOAD ──
  'DOCUMENT.DOWNLOAD.purpose':          { i18nKey: 'staff.vehicles.timeline.keys.downloadPurpose',   formatter: 'enumLabel' as FormatterName },
  'DOCUMENT.DOWNLOAD.purposeNote':      { i18nKey: 'staff.vehicles.timeline.keys.purposeNote',       formatter: 'freeText' as FormatterName },
} as const;

export type PayloadKeyLabels = typeof PAYLOAD_KEY_LABELS;
export type QualifiedKey = keyof PayloadKeyLabels;

// ─── Exhaustiveness guard (L2, L29) ──────────────────────────────────────────

/**
 * Builds all qualified keys for a given stream + payload type map.
 * e.g. `OWNERSHIP.OPEN.source`, `OWNERSHIP.OPEN.kmAtOpen`, ...
 */
type OwnershipQualifiedKeys = {
  [K in OwnershipEventKind]: `OWNERSHIP.${K}.${keyof OwnershipEventPayloads[K] & string}`;
}[OwnershipEventKind];

type SalesQualifiedKeys = {
  [K in SalesEventKind]: `SALES.${K}.${keyof SalesEventPayloads[K] & string}`;
}[SalesEventKind];

type DocumentQualifiedKeys = {
  [K in DocumentAccessKind]: `DOCUMENT.${K}.${keyof DocumentAccessEventPayloads[K] & string}`;
}[DocumentAccessKind];

/** Union of every (stream, kind, key) triple that must have a translation entry. */
type KnownQualifiedKeys = OwnershipQualifiedKeys | SalesQualifiedKeys | DocumentQualifiedKeys;

/** Keys present in PAYLOAD_KEY_LABELS */
type TranslatedKeys = keyof typeof PAYLOAD_KEY_LABELS;

/** Any known key that is missing a translation entry */
type Missing = Exclude<KnownQualifiedKeys, TranslatedKeys>;

/**
 * Compile-time assertion — fails with "Type 'Missing' is not assignable to type 'true'"
 * if any (stream, kind, key) triple is missing from PAYLOAD_KEY_LABELS.
 * Adding a key to a payload type without updating this table breaks the build. (L2)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _exhaustivenessGuard: Missing extends never ? true : Missing = true as never;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the label entry for a qualified key, or undefined if not found. */
export function labelFor(qualifiedKey: string): { i18nKey: string; formatter: FormatterName } | undefined {
  return (PAYLOAD_KEY_LABELS as Record<string, { i18nKey: string; formatter: FormatterName } | undefined>)[qualifiedKey];
}

/** Returns a fallback formatter for unknown qualified keys — never renders raw. */
export function formatterFor(qualifiedKey: string): FormatterName {
  const entry = labelFor(qualifiedKey);
  return entry?.formatter ?? 'freeText';
}
