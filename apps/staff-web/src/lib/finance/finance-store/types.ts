/**
 * Finance store types — SPEC-FINANCE-001 §4
 *
 * L14: Pure selectors read upstream stores via getState(). No mutations.
 * L24: Period changes are local-only; no upstream writes.
 * L26: Audit events are append-only.
 * L27: Outlet scope controlled here.
 */

import type {
  VendorInvoice,
  VendorInvoiceDraft,
  MarginReconciliationRow,
  TcsRegisterRow,
  CustomerLedgerEntry,
  JournalEntry,
  FinanceAuditEvent,
  FinanceAuditEventKind,
} from '@dms/types';
import type { FYPeriod } from '../math/period';
import type { OutletScope } from '../selectors/margin-reconciliation';
import type { VendorInvoiceFilter } from '../selectors/vendor-invoice-list';
import type { JournalExportResult } from '../tally-csv/builder';

export type { OutletScope };

// ─── State shape ──────────────────────────────────────────────────────────────

export interface FinanceStoreState {
  /** L24: Period state — local only, no upstream writes. */
  period: FYPeriod;
  /** L27: Outlet scope. */
  outletScope: OutletScope;

  /** Finance-owned entity: vendor invoices. */
  vendorInvoices: Record<string, VendorInvoice>;

  /** L26: Append-only finance audit stream. */
  auditEvents: FinanceAuditEvent[];

  /** L20: Margin discrepancy acknowledgements. */
  marginDiscrepancyAcks: Record<string, { reason: string; actorId: string; ackedAt: string }>;

  /** §1.1: Reconciliation marks per vin:eventId. */
  marginRowReconciliations: Record<string, { notes?: string; reconciledBy: string; reconciledAt: string }>;

  /** Whether the store has been hydrated with fixtures. */
  hydrated: boolean;
}

// ─── Actor ────────────────────────────────────────────────────────────────────

export interface FinanceActor {
  id: string;
  name: string;
  role: string;
}

// ─── Store actions ────────────────────────────────────────────────────────────

export interface FinanceStoreActions {
  // Period + scope
  /** L24: Pure local state update. */
  setPeriod(period: FYPeriod): void;
  /** L27: R12 own-outlet only; R19+ any. */
  setOutletScope(scope: OutletScope): void;

  // Vendor invoices
  createVendorInvoice(draft: VendorInvoiceDraft, actor: FinanceActor): string;
  /** L8: R12+ approve. Audit logged. */
  approveVendorInvoice(invoiceId: string, actor: FinanceActor): void;
  /** L8: R22+ mark paid. Captures paymentRef. Audit logged. */
  markVendorInvoicePaid(invoiceId: string, paymentRef: string, actor: FinanceActor): void;
  /** L22: Reverts to pending. Audit logged. */
  disputeVendorInvoice(invoiceId: string, reason: string, actor: FinanceActor): void;

  // Reconciliation
  /** L20: R22+ acknowledge discrepancy. Audit logged. */
  acknowledgeMarginDiscrepancy(vin: string, eventId: string, reason: string, actor: FinanceActor): void;
  /** §1.1: R22+ mark margin row reconciled. Audit logged. */
  markMarginRowReconciled(vin: string, eventId: string, notes: string | undefined, actor: FinanceActor): void;

  // Journal export
  /** L8/L12: R22+ only. L28: balance check. L30: idempotent. Audit logged. */
  exportJournalCSV(period: FYPeriod, scope: OutletScope): JournalExportResult;

  // Selectors (L14: pure, no mutations)
  getMarginReconciliation(period: FYPeriod, scope: OutletScope): MarginReconciliationRow[];
  getTcsRegister(period: FYPeriod, scope: OutletScope): TcsRegisterRow[];
  getCustomerLedger(scope: OutletScope): CustomerLedgerEntry[];
  getVendorInvoiceList(period: FYPeriod, scope: OutletScope, filters?: VendorInvoiceFilter): VendorInvoice[];
  getJournalEntries(period: FYPeriod, scope: OutletScope): JournalEntry[];
  getFinanceAuditLog(period?: FYPeriod, scope?: OutletScope): FinanceAuditEvent[];

  // Hydration
  hydrateVendorInvoices(invoices: VendorInvoice[]): void;
}

export type FinanceStore = FinanceStoreState & FinanceStoreActions;

// Re-exports for convenience
export type {
  VendorInvoice,
  VendorInvoiceDraft,
  MarginReconciliationRow,
  TcsRegisterRow,
  CustomerLedgerEntry,
  JournalEntry,
  FinanceAuditEvent,
  FinanceAuditEventKind,
  FYPeriod,
  VendorInvoiceFilter,
};
