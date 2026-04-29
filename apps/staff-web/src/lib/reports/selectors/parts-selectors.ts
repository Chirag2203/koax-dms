/**
 * Parts margin % selector.
 *
 * L14: Parts module does not expose costPrice per SKU cleanly in v1.
 *      This selector returns { kind: 'deferred' } until DEF-REPORTS-4 is resolved.
 *      The tile renders '—' with caption reports.partsMarginDeferredNotice.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3 L14 (DEF-REPORTS-4)
 */

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '../types';

// L14: Parts margin is deferred — parts-store does not expose costPrice per SKU in v1
// DEF-REPORTS-4: Tracked for resolution when parts-store exposes costPrice
export function selectPartsMarginPct(
  _state: ReportInputState,
  _period: ReportPeriod,
  _scope: ReportScope,
): KpiValue {
  // L14: Always return deferred in v1
  return { kind: 'deferred' };
}
