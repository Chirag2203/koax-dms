/**
 * Goods Receipt Notes (GRN) fixture — 5 records.
 *
 * Distribution per SPEC-PARTS-001 §8:
 *   - grn-001  DRAFT        (fresh receipt, no QC)
 *   - grn-002  PENDING_QC   (tied to po-007 DISPATCHED)
 *   - grn-003  MATCHED + discrepancy (short-received + damaged line)
 *   - grn-004  POSTED       (tied to po-009 RECEIVED)
 *   - grn-005  POSTED       (tied to po-008 PARTIALLY_RECEIVED — partial receipt)
 *
 * Line structure mirrors the linked PO's line set so three-way match is meaningful.
 * Import GRN carries `landedCostAdders` (freight/customs/igst/clearing) per Doc 05 §6.3.
 *
 * Spec reference: SPEC-PARTS-001 §8
 */

import type { Grn } from '@dms/types';
import {
  buildGrnLine,
  grnIdFor,
  grnNoFor,
  daysAgo,
  OUTLET_BLR,
  OUTLET_MUM,
  OUTLET_CHE,
  STAFF_R12_PARTS,
  STAFF_R13_COUNTER,
  supplierIdFor,
} from './builders';

// ─── grn-001 DRAFT (Mercedes Chennai — initial) ──────────────────────────────

const grn001Id = grnIdFor(1);
const grn001Lines = [
  buildGrnLine(grn001Id, 1, 'MB-OIL-FLTR-M274', 30, 30, 880),
  buildGrnLine(grn001Id, 2, 'MB-AIR-FLTR-M274', 12, 12, 1_460),
];

// ─── grn-002 PENDING_QC (tied to po-007) ─────────────────────────────────────

const grn002Id = grnIdFor(2);
const grn002Lines = [
  buildGrnLine(grn002Id, 1, 'BMW-BATTERY-90AH-AGM', 6, 6, 15_100),
  buildGrnLine(grn002Id, 2, 'BMW-WIPER-F30-FR', 12, 12, 2_450),
  buildGrnLine(grn002Id, 3, 'BMW-COOLANT-G48', 10, 10, 2_700),
];

// ─── grn-003 MATCHED + discrepancy (short-receive + damaged) ─────────────────

const grn003Id = grnIdFor(3);
const grn003Lines = [
  buildGrnLine(grn003Id, 1, 'AUDI-OIL-FLTR-EA888', 20, 20, 740),
  buildGrnLine(grn003Id, 2, 'AUDI-AIR-FLTR-Q5', 10, 8, 1_420),        // short
  buildGrnLine(grn003Id, 3, 'AUDI-COOLANT-G13', 8, 8, 2_550, 'DAMAGED'), // damaged
];

// ─── grn-004 POSTED (tied to po-009 — fully received) ────────────────────────

const grn004Id = grnIdFor(4);
const grn004Lines = [
  buildGrnLine(grn004Id, 1, 'AUDI-BRK-PAD-B8-F', 6, 6, 11_650),
  buildGrnLine(grn004Id, 2, 'AUDI-MAF-EA888', 3, 3, 11_000),
  buildGrnLine(grn004Id, 3, 'AUDI-BATTERY-80AH-AGM', 4, 4, 14_000),
];

// ─── grn-005 POSTED (tied to po-008 — partial import receipt) ────────────────

const grn005Id = grnIdFor(5);
const grn005Lines = [
  buildGrnLine(grn005Id, 1, 'POR-PCCB-DISC-991-F', 2, 2, 6_12_000),
  // line 2 POR-TAYCAN-HV-CABLE not yet received
  buildGrnLine(grn005Id, 3, 'POR-PIWIS-ECU-991', 1, 1, 2_62_500),
];

// ─── Export ──────────────────────────────────────────────────────────────────

export const grns: Grn[] = [
  {
    id: grn001Id,
    grnNo: grnNoFor(1),
    poId: undefined, // walk-in; no PO
    supplierId: supplierIdFor(3), // Mercedes India
    outletId: OUTLET_CHE,
    status: 'DRAFT',
    receivedBy: STAFF_R13_COUNTER,
    receivedAt: daysAgo(0),
    lines: grn001Lines,
  },
  {
    id: grn002Id,
    grnNo: grnNoFor(2),
    poId: 'po-007',
    supplierId: supplierIdFor(1), // BMW India
    outletId: OUTLET_BLR,
    status: 'PENDING_QC',
    receivedBy: STAFF_R13_COUNTER,
    receivedAt: daysAgo(1),
    lines: grn002Lines,
  },
  {
    id: grn003Id,
    grnNo: grnNoFor(3),
    // Walk-in / emergency receipt — no PO backing. Schema allows poId undefined
    // (spec §4). Kept PO-less so the DISCREPANCY path can be demoed without
    // violating the state machine (a linked PO would have to be DISPATCHED).
    poId: undefined,
    supplierId: supplierIdFor(2), // Audi India
    outletId: OUTLET_MUM,
    status: 'MATCHED',
    receivedBy: STAFF_R13_COUNTER,
    receivedAt: daysAgo(3),
    qcBy: STAFF_R12_PARTS,
    qcAt: daysAgo(2),
    lines: grn003Lines,
    discrepancyNotes:
      'Line 2: received 8 of 10 ordered (short by 2). Line 3: condition DAMAGED — external packaging torn, requesting supplier replacement.',
    threeWayMatchStatus: 'DISCREPANCY',
  },
  {
    id: grn004Id,
    grnNo: grnNoFor(4),
    poId: 'po-009',
    supplierId: supplierIdFor(2), // Audi India
    outletId: OUTLET_CHE,
    status: 'POSTED',
    receivedBy: STAFF_R13_COUNTER,
    receivedAt: daysAgo(8),
    qcBy: STAFF_R12_PARTS,
    qcAt: daysAgo(7),
    postedAt: daysAgo(6),
    lines: grn004Lines,
    threeWayMatchStatus: 'MATCHED',
  },
  {
    id: grn005Id,
    grnNo: grnNoFor(5),
    poId: 'po-008',
    supplierId: supplierIdFor(8), // LuxeAuto Imports
    outletId: OUTLET_MUM,
    status: 'POSTED',
    receivedBy: STAFF_R12_PARTS,
    receivedAt: daysAgo(15),
    qcBy: STAFF_R12_PARTS,
    qcAt: daysAgo(14),
    postedAt: daysAgo(13),
    lines: grn005Lines,
    landedCostAdders: {
      freight: 1_85_000,
      customs: 92_000,
      igst: 2_40_000,
      clearing: 24_000,
    },
    threeWayMatchStatus: 'MATCHED',
  },
];
