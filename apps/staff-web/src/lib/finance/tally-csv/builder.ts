/**
 * Tally CSV builder + export orchestration — SPEC-FINANCE-001 L5, L9, L19, L28, L29, L30
 *
 * L5: CSV download; manual monthly upload to Tally Prime.
 * L19: Filename pattern: BN_<outletCode>_<periodLabel>_journal.csv
 * L28: Voucher balance assertion before export — throws VoucherImbalancedError.
 * L29: Outlet GSTIN from Settings fallback constants.
 * L30: Idempotent + replay-safe — same period+scope+snapshot = byte-identical CSV.
 */

import type { JournalEntry } from '@dms/types';
import { assertAllVouchersBalanced, VoucherImbalancedError } from '../math/balance';
import { buildTallyCsv } from './format';
import type { FYPeriod } from '../math/period';

export type { VoucherImbalancedError };

// ─── Filename generation ──────────────────────────────────────────────────────

/**
 * Generate the canonical Tally CSV filename.
 *
 * L19: BN_<outletCode>_<periodLabel>_journal.csv
 * outletCode ∈ {BLR, MUM, CHE, ALL}; periodLabel ∈ {FY26-Q1, ..., FY26-M01..M12, FY26-FULL}
 * Doc 06 §journal-entries; user-expected filename conventions.
 */
export function formatJournalFilename(
  outletCode: 'BLR' | 'MUM' | 'CHE' | 'ALL',
  periodLabel: string,
): string {
  // L19: SPEC-FINANCE-001 L19
  return `BN_${outletCode}_${periodLabel}_journal.csv`;
}

// ─── Export result ────────────────────────────────────────────────────────────

export interface JournalExportResult {
  csv: string;
  filename: string;
  voucherCount: number;
  csvByteLength: number;
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Build and validate a Tally CSV export from a set of journal entries.
 *
 * L28: Runs assertAllVouchersBalanced — throws VoucherImbalancedError on failure.
 * L30: Idempotent — given same entries + outletCode + period, CSV is byte-identical.
 * L19: Filename is deterministic from outletCode + period.label.
 * L5: CSV-only; no live Tally sync in v1.
 *
 * THROWS VoucherImbalancedError if any voucher fails the double-entry check.
 */
export function buildJournalExport(
  entries: JournalEntry[],
  outletCode: 'BLR' | 'MUM' | 'CHE' | 'ALL',
  period: FYPeriod,
): JournalExportResult {
  // L28: Pre-export sanity check — throws on imbalance; export BLOCKED.
  // Doc 06 §double-entry; SOX-style integrity check.
  assertAllVouchersBalanced(entries);

  // L30: buildTallyCsv sorts canonically → byte-identical output.
  const csv = buildTallyCsv(entries);

  // L19: deterministic filename
  const filename = formatJournalFilename(outletCode, period.label);

  return {
    csv,
    filename,
    voucherCount: entries.length,
    csvByteLength: new TextEncoder().encode(csv).length,
  };
}
