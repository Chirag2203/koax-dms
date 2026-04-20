/**
 * Vehicles module — barrel export for staff-web.
 *
 * Re-exports the store hook plus pure helpers from @dms/vehicles-core for
 * convenience so staff-web components only need one import path.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.0, §3.1
 */

// Store
export {
  useVehiclesStore,
  useVehiclesStoreSelector,
} from './vehicles-store';
export type { Actor, VehiclesStore, VehiclesState } from './vehicles-store';

// Hydrator
export { VehiclesStoreHydrator } from './vehicles-store-hydrator';

// State machine
export {
  canTransitionOwnership,
  canTransitionClaim,
  allowedNextOwnership,
  allowedNextClaim,
  meetsMinRole,
  ROLE_RANK,
} from './state-machine';

// Pure helpers re-exported from @dms/vehicles-core
export {
  normalizeVin,
  tryNormalizeVin,
  VinError,
  effectiveState,
  isCustomerAccessible,
  computeAutoMatch,
  isCpoEligible,
  CPO_RULE,
} from '@dms/vehicles-core';
export type {
  EffectiveState,
  CpoBadge,
  CpoResult,
  OwnedVehicleView,
  OwnershipHistorySummary,
  ServiceRecordView,
} from '@dms/vehicles-core';
