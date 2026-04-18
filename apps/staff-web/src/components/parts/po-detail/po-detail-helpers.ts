/**
 * PO detail — pure helpers (no React, no Zustand).
 *
 * Spec reference: PLAN-PARTS-006 §8, §11
 */

import type { PurchaseOrder, PurchaseOrderStatus, Grn } from '@dms/types';
import { ROLE_RANK, requiredApproverRole as _requiredApproverRole } from '@/src/lib/parts/state-machine';

// ─── Timeline event shape ─────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  label: string;
  sub?: string;
  timestamp?: string;
  actorId?: string;
  isCurrent?: boolean;
  isTerminal?: boolean;
}

// ─── Role rank gate ────────────────────────────────────────────────────────────

/**
 * Returns true if actorRole meets or exceeds the minRole rank.
 * Used for non-approval gates (submit, cancel, dispatch, close).
 *
 * Spec §8.
 */
export function hasRank(
  actorRole: string,
  minRole: 'R13' | 'R12' | 'R03' | 'R19',
): boolean {
  const actorRank = ROLE_RANK[actorRole] ?? 0;
  const requiredRank = ROLE_RANK[minRole] ?? 999;
  return actorRank >= requiredRank;
}

// ─── Timeline derivation ──────────────────────────────────────────────────────

/**
 * Derives a chronological array of timeline events from a PO and its linked GRNs.
 *
 * PO: createdAt → submittedAt → approvedAt/rejectedReason → dispatchedAt
 *     → latest grn.postedAt (RECEIVED) → CLOSED (status-only, no stamp).
 *
 * Spec §10.
 */
export function deriveTimeline(
  po: PurchaseOrder,
  grns: Grn[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: 'created',
    label: 'Draft created',
    timestamp: po.createdAt,
    actorId: po.createdBy,
  });

  if (po.submittedAt) {
    events.push({
      id: 'submitted',
      label: 'Submitted for approval',
      timestamp: po.submittedAt,
    });
  }

  if (po.approvedAt && po.approverId && !po.rejectedReason) {
    events.push({
      id: 'approved',
      label: 'Approved',
      timestamp: po.approvedAt,
      actorId: po.approverId,
    });
  }

  if (po.status === 'REJECTED') {
    events.push({
      id: 'rejected',
      label: 'Rejected',
      sub: po.rejectedReason ?? undefined,
      timestamp: po.approvedAt,
      actorId: po.approverId,
      isTerminal: true,
    });
  }

  if (po.status === 'CANCELLED' && po.rejectedReason) {
    events.push({
      id: 'cancelled',
      label: 'Cancelled',
      sub: po.rejectedReason,
      isTerminal: true,
    });
  }

  if (po.dispatchedAt) {
    events.push({
      id: 'dispatched',
      label: 'Marked dispatched',
      timestamp: po.dispatchedAt,
    });
  }

  // Derive RECEIVED from latest linked GRN postedAt
  const linkedPosted = grns
    .filter((g) => g.poId === po.id && g.postedAt)
    .map((g) => g.postedAt as string)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (linkedPosted.length > 0 && po.status !== 'DISPATCHED') {
    events.push({
      id: 'received',
      label: po.status === 'PARTIALLY_RECEIVED' ? 'Partially received' : 'Received',
      timestamp: linkedPosted[0],
    });
  }

  const TERMINAL: PurchaseOrderStatus[] = ['REJECTED', 'CANCELLED', 'CLOSED'];
  if (po.status === 'CLOSED') {
    events.push({
      id: 'closed',
      label: 'Closed',
      isCurrent: true,
      isTerminal: true,
    });
  } else if (!TERMINAL.includes(po.status)) {
    // Current active node
    const currentLabels: Record<string, string> = {
      DRAFT: 'Draft',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved — awaiting dispatch',
      DISPATCHED: 'Dispatched — awaiting receipt',
      PARTIALLY_RECEIVED: 'Partially Received',
      RECEIVED: 'Received',
    };
    const label = currentLabels[po.status] ?? po.status;
    if (!events.some((e) => e.id === 'received' || e.id === 'approved') || po.status === 'PENDING_APPROVAL') {
      // Only add current marker if not already captured by a timestamp node
    } else {
      events[events.length - 1] = {
        ...(events[events.length - 1] as TimelineEvent),
        isCurrent: true,
      };
    }
    // Mark last event as current
    if (events.length > 0) {
      events[events.length - 1] = {
        ...(events[events.length - 1] as TimelineEvent),
        isCurrent: true,
      };
    }
  } else if (TERMINAL.includes(po.status)) {
    if (events.length > 0) {
      events[events.length - 1] = {
        ...(events[events.length - 1] as TimelineEvent),
        isCurrent: true,
      };
    }
  }

  return events;
}

// ─── Cross-join: received qty for PO line ─────────────────────────────────────

/**
 * Sum of OK-condition received qty from all posted GRNs for a given PO line.
 *
 * Spec §4.2 — "receivedSoFar" displayed in PoLinesTable.
 */
export function receivedQtyForLine(
  line: { partCode: string },
  poId: string,
  grns: Grn[],
): number {
  return grns
    .filter((g) => g.poId === poId)
    .reduce((acc, g) => {
      const matchingLines = g.lines.filter(
        (l) => l.partCode === line.partCode && l.condition === 'OK',
      );
      return acc + matchingLines.reduce((a, l) => a + l.receivedQty, 0);
    }, 0);
}

// ─── Approval route summary ───────────────────────────────────────────────────

/**
 * Returns human-readable approval route for the submit dialog.
 *
 * Spec §6.
 */
export function summariseApprovalRoute(
  po: PurchaseOrder,
): { requiredRole: string; thresholdLabel: string } {
  const role = _requiredApproverRole(po.total);
  const ROLE_LABELS: Record<string, string> = {
    R13: 'Parts Counter',
    R12: 'Parts Manager',
    R03: 'Outlet Manager',
    R19: 'General Manager',
  };
  return {
    requiredRole: role,
    thresholdLabel: ROLE_LABELS[role] ?? role,
  };
}

// ─── GRN list for PO ─────────────────────────────────────────────────────────

export function getGrnsForPo(poId: string, grns: Grn[]): Grn[] {
  return grns.filter((g) => g.poId === poId);
}

// ─── Group siblings ───────────────────────────────────────────────────────────

export function getGroupSiblings(
  po: PurchaseOrder,
  pos: PurchaseOrder[],
): PurchaseOrder[] {
  if (!po.groupRef) return [];
  return pos.filter((p) => p.groupRef === po.groupRef && p.id !== po.id);
}

// ─── PO status label (for toasts) ────────────────────────────────────────────

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  DISPATCHED: 'Dispatched',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CLOSED: 'Closed',
};

export function poStatusLabel(status: string): string {
  return PO_STATUS_LABELS[status] ?? status;
}
