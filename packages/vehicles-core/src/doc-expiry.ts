/**
 * Document expiry and stale-listing chip helpers.
 *
 * Pure functions — no side effects, no React, no store imports.
 * Used by staff-web document card and vehicle header to show amber/red chips.
 *
 * Spec reference: PLAN-VEHICLES-003 §2.4, L23, addendum §4.2
 * LoC budget: ≤60
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPIRY_WARNING_DAYS = 30;
const STALE_AMBER_DAYS = 90;
const STALE_RED_DAYS = 180;

// ─── documentExpiryChip ───────────────────────────────────────────────────────

/**
 * Returns a chip state for a document based on its expiry date.
 *
 * - 'expired'    — expiresAt is in the past relative to now
 * - 'warning-30d' — expires within 30 days
 * - null         — more than 30 days away or no expiresAt
 *
 * @param expiresAt  ISO datetime string (optional — no chip if absent)
 * @param now        ISO datetime string for comparison (enables testing)
 */
export function documentExpiryChip(
  expiresAt: string | undefined,
  now: string,
): 'expired' | 'warning-30d' | null {
  if (!expiresAt) return null;

  const expiryMs = new Date(expiresAt).getTime();
  const nowMs = new Date(now).getTime();
  const diffDays = (expiryMs - nowMs) / MS_PER_DAY;

  if (diffDays < 0) return 'expired';
  if (diffDays <= EXPIRY_WARNING_DAYS) return 'warning-30d';
  return null;
}

// ─── staleListingChip ─────────────────────────────────────────────────────────

/**
 * Returns a chip state for a stale listing (vehicle on lot too long).
 *
 * - 'very-stale-180d' — listed ≥ 180 days ago
 * - 'stale-90d'       — listed ≥ 90 days ago
 * - null              — < 90 days or suppressed while deal is RESERVED (L23)
 *
 * @param listedAt   ISO datetime string of when VehicleMaster.listedAt was set
 * @param now        ISO datetime string for comparison
 * @param dealStage  Current active deal stage — suppresses chip when 'reserved' (L23)
 */
export function staleListingChip(
  listedAt: string,
  now: string,
  dealStage?: string,
): 'stale-90d' | 'very-stale-180d' | null {
  // Suppress while deal is actively reserved (L23)
  if (dealStage === 'reserved') return null;

  const listedMs = new Date(listedAt).getTime();
  const nowMs = new Date(now).getTime();
  const daysOnLot = (nowMs - listedMs) / MS_PER_DAY;

  if (daysOnLot >= STALE_RED_DAYS) return 'very-stale-180d';
  if (daysOnLot >= STALE_AMBER_DAYS) return 'stale-90d';
  return null;
}
