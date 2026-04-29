/**
 * INR amount display — SPEC-FINANCE-001 L11
 *
 * L11: Money stored as paise integers; rendered as rupees with 2-decimal display.
 *      All money/percentage strings via i18n keys under finance.*.
 *      SPEC-ARCH-UI-001 §typography — font-mono tabular-nums for amounts.
 */

'use client';

import { formatINR, formatINRCompact } from '@/src/lib/finance/math/rounding';

interface INRAmountProps {
  /** Amount in paise (integer). L11. */
  paise: number | null;
  /** Show compact notation (₹X.XXL / ₹X.XXCr). */
  compact?: boolean;
  /** Additional className for the span. */
  className?: string;
  /** Show em-dash for null/zero in empty-state contexts (L15). */
  emptyDash?: boolean;
}

/**
 * Render a paise integer as an INR amount.
 * Uses font-mono tabular-nums per SPEC-ARCH-UI-001 §StatTile.
 * L11: SPEC-FINANCE-001 L11; L15: em-dash on null.
 */
export function INRAmount({ paise, compact = false, className = '', emptyDash = false }: INRAmountProps) {
  if (paise === null) {
    return (
      <span className={`font-mono tabular-nums text-ink-muted ${className}`} aria-label="No amount">
        —
      </span>
    );
  }

  // L15: em-dash for zero in empty-state contexts
  if (emptyDash && paise === 0) {
    return (
      <span className={`font-mono tabular-nums text-ink-muted ${className}`} aria-label="Zero amount">
        —
      </span>
    );
  }

  const formatted = compact ? formatINRCompact(paise) : formatINR(paise);

  return (
    <span
      className={`font-mono tabular-nums ${className}`}
      aria-label={formatINR(paise)}
    >
      {formatted}
    </span>
  );
}
