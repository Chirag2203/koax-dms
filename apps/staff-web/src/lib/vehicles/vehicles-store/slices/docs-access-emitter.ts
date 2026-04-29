'use client';

/**
 * docs-access-emitter — pure DocumentAccessEvent emission helper.
 *
 * THREE-WAY SPLIT (L31): this file ONLY appends to documentAccessEvents.
 * No document mutations here — see docs-mutations.ts.
 *
 * Called as a side-effect from docs-mutations after every doc operation.
 * Validates payload via validateDocumentAccessPayload (L28) before write.
 *
 * Spec reference: PLAN-VEHICLES-003 §3.1, L3, L21, L28, L31
 * LoC budget: ≤120
 */

import { validateDocumentAccessPayload } from '@dms/vehicles-core';
import type { DocumentAccessEvent, DocumentAccessKind } from '@dms/types';
import type { Actor } from '../types';
import type { DocsState } from './docs-slice';
import { makeEventId, now } from '../id-helpers';

// ─── emitDocAccessEvent ───────────────────────────────────────────────────────

/**
 * Pure function — appends a validated DocumentAccessEvent to state.
 *
 * Call from inside an immer `set()` callback in docs-mutations.ts.
 * Always validates payload before write (L28).
 *
 * @param state   Immer draft of the slice state that includes documentAccessEvents
 * @param vin     Vehicle VIN the document belongs to
 * @param docId   Document id being acted upon
 * @param kind    DocumentAccessKind (UPLOAD | UPDATE | REPLACE | DELETE | DOWNLOAD)
 * @param payload Per-kind payload — validated by DocumentAccessPayloadValidators
 * @param actor   Staff actor performing the operation
 * @param purpose Optional download purpose — required for PII-heavy categories (L13)
 * @param purposeNote Optional free-text purpose note
 */
export function emitDocAccessEvent(
  state: Pick<DocsState, 'documentAccessEvents'>,
  vin: string,
  docId: string,
  kind: DocumentAccessKind,
  payload: Record<string, unknown>,
  actor: Actor,
  purpose?: 'CUSTOMER_HANDOFF' | 'AUDIT' | 'RTO_FILING' | 'OTHER',
  purposeNote?: string,
): void {
  // L28: validate payload BEFORE writing
  validateDocumentAccessPayload(kind, payload);

  const event: DocumentAccessEvent = {
    id: makeEventId(),
    docId,
    vin,
    kind,
    at: now(),
    actorId: actor.id,
    actorRole: actor.role ?? 'UNKNOWN',
    ...(purpose !== undefined ? { purpose } : {}),
    ...(purposeNote !== undefined ? { purposeNote } : {}),
    payload,
    schemaVersion: 'v1',
  };

  state.documentAccessEvents.push(event);
}

// ─── PII-heavy categories that require download purpose (L13) ────────────────

/**
 * Categories that require a purpose field on DOWNLOAD events (L13).
 * consignment-agreement and sale-agreement are excluded (business docs, not PII-heavy).
 */
export const PII_HEAVY_CATEGORIES = new Set([
  'rc',
  'insurance',
  'noc',
  'form-29-30',
  'tcs-certificate-27d',
]);

/**
 * Returns true if the document category requires a download purpose (L13).
 * Used by the UI to gate download actions and by the download action to validate.
 */
export function requiresDownloadPurpose(category: string): boolean {
  return PII_HEAVY_CATEGORIES.has(category);
}
