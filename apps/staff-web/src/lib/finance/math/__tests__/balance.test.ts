/**
 * Voucher balance tests — SPEC-FINANCE-001 L28
 *
 * L28: assertVoucherBalanced throws VoucherImbalancedError when Dr sum ≠ Cr sum.
 */

import { describe, it, expect } from 'vitest';
import {
  assertVoucherBalanced,
  assertAllVouchersBalanced,
  VoucherImbalancedError,
} from '../balance';
import type { JournalEntry } from '@dms/types';

function makeEntry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    voucherNumber: 'VR-TEST-001',
    voucherDate: '2026-04-01',
    voucherType: 'Sales',
    narration: 'Test voucher',
    sourceEvent: { module: 'sales', eventId: 'E-001' },
    legs: [],
    ...overrides,
  };
}

describe('assertVoucherBalanced — L28', () => {
  it('passes when Dr == Cr', () => {
    const entry = makeEntry({
      legs: [
        { ledgerName: 'Receivable', drCr: 'Dr', amountPaise: 100_00_000 },
        { ledgerName: 'Sales A/c', drCr: 'Cr', amountPaise: 100_00_000 },
      ],
    });
    expect(() => assertVoucherBalanced(entry)).not.toThrow();
  });

  it('throws VoucherImbalancedError when Dr ≠ Cr', () => {
    const entry = makeEntry({
      voucherNumber: 'VR-IMBAL-001',
      legs: [
        { ledgerName: 'Receivable', drCr: 'Dr', amountPaise: 100_00_000 },
        { ledgerName: 'Sales A/c', drCr: 'Cr', amountPaise: 90_00_000 }, // diff of ₹10k
      ],
    });
    expect(() => assertVoucherBalanced(entry)).toThrow(VoucherImbalancedError);
  });

  it('VoucherImbalancedError message contains voucher number', () => {
    const entry = makeEntry({
      voucherNumber: 'VR-TEST-999',
      legs: [
        { ledgerName: 'A', drCr: 'Dr', amountPaise: 500 },
        { ledgerName: 'B', drCr: 'Cr', amountPaise: 400 },
      ],
    });
    try {
      assertVoucherBalanced(entry);
    } catch (e) {
      expect(e).toBeInstanceOf(VoucherImbalancedError);
      if (e instanceof VoucherImbalancedError) {
        expect(e.message).toContain('VR-TEST-999');
      }
    }
  });

  it('passes with multiple Dr and Cr legs summing to same total', () => {
    const entry = makeEntry({
      legs: [
        { ledgerName: 'Receivable', drCr: 'Dr', amountPaise: 120_00_000 },
        { ledgerName: 'Sales A/c', drCr: 'Cr', amountPaise: 100_00_000 },
        { ledgerName: 'Output GST', drCr: 'Cr', amountPaise: 20_00_000 },
      ],
    });
    expect(() => assertVoucherBalanced(entry)).not.toThrow();
  });
});

describe('assertAllVouchersBalanced', () => {
  it('passes when all vouchers balance', () => {
    const entries = [
      makeEntry({
        voucherNumber: 'VR-A',
        legs: [
          { ledgerName: 'Dr1', drCr: 'Dr', amountPaise: 10000 },
          { ledgerName: 'Cr1', drCr: 'Cr', amountPaise: 10000 },
        ],
      }),
      makeEntry({
        voucherNumber: 'VR-B',
        legs: [
          { ledgerName: 'Dr2', drCr: 'Dr', amountPaise: 20000 },
          { ledgerName: 'Cr2', drCr: 'Cr', amountPaise: 20000 },
        ],
      }),
    ];
    expect(() => assertAllVouchersBalanced(entries)).not.toThrow();
  });

  it('throws on first imbalanced voucher', () => {
    const entries = [
      makeEntry({
        voucherNumber: 'VR-GOOD',
        legs: [
          { ledgerName: 'Dr', drCr: 'Dr', amountPaise: 10000 },
          { ledgerName: 'Cr', drCr: 'Cr', amountPaise: 10000 },
        ],
      }),
      makeEntry({
        voucherNumber: 'VR-BAD',
        legs: [
          { ledgerName: 'Dr', drCr: 'Dr', amountPaise: 10000 },
          { ledgerName: 'Cr', drCr: 'Cr', amountPaise: 9000 },
        ],
      }),
    ];
    expect(() => assertAllVouchersBalanced(entries)).toThrow(VoucherImbalancedError);
  });
});
