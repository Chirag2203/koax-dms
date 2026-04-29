/**
 * Finance store — Zustand thin store.
 *
 * SPEC-FINANCE-001 §4. Thin: only vendor invoices + period/scope state are owned here.
 * All other data is computed via selectors reading upstream stores.
 *
 * L14: Pure selectors — no upstream mutations.
 * L22: Vendor invoice approval is non-reversible without R22+ acknowledgement.
 * L24: Period state is local — no upstream writes, URL-hash participates (UI layer concern).
 * L26: Every finance mutation appends to auditEvents (append-only).
 * L27: Outlet scope — R12 own-outlet, R19+/R22+ any.
 * L28: exportJournalCSV asserts voucher balance before serializing.
 * L30: Idempotent export.
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FinanceStore, FinanceStoreState, FinanceActor } from './types';
import type { VendorInvoice, VendorInvoiceDraft, FYPeriod, FinanceAuditEvent } from './types';
import type { OutletScope } from './types';
import type { VendorInvoiceFilter } from '../selectors/vendor-invoice-list';
import { getCurrentFYPeriod } from '../math/period';
import { getMarginReconciliation } from '../selectors/margin-reconciliation';
import { getTcsRegister } from '../selectors/tcs-register';
import { getCustomerLedger } from '../selectors/customer-ledger';
import { getVendorInvoiceList } from '../selectors/vendor-invoice-list';
import { getJournalEntries } from '../selectors/journal-entries';
import { buildJournalExport } from '../tally-csv/builder';

// ─── ID helpers ───────────────────────────────────────────────────────────────

let _auditSeq = 0;
function makeAuditId(): string {
  _auditSeq += 1;
  return `FAE-${Date.now()}-${String(_auditSeq).padStart(4, '0')}`;
}

function makeInvoiceId(): string {
  return `VI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// ─── Initial state ────────────────────────────────────────────────────────────

function initialState(): FinanceStoreState {
  return {
    period: getCurrentFYPeriod(),  // L4: current FY
    outletScope: 'BLR',
    vendorInvoices: {},
    auditEvents: [],               // L26: append-only
    marginDiscrepancyAcks: {},
    marginRowReconciliations: {},
    hydrated: false,
  };
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

function makeAuditEvent(
  kind: FinanceAuditEvent['kind'],
  actor: FinanceActor,
  outletScope: string,
  payload: Record<string, unknown>,
): FinanceAuditEvent {
  return {
    id: makeAuditId(),
    kind,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorRole: actor.role,
    outletScope,
    payload,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFinanceStore = create<FinanceStore>()(
  immer((set, get) => ({
    ...initialState(),

    // ── Period + scope ─────────────────────────────────────────────────────

    /** L24: Pure local state — no upstream writes. */
    setPeriod(period: FYPeriod) {
      set((s) => { s.period = period; });
    },

    /** L27: Outlet scope. */
    setOutletScope(scope: OutletScope) {
      set((s) => { s.outletScope = scope; });
    },

    // ── Vendor invoices ────────────────────────────────────────────────────

    /** Create vendor invoice. L8: R12+ gate checked at UI layer via Gate primitive. */
    createVendorInvoice(draft: VendorInvoiceDraft, actor: FinanceActor): string {
      const id = makeInvoiceId();
      const invoice: VendorInvoice = {
        ...draft,
        id,
        status: 'pending',
      };
      set((s) => {
        s.vendorInvoices[id] = invoice;
        // L26: append audit event
        s.auditEvents.push(makeAuditEvent('VENDOR_INVOICE_CREATED', actor, draft.outletId, {
          invoiceId: id,
          invoiceNumber: draft.invoiceNumber,
          vendorName: draft.vendorName,
          category: draft.category,
          totalAmountPaise: draft.totalAmountPaise,
        }));
      });
      return id;
    },

    /** L8: R12+ approve. L22: pending → approved (non-reversible without R22+). */
    approveVendorInvoice(invoiceId: string, actor: FinanceActor) {
      set((s) => {
        const inv = s.vendorInvoices[invoiceId];
        if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
        if (inv.status !== 'pending') throw new Error(`Invoice ${invoiceId} is not pending (status: ${inv.status})`);
        inv.status = 'approved';
        inv.approvedBy = actor.id;
        inv.approvedAt = new Date().toISOString();
        // L26: append audit event
        s.auditEvents.push(makeAuditEvent('VENDOR_INVOICE_APPROVED', actor, inv.outletId, {
          invoiceId,
          invoiceNumber: inv.invoiceNumber,
          vendorName: inv.vendorName,
        }));
      });
    },

    /** L8: R22+ mark paid. L22: approved → paid. */
    markVendorInvoicePaid(invoiceId: string, paymentRef: string, actor: FinanceActor) {
      set((s) => {
        const inv = s.vendorInvoices[invoiceId];
        if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
        if (inv.status !== 'approved') throw new Error(`Invoice ${invoiceId} must be approved before marking paid`);
        inv.status = 'paid';
        inv.paidBy = actor.id;
        inv.paidAt = new Date().toISOString();
        inv.paymentRef = paymentRef;
        // L26
        s.auditEvents.push(makeAuditEvent('VENDOR_INVOICE_PAID', actor, inv.outletId, {
          invoiceId,
          invoiceNumber: inv.invoiceNumber,
          paymentRef,
        }));
      });
    },

    /** L22: Reverts to pending + reason. */
    disputeVendorInvoice(invoiceId: string, reason: string, actor: FinanceActor) {
      set((s) => {
        const inv = s.vendorInvoices[invoiceId];
        if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
        inv.status = 'disputed';
        inv.disputeReason = reason;
        // L26
        s.auditEvents.push(makeAuditEvent('VENDOR_INVOICE_DISPUTED', actor, inv.outletId, {
          invoiceId,
          invoiceNumber: inv.invoiceNumber,
          reason,
        }));
      });
    },

    // ── Reconciliation ─────────────────────────────────────────────────────

    /** L20: R22+ acknowledge margin discrepancy. */
    acknowledgeMarginDiscrepancy(vin: string, eventId: string, reason: string, actor: FinanceActor) {
      const key = `${vin}:${eventId}`;
      set((s) => {
        s.marginDiscrepancyAcks[key] = {
          reason,
          actorId: actor.id,
          ackedAt: new Date().toISOString(),
        };
        // L26
        s.auditEvents.push(makeAuditEvent('MARGIN_DISCREPANCY_ACK', actor, s.outletScope, {
          vin,
          eventId,
          reason,
        }));
      });
    },

    /** §1.1: R22+ mark margin row reconciled. */
    markMarginRowReconciled(vin: string, eventId: string, notes: string | undefined, actor: FinanceActor) {
      const key = `${vin}:${eventId}`;
      set((s) => {
        s.marginRowReconciliations[key] = {
          notes,
          reconciledBy: actor.id,
          reconciledAt: new Date().toISOString(),
        };
        // L26
        s.auditEvents.push(makeAuditEvent('MARGIN_ROW_RECONCILED', actor, s.outletScope, {
          vin,
          eventId,
          notes,
        }));
      });
    },

    // ── Journal export ─────────────────────────────────────────────────────

    /**
     * L8/L12: R22+ only.
     * L28: balance check before export (throws on imbalance).
     * L30: Idempotent — same inputs = byte-identical CSV.
     * L26: Audit logged.
     */
    exportJournalCSV(period: FYPeriod, scope: OutletScope) {
      const state = get();
      const entries = getJournalEntries(period, scope, state.vendorInvoices);
      // L28: assertAllVouchersBalanced called inside buildJournalExport — throws on failure
      const result = buildJournalExport(entries, scope === 'ALL' ? 'ALL' : scope, period);

      set((s) => {
        // L26: audit the export
        s.auditEvents.push(makeAuditEvent('JOURNAL_EXPORTED', {
          id: 'system',
          name: 'System',
          role: 'R22',
        }, scope, {
          period: period.label,
          scope,
          voucherCount: result.voucherCount,
          csvByteLength: result.csvByteLength,
          filename: result.filename,
          outletGstinSource: 'fallback', // L29 — until Settings A4 ships
        }));
      });

      return result;
    },

    // ── Pure selectors (L14: no mutations) ────────────────────────────────

    getMarginReconciliation(period: FYPeriod, scope: OutletScope) {
      // L14: reads upstream stores via getState(); no mutations
      const s = get();
      return getMarginReconciliation(period, scope, s.marginDiscrepancyAcks, s.marginRowReconciliations);
    },

    getTcsRegister(period: FYPeriod, scope: OutletScope) {
      // L14: reads upstream stores via getState(); no mutations
      return getTcsRegister(period, scope);
    },

    getCustomerLedger(scope: OutletScope) {
      // L14: reads upstream stores via getState(); no mutations
      return getCustomerLedger(scope);
    },

    getVendorInvoiceList(period: FYPeriod, scope: OutletScope, filters?: VendorInvoiceFilter) {
      return getVendorInvoiceList(get().vendorInvoices, period, scope, filters);
    },

    getJournalEntries(period: FYPeriod, scope: OutletScope) {
      return getJournalEntries(period, scope, get().vendorInvoices);
    },

    getFinanceAuditLog(period?: FYPeriod, scope?: OutletScope) {
      const state = get();
      let events = [...state.auditEvents];
      if (scope) {
        events = events.filter((e) => e.outletScope === scope || e.outletScope === 'ALL');
      }
      return events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    },

    // ── Hydration ──────────────────────────────────────────────────────────

    hydrateVendorInvoices(invoices: VendorInvoice[]) {
      set((s) => {
        for (const inv of invoices) {
          if (!s.vendorInvoices[inv.id]) {
            s.vendorInvoices[inv.id] = inv;
          }
        }
        s.hydrated = true;
      });
    },
  })),
);
