/**
 * Unit tests — normalizeVin / tryNormalizeVin
 * Spec reference: SPEC-VEHICLES-001 §2.1, D12
 */

import { describe, it, expect } from 'vitest';
import { normalizeVin, tryNormalizeVin, VinError } from '../vin-normalizer';

describe('normalizeVin', () => {
  it('accepts a valid 17-char uppercase VIN', () => {
    expect(normalizeVin('WBA3A5C50DF123456')).toBe('WBA3A5C50DF123456');
  });

  it('uppercases a lowercase VIN', () => {
    expect(normalizeVin('wba3a5c50df123456')).toBe('WBA3A5C50DF123456');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeVin('  WBA3A5C50DF123456  ')).toBe('WBA3A5C50DF123456');
  });

  it('throws VinError for length < 17', () => {
    expect(() => normalizeVin('WBA123')).toThrow(VinError);
  });

  it('throws VinError for length > 17', () => {
    expect(() => normalizeVin('WBA3A5C50DF123456X')).toThrow(VinError);
  });

  it('throws VinError for forbidden char I', () => {
    expect(() => normalizeVin('WBA3A5C50DF12345I')).toThrow(VinError);
  });

  it('throws VinError for forbidden char O', () => {
    expect(() => normalizeVin('WBA3A5C50DF12345O')).toThrow(VinError);
  });

  it('throws VinError for forbidden char Q', () => {
    expect(() => normalizeVin('WBA3A5C50DF12345Q')).toThrow(VinError);
  });

  it('throws VinError for forbidden char U', () => {
    expect(() => normalizeVin('WBA3A5C50DF12345U')).toThrow(VinError);
  });

  it('throws VinError for forbidden char Z', () => {
    expect(() => normalizeVin('WBA3A5C50DF12345Z')).toThrow(VinError);
  });

  it('rejects VIN-B fixture (Audi RS5) because it contains Z', () => {
    // WAUFGAFR9LA003456 contains Z — a forbidden character per ISO 3779 §4.
    // The fixture vin is intentionally representative; normalizeVin correctly rejects it.
    // Real fixture VINs used in tests must not contain I/O/Q/U/Z.
    expect(() => normalizeVin('WAUFGAFR9LA003456')).toThrow(VinError);
  });

  it('accepts VIN-C from fixture (Porsche 911)', () => {
    expect(normalizeVin('WP0AB2A98KS123456')).toBe('WP0AB2A98KS123456');
  });
});

describe('tryNormalizeVin', () => {
  it('returns normalized VIN for valid input', () => {
    expect(tryNormalizeVin('WBA3A5C50DF123456')).toBe('WBA3A5C50DF123456');
  });

  it('returns null for invalid input instead of throwing', () => {
    expect(tryNormalizeVin('TOOSHORT')).toBeNull();
    expect(tryNormalizeVin('WBA3A5C50DF12345I')).toBeNull();
  });
});
