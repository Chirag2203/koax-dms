/**
 * Journal entries selector — SPEC-FINANCE-001 §4.3, §6.6, seam 22
 *
 * L9: Tally CSV voucher mapping — one row per ledger leg per voucher.
 * L14: Pure selector — no mutations.
 * L25: HSN/SAC derived from upstream; Finance does NOT classify.
 * L29: Outlet GSTIN from fallback constants (until Settings A4 ships).
 * Seam 22: Finance Journal Preview → multi-source voucher composer.
 */

import type { JournalEntry, JournalLeg } from '@dms/types';
import type { FYPeriod } from '../math/period';
import { isInPeriod } from '../math/period';
import { computeMarginAndGst } from '../math/gst-margin';
import { computeTcsApplied } from '../math/tcs';
import { getOutletGstinFallback } from '../__fixtures__/outlet-gstin-fallback';
import { useVehiclesStore } from '../../vehicles/vehicles-store';
import type { VendorInvoice } from '@dms/types';
import type { OutletScope } from './margin-reconciliation';

// ─── Ledger name mapping ──────────────────────────────────────────────────────

const LEDGER = {
  SALES_PREOWNED: (outlet: string) => `Sales A/c — Pre-owned (${outlet})`,
  OUTPUT_GST_MARGIN: (outlet: string) => `Output GST 18% (Margin) — ${outlet}`,
  RECEIVABLE_VEHICLE: (outlet: string) => `Receivable — Vehicle Sale (${outlet})`,
  TCS_PAYABLE: () => 'TCS Payable',
  VENDOR_PARTS: () => 'Inventory / Parts Expense',
  VENDOR_LABOUR: () => 'Workshop Labour Expense',
  VENDOR_CONSUMABLE: () => 'Workshop Consumables',
  VENDOR_COMMISSION: () => 'Insurance Commission Earned (Contra)',
  VENDOR_CONSIGNMENT: () => 'Consignor Settlement A/c',
  INPUT_GST: () => 'Input GST 18%',
  BANK: () => 'Bank — ICICI Current',
} as const;

// ─── Voucher numbering ────────────────────────────────────────────────────────

let voucherSequence = 0;

function makeVoucherNumber(date: string): string {
  voucherSequence += 1;
  const seq = String(voucherSequence).padStart(5, '0');
  return `VR-${date.slice(0, 7)}-${seq}`;
}

// ─── Selector ─────────────────────────────────────────────────────────────────

/**
 * Compose JournalEntry[] for a period+scope from all event sources.
 *
 * L9: §6.6 ledger mapping.
 * L14: Pure selector.
 * L25: HSN derived from upstream.
 * L29: Outlet GSTIN from fallback.
 * Seam 22: SPEC-FINANCE-001 §9.
 */
export function getJournalEntries(
  period: FYPeriod,
  scope: OutletScope,
  vendorInvoices: Record<string, VendorInvoice>,
): JournalEntry[] {
  // Reset sequence for deterministic voucher numbers within this call
  voucherSequence = 0;

  const entries: JournalEntry[] = [];

  // L14: read upstream via getState()
  const vehiclesState = useVehiclesStore.getState();
  const allVehicles = vehiclesState.vehicles;
  const allSalesEvents = vehiclesState.salesEvents;
  const costLedger = vehiclesState.costLedger;

  // ── 1. Vehicle SOLD events (margin scheme) ────────────────────────────────
  for (const [vin, events] of Object.entries(allSalesEvents)) {
    const vehicle = allVehicles[vin];

    for (const event of events) {
      if (event.kind !== 'SOLD') continue;
      if (!isInPeriod(event.at, period)) continue;

      const outletId = ((vehicle as Record<string, unknown>)?.['outletId'] as string) ?? 'BLR';
      if (scope !== 'ALL' && outletId !== scope) continue;

      const payload = event.payload as Record<string, unknown>;
      const salePricePaise = ((payload['finalPrice'] as number) ?? 0) * 100;
      const acquisitionCostPaise = ((vehicle as Record<string, unknown>)?.['acquisitionCost'] as number ?? 0) * 100;
      const vinLedger = costLedger[vin] ?? [];
      const allowableRefurbPaise = vinLedger
        .filter((e) => {
          const isAllowable = (e as Record<string, unknown>)['isAllowableRefurb'] as boolean;
          const entryAt = (e as Record<string, unknown>)['createdAt'] as string;
          return isAllowable && entryAt < event.at;
        })
        .reduce((sum, e) => {
          const amount = (e as Record<string, unknown>)['amount'] as number;
          return sum + (amount ?? 0) * 100;
        }, 0);

      const { gstPaise } = computeMarginAndGst({ salePricePaise, acquisitionCostPaise, allowableRefurbPaise });

      const customerPan = payload['customerPan'] as string | undefined;
      const tcsWaived = (payload['tcsWaived'] as boolean | undefined) ?? false;
      const tcsCollectedPaise = tcsWaived
        ? 0
        : computeTcsApplied({
            invoiceValuePaise: salePricePaise,
            cumulativeBeforePaise: 0, // simplified: each event standalone for journal
            tcsWaived,
          });

      const outletGstin = getOutletGstinFallback(outletId); // L29

      const legs: JournalLeg[] = [
        {
          ledgerName: LEDGER.RECEIVABLE_VEHICLE(outletId),
          drCr: 'Dr',
          amountPaise: salePricePaise,
          costCenter: outletId,
          gstinParty: outletGstin, // L29
          hsnSac: '8703',          // L25: pre-owned vehicles HSN
        },
        {
          ledgerName: LEDGER.SALES_PREOWNED(outletId),
          drCr: 'Cr',
          amountPaise: salePricePaise - gstPaise - tcsCollectedPaise,
          costCenter: outletId,
          gstinParty: customerPan ? '' : '',
          hsnSac: '8703',
          gstRatePct: 18,
          gstAmountPaise: gstPaise,
        },
        {
          ledgerName: LEDGER.OUTPUT_GST_MARGIN(outletId),
          drCr: 'Cr',
          amountPaise: gstPaise,
          costCenter: outletId,
          hsnSac: '8703',
          gstRatePct: 18,
          gstAmountPaise: gstPaise,
        },
      ];

      if (tcsCollectedPaise > 0) {
        legs.push({
          ledgerName: LEDGER.TCS_PAYABLE(),
          drCr: 'Cr',
          amountPaise: tcsCollectedPaise,
          costCenter: outletId,
        });
      }

      entries.push({
        voucherNumber: makeVoucherNumber(event.at.slice(0, 10)),
        voucherDate: event.at.slice(0, 10),
        voucherType: 'Sales',
        narration: `Sale of VIN ${vin} — Margin Scheme`,
        legs,
        sourceEvent: { module: 'sales', eventId: event.id },
      });
    }
  }

  // ── 2. Paid vendor invoices ───────────────────────────────────────────────
  for (const inv of Object.values(vendorInvoices)) {
    if (inv.status !== 'paid') continue;
    if (!inv.paidAt || !isInPeriod(inv.paidAt, period)) continue;
    if (scope !== 'ALL' && inv.outletId !== scope) continue;

    const drLedger = inv.category === 'parts' ? LEDGER.VENDOR_PARTS()
      : inv.category === 'labour' ? LEDGER.VENDOR_LABOUR()
      : inv.category === 'consumable' ? LEDGER.VENDOR_CONSUMABLE()
      : inv.category === 'commission' ? LEDGER.VENDOR_COMMISSION()
      : LEDGER.VENDOR_CONSIGNMENT();

    const legs: JournalLeg[] = [
      {
        ledgerName: drLedger,
        drCr: 'Dr',
        amountPaise: inv.totalAmountPaise,
        costCenter: inv.outletId,
        gstinParty: inv.vendorGstin,
      },
    ];

    // L23: input credit eligible lines get Input GST leg
    if (inv.inputCreditEligible && inv.totalGstPaise > 0) {
      legs.push({
        ledgerName: LEDGER.INPUT_GST(),
        drCr: 'Dr',
        amountPaise: inv.totalGstPaise,
        costCenter: inv.outletId,
        gstinParty: inv.vendorGstin,
      });
    }

    legs.push({
      ledgerName: LEDGER.BANK(),
      drCr: 'Cr',
      amountPaise: inv.totalAmountPaise + (inv.inputCreditEligible ? inv.totalGstPaise : 0),
      costCenter: inv.outletId,
    });

    entries.push({
      voucherNumber: makeVoucherNumber(inv.paidAt!.slice(0, 10)),
      voucherDate: inv.paidAt!.slice(0, 10),
      voucherType: 'Payment',
      narration: `Vendor invoice ${inv.invoiceNumber} — ${inv.vendorName}`,
      legs,
      sourceEvent: { module: 'vendor-invoice', eventId: inv.id },
    });
  }

  return entries;
}
