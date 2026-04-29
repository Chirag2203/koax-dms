/**
 * Retry utility tests — SPEC-NOTIFICATIONS-001 L14
 */

import { describe, it, expect } from 'vitest';
import { getBackoffMs, getNextRetryAt, isTerminalFailure, RETRY_BACKOFF_MINUTES, MAX_RETRY_COUNT } from '../retry';

describe('getBackoffMs', () => {
  it('L14: attempt 0 → 1 minute (60000 ms)', () => {
    expect(getBackoffMs(0)).toBe(60 * 1000);
  });

  it('L14: attempt 1 → 5 minutes (300000 ms)', () => {
    expect(getBackoffMs(1)).toBe(5 * 60 * 1000);
  });

  it('L14: attempt 2 → 30 minutes (1800000 ms)', () => {
    expect(getBackoffMs(2)).toBe(30 * 60 * 1000);
  });

  it('falls back to 30 minutes for out-of-range attempt', () => {
    expect(getBackoffMs(99)).toBe(30 * 60 * 1000);
  });
});

describe('getNextRetryAt', () => {
  it('returns ISO timestamp in the future', () => {
    const base = new Date('2026-04-29T10:00:00.000Z');
    const result = getNextRetryAt(0, base);
    const resultDate = new Date(result);
    expect(resultDate.getTime()).toBeGreaterThan(base.getTime());
  });

  it('first retry is 1 minute after base', () => {
    const base = new Date('2026-04-29T10:00:00.000Z');
    const result = getNextRetryAt(0, base);
    const expected = new Date('2026-04-29T10:01:00.000Z');
    expect(result).toBe(expected.toISOString());
  });

  it('second retry is 5 minutes after base', () => {
    const base = new Date('2026-04-29T10:00:00.000Z');
    const result = getNextRetryAt(1, base);
    const expected = new Date('2026-04-29T10:05:00.000Z');
    expect(result).toBe(expected.toISOString());
  });

  it('third retry is 30 minutes after base', () => {
    const base = new Date('2026-04-29T10:00:00.000Z');
    const result = getNextRetryAt(2, base);
    const expected = new Date('2026-04-29T10:30:00.000Z');
    expect(result).toBe(expected.toISOString());
  });
});

describe('isTerminalFailure', () => {
  it('returns false for retryCount < MAX_RETRY_COUNT', () => {
    expect(isTerminalFailure(0)).toBe(false);
    expect(isTerminalFailure(1)).toBe(false);
    expect(isTerminalFailure(2)).toBe(false);
  });

  it('L14: returns true when retryCount === MAX_RETRY_COUNT (3)', () => {
    expect(isTerminalFailure(MAX_RETRY_COUNT)).toBe(true);
  });

  it('L14: returns true when retryCount > MAX_RETRY_COUNT', () => {
    expect(isTerminalFailure(4)).toBe(true);
    expect(isTerminalFailure(10)).toBe(true);
  });

  it('MAX_RETRY_COUNT is 3 per Doc 13 §2', () => {
    expect(MAX_RETRY_COUNT).toBe(3);
  });

  it('backoff minutes are [1, 5, 30] per Doc 13 §2', () => {
    expect(RETRY_BACKOFF_MINUTES).toEqual([1, 5, 30]);
  });
});
