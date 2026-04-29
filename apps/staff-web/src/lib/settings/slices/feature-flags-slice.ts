/**
 * Feature flags slice — SPEC-SETTINGS-001 §4
 * L6: In-memory toggle only in v1. R02+ can toggle. R12 read-only.
 * L12: Registry at apps/staff-web/src/lib/feature-flags/registry.ts is canonical.
 */

import type { FeatureFlag } from '@dms/types';
import { hasRank } from '@dms/types';
import { FEATURE_FLAGS } from '../../feature-flags/registry';
import type { StoreActor } from './outlets-slice';

export interface FlagsSliceState {
  flags: Record<string, FeatureFlag>;
}

export class FlagToggleDeniedError extends Error {
  constructor(role: string) {
    super(`Feature flag toggle requires Org Admin (R02) authority. Actor role: ${role}`);
    this.name = 'FlagToggleDeniedError';
  }
}

/** Build initial flags record from registry defaults */
export function buildInitialFlags(): Record<string, FeatureFlag> {
  const now = new Date().toISOString();
  const result: Record<string, FeatureFlag> = {};
  for (const entry of FEATURE_FLAGS) {
    result[entry.key] = {
      key: entry.key,
      value: entry.defaultValue,
      defaultValue: entry.defaultValue,
      description: entry.description,
      owningSpec: entry.owningSpec,
      scope: entry.scope,
      updatedAt: now,
      updatedBy: 'system',
    };
  }
  return result;
}

/** L6: Validate actor can toggle flags (R02+ required) */
export function validateFlagToggle(actor: StoreActor): void {
  if (!hasRank(actor.role, 'R02')) {
    throw new FlagToggleDeniedError(actor.role);
  }
}
