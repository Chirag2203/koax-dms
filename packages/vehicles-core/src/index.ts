/**
 * @dms/vehicles-core — barrel export.
 *
 * Pure functions and types; zero Zustand, React, or fixture bindings.
 * Safe to import from both staff-web and customer-web.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.0, D13
 */

export { normalizeVin, tryNormalizeVin, VinError } from './vin-normalizer';

export { effectiveState, isCustomerAccessible } from './effective-state';
export type { EffectiveState } from './effective-state';

export { computeAutoMatch } from './auto-match';

export { isCpoEligible, CPO_RULE } from './cpo-rule';
export type { CpoBadge, CpoReason, CpoResult } from './cpo-rule';

export type {
  OwnedVehicleView,
  OwnershipHistorySummary,
  ServiceRecordView,
} from './view-types';

export { maskedContactFor, R19_RANK } from './contact-mask';
export type { ContactView } from './contact-mask';
