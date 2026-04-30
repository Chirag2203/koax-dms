/**
 * portal-docs-adapter — Documents Vault data wiring + DocumentAccessEvent emitter.
 *
 * Single boundary layer between the mock fixture (or future API) and the portal
 * vault UI. Applies:
 *   - Superseded-doc filtering (PLAN-VEHICLES-003 L27 / SPEC-PORTAL-DOCS-001 L1)
 *   - Grouping by vehicleVin
 *   - Expiry status derivation (SPEC-PORTAL-DOCS-001 L4)
 *   - Sort: expiring/expired first within group, then by uploadedAt desc
 *   - Category + status filter application (L7)
 *   - DocumentAccessEvent emission on DOWNLOAD (L2)
 *
 * Spec reference: SPEC-PORTAL-DOCS-001 §3, §L2, §L4, §L7
 */

import type { Document, DownloadPurpose } from '@dms/types';
import type { DocumentAccessEvent } from '@dms/types';

// ─── View model types ─────────────────────────────────────────────────────────

export type DocExpiryStatus = 'active' | 'expiring-soon' | 'expired';

/**
 * Portal-safe document view.
 * PLAN-VEHICLES-003 L27: supersededBy id → isReplaced boolean at the boundary.
 */
export interface VaultDocumentView {
  id: string;
  vehicleVin: string;
  vehicleName: string;
  type: Document['type'];
  name: string;
  uploadedAt: string;
  expiresAt?: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy?: string;
  /** L27: boolean-only. Staff id never exposed to portal. */
  isReplaced: boolean;
  /** Derived from expiresAt — only for types that carry expiry (L4). */
  expiryStatus: DocExpiryStatus;
  /** Only set when expiryStatus !== 'active'. */
  daysUntilExpiry?: number;
}

export interface VaultVehicleGroup {
  vin: string;
  vehicleName: string;
  docs: VaultDocumentView[];
  /** true if any doc in group is expiring-soon or expired */
  hasExpiry: boolean;
}

// ─── Expiry status derivation (L4) ────────────────────────────────────────────

/** Types that carry meaningful expiry (insurance, puc). Others never expire. */
const EXPIRY_TYPES: Set<Document['type']> = new Set(['insurance', 'puc']);

/** Expiry thresholds per SPEC-PORTAL-DOCS-001 L4. */
export const EXPIRY_AMBER_DAYS = 30;

/**
 * Derive expiry status for a document.
 * Only EXPIRY_TYPES get non-active status — all other types return 'active'.
 */
export function deriveExpiryStatus(doc: Document, now: Date = new Date()): {
  status: DocExpiryStatus;
  daysUntilExpiry?: number;
} {
  if (!EXPIRY_TYPES.has(doc.type) || !doc.expiresAt) {
    return { status: 'active' };
  }
  const expiresMs = new Date(doc.expiresAt).getTime();
  const diffMs = expiresMs - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { status: 'expired', daysUntilExpiry: days };
  }
  if (days <= EXPIRY_AMBER_DAYS) {
    return { status: 'expiring-soon', daysUntilExpiry: days };
  }
  return { status: 'active' };
}

// ─── Document → VaultDocumentView ─────────────────────────────────────────────

/**
 * Convert a raw Document to a portal view model.
 * Strips supersededBy id → isReplaced boolean (L27).
 */
export function toVaultDocumentView(doc: Document, now: Date = new Date()): VaultDocumentView {
  const { status, daysUntilExpiry } = deriveExpiryStatus(doc, now);
  return {
    id: doc.id,
    vehicleVin: doc.vehicleVin,
    vehicleName: doc.vehicleName,
    type: doc.type,
    name: doc.name,
    uploadedAt: doc.uploadedAt,
    ...(doc.expiresAt ? { expiresAt: doc.expiresAt } : {}),
    fileUrl: doc.fileUrl,
    fileSize: doc.fileSize,
    ...(doc.uploadedBy ? { uploadedBy: doc.uploadedBy } : {}),
    isReplaced: Boolean(doc.supersededBy),
    expiryStatus: status,
    ...(daysUntilExpiry !== undefined ? { daysUntilExpiry } : {}),
  };
}

// ─── Sort comparator ──────────────────────────────────────────────────────────

/** Expiry priority: expired (0) > expiring-soon (1) > active (2). */
function expiryPriority(status: DocExpiryStatus): number {
  if (status === 'expired') return 0;
  if (status === 'expiring-soon') return 1;
  return 2;
}

function sortDocViews(a: VaultDocumentView, b: VaultDocumentView): number {
  const pDiff = expiryPriority(a.expiryStatus) - expiryPriority(b.expiryStatus);
  if (pDiff !== 0) return pDiff;
  // Within same expiry priority: newest uploadedAt first
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

export interface VaultFilterState {
  search: string;
  category: Document['type'] | 'all';
  status: 'all' | 'active' | 'expiring-soon' | 'expired';
}

/**
 * Build grouped vault data from raw documents.
 *
 * Pipeline (per L7):
 *   1. Exclude superseded docs (those with supersededBy set)
 *   2. Apply search + category + status filters
 *   3. Group by vehicleVin
 *   4. Sort docs within each group (expiry first, then newest)
 *   5. Exclude vehicle groups with no matching docs
 *
 * @param docs    Active portal documents (from fixture or API)
 * @param filters Current filter state
 * @param now     Injectable for testing
 */
export function buildVaultGroups(
  docs: Document[],
  filters: VaultFilterState,
  now: Date = new Date(),
): VaultVehicleGroup[] {
  const searchLower = filters.search.toLowerCase().trim();

  // Step 1: exclude superseded docs
  const active = docs.filter((d) => !d.supersededBy);

  // Step 2: filter
  const filtered = active.filter((d) => {
    // Search: doc name substring match (L10)
    if (searchLower && !d.name.toLowerCase().includes(searchLower)) return false;

    // Category filter
    if (filters.category !== 'all' && d.type !== filters.category) return false;

    // Status filter (derives expiry)
    if (filters.status !== 'all') {
      const { status } = deriveExpiryStatus(d, now);
      if (status !== filters.status) return false;
    }

    return true;
  });

  // Step 3: group by VIN
  const groupMap = new Map<string, { vehicleName: string; docs: VaultDocumentView[] }>();
  for (const doc of filtered) {
    const view = toVaultDocumentView(doc, now);
    const existing = groupMap.get(doc.vehicleVin);
    if (existing) {
      existing.docs.push(view);
    } else {
      groupMap.set(doc.vehicleVin, { vehicleName: doc.vehicleName, docs: [view] });
    }
  }

  // Step 4 + 5: sort + map to output
  return Array.from(groupMap.entries()).map(([vin, { vehicleName, docs: groupDocs }]) => {
    const sorted = [...groupDocs].sort(sortDocViews);
    const hasExpiry = sorted.some(
      (d) => d.expiryStatus === 'expiring-soon' || d.expiryStatus === 'expired',
    );
    return { vin, vehicleName, docs: sorted, hasExpiry };
  });
}

// ─── DocumentAccessEvent emitter (L2) ────────────────────────────────────────

/**
 * In-memory append-only DocumentAccessEvent log for portal downloads.
 * Pre-backend: lives in module scope (reset on page reload).
 * Post-backend: this emit call will POST to an API route.
 *
 * SPEC-PORTAL-DOCS-001 L2 — every download MUST emit before the file is served.
 */
const _portalAccessLog: DocumentAccessEvent[] = [];

export function getPortalAccessLog(): readonly DocumentAccessEvent[] {
  return _portalAccessLog;
}

/**
 * Emit a DOWNLOAD DocumentAccessEvent for portal.
 * actor is always the portal customer (mock: 'portal-customer').
 * actorRole is always R05 (Customer, per Doc 14 §customer-role).
 */
export function emitPortalDownloadEvent(
  docId: string,
  vin: string,
  purpose: DownloadPurpose,
  purposeNote?: string,
): DocumentAccessEvent {
  const event: DocumentAccessEvent = {
    id: `portal-evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    docId,
    vin,
    kind: 'DOWNLOAD',
    at: new Date().toISOString(),
    actorId: 'portal-customer',
    actorRole: 'R05', // Customer role — Doc 14
    purpose,
    ...(purposeNote ? { purposeNote } : {}),
    schemaVersion: 'v1',
  };
  _portalAccessLog.push(event);
  return event;
}
