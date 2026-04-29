/**
 * Finance math layer — public exports.
 *
 * L10: All margin/GST/TCS/aging/journal computation MUST route through this module.
 *      Inline calculations in components are auto-rejected at review.
 *      SPEC-FINANCE-001 L10; Doc 06 §math-locality.
 */

export * from './rounding';
export * from './gst-margin';
export * from './tcs';
export * from './balance';
export * from './period';
export * from './pan-mask';
export * from './gstin-format';
export * from './aging';
