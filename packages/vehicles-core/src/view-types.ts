/**
 * View-model interfaces — pure shape definitions, no implementation.
 *
 * These interfaces describe the data shape consumed by UI components in both
 * staff-web and customer-web. They are intentionally separate from the raw
 * entity schemas to allow each surface to project only what it needs.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.0
 */

import type { EffectiveState } from './effective-state';
import type { CpoBadge } from './cpo-rule';

// ─── OwnedVehicleView ─────────────────────────────────────────────────────────

/**
 * Vehicle + current ownership summary as displayed on the customer portal's
 * "My Vehicles" list and the staff C360 vehicle tab.
 */
export interface OwnedVehicleView {
  vin: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  color: string;
  /** Effective state of the customer's ownership row */
  ownershipState: EffectiveState;
  ownershipId: string;
  fromAt: string;
  /** Set only for GRACE rows */
  graceUntilAt?: string;
  /** For joint rows: peer's display name (first name + last initial) */
  jointPeerDisplay?: string;
  lastKnownKm: number;
  cpoBadge?: CpoBadge;
  outletId: string;
}

// ─── OwnershipHistorySummary ──────────────────────────────────────────────────

/**
 * Condensed ownership row for the timeline tab — masks PII based on role.
 * PII fields are `null` when the actor lacks R09+ (same-outlet) or R19+ (cross).
 */
export interface OwnershipHistorySummary {
  ownershipId: string;
  /** Null when caller lacks PII access */
  customerDisplayName: string | null;
  effectiveState: EffectiveState;
  fromAt: string;
  toAt?: string;
  kmAtOpen: number;
  kmAtClose?: number;
  kmStale: boolean;
  source: string;
  isJoint: boolean;
  closeReason?: string;
  isAnonymized: boolean;
}

// ─── ServiceRecordView ────────────────────────────────────────────────────────

/**
 * Service visit summary as displayed on the VIN lifetime detail page's Service
 * tab. Derived from JobCard data in service-store (cross-store projection lives
 * in the UI layer, not inside any slice).
 */
export interface ServiceRecordView {
  jobCardId: string;
  jobNo: string;
  receivedAt: string;
  completedAt?: string;
  status: string;
  outletId: string;
  odometerIn: number;
  odometerOut?: number;
  /** Sum of all labour lines */
  labourTotal: number;
  /** Sum of all parts lines */
  partsTotal: number;
  total: number;
  advisorId: string;
}

// Re-export CpoBadge so consumers only need this one import
export type { CpoBadge };
