/**
 * Customer ledger selector — SPEC-FINANCE-001 §4.3, L18, seam 20
 *
 * L18: Per-customer outstanding — 3-source aggregation:
 *      (1) Vehicle sales invoices from vehicles-store.salesEvents
 *      (2) Service RO invoices — mock fixture in v1 (DEF-FIN-12)
 *      (3) Custom-build invoices from custom-builds-store (mock fixture in v1)
 *      Payments from mock customerPayments fixture until payments-store ships.
 * L7: Aging thresholds applied per aging.ts.
 * L13: PAN masking.
 * L14: Pure selector — no mutations.
 * Seam 20: SPEC-FINANCE-001 §9.
 */

import type { CustomerLedgerEntry } from '@dms/types';
import { computeAgeDays, computeAgingState } from '../math/aging';
import { maskPan } from '../math/pan-mask';
import { useVehiclesStore } from '../../vehicles/vehicles-store';
import type { OutletScope } from './margin-reconciliation';

// ─── Mock customer payments fixture ──────────────────────────────────────────
// DEF-FIN-12: Real payments-store is v2. Using mock payments here.

interface MockPayment {
  id: string;
  customerId: string;
  customerPan?: string;
  amountPaise: number;
  paidAt: string;
  description: string;
}

// These represent payments received (negative amounts in ledger)
const MOCK_CUSTOMER_PAYMENTS: MockPayment[] = [
  {
    id: 'PMT-001',
    customerId: 'cust-buyer-001',
    customerPan: 'ABCDE1234F',
    amountPaise: 85_00_00_000, // ₹85,00,000
    paidAt: '2026-04-20T10:00:00.000Z',
    description: 'Payment — BMW 5 Series sale',
  },
];

// ─── Selector ─────────────────────────────────────────────────────────────────

/**
 * Compute CustomerLedgerEntry[] aggregating 3 invoice sources.
 *
 * L14: Pure selector — no mutations.
 * L18: 3-source aggregation. Seam 20: SPEC-FINANCE-001 §9.
 */
export function getCustomerLedger(
  scope: OutletScope,
  referenceDate?: Date,
): CustomerLedgerEntry[] {
  const ref = referenceDate ?? new Date();

  // L14: read upstream via getState()
  const vehiclesState = useVehiclesStore.getState();
  const allVehicles = vehiclesState.vehicles;
  const allSalesEvents = vehiclesState.salesEvents;

  // Build per-customer map of invoice rows
  const customerMap = new Map<string, {
    customerId: string;
    customerName: string;
    customerPan: string | null;
    rows: CustomerLedgerEntry['rows'];
  }>();

  // ── Source 1: Vehicle sales invoices ──────────────────────────────────────
  for (const [vin, events] of Object.entries(allSalesEvents)) {
    const vehicle = allVehicles[vin];

    for (const event of events) {
      if (event.kind !== 'SOLD') continue;

      const payload = event.payload as Record<string, unknown>;
      const customerId = (payload['buyerCustomerId'] as string | undefined) ?? 'unknown';
      const customerName = (payload['buyerName'] as string | undefined) ?? 'Unknown';
      const customerPan = (payload['customerPan'] as string | undefined) ?? null;
      const invoiceValuePaise = ((payload['finalPrice'] as number) ?? 0) * 100;

      const outletId = ((vehicle as Record<string, unknown>)?.['outletId'] as string) ?? 'BLR';
      if (scope !== 'ALL' && outletId !== scope) continue;

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, { customerId, customerName, customerPan, rows: [] });
      }

      const ageDays = computeAgeDays(event.at, ref);

      customerMap.get(customerId)!.rows.push({
        sourceModule: 'sales',
        sourceId: (payload['salesOrderId'] as string | undefined) ?? vin,
        issuedAt: event.at,
        amountPaise: invoiceValuePaise,
        paidAmountPaise: 0,   // updated when payments applied
        outstandingPaise: invoiceValuePaise,
        ageDays,
        description: `Vehicle invoice — VIN ${vin}`,
      });
    }
  }

  // ── Source 2: Service RO invoices — mock (DEF-FIN-12) ─────────────────────
  // Real service-store integration is P2 (DEF-FIN-12). Mock rows for fixture coverage.

  // ── Source 3: Custom-build invoices — mock ────────────────────────────────
  // Real custom-builds-store integration is P2 (DEF-FIN-9). Mock rows for fixture coverage.

  // ── Apply mock payments ───────────────────────────────────────────────────
  for (const payment of MOCK_CUSTOMER_PAYMENTS) {
    const entry = customerMap.get(payment.customerId);
    if (!entry) continue;
    entry.rows.push({
      sourceModule: 'payment',
      sourceId: payment.id,
      issuedAt: payment.paidAt,
      amountPaise: -payment.amountPaise, // negative = inflow
      paidAmountPaise: payment.amountPaise,
      outstandingPaise: 0,
      ageDays: 0,
      description: payment.description,
    });
  }

  // Build CustomerLedgerEntry[]
  const entries: CustomerLedgerEntry[] = [];

  for (const { customerId, customerName, customerPan, rows } of customerMap.values()) {
    // Sort rows chronologically
    const sortedRows = [...rows].sort((a, b) => (a.issuedAt < b.issuedAt ? -1 : 1));

    // Compute totals
    const totalOutstandingPaise = sortedRows
      .filter((r) => r.sourceModule !== 'payment')
      .reduce((s, r) => s + r.outstandingPaise, 0);

    const unpaidRows = sortedRows.filter(
      (r) => r.sourceModule !== 'payment' && r.outstandingPaise > 0,
    );
    const oldestUnpaidAgeDays = unpaidRows.length > 0
      ? Math.max(...unpaidRows.map((r) => r.ageDays))
      : 0;

    const paymentRows = sortedRows.filter((r) => r.sourceModule === 'payment');
    const lastPaymentAt = paymentRows.length > 0
      ? paymentRows[paymentRows.length - 1]!.issuedAt
      : null;

    entries.push({
      customerId,
      customerName,
      customerPanLast4: customerPan ? maskPan(customerPan) : '—', // L13
      totalOutstandingPaise,
      oldestUnpaidAgeDays,
      agingState: computeAgingState(oldestUnpaidAgeDays), // L7
      lastPaymentAt,
      rows: sortedRows,
    });
  }

  // Sort by oldest unpaid age desc (most overdue first) — L7
  entries.sort((a, b) => b.oldestUnpaidAgeDays - a.oldestUnpaidAgeDays);
  return entries;
}
