/**
 * GSTIN Validator tests — SPEC-SETTINGS-001 L2
 *
 * Covers: 15-char canonical format, state codes, rejects malformed input.
 */

import { describe, it, expect } from 'vitest';
import { isValidGstin, gstinStateCode, GSTIN_REGEX } from '../gstin-validator';

describe('GSTIN_REGEX', () => {
  it('should be a RegExp', () => {
    expect(GSTIN_REGEX).toBeInstanceOf(RegExp);
  });
});

describe('isValidGstin', () => {
  // ── Valid GSTINs ──────────────────────────────────────────────────────────

  it('accepts a valid Karnataka GSTIN (BLR outlet)', () => {
    // 29 = Karnataka
    expect(isValidGstin('29AABCT1332L1ZQ')).toBe(true);
  });

  it('accepts a valid Maharashtra GSTIN (MUM outlet)', () => {
    // 27 = Maharashtra
    expect(isValidGstin('27AABCT1332L1ZQ')).toBe(true);
  });

  it('accepts a valid Tamil Nadu GSTIN (CHE outlet)', () => {
    // 33 = Tamil Nadu
    expect(isValidGstin('33AABCT1332L1ZQ')).toBe(true);
  });

  it('accepts a GSTIN where check digit is a digit (not A-Z)', () => {
    // Last char can be [A-Z0-9] per spec — test numeric check digit
    expect(isValidGstin('27AABCT1332L1Z9')).toBe(true);
  });

  // ── Invalid GSTINs ────────────────────────────────────────────────────────

  it('rejects a GSTIN that is only 14 chars (too short)', () => {
    expect(isValidGstin('29AABCT1332L1Z')).toBe(false);
  });

  it('rejects a GSTIN that is 16 chars (too long)', () => {
    expect(isValidGstin('29AABCT1332L1ZQX')).toBe(false);
  });

  it('rejects a GSTIN with lowercase letters', () => {
    expect(isValidGstin('29aabct1332l1zq')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidGstin('')).toBe(false);
  });

  it('rejects a GSTIN missing the literal Z at position 13', () => {
    // Replace Z with A
    expect(isValidGstin('29AABCT1332L1AQ')).toBe(false);
  });

  it('rejects a GSTIN with special characters', () => {
    expect(isValidGstin('29AABCT1332L1Z!')).toBe(false);
  });
});

describe('gstinStateCode', () => {
  it('returns "29" for a Karnataka GSTIN', () => {
    expect(gstinStateCode('29AABCT1332L1ZQ')).toBe('29');
  });

  it('returns "27" for a Maharashtra GSTIN', () => {
    expect(gstinStateCode('27AABCT1332L1ZQ')).toBe('27');
  });

  it('returns "33" for a Tamil Nadu GSTIN', () => {
    expect(gstinStateCode('33AABCT1332L1ZQ')).toBe('33');
  });

  it('returns null for an invalid GSTIN', () => {
    expect(gstinStateCode('INVALID')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(gstinStateCode('')).toBeNull();
  });
});
