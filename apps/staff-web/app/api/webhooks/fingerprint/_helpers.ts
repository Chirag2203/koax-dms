/**
 * Fingerprint webhook helpers — sibling module to `route.ts`.
 *
 * The leading-underscore filename excludes it from Next.js routing, so the
 * route handler can re-import these without making them exports of the
 * route file (which Next.js App Router forbids — only `GET`/`POST`/etc.
 * and a fixed set of config exports are allowed). Tests import directly
 * from this module.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

// ─── HMAC validation ──────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 over body bytes using the given secret.
 * Returns hex-encoded signature without a prefix.
 */
export function computeHmac(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two HMAC signatures.
 * Returns true if equal.
 */
export function verifyHmac(body: string, signatureHeader: string, secret: string): boolean {
  const expected = computeHmac(body, secret);
  const provided = signatureHeader.replace(/^sha256=/, '');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}

// ─── In-memory dedup set (per-process; adequate for mock phase) ───────────────
// Key: `${staffId}|${eventType}|${Math.floor(ts/60000)}` — 60s bucket (L17 dedup window)

export const dedupSet = new Set<string>();

export function dedupKey(staffId: string, eventType: string, timestamp: string): string {
  const ts = new Date(timestamp).getTime();
  // Use Math.floor so timestamps 0–59s into a minute share the same bucket.
  // Math.round would cause the second at :30+ to land in the next bucket (off-by-one at midpoint).
  const bucket = Math.floor(ts / 60000); // 60s buckets (floor, not round)
  return `${staffId}|${eventType}|${bucket}`;
}
