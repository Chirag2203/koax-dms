/**
 * Unit tests — doc-expiry helpers
 *
 * Spec reference: PLAN-VEHICLES-003 §2.4, §8 P1, L23
 */

import { describe, it, expect } from 'vitest';
import { documentExpiryChip, staleListingChip } from '../doc-expiry';

const NOW = '2026-04-20T12:00:00.000Z';

// ─── documentExpiryChip ───────────────────────────────────────────────────────

describe('documentExpiryChip', () => {
  it('returns null when expiresAt is undefined', () => {
    expect(documentExpiryChip(undefined, NOW)).toBeNull();
  });

  it('returns "expired" when expiresAt is in the past', () => {
    expect(documentExpiryChip('2026-04-17T12:00:00.000Z', NOW)).toBe('expired');
  });

  it('returns "expired" for yesterday', () => {
    expect(documentExpiryChip('2026-04-19T12:00:00.000Z', NOW)).toBe('expired');
  });

  it('returns "warning-30d" when expiry is exactly today (same time)', () => {
    expect(documentExpiryChip(NOW, NOW)).toBe('warning-30d');
  });

  it('returns "warning-30d" when expiry is 15 days away', () => {
    expect(documentExpiryChip('2026-05-05T12:00:00.000Z', NOW)).toBe('warning-30d');
  });

  it('returns "warning-30d" when expiry is exactly 30 days away', () => {
    expect(documentExpiryChip('2026-05-20T12:00:00.000Z', NOW)).toBe('warning-30d');
  });

  it('returns null when expiry is 31 days away', () => {
    expect(documentExpiryChip('2026-05-21T12:00:00.000Z', NOW)).toBeNull();
  });

  it('returns null when expiry is 90 days away', () => {
    expect(documentExpiryChip('2026-07-19T12:00:00.000Z', NOW)).toBeNull();
  });
});

// ─── staleListingChip ─────────────────────────────────────────────────────────

describe('staleListingChip', () => {
  it('returns null when listed < 90 days ago', () => {
    // 89 days before NOW
    const listedAt = new Date(new Date(NOW).getTime() - 89 * 24 * 60 * 60 * 1000).toISOString();
    expect(staleListingChip(listedAt, NOW)).toBeNull();
  });

  it('returns null when listed exactly 90 days ago (boundary — < triggers at > 90)', () => {
    const listedAt = new Date(new Date(NOW).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    // >= 90 triggers stale-90d
    expect(staleListingChip(listedAt, NOW)).toBe('stale-90d');
  });

  it('returns "stale-90d" at day 91', () => {
    const listedAt = new Date(new Date(NOW).getTime() - 91 * 24 * 60 * 60 * 1000).toISOString();
    expect(staleListingChip(listedAt, NOW)).toBe('stale-90d');
  });

  it('returns "very-stale-180d" at day 181', () => {
    const listedAt = new Date(new Date(NOW).getTime() - 181 * 24 * 60 * 60 * 1000).toISOString();
    expect(staleListingChip(listedAt, NOW)).toBe('very-stale-180d');
  });

  it('returns "very-stale-180d" at exactly day 180 (>= threshold)', () => {
    const listedAt = new Date(new Date(NOW).getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    expect(staleListingChip(listedAt, NOW)).toBe('very-stale-180d');
  });

  it('suppresses chip when dealStage === "reserved" (L23)', () => {
    // Even at 200 days, chip is suppressed while RESERVED
    const listedAt = new Date(new Date(NOW).getTime() - 200 * 24 * 60 * 60 * 1000).toISOString();
    expect(staleListingChip(listedAt, NOW, 'reserved')).toBeNull();
  });

  it('shows chip when dealStage is NOT reserved (e.g., "new-lead")', () => {
    const listedAt = new Date(new Date(NOW).getTime() - 200 * 24 * 60 * 60 * 1000).toISOString();
    expect(staleListingChip(listedAt, NOW, 'new-lead')).toBe('very-stale-180d');
  });

  it('shows chip when dealStage is undefined', () => {
    const listedAt = new Date(new Date(NOW).getTime() - 200 * 24 * 60 * 60 * 1000).toISOString();
    expect(staleListingChip(listedAt, NOW, undefined)).toBe('very-stale-180d');
  });
});
