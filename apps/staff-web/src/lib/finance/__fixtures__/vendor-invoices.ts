/**
 * Vendor invoice mock fixtures — SPEC-FINANCE-001 §5.1
 *
 * Used by finance-store-hydrator. Covers all 5 categories per L17.
 * L11: All amounts in paise.
 * L6: GSTINs match regex.
 * L17: Five categories: parts, labour, commission, consumable, consignment-payout.
 */

import type { VendorInvoice } from '@dms/types';

export const VENDOR_INVOICE_FIXTURES: VendorInvoice[] = [
  // ── VI-001: parts — pending (happy path baseline) ─────────────────────────
  {
    id: 'VI-001',
    invoiceNumber: 'PV/2026/0041',
    vendorName: 'Kosei Wheels India Pvt Ltd',
    vendorGstin: '29AABCK5123R1Z6',
    vendorPan: 'AABCK5123R',
    category: 'parts',
    outletId: 'BLR',
    raisedAt: '2026-04-01T10:00:00.000Z',
    dueAt: '2026-05-01T10:00:00.000Z',
    lines: [
      {
        id: 'VIL-001-1',
        description: 'OEM Alloy Wheel Set — BMW 3-Series (18")',
        hsnSac: '8708701090',
        quantity: 1,
        unitPricePaise: 14_40_000, // ₹14,400
        gstRatePct: 28,
        gstAmountPaise: 4_03_200, // ₹4,032 (28%)
        lineTotalPaise: 18_43_200, // ₹18,432
        inputCreditEligible: true,
      },
    ],
    totalAmountPaise: 14_40_000,
    totalGstPaise: 4_03_200,
    inputCreditEligible: true,
    status: 'pending',
  },

  // ── VI-002: labour — pending (for S-F-9 approval test) ───────────────────
  {
    id: 'VI-002',
    invoiceNumber: 'WS/BLR/2026/089',
    vendorName: 'AutoMotive Workshop Services',
    vendorGstin: '29AAFCA1234K1Z4',
    vendorPan: 'AAFCA1234K',
    category: 'labour',
    outletId: 'BLR',
    raisedAt: '2026-04-05T09:30:00.000Z',
    dueAt: '2026-04-20T09:30:00.000Z',
    lines: [
      {
        id: 'VIL-002-1',
        description: 'Full detailing + paint correction — BMW 5 Series',
        hsnSac: '998729',
        quantity: 1,
        unitPricePaise: 12_00_000, // ₹12,000
        gstRatePct: 18,
        gstAmountPaise: 2_16_000,  // ₹2,160
        lineTotalPaise: 14_16_000, // ₹14,160
        inputCreditEligible: true,
      },
    ],
    totalAmountPaise: 12_00_000,
    totalGstPaise: 2_16_000,
    inputCreditEligible: true,
    status: 'pending',
  },

  // ── VI-003: commission — approved ─────────────────────────────────────────
  {
    id: 'VI-003',
    invoiceNumber: 'INS/COMM/2026/012',
    vendorName: 'HDFC Ergo General Insurance',
    vendorGstin: '27AAACH5290F1ZM',
    vendorPan: 'AAACH5290F',
    category: 'commission',
    outletId: 'MUM',
    raisedAt: '2026-04-08T11:00:00.000Z',
    lines: [
      {
        id: 'VIL-003-1',
        description: 'Insurance commission payout — Lead INS-2026-0091',
        hsnSac: '997131',
        quantity: 1,
        unitPricePaise: 45_00_000,  // ₹45,000
        gstRatePct: 18,
        gstAmountPaise: 8_10_000,   // ₹8,100
        lineTotalPaise: 53_10_000,  // ₹53,100
        // L23: commission = NOT eligible for input credit
        inputCreditEligible: false,
        inputCreditEligibilityReason: 'Insurance commission output is exempt-supply downstream per L23',
      },
    ],
    totalAmountPaise: 45_00_000,
    totalGstPaise: 8_10_000,
    // L23: commission NOT eligible
    inputCreditEligible: false,
    inputCreditEligibilityReason: 'Insurance commission output is exempt-supply downstream per L23',
    status: 'approved',
    approvedBy: 'staff-r12-mum-1',
    approvedAt: '2026-04-10T14:00:00.000Z',
    linkedInsuranceLeadId: 'INS-2026-0091',
  },

  // ── VI-004: consumable — paid ──────────────────────────────────────────────
  {
    id: 'VI-004',
    invoiceNumber: 'GSN/BLR/2026/0234',
    vendorName: 'Castrol India Ltd',
    vendorGstin: '29AAACS1437A1ZM',
    vendorPan: 'AAACS1437A',
    category: 'consumable',
    outletId: 'BLR',
    raisedAt: '2026-04-02T08:00:00.000Z',
    paidAt: '2026-04-15T12:00:00.000Z',
    paymentRef: 'NEFT/ICICI/20260415/00123',
    lines: [
      {
        id: 'VIL-004-1',
        description: 'Castrol Magnatec 5W-30 (20L can × 5)',
        hsnSac: '27101941',
        quantity: 5,
        unitPricePaise: 6_50_000, // ₹6,500 each
        gstRatePct: 18,
        gstAmountPaise: 5_85_000, // ₹5,850
        lineTotalPaise: 38_35_000, // ₹38,350
        inputCreditEligible: true,
      },
    ],
    totalAmountPaise: 32_50_000,
    totalGstPaise: 5_85_000,
    inputCreditEligible: true,
    status: 'paid',
    approvedBy: 'staff-r12-blr-1',
    approvedAt: '2026-04-10T09:00:00.000Z',
    paidBy: 'staff-r22-blr-1',
  },

  // ── VI-005: consignment-payout — pending ──────────────────────────────────
  {
    id: 'VI-005',
    invoiceNumber: 'CONSIGN/BLR/2026/007',
    vendorName: 'Rahul Verma (Consignor)',
    vendorGstin: '29ABCPV7890K1Z2',
    category: 'consignment-payout',
    outletId: 'BLR',
    raisedAt: '2026-04-12T10:00:00.000Z',
    lines: [
      {
        id: 'VIL-005-1',
        description: 'Consignor payout — BMW X5 WBY2Z21090VX45678 sold at ₹68,00,000',
        hsnSac: '8703',
        quantity: 1,
        unitPricePaise: 62_00_00_000, // ₹62,00,000
        gstRatePct: 0,              // L23: consignment-payout NOT GST-bearing
        gstAmountPaise: 0,
        lineTotalPaise: 62_00_00_000,
        // L23: consignment-payout NOT eligible — no GST charged on consignor margin
        inputCreditEligible: false,
        inputCreditEligibilityReason: 'Consignor payout: no GST charged on consignor margin per Doc 06 §consignment-tax',
      },
    ],
    totalAmountPaise: 62_00_00_000,
    totalGstPaise: 0,
    inputCreditEligible: false,
    inputCreditEligibilityReason: 'Consignment payout: exempt supply per Doc 06 §consignment-tax (L23)',
    status: 'pending',
    linkedConsignmentVin: 'WBY2Z21090VX45678',
  },

  // ── VI-006: disputed invoice ───────────────────────────────────────────────
  {
    id: 'VI-006',
    invoiceNumber: 'WS/CHE/2026/102',
    vendorName: 'Chennai Auto Refurb House',
    vendorGstin: '33AABCC2345P1Z9',
    vendorPan: 'AABCC2345P',
    category: 'labour',
    outletId: 'CHE',
    raisedAt: '2026-03-28T09:00:00.000Z',
    lines: [
      {
        id: 'VIL-006-1',
        description: 'Engine bay cleaning + service — Mercedes E220d',
        hsnSac: '998729',
        quantity: 1,
        unitPricePaise: 8_00_000,  // ₹8,000
        gstRatePct: 18,
        gstAmountPaise: 1_44_000,  // ₹1,440
        lineTotalPaise: 9_44_000,
        inputCreditEligible: true,
      },
    ],
    totalAmountPaise: 8_00_000,
    totalGstPaise: 1_44_000,
    inputCreditEligible: true,
    status: 'disputed',
    disputeReason: 'Work not completed as per scope. Engine cleaning quality below standard.',
  },
];
