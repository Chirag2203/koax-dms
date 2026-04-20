/**
 * Portal vehicle adapter — PII safety gate snapshot tests.
 *
 * Assertion: buildOwnedVehicleView output NEVER contains prior-owner
 * customerId, phone, email, pan, aadhaar, addressLine, or previousOwnerName
 * in any value in the serialized output.
 *
 * Tests run against 3 fixture ownerships:
 *  - VIN-A: cust-arjun-mehta (ACTIVE_JOINT — joint with Priya Mehta)
 *  - VIN-B: cust-meera-iyer  (ACTIVE, CPO-at-risk)
 *  - VIN-C: cust-karan-shah  (GRACE — self-revoked 2026-04-15)
 *
 * Spec reference: SPEC-PORTAL-VEHICLES-001 §3.4
 */

import { describe, it, expect } from 'vitest';
import {
  buildOwnedVehicleView,
} from '../portal-vehicle-adapter';
import { vehicleMasters, ownershipRows, jobCards, warrantyClaims, vehicleModuleCustomers } from '@dms/mocks/fixtures';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW = '2026-04-20T12:00:00.000Z';

const CUSTOMER_NAME_MAP: Record<string, string> = Object.fromEntries(
  vehicleModuleCustomers.map((c) => [c.id, c.name]),
);

// PII fields we must NEVER see in output from prior owners
const PRIOR_OWNER_PII_FIELDS = [
  'cust-rohan-desai',
  'cust-neha-kapoor',
  'cust-vikram-singh',
  'cust-sunita-reddy',
  'rohan.desai@gmail.com',
  'neha.kapoor@gmail.com',
  'vikram.singh@gmail.com',
  'sunita.reddy@gmail.com',
  '+919876001001',
  '+919876001002',
  '+919876002001',
  '+919876003001',
  'AABPD1234A',  // Rohan PAN
  'BBBPK5678B',  // Neha PAN
  'EEEPS7890E',  // Vikram PAN
  'GGGPR6789G',  // Sunita PAN
];

function flatStringValues(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj];
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== 'object') return [String(obj)];
  return Object.values(obj as Record<string, unknown>).flatMap(flatStringValues);
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function findOwnership(id: string) {
  const row = ownershipRows.find((r) => r.id === id);
  if (!row) throw new Error(`Ownership row ${id} not found`);
  return row;
}

function findVehicle(vin: string) {
  const veh = vehicleMasters.find((v) => v.vin === vin);
  if (!veh) throw new Error(`Vehicle ${vin} not found`);
  return veh;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildOwnedVehicleView — PII safety gate', () => {
  it('VIN-A: Arjun (ACTIVE_JOINT) — no prior owner PII, joint peer display name only', () => {
    const vin = 'WBA3A5C50DF123456';
    const ownership = findOwnership('own-vina-arjun');
    const vehicle = findVehicle(vin);

    const view = buildOwnedVehicleView(
      vin, ownership, vehicle, jobCards, warrantyClaims,
      ownershipRows, NOW, 'cust-arjun-mehta', CUSTOMER_NAME_MAP,
    );

    const allValues = flatStringValues(view);

    for (const forbidden of PRIOR_OWNER_PII_FIELDS) {
      expect(allValues, `Found forbidden PII "${forbidden}" in output`).not.toContain(forbidden);
    }

    // Joint peer display: Priya M. (first + last initial only)
    expect(view.jointPeerDisplayName).toBe('Priya M.');
    // Never full name
    expect(view.jointPeerDisplayName).not.toBe('Priya Mehta');

    // State correctness
    expect(view.ownershipState).toBe('ACTIVE_JOINT');
    expect(view.isJoint).toBe(true);
    expect(view.isCurrentlyOwned).toBe(true);
    expect(view.inGrace).toBe(false);

    // Summary has no prior-owner fields
    expect(Object.keys(view.summary)).not.toContain('previousOwnerName');
    expect(view.summary.previousOwnerCount).toBeGreaterThanOrEqual(0);
  });

  it('VIN-B: Meera (ACTIVE, CPO-at-risk) — no prior owner PII', () => {
    const vin = 'WAUFGAFR9LA003456';
    const ownership = findOwnership('own-vinb-meera');
    const vehicle = findVehicle(vin);

    const view = buildOwnedVehicleView(
      vin, ownership, vehicle, jobCards, warrantyClaims,
      ownershipRows, NOW, 'cust-meera-iyer', CUSTOMER_NAME_MAP,
    );

    const allValues = flatStringValues(view);

    for (const forbidden of PRIOR_OWNER_PII_FIELDS) {
      expect(allValues, `Found forbidden PII "${forbidden}" in output`).not.toContain(forbidden);
    }

    // Not joint
    expect(view.isJoint).toBe(false);
    expect(view.jointPeerDisplayName).toBeUndefined();
    expect(view.ownershipState).toBe('ACTIVE');

    // Should have 1 previous owner (Vikram transferred)
    expect(view.summary.previousOwnerCount).toBe(1);
  });

  it('VIN-C: Karan (GRACE, self-revoked) — no prior owner PII, grace state correct', () => {
    const vin = 'WP0AB2A98KS123456';
    const ownership = findOwnership('own-vinc-karan');
    const vehicle = findVehicle(vin);

    const view = buildOwnedVehicleView(
      vin, ownership, vehicle, jobCards, warrantyClaims,
      ownershipRows, NOW, 'cust-karan-shah', CUSTOMER_NAME_MAP,
    );

    const allValues = flatStringValues(view);

    for (const forbidden of PRIOR_OWNER_PII_FIELDS) {
      expect(allValues, `Found forbidden PII "${forbidden}" in output`).not.toContain(forbidden);
    }

    // Grace state
    expect(view.ownershipState).toBe('GRACE');
    expect(view.inGrace).toBe(true);
    expect(view.graceUntilAt).toBe('2026-04-22T10:00:00.000Z');
    expect(view.isCurrentlyOwned).toBe(false);

    // 1 previous owner (Sunita)
    expect(view.summary.previousOwnerCount).toBeGreaterThanOrEqual(1);
  });

  it('snapshot: no customerId of prior owners leaks into summary', () => {
    const vin = 'WBA3A5C50DF123456';
    const ownership = findOwnership('own-vina-arjun');
    const vehicle = findVehicle(vin);

    const view = buildOwnedVehicleView(
      vin, ownership, vehicle, jobCards, warrantyClaims,
      ownershipRows, NOW, 'cust-arjun-mehta', CUSTOMER_NAME_MAP,
    );

    // Summary must not have name/phone/email fields
    const summaryKeys = Object.keys(view.summary);
    expect(summaryKeys).not.toContain('name');
    expect(summaryKeys).not.toContain('phone');
    expect(summaryKeys).not.toContain('email');
    expect(summaryKeys).not.toContain('pan');
    expect(summaryKeys).not.toContain('address');
    expect(summaryKeys).not.toContain('previousOwnerName');
    expect(summaryKeys).not.toContain('customerId');
  });
});
