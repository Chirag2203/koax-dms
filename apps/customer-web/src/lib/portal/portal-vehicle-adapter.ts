/**
 * Portal vehicle adapter — PII safety gate.
 *
 * The ONLY place where raw store data is converted to portal view models.
 * Every function here must obey the DPDP stripping rules (SPEC §3.3):
 *
 *  1. Never emit prior-owner customerId / phone / email / pan / address.
 *  2. Service history filtered to current owner's tenure window.
 *  3. Date granularity: month+year for pre-tenure; full date for own tenure.
 *  4. Technician name: real if staffDirectory[id].status === 'active', else
 *     "Service Technician".
 *  5. Km-at-transfer deltas per owner never shown.
 *  6. totalBnServiceVisits = count of all completed/delivered JCs for VIN.
 *  7. jointPeerDisplayName populated ONLY when viewer holds ACTIVE_JOINT on VIN.
 *
 * NOTE: mutation-bound flows (submitClaim, selfRevoke, logPdfExport) run
 * through usePortalVehiclesStore directly — not through this adapter.
 *
 * Spec reference: SPEC-PORTAL-VEHICLES-001 §3
 */

import { effectiveState, isCpoEligible } from '@dms/vehicles-core';
import type { CpoBadge, EffectiveState } from '@dms/vehicles-core';
import type { VehicleMaster, VehicleOwnership, JobCard, WarrantyClaim } from '@dms/types';

// ─── View model types (portal-specific, not @dms/vehicles-core) ──────────────

export interface OwnershipHistorySummary {
  previousOwnerCount: number;
  firstTouchedAt: string;
  totalBnServiceVisits: number;
  lastServiceAt?: string;
  warrantyClaims: { open: number; historical: number };
}

export interface OwnedVehicleView {
  vin: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  color: string;
  registrationNumber: string;
  currentKm: number;
  lastKmAt: string;
  ownershipId: string;
  ownershipState: EffectiveState;
  isCurrentlyOwned: boolean;
  inGrace: boolean;
  graceUntilAt?: string;
  isJoint: boolean;
  jointPeerDisplayName?: string;
  summary: OwnershipHistorySummary;
  cpoEligibility: CpoBadge;
  outletId: string;
  fromAt: string;
}

export interface ServiceRecordView {
  id: string;
  dateMonthYear: string;
  fullDate: string;
  type: string;
  km: number;
  cost: number;
  technicianDisplayName: string;
  items: string[];
  invoiceUrl?: string;
  status: 'completed' | 'in-progress';
}

// ─── Staff directory stub type ────────────────────────────────────────────────

export type StaffDirectory = Record<string, { status: 'active' | 'left'; displayName: string }>;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Count peers with ACTIVE state for a VIN (used for ACTIVE_JOINT detection). */
function countActivePeers(vin: string, selfId: string, ownerships: VehicleOwnership[]): number {
  return ownerships.filter((r) => r.vin === vin && r.id !== selfId && r.state === 'ACTIVE').length;
}

function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(iso));
}

/** Extract "Priya M." format from a full name. */
function peerDisplayName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  if (parts.length < 2) return fullName;
  const firstName = parts[0] ?? fullName;
  const lastInitial = (parts[parts.length - 1] ?? '')[0] ?? '';
  return `${firstName} ${lastInitial}.`;
}

// ─── Exported build functions ─────────────────────────────────────────────────

/**
 * Build aggregate summary for a VIN — AGGREGATE only.
 * NEVER includes names, phones, emails, addresses of any prior owner.
 */
export function buildAggregateSummary(
  vin: string,
  allOwnerships: VehicleOwnership[],
  jobCards: JobCard[],
  warrantyClaims: WarrantyClaim[],
  viewerOwnershipId: string,
): OwnershipHistorySummary {
  const vinOwnerships = allOwnerships.filter((r) => r.vin === vin);

  // Prior owners = transferred rows (not the current viewer)
  const previousOwnerCount = vinOwnerships.filter(
    (r) => r.id !== viewerOwnershipId && (r.state === 'TRANSFERRED' || r.state === 'REVOKED'),
  ).length;

  const vinJcs = jobCards.filter(
    (jc) => jc.vin === vin && jc.status !== 'CANCELLED',
  );

  const sortedJcs = [...vinJcs].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
  const lastServiceAt = sortedJcs[0]?.receivedAt;

  const firstOwnership = vinOwnerships.sort(
    (a, b) => new Date(a.fromAt).getTime() - new Date(b.fromAt).getTime(),
  )[0];

  const openWarranties = warrantyClaims.filter(
    (wc) => wc.vin === vin && !['PAID', 'REJECTED'].includes(wc.status),
  ).length;
  const historicalWarranties = warrantyClaims.filter(
    (wc) => wc.vin === vin && ['PAID', 'REJECTED'].includes(wc.status),
  ).length;

  return {
    previousOwnerCount,
    firstTouchedAt: firstOwnership?.fromAt ?? '',
    totalBnServiceVisits: vinJcs.length,
    lastServiceAt,
    warrantyClaims: { open: openWarranties, historical: historicalWarranties },
  };
}

/**
 * Build service records for current owner's tenure only.
 * Earlier records are counted but not shown (earlierCount in footer).
 */
export function buildServiceRecordViews(
  vin: string,
  ownershipWindow: { fromAt: string; toAt?: string },
  jobCards: JobCard[],
  staffDirectory: StaffDirectory,
): { owned: ServiceRecordView[]; earlierCount: number } {
  const vinJcs = jobCards.filter(
    (jc) => jc.vin === vin && jc.status !== 'CANCELLED',
  );

  const windowStart = new Date(ownershipWindow.fromAt).getTime();
  const windowEnd = ownershipWindow.toAt ? new Date(ownershipWindow.toAt).getTime() : Infinity;

  const owned: ServiceRecordView[] = [];
  let earlierCount = 0;

  for (const jc of vinJcs) {
    const receivedMs = new Date(jc.receivedAt).getTime();
    if (receivedMs >= windowStart && receivedMs <= windowEnd) {
      // Real technician name only if still active
      const tech = staffDirectory[jc.advisorId];
      const techName = tech?.status === 'active' ? tech.displayName : 'Service Technician';

      const labourCost = jc.labourLines.reduce((s, l) => s + l.rate * (l.actualHours ?? l.flatRateHours), 0);
      const partsCost = jc.partsLines.reduce((s, p) => s + p.unitPrice * p.qty, 0);
      const cost = jc.finalTotal ?? (labourCost + partsCost);

      owned.push({
        id: jc.id,
        dateMonthYear: formatMonthYear(jc.receivedAt),
        fullDate: jc.receivedAt,
        type: jc.customerComplaint.slice(0, 60),
        km: jc.odometerIn,
        cost,
        technicianDisplayName: techName,
        items: [jc.customerComplaint],
        invoiceUrl: undefined,
        status:
          jc.status === 'DELIVERED' || jc.status === 'READY_FOR_DELIVERY'
            ? 'completed'
            : 'in-progress',
      });
    } else if (receivedMs < windowStart) {
      earlierCount += 1;
    }
  }

  owned.sort((a, b) => new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime());
  return { owned, earlierCount };
}

/**
 * Build a single OwnedVehicleView from raw store data.
 * PII stripping rules enforced — zero prior-owner PII in output.
 */
export function buildOwnedVehicleView(
  vin: string,
  ownership: VehicleOwnership,
  vehicle: VehicleMaster,
  jobCards: JobCard[],
  warrantyClaims: WarrantyClaim[],
  allOwnerships: VehicleOwnership[],
  now: string,
  viewerCustomerId: string,
  customerNameMap: Record<string, string>,
): OwnedVehicleView {
  const peers = countActivePeers(vin, ownership.id, allOwnerships);
  const es = effectiveState(ownership, now, peers);

  const cpoResult = isCpoEligible(vin, jobCards, warrantyClaims, vehicle, now);

  const summary = buildAggregateSummary(vin, allOwnerships, jobCards, warrantyClaims, ownership.id);

  // Joint peer display — ONLY for ACTIVE_JOINT viewer
  let jointPeerDisplayName: string | undefined;
  if (es === 'ACTIVE_JOINT') {
    const peerRow = allOwnerships.find(
      (r) => r.vin === vin && r.id !== ownership.id && r.state === 'ACTIVE' && r.isJoint,
    );
    if (peerRow) {
      const peerName = customerNameMap[peerRow.customerId];
      // Only reveal first name + last initial — never phone/email/pan
      if (peerName) {
        jointPeerDisplayName = peerDisplayName(peerName);
      }
    }
  }

  return {
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    color: vehicle.color,
    registrationNumber: vehicle.rcNumber,
    currentKm: vehicle.lastKnownKm,
    lastKmAt: vehicle.lastKnownKmAt,
    ownershipId: ownership.id,
    ownershipState: es,
    isCurrentlyOwned: es === 'ACTIVE' || es === 'ACTIVE_JOINT',
    inGrace: es === 'GRACE',
    graceUntilAt: es === 'GRACE' ? ownership.graceUntilAt : undefined,
    isJoint: ownership.isJoint,
    jointPeerDisplayName,
    summary,
    cpoEligibility: cpoResult.badge,
    outletId: vehicle.firstTouchOutletId,
    fromAt: ownership.fromAt,
  };
}

/**
 * Select all vehicles visible to a portal user (ACTIVE + ACTIVE_JOINT + GRACE).
 */
export function selectVisibleVehicles(
  storeState: {
    vehicles: Record<string, VehicleMaster>;
    ownerships: Record<string, VehicleOwnership>;
    ownershipIdByCustomer: Record<string, string[]>;
  },
  customerId: string,
  now: string,
  allJobCards: JobCard[],
  allWarrantyClaims: WarrantyClaim[],
  allOwnerships: VehicleOwnership[],
  staffDirectory: StaffDirectory,
  customerNameMap: Record<string, string>,
): OwnedVehicleView[] {
  const ids = storeState.ownershipIdByCustomer[customerId] ?? [];

  return ids
    .map((id) => {
      const ownership = storeState.ownerships[id];
      if (!ownership) return null;
      const vehicle = storeState.vehicles[ownership.vin];
      if (!vehicle) return null;

      const peers = countActivePeers(ownership.vin, id, allOwnerships);
      const es = effectiveState(ownership, now, peers);
      if (es !== 'ACTIVE' && es !== 'ACTIVE_JOINT' && es !== 'GRACE') return null;

      return buildOwnedVehicleView(
        ownership.vin,
        ownership,
        vehicle,
        allJobCards,
        allWarrantyClaims,
        allOwnerships,
        now,
        customerId,
        customerNameMap,
      );
    })
    .filter((v): v is OwnedVehicleView => v !== null);
}
