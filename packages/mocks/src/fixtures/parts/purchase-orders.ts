/**
 * Purchase Orders fixture — 10 POs spread across all statuses.
 *
 * Distribution per SPEC-PARTS-001 §8:
 *   - 2 DRAFT          (po-001, po-002)
 *   - 2 PENDING_APPROVAL, one > ₹50k to exercise R03 approval  (po-003, po-004)
 *   - 2 APPROVED       (po-005, po-006)
 *   - 1 DISPATCHED     (po-007)
 *   - 1 PARTIALLY_RECEIVED (po-008)
 *   - 1 RECEIVED       (po-009)
 *   - 1 CLOSED         (po-010)
 *
 * One PO carries linkedJobCardId='jc-001' to demonstrate the Service→Parts
 * loop (§11.1). One is an import PO (isImport=true, EUR, fxRate).
 *
 * GST slab for HSN 8708 motor vehicle parts = 28%. Applied on subtotal.
 *
 * Spec reference: SPEC-PARTS-001 §8, §11.1
 */

import type { PurchaseOrder } from '@dms/types';
import {
  buildPoLine,
  poIdFor,
  poNoFor,
  daysAgo,
  daysFromNow,
  OUTLET_BLR,
  OUTLET_MUM,
  OUTLET_CHE,
  STAFF_R12_PARTS,
  STAFF_R13_COUNTER,
  STAFF_R03_OUTLET,
  STAFF_R19_GM,
  STAFF_R24_CEO,
  STAFF_R09_ADVISOR_BLR,
  supplierIdFor,
} from './builders';

const GST_RATE = 0.28;

/** Compute subtotal + gst + total from a line set. */
function totals(lines: { lineTotal: number }[]): {
  subtotal: number;
  gst: number;
  total: number;
} {
  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const gst = Math.round(subtotal * GST_RATE);
  return { subtotal, gst, total: subtotal + gst };
}

// ─── po-001 DRAFT (small, routine consumables — Blr) ─────────────────────────

const po001Id = poIdFor(1);
const po001Lines = [
  buildPoLine(po001Id, 1, 'BMW-OIL-FLTR-N20', 20, 810),
  buildPoLine(po001Id, 2, 'BMW-AIR-FLTR-N20', 10, 1_280),
  buildPoLine(po001Id, 3, 'UNI-ENG-OIL-5W30', 24, 3_680),
];
const po001Totals = totals(po001Lines);

// ─── po-002 DRAFT (Service-originated — linked to jc-001) ────────────────────

const po002Id = poIdFor(2);
const po002Lines = [
  buildPoLine(po002Id, 1, 'BMW-BRK-PAD-F30-V2', 4, 13_300),
  buildPoLine(po002Id, 2, 'BMW-BRK-DISC-F30', 4, 16_800),
];
const po002Totals = totals(po002Lines);

// ─── po-003 PENDING_APPROVAL (≤ ₹50k bracket — R12 can approve) ──────────────

const po003Id = poIdFor(3);
const po003Lines = [
  buildPoLine(po003Id, 1, 'AUDI-OIL-FLTR-EA888', 20, 740),
  buildPoLine(po003Id, 2, 'AUDI-AIR-FLTR-Q5', 10, 1_420),
  buildPoLine(po003Id, 3, 'AUDI-COOLANT-G13', 8, 2_550),
];
const po003Totals = totals(po003Lines);

// ─── po-004 PENDING_APPROVAL (> ₹50k bracket — escalates to R03+) ────────────

const po004Id = poIdFor(4);
const po004Lines = [
  buildPoLine(po004Id, 1, 'MB-AIR-SUSP-W222-FR', 1, 2_32_500),
  buildPoLine(po004Id, 2, 'MB-COMP-AIRMATIC', 1, 55_800),
];
const po004Totals = totals(po004Lines);

// ─── po-005 APPROVED (Chennai oil+filter refill) ─────────────────────────────

const po005Id = poIdFor(5);
const po005Lines = [
  buildPoLine(po005Id, 1, 'MB-OIL-FLTR-M274', 30, 880),
  buildPoLine(po005Id, 2, 'MB-AIR-FLTR-M274', 12, 1_460),
  buildPoLine(po005Id, 3, 'UNI-BRK-FLUID-DOT4', 12, 740),
];
const po005Totals = totals(po005Lines);

// ─── po-006 APPROVED (Porsche high-value — Mumbai) ───────────────────────────

const po006Id = poIdFor(6);
const po006Lines = [
  buildPoLine(po006Id, 1, 'POR-BRK-PAD-991-F', 2, 26_000),
  buildPoLine(po006Id, 2, 'POR-OIL-FLTR-9A2', 10, 1_720),
  buildPoLine(po006Id, 3, 'POR-SPK-PLG-991', 3, 11_100),
];
const po006Totals = totals(po006Lines);

// ─── po-007 DISPATCHED (BMW — awaits GRN grn-002 PENDING_QC) ─────────────────

const po007Id = poIdFor(7);
const po007Lines = [
  buildPoLine(po007Id, 1, 'BMW-BATTERY-90AH-AGM', 6, 15_100),
  buildPoLine(po007Id, 2, 'BMW-WIPER-F30-FR', 12, 2_450),
  buildPoLine(po007Id, 3, 'BMW-COOLANT-G48', 10, 2_700),
];
const po007Totals = totals(po007Lines);

// ─── po-008 PARTIALLY_RECEIVED (import PO — LuxeAuto, EUR) ───────────────────

const po008Id = poIdFor(8);
const po008Lines = [
  buildPoLine(po008Id, 1, 'POR-PCCB-DISC-991-F', 2, 6_12_000),
  buildPoLine(po008Id, 2, 'POR-TAYCAN-HV-CABLE', 1, 1_24_500),
  buildPoLine(po008Id, 3, 'POR-PIWIS-ECU-991', 1, 2_62_500),
];
const po008Totals = totals(po008Lines);

// ─── po-009 RECEIVED (fully received; awaiting CLOSED) ───────────────────────

const po009Id = poIdFor(9);
const po009Lines = [
  buildPoLine(po009Id, 1, 'AUDI-BRK-PAD-B8-F', 6, 11_650),
  buildPoLine(po009Id, 2, 'AUDI-MAF-EA888', 3, 11_000),
  buildPoLine(po009Id, 3, 'AUDI-BATTERY-80AH-AGM', 4, 14_000),
];
const po009Totals = totals(po009Lines);

// ─── po-010 CLOSED (historic, reconciled) ────────────────────────────────────

const po010Id = poIdFor(10);
const po010Lines = [
  buildPoLine(po010Id, 1, 'MB-BRK-PAD-S213-F', 4, 15_400),
  buildPoLine(po010Id, 2, 'MB-GLOW-PLUG-OM651', 4, 5_850),
];
const po010Totals = totals(po010Lines);

// ─── Export ──────────────────────────────────────────────────────────────────

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: po001Id,
    poNo: poNoFor(1),
    supplierId: supplierIdFor(1), // BMW India
    outletId: OUTLET_BLR,
    status: 'DRAFT',
    createdBy: STAFF_R13_COUNTER,
    createdAt: daysAgo(1),
    lines: po001Lines,
    subtotal: po001Totals.subtotal,
    gst: po001Totals.gst,
    total: po001Totals.total,
    expectedDeliveryAt: daysFromNow(7),
    isImport: false,
  },
  {
    id: po002Id,
    poNo: poNoFor(2),
    supplierId: supplierIdFor(1), // BMW India
    outletId: OUTLET_BLR,
    status: 'DRAFT',
    createdBy: STAFF_R09_ADVISOR_BLR,
    createdAt: daysAgo(1),
    lines: po002Lines,
    subtotal: po002Totals.subtotal,
    gst: po002Totals.gst,
    total: po002Totals.total,
    expectedDeliveryAt: daysFromNow(5),
    isImport: false,
    linkedJobCardId: 'jc-001', // Service→Parts loop demo, §11.1
    notes: 'Raised from Service JC-2026-00001 parts shortage.',
  },
  {
    id: po003Id,
    poNo: poNoFor(3),
    supplierId: supplierIdFor(2), // Audi India
    outletId: OUTLET_MUM,
    status: 'PENDING_APPROVAL',
    createdBy: STAFF_R13_COUNTER,
    createdAt: daysAgo(3),
    submittedAt: daysAgo(2),
    lines: po003Lines,
    subtotal: po003Totals.subtotal,
    gst: po003Totals.gst,
    total: po003Totals.total,
    expectedDeliveryAt: daysFromNow(10),
    isImport: false,
  },
  {
    id: po004Id,
    poNo: poNoFor(4),
    supplierId: supplierIdFor(3), // Mercedes India
    outletId: OUTLET_CHE,
    status: 'PENDING_APPROVAL',
    createdBy: STAFF_R12_PARTS,
    createdAt: daysAgo(4),
    submittedAt: daysAgo(3),
    lines: po004Lines,
    subtotal: po004Totals.subtotal,
    gst: po004Totals.gst,
    total: po004Totals.total,
    expectedDeliveryAt: daysFromNow(14),
    isImport: false,
    notes: 'Exceeds ₹2L — routes to R19 GM per SPEC-PARTS-001 §6.',
  },
  {
    id: po005Id,
    poNo: poNoFor(5),
    supplierId: supplierIdFor(3), // Mercedes India
    outletId: OUTLET_CHE,
    status: 'APPROVED',
    createdBy: STAFF_R13_COUNTER,
    createdAt: daysAgo(7),
    submittedAt: daysAgo(6),
    approverId: STAFF_R12_PARTS,
    approvedAt: daysAgo(5),
    lines: po005Lines,
    subtotal: po005Totals.subtotal,
    gst: po005Totals.gst,
    total: po005Totals.total,
    expectedDeliveryAt: daysFromNow(3),
    isImport: false,
  },
  {
    id: po006Id,
    poNo: poNoFor(6),
    supplierId: supplierIdFor(4), // Porsche Centre Mumbai
    outletId: OUTLET_MUM,
    status: 'APPROVED',
    createdBy: STAFF_R12_PARTS,
    createdAt: daysAgo(8),
    submittedAt: daysAgo(7),
    approverId: STAFF_R03_OUTLET,
    approvedAt: daysAgo(6),
    lines: po006Lines,
    subtotal: po006Totals.subtotal,
    gst: po006Totals.gst,
    total: po006Totals.total,
    expectedDeliveryAt: daysFromNow(5),
    isImport: false,
  },
  {
    id: po007Id,
    poNo: poNoFor(7),
    supplierId: supplierIdFor(1), // BMW India
    outletId: OUTLET_BLR,
    status: 'DISPATCHED',
    createdBy: STAFF_R13_COUNTER,
    createdAt: daysAgo(14),
    submittedAt: daysAgo(13),
    approverId: STAFF_R12_PARTS,
    approvedAt: daysAgo(12),
    dispatchedAt: daysAgo(4),
    lines: po007Lines,
    subtotal: po007Totals.subtotal,
    gst: po007Totals.gst,
    total: po007Totals.total,
    expectedDeliveryAt: daysFromNow(1),
    isImport: false,
  },
  {
    id: po008Id,
    poNo: poNoFor(8),
    supplierId: supplierIdFor(8), // LuxeAuto Imports
    outletId: OUTLET_MUM,
    status: 'PARTIALLY_RECEIVED',
    createdBy: STAFF_R12_PARTS,
    createdAt: daysAgo(45),
    submittedAt: daysAgo(44),
    approverId: STAFF_R19_GM, // > ₹2L bracket
    approvedAt: daysAgo(43),
    dispatchedAt: daysAgo(18),
    lines: po008Lines,
    subtotal: po008Totals.subtotal,
    gst: po008Totals.gst,
    total: po008Totals.total,
    expectedDeliveryAt: daysAgo(2),
    isImport: true,
    fxRate: 92.5, // EUR→INR at PO date
    notes: 'CKD import — partial receipt. Awaiting Taycan HV cable shipment.',
  },
  {
    id: po009Id,
    poNo: poNoFor(9),
    supplierId: supplierIdFor(2), // Audi India
    outletId: OUTLET_CHE,
    status: 'RECEIVED',
    createdBy: STAFF_R13_COUNTER,
    createdAt: daysAgo(21),
    submittedAt: daysAgo(20),
    approverId: STAFF_R12_PARTS,
    approvedAt: daysAgo(19),
    dispatchedAt: daysAgo(10),
    lines: po009Lines,
    subtotal: po009Totals.subtotal,
    gst: po009Totals.gst,
    total: po009Totals.total,
    expectedDeliveryAt: daysAgo(5),
    isImport: false,
  },
  {
    id: po010Id,
    poNo: poNoFor(10),
    supplierId: supplierIdFor(3), // Mercedes India
    outletId: OUTLET_BLR,
    status: 'CLOSED',
    createdBy: STAFF_R13_COUNTER,
    createdAt: daysAgo(60),
    submittedAt: daysAgo(59),
    approverId: STAFF_R24_CEO,
    approvedAt: daysAgo(58),
    dispatchedAt: daysAgo(40),
    lines: po010Lines,
    subtotal: po010Totals.subtotal,
    gst: po010Totals.gst,
    total: po010Totals.total,
    expectedDeliveryAt: daysAgo(30),
    isImport: false,
  },
];

