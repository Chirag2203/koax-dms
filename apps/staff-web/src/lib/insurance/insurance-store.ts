/**
 * Public entry for the insurance store.
 *
 * Re-exports from ./insurance-store/index so consumers use a stable import path.
 * Identical convention to the parts-store entry point.
 *
 * Spec reference: SPEC-INSURANCE-001 §6
 */

export {
  useInsuranceStore,
  useInsuranceStoreSelector,
  VINNotFoundError,
  R12RequiredError,
  TemplateNotApprovedError,
  PermissionError,
  AICallingDisabledError,
} from './insurance-store/index';
export type { StoreActor, InsuranceStore, InsuranceState } from './insurance-store/index';
