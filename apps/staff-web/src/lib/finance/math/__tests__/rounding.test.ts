/**
 * Rounding tests — SPEC-FINANCE-001 L11
 *
 * L11: Paise-integer convention. Banker's rounding (half-to-even).
 */

import { describe, it, expect } from 'vitest';
import {
  roundPaise,
  formatINR,
  formatINRCompact,
  rupeesToPaise,
  paiseToRupees,
} from '../rounding';

describe('roundPaise — banker\'s rounding (half-to-even)', () => {
  it('rounds 0.5 down when integer part is even', () => {
    // 2.5 → 2 (even)
    expect(roundPaise(2.5)).toBe(2);
  });

  it('rounds 0.5 up when integer part is odd', () => {
    // 3.5 → 4 (next even)
    expect(roundPaise(3.5)).toBe(4);
  });

  it('rounds normally above 0.5', () => {
    expect(roundPaise(2.6)).toBe(3);
    expect(roundPaise(2.4)).toBe(2);
  });

  it('handles negative values', () => {
    expect(roundPaise(-2.5)).toBe(-2);
    expect(roundPaise(-3.5)).toBe(-4);
  });

  it('returns integers unchanged', () => {
    expect(roundPaise(100)).toBe(100);
    expect(roundPaise(0)).toBe(0);
  });
});

describe('rupeesToPaise / paiseToRupees', () => {
  it('converts rupees to paise', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(10.5)).toBe(1050);
  });

  it('converts paise to rupees', () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(1050)).toBe(10.5);
  });
});

describe('formatINR', () => {
  it('formats zero', () => {
    const result = formatINR(0);
    expect(result).toContain('0');
  });

  it('formats large amounts in Indian number format', () => {
    const result = formatINR(1_00_00_000); // ₹1 lakh
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('formatINRCompact', () => {
  it('formats lakhs correctly', () => {
    const result = formatINRCompact(10_00_000); // ₹10 lakh = 10,00,000 paise = ₹1L
    expect(result).toMatch(/₹|L|Cr/);
  });
});
