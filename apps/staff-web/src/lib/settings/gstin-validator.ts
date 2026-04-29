/**
 * GSTIN validator — SPEC-SETTINGS-001 L2
 *
 * L2: GSTIN is mandatory per outlet and regex-validated.
 * Regex shared with parts/05-p4-1-enhancements-phase.md L6.
 * Format: 15 chars — NN AAAAA NNNN A N A Z A
 *   NN    = 2-digit state code
 *   AAAAA = 5-letter PAN prefix
 *   NNNN  = 4-digit PAN serial
 *   A     = 1-letter PAN check
 *   N     = 1-digit entity number (1-9)
 *   A|D   = 1 alphanum (default Z for GST registration)
 *   Z     = literal 'Z'
 *   A|D   = 1 alphanum check digit
 */

// L2: canonical GSTIN regex — shared with finance vendor invoice form (Seam 21)
// 15 chars: NN AAAAA NNNN A N Z A
// Positions: 0-1 state | 2-6 PAN prefix | 7-10 PAN serial | 11 PAN check | 12 entity# | 13 Z | 14 check
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\dZ[A-Z\d]$/;

/**
 * Returns true when `s` is a structurally valid GSTIN.
 * Does NOT check the checksum digit — structural validation only.
 * L2: save is blocked on format mismatch.
 */
export function isValidGstin(s: string): boolean {
  return GSTIN_REGEX.test(s);
}

/**
 * Returns a state code prefix from the GSTIN (first 2 digits).
 * Returns null for invalid GSTINs.
 */
export function gstinStateCode(gstin: string): string | null {
  if (!isValidGstin(gstin)) return null;
  return gstin.slice(0, 2);
}
