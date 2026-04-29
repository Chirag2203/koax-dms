'use client';

/**
 * docs-slice — state shape + pure selectors for documents.
 *
 * THREE-WAY SPLIT (L31, spec-review concern #2):
 *   docs-slice.ts       (this file) — state + pure selectors ≤160 LoC
 *   docs-mutations.ts                — addDocument / replaceDocument / etc. ≤180 LoC
 *   docs-access-emitter.ts           — emitDocAccessEvent side-effect ≤120 LoC
 *
 * State:
 *   documents:             Record<docId, Document>
 *   staffMeta:             Record<docId, StaffDocumentMetadata>
 *   documentAccessEvents:  DocumentAccessEvent[]
 *
 * Spec reference: PLAN-VEHICLES-003 §3.1, L9, L31
 * LoC budget: ≤160
 */

import type { Document, StaffDocumentMetadata, DocumentAccessEvent } from '@dms/types';
import type { VehiclesStore, VehiclesState } from '../types';
import type { StateCreator } from 'zustand';

// ─── Slice state (owned by this slice) ───────────────────────────────────────

export interface DocsState {
  /** All document entities keyed by docId. Includes superseded + soft-deleted. */
  documents: Record<string, Document>;
  /** Staff-only metadata sibling, keyed by docId (L9). */
  staffMeta: Record<string, StaffDocumentMetadata>;
  /** Append-only access-event log across all VIN documents. */
  documentAccessEvents: DocumentAccessEvent[];
}

// ─── Selector actions ─────────────────────────────────────────────────────────

export interface DocsSelectors {
  /**
   * Returns all non-deleted Documents for a VIN, newest first.
   * R05+ can see list + expiry chips; preview/download gated in UI.
   */
  selectDocuments(vin: string): Document[];

  /**
   * Returns all Documents for a VIN including soft-deleted and superseded.
   * Used for "Older versions" disclosure (L22).
   */
  selectAllDocuments(vin: string): Document[];

  /** Returns StaffDocumentMetadata for a docId (undefined if not loaded). */
  selectStaffMeta(docId: string): StaffDocumentMetadata | undefined;

  /**
   * Returns DocumentAccessEvents for a given VIN, newest-first (L33).
   * R09+ required — enforced in UI via Gate.
   */
  selectDocumentAccessEvents(vin: string): DocumentAccessEvent[];

  /**
   * Returns whether the sales order linked to a doc is in SOLD state.
   * Used by softDeleteDocument guard (L14).
   */
  salesOrderIsSold(salesOrderId: string): boolean;
}

// ─── Slice factory ────────────────────────────────────────────────────────────

export type DocsSliceType = StateCreator<
  VehiclesStore,
  [['zustand/immer', never]],
  [],
  DocsSelectors
>;

export const createDocsSlice: DocsSliceType = (_set, get) => ({
  selectDocuments(vin: string): Document[] {
    const state = get();
    return Object.values(state.documents)
      .filter((d) => {
        if (d.vehicleVin !== vin) return false;
        const meta = state.staffMeta[d.id];
        // Exclude soft-deleted docs from the primary list
        if (meta?.deletedAt) return false;
        return true;
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  },

  selectAllDocuments(vin: string): Document[] {
    const state = get();
    return Object.values(state.documents)
      .filter((d) => d.vehicleVin === vin)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  },

  selectStaffMeta(docId: string): StaffDocumentMetadata | undefined {
    return get().staffMeta[docId];
  },

  selectDocumentAccessEvents(vin: string): DocumentAccessEvent[] {
    const allEvents = get().documentAccessEvents;
    const vinEvents = allEvents
      .map((e, idx) => ({ event: e, idx }))
      .filter(({ event }) => event.vin === vin);

    // Sort newest-first; use insertion index as tiebreaker for same timestamp (L33)
    vinEvents.sort((a, b) => {
      const timeDiff = b.event.at.localeCompare(a.event.at);
      if (timeDiff !== 0) return timeDiff;
      return b.idx - a.idx; // higher insertion index = more recent
    });

    return vinEvents.map(({ event }) => event);
  },

  salesOrderIsSold(salesOrderId: string): boolean {
    // Derive from the SalesEvents stream: look for a SOLD event with this salesOrderId.
    const state = get();
    for (const events of Object.values(state.salesEvents)) {
      for (const event of events ?? []) {
        if (
          event.kind === 'SOLD' &&
          (event.payload as Record<string, unknown>)?.salesOrderId === salesOrderId
        ) {
          return true;
        }
      }
    }
    return false;
  },
});
