/**
 * Tally CSV header row — SPEC-FINANCE-001 L9
 *
 * L9: Columns locked at L9-LOCK:
 *     voucherDate, voucherType, voucherNumber, ledgerName, drCr,
 *     amount, narration, costCenter, gstinParty, hsnSac, gstRate, gstAmount
 *
 * One row per ledger leg per voucher. Header row is fixed.
 * Reference fixture: apps/staff-web/src/lib/finance/__fixtures__/tally-export-sample.csv
 * Tally Prime Voucher XML 5.1 spec; Doc 06 §journal-entries.
 */

/** L9: Exact column order — DO NOT reorder; Tally Prime import is position-sensitive. */
export const TALLY_CSV_HEADERS = [
  'voucherDate',
  'voucherType',
  'voucherNumber',
  'ledgerName',
  'drCr',
  'amount',
  'narration',
  'costCenter',
  'gstinParty',
  'hsnSac',
  'gstRate',
  'gstAmount',
] as const;

export type TallyCsvHeader = (typeof TALLY_CSV_HEADERS)[number];

/** L9: Header row string. Used as the first line of every exported CSV. */
export const TALLY_CSV_HEADER_ROW = TALLY_CSV_HEADERS.join(',');
