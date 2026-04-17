/**
 * Stock movements fixture — ~200 records.
 *
 * Generation strategy (deterministic — no randomness):
 *   1. IN movements: one per POSTED GRN line (grn-004 + grn-005). Signed positive.
 *   2. OUT movements: Service consumption — walk the first 60 days of the demo
 *      window, emit 2–3 movements per weekday across the 3 outlets consuming
 *      common parts. Signed negative. refType='JOBCARD', refId like 'jc-001'.
 *   3. ADJUST movements: 4 records (2 increments for found stock, 2 decrements
 *      for damage write-off).
 *   4. TRANSFER movements: 3 pairs (6 records) between outlets — each pair
 *      shares a refId like 'xfer-001' so the two sides are linkable.
 *
 * Total target: ≥200. Actual count depends on the OUT generator — we aim for
 * ~180 OUT + 6 IN + 4 ADJUST + 6 TRANSFER ≈ 196, then pad if under.
 *
 * Spec reference: SPEC-PARTS-001 §8
 */

import type { StockMovement } from '@dms/types';
import {
  movIdFor,
  daysAgo,
  OUTLET_BLR,
  OUTLET_MUM,
  OUTLET_CHE,
  STAFF_R09_ADVISOR_BLR,
  STAFF_R12_PARTS,
  STAFF_R13_COUNTER,
  STAFF_R19_GM,
} from './builders';

const movements: StockMovement[] = [];
let seq = 1;

function push(m: Omit<StockMovement, 'id'>): void {
  movements.push({ id: movIdFor(seq++), ...m });
}

// ─── 1. IN movements from POSTED GRNs ────────────────────────────────────────
// grn-004 (Audi Chennai, 3 lines)
push({
  partCode: 'AUDI-BRK-PAD-B8-F',
  outletId: OUTLET_CHE,
  type: 'IN',
  qty: 6,
  refType: 'GRN',
  refId: 'grn-004',
  at: daysAgo(6),
  actorId: STAFF_R12_PARTS,
});
push({
  partCode: 'AUDI-MAF-EA888',
  outletId: OUTLET_CHE,
  type: 'IN',
  qty: 3,
  refType: 'GRN',
  refId: 'grn-004',
  at: daysAgo(6),
  actorId: STAFF_R12_PARTS,
});
push({
  partCode: 'AUDI-BATTERY-80AH-AGM',
  outletId: OUTLET_CHE,
  type: 'IN',
  qty: 4,
  refType: 'GRN',
  refId: 'grn-004',
  at: daysAgo(6),
  actorId: STAFF_R12_PARTS,
});

// grn-005 (Porsche Mumbai, 2 lines — partial import)
push({
  partCode: 'POR-PCCB-DISC-991-F',
  outletId: OUTLET_MUM,
  type: 'IN',
  qty: 2,
  refType: 'GRN',
  refId: 'grn-005',
  at: daysAgo(13),
  actorId: STAFF_R12_PARTS,
});
push({
  partCode: 'POR-PIWIS-ECU-991',
  outletId: OUTLET_MUM,
  type: 'IN',
  qty: 1,
  refType: 'GRN',
  refId: 'grn-005',
  at: daysAgo(13),
  actorId: STAFF_R12_PARTS,
});

// ─── 2. OUT movements (Service consumption) ──────────────────────────────────
// Pattern: walk 60 days back → forward. For each outlet/weekday, consume 1–2
// high-turn parts tied to a job card. refId cycles through jc-001..jc-018
// (matching the service fixture's JC IDs).

const OUT_PATTERN: Array<{
  partCode: string;
  outletId: string;
  qty: number;
  actorId: string;
}> = [
  { partCode: 'BMW-OIL-FLTR-N20', outletId: OUTLET_BLR, qty: 1, actorId: STAFF_R09_ADVISOR_BLR },
  { partCode: 'BMW-AIR-FLTR-N20', outletId: OUTLET_BLR, qty: 1, actorId: STAFF_R09_ADVISOR_BLR },
  { partCode: 'UNI-ENG-OIL-5W30', outletId: OUTLET_BLR, qty: 1, actorId: STAFF_R09_ADVISOR_BLR },
  { partCode: 'UNI-BRK-FLUID-DOT4', outletId: OUTLET_BLR, qty: 1, actorId: STAFF_R09_ADVISOR_BLR },
  { partCode: 'BMW-WIPER-F30-FR', outletId: OUTLET_BLR, qty: 1, actorId: STAFF_R13_COUNTER },
  { partCode: 'AUDI-OIL-FLTR-EA888', outletId: OUTLET_MUM, qty: 1, actorId: STAFF_R13_COUNTER },
  { partCode: 'AUDI-AIR-FLTR-Q5', outletId: OUTLET_MUM, qty: 1, actorId: STAFF_R13_COUNTER },
  { partCode: 'UNI-ENG-OIL-5W30', outletId: OUTLET_MUM, qty: 1, actorId: STAFF_R13_COUNTER },
  { partCode: 'UNI-WSHR-FLUID-5L', outletId: OUTLET_MUM, qty: 1, actorId: STAFF_R13_COUNTER },
  { partCode: 'MB-OIL-FLTR-M274', outletId: OUTLET_CHE, qty: 1, actorId: STAFF_R12_PARTS },
  { partCode: 'MB-AIR-FLTR-M274', outletId: OUTLET_CHE, qty: 1, actorId: STAFF_R12_PARTS },
  { partCode: 'UNI-ENG-OIL-5W30', outletId: OUTLET_CHE, qty: 1, actorId: STAFF_R12_PARTS },
  { partCode: 'UNI-BRK-FLUID-DOT4', outletId: OUTLET_CHE, qty: 1, actorId: STAFF_R12_PARTS },
];

// Generate 16 entries per day across a 12-day spread ≈ 192 OUT movements.
// This keeps us well past the 200 total target once IN/ADJUST/TRANSFER are added.
let jcCursor = 1;
for (let day = 60; day >= 4; day -= 4) {
  for (const entry of OUT_PATTERN) {
    const jcNum = String(((jcCursor - 1) % 18) + 1).padStart(3, '0');
    jcCursor++;
    push({
      partCode: entry.partCode,
      outletId: entry.outletId,
      type: 'OUT',
      qty: -entry.qty,
      refType: 'JOBCARD',
      refId: `jc-${jcNum}`,
      at: daysAgo(day),
      actorId: entry.actorId,
    });
  }
}

// ─── 3. ADJUST movements (4 records) ─────────────────────────────────────────
push({
  partCode: 'BMW-OIL-FLTR-N20',
  outletId: OUTLET_BLR,
  type: 'ADJUST',
  qty: 2,
  refType: 'ADJUST',
  refId: 'adj-001',
  at: daysAgo(35),
  actorId: STAFF_R19_GM,
  reason: 'Stock count — 2 units found in returns bin.',
});
push({
  partCode: 'AUDI-OIL-FLTR-EA888',
  outletId: OUTLET_MUM,
  type: 'ADJUST',
  qty: -1,
  refType: 'ADJUST',
  refId: 'adj-002',
  at: daysAgo(28),
  actorId: STAFF_R12_PARTS,
  reason: 'Damage write-off — shelf drop.',
});
push({
  partCode: 'MB-OIL-FLTR-M274',
  outletId: OUTLET_CHE,
  type: 'ADJUST',
  qty: 1,
  refType: 'ADJUST',
  refId: 'adj-003',
  at: daysAgo(22),
  actorId: STAFF_R19_GM,
  reason: 'Cycle count correction.',
});
push({
  partCode: 'UNI-ENG-OIL-5W30',
  outletId: OUTLET_BLR,
  type: 'ADJUST',
  qty: -1,
  refType: 'ADJUST',
  refId: 'adj-004',
  at: daysAgo(12),
  actorId: STAFF_R12_PARTS,
  reason: 'Leak — damaged can disposed.',
});

// ─── 4. TRANSFER movements (3 pairs — 6 records) ────────────────────────────
const xferPairs: Array<{
  partCode: string;
  fromOutlet: string;
  toOutlet: string;
  qty: number;
  xferId: string;
  daysAgo: number;
}> = [
  { partCode: 'BMW-BRK-PAD-F30', fromOutlet: OUTLET_BLR, toOutlet: OUTLET_MUM, qty: 2, xferId: 'xfer-001', daysAgo: 40 },
  { partCode: 'AUDI-OIL-FLTR-EA888', fromOutlet: OUTLET_MUM, toOutlet: OUTLET_CHE, qty: 5, xferId: 'xfer-002', daysAgo: 25 },
  { partCode: 'MB-OIL-FLTR-M274', fromOutlet: OUTLET_CHE, toOutlet: OUTLET_BLR, qty: 4, xferId: 'xfer-003', daysAgo: 10 },
];

for (const x of xferPairs) {
  push({
    partCode: x.partCode,
    outletId: x.fromOutlet,
    type: 'TRANSFER',
    qty: -x.qty,
    refType: 'TRANSFER',
    refId: x.xferId,
    at: daysAgo(x.daysAgo),
    actorId: STAFF_R12_PARTS,
    reason: `Outbound transfer to ${x.toOutlet}`,
  });
  push({
    partCode: x.partCode,
    outletId: x.toOutlet,
    type: 'TRANSFER',
    qty: x.qty,
    refType: 'TRANSFER',
    refId: x.xferId,
    at: daysAgo(x.daysAgo),
    actorId: STAFF_R12_PARTS,
    reason: `Inbound transfer from ${x.fromOutlet}`,
  });
}

// ─── Final export ────────────────────────────────────────────────────────────

export const stockMovements: StockMovement[] = movements;
