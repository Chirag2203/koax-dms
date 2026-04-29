/**
 * Customer ledger integration tests — SPEC-FINANCE-001 §1.4
 *
 * Scenarios covered:
 * S-F-Ledger-1: Aging classification (L7)
 * S-F-Ledger-2: PAN masking in ledger (L13)
 */

import { describe, it, expect } from 'vitest';
import { computeAgeDays, computeAgingState } from '../lib/finance/math/aging';
import { maskPan } from '../lib/finance/math/pan-mask';

describe('S-F-Ledger-1: Aging classification — L7', () => {
  const referenceDate = new Date('2026-05-01T00:00:00.000Z');

  it('classifies 0–30 days as green', () => {
    const issuedAt = '2026-04-15T00:00:00.000Z'; // 16 days ago
    const ageDays = computeAgeDays(issuedAt, referenceDate);
    expect(ageDays).toBe(16);
    expect(computeAgingState(ageDays)).toBe('green');
  });

  it('classifies 31–60 days as amber', () => {
    const issuedAt = '2026-03-25T00:00:00.000Z'; // ~37 days ago
    const ageDays = computeAgeDays(issuedAt, referenceDate);
    expect(ageDays).toBeGreaterThan(30);
    expect(ageDays).toBeLessThanOrEqual(60);
    expect(computeAgingState(ageDays)).toBe('amber');
  });

  it('classifies 61+ days as red', () => {
    const issuedAt = '2026-02-01T00:00:00.000Z'; // ~89 days ago
    const ageDays = computeAgeDays(issuedAt, referenceDate);
    expect(ageDays).toBeGreaterThan(60);
    expect(computeAgingState(ageDays)).toBe('red');
  });

  it('boundary: exactly 30 days is green', () => {
    expect(computeAgingState(30)).toBe('green');
  });

  it('boundary: exactly 31 days is amber', () => {
    expect(computeAgingState(31)).toBe('amber');
  });

  it('boundary: exactly 60 days is amber', () => {
    expect(computeAgingState(60)).toBe('amber');
  });

  it('boundary: exactly 61 days is red', () => {
    expect(computeAgingState(61)).toBe('red');
  });
});

describe('S-F-Ledger-2: PAN masking — L13', () => {
  it('masks first 5 characters of PAN', () => {
    const masked = maskPan('ABCDE1234F');
    expect(masked).toBe('XXXXX1234F');
  });

  it('preserves last 5 characters (4 digits + check char)', () => {
    const masked = maskPan('PQRST9876G');
    expect(masked).toBe('XXXXX9876G');
  });

  it('masks different PAN formats correctly', () => {
    expect(maskPan('AABCK5123R')).toBe('XXXXX5123R');
    expect(maskPan('AAFCA1234K')).toBe('XXXXX1234K');
  });

  it('PAN format is exactly 10 chars', () => {
    const pan = 'ABCDE1234F';
    const masked = maskPan(pan);
    expect(masked).toHaveLength(10);
    expect(masked.startsWith('XXXXX')).toBe(true);
  });
});
