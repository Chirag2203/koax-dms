/**
 * GRN detail — pure helpers (no React, no Zustand).
 *
 * Spec reference: PLAN-PARTS-006 §11
 */

import type { Grn, PurchaseOrder, Part } from '@dms/types';
import {
  allLinesFullyReceived,
  hasAnyReceipt,
} from '@/src/lib/parts/parts-store/post-grn-logic';

// ─── Timeline event shape ─────────────────────────────────────────────────────

export interface GrnTimelineEvent {
  id: string;
  label: string;
  sub?: string;
  timestamp?: string;
  actorId?: string;
  isCurrent?: boolean;
}

// ─── Timeline derivation ──────────────────────────────────────────────────────

/**
 * Derives a chronological array of timeline events from a GRN.
 *
 * GRN: receivedAt → qcAt (MATCHED or REJECTED) → postedAt (POSTED).
 *
 * Spec §10.
 */
export function deriveGrnTimeline(grn: Grn): GrnTimelineEvent[] {
  const events: GrnTimelineEvent[] = [];

  events.push({
    id: 'received',
    label: 'Goods received',
    timestamp: grn.receivedAt,
    actorId: grn.receivedBy,
  });

  if (grn.qcAt && grn.qcBy) {
    if (grn.status === 'REJECTED' && grn.rejectedReason) {
      events.push({
        id: 'rejected',
        label: 'QC rejected',
        sub: grn.rejectedReason,
        timestamp: grn.qcAt,
        actorId: grn.qcBy,
      });
    } else {
      events.push({
        id: 'qc',
        label: grn.threeWayMatchStatus === 'DISCREPANCY' ? 'Matched (with discrepancy)' : 'QC matched',
        timestamp: grn.qcAt,
        actorId: grn.qcBy,
      });
    }
  }

  if (grn.postedAt) {
    events.push({
      id: 'posted',
      label: 'Posted to inventory',
      timestamp: grn.postedAt,
    });
  }

  // Mark last event as current
  if (events.length > 0) {
    events[events.length - 1] = {
      ...(events[events.length - 1] as GrnTimelineEvent),
      isCurrent: true,
    };
  }

  return events;
}

// ─── Post preview effects ─────────────────────────────────────────────────────

export interface PostEffects {
  movementCount: number;
  perOutletDeltas: Array<{ outletId: string; delta: number }>;
  perPartDeltas: Array<{ partCode: string; delta: number }>;
  poTransition: 'RECEIVED' | 'PARTIALLY_RECEIVED' | null;
}

/**
 * Pure preview of what postGrn() will do — mirrors the store's actual logic.
 * Imported from post-grn-logic to ensure single source of truth (spec §18).
 *
 * Spec §7, §11.
 */
export function previewPostEffects(
  grn: Grn,
  po: PurchaseOrder | undefined,
  parts: Part[],
  allGrns: Grn[],
): PostEffects {
  // Only OK-condition lines with receivedQty > 0 create movements
  const eligibleLines = grn.lines.filter(
    (l) => l.condition === 'OK' && l.receivedQty > 0,
  );

  const movementCount = eligibleLines.length;

  // All lines in a GRN share a single outletId
  const outletId = grn.outletId;
  const totalDelta = eligibleLines.reduce((acc, l) => acc + l.receivedQty, 0);
  const perOutletDeltas =
    totalDelta > 0 ? [{ outletId, delta: totalDelta }] : [];

  // Per-part deltas
  const partDeltaMap = new Map<string, number>();
  for (const line of eligibleLines) {
    partDeltaMap.set(
      line.partCode,
      (partDeltaMap.get(line.partCode) ?? 0) + line.receivedQty,
    );
  }
  const perPartDeltas = Array.from(partDeltaMap.entries()).map(
    ([partCode, delta]) => ({ partCode, delta }),
  );

  // PO auto-transition
  let poTransition: PostEffects['poTransition'] = null;
  if (po) {
    // Simulate the GRN being posted (add current grn to the calculation)
    const grnsWithCurrent = allGrns.map((g) =>
      g.id === grn.id ? { ...g, status: 'POSTED' as const } : g,
    );
    if (allLinesFullyReceived(po, grnsWithCurrent)) {
      poTransition = 'RECEIVED';
    } else if (hasAnyReceipt(po, grnsWithCurrent)) {
      poTransition = 'PARTIALLY_RECEIVED';
    }
  }

  return { movementCount, perOutletDeltas, perPartDeltas, poTransition };
}

// ─── GRN linked PO ───────────────────────────────────────────────────────────

export function getLinkedPo(
  grn: Grn,
  pos: PurchaseOrder[],
): PurchaseOrder | undefined {
  if (!grn.poId) return undefined;
  return pos.find((p) => p.id === grn.poId);
}

// ─── Short receipt / damaged line counts ─────────────────────────────────────

export function getShortReceiptCount(grn: Grn): number {
  return grn.lines.filter((l) => l.receivedQty < l.orderedQty).length;
}

export function getDamagedLineCount(grn: Grn): number {
  return grn.lines.filter(
    (l) => l.condition === 'DAMAGED' || l.condition === 'WRONG',
  ).length;
}

// ─── Dual control check ───────────────────────────────────────────────────────

export function isDualControl(grn: Grn): boolean {
  const total = grn.lines.reduce((acc, l) => acc + l.receivedQty * l.unitPrice, 0);
  return total >= 200_000;
}

// ─── GRN status label (for toasts) ───────────────────────────────────────────

const GRN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_QC: 'Pending QC',
  MATCHED: 'Matched',
  REJECTED: 'Rejected',
  POSTED: 'Posted',
};

export function grnStatusLabel(status: string): string {
  return GRN_STATUS_LABELS[status] ?? status;
}

// ─── GRN total ────────────────────────────────────────────────────────────────

export function grnTotal(grn: Grn): number {
  return grn.lines.reduce((acc, l) => acc + l.receivedQty * l.unitPrice, 0);
}
