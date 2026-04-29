/**
 * ID generation helpers for custom-builds store.
 */

let seq = 0;

export function makeJobId(): string {
  return `CBJ-${Date.now()}-${++seq}`;
}

export function makeActivityId(): string {
  return `CBA-${Date.now()}-${++seq}`;
}

export function makeVendorId(): string {
  return `CBV-${Date.now()}-${++seq}`;
}

/**
 * Generate a cost-ledger entry ID with a given prefix.
 * e.g. makeId('CLE-CB-') → 'CLE-CB-1714700000000-1'
 */
export function makeId(prefix: string): string {
  return `${prefix}${Date.now()}-${++seq}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Returns today's date as an ISO date-only string (YYYY-MM-DD). */
export function nowDate(): string {
  return new Date().toISOString().split('T')[0]!;
}
