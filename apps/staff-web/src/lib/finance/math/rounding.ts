/**
 * Rounding helpers — SPEC-FINANCE-001 L11
 *
 * L11: Money is stored in paise (integers) internally.
 *      Rounding mode = banker's rounding (half-to-even).
 *      GST amounts rounded per-invoice-line, NOT at total.
 *      Sum-of-lines may differ from total-then-round by ≤ ₹1 — correct per CBIC FAQ.
 *
 * CONVENTION: all functions accept and return paise integers (× 100 of rupees).
 * formatINR(1450000) → "₹14,500.00" (1450000 paise = ₹14,500.00)
 */

// ─── Banker's rounding (half-to-even) ────────────────────────────────────────

/**
 * Round a fractional paise value to an integer using banker's rounding.
 * Standard Math.round implements half-up; this implements half-to-even.
 *
 * L11: per-line rounding matches Tally Prime + GSTR-1 conventions.
 */
export function roundPaise(n: number): number {
  const floor = Math.floor(n);
  const diff = n - floor;

  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  // Exactly 0.5 — round to even
  return floor % 2 === 0 ? floor : floor + 1;
}

// ─── Format INR from paise ────────────────────────────────────────────────────

/**
 * Format a paise integer as an INR string with Indian comma grouping.
 * formatINR(1500000) → "₹15,000.00"
 * formatINR(0) → "₹0.00"
 *
 * L11: two-decimal display convention.
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  // Indian locale formatting: 1,00,000 style
  return rupees.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format paise as compact Indian notation (lakhs/crores).
 * formatINRCompact(1500000000) → "₹1.50Cr"
 * formatINRCompact(150000000) → "₹15.00L"
 */
export function formatINRCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) {
    const cr = rupees / 1_00_00_000;
    return `₹${cr.toFixed(2)}Cr`;
  }
  if (rupees >= 1_00_000) {
    const l = rupees / 1_00_000;
    return `₹${l.toFixed(2)}L`;
  }
  return formatINR(paise);
}

/**
 * Convert rupees (float) to paise integer — multiply by 100 then roundPaise.
 * Avoids floating-point precision issues.
 */
export function rupeesToPaise(rupees: number): number {
  return roundPaise(rupees * 100);
}

/**
 * Convert paise integer to rupees float (for display only — do NOT use for further math).
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
