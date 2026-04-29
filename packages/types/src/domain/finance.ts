/**
 * Finance domain types — SPEC-FINANCE-001 §5
 *
 * 6 entities + 5 enums. All money in paise (integers).
 * L11: paise-integer convention — all *Paise fields are integers.
 * L6: VendorInvoice.vendorGstin validated at Zod schema boundary.
 * L13: customerPanLast4 is always masked; vendorPan is public business data.
 */

import { z } from 'zod';

// ─── Enums ─────────────────────────────────────────────────────────────────────

/** L17: Five vendor invoice categories. */
export const VendorInvoiceCategoryEnum = z.enum([
  'parts',
  'labour',
  'commission',
  'consumable',
  'consignment-payout',
]);
export type VendorInvoiceCategory = z.infer<typeof VendorInvoiceCategoryEnum>;

/** Vendor invoice lifecycle per L22. */
export const VendorInvoiceStatusEnum = z.enum([
  'pending',
  'approved',
  'paid',
  'disputed',
]);
export type VendorInvoiceStatus = z.infer<typeof VendorInvoiceStatusEnum>;

/** L21: 4-state TCS threshold progression per IT Act §206C(1F). */
export type TcsThresholdState = 'safe' | 'approaching' | 'near' | 'breached';
// L21: safe < ₹6L, approaching ₹6L–₹8L, near ₹8L–₹10L, breached ≥ ₹10L

/** L7: Customer outstanding aging states. */
export type AgingState = 'green' | 'amber' | 'red';
// L7: 0–30 days = green, 31–60 = amber, 61+ = red

/** Debit/Credit leg marker per double-entry convention. */
export type JournalDrCr = 'Dr' | 'Cr';

/** L26: Audit event kinds — append-only. */
export type FinanceAuditEventKind =
  | 'VENDOR_INVOICE_CREATED'
  | 'VENDOR_INVOICE_APPROVED'
  | 'VENDOR_INVOICE_PAID'
  | 'VENDOR_INVOICE_DISPUTED'
  | 'MARGIN_DISCREPANCY_ACK'
  | 'MARGIN_ROW_RECONCILED'
  | 'JOURNAL_EXPORTED';

// ─── 5.1 VendorInvoice ────────────────────────────────────────────────────────

export const VendorInvoiceLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  hsnSac: z.string().optional(),                   // L25 — required for journal export; validated at approval
  quantity: z.number().positive(),
  unitPricePaise: z.number().int().nonnegative(),   // L11
  gstRatePct: z.number().min(0).max(28),            // 0/5/12/18/28
  gstAmountPaise: z.number().int().nonnegative(),   // L11
  lineTotalPaise: z.number().int().nonnegative(),   // L11
  inputCreditEligible: z.boolean(),                 // L23 per-line override
  inputCreditEligibilityReason: z.string().optional(), // required when overriding default
});
export type VendorInvoiceLine = z.infer<typeof VendorInvoiceLineSchema>;

// L6: GSTIN regex — format-only validation in v1 per L6
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/;

export const VendorInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().min(1),                // vendor's invoice number
  vendorName: z.string(),
  vendorGstin: z.string().regex(GSTIN_REGEX),      // L6
  vendorPan: z.string().length(10).optional(),     // L13 — public business data, displayed in full
  category: VendorInvoiceCategoryEnum,             // L17
  outletId: z.enum(['BLR', 'MUM', 'CHE']),
  raisedAt: z.string().datetime(),                 // ISO
  dueAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  paymentRef: z.string().optional(),               // cheque/NEFT/RTGS ref (L8)
  lines: z.array(VendorInvoiceLineSchema),
  totalAmountPaise: z.number().int().nonnegative(), // L11
  totalGstPaise: z.number().int().nonnegative(),    // L11
  inputCreditEligible: z.boolean(),                // L23 top-level default
  inputCreditEligibilityReason: z.string().optional(), // when overridden from default per OQ-FIN-1
  status: VendorInvoiceStatusEnum,                 // L22
  approvedBy: z.string().optional(),               // staffId (L8 R12+)
  approvedAt: z.string().datetime().optional(),
  paidBy: z.string().optional(),                   // staffId (L8 R22+)
  disputeReason: z.string().optional(),            // L22
  // Cross-module linkage (DEF-FIN-8/9)
  linkedJobCardId: z.string().optional(),          // for category=labour from service
  linkedBuildJobId: z.string().optional(),         // for category=parts from custom-builds
  linkedInsuranceLeadId: z.string().optional(),    // for category=commission from insurance
  linkedConsignmentVin: z.string().optional(),     // for category=consignment-payout
});
export type VendorInvoice = z.infer<typeof VendorInvoiceSchema>;

// Draft type for creation (id not yet assigned)
export type VendorInvoiceDraft = Omit<VendorInvoice, 'id' | 'status' | 'approvedBy' | 'approvedAt' | 'paidBy' | 'paidAt' | 'paymentRef'>;

// ─── 5.2 MarginReconciliationRow (computed, not persisted) ───────────────────

/** L1: GST margin per pre-owned vehicle sale (PLAN-VEHICLES-003 L4 inheritance). */
export type MarginReconciliationRow = {
  vin: string;
  saleEventId: string;
  saleDate: string;                   // ISO
  customerName: string;
  customerPanLast4: string;           // L13 — masked XXXXX1234F
  outletId: 'BLR' | 'MUM' | 'CHE';
  salePricePaise: number;             // L11
  acquisitionCostPaise: number;       // L11
  allowableRefurbPaise: number;       // L11 — sum of isAllowableRefurb cost-ledger entries
  computedMarginPaise: number;        // L1: max(0, sale - acq - refurb)
  computedGstPaise: number;           // L1: margin × 18/118
  storedGstPaise: number | null;      // from PLAN-VEHICLES-003 L4 payload field
  discrepancyDetected: boolean;       // L20: |computed - stored| > ₹1 (100 paise)
  discrepancyAck: { reason: string; actorId: string; ackedAt: string } | null;
  hsnMissing: boolean;                // L25
  reconciliationStatus: 'open' | 'reconciled';
  reconciledBy?: string;
  reconciledAt?: string;
  reconciledNotes?: string;
};

// ─── 5.3 TcsRegisterRow (computed) ───────────────────────────────────────────

/** L2 + L21: TCS register per customer PAN per FY. */
export type TcsRegisterRow = {
  customerId: string;
  customerName: string;
  customerPanLast4: string;           // L13
  fy: string;                         // 'FY26'
  cumulativePurchasePaise: number;    // L11: total purchase value (including waived)
  tcsApplicablePaise: number;         // L11: cumulative excl. waived (for threshold calc)
  thresholdState: TcsThresholdState;  // L21
  tcsCollectedTotalPaise: number;     // L11: actual TCS deducted (0 on waived events)
  salesCount: number;
  waivedSalesCount: number;           // L3
  lastSaleAt: string;                 // ISO
  events: Array<{
    eventId: string;
    vin: string;
    saleDate: string;
    invoiceValuePaise: number;        // L11
    tcsAppliedPaise: number;          // L11: 0 if waived or below threshold
    tcsWaived: boolean;               // L3
    tcsWaivedReason?: string;
    tcsWaivedBy?: string;
  }>;
};

// ─── 5.4 CustomerLedgerEntry (computed) ──────────────────────────────────────

/** L18: Per-customer outstanding — 3-source aggregation. */
export type CustomerLedgerEntry = {
  customerId: string;
  customerName: string;
  customerPanLast4: string;           // L13
  totalOutstandingPaise: number;      // L11
  oldestUnpaidAgeDays: number;
  agingState: AgingState;             // L7
  lastPaymentAt: string | null;
  rows: Array<{
    sourceModule: 'sales' | 'service' | 'custom-builds' | 'payment';
    sourceId: string;                 // SO id, RO id, build job id, payment id
    issuedAt: string;
    amountPaise: number;              // L11: positive = invoice, negative = payment
    paidAmountPaise: number;          // L11
    outstandingPaise: number;         // L11
    ageDays: number;
    description: string;
  }>;
};

// ─── 5.5 JournalEntry (computed) ─────────────────────────────────────────────

/** L9: Tally Prime voucher import row — per L28 must balance. */
export type JournalLeg = {
  ledgerName: string;                 // L9: e.g. 'Sales A/c — Pre-owned (BLR)'
  drCr: JournalDrCr;
  amountPaise: number;                // L11
  costCenter?: string;                // outlet code
  gstinParty?: string;                // L29
  hsnSac?: string;                    // L25
  gstRatePct?: number;
  gstAmountPaise?: number;            // L11
};

export type JournalEntry = {
  voucherNumber: string;              // 'VR-2026-04-00012'
  voucherDate: string;                // ISO date (no time component)
  voucherType: 'Sales' | 'Receipt' | 'Purchase' | 'Payment' | 'Journal';
  narration: string;
  legs: JournalLeg[];                 // L28: must balance (Dr sum == Cr sum)
  sourceEvent: {
    module: 'sales' | 'service' | 'custom-builds' | 'payroll' | 'vendor-invoice';
    eventId: string;
  };
};

// ─── 5.6 FinanceAuditEvent ────────────────────────────────────────────────────

/** L26: Append-only finance audit stream. */
export type FinanceAuditEvent = {
  id: string;                         // ULID-style
  kind: FinanceAuditEventKind;
  timestamp: string;                  // ISO
  actorId: string;
  actorRole: string;                  // captured at event time
  outletScope: string;
  payload: Record<string, unknown>;   // per-kind validated payload
};
