/**
 * PLAN-VEHICLES-003 Phase 3 — unit tests.
 *
 * Covers (spec §8 P3 minimums):
 * 1. 5 DocumentAccessKind emission tests (UPLOAD/UPDATE/REPLACE/DELETE/DOWNLOAD)
 * 2. Purpose required for PII-heavy category (S-V3-9)
 * 3. Immutable-delete block on SOLD-linked doc (S-V3-10, L14)
 * 4. Replace increments version + sets supersededBy (S-V3-11)
 * 5. Soft-delete sets deletedAt + emits DELETE event with audit
 * 6. Expiry chip boundary (S-V3-13) — expired / warning-30d / null
 * 7. Activity feed ordering — newest-first (L33)
 * 8. Purpose chip on DOWNLOAD event in feed (S-V3-24)
 * 9. Portal supersededBy renders as boolean-only (L27)
 *
 * Spec reference: PLAN-VEHICLES-003 P3 §8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVehiclesStore } from '../lib/vehicles/vehicles-store';
import { ImmutableDocumentError, PurposeRequiredError } from '../lib/vehicles/vehicles-store/slices/docs-mutations';
import { documentExpiryChip } from '@dms/vehicles-core';
import type { Document } from '@dms/types';
import type { AddDocumentInput, AllDocumentCategory } from '../lib/vehicles/vehicles-store/slices/docs-mutations';

// ─── Inline portal adapter helpers (L27) — mirrors customer-web adapter ───────
// These are test-local copies so staff-web tests don't depend on customer-web app.

interface PortalDocumentView {
  id: string; vehicleVin: string; vehicleName: string; type: Document['type'];
  name: string; uploadedAt: string; expiresAt?: string; fileUrl: string;
  fileSize: string; isReplaced: boolean;
}

function toPortalDocumentView(doc: Document): PortalDocumentView {
  const { supersededBy: _stripped, ...rest } = doc;
  return { ...rest, isReplaced: Boolean(doc.supersededBy) };
}

function buildPortalDocumentViews(docs: Document[]): PortalDocumentView[] {
  return docs.filter((d) => !d.supersededBy).map(toPortalDocumentView).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTOR = { id: 'staff-r09-001', name: 'Priya Sharma', role: 'R09' };
const R12_ACTOR = { id: 'staff-r12-001', name: 'Vikram Singh', role: 'R12' };
const VIN = 'WP0AB2A91MS247831';

function resetStore() {
  useVehiclesStore.setState({
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    salesEvents: {},
    documents: {},
    staffMeta: {},
    documentAccessEvents: [],
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: false,
  });
}

function addTestDoc(overrides: Partial<AddDocumentInput> = {}) {
  return useVehiclesStore.getState().addDocument({
    vin: VIN,
    type: 'puc',
    category: 'cpo-certificate',
    name: 'CPO_Certificate.pdf',
    fileUrl: '/api/docs/cpo.pdf',
    fileSize: '1.2 MB',
    ...overrides,
  }, ACTOR);
}

// ─── 1. DocumentAccessKind emission tests ─────────────────────────────────────

describe('DocumentAccessKind emissions', () => {
  beforeEach(() => resetStore());

  it('UPLOAD — emits event with correct kind', () => {
    addTestDoc();
    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('UPLOAD');
    expect(events[0]?.vin).toBe(VIN);
  });

  it('UPDATE — emits UPDATE event', () => {
    const docId = addTestDoc();
    useVehiclesStore.getState().updateDocumentMeta(
      { docId, expiresAt: new Date(Date.now() + 90 * 86400000).toISOString() },
      ACTOR,
    );
    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    const updateEvent = events.find((e) => e.kind === 'UPDATE');
    expect(updateEvent).toBeDefined();
    expect(updateEvent?.docId).toBe(docId);
  });

  it('REPLACE — emits REPLACE event and sets supersededBy', () => {
    const oldDocId = addTestDoc();
    const newDocId = useVehiclesStore.getState().replaceDocument(
      oldDocId,
      { vin: VIN, type: 'puc', category: 'cpo-certificate', name: 'CPO_v2.pdf', fileUrl: '/api/docs/cpo-v2.pdf', fileSize: '1.3 MB' },
      ACTOR,
    );

    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    const replaceEvent = events.find((e) => e.kind === 'REPLACE');
    expect(replaceEvent).toBeDefined();
    expect(replaceEvent?.docId).toBe(oldDocId);

    const oldDoc = useVehiclesStore.getState().documents[oldDocId];
    expect(oldDoc?.supersededBy).toBe(newDocId);
    expect(newDocId).not.toBe(oldDocId);
  });

  it('DELETE — emits DELETE event and sets deletedAt', () => {
    const docId = addTestDoc();
    useVehiclesStore.getState().softDeleteDocument(docId, 'test deletion', R12_ACTOR);

    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    const deleteEvent = events.find((e) => e.kind === 'DELETE');
    expect(deleteEvent).toBeDefined();

    const meta = useVehiclesStore.getState().staffMeta[docId];
    expect(meta?.deletedAt).toBeDefined();
  });

  it('DOWNLOAD — emits DOWNLOAD event with purpose', () => {
    const docId = addTestDoc();
    useVehiclesStore.getState().recordDownload(
      docId,
      VIN,
      'RTO_FILING',
      undefined,
      ACTOR,
    );
    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    const downloadEvent = events.find((e) => e.kind === 'DOWNLOAD');
    expect(downloadEvent).toBeDefined();
    expect(downloadEvent?.purpose).toBe('RTO_FILING');
  });
});

// ─── 2. Purpose required (S-V3-9) ────────────────────────────────────────────

describe('PurposeRequiredError for PII-heavy categories (S-V3-9)', () => {
  beforeEach(() => resetStore());

  it('upload of rc without purposeOfCollection throws PurposeRequiredError', () => {
    expect(() =>
      useVehiclesStore.getState().addDocument({
        vin: VIN,
        type: 'rc',
        category: 'rc' as AllDocumentCategory,
        name: 'RC.pdf',
        fileUrl: '/api/rc.pdf',
        fileSize: '1.0 MB',
        // no purposeOfCollection
      }, ACTOR),
    ).toThrow(PurposeRequiredError);
  });

  it('upload of rc WITH purposeOfCollection succeeds', () => {
    expect(() =>
      useVehiclesStore.getState().addDocument({
        vin: VIN,
        type: 'rc',
        category: 'rc' as AllDocumentCategory,
        name: 'RC.pdf',
        fileUrl: '/api/rc.pdf',
        fileSize: '1.0 MB',
        purposeOfCollection: 'Required for RTO transfer',
      }, ACTOR),
    ).not.toThrow();
  });

  it('upload of cpo-certificate without purpose succeeds (not PII-heavy)', () => {
    expect(() => addTestDoc()).not.toThrow();
  });
});

// ─── 3. Immutable delete block (S-V3-10, L14) ────────────────────────────────

describe('ImmutableDocumentError — SOLD-linked doc (S-V3-10)', () => {
  beforeEach(() => resetStore());

  it('softDelete of doc linked to a SOLD sales order throws ImmutableDocumentError', () => {
    const docId = addTestDoc();

    // Link doc to a sales order
    useVehiclesStore.getState().markSupporting(docId, 'so-sold-001', ACTOR);

    // Inject a SOLD SalesEvent with that salesOrderId
    useVehiclesStore.setState((s) => ({
      ...s,
      salesEvents: {
        [VIN]: [{
          id: 'se-001', vin: VIN, at: new Date().toISOString(),
          kind: 'SOLD', actorId: ACTOR.id, actorRole: 'R09',
          payload: { salesOrderId: 'so-sold-001', finalPrice: 5000000, flow: 'MARGIN_SCHEME', tcsCollected: 0, sellerSignatures: [], buyerCustomerId: 'cust-001' },
          schemaVersion: 'v1',
        }],
      },
    }));

    expect(() =>
      useVehiclesStore.getState().softDeleteDocument(docId, 'trying to delete', R12_ACTOR),
    ).toThrow(ImmutableDocumentError);

    // deletedAt must remain unset (doc not actually deleted)
    const meta = useVehiclesStore.getState().staffMeta[docId];
    expect(meta?.deletedAt).toBeUndefined();

    // But a DELETE event IS emitted with blockedByClosedSaleId
    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    const deleteEvent = events.find((e) => e.kind === 'DELETE');
    expect(deleteEvent).toBeDefined();
    expect((deleteEvent?.payload as Record<string, unknown>)?.blockedByClosedSaleId).toBe('so-sold-001');
  });
});

// ─── 4. Replace versioning (S-V3-11) ─────────────────────────────────────────

describe('Replace versioning (S-V3-11)', () => {
  beforeEach(() => resetStore());

  it('replaceDocument increments version from 1 to 2 and sets supersededBy', () => {
    const oldDocId = addTestDoc();

    const newDocId = useVehiclesStore.getState().replaceDocument(
      oldDocId,
      { vin: VIN, type: 'puc', category: 'cpo-certificate', name: 'CPO_v2.pdf', fileUrl: '/x.pdf', fileSize: '1.0 MB' },
      ACTOR,
    );

    const newMeta = useVehiclesStore.getState().staffMeta[newDocId];
    expect(newMeta?.version).toBe(2);

    const oldDoc = useVehiclesStore.getState().documents[oldDocId];
    expect(oldDoc?.supersededBy).toBe(newDocId);
  });
});

// ─── 5. Soft-delete with audit ────────────────────────────────────────────────

describe('Soft-delete with audit trail', () => {
  beforeEach(() => resetStore());

  it('sets deletedAt on staffMeta and emits DELETE event', () => {
    const docId = addTestDoc();
    useVehiclesStore.getState().softDeleteDocument(docId, 'wrong file', R12_ACTOR);

    const meta = useVehiclesStore.getState().staffMeta[docId];
    expect(meta?.deletedAt).toBeDefined();

    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    const deleteEvent = events.find((e) => e.kind === 'DELETE');
    expect(deleteEvent?.actorId).toBe(R12_ACTOR.id);
    expect((deleteEvent?.payload as Record<string, unknown>)?.reason).toBe('wrong file');
  });
});

// ─── 6. Expiry chip boundary (S-V3-13) ───────────────────────────────────────

describe('documentExpiryChip boundary (S-V3-13)', () => {
  const NOW = '2026-04-28T12:00:00.000Z';

  it('expired — expiresAt in the past → "expired"', () => {
    expect(documentExpiryChip('2026-04-01T00:00:00.000Z', NOW)).toBe('expired');
  });

  it('expiring in 15 days → "warning-30d"', () => {
    const d = new Date('2026-04-28T12:00:00.000Z');
    d.setDate(d.getDate() + 15);
    expect(documentExpiryChip(d.toISOString(), NOW)).toBe('warning-30d');
  });

  it('expiring in 35 days → null (no chip)', () => {
    const d = new Date('2026-04-28T12:00:00.000Z');
    d.setDate(d.getDate() + 35);
    expect(documentExpiryChip(d.toISOString(), NOW)).toBeNull();
  });

  it('no expiresAt → null', () => {
    expect(documentExpiryChip(undefined, NOW)).toBeNull();
  });
});

// ─── 7+8. Activity feed ordering + purpose chip (S-V3-24) ────────────────────

describe('DocumentAccessEvent Activity feed (S-V3-24)', () => {
  beforeEach(() => resetStore());

  it('events are returned newest-first (L33)', () => {
    const docId = addTestDoc(); // emits UPLOAD
    useVehiclesStore.getState().recordDownload(docId, VIN, 'AUDIT', undefined, ACTOR);

    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    // Newest (DOWNLOAD) should be first
    expect(events[0]?.kind).toBe('DOWNLOAD');
    expect(events[1]?.kind).toBe('UPLOAD');
  });

  it('DOWNLOAD event carries purpose field (S-V3-24)', () => {
    const docId = addTestDoc();
    useVehiclesStore.getState().recordDownload(docId, VIN, 'RTO_FILING', undefined, ACTOR);

    const events = useVehiclesStore.getState().selectDocumentAccessEvents(VIN);
    const downloadEvent = events.find((e) => e.kind === 'DOWNLOAD');
    expect(downloadEvent?.purpose).toBe('RTO_FILING');
    expect(downloadEvent?.actorId).toBe(ACTOR.id);
  });
});

// ─── 9. Portal supersededBy boolean-only (L27) ───────────────────────────────

describe('Portal supersededBy → isReplaced boolean (L27)', () => {
  it('toPortalDocumentView converts supersededBy id → isReplaced: true', () => {
    const doc: Document = {
      id: 'doc-001',
      vehicleVin: VIN,
      vehicleName: 'Porsche 911',
      type: 'rc',
      name: 'RC.pdf',
      uploadedAt: '2026-01-01T00:00:00.000Z',
      fileUrl: '/api/rc.pdf',
      fileSize: '1.0 MB',
      supersededBy: 'doc-002',  // has a replacement
    };

    const view = toPortalDocumentView(doc);
    // L27: id NEVER exposed; only boolean
    expect(view.isReplaced).toBe(true);
    expect(view).not.toHaveProperty('supersededBy');
  });

  it('toPortalDocumentView: doc without supersededBy → isReplaced: false', () => {
    const doc: Document = {
      id: 'doc-001',
      vehicleVin: VIN,
      vehicleName: 'Porsche 911',
      type: 'rc',
      name: 'RC.pdf',
      uploadedAt: '2026-01-01T00:00:00.000Z',
      fileUrl: '/api/rc.pdf',
      fileSize: '1.0 MB',
    };

    const view = toPortalDocumentView(doc);
    expect(view.isReplaced).toBe(false);
    expect(view).not.toHaveProperty('supersededBy');
  });

  it('buildPortalDocumentViews filters out superseded versions', () => {
    const docs: Document[] = [
      {
        id: 'doc-001',
        vehicleVin: VIN, vehicleName: 'X', type: 'rc', name: 'RC_v1.pdf',
        uploadedAt: '2026-01-01T00:00:00.000Z',
        fileUrl: '/rc-v1.pdf', fileSize: '1 MB',
        supersededBy: 'doc-002',  // old version — should be excluded from portal
      },
      {
        id: 'doc-002',
        vehicleVin: VIN, vehicleName: 'X', type: 'rc', name: 'RC_v2.pdf',
        uploadedAt: '2026-02-01T00:00:00.000Z',
        fileUrl: '/rc-v2.pdf', fileSize: '1 MB',
        // no supersededBy — current version
      },
    ];

    const views = buildPortalDocumentViews(docs);
    // Only current version (doc-002) shown
    expect(views).toHaveLength(1);
    expect(views[0]?.id).toBe('doc-002');
    expect(views[0]?.isReplaced).toBe(false);
  });
});
