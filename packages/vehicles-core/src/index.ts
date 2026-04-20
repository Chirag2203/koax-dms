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

// ─── PLAN-VEHICLES-003 Phase 1 additions ─────────────────────────────────────

export {
  computeGstMargin,
  DEFAULT_COMMISSION_PCT,
  TCS_THRESHOLD_INR,
  TCS_RATE,
  GST_RATE,
  GST_DIVISOR,
} from './gst-margin';
export type { GstMarginInput, ComputedGstMargin } from './gst-margin';

export {
  buildVehicleTimeline,
  renderTimelineEntry,
  renderLegacyFallback,
} from './timeline-adapter';
export type {
  TimelineEntry,
  RenderContext,
  TimelineEntryView,
  TimelineChip,
  TimelineMetaItem,
} from './timeline-adapter';

export {
  PAYLOAD_KEY_LABELS,
  labelFor,
  formatterFor,
} from './translation-table';
export type { FormatterName, QualifiedKey, PayloadKeyLabels } from './translation-table';

export { documentExpiryChip, staleListingChip } from './doc-expiry';

export {
  SalesEventPayloadValidators,
  DocumentAccessPayloadValidators,
  PayloadValidationError,
  validateSalesEventPayload,
  validateDocumentAccessPayload,
  SalesEventKindEnum,
  DocumentAccessKindEnum,
} from './event-payload-validators';
