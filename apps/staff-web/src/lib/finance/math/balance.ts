/**
 * Voucher balance assertion — SPEC-FINANCE-001 L28
 *
 * L28: Every JournalEntry's debit and credit legs must sum to equal totals.
 *      assertVoucherBalanced throws if not. Called BEFORE export.
 *      Pre-export sanity check blocks CSV download on imbalance.
 *      Doc 06 §double-entry; SOX-style integrity check.
 */

import type { JournalEntry, JournalLeg } from '@dms/types';

// ─── Error type ───────────────────────────────────────────────────────────────

export class VoucherImbalancedError extends Error {
  readonly voucherNumber: string;
  readonly totalDrPaise: number;
  readonly totalCrPaise: number;
  readonly diffPaise: number;

  constructor(voucherNumber: string, totalDr: number, totalCr: number) {
    const diff = totalDr - totalCr;
    super(
      `Voucher ${voucherNumber} imbalanced by ₹${(Math.abs(diff) / 100).toFixed(2)} — contact engineering.`,
    );
    this.name = 'VoucherImbalancedError';
    this.voucherNumber = voucherNumber;
    this.totalDrPaise = totalDr;
    this.totalCrPaise = totalCr;
    this.diffPaise = diff;
  }
}

// ─── Assertion ────────────────────────────────────────────────────────────────

/**
 * Assert that a voucher's debit legs sum equals credit legs sum.
 *
 * L28: L28 PLAN-VEHICLES-003 + Doc 06 §double-entry.
 * Throws VoucherImbalancedError if not balanced.
 */
export function assertVoucherBalanced(entry: JournalEntry): void {
  const totalDr = entry.legs
    .filter((l: JournalLeg) => l.drCr === 'Dr')
    .reduce((s: number, l: JournalLeg) => s + l.amountPaise, 0);

  const totalCr = entry.legs
    .filter((l: JournalLeg) => l.drCr === 'Cr')
    .reduce((s: number, l: JournalLeg) => s + l.amountPaise, 0);

  // L28: Doc 06 §double-entry; SOX-style integrity check
  if (totalDr !== totalCr) {
    throw new VoucherImbalancedError(entry.voucherNumber, totalDr, totalCr);
  }
}

/**
 * Assert all entries in a journal are balanced.
 * Returns the count of entries validated.
 * Throws on first imbalanced voucher (per L28 — export blocked).
 *
 * L28: Doc 06 §double-entry
 */
export function assertAllVouchersBalanced(entries: JournalEntry[]): number {
  for (const entry of entries) {
    assertVoucherBalanced(entry); // L28 throws on first failure
  }
  return entries.length;
}
