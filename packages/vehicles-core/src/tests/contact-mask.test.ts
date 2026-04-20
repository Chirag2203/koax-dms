/**
 * Unit tests — maskedContactFor
 * Spec reference: PLAN-VEHICLES-002 §A (L11), Doc 14 (R19 rank = 4)
 */

import { describe, it, expect } from 'vitest';
import { maskedContactFor, R19_RANK } from '../contact-mask';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const confidentialCustomer = {
  phone: '+919876003002',
  email: 'karan.shah@gmail.com',
  addressLine: '12, Boat Club Road, Chennai 600028',
  contactConfidential: true as const,
};

const normalCustomer = {
  phone: '+919876001001',
  email: 'rohan.desai@gmail.com',
  addressLine: '5, Brigade Road, Bangalore 560001',
  contactConfidential: false as const,
};

const LOW_RANK = R19_RANK - 1; // below GM (e.g. R13 = 5) — masking applies
const HIGH_RANK = R19_RANK;     // GM (R19) — masking bypassed

// ─── masked-when-confidential-and-low-rank ────────────────────────────────────

describe('maskedContactFor — confidential customer, low-rank viewer', () => {
  const view = maskedContactFor(confidentialCustomer, LOW_RANK);

  it('isMasked is true', () => {
    expect(view.isMasked).toBe(true);
  });

  it('masks phone — last 2 digits visible, +91 prefix preserved', () => {
    // +919876003002 → "+91 *** *** **02"
    expect(view.phone).toBe('+91 *** *** **02');
  });

  it('masks email — first letter + *** @ *** + .com', () => {
    // karan.shah@gmail.com → "k***@***.com"
    expect(view.email).toBe('k***@***.com');
  });

  it('masks address to literal sentinel string', () => {
    expect(view.address).toBe('Hidden — confidential');
  });
});

// ─── raw-when-confidential-but-high-rank ──────────────────────────────────────

describe('maskedContactFor — confidential customer, high-rank viewer (R19+)', () => {
  const view = maskedContactFor(confidentialCustomer, HIGH_RANK);

  it('isMasked is false', () => {
    expect(view.isMasked).toBe(false);
  });

  it('returns raw phone', () => {
    expect(view.phone).toBe('+919876003002');
  });

  it('returns raw email', () => {
    expect(view.email).toBe('karan.shah@gmail.com');
  });

  it('returns raw address', () => {
    expect(view.address).toBe('12, Boat Club Road, Chennai 600028');
  });
});

// ─── raw-when-not-confidential ────────────────────────────────────────────────

describe('maskedContactFor — non-confidential customer, any rank', () => {
  it('low-rank viewer gets raw data when contactConfidential is false', () => {
    const view = maskedContactFor(normalCustomer, LOW_RANK);
    expect(view.isMasked).toBe(false);
    expect(view.phone).toBe('+919876001001');
    expect(view.email).toBe('rohan.desai@gmail.com');
    expect(view.address).toBe('5, Brigade Road, Bangalore 560001');
  });

  it('high-rank viewer also gets raw data', () => {
    const view = maskedContactFor(normalCustomer, HIGH_RANK);
    expect(view.isMasked).toBe(false);
    expect(view.phone).toBe('+919876001001');
  });
});

// ─── empty-fields-handling ────────────────────────────────────────────────────

describe('maskedContactFor — empty / absent fields', () => {
  const sparseCustomer = {
    contactConfidential: true as const,
    // phone, email, addressLine all omitted
  };

  it('returns empty strings for missing phone and email without throwing', () => {
    const view = maskedContactFor(sparseCustomer, LOW_RANK);
    expect(view.phone).toBe('');
    expect(view.email).toBe('');
  });

  it('returns undefined address when addressLine is absent', () => {
    const view = maskedContactFor(sparseCustomer, LOW_RANK);
    expect(view.address).toBeUndefined();
  });

  it('isMasked is true even with empty fields (confidential flag drives it)', () => {
    const view = maskedContactFor(sparseCustomer, LOW_RANK);
    expect(view.isMasked).toBe(true);
  });
});
