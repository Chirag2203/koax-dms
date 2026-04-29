/**
 * Reports — numeric formatters.
 *
 * L8: INR amounts use formatINR from @dms/vehicles-core where available.
 *     Percentages: 1 decimal place (toFixed(1) + '%').
 *     Counts: integer (Math.round).
 *     Duration in days: integer.
 *     No raw toLocaleString with hardcoded locale.
 *
 * Spec reference: SPEC-REPORTS-001 L8
 */

// ─── INR formatter ────────────────────────────────────────────────────────────

// L8: Re-export formatINR from vehicles-core; fall back to local impl if unavailable.
// vehicles-core is an internal package — import path may vary; keep a local fallback.
let _formatINR: (amount: number) => string;

try {
  // Dynamic require to avoid hard compile-time dep; caught if package unavailable
  // reason: L8 allows local fallback when @dms/vehicles-core export is unavailable
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const core = require('@dms/vehicles-core') as { formatINR?: (n: number) => string };
  if (typeof core.formatINR === 'function') {
    _formatINR = core.formatINR;
  } else {
    throw new Error('not found');
  }
} catch {
  _formatINR = (amount: number): string => {
    // L8: INR format — Indian numbering system, no decimals
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };
}

/**
 * Format a number as INR currency.
 * L8: uses shared formatter; no raw toLocaleString.
 */
export const formatINR = _formatINR;

// ─── Percentage formatter ──────────────────────────────────────────────────────

/**
 * Format a percentage value.
 * L8: 1 decimal place, e.g. '42.3%'
 */
export function formatPct(value: number): string {
  return value.toFixed(1) + '%';
}

// ─── Count formatter ──────────────────────────────────────────────────────────

/**
 * Format a count as integer.
 * L8: Math.round
 */
export function formatCount(value: number): string {
  return String(Math.round(value));
}

// ─── Days formatter ───────────────────────────────────────────────────────────

/**
 * Format a duration in days as integer with 'd' suffix.
 */
export function formatDays(value: number): string {
  return `${Math.round(value)}d`;
}
