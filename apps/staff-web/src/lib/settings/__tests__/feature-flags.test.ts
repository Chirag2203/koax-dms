/**
 * Feature flags slice tests — SPEC-SETTINGS-001 §4
 *
 * Covers:
 *   - L6: Toggle requires R02+ (FlagToggleDeniedError otherwise)
 *   - L12: Every flag in registry has a non-empty description
 *   - buildInitialFlags seeds registry defaults correctly
 *   - validateFlagToggle role enforcement
 *   - Registry completeness (all 24 flags have required fields)
 */

import { describe, it, expect } from 'vitest';
import {
  buildInitialFlags,
  validateFlagToggle,
  FlagToggleDeniedError,
} from '../slices/feature-flags-slice';
import { FEATURE_FLAGS, getFlag } from '../../feature-flags/registry';
import type { StoreActor } from '../slices/outlets-slice';

// ── Actors ───────────────────────────────────────────────────────────────────

const ORG_ADMIN: StoreActor = { id: 'staff-r02-001', role: 'R02' };
const CEO: StoreActor = { id: 'staff-r01-001', role: 'R01' };
const SALES_EXEC: StoreActor = { id: 'staff-r09-001', role: 'R09' };
const READ_ONLY: StoreActor = { id: 'staff-r12-001', role: 'R12' };

// ── Registry completeness — L12 ───────────────────────────────────────────────

describe('FEATURE_FLAGS registry — L12', () => {
  it('has at least 24 registered flags', () => {
    expect(FEATURE_FLAGS.length).toBeGreaterThanOrEqual(24);
  });

  it('every flag has a non-empty description', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(flag.description, `Flag "${flag.key}" missing description`).toBeTruthy();
      expect(
        flag.description.length,
        `Flag "${flag.key}" description is too short`,
      ).toBeGreaterThan(5);
    }
  });

  it('every flag has a valid key (no spaces, kebab/dot separated)', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(flag.key, `Flag "${flag.key}" has invalid characters`).toMatch(
        /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/,
      );
    }
  });

  it('every flag has an owningSpec that references a SPEC-* id', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(
        flag.owningSpec,
        `Flag "${flag.key}" missing owningSpec`,
      ).toMatch(/^SPEC-/);
    }
  });

  it('every flag has a scope of "global" or "outlet"', () => {
    for (const flag of FEATURE_FLAGS) {
      expect(
        ['global', 'outlet'],
        `Flag "${flag.key}" has invalid scope`,
      ).toContain(flag.scope);
    }
  });

  it('settings-module flag exists in registry', () => {
    const flag = FEATURE_FLAGS.find((f) => f.key === 'settings-module');
    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(true);
  });
});

// ── getFlag — runtime helper ───────────────────────────────────────────────────

describe('getFlag', () => {
  it('returns the defaultValue for a known key', () => {
    expect(getFlag('settings-module')).toBe(true);
  });

  it('returns false for an unknown key', () => {
    expect(getFlag('non-existent-flag-xyz')).toBe(false);
  });
});

// ── buildInitialFlags ─────────────────────────────────────────────────────────

describe('buildInitialFlags', () => {
  it('creates one flag entry per registry entry', () => {
    const flags = buildInitialFlags();
    expect(Object.keys(flags).length).toBe(FEATURE_FLAGS.length);
  });

  it('seeds value from registry defaultValue', () => {
    const flags = buildInitialFlags();
    for (const entry of FEATURE_FLAGS) {
      expect(flags[entry.key]?.value).toBe(entry.defaultValue);
    }
  });

  it('flag entries carry description and owningSpec from registry', () => {
    const flags = buildInitialFlags();
    const flag = flags['settings-module'];
    expect(flag?.description).toBeTruthy();
    expect(flag?.owningSpec).toBe('SPEC-SETTINGS-001');
  });

  it('updatedBy is "system" on initial seed', () => {
    const flags = buildInitialFlags();
    for (const flag of Object.values(flags)) {
      expect(flag.updatedBy).toBe('system');
    }
  });
});

// ── validateFlagToggle — L6 ───────────────────────────────────────────────────

describe('validateFlagToggle — L6', () => {
  it('throws FlagToggleDeniedError for R09 (below R02)', () => {
    expect(() => validateFlagToggle(SALES_EXEC)).toThrow(FlagToggleDeniedError);
  });

  it('throws FlagToggleDeniedError for R12 (read-only role)', () => {
    expect(() => validateFlagToggle(READ_ONLY)).toThrow(FlagToggleDeniedError);
  });

  it('R02 (Org Admin) is allowed to toggle flags', () => {
    expect(() => validateFlagToggle(ORG_ADMIN)).not.toThrow();
  });

  it('R01 (CEO) is allowed to toggle flags', () => {
    expect(() => validateFlagToggle(CEO)).not.toThrow();
  });

  it('error message references required R02 role', () => {
    try {
      validateFlagToggle(SALES_EXEC);
    } catch (e) {
      expect(e).toBeInstanceOf(FlagToggleDeniedError);
      expect((e as Error).message).toContain('R02');
    }
  });
});
