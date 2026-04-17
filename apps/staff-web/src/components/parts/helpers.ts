/**
 * Parts module — pure helpers shared across tabs.
 *
 * Formatters, status→chip mappers, filter predicates. No React.
 * Spec reference: PLAN-PARTS-002 §6, §6.5a, §17
 */

import type {
  Part,
  PartStock,
  PurchaseOrder,
  PurchaseOrderStatus,
  Grn,
  GrnStatus,
} from '@dms/types';
import type {
  StateChipStatus,
  OutletCode,
} from '@/src/components/primitives';

// ─── Outlet labels (canonical mapping for display) ───────────────────────────

export const OUTLET_NAMES: Record<string, string> = {
  'BLR-01': 'Bangalore',
  'MUM-01': 'Mumbai',
  'CHE-01': 'Chennai',
};

/** Short label used inside mini-chips (BLR / MUM / CHE). */
export const OUTLET_SHORT: Record<string, string> = {
  'BLR-01': 'BLR',
  'MUM-01': 'MUM',
  'CHE-01': 'CHE',
};

/** Map outlet ID (`BLR-01`) → OutletPill code (`bangalore`). */
const OUTLET_TO_CODE: Record<string, OutletCode> = {
  'BLR-01': 'bangalore',
  'MUM-01': 'mumbai',
  'CHE-01': 'chennai',
};
export function outletIdToCode(outletId: string): OutletCode {
  return OUTLET_TO_CODE[outletId] ?? 'all';
}

/** Canonical outlet order for per-outlet rendering. */
export const OUTLET_ORDER: readonly string[] = ['BLR-01', 'MUM-01', 'CHE-01'] as const;

// ─── Staff labels (minimal resolver for createdBy / receivedBy columns) ─────
// Keeps the spec-compliant "no hardcoded customer-facing strings" rule —
// these are internal staff IDs rendered only in staff UIs.

export const STAFF_NAMES: Record<string, string> = {
  'staff-r03-001': 'Neha Kapoor',
  'staff-r05-001': 'Rahul Kumar',
  'staff-r09-001': 'Priya Sharma',
  'staff-r09-002': 'Rajesh Kumar',
  'staff-r09-003': 'Deepa Nair',
  'staff-r10-001': 'Arjun Mehta',
  'staff-r12-001': 'Vikram Singh',
  'staff-r13-001': 'Harish Naidu',
  'staff-r19-001': 'Rohit Khanna',
  'staff-r24-001': 'Meera Iyer',
};

export function staffName(id: string | undefined): string {
  if (!id) return '—';
  return STAFF_NAMES[id] ?? id;
}

// ─── Currency / date formatters ──────────────────────────────────────────────

/** `1245000` → `'₹ 12,45,000'` (Indian numbering system). */
export function formatINR(amount: number): string {
  // toLocaleString with en-IN produces the Indian grouping (lakhs/crores).
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

/** ISO → `'14 Apr'` */
export function formatDateShort(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** ISO → `'14 Apr 2026'` */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** ISO → `'14 Apr 16:40'` */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date} ${time}`;
}

/**
 * Returns true if `iso` is strictly before now (demo clock = real Date.now()
 * is fine — fixtures are back-dated relative to 2026-04-17 already).
 */
export function isPast(iso: string | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

// ─── Date-range filter helpers ──────────────────────────────────────────────

export type DateRangeId = 'today' | 'this-week' | 'this-month' | 'all';

export const DATE_RANGE_OPTIONS: { id: DateRangeId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'all', label: 'All' },
];

export function matchesDateRange(iso: string | undefined, range: DateRangeId): boolean {
  if (range === 'all') return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const now = new Date();
  if (range === 'today') {
    const d = new Date(iso);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }
  if (range === 'this-week') {
    // Week = Monday 00:00 of current ISO week → next Monday
    const start = new Date(now);
    const dow = (start.getDay() + 6) % 7; // 0..6, Monday = 0
    start.setDate(start.getDate() - dow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return t >= start.getTime() && t < end.getTime();
  }
  if (range === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    return t >= start && t < end;
  }
  return true;
}

// ─── Status → StateChip mappers ─────────────────────────────────────────────

const PO_STATUS_TO_CHIP: Record<PurchaseOrderStatus, StateChipStatus> = {
  DRAFT: 'po-draft',
  PENDING_APPROVAL: 'po-pending-approval',
  APPROVED: 'po-approved',
  REJECTED: 'po-rejected',
  CANCELLED: 'po-cancelled',
  DISPATCHED: 'po-dispatched',
  PARTIALLY_RECEIVED: 'po-partially-received',
  RECEIVED: 'po-received',
  CLOSED: 'po-closed',
};

export function poStatusToChip(status: PurchaseOrderStatus): StateChipStatus {
  return PO_STATUS_TO_CHIP[status];
}

const GRN_STATUS_TO_CHIP: Record<GrnStatus, StateChipStatus> = {
  DRAFT: 'grn-draft',
  PENDING_QC: 'grn-pending-qc',
  MATCHED: 'grn-matched',
  REJECTED: 'grn-rejected',
  POSTED: 'grn-posted',
};

export function grnStatusToChip(status: GrnStatus): StateChipStatus {
  return GRN_STATUS_TO_CHIP[status];
}

// ─── Stock status + aggregation ─────────────────────────────────────────────

export type StockStatus = 'OK' | 'LOW' | 'OUT';

/**
 * Resolve a part's stock status. If outletFilter is provided, evaluate
 * against that single outlet's row only. Otherwise worst-across-outlets.
 *
 * Rules:
 * - any qty === 0 → OUT
 * - else any qty <= reorderLevel → LOW
 * - else → OK
 *
 * If `outletFilter` is provided and the part has no row for that outlet,
 * returns `'OUT'` (spec §6.1 — present-but-zero rule; no row means no stock).
 */
export function stockStatusFor(
  part: Part,
  outletFilter?: string,
): StockStatus {
  if (outletFilter) {
    const row = part.stock.find((s) => s.outletId === outletFilter);
    if (!row) return 'OUT';
    if (row.qty === 0) return 'OUT';
    if (row.qty <= row.reorderLevel) return 'LOW';
    return 'OK';
  }
  // Worst across all outlets
  if (part.stock.some((s) => s.qty === 0)) return 'OUT';
  if (part.stock.some((s) => s.qty <= s.reorderLevel)) return 'LOW';
  return 'OK';
}

export function stockStatusToChip(status: StockStatus): StateChipStatus {
  return status === 'OK' ? 'stock-ok' : status === 'LOW' ? 'stock-low' : 'stock-out';
}

/**
 * Is a part low-stock overall? (any outlet row at or below its reorderLevel)
 * — used by the Low Stock tab base set.
 */
export function isLowStockPart(part: Part): boolean {
  return part.stock.some((s) => s.qty <= s.reorderLevel);
}

/**
 * Returns the "worst" stock row (largest shortfall) or undefined if the part
 * has no rows. Ties broken by OUTLET_ORDER (BLR → MUM → CHE).
 */
export function worstStockRow(
  part: Part,
  outletFilter?: string,
): PartStock | undefined {
  if (outletFilter) {
    return part.stock.find((s) => s.outletId === outletFilter);
  }
  const rows = [...part.stock].sort((a, b) => {
    const aShort = Math.max(0, a.reorderLevel - a.qty);
    const bShort = Math.max(0, b.reorderLevel - b.qty);
    if (bShort !== aShort) return bShort - aShort;
    // Tie-break by canonical outlet order
    return OUTLET_ORDER.indexOf(a.outletId) - OUTLET_ORDER.indexOf(b.outletId);
  });
  return rows[0];
}

/** Shortfall for the worst row (0 if no shortfall). */
export function shortfallFor(part: Part, outletFilter?: string): number {
  const row = worstStockRow(part, outletFilter);
  if (!row) return 0;
  return Math.max(0, row.reorderLevel - row.qty);
}

/**
 * Days of cover (demo heuristic per spec §6.2). Returns null when DoC is
 * undefined (qty 0 or reorderLevel 0) so the caller can render `—`.
 */
export function daysOfCover(part: Part, outletFilter?: string): number | null {
  const row = worstStockRow(part, outletFilter);
  if (!row) return null;
  if (row.qty === 0) return null;
  if (row.reorderLevel === 0) return null;
  const dailyRate = row.reorderLevel / 7;
  return Math.round(row.qty / dailyRate);
}

/** Latest PO createdAt whose lines include this partCode, or null. */
export function lastPoDateFor(
  partCode: string,
  purchaseOrders: PurchaseOrder[],
): string | null {
  const hits = purchaseOrders.filter((po) =>
    po.lines.some((l) => l.partCode === partCode),
  );
  if (hits.length === 0) return null;
  const latest = hits
    .map((po) => po.createdAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  return latest ?? null;
}

// ─── Supplier aggregations ──────────────────────────────────────────────────

const TERMINAL_PO: PurchaseOrderStatus[] = ['CLOSED', 'CANCELLED', 'REJECTED'];
const VOIDED_PO: PurchaseOrderStatus[] = ['CANCELLED', 'REJECTED'];

export function activePoCount(
  supplierId: string,
  purchaseOrders: PurchaseOrder[],
): number {
  return purchaseOrders.filter(
    (po) => po.supplierId === supplierId && !TERMINAL_PO.includes(po.status),
  ).length;
}

export function lifetimeValue(
  supplierId: string,
  purchaseOrders: PurchaseOrder[],
): number {
  return purchaseOrders
    .filter(
      (po) => po.supplierId === supplierId && !VOIDED_PO.includes(po.status),
    )
    .reduce((acc, po) => acc + po.total, 0);
}

export function lastOrderDate(
  supplierId: string,
  purchaseOrders: PurchaseOrder[],
): string | null {
  const hits = purchaseOrders.filter((po) => po.supplierId === supplierId);
  if (hits.length === 0) return null;
  const latest = hits
    .map((po) => po.createdAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  return latest ?? null;
}

// ─── Overdue PO delivery ────────────────────────────────────────────────────

const TERMINAL_FOR_OVERDUE: PurchaseOrderStatus[] = [
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
  'REJECTED',
];

export function isPoExpectedDeliveryOverdue(po: PurchaseOrder): boolean {
  if (TERMINAL_FOR_OVERDUE.includes(po.status)) return false;
  return isPast(po.expectedDeliveryAt);
}

// ─── GRN aggregates ─────────────────────────────────────────────────────────

export function grnReceivedOrdered(grn: Grn): { received: number; ordered: number } {
  return grn.lines.reduce(
    (acc, l) => ({
      received: acc.received + l.receivedQty,
      ordered: acc.ordered + l.orderedQty,
    }),
    { received: 0, ordered: 0 },
  );
}

export function grnHasDiscrepancy(grn: Grn): boolean {
  return grn.threeWayMatchStatus === 'DISCREPANCY';
}
