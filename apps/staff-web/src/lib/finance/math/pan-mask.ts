/**
 * PAN masking — SPEC-FINANCE-001 L13
 *
 * L13: Customer PAN is PII per DPDP Act 2023 §3.
 *      Render last-4 + suffix char only: e.g. ABCDE1234F → XXXXX1234F.
 *      Vendor PAN is public business data per IT Act §139A; displayed in full.
 *      Full PAN is never logged. DPDP Act 2023 §3; IT Act §139A.
 */

/**
 * Mask a customer PAN to show only last-4 digits + check character.
 * ABCDE1234F → XXXXX1234F (5 X's + 4 digits + 1 check char)
 *
 * L13: DPDP Act 2023 §3; IT Act §139A
 */
export function maskPan(pan: string | null | undefined): string {
  if (!pan) return '';
  if (pan.length !== 10) return 'INVALID';
  // L13: DPDP Act 2023 §3 — display last-4 + suffix only
  return `XXXXX${pan.slice(5)}`;
}

/**
 * Validate PAN format (10-char alphanumeric: AAAAA9999A).
 * PAN format: 5 letters + 4 digits + 1 letter.
 */
export function isValidPanFormat(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}
