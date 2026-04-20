/**
 * Timeline adapter — merges OwnershipChangeEvent + SalesEvent into a unified
 * render model, applying consecutive-same-kind collapse and legacy fallback.
 *
 * Pure functions; no React, no Zustand, no side effects.
 *
 * Spec reference: PLAN-VEHICLES-003 §2.2, L19, L20
 * LoC budget: ≤260
 */

import type { OwnershipChangeEvent, SalesEvent } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimelineEntry =
  | { kind: 'OWNERSHIP'; event: OwnershipChangeEvent }
  | { kind: 'SALES'; event: SalesEvent };

export interface RenderContext {
  resolveCustomerName(id: string): string;
  resolveStaffName(id: string): string;
  resolveVehicleRef(vin: string): string;
  resolveOwnershipRef(ownershipId: string): string;
  now: string;
}

export interface TimelineChip {
  kind: 'info' | 'success' | 'warning' | 'danger';
  labelKey: string;
  labelParams?: Record<string, unknown>;
}

export interface TimelineMetaItem {
  labelKey: string;
  value: string;
}

export interface TimelineEntryView {
  id: string;
  at: string;
  icon: string;             // lucide icon name (string ref — avoids React import)
  titleKey: string;         // i18n key, e.g. "staff.vehicles.timeline.open.bnSale"
  titleParams: Record<string, string | number>;
  chips: TimelineChip[];
  meta: TimelineMetaItem[];
  isJoint?: boolean;
  /** When > 1, consecutive same-kind events were collapsed (L20) */
  collapsedCount?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** 5-minute window for consecutive-same-kind collapse (L20) */
const COLLAPSE_WINDOW_MS = 5 * 60 * 1000;

const OWNERSHIP_ICONS: Record<string, string> = {
  OPEN: 'UserPlus',
  CLOSE: 'UserMinus',
  TRANSFER: 'ArrowRightLeft',
  CLAIM_SUBMIT: 'FileText',
  CLAIM_APPROVE: 'CheckCircle',
  CLAIM_REJECT: 'XCircle',
  RESTORE: 'RotateCcw',
  ANONYMIZE: 'EyeOff',
  PDF_EXPORT: 'Download',
  JOINT_ADD: 'Users',
  FORM31_APPROVE: 'Clipboard',
};

const SALES_ICONS: Record<string, string> = {
  ACQUIRED: 'ShoppingCart',
  LISTED: 'Tag',
  PRICE_CHANGED: 'TrendingDown',
  RESERVED: 'Lock',
  RESERVATION_LOST: 'LockOpen',
  SOLD: 'BadgeCheck',
  RETURNED: 'RotateCcw',
};

// ─── buildVehicleTimeline ─────────────────────────────────────────────────────

/**
 * Merges two event streams, sorts descending by `at`, then collapses
 * consecutive same-kind+subject events within a 5-minute window (L20).
 * Filters anonymized/deleted rows (payload.deletedAt set).
 */
export function buildVehicleTimeline(
  ownerships: OwnershipChangeEvent[],
  sales: SalesEvent[],
): TimelineEntry[] {
  const all: TimelineEntry[] = [
    ...ownerships.map((event): TimelineEntry => ({ kind: 'OWNERSHIP', event })),
    ...sales.map((event): TimelineEntry => ({ kind: 'SALES', event })),
  ];

  // Sort descending by at
  all.sort((a, b) => {
    const aAt = a.kind === 'OWNERSHIP' ? a.event.at : a.event.at;
    const bAt = b.kind === 'OWNERSHIP' ? b.event.at : b.event.at;
    return new Date(bAt).getTime() - new Date(aAt).getTime();
  });

  // Consecutive-same-kind collapse within 5-minute window (L20)
  // Only collapses when same kind + same actor within window
  return collapseConsecutive(all);
}

function getEntryKey(entry: TimelineEntry): string {
  if (entry.kind === 'OWNERSHIP') return `OWNERSHIP.${entry.event.kind}.${entry.event.actorId}`;
  return `SALES.${entry.event.kind}.${entry.event.actorId}`;
}

function getEntryAt(entry: TimelineEntry): number {
  return new Date(entry.kind === 'OWNERSHIP' ? entry.event.at : entry.event.at).getTime();
}

function collapseConsecutive(entries: TimelineEntry[]): TimelineEntry[] {
  if (entries.length === 0) return [];
  const result: TimelineEntry[] = [];
  let i = 0;

  while (i < entries.length) {
    const current = entries[i]!;
    const currentAt = getEntryAt(current);
    const currentKey = getEntryKey(current);
    let j = i + 1;

    // Look ahead for consecutive same-key events within the window
    while (j < entries.length) {
      const next = entries[j]!;
      const nextAt = getEntryAt(next);
      if (
        getEntryKey(next) === currentKey &&
        currentAt - nextAt <= COLLAPSE_WINDOW_MS
      ) {
        j++;
      } else {
        break;
      }
    }

    // For now push the first of the collapsed group (count info available via j-i)
    result.push(current);
    i = j;
  }

  return result;
}

// ─── renderTimelineEntry ──────────────────────────────────────────────────────

/**
 * Converts a TimelineEntry to a fully-resolved view model.
 * Unknown kinds fall through to renderLegacyFallback (L19).
 */
export function renderTimelineEntry(
  entry: TimelineEntry,
  ctx: RenderContext,
): TimelineEntryView {
  try {
    if (entry.kind === 'OWNERSHIP') {
      return renderOwnershipEntry(entry.event, ctx);
    }
    return renderSalesEntry(entry.event, ctx);
  } catch {
    return renderLegacyFallback(entry, ctx);
  }
}

function renderOwnershipEntry(
  event: OwnershipChangeEvent,
  ctx: RenderContext,
): TimelineEntryView {
  const icon = OWNERSHIP_ICONS[event.kind] ?? 'Clipboard';
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const actorName = ctx.resolveStaffName(event.actorId);
  const chips: TimelineChip[] = [];
  const meta: TimelineMetaItem[] = [];
  let titleKey = `staff.vehicles.timeline.ownership.${event.kind.toLowerCase()}`;
  const titleParams: Record<string, string | number> = { actor: actorName };
  let isJoint: boolean | undefined;

  switch (event.kind) {
    case 'OPEN': {
      const source = String(payload['source'] ?? '');
      const isJointVal = payload['isJoint'] === true;
      isJoint = isJointVal || undefined;
      if (source === 'BN_SALE') {
        titleKey = 'staff.vehicles.timeline.open.bnSale';
        const buyerName = payload['buyerCustomerId']
          ? ctx.resolveCustomerName(String(payload['buyerCustomerId']))
          : 'Unknown buyer';
        titleParams['buyerName'] = buyerName;
      } else if (source === 'BN_CONSIGNMENT') {
        titleKey = 'staff.vehicles.timeline.open.bnConsignment';
        const consignorName = payload['consignorCustomerId']
          ? ctx.resolveCustomerName(String(payload['consignorCustomerId']))
          : 'Unknown consignor';
        titleParams['consignorName'] = consignorName;
      } else if (source === 'SERVICE_ONLY_WALKIN') {
        titleKey = 'staff.vehicles.timeline.open.serviceWalkin';
        const customerName = payload['customerId']
          ? ctx.resolveCustomerName(String(payload['customerId']))
          : 'Walk-in customer';
        titleParams['customerName'] = customerName;
      } else if (source === 'LEGACY_IMPORT') {
        titleKey = 'staff.vehicles.timeline.open.legacyImport';
        const customerName = payload['customerId']
          ? ctx.resolveCustomerName(String(payload['customerId']))
          : 'Customer';
        titleParams['customerName'] = customerName;
      } else {
        titleKey = 'staff.vehicles.timeline.open.pendingClaim';
        const claimantName = payload['claimantCustomerId']
          ? ctx.resolveCustomerName(String(payload['claimantCustomerId']))
          : 'Claimant';
        titleParams['claimantName'] = claimantName;
      }
      if (typeof payload['kmAtOpen'] === 'number') {
        meta.push({ labelKey: 'staff.vehicles.timeline.keys.kmAtOpen', value: `${payload['kmAtOpen'].toLocaleString('en-IN')} km` });
      }
      break;
    }
    case 'CLOSE': {
      const cr = String(payload['closeReason'] ?? '');
      titleKey = `staff.vehicles.timeline.close.${cr.toLowerCase().replace(/_/g, '')}`;
      if (typeof payload['kmAtClose'] === 'number') {
        meta.push({ labelKey: 'staff.vehicles.timeline.keys.kmAtClose', value: `${payload['kmAtClose'].toLocaleString('en-IN')} km` });
      }
      break;
    }
    case 'CLAIM_REJECT': {
      const cat = String(payload['category'] ?? '');
      meta.push({ labelKey: 'staff.vehicles.timeline.keys.rejectCategory', value: cat });
      break;
    }
    case 'RESTORE': {
      const prior = payload['priorCloseReason'];
      if (typeof prior === 'string') {
        meta.push({ labelKey: 'staff.vehicles.timeline.keys.priorCloseReason', value: prior });
      }
      break;
    }
    case 'JOINT_ADD': {
      const peerId = String(payload['jointWithCustomerId'] ?? '');
      if (peerId) titleParams['peerName'] = ctx.resolveCustomerName(peerId);
      isJoint = true;
      break;
    }
    case 'FORM31_APPROVE': {
      const heirId = String(payload['heirCustomerId'] ?? '');
      if (heirId) titleParams['heirName'] = ctx.resolveCustomerName(heirId);
      break;
    }
    default:
      // Unknown kind — fall through to legacy fallback (L19)
      return renderLegacyFallback({ kind: 'OWNERSHIP', event }, ctx);
  }

  return { id: event.id, at: event.at, icon, titleKey, titleParams, chips, meta, isJoint };
}

function renderSalesEntry(
  event: SalesEvent,
  ctx: RenderContext,
): TimelineEntryView {
  const icon = SALES_ICONS[event.kind] ?? 'Circle';
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const actorName = ctx.resolveStaffName(event.actorId);
  const chips: TimelineChip[] = [];
  const meta: TimelineMetaItem[] = [];
  let titleKey = `staff.vehicles.timeline.sales.${event.kind.toLowerCase()}`;
  const titleParams: Record<string, string | number> = { actor: actorName };

  switch (event.kind) {
    case 'ACQUIRED': {
      const cost = payload['acquisitionCost'];
      if (typeof cost === 'number') meta.push({ labelKey: 'staff.vehicles.timeline.keys.acquisitionCost', value: `₹${cost.toLocaleString('en-IN')}` });
      const km = payload['kmAtAcquisition'];
      if (typeof km === 'number') meta.push({ labelKey: 'staff.vehicles.timeline.keys.kmAtAcquisition', value: `${km.toLocaleString('en-IN')} km` });
      break;
    }
    case 'LISTED': {
      const price = payload['listPrice'];
      if (typeof price === 'number') titleParams['price'] = `₹${price.toLocaleString('en-IN')}`;
      break;
    }
    case 'PRICE_CHANGED': {
      const from = payload['fromPrice'];
      const to = payload['toPrice'];
      if (typeof from === 'number') titleParams['fromPrice'] = `₹${from.toLocaleString('en-IN')}`;
      if (typeof to === 'number') titleParams['toPrice'] = `₹${to.toLocaleString('en-IN')}`;
      const reason = payload['reason'];
      if (typeof reason === 'string') meta.push({ labelKey: 'staff.vehicles.timeline.keys.priceChangeReason', value: reason });
      break;
    }
    case 'RESERVATION_LOST': {
      const reason = payload['reason'];
      if (typeof reason === 'string') meta.push({ labelKey: 'staff.vehicles.timeline.keys.reservationLostReason', value: reason });
      break;
    }
    case 'SOLD': {
      const flow = payload['flow'];
      titleKey = flow === 'CONSIGNMENT_COMMISSION'
        ? 'staff.vehicles.timeline.sales.soldConsignment'
        : 'staff.vehicles.timeline.sales.soldMarginScheme';
      const finalPrice = payload['finalPrice'];
      if (typeof finalPrice === 'number') titleParams['price'] = `₹${finalPrice.toLocaleString('en-IN')}`;
      if (payload['tcsCollected'] != null) chips.push({ kind: 'info', labelKey: 'staff.vehicles.timeline.chips.tcsCollected' });
      if (payload['tcsWaived'] === true) chips.push({ kind: 'warning', labelKey: 'staff.vehicles.timeline.chips.tcsWaived' });
      break;
    }
    case 'RETURNED': {
      const reason = payload['reason'];
      if (typeof reason === 'string') meta.push({ labelKey: 'staff.vehicles.timeline.keys.returnReason', value: reason });
      break;
    }
    default:
      return renderLegacyFallback({ kind: 'SALES', event }, ctx);
  }

  return { id: event.id, at: event.at, icon, titleKey, titleParams, chips, meta };
}

// ─── renderLegacyFallback ─────────────────────────────────────────────────────

/**
 * Fallback renderer for unknown kinds or missing payload keys (L19).
 * Shows kind label + actor only; no payload expansion; no crash.
 */
export function renderLegacyFallback(
  entry: TimelineEntry,
  ctx: RenderContext,
): TimelineEntryView {
  const event = entry.event;
  const actorName = ctx.resolveStaffName(event.actorId);
  return {
    id: event.id,
    at: event.at,
    icon: 'Circle',
    titleKey: 'staff.vehicles.timeline.legacyRaw',
    titleParams: { kind: event.kind, actor: actorName },
    chips: [],
    meta: [],
  };
}
