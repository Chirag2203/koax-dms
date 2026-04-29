/**
 * Outlets slice — SPEC-SETTINGS-001 §4
 * L1: 3 outlets only (BLR/MUM/CHE). No create/delete.
 * L2: GSTIN regex validation.
 * L3: Manager referential integrity (R03+ at outlet).
 * L9: Soft deactivation — active: false.
 * L10: code field is immutable.
 */

import type { OutletConfig } from '@dms/types';
import { hasRank } from '@dms/types';
import type { StaffRoleCode } from '@dms/types';
import { isValidGstin } from '../gstin-validator';
import type { SettingsAuditEvent } from '@dms/types';
import { MOCK_OUTLET_CONFIGS } from '@dms/mocks/fixtures';

export interface OutletSliceState {
  outlets: Record<string, OutletConfig>;
}

export interface StoreActor {
  id: string;
  role: StaffRoleCode;
}

export class OutletEditDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutletEditDeniedError';
  }
}

export class GstinValidationError extends Error {
  constructor(gstin: string) {
    super(`GSTIN format invalid: "${gstin}". Expected format: e.g. 29AABCT1332L1ZQ`);
    this.name = 'GstinValidationError';
  }
}

export class ManagerEligibilityError extends Error {
  constructor(managerId: string) {
    super(`Manager ID "${managerId}" is not eligible — must be R03+ and assigned to this outlet.`);
    this.name = 'ManagerEligibilityError';
  }
}

export class OutletCodeImmutableError extends Error {
  constructor() {
    super('Outlet code is immutable and cannot be changed (L10).');
    this.name = 'OutletCodeImmutableError';
  }
}

/** Build the initial outlets record from fixture */
export function buildInitialOutlets(): Record<string, OutletConfig> {
  const result: Record<string, OutletConfig> = {};
  for (const o of MOCK_OUTLET_CONFIGS) {
    result[o.id] = { ...o };
  }
  return result;
}

/**
 * Validate an outlet patch before applying it.
 * Throws OutletEditDeniedError, GstinValidationError, ManagerEligibilityError,
 * or OutletCodeImmutableError on violations.
 *
 * staffProfiles: map of staffId → { role, outlet } — provided by caller from staff-store
 * to avoid a direct store-to-store import (Seam 18).
 */
export function validateOutletPatch(
  outlet: OutletConfig,
  patch: Partial<OutletConfig>,
  actor: StoreActor,
  staffProfiles: Record<string, { role: StaffRoleCode; outlet: string }>,
): void {
  // Role gate: R02+ required for edits
  if (!hasRank(actor.role, 'R02')) {
    throw new OutletEditDeniedError(
      `Org Admin (R02) authority required to edit outlet configuration. Actor role: ${actor.role}`,
    );
  }

  // L10: code is immutable
  if (patch.code !== undefined && patch.code !== outlet.code) {
    throw new OutletCodeImmutableError();
  }

  // L2: GSTIN validation
  if (patch.gstin !== undefined) {
    if (!isValidGstin(patch.gstin)) {
      throw new GstinValidationError(patch.gstin);
    }
  }

  // L3: Manager referential integrity
  if (patch.managerId !== undefined) {
    const staff = staffProfiles[patch.managerId];
    if (!staff) {
      throw new ManagerEligibilityError(patch.managerId);
    }
    if (!hasRank(staff.role, 'R03')) {
      throw new ManagerEligibilityError(
        `${patch.managerId} — role ${staff.role} is below R03`,
      );
    }
    // Accept either the short code (blr/mum/che) or the full city name (bangalore/mumbai/chennai)
    const codeToCity: Record<string, string> = { BLR: 'bangalore', MUM: 'mumbai', CHE: 'chennai' };
    const expectedCity = codeToCity[outlet.code] ?? outlet.code.toLowerCase();
    const expectedCode = outlet.code.toLowerCase();
    if (staff.outlet !== expectedCity && staff.outlet !== expectedCode) {
      throw new ManagerEligibilityError(
        `${patch.managerId} — assigned outlet "${staff.outlet}" does not match outlet "${outlet.code}"`,
      );
    }
  }
}

/** Build a deep-diff between before and after, excluding unchanged keys */
export function deepDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const diffBefore: Record<string, unknown> = {};
  const diffAfter: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diffBefore[key] = before[key];
      diffAfter[key] = after[key];
    }
  }
  return { before: diffBefore, after: diffAfter };
}

/** Build a settings audit event */
export function buildAuditEvent(
  kind: SettingsAuditEvent['kind'],
  actor: StoreActor,
  subject: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  note?: string,
): SettingsAuditEvent {
  return {
    id: `sae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    at: new Date().toISOString(),
    actorId: actor.id,
    actorRole: actor.role,
    subject,
    before,
    after,
    note,
  };
}
