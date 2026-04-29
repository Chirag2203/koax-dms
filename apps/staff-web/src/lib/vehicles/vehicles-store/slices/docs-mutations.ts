'use client';

/**
 * docs-mutations — document CRUD actions for the vehicles store.
 *
 * THREE-WAY SPLIT (L31): this file owns write operations only.
 * State selectors live in docs-slice.ts; event emission in docs-access-emitter.ts.
 *
 * Immutable-after-sale guard (L14):
 *   softDeleteDocument is blocked if the document is linked to a SOLD sales order.
 *   The store throws ImmutableDocumentError; the UI shows a blocked dialog.
 *
 * Purpose-of-collection guard (S-V3-9):
 *   addDocument throws PurposeRequiredError for PII-heavy categories without
 *   purposeOfCollection.
 *
 * Spec reference: PLAN-VEHICLES-003 §3.1, L9, L14, L22, L31
 * LoC budget: ≤180
 */

import type { Document, StaffDocumentMetadata, StaffDocumentCategory } from '@dms/types';
import type { VehiclesStore } from '../types';
import type { Actor } from '../types';
import type { StateCreator } from 'zustand';
import { emitDocAccessEvent, requiresDownloadPurpose } from './docs-access-emitter';
import { makeEventId, now } from '../id-helpers';

// ─── Error classes ────────────────────────────────────────────────────────────

export class ImmutableDocumentError extends Error {
  readonly docId: string;
  readonly salesOrderId: string;
  constructor(docId: string, salesOrderId: string) {
    super(
      `Document ${docId} is linked to closed sales order ${salesOrderId}. ` +
      'Delete is blocked per L14 immutable-after-sale guard.',
    );
    this.name = 'ImmutableDocumentError';
    this.docId = docId;
    this.salesOrderId = salesOrderId;
  }
}

export class PurposeRequiredError extends Error {
  readonly category: string;
  constructor(category: string) {
    super(`purposeOfCollection is required for PII-heavy category '${category}' (S-V3-9).`);
    this.name = 'PurposeRequiredError';
    this.category = category;
  }
}

// ─── Input types ──────────────────────────────────────────────────────────────

/** All valid document categories — both staff-only and portal-visible types */
export type AllDocumentCategory = StaffDocumentCategory | Document['type'];

export interface AddDocumentInput {
  vin: string;
  type: Document['type'];
  /** StaffDocumentCategory for staff-only docs; Document['type'] for portal-visible. */
  category: AllDocumentCategory;
  name: string;
  fileUrl: string;
  fileSize: string;
  subtype?: 'financier' | 'rto';
  expiresAt?: string;
  purposeOfCollection?: string;
}

export interface UpdateDocumentMetaInput {
  docId: string;
  expiresAt?: string;
  purposeOfCollection?: string;
}

// ─── Mutations action interface ───────────────────────────────────────────────

export interface DocsMutations {
  /**
   * Upload a new document.
   * Throws PurposeRequiredError for PII-heavy categories without purposeOfCollection (S-V3-9).
   * Emits UPLOAD DocumentAccessEvent.
   */
  addDocument(input: AddDocumentInput, actor: Actor): string; // returns docId

  /**
   * Replace a document with a new version.
   * Sets old.supersededBy = newDocId (L22).
   * Increments version (S-V3-11).
   * Emits REPLACE DocumentAccessEvent on old doc + UPLOAD on new.
   */
  replaceDocument(
    oldDocId: string,
    input: AddDocumentInput,
    actor: Actor,
  ): string; // returns new docId

  /**
   * Update document metadata (expiresAt, purposeOfCollection).
   * Emits UPDATE DocumentAccessEvent.
   */
  updateDocumentMeta(input: UpdateDocumentMetaInput, actor: Actor): void;

  /**
   * Soft-delete a document. Sets staffMeta.deletedAt.
   * BLOCKED if supportingSalesOrderId && salesOrderIsSold(id) — throws ImmutableDocumentError (L14).
   * Emits DELETE DocumentAccessEvent regardless (with blockedByClosedSaleId if blocked).
   */
  softDeleteDocument(docId: string, reason: string | undefined, actor: Actor): void;

  /**
   * Mark a document as supporting a specific sales order (e.g. for RC transfer).
   * Used when a document is attached to a sales order during SOLD flow.
   */
  markSupporting(docId: string, salesOrderId: string, actor: Actor): void;

  /**
   * Download handler — emits DOWNLOAD DocumentAccessEvent.
   * For PII-heavy categories, purpose is required (L13).
   */
  recordDownload(
    docId: string,
    vin: string,
    purpose?: 'CUSTOMER_HANDOFF' | 'AUDIT' | 'RTO_FILING' | 'OTHER',
    purposeNote?: string,
    actor?: Actor,
  ): void;

  /**
   * Bulk-seed documents + staffMeta from fixtures (hydrator Phase D).
   */
  hydrateDocuments(
    docs: Document[],
    meta: StaffDocumentMetadata[],
  ): void;
}

// ─── Slice factory ────────────────────────────────────────────────────────────

export type DocsMutationsSlice = StateCreator<
  VehiclesStore,
  [['zustand/immer', never]],
  [],
  DocsMutations
>;

export const createDocsMutations: DocsMutationsSlice = (set, get) => ({
  addDocument(input: AddDocumentInput, actor: Actor): string {
    // S-V3-9: Purpose required for PII-heavy categories
    if (requiresDownloadPurpose(input.category) && !input.purposeOfCollection) {
      throw new PurposeRequiredError(input.category);
    }

    const docId = `doc-${makeEventId()}`;
    const uploadedAt = now();

    set((state) => {
      // Insert Document (portal-shared entity)
      state.documents[docId] = {
        id: docId,
        vehicleVin: input.vin,
        vehicleName: '',       // resolved at display time from vehicles map
        type: input.type,
        name: input.name,
        uploadedAt,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
      };

      // Insert StaffDocumentMetadata (staff-only, L9)
      state.staffMeta[docId] = {
        docId,
        version: 1,
        ...(input.subtype ? { subtype: input.subtype } : {}),
        ...(input.purposeOfCollection ? { purposeOfCollection: input.purposeOfCollection } : {}),
        schemaVersion: 'v1',
      };

      // Emit UPLOAD event (L28 validation inside emitDocAccessEvent)
      emitDocAccessEvent(
        state,
        input.vin,
        docId,
        'UPLOAD',
        {
          category: input.category,
          ...(input.subtype ? { subtype: input.subtype } : {}),
          fileName: input.name,
          ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        },
        actor,
      );
    });

    return docId;
  },

  replaceDocument(oldDocId: string, input: AddDocumentInput, actor: Actor): string {
    const oldMeta = get().staffMeta[oldDocId];
    const oldVersion = oldMeta?.version ?? 1;
    const newVersion = oldVersion + 1;

    const newDocId = `doc-${makeEventId()}`;
    const uploadedAt = now();

    set((state) => {
      // Mark old doc as superseded (L22)
      if (state.documents[oldDocId]) {
        state.documents[oldDocId]!.supersededBy = newDocId;
      }

      // Create new document
      state.documents[newDocId] = {
        id: newDocId,
        vehicleVin: input.vin,
        vehicleName: '',
        type: input.type,
        name: input.name,
        uploadedAt,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
      };

      // Staff metadata for new doc
      state.staffMeta[newDocId] = {
        docId: newDocId,
        version: newVersion,
        ...(input.subtype ? { subtype: input.subtype } : {}),
        ...(input.purposeOfCollection ? { purposeOfCollection: input.purposeOfCollection } : {}),
        schemaVersion: 'v1',
      };

      // Emit REPLACE event on old doc
      emitDocAccessEvent(
        state,
        input.vin,
        oldDocId,
        'REPLACE',
        { previousDocId: oldDocId, previousVersion: oldVersion, newVersion },
        actor,
      );
    });

    return newDocId;
  },

  updateDocumentMeta(input: UpdateDocumentMetaInput, actor: Actor): void {
    const doc = get().documents[input.docId];
    if (!doc) return;

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const meta = get().staffMeta[input.docId];

    if (input.expiresAt !== undefined) {
      before['expiresAt'] = doc.expiresAt;
      after['expiresAt'] = input.expiresAt;
    }
    if (input.purposeOfCollection !== undefined && meta) {
      before['purposeOfCollection'] = meta.purposeOfCollection;
      after['purposeOfCollection'] = input.purposeOfCollection;
    }

    set((state) => {
      if (input.expiresAt !== undefined && state.documents[input.docId]) {
        state.documents[input.docId]!.expiresAt = input.expiresAt;
      }
      if (input.purposeOfCollection !== undefined && state.staffMeta[input.docId]) {
        state.staffMeta[input.docId]!.purposeOfCollection = input.purposeOfCollection;
      }

      emitDocAccessEvent(
        state,
        state.documents[input.docId]?.vehicleVin ?? '',
        input.docId,
        'UPDATE',
        { before, after },
        actor,
      );
    });
  },

  softDeleteDocument(docId: string, reason: string | undefined, actor: Actor): void {
    const meta = get().staffMeta[docId];
    const doc = get().documents[docId];
    if (!doc) return;

    // L14: blocked if linked to a closed (SOLD) sales order
    if (meta?.supportingSalesOrderId && get().salesOrderIsSold(meta.supportingSalesOrderId)) {
      // Emit DELETE event with blockedByClosedSaleId — but do NOT set deletedAt
      set((state) => {
        emitDocAccessEvent(
          state,
          doc.vehicleVin,
          docId,
          'DELETE',
          {
            reason,
            blockedByClosedSaleId: meta.supportingSalesOrderId,
          },
          actor,
        );
      });
      throw new ImmutableDocumentError(docId, meta.supportingSalesOrderId);
    }

    set((state) => {
      if (state.staffMeta[docId]) {
        state.staffMeta[docId]!.deletedAt = now();
      } else {
        state.staffMeta[docId] = {
          docId,
          version: 1,
          deletedAt: now(),
          schemaVersion: 'v1',
        };
      }

      emitDocAccessEvent(
        state,
        doc.vehicleVin,
        docId,
        'DELETE',
        { reason },
        actor,
      );
    });
  },

  markSupporting(docId: string, salesOrderId: string, _actor: Actor): void {
    set((state) => {
      if (state.staffMeta[docId]) {
        state.staffMeta[docId]!.supportingSalesOrderId = salesOrderId;
      }
    });
  },

  recordDownload(
    docId: string,
    vin: string,
    purpose?: 'CUSTOMER_HANDOFF' | 'AUDIT' | 'RTO_FILING' | 'OTHER',
    purposeNote?: string,
    actor?: Actor,
  ): void {
    if (!actor) return;
    set((state) => {
      emitDocAccessEvent(
        state,
        vin,
        docId,
        'DOWNLOAD',
        {
          ...(purpose !== undefined ? { purpose } : {}),
          ...(purposeNote !== undefined ? { purposeNote } : {}),
        },
        actor,
        purpose,
        purposeNote,
      );
    });
  },

  hydrateDocuments(docs: Document[], meta: StaffDocumentMetadata[]): void {
    set((state) => {
      for (const doc of docs) {
        if (!state.documents[doc.id]) {
          state.documents[doc.id] = { ...doc };
        }
      }
      for (const m of meta) {
        if (!state.staffMeta[m.docId]) {
          state.staffMeta[m.docId] = { ...m };
        }
      }
    });
  },
});
