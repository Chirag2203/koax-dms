/**
 * Pure helpers for Part Detail sections.
 *
 * Detail-view-only consumers live here (vs shared `parts/helpers.ts`) to
 * keep the shared helpers tight. Unit-testable without React or stores.
 *
 * Spec reference: PLAN-PARTS-003 §14
 */

import type {
  Grn,
  JobCard,
  Part,
  PurchaseOrder,
  StockMovement,
  StockMovementType,
} from '@dms/types';
import type { StateChipStatus } from '@/src/components/primitives';

// ─── Constants (terminal PO statuses for Open-POs filter) ────────────────────

const TERMINAL_PO_STATUSES = new Set<PurchaseOrder['status']>([
  'CLOSED',
  'CANCELLED',
  'REJECTED',
]);

// ─── Supersession ────────────────────────────────────────────────────────────

export interface SuccessorResult {
  kind: 'in-catalog' | 'not-in-catalog';
  code: string;
  name?: string;
}

/**
 * Resolve the successor of a part (the `supersededBy` target).
 * Returns `null` when there is no `supersededBy` field.
 */
export function getSuccessorPart(
  part: Part,
  allParts: Part[],
): SuccessorResult | null {
  if (!part.supersededBy) return null;
  const successor = allParts.find((p) => p.partCode === part.supersededBy);
  if (successor) {
    return { kind: 'in-catalog', code: successor.partCode, name: successor.name };
  }
  return { kind: 'not-in-catalog', code: part.supersededBy };
}

/**
 * Reverse lookup: which parts have `supersededBy === thisPart.partCode`?
 * Allows multiple predecessors (v1 fixtures only ever have one, but schema
 * permits more — e.g. two deprecated variants rolling into one successor).
 */
export function getPredecessorParts(partCode: string, allParts: Part[]): Part[] {
  return allParts.filter((p) => p.supersededBy === partCode);
}

// ─── Movement history + open POs + linked JCs ───────────────────────────────

/** All movements for a part, sorted most-recent-first. Pure. */
export function getMovementsForPart(
  partCode: string,
  movements: StockMovement[],
): StockMovement[] {
  return movements
    .filter((m) => m.partCode === partCode)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * Non-terminal POs whose lines include this partCode.
 * Sorted by `createdAt desc`.
 */
export function getOpenPosForPart(
  partCode: string,
  purchaseOrders: PurchaseOrder[],
): PurchaseOrder[] {
  return purchaseOrders
    .filter(
      (po) =>
        !TERMINAL_PO_STATUSES.has(po.status) &&
        po.lines.some((l) => l.partCode === partCode),
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/**
 * Service JobCards whose partsLines include this partCode.
 * Sorted by `receivedAt desc`.
 */
export function getLinkedJobCards(
  partCode: string,
  jobCards: JobCard[],
): JobCard[] {
  return jobCards
    .filter((jc) => jc.partsLines.some((pl) => pl.partCode === partCode))
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
}

// ─── Transfer pair lookup (for movement Ref column) ──────────────────────────

/**
 * For a TRANSFER movement, find the paired opposite-sign movement and return
 * `"<fromOutlet> → <toOutlet>"`. Returns null when not a TRANSFER or pair
 * not found.
 */
export function transferPairDescription(
  movement: StockMovement,
  allMovements: StockMovement[],
): string | null {
  if (movement.type !== 'TRANSFER') return null;
  const paired = allMovements.find(
    (m) => m.refId === movement.refId && m.id !== movement.id,
  );
  if (!paired) return null;
  const outbound = movement.qty < 0 ? movement : paired;
  const inbound = movement.qty < 0 ? paired : movement;
  return `${outbound.outletId} → ${inbound.outletId}`;
}

// ─── Movement type → chip mapper ─────────────────────────────────────────────

export function movementTypeToChip(type: StockMovementType): StateChipStatus {
  switch (type) {
    case 'IN':
      return 'mov-in';
    case 'OUT':
      return 'mov-out';
    case 'ADJUST':
      return 'mov-adjust';
    case 'TRANSFER':
      return 'mov-transfer';
  }
}

// ─── Linked-JobCard customer lookup (inline minimal map) ─────────────────────
//
// Spec §13: inline a minimal CUSTOMER_MAP here rather than importing from a
// service view component. TODO (S6 Customers phase): consolidate into a
// shared fixture helper so there's one source of truth for the 10 demo
// customers referenced by service job cards.

const CUSTOMER_MAP: Record<string, string> = {
  'customer-001': 'Arjun Mehta',
  'customer-002': 'Priya Iyer',
  'customer-003': 'Rohit Singh',
  'customer-004': 'Neha Kapoor',
  'customer-005': 'Vikram Shetty',
  'customer-006': 'Anita Desai',
  'customer-007': 'Sanjay Kulkarni',
  'customer-008': 'Meera Joshi',
  'customer-009': 'Rahul Bhat',
  'customer-010': 'Deepa Ramanathan',
};

export function customerName(customerId: string | undefined): string {
  if (!customerId) return '—';
  return CUSTOMER_MAP[customerId] ?? customerId;
}

// ─── Linked-JobCard VIN → make/model lookup (inline minimal map) ─────────────
//
// Same short-term expedient — covers the 10 vehicles referenced by the
// service fixtures. Consolidate in S6.

const VIN_TO_LABEL: Record<string, string> = {
  WP0AB2A91MS247831: 'Porsche 911 Carrera S',
  WP0ZZZ97ZNS112045: 'Porsche Panamera 4',
  WP1ZZZ9YZPS034789: 'Porsche Cayenne Coupe',
  WP1ZZZ95ZNS078234: 'Porsche Cayenne',
  WP0ZZZ98ZMS561902: 'Porsche 718 Cayman',
  WP0AAA1X8PSA12345: 'Porsche Taycan',
  WDD2221971A012345: 'Mercedes-Benz S-Class',
  WDC1930561A456789: 'Mercedes-Benz GLC',
  WDD1900761A789012: 'Mercedes-Benz E-Class',
  WDC2229601A234567: 'Mercedes-Benz GLE',
};

export function vehicleLabel(vin: string | undefined): string {
  if (!vin) return '—';
  return VIN_TO_LABEL[vin] ?? vin;
}

// ─── Grn lookup helper (for the "navigated from detail page" GRN ref link) ──
//
// Not a pure map — called from the movement-history column renderer to
// decide whether to link or render plain text. Keeps the column def simple.
export function grnExists(refId: string, grns: Grn[]): boolean {
  return grns.some((g) => g.id === refId);
}
