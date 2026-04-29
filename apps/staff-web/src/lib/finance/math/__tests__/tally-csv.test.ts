/**
 * Tally CSV format tests — SPEC-FINANCE-001 L9, L19, L30
 *
 * L9: Headers: voucherDate, voucherType, voucherNumber, ledgerName, drCr, amount, narration, etc.
 * L19: Filename: BN_<outletCode>_<periodLabel>_journal.csv
 * L30: Idempotent — same entries + sort → byte-identical output.
 */

import { describe, it, expect } from 'vitest';
import {
  sortEntriesCanonically,
  sortLegsCanonically,
  buildTallyCsv,
} from '../../tally-csv/format';
import { formatJournalFilename } from '../../tally-csv/builder';
import { TALLY_CSV_HEADERS } from '../../tally-csv/headers';
import type { JournalEntry } from '@dms/types';

function makeEntry(voucherDate: string, voucherNumber: string, legs: JournalEntry['legs']): JournalEntry {
  return {
    voucherDate,
    voucherNumber,
    voucherType: 'Sales',
    narration: `Test ${voucherNumber}`,
    sourceEvent: { module: 'sales', eventId: 'E1' },
    legs,
  };
}

describe('TALLY_CSV_HEADERS — L9', () => {
  it('includes all required Tally Prime column headers', () => {
    expect(TALLY_CSV_HEADERS).toContain('voucherDate');
    expect(TALLY_CSV_HEADERS).toContain('voucherType');
    expect(TALLY_CSV_HEADERS).toContain('voucherNumber');
    expect(TALLY_CSV_HEADERS).toContain('ledgerName');
    expect(TALLY_CSV_HEADERS).toContain('drCr');
    expect(TALLY_CSV_HEADERS).toContain('amount');
    expect(TALLY_CSV_HEADERS).toContain('narration');
    expect(TALLY_CSV_HEADERS).toContain('hsnSac');
    expect(TALLY_CSV_HEADERS).toContain('gstRate');
  });
});

describe('formatJournalFilename — L19', () => {
  it('generates correct filename pattern', () => {
    expect(formatJournalFilename('BLR', 'FY26-Q1')).toBe('BN_BLR_FY26-Q1_journal.csv');
    expect(formatJournalFilename('ALL', 'FY26-M04')).toBe('BN_ALL_FY26-M04_journal.csv');
    expect(formatJournalFilename('MUM', 'FY26-FULL')).toBe('BN_MUM_FY26-FULL_journal.csv');
  });
});

describe('sortEntriesCanonically — L30', () => {
  it('sorts by voucherDate ascending then voucherNumber ascending', () => {
    const entries = [
      makeEntry('2026-04-15', 'VR-003', []),
      makeEntry('2026-04-01', 'VR-002', []),
      makeEntry('2026-04-01', 'VR-001', []),
    ];
    const sorted = sortEntriesCanonically(entries);
    expect(sorted[0]!.voucherNumber).toBe('VR-001');
    expect(sorted[1]!.voucherNumber).toBe('VR-002');
    expect(sorted[2]!.voucherNumber).toBe('VR-003');
  });
});

describe('sortLegsCanonically — L30', () => {
  it('sorts Dr before Cr', () => {
    const legs: JournalEntry['legs'] = [
      { ledgerName: 'Sales', drCr: 'Cr', amountPaise: 1000 },
      { ledgerName: 'Receivable', drCr: 'Dr', amountPaise: 1000 },
    ];
    const sorted = sortLegsCanonically(legs);
    expect(sorted[0]!.drCr).toBe('Dr');
    expect(sorted[1]!.drCr).toBe('Cr');
  });

  it('sorts alphabetically by ledgerName within same Dr/Cr', () => {
    const legs: JournalEntry['legs'] = [
      { ledgerName: 'Z-Ledger', drCr: 'Cr', amountPaise: 500 },
      { ledgerName: 'A-Ledger', drCr: 'Cr', amountPaise: 500 },
    ];
    const sorted = sortLegsCanonically(legs);
    expect(sorted[0]!.ledgerName).toBe('A-Ledger');
    expect(sorted[1]!.ledgerName).toBe('Z-Ledger');
  });
});

describe('buildTallyCsv — L30 idempotency', () => {
  const sampleEntries = [
    makeEntry('2026-04-10', 'VR-002', [
      { ledgerName: 'Receivable A/c', drCr: 'Dr', amountPaise: 100_00_000 },
      { ledgerName: 'Sales A/c', drCr: 'Cr', amountPaise: 100_00_000 },
    ]),
    makeEntry('2026-04-05', 'VR-001', [
      { ledgerName: 'Receivable B/c', drCr: 'Dr', amountPaise: 50_00_000 },
      { ledgerName: 'Sales B/c', drCr: 'Cr', amountPaise: 50_00_000 },
    ]),
  ];

  it('generates CSV starting with header row', () => {
    const csv = buildTallyCsv(sampleEntries);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('voucherDate');
    expect(firstLine).toContain('ledgerName');
  });

  it('is idempotent — same input produces byte-identical output', () => {
    const csv1 = buildTallyCsv(sampleEntries);
    const csv2 = buildTallyCsv(sampleEntries);
    expect(csv1).toBe(csv2);
  });

  it('sorts entries canonically for idempotency', () => {
    const shuffled = [...sampleEntries].reverse();
    const csv1 = buildTallyCsv(sampleEntries);
    const csv2 = buildTallyCsv(shuffled);
    // Both should produce the same output because canonical sort is applied
    expect(csv1).toBe(csv2);
  });
});
