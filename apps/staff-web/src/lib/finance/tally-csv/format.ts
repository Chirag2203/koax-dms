/**
 * Tally CSV row formatting — SPEC-FINANCE-001 L9, L30
 *
 * L9: Tally Prime XML 5.1 → CSV row mapping. One row per ledger leg per voucher.
 * L30: Idempotent + replay-safe export. Sort order: voucherDate asc, voucherNumber asc, drCr asc (Dr before Cr).
 *      Doc 06 §journal-entries; Doc 06 §replay-safe-export.
 */

import type { JournalEntry, JournalLeg } from '@dms/types';
import { paiseToRupees } from '../math/rounding';
import { TALLY_CSV_HEADER_ROW } from './headers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TallyCsvRow {
  voucherDate: string;    // YYYY-MM-DD
  voucherType: string;
  voucherNumber: string;
  ledgerName: string;
  drCr: string;           // 'Dr' | 'Cr'
  amount: string;         // rupees 2dp (no currency symbol)
  narration: string;
  costCenter: string;
  gstinParty: string;
  hsnSac: string;
  gstRate: string;
  gstAmount: string;      // rupees 2dp
}

// ─── Escaping ─────────────────────────────────────────────────────────────────

/**
 * Escape a CSV field: wrap in quotes if contains comma, newline, or quote.
 * Double any internal quotes.
 */
export function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Row builders ─────────────────────────────────────────────────────────────

/**
 * Convert a JournalEntry + one JournalLeg into a TallyCsvRow.
 * L9: Tally Prime XML 5.1 column mapping; Doc 06 §journal-entries.
 */
export function journalLegToTallyCsvRow(
  entry: JournalEntry,
  leg: JournalLeg,
): TallyCsvRow {
  return {
    voucherDate: entry.voucherDate,
    voucherType: entry.voucherType,
    voucherNumber: entry.voucherNumber,
    ledgerName: leg.ledgerName,
    drCr: leg.drCr,
    amount: paiseToRupees(leg.amountPaise).toFixed(2),
    narration: entry.narration,
    costCenter: leg.costCenter ?? '',
    gstinParty: leg.gstinParty ?? '',
    hsnSac: leg.hsnSac ?? '',
    gstRate: leg.gstRatePct != null ? String(leg.gstRatePct) : '',
    gstAmount: leg.gstAmountPaise != null ? paiseToRupees(leg.gstAmountPaise).toFixed(2) : '',
  };
}

/**
 * Serialize a TallyCsvRow to a CSV line in the L9 column order.
 * L30: deterministic order; idempotent output.
 */
export function tallyCsvRowToLine(row: TallyCsvRow): string {
  return [
    row.voucherDate,
    row.voucherType,
    row.voucherNumber,
    escapeCsvField(row.ledgerName),
    row.drCr,
    row.amount,
    escapeCsvField(row.narration),
    row.costCenter,
    row.gstinParty,
    row.hsnSac,
    row.gstRate,
    row.gstAmount,
  ].join(',');
}

// ─── Sort order ───────────────────────────────────────────────────────────────

const DR_CR_ORDER: Record<string, number> = { Dr: 0, Cr: 1 };

/**
 * Sort JournalEntry[] in canonical order for idempotent export.
 * L30: voucherDate asc → voucherNumber asc → drCr asc (Dr before Cr).
 * Doc 06 §replay-safe-export.
 */
export function sortEntriesCanonically(entries: JournalEntry[]): JournalEntry[] {
  // L30: canonical sort — deterministic byte-identical output across re-exports
  return [...entries].sort((a, b) => {
    if (a.voucherDate < b.voucherDate) return -1;
    if (a.voucherDate > b.voucherDate) return 1;
    if (a.voucherNumber < b.voucherNumber) return -1;
    if (a.voucherNumber > b.voucherNumber) return 1;
    return 0;
  });
}

/**
 * Sort legs within a single entry for idempotent output.
 * L30: Dr before Cr; within Dr/Cr, sort by ledgerName.
 */
export function sortLegsCanonically(legs: JournalLeg[]): JournalLeg[] {
  // L30: Dr before Cr; Doc 06 §replay-safe-export
  return [...legs].sort((a, b) => {
    const aOrder = DR_CR_ORDER[a.drCr] ?? 2;
    const bOrder = DR_CR_ORDER[b.drCr] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.ledgerName.localeCompare(b.ledgerName);
  });
}

// ─── Full CSV build ───────────────────────────────────────────────────────────

/**
 * Build the full Tally CSV string from JournalEntry[].
 *
 * L9: header row exact match; L30: byte-identical given same inputs (canonical sort).
 * Doc 06 §journal-entries; Tally Prime Voucher XML 5.1.
 */
export function buildTallyCsv(entries: JournalEntry[]): string {
  const sorted = sortEntriesCanonically(entries);
  const lines: string[] = [TALLY_CSV_HEADER_ROW];

  for (const entry of sorted) {
    const sortedLegs = sortLegsCanonically(entry.legs);
    for (const leg of sortedLegs) {
      const row = journalLegToTallyCsvRow(entry, leg);
      lines.push(tallyCsvRowToLine(row));
    }
  }

  return lines.join('\n');
}
