/**
 * VIN normalizer — single source of truth for VIN validation.
 *
 * Rule (D12): normalizeVin() is called at EVERY entry point — forms, URL params,
 * claim submit, auto-match, upsertVehicle. No raw VIN is written to state
 * without passing through this function first.
 *
 * Spec reference: SPEC-VEHICLES-001 §2.1, D12
 */

// ─── Error type ───────────────────────────────────────────────────────────────

/** Thrown by normalizeVin when the input fails VIN validation. */
export class VinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VinError';
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Characters forbidden in VINs (ISO 3779 §4). */
const FORBIDDEN_VIN_CHARS = /[IOQUZ]/;

const VIN_LENGTH = 17;

// ─── normalizeVin ─────────────────────────────────────────────────────────────

/**
 * Normalizes a raw VIN string to its canonical uppercase form.
 *
 * - Trims whitespace
 * - Uppercases
 * - Enforces exactly 17 characters
 * - Rejects characters I, O, Q, U, Z (ISO 3779 §4)
 *
 * @throws {VinError} if the input fails any rule
 */
export function normalizeVin(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper.length !== VIN_LENGTH) {
    throw new VinError(`VIN must be exactly 17 characters (got ${upper.length})`);
  }
  if (FORBIDDEN_VIN_CHARS.test(upper)) {
    throw new VinError('VIN contains forbidden characters: I, O, Q, U, or Z are not valid');
  }
  return upper;
}

/**
 * Safe variant — returns `null` instead of throwing.
 * Useful for form validation where you want to surface the error via the
 * form library rather than catching an exception.
 */
export function tryNormalizeVin(raw: string): string | null {
  try {
    return normalizeVin(raw);
  } catch {
    return null;
  }
}
