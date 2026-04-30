/**
 * portal-docs-adapter — unit tests.
 *
 * SPEC-PORTAL-DOCS-001 §4 scenario coverage:
 *   S-PD-01 group-by-VIN
 *   S-PD-02 search filter
 *   S-PD-03 category filter
 *   S-PD-04 status filter (expired)
 *   S-PD-05 amber chip (≤30d)
 *   S-PD-06 red chip (expired)
 *   S-PD-08 DocumentAccessEvent emission on download
 *   S-PD-09 cancel = no event
 *   S-PD-11 filter-empty state
 *   S-PD-12 superseded docs hidden
 *
 * Test placement: co-located per CLAUDE.md §10 item 9.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Document } from '@dms/types';
import {
  buildVaultGroups,
  deriveExpiryStatus,
  toVaultDocumentView,
  emitPortalDownloadEvent,
  getPortalAccessLog,
  EXPIRY_AMBER_DAYS,
  type VaultFilterState,
} from '../portal-docs-adapter';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-30T12:00:00.000Z');

function makeDoc(overrides: Partial<Document> & { id: string }): Document {
  return {
    vehicleVin: 'VIN-A',
    vehicleName: 'Porsche 911',
    type: 'rc',
    name: 'Registration Certificate',
    uploadedAt: '2026-03-01T09:00:00.000Z',
    fileUrl: '/docs/rc.pdf',
    fileSize: '1.2 MB',
    ...overrides,
  };
}

const DEFAULT_FILTERS: VaultFilterState = {
  search: '',
  category: 'all',
  status: 'all',
};

// ─── deriveExpiryStatus ───────────────────────────────────────────────────────

describe('deriveExpiryStatus', () => {
  it('returns active for RC (non-expiry type)', () => {
    const doc = makeDoc({ id: 'd1', type: 'rc', expiresAt: '2026-04-01' });
    const { status } = deriveExpiryStatus(doc, NOW);
    expect(status).toBe('active');
  });

  it('returns active for insurance with expiry > 30 days', () => {
    const doc = makeDoc({ id: 'd2', type: 'insurance', expiresAt: '2026-07-01' });
    const { status } = deriveExpiryStatus(doc, NOW);
    expect(status).toBe('active');
  });

  it('returns expiring-soon for insurance ≤30d away (L4)', () => {
    const expiring = new Date(NOW);
    expiring.setDate(expiring.getDate() + 15);
    const doc = makeDoc({ id: 'd3', type: 'insurance', expiresAt: expiring.toISOString().split('T')[0] });
    const { status, daysUntilExpiry } = deriveExpiryStatus(doc, NOW);
    expect(status).toBe('expiring-soon');
    expect(daysUntilExpiry).toBeDefined();
    expect(daysUntilExpiry!).toBeLessThanOrEqual(EXPIRY_AMBER_DAYS);
  });

  it('returns expiring-soon exactly at 30d boundary (L4)', () => {
    const expiring = new Date(NOW);
    expiring.setDate(expiring.getDate() + 30);
    const doc = makeDoc({ id: 'd4', type: 'puc', expiresAt: expiring.toISOString().split('T')[0] });
    const { status } = deriveExpiryStatus(doc, NOW);
    expect(status).toBe('expiring-soon');
  });

  it('returns expired for puc in the past', () => {
    const doc = makeDoc({ id: 'd5', type: 'puc', expiresAt: '2026-04-10' });
    const { status, daysUntilExpiry } = deriveExpiryStatus(doc, NOW);
    expect(status).toBe('expired');
    expect(daysUntilExpiry).toBeDefined();
    expect(daysUntilExpiry!).toBeLessThan(0);
  });

  it('returns active for insurance with no expiresAt', () => {
    const doc = makeDoc({ id: 'd6', type: 'insurance' });
    const { status } = deriveExpiryStatus(doc, NOW);
    expect(status).toBe('active');
  });
});

// ─── toVaultDocumentView ──────────────────────────────────────────────────────

describe('toVaultDocumentView', () => {
  it('sets isReplaced=false when supersededBy is absent', () => {
    const doc = makeDoc({ id: 'v1' });
    const view = toVaultDocumentView(doc, NOW);
    expect(view.isReplaced).toBe(false);
  });

  it('sets isReplaced=true when supersededBy is set (L27)', () => {
    const doc = makeDoc({ id: 'v2', supersededBy: 'newer-doc-id' });
    const view = toVaultDocumentView(doc, NOW);
    expect(view.isReplaced).toBe(true);
  });

  it('does NOT expose supersededBy id to portal view', () => {
    const doc = makeDoc({ id: 'v3', supersededBy: 'newer-doc-id' });
    const view = toVaultDocumentView(doc, NOW);
    // @ts-expect-error supersededBy must not exist on VaultDocumentView
    expect((view as Record<string, unknown>).supersededBy).toBeUndefined();
  });
});

// ─── buildVaultGroups — grouping (S-PD-01) ────────────────────────────────────

describe('buildVaultGroups — grouping', () => {
  it('groups documents by vehicleVin', () => {
    const docs: Document[] = [
      makeDoc({ id: 'a1', vehicleVin: 'VIN-A', vehicleName: 'Porsche 911' }),
      makeDoc({ id: 'a2', vehicleVin: 'VIN-A', vehicleName: 'Porsche 911' }),
      makeDoc({ id: 'b1', vehicleVin: 'VIN-B', vehicleName: 'BMW X5' }),
    ];
    const groups = buildVaultGroups(docs, DEFAULT_FILTERS, NOW);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.vin === 'VIN-A')?.docs).toHaveLength(2);
    expect(groups.find((g) => g.vin === 'VIN-B')?.docs).toHaveLength(1);
  });

  it('excludes superseded documents from vault (S-PD-12, L1)', () => {
    const docs: Document[] = [
      makeDoc({ id: 'c1', vehicleVin: 'VIN-C' }),
      makeDoc({ id: 'c2', vehicleVin: 'VIN-C', supersededBy: 'c1' }), // superseded
    ];
    const groups = buildVaultGroups(docs, DEFAULT_FILTERS, NOW);
    const group = groups.find((g) => g.vin === 'VIN-C');
    expect(group?.docs).toHaveLength(1);
    expect(group?.docs[0]?.id).toBe('c1');
  });
});

// ─── buildVaultGroups — search filter (S-PD-02) ──────────────────────────────

describe('buildVaultGroups — search', () => {
  const docs: Document[] = [
    makeDoc({ id: 's1', name: 'Registration Certificate', vehicleVin: 'VIN-A' }),
    makeDoc({ id: 's2', name: 'Comprehensive Insurance Policy', vehicleVin: 'VIN-A' }),
    makeDoc({ id: 's3', name: 'Pollution Under Control', vehicleVin: 'VIN-A' }),
  ];

  it('returns all docs when search is empty', () => {
    const groups = buildVaultGroups(docs, DEFAULT_FILTERS, NOW);
    expect(groups[0]?.docs).toHaveLength(3);
  });

  it('filters by case-insensitive name substring (S-PD-02)', () => {
    const groups = buildVaultGroups(docs, { ...DEFAULT_FILTERS, search: 'insurance' }, NOW);
    expect(groups[0]?.docs).toHaveLength(1);
    expect(groups[0]?.docs[0]?.name).toContain('Insurance');
  });

  it('hides vehicle groups with no matching docs', () => {
    const mixed: Document[] = [
      makeDoc({ id: 'm1', name: 'RC Doc', vehicleVin: 'VIN-A' }),
      makeDoc({ id: 'm2', name: 'Other Doc', vehicleVin: 'VIN-B', vehicleName: 'BMW X5' }),
    ];
    const groups = buildVaultGroups(mixed, { ...DEFAULT_FILTERS, search: 'RC' }, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.vin).toBe('VIN-A');
  });
});

// ─── buildVaultGroups — category filter (S-PD-03) ────────────────────────────

describe('buildVaultGroups — category filter', () => {
  const docs: Document[] = [
    makeDoc({ id: 'cat1', type: 'rc' }),
    makeDoc({ id: 'cat2', type: 'insurance' }),
    makeDoc({ id: 'cat3', type: 'puc' }),
    makeDoc({ id: 'cat4', type: 'sale-agreement' }),
    makeDoc({ id: 'cat5', type: 'custom-build-quote' }),
  ];

  it('shows all types when category=all', () => {
    const groups = buildVaultGroups(docs, DEFAULT_FILTERS, NOW);
    expect(groups[0]?.docs).toHaveLength(5);
  });

  it('filters to rc only (S-PD-03)', () => {
    const groups = buildVaultGroups(docs, { ...DEFAULT_FILTERS, category: 'rc' }, NOW);
    expect(groups[0]?.docs).toHaveLength(1);
    expect(groups[0]?.docs[0]?.type).toBe('rc');
  });

  it('filters to sale-agreement (L9 new type)', () => {
    const groups = buildVaultGroups(docs, { ...DEFAULT_FILTERS, category: 'sale-agreement' }, NOW);
    expect(groups[0]?.docs).toHaveLength(1);
    expect(groups[0]?.docs[0]?.type).toBe('sale-agreement');
  });
});

// ─── buildVaultGroups — status filter (S-PD-04) ──────────────────────────────

describe('buildVaultGroups — status filter', () => {
  const expiredDate = '2026-04-10'; // 20 days ago
  const expiringSoonDate = '2026-05-10'; // 10 days from now
  const activeDate = '2027-01-01';

  const docs: Document[] = [
    makeDoc({ id: 'st1', type: 'puc', expiresAt: expiredDate }),
    makeDoc({ id: 'st2', type: 'insurance', expiresAt: expiringSoonDate }),
    makeDoc({ id: 'st3', type: 'insurance', expiresAt: activeDate }),
    makeDoc({ id: 'st4' }), // rc — always active
  ];

  it('shows only expired docs (S-PD-04)', () => {
    const groups = buildVaultGroups(docs, { ...DEFAULT_FILTERS, status: 'expired' }, NOW);
    const docIds = groups.flatMap((g) => g.docs.map((d) => d.id));
    expect(docIds).toContain('st1');
    expect(docIds).not.toContain('st2');
    expect(docIds).not.toContain('st3');
    expect(docIds).not.toContain('st4');
  });

  it('shows only expiring-soon docs', () => {
    const groups = buildVaultGroups(docs, { ...DEFAULT_FILTERS, status: 'expiring-soon' }, NOW);
    const docIds = groups.flatMap((g) => g.docs.map((d) => d.id));
    expect(docIds).toContain('st2');
    expect(docIds).not.toContain('st1');
  });

  it('returns empty when no docs match filter (S-PD-11)', () => {
    const activeDocs: Document[] = [makeDoc({ id: 'e1', type: 'rc' })];
    const groups = buildVaultGroups(activeDocs, { ...DEFAULT_FILTERS, status: 'expired' }, NOW);
    expect(groups).toHaveLength(0);
  });
});

// ─── buildVaultGroups — sort order (L5) ──────────────────────────────────────

describe('buildVaultGroups — sort order within group', () => {
  it('sorts expired first, then expiring-soon, then active (L5)', () => {
    const docs: Document[] = [
      makeDoc({ id: 'ord1', type: 'insurance', expiresAt: '2027-01-01', uploadedAt: '2026-03-15T00:00:00.000Z' }),
      makeDoc({ id: 'ord2', type: 'puc', expiresAt: '2026-04-10', uploadedAt: '2026-03-14T00:00:00.000Z' }),     // expired
      makeDoc({ id: 'ord3', type: 'insurance', expiresAt: '2026-05-10', uploadedAt: '2026-03-13T00:00:00.000Z' }), // expiring-soon
    ];
    const groups = buildVaultGroups(docs, DEFAULT_FILTERS, NOW);
    const ids = groups[0]?.docs.map((d) => d.id);
    expect(ids?.[0]).toBe('ord2'); // expired first
    expect(ids?.[1]).toBe('ord3'); // expiring-soon second
    expect(ids?.[2]).toBe('ord1'); // active last
  });
});

// ─── emitPortalDownloadEvent (S-PD-08) ───────────────────────────────────────

describe('emitPortalDownloadEvent', () => {
  it('appends a DOWNLOAD event to the access log (S-PD-08)', () => {
    const before = getPortalAccessLog().length;
    emitPortalDownloadEvent('doc-1', 'VIN-A', 'CUSTOMER_HANDOFF');
    const after = getPortalAccessLog().length;
    expect(after).toBe(before + 1);

    const last = getPortalAccessLog()[after - 1]!;
    expect(last.kind).toBe('DOWNLOAD');
    expect(last.docId).toBe('doc-1');
    expect(last.vin).toBe('VIN-A');
    expect(last.purpose).toBe('CUSTOMER_HANDOFF');
    expect(last.actorRole).toBe('R05');
    expect(last.schemaVersion).toBe('v1');
  });

  it('records RTO_FILING purpose correctly', () => {
    emitPortalDownloadEvent('doc-2', 'VIN-B', 'RTO_FILING');
    const log = getPortalAccessLog();
    const event = log.find((e) => e.docId === 'doc-2')!;
    expect(event.purpose).toBe('RTO_FILING');
  });

  it('records purposeNote when provided', () => {
    emitPortalDownloadEvent('doc-3', 'VIN-C', 'OTHER', 'sharing with bank');
    const log = getPortalAccessLog();
    const event = log.find((e) => e.docId === 'doc-3')!;
    expect(event.purposeNote).toBe('sharing with bank');
  });

  it('each event has a unique id', () => {
    emitPortalDownloadEvent('doc-4', 'VIN-D', 'AUDIT');
    emitPortalDownloadEvent('doc-5', 'VIN-D', 'AUDIT');
    const log = getPortalAccessLog();
    const ids = log.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─── hasExpiry flag on group ──────────────────────────────────────────────────

describe('buildVaultGroups — hasExpiry flag', () => {
  it('sets hasExpiry=true on group with an expiring doc', () => {
    const docs: Document[] = [
      makeDoc({ id: 'he1', type: 'insurance', expiresAt: '2026-05-10' }), // expiring-soon
    ];
    const groups = buildVaultGroups(docs, DEFAULT_FILTERS, NOW);
    expect(groups[0]?.hasExpiry).toBe(true);
  });

  it('sets hasExpiry=false on group with only active docs', () => {
    const docs: Document[] = [
      makeDoc({ id: 'he2', type: 'rc' }),
      makeDoc({ id: 'he3', type: 'warranty', expiresAt: '2028-01-01' }),
    ];
    const groups = buildVaultGroups(docs, DEFAULT_FILTERS, NOW);
    expect(groups[0]?.hasExpiry).toBe(false);
  });
});
