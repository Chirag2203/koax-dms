/**
 * GSTIN format validation — SPEC-FINANCE-001 L6
 *
 * L6: Regex: ^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$ (15 chars)
 *     Structure: state-code(2) + PAN(10) + entity(1) + 'Z' + checksum(1)
 *     Format-only validation in v1; live GSTN portal verification is v2 (DEF-FIN-7).
 *     CBIC GSTN format spec; Doc 06 §GSTIN.
 *
 * This is the SINGLE location where the GSTIN regex lives.
 * L16 drift gate: 'GSTIN_REGEX' or the pattern must not appear inline in components.
 */

/** L6: Canonical GSTIN regex — do not copy to components; import from here. */
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/;

/**
 * Validate a GSTIN string against the canonical format.
 *
 * L6: CBIC GSTN format spec; Doc 06 §GSTIN
 * Returns true only for a valid 15-character GSTIN.
 */
export function isValidGstin(gstin: string): boolean {
  // L6: CBIC GSTN format spec; Doc 06 §GSTIN
  return GSTIN_REGEX.test(gstin);
}

/**
 * Extract the state code from a GSTIN (first 2 digits).
 * Useful for outlet-attribution (L29).
 */
export function gstinStateCode(gstin: string): string | null {
  if (!isValidGstin(gstin)) return null;
  return gstin.slice(0, 2);
}
