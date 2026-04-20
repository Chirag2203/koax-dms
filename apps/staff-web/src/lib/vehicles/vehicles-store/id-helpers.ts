/**
 * ID and timestamp helpers for vehicles-store runtime mutations.
 *
 * Fixtures use deterministic IDs ('own-vina-rohan'); runtime IDs use
 * Date.now() + rand to guarantee uniqueness without collision.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.1
 */

/** Base ID generator — `'<prefix>-<timestamp>-<rand5>'` */
function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now()}-${rand}`;
}

/** Current UTC ISO timestamp. */
export function now(): string {
  return new Date().toISOString();
}

/** Ownership row ID: `'own-<timestamp>-<rand>'` */
export function makeOwnershipId(): string {
  return makeId('own');
}

/** Claim ID: `'clm-<timestamp>-<rand>'` */
export function makeClaimId(): string {
  return makeId('clm');
}

/** Ownership change event ID: `'evt-<timestamp>-<rand>'` */
export function makeEventId(): string {
  return makeId('evt');
}

/**
 * Add 7 days to an ISO datetime string — used for grace window.
 * Returns an ISO datetime string.
 */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Add 2555 days (≈7 years) to a date — used for PII retention scheduling.
 * 2555 = 365 × 7 (Companies Act retention per D7).
 */
export function addPiiRetentionDays(isoDate: string): string {
  return addDays(isoDate, 2555);
}

/** Counter for anon sentinel IDs — incremented per anonymized row. */
let _anonCounter = 0;
export function nextAnonSentinel(): string {
  _anonCounter += 1;
  return `anon-${_anonCounter}`;
}
