---
spec_id: SPEC-FINANCE-001
domain: finance
status: approved
risk_level: high
pii_sensitivity: medium
version: 1.0
flags: [finance-module, finance-gst-margin, finance-tcs-register, finance-vendor-invoices, finance-customer-ledger, finance-journal-export]
owners: [orchestrator]
depends_on:
  - SPEC-VEHICLES-001
  - PLAN-VEHICLES-003
  - SPEC-INSURANCE-001
  - SPEC-CUSTOM-BUILDS-001
  - SPEC-STAFF-001
  - SPEC-ARCH-UI-001
---

# Finance — GST margin, TCS, vendor invoices, customer ledger, Tally export (staff-web)

BN Automobiles operates as a luxury pre-owned car dealership across three Indian
outlets (Bangalore, Mumbai, Chennai). Indian regulation makes the finance surface
binary: a margin-scheme miscalculation, a missed TCS deduction, or an unmapped
vendor-invoice GST input is a penalty event, not a polish item. This module
turns the existing transactional events (sales, custom-build invoices,
service ROs, payroll runs, vendor payables, insurance commission payouts) into
a **reconciliation surface** ready for the outlet accountant's monthly Tally
Prime upload.

The module is read-mostly. It does NOT mutate sales / cost-ledger / payroll /
custom-builds state — it composes existing slices' read-only selectors via
the cross-module wiring registry (seams 18–22 below). The only
finance-owned writes are vendor-invoice approvals + payment markings,
period state, and journal-export blob downloads. Everything else is
computed-on-demand.

This is the **A2 build** of the Theme A operational backbone roadmap
(`specs/roadmap/next-themes.md`). It is the dependency for D1 (GSTR-1/3B
returns, Theme D) and D2 (e-invoicing IRN+QR, Theme D), both of which sit
on top of the reconciliation primitives this spec ships.

---

## 0. Locked decisions

| # | Title | Decision | Source |
|---|---|---|---|
| L1 | **GST margin formula on pre-owned vehicle sales** | `gstAmount = margin × 18 / 118`. Margin is **tax-inclusive** per CBIC Notification 8/2018-CT(R) Rule 32(5). `margin = max(0, salePrice - acquisitionCost - allowableRefurbCosts)`. Loss-sales clamp margin to 0 (no negative GST liability). Inherited from PLAN-VEHICLES-003 L4. The **Finance module recomputes** this from sales + cost-ledger selectors; it never trusts the pre-stored `gstMargin` payload field as source of truth — see L20 reconciliation discrepancy alert. | Doc 06 §GST.margin; CBIC Notification 8/2018-CT(R) Rule 32(5); PLAN-VEHICLES-003 L4 |
| L2 | **TCS @ 1% on motor vehicle sales > ₹10,00,000 per PAN per FY** | Per IT Act §206C(1F). Threshold is **cumulative** across all sales to the same PAN within a single FY (Apr 1 – Mar 31). The Finance TCS register reads sales events grouped by `customerPan`, sums `invoiceValue` per FY, and shows a running cumulative. Threshold is checked at-sale-time in SoCompleteDialog (PLAN-VEHICLES-003 L5); Finance shows the post-hoc register view. | Doc 06 §TCS; IT Act §206C(1F); PLAN-VEHICLES-003 L5 |
| L3 | **TCS waiver authority** | Waiver requires R12+ approver + free-text reason captured on the SO at completion time. Finance module **reads** waivers from the sales events stream (`tcsWaived: true`, `tcsWaivedReason`); it cannot create or revoke them. Waivers appear in the TCS register as a separate "waived" tab + are excluded from the cumulative running total (since no TCS was deducted). Inherits PLAN-VEHICLES-003 L18. | Doc 06 §TCS; Doc 14 §R12; PLAN-VEHICLES-003 L18 |
| L4 | **Indian Financial Year = April 1 – March 31** | Period picker hard-codes Apr 1 start, Mar 31 end. FY label format `FY26` = Apr 1 2025 → Mar 31 2026. Quarter labels: Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar. Calendar-year alternative is explicitly NOT offered. | Doc 06 §FY; IT Act §3 |
| L5 | **Tally Prime export = CSV, period-batched, never live-sync** | Live Tally sync is explicitly v2. v1 ships a CSV download keyed to Tally Prime's voucher-import schema (header row + voucher rows). The accountant uploads manually monthly. CSV format documented at `apps/staff-web/src/lib/finance/tally-csv-format.md` and locked here as the canonical contract for the voucher columns. | Doc 06 §journal-entries; roadmap A2 scope; Theme D D1 backlog |
| L6 | **GSTIN format validation** | Regex: `^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$` (15 chars, structure: state-code(2) + PAN(10) + entity(1) + 'Z' + checksum(1)). Format-only validation in v1; live verification against the GSTN portal is v2. Vendor invoice creation fails fast on regex mismatch with i18n key `finance.vendorInvoice.errors.gstinInvalidFormat`. | Doc 06 §GSTIN; CBIC GSTN format spec |
| L7 | **Customer outstanding aging thresholds** | 0–30 days = green, 31–60 days = amber, 61+ days = red. Defaults applied in v1; configurable per outlet in the Settings module (A4 dependency, Theme A). Aging is computed against `invoiceIssuedAt` (not `dueAt` — invoices in this domain are net-immediate by default per Doc 06 §sales-invoice). | Doc 06 §AR-aging; Doc 03 §payment-terms |
| L8 | **Vendor invoice role split** | `R12+` (Finance Manager) can **view + approve**. `R22+` (CFO) can **mark paid + export journal**. `R10` (Sales Advisor) and below have **zero finance access** (sidebar entry hidden via `Gate role={['R12'...]}`). Audit log entry on every approve + mark-paid + export. | Doc 14 §R12, §R22, §R10 |
| L9 | **Tally CSV format anchored at L9-LOCK** | Tally Prime XML import schema 5.1 mapped to flat CSV. Columns: `voucherDate, voucherType, voucherNumber, ledgerName, drCr, amount, narration, costCenter, gstinParty, hsnSac, gstRate, gstAmount`. One row per ledger leg per voucher (a sale voucher with sale-account credit + cash-account debit + GST-output credit produces 3 rows sharing `voucherNumber`). Header row is fixed. Reference fixture at `apps/staff-web/src/lib/finance/__fixtures__/tally-export-sample.csv`. | Doc 06 §journal-entries; Tally Prime Voucher XML 5.1 spec |
| L10 | **All money math via finance-core** | Either a new `@dms/finance-core` package OR `apps/staff-web/src/lib/finance/math/` directory of pure functions. Every margin / GST / TCS / aging / journal computation MUST route through the math layer. **Inline calculations in components are auto-rejected at review.** Math layer has 100% branch coverage as a non-negotiable production gate. | CLAUDE.md §17 production-grade; Doc 06 §math-locality |
| L11 | **Rounding rules** | Money is stored in **paise as integers** internally; rendered as rupees with 2-decimal display. Rounding mode = banker's rounding (`Math.round` for half-to-even is acceptable in v1). GST amounts are rounded **per invoice line**, not at total — line-level rounding matches Tally Prime + GSTR-1 conventions. Sum-of-lines may differ from total-then-round by ≤ ₹1 — this is correct, not a bug. | Doc 06 §rounding; CBIC GST FAQ on rounding |
| L12 | **Finance role gate matrix** | Sidebar "Finance" entry visible only to `R12+`. `/finance` hub readable by R12+. `/finance/journal` readable + exportable only by R22+. R10 and below see no sidebar entry, no menu reference, no deep-link access (server route returns 403 + redirect to `/dashboard`). Hub tiles use `Gate role={['R12'...]}` from `SPEC-ARCH-UI-001`. | Doc 14 §R12, §R22 |
| L13 | **PII masking — vendor vs customer asymmetry** | Vendor PAN + GSTIN are **public business data** per IT Act §139A (PAN of a registered business is public on GSTN portal), so Finance displays them in full to R12+. **Customer PAN is PII** per DPDP Act 2023 §3 and is rendered last-4 only (e.g. `XXXXX1234F`) in the TCS register. Full PAN is never logged. | Doc 14 §PII; DPDP Act 2023 §3; IT Act §139A |
| L14 | **No store mutations during selector reads** | The finance-store's `getMarginReconciliation`, `getTcsRegister`, `getCustomerLedger`, `getVendorInvoiceList`, `getJournalEntries` are **pure selectors**: they take a period+scope, read upstream stores via `useXxxStore.getState()`, and return computed rows. No upstream stores are mutated. No finance-store state is mutated. The only writes during a selector call are React-rendering side-effects in the component layer. | CLAUDE.md §17; PLAN-VEHICLES-003 L45 single-source-of-truth |
| L15 | **Empty-period rendering** | When a period has zero matching events (e.g. zero SOLD events in a quiet month), render an explicit empty state copy: "No vehicle sales in this period" / "No vendor invoices for this scope" — never `0` totals or blank tables. Empty state uses the canonical UI `EmptyState` primitive. Total-count chips show `—` (em-dash), not `0`. Avoids the failure mode where an outlet looks "reconciled" when the data simply never loaded. | SPEC-ARCH-UI-001 §EmptyState; CLAUDE.md §10 DoD #2 |
| L16 | **GST drill-down per VIN is mandatory** | Every margin row in `/finance/gst` is clickable → routes to `/finance/gst/[vin]`. The drill-down renders a `MarginBreakdownCard` showing: salePrice, acquisitionCost, individual refurb-cost line items (with category chips: parts, labour, transport, other-allowable), allowable-vs-disallowed split, computed margin, computed GST. R22+ sees additional override controls; R12 sees read-only with a "Request override" CTA that creates an internal task (not built in v1, surfaced as deferred DEF-FIN-2). | Doc 06 §GST.margin audit-trail requirement |
| L17 | **Vendor invoice categories** | Five values: `parts` (aftermarket / OEM parts payable to a vendor — typically custom-builds), `labour` (refurb workshop bills), `commission` (insurance commission payouts to BN per L21 of SPEC-INSURANCE-001), `consumable` (service-bay consumables — oils, filters, cleaners), `consignment-payout` (consignor settlement on a sold consigned vehicle, per Doc 04 §consignment). Each category renders a different invoice template and maps to a different Tally ledger account in the journal export (mapping table in §6.6). | Doc 06 §AP-categories; Doc 04 §consignment |
| L18 | **Customer ledger reads from THREE sources, single timeline view** | Per-customer outstanding balance composes `salesOrders` from `vehicles-store`'s sales-events selector (vehicle invoices), `repairOrders` from `service-store` (service invoices), and `buildJobs` from `custom-builds-store` (custom-build invoices). Payment events come from a future payments-store; until then, mock `customerPayments` fixture is the source. The ledger UI shows ALL three streams interleaved chronologically with a category chip per row. There is **no single "customer-invoice" entity** — invoices are scoped to their originating module per Doc 04, Doc 05, Doc 06. | Doc 04 §sales-invoice; Doc 05 §service-invoice; Doc 06 §customer-ledger |
| L19 | **Tally export filename pattern** | `BN_<outletCode>_<periodLabel>_journal.csv` where `outletCode ∈ {BLR, MUM, CHE, ALL}` and `periodLabel ∈ {FY26-Q1, FY26-Q2, FY26-Q3, FY26-Q4, FY26-M01..M12, FY26-FULL}`. Examples: `BN_BLR_FY26-Q1_journal.csv`, `BN_ALL_FY26-M07_journal.csv`. Filename is generated client-side (no server roundtrip) via `Blob` + `URL.createObjectURL` + `<a download>`. | UX consistency; matches Tally Prime user-expected filename conventions |
| L20 | **Reconciliation discrepancy alerts** | If a sales event's stored `gstMargin` payload field (PLAN-VEHICLES-003 L4) does not match the recomputed `(salePrice - acquisitionCost - allowableRefurbCosts) × 18/118` within ₹1 tolerance (per L11 line-rounding), render an alert chip on the row with copy "Stored ₹X · Recomputed ₹Y · Diff ₹Z". R22+ can override with a free-text reason via `acknowledgeMarginDiscrepancy(vin, reason, actor)` (audit-logged). The chip persists until acknowledged or until the underlying data changes (cost-ledger entry edited, e.g.). | PLAN-VEHICLES-003 L4; Doc 06 §reconciliation |
| L21 | **TCS threshold visual progression** | Per-PAN per-FY cumulative: `< ₹6L` = no chip, `₹6L–₹8L` = neutral chip ("Approaching threshold"), `₹8L–₹10L` = amber chip ("≥ 80% of threshold — TCS may apply on next sale"), `≥ ₹10L` = red chip ("Threshold breached — TCS applies on all subsequent sales this FY"). Thresholds are in finance-core constants and **not** configurable in v1 (regulatory hardcoded). | Doc 06 §TCS; UX progressive-disclosure pattern |
| L22 | **Vendor invoice approval is non-reversible without R22+ acknowledgement** | Once a vendor invoice is `approved` (by R12+), the only paths forward are `paid` (R22+ marks payment) or `disputed` (any approver+ flags an issue → reverts to `pending` with reason). There is no quiet "un-approve" — every state change is audit-logged with actor + ISO timestamp + reason where applicable. | Doc 06 §AP-controls; SOX-style separation-of-duties parallel |
| L23 | **GST input credit eligibility flag is per-invoice + per-line** | A vendor invoice carries a top-level `inputCreditEligible: boolean` for the simple case AND, when categories mix on a single invoice, a per-line override array. Default eligibility rules (config-locked): `parts`, `labour`, `consumable` = eligible; `commission` = NOT eligible (insurance commission output is exempt-supply downstream); `consignment-payout` = NOT eligible (no GST charged on consignor margin per Doc 06 §consignment-tax). R12+ can override the default per-invoice with a reason. | Doc 06 §input-tax-credit |
| L24 | **Period change does not trigger any write** | Setting period via `setPeriod({fyStart, fyEnd, month?})` is a pure local-state update on the finance-store. No event is appended. No upstream selector is mutated. The URL hash is updated for shareable deep-links (e.g. `/finance/gst#period=FY26-Q1&outlet=BLR`). Refresh of the URL hash restores the period without re-running the selector until consumer components re-mount. | CLAUDE.md §17; URL-as-state pattern |
| L25 | **HSN/SAC codes** | Pre-owned vehicles use HSN 8703 (motor vehicles for transport of persons; sub-chapter varies by engine cc). Service labour uses SAC 998729 (maintenance and repair of motor vehicles). Insurance commission uses SAC 997131 (insurance auxiliary services). Consumables vary; Finance derives the HSN/SAC from the originating module's invoice payload — Finance does NOT classify HSN itself. Missing HSN on an invoice line renders an alert chip and is excluded from journal export until resolved. | Doc 06 §HSN; CBIC HSN/SAC schedule 2024 |
| L26 | **Audit log retention** | Every finance-store mutation (`approveVendorInvoice`, `markVendorInvoicePaid`, `disputeVendorInvoice`, `acknowledgeMarginDiscrepancy`, `exportJournalCSV`) appends a `FinanceAuditEvent` to a per-module audit stream. v1 stores audit events in-memory + localStorage; v2 persists to backend. Audit events are visible at `/finance/audit` (R22+) and are **never** mutable. Append-only invariant enforced at the slice level. | Doc 06 §audit-trail; CLAUDE.md §17 |
| L27 | **Cross-outlet scope** | R12 sees their own outlet only by default. R19+ (GM) and R22+ (CFO) can switch to "All outlets" via the outlet scope picker. The picker is hidden for R12 (only their outlet is shown). Outlet scope is part of period state and participates in URL hash for deep-links. | Doc 14 §R12, §R19, §R22; PLAN-VEHICLES-002 §RLS-default-city-scope |
| L28 | **Banker's-rounding consistency check at export** | Before the journal CSV is downloaded, finance-core runs a sanity assertion: sum of all debit rows == sum of all credit rows for every voucher. If any voucher fails (rounding accumulated to break double-entry), the export is **blocked** with a toast: "Voucher #VR-12345 imbalanced by ₹0.50 — contact engineering." This catches rounding drift before it lands in Tally. | Doc 06 §double-entry; SOX-style integrity check |
| L29 | **Outlet GSTIN sourced from Settings** | Each outlet has a unique GSTIN (BLR `29XXXXX1234X1Z5`, MUM `27XXXXX1234X1Z5`, CHE `33XXXXX1234X1Z5`). Tally export `gstinParty` field for outlet-side vouchers reads from `settings-store.outlets[outletId].gstin` (Settings is A4, may not be shipped before A2 — fallback constants in `apps/staff-web/src/lib/finance/__fixtures__/outlet-gstin-fallback.ts` until Settings ships). | Doc 06 §outlet-gstin; A4 Settings dependency |
| L30 | **Journal export is idempotent + replay-safe** | Re-exporting the same period+scope produces a byte-identical CSV (sort order is canonical: voucher-date asc, voucher-number asc, drCr asc with `Dr` before `Cr`). The accountant can re-download a prior period without fear of producing a different file. v1 stores no export-history record; v2 adds a downloadable export-log under `/finance/audit`. | Doc 06 §replay-safe-export; user-trust requirement |

> **Tag count:** 30 locked decisions (target ≥ 20).

---

## 1. Capability inventory (P1 in-scope)

This section enumerates every capability that ships in P1. P2/P3/P4 capabilities
appear in §2.

### 1.1 GST margin-scheme reconciliation

**Goal:** Every SOLD event in the period must produce a margin row that the
outlet accountant can copy to the GSTR-1 worksheet. The Finance module is the
single screen where they verify per-VIN margin computations.

**P1 capabilities:**

- **Period picker** — FY year + month picker honoring Indian FY (L4). Defaults
  to current FY + current month. Pre-set quick selectors: This Month, Last
  Month, This Quarter, Last Quarter, This FY (YTD), Full Last FY.
- **Outlet scope picker** — single-outlet (R12 only sees their outlet) or
  All-outlets (R19+/R22+). Locked to actor's home outlet for R12 (L27).
- **Margin row table** — one row per SOLD event in the period+scope, columns:
  VIN, customer (PAN last-4), salePrice, acquisitionCost, allowableRefurb,
  computedMargin, computedGst, storedGst (L20 alert if mismatch), reconciled
  status chip.
- **Total liability summary tile** — sum of all `computedGst` for the period;
  also shows the breakdown by margin scheme vs full-value (full-value = service
  invoices, custom-build invoices — those use full-value GST 18% per Doc 06
  §service-invoice).
- **Discrepancy alerts** — per L20 + L25, rows with stored-vs-recomputed
  mismatch OR missing HSN render alert chips.
- **Drill-down** — clicking a row → `/finance/gst/[vin]` → `MarginBreakdownCard`
  (per L16) showing every cost-ledger line that contributed.
- **Reconciliation status mark** — R22+ can mark a row `reconciled` with
  optional notes (`markMarginRowReconciled(vin, eventId, notes, actor)` — L26
  audit logged). Reconciled rows show a green check chip and are excluded
  from the "open items" filter.

**Math source-of-truth (L1, L10):**

```
margin_paise          = max(0, salePrice_paise - acquisitionCost_paise - allowableRefurb_paise)
gstAmount_paise       = round_per_line(margin_paise * 18 / 118)
```

Where `allowableRefurb_paise` = sum of cost-ledger entries tagged
`isAllowableRefurb: true` for the VIN, **before** the SOLD event's timestamp.
Disallowed costs (e.g. transit insurance premium beyond a threshold) are
documented in `apps/staff-web/src/lib/finance/math/allowable-refurb-rules.ts`
with citation to Doc 06 §allowable-refurb.

### 1.2 TCS register (Income Tax Act §206C(1F))

**Goal:** Show every customer's cumulative purchase value in the FY, flag those
near or over ₹10L, and surface waivers separately.

**P1 capabilities:**

- **Per-PAN cumulative table** — columns: customer (name + PAN last-4),
  cumulativePurchase (FY-to-date), threshold-status chip (per L21),
  tcsCollectedTotal, salesCount, lastSaleAt.
- **Threshold filter chips** — All / Approaching (≥ 80%) / Breached (≥ 100%) /
  Waived. Defaults to "All".
- **Drill-down per PAN** — click a row → side-panel listing every sales event
  for that PAN in the FY, each with: VIN, saleDate, invoiceValue, tcsApplied
  (₹ amount or "waived"), waiverReason (if any).
- **Waivers tab** — separate tab showing every sales event with
  `tcsWaived: true`. Columns: VIN, saleDate, customer, invoiceValue,
  waivedReason, waivedBy (R12+ approver name from event payload).
- **TCS deposit schedule view** — quarterly cumulative TCS collected, with
  due-by date per IT Act (TCS deposit due by 7th of the next month for the
  collection month; quarterly summary view aggregates this). v1 shows
  computed totals; manual deposit-receipt upload is deferred (DEF-FIN-3).

**Math source-of-truth (L2):**

```
cumulativePurchase_paise(pan, fy)   = sum(salesEvent.invoiceValue_paise where event.customerPan == pan and fy(event.timestamp) == fy)
tcsApplied_paise(salesEvent)        = (cumulativePurchase_paise > 1_000_000_00) && !tcsWaived ? round(salesEvent.invoiceValue_paise * 1 / 100) : 0
```

Note: TCS is on `invoiceValue` (sale value including GST per Doc 06 §TCS), not
on the margin. This is a distinct money flow from L1.

### 1.3 Vendor invoice tracking

**Goal:** Track every non-staff payable from initial entry through approval,
payment, and Tally journaling.

**P1 capabilities:**

- **Invoice list view** — `/finance/vendor-invoices`. Columns: invoiceNo,
  vendor, category (5 values per L17), gstinValid, amount, gstAmount,
  inputCreditEligible, status, raisedAt, dueAt. Filter chips: status, category,
  outlet, dateRange.
- **Invoice detail view** — `/finance/vendor-invoices/[id]`. Renders a
  category-specific template (5 templates — see §6.6). Shows audit timeline
  (raised → approved → paid).
- **Approve action** — `approveVendorInvoice(invoiceId, actor)` (R12+, L8).
  Audit logged.
- **Mark paid action** — `markVendorInvoicePaid(invoiceId, paymentRef, actor)`
  (R22+, L8). Captures `paymentRef` (cheque no, NEFT UTR, RTGS ref). Audit
  logged.
- **Dispute action** — `disputeVendorInvoice(invoiceId, reason, actor)` (R12+).
  Reverts status to `pending` per L22. Audit logged.
- **GSTIN format validation** — on entry per L6.
- **Input credit eligibility** — auto-defaulted per L23; R12+ override w/
  reason.

### 1.4 Customer ledger

**Goal:** Per-customer running outstanding balance; outstanding > 30d / > 60d
flagged for follow-up.

**P1 capabilities:**

- **Outstanding list view** — `/finance/customer-ledger`. Columns: customer
  name (PAN last-4), totalOutstanding, oldestUnpaidAgeDays, lastPaymentAt,
  agingChip (per L7). Default sort: oldestUnpaidAgeDays desc.
- **Aging filter** — All / 0–30 / 31–60 / 61+ chips.
- **Drill-down per customer** — `/finance/customer-ledger/[customerId]`. Shows
  three streams interleaved (per L18): vehicle-sale invoices, service ROs,
  custom-build invoices. Plus payment events (mock fixture in v1). Running
  balance column updates row-by-row.
- **Send reminder CTA** — surfaces a "Send WhatsApp reminder" button (uses
  Notifications module — A3 dependency. v1 stub: console.info + toast "Coming
  in v1.1" if Notifications not shipped).

### 1.5 Journal entry preview + Tally CSV export

**Goal:** Every monetary event in the period renders as a debit/credit pair
ready for Tally Prime monthly upload.

**P1 capabilities:**

- **Journal preview view** — `/finance/journal`. R22+ only (L8, L12). Period
  picker honored. Renders all events as `JournalEntry[]` rows: voucherDate,
  voucherType, voucherNumber, ledgerLegs (collapsible), narration, totalDebit,
  totalCredit (must match per L28).
- **Voucher type breakdown tiles** — counts of Sales, Receipt, Purchase,
  Payment, Journal vouchers in the period.
- **Export CSV button** — calls `exportJournalCSV(period, scope)` per L9 + L19
  + L30. Downloads via Blob. Audit logged.
- **Pre-export sanity check** — L28 enforced; export blocked on imbalance.
- **Re-export warning** — toast "This period has been exported before on
  YYYY-MM-DD by R22-X. Continue?" if a prior export-audit-event exists for
  the same period+scope.

---

## 2. Capabilities deferred (P2/P3/P4/v2)

| ID | Item | Phase | Notes / spec ref |
|---|---|---|---|
| DEF-FIN-1 | GSTR-1 / GSTR-3B return preparation | P4 | Theme D D1 — depends on Finance reconciliation primitives shipped here |
| DEF-FIN-2 | R12 "Request margin override" task creation | P3 | L16; depends on a tasks/inbox module not yet specified |
| DEF-FIN-3 | TCS deposit-receipt upload + manual reconcile | P3 | Doc 06 §TCS-deposit; documents-module integration |
| DEF-FIN-4 | E-invoicing IRN+QR fetch (mocked IRP, retry policy) | P4 | Theme D D2 — Doc 13 §3 |
| DEF-FIN-5 | Live Tally Prime sync (replaces CSV upload) | v2 | L5; backend phase |
| DEF-FIN-6 | Multi-currency | v2 | INR-only per BN India operations |
| DEF-FIN-7 | Live GSTIN verification against GSTN portal | v2 | L6; v1 is regex format check only |
| DEF-FIN-8 | Insurance commission auto-create vendor invoice | P3 | SPEC-INSURANCE-001 §commission-payouts wiring |
| DEF-FIN-9 | Custom-builds vendor invoice auto-create on milestone-payment | P3 | SPEC-CUSTOM-BUILDS-001 §vendor-payment hooks |
| DEF-FIN-10 | Per-outlet aging threshold config UI | P2 | L7; A4 Settings dependency |
| DEF-FIN-11 | Reports module finance KPI tiles (P&L, GST liability trend) | P2 | A1 Reports dependency |
| DEF-FIN-12 | Service-RO outstanding integration | P2 | L18; service-store payment-events extension |
| DEF-FIN-13 | Audit-event search + filter UI | P3 | L26 surfaces append; rich UI deferred |
| DEF-FIN-14 | Bulk vendor-invoice CSV import | P3 | UX nice-to-have; fixture-driven for now |

---

## 3. Route surface

| Route | Purpose | Gate |
|---|---|---|
| `/finance` | Hub — KPI tiles (period GST liability, outstanding receivables, vendor-invoices pending count, TCS at-risk count) + module nav grid | R12+ |
| `/finance/gst` | GST margin reconciliation table | R12 (own outlet); R19+/R22+ all-outlets |
| `/finance/gst/[vin]` | Per-VIN margin breakdown drill-down | same as parent (R12+ for own-outlet VIN; R19+/R22+ any) |
| `/finance/tcs` | TCS register: cumulative + waivers tab + deposit schedule | R12+ |
| `/finance/tcs/[customerId]` | Per-customer TCS detail (side-panel pattern in v1; full route in v1.1) | R12+ |
| `/finance/vendor-invoices` | Vendor payables list + filters | R12+ |
| `/finance/vendor-invoices/new` | Create vendor invoice form (5-template per L17) | R12+ |
| `/finance/vendor-invoices/[id]` | Vendor invoice detail + actions | R12+ (view), R12+ (approve), R22+ (mark paid) |
| `/finance/customer-ledger` | Customer outstanding list | R12+ |
| `/finance/customer-ledger/[customerId]` | Per-customer drill-down (3-source timeline) | R12+ |
| `/finance/journal` | Journal entry preview + Tally CSV export | R22+ |
| `/finance/audit` | Append-only finance audit log | R22+ |

**Sidebar:** insert "Finance" entry **after Insurance** in `staff-sidebar.tsx`.
Icon: `Receipt` from lucide-react. Visible to `R12+` via `Gate role={['R12'...]}`.

All routes are `'use client'` client components consistent with vehicles +
insurance + custom-builds.

---

## 4. Store contract

The finance-store is a **thin** Zustand slice. It holds period state, outlet
scope, vendor-invoice records, finance-audit events, and pure selectors that
read upstream stores on demand.

File: `apps/staff-web/src/lib/finance/finance-store/index.ts`.

### 4.1 State shape

```ts
type FinanceStoreState = {
  // Period state (L24 — local only, no upstream writes)
  period: { fyStart: string; fyEnd: string; month?: number };  // ISO dates
  outletScope: 'BLR' | 'MUM' | 'CHE' | 'ALL';

  // Vendor invoices (the only finance-owned entity)
  vendorInvoices: Record<string, VendorInvoice>;

  // Finance audit stream (append-only, L26)
  auditEvents: FinanceAuditEvent[];

  // Reconciliation acknowledgements (L20)
  marginDiscrepancyAcks: Record<string, { reason: string; actorId: string; ackedAt: string }>;

  // Margin reconciliation marks (1.1)
  marginRowReconciliations: Record<string, { notes?: string; reconciledBy: string; reconciledAt: string }>;
    // key = `${vin}:${eventId}`
};
```

### 4.2 Actions

| Action | Signature | Role gate | Audit |
|---|---|---|---|
| `setPeriod` | `({fyStart, fyEnd, month?}) => void` | any (R12+) | no |
| `setOutletScope` | `(scope) => void` | R12 own-only; R19+ any | no |
| `createVendorInvoice` | `(invoice: VendorInvoiceDraft, actor) => string \| Error` | R12+ | yes |
| `approveVendorInvoice` | `(invoiceId, actor) => void` | R12+ | yes |
| `markVendorInvoicePaid` | `(invoiceId, paymentRef, actor) => void` | R22+ | yes |
| `disputeVendorInvoice` | `(invoiceId, reason, actor) => void` | R12+ | yes |
| `acknowledgeMarginDiscrepancy` | `(vin, eventId, reason, actor) => void` | R22+ | yes |
| `markMarginRowReconciled` | `(vin, eventId, notes, actor) => void` | R22+ | yes |
| `exportJournalCSV` | `(period, scope) => { csv: string; filename: string }` | R22+ | yes |
| `getMarginReconciliation` | `(period, scope) => MarginReconciliationRow[]` | R12+ pure selector | no |
| `getTcsRegister` | `(period, scope) => TcsRegisterRow[]` | R12+ pure selector | no |
| `getCustomerLedger` | `(scope) => CustomerLedgerEntry[]` | R12+ pure selector | no |
| `getVendorInvoiceList` | `(period, scope, filters?) => VendorInvoice[]` | R12+ pure selector | no |
| `getJournalEntries` | `(period, scope) => JournalEntry[]` | R22+ pure selector | no |
| `getFinanceAuditLog` | `(period?, scope?, filters?) => FinanceAuditEvent[]` | R22+ pure selector | no |

### 4.3 Selector implementation pattern

Selectors NEVER mutate. Each pulls from upstream stores via `getState()`:

```ts
// pseudocode
function getMarginReconciliation(period, scope) {
  const sales = useSalesEventsSlice.getState().getSoldEventsInPeriod(period, scope);
  const costLedger = useCostLedgerSlice.getState();
  const vehicles = useVehiclesStore.getState();

  return sales.map((event) => {
    const vehicle = vehicles.vehicles[event.vin];
    const refurb = costLedger.getAllowableRefurbForVin(event.vin, event.timestamp);
    const margin = computeMargin({ salePrice: event.salePrice, acquisitionCost: vehicle.acquisitionCost, allowableRefurb: refurb });
    const gstComputed = computeGstFromMargin(margin);  // L1 finance-core
    return {
      vin: event.vin,
      customerPanLast4: maskPan(event.customerPan),  // L13
      salePrice: event.salePrice,
      acquisitionCost: vehicle.acquisitionCost,
      allowableRefurb: refurb,
      computedMargin: margin,
      computedGst: gstComputed,
      storedGst: event.gstMargin,
      discrepancy: Math.abs(gstComputed - event.gstMargin) > ROUNDING_TOLERANCE_PAISE,
      reconciliationStatus: marginRowReconciliations[`${event.vin}:${event.id}`] ? 'reconciled' : 'open',
    };
  });
}
```

**No selector subscribes to upstream stores reactively** — they read on demand
when called. This avoids the Zustand-cross-store subscription anti-pattern
documented in CLAUDE.md.

---

## 5. Domain model

File: `packages/types/src/domain/finance.ts`.

### 5.1 `VendorInvoice`

```ts
export const VendorInvoiceCategoryEnum = z.enum([
  'parts',
  'labour',
  'commission',
  'consumable',
  'consignment-payout',
]);
export type VendorInvoiceCategory = z.infer<typeof VendorInvoiceCategoryEnum>;

export const VendorInvoiceStatusEnum = z.enum([
  'pending',
  'approved',
  'paid',
  'disputed',
]);
export type VendorInvoiceStatus = z.infer<typeof VendorInvoiceStatusEnum>;

export const VendorInvoiceLineSchema = z.object({
  description: z.string(),
  hsnSac: z.string().optional(),                  // L25 — required for journal export
  quantity: z.number().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  gstRatePct: z.number().min(0).max(28),         // 0/5/12/18/28
  gstAmountPaise: z.number().int().nonnegative(),
  lineTotalPaise: z.number().int().nonnegative(),
  inputCreditEligible: z.boolean(),               // L23 per-line override
});

export const VendorInvoiceSchema = z.object({
  id: z.string().ulid(),
  invoiceNumber: z.string().min(1),               // vendor's invoice number
  vendorName: z.string(),
  vendorGstin: z.string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/),  // L6
  vendorPan: z.string().length(10).optional(),    // L13 — public business data
  category: VendorInvoiceCategoryEnum,
  outletId: z.enum(['BLR', 'MUM', 'CHE']),
  raisedAt: z.string().datetime(),                // ISO
  dueAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  paymentRef: z.string().optional(),              // cheque/NEFT/RTGS ref
  lines: z.array(VendorInvoiceLineSchema),
  totalAmountPaise: z.number().int().nonnegative(),
  totalGstPaise: z.number().int().nonnegative(),
  inputCreditEligible: z.boolean(),               // L23 top-level default
  inputCreditEligibilityReason: z.string().optional(), // when overridden from default
  status: VendorInvoiceStatusEnum,
  approvedBy: z.string().optional(),              // staffId
  approvedAt: z.string().datetime().optional(),
  paidBy: z.string().optional(),                  // staffId
  disputeReason: z.string().optional(),
  // Cross-module linkage (DEF-FIN-8/9)
  linkedJobCardId: z.string().optional(),         // for category=labour from service
  linkedBuildJobId: z.string().optional(),        // for category=parts from custom-builds
  linkedInsuranceLeadId: z.string().optional(),   // for category=commission from insurance
  linkedConsignmentVin: z.string().optional(),    // for category=consignment-payout
});
export type VendorInvoice = z.infer<typeof VendorInvoiceSchema>;
```

### 5.2 `MarginReconciliationRow` (computed, not persisted)

```ts
export type MarginReconciliationRow = {
  vin: string;
  saleEventId: string;
  saleDate: string;                  // ISO
  customerName: string;
  customerPanLast4: string;          // L13
  outletId: 'BLR' | 'MUM' | 'CHE';
  salePricePaise: number;
  acquisitionCostPaise: number;
  allowableRefurbPaise: number;
  computedMarginPaise: number;       // L1
  computedGstPaise: number;          // L1
  storedGstPaise: number | null;     // from sales-event payload
  discrepancyDetected: boolean;      // L20 (> ₹1 diff)
  hsnMissing: boolean;               // L25
  reconciliationStatus: 'open' | 'reconciled';
  reconciledBy?: string;
  reconciledAt?: string;
};
```

### 5.3 `TcsRegisterRow` (computed)

```ts
export type TcsThresholdState = 'safe' | 'approaching' | 'near' | 'breached';
// L21: safe < ₹6L, approaching ₹6L–₹8L, near ₹8L–₹10L, breached ≥ ₹10L

export type TcsRegisterRow = {
  customerId: string;
  customerName: string;
  customerPanLast4: string;          // L13
  fy: string;                        // 'FY26'
  cumulativePurchasePaise: number;
  thresholdState: TcsThresholdState;
  tcsCollectedTotalPaise: number;
  salesCount: number;
  waivedSalesCount: number;
  lastSaleAt: string;                // ISO
  events: Array<{
    eventId: string;
    vin: string;
    saleDate: string;
    invoiceValuePaise: number;
    tcsAppliedPaise: number;
    tcsWaived: boolean;
    tcsWaivedReason?: string;
    tcsWaivedBy?: string;
  }>;
};
```

### 5.4 `CustomerLedgerEntry` (computed)

```ts
export type CustomerLedgerEntry = {
  customerId: string;
  customerName: string;
  customerPanLast4: string;
  totalOutstandingPaise: number;
  oldestUnpaidAgeDays: number;
  agingState: 'green' | 'amber' | 'red';     // L7
  lastPaymentAt: string | null;
  rows: Array<{
    sourceModule: 'sales' | 'service' | 'custom-builds';
    sourceId: string;                        // SO id, RO id, build job id
    issuedAt: string;
    amountPaise: number;
    paidAmountPaise: number;
    outstandingPaise: number;
    ageDays: number;
    description: string;
  }>;
};
```

### 5.5 `JournalEntry` (computed)

```ts
export type JournalDrCr = 'Dr' | 'Cr';

export type JournalLeg = {
  ledgerName: string;          // e.g. 'Sales A/c — Pre-owned (BLR)'
  drCr: JournalDrCr;
  amountPaise: number;
  costCenter?: string;         // outlet code
  gstinParty?: string;         // L29
  hsnSac?: string;             // L25
  gstRatePct?: number;
  gstAmountPaise?: number;
};

export type JournalEntry = {
  voucherNumber: string;       // 'VR-2026-04-00012'
  voucherDate: string;         // ISO date (no time component for vouchers)
  voucherType: 'Sales' | 'Receipt' | 'Purchase' | 'Payment' | 'Journal';
  narration: string;
  legs: JournalLeg[];          // must balance (L28)
  sourceEvent: {
    module: 'sales' | 'service' | 'custom-builds' | 'payroll' | 'vendor-invoice';
    eventId: string;
  };
};
```

### 5.6 `FinanceAuditEvent`

```ts
export type FinanceAuditEventKind =
  | 'VENDOR_INVOICE_CREATED'
  | 'VENDOR_INVOICE_APPROVED'
  | 'VENDOR_INVOICE_PAID'
  | 'VENDOR_INVOICE_DISPUTED'
  | 'MARGIN_DISCREPANCY_ACK'
  | 'MARGIN_ROW_RECONCILED'
  | 'JOURNAL_EXPORTED';

export type FinanceAuditEvent = {
  id: string;                  // ULID
  kind: FinanceAuditEventKind;
  timestamp: string;           // ISO
  actorId: string;
  actorRole: string;           // R12, R22, etc. — captured at event time
  outletScope: string;
  payload: Record<string, unknown>;  // shape per kind, validated by per-kind Zod schema
};
```

> **Entity count:** 6 new persisted/computed entities + 5 supporting enums (target ≥ 5).

---

## 6. Detailed designs (selected)

### 6.1 Hub layout (`/finance`)

Card grid per `SPEC-ARCH-UI-001` §StatTile:

- Tile 1: GST liability this month (₹X.XL) + sub-line "FY26 Q1 cumulative ₹Y.YL"
- Tile 2: Outstanding receivables (₹X.XL across N customers) + amber/red split
- Tile 3: Vendor invoices pending approval (N) + total ₹X.XL
- Tile 4: TCS at-risk customers (N approaching, M breached this FY)
- Tile 5: Last journal export (date + by whom; "Never exported" empty state)
- Tile 6: Discrepancies open (N margin rows + M HSN-missing lines)

Below tiles: 2x2 module-nav grid linking to GST / TCS / Vendor Invoices /
Customer Ledger / Journal. Journal tile is gated to R22+ (renders disabled
state with lock icon for R12).

### 6.2 GST view (`/finance/gst`)

Filters bar: period picker, outlet scope, status (all / open / reconciled /
discrepancy / hsn-missing). Sticky.

Table: 12 columns max; last column is "Open →" arrow per
`SPEC-ARCH-UI-001` §Table conventions. Mobile breakpoint: collapse to card
list (vehicles-tab pattern).

Bulk actions row: "Mark reconciled" (R22+, multi-select), "Export filtered to
CSV" (subset of journal CSV scoped to GST vouchers only).

### 6.3 GST drill-down (`/finance/gst/[vin]`)

`MarginBreakdownCard`:

```
┌─────────────────────────────────────────────────┐
│ MH12CD3456 · BMW 5 Series 530i M Sport · 2022  │
│ Sale event: SO-2026-0412 · 14 Apr 2026         │
├─────────────────────────────────────────────────┤
│ Sale price                          ₹85,00,000  │
│ — Acquisition cost                  ₹65,00,000  │
│ — Allowable refurb (4 lines)         ₹2,40,000  │
│   ├ Detailing — labour (CL-291)       ₹40,000   │
│   ├ Tyre replacement — parts (CL-294) ₹85,000   │
│   ├ Detailing — parts (CL-295)        ₹35,000   │
│   └ Body paint correction (CL-302)    ₹80,000   │
├─────────────────────────────────────────────────┤
│ = Margin                            ₹17,60,000  │
│ × 18 / 118                                       │
│ = GST liability                      ₹2,68,475  │
├─────────────────────────────────────────────────┤
│ Stored on event: ₹2,68,500                       │
│ ⚠ Discrepancy: +₹25 (line-rounding diff)         │
│ [Acknowledge] (R22+)                             │
└─────────────────────────────────────────────────┘
```

R22+ "Acknowledge" opens a dialog: required reason field, audit-logged write
of `acknowledgeMarginDiscrepancy(vin, eventId, reason, actor)`.

### 6.4 TCS register layout

Two tabs at top: "Cumulative" (default), "Waivers", "Deposit schedule".

Cumulative tab table columns: Customer (PAN last-4), FY-to-date purchase,
threshold chip (per L21 4-state), TCS collected, # sales, last sale at.
Default sort: cumulativePurchase desc.

Click row → side panel listing all events for that PAN in the FY (per §1.2).

### 6.5 Vendor invoice templates (per L17 — 5 templates)

| Category | Template specifics |
|---|---|
| `parts` | Line items have `hsnSac` mandatory + part code optional; default eligible |
| `labour` | Line items free-text description, SAC default = 998729; default eligible |
| `commission` | Single line per insurance lead settled; SAC = 997131; **NOT eligible** for input credit (L23); links `linkedInsuranceLeadId` |
| `consumable` | Same as `parts` but vendor type chip = 'consumable supplier' |
| `consignment-payout` | Single line; HSN derived from VIN (8703 sub-chapter); NOT GST-bearing in itself (consignor margin is exempt-supply per Doc 06 §consignment); `linkedConsignmentVin` mandatory |

### 6.6 Tally CSV ledger mapping

| Event type | Voucher type | Ledger legs |
|---|---|---|
| Vehicle SOLD (margin scheme) | `Sales` | Dr: Cash/Bank/Receivable, Cr: Sales A/c — Pre-owned (outlet), Cr: Output GST 18% (margin), Cr: TCS Payable (if applicable) |
| Vehicle SOLD (full-value, e.g. demo car as new) | `Sales` | Dr: Cash/Bank, Cr: Sales A/c — Demo, Cr: Output CGST 9%, Cr: Output SGST 9% (or Output IGST 18% if cross-state) |
| Service RO invoiced | `Sales` | Dr: Receivable, Cr: Service Income, Cr: Output CGST 9%, Cr: Output SGST 9% |
| Custom-build invoice | `Sales` | Dr: Receivable, Cr: Custom Build Income, Cr: Output GST 18% |
| Vendor invoice (parts) `paid` | `Payment` | Dr: Inventory or Workshop Consumables, Dr: Input GST 18% (if eligible), Cr: Bank |
| Vendor invoice (commission) `paid` | `Payment` | Dr: Insurance Commission Earned (contra), Cr: Bank — input GST not claimed |
| Vendor invoice (consignment-payout) `paid` | `Payment` | Dr: Consignor Settlement A/c, Cr: Bank |
| Payroll run | `Journal` | Dr: Salaries Expense, Cr: PF Payable, Cr: ESIC Payable, Cr: PT Payable, Cr: TDS Payable, Cr: Bank (net pay) — per Doc 06 §payroll |
| Customer payment received | `Receipt` | Dr: Bank, Cr: Receivable (specific customer ledger) |

Ledger names use the canonical Tally Prime account naming convention
(`Sales A/c — Pre-owned (BLR)` etc.). Full mapping table in
`apps/staff-web/src/lib/finance/journal/ledger-mapping.ts`.

### 6.7 Banker's rounding + double-entry check (L11, L28)

```ts
// pseudocode
function assertVoucherBalanced(legs: JournalLeg[]): void {
  const totalDr = legs.filter(l => l.drCr === 'Dr').reduce((s, l) => s + l.amountPaise, 0);
  const totalCr = legs.filter(l => l.drCr === 'Cr').reduce((s, l) => s + l.amountPaise, 0);
  if (totalDr !== totalCr) {
    throw new VoucherImbalancedError(`Imbalanced by ${(totalDr - totalCr) / 100} INR`);
  }
}
// exportJournalCSV asserts every voucher before serializing the row.
```

Caught errors are surfaced to the user as a toast + an audit-event of kind
`JOURNAL_EXPORT_BLOCKED` (added to the audit kinds enum in P2).

---

## 7. Scenarios (S-F-1 through S-F-20)

GPA format: **G**iven (preconditions), **W**hen (action), **T**hen (assertions).

### S-F-1 — R22 reconciliation walkthrough (happy path)

**Given:**
- R22 (CFO) is logged in, home outlet BLR
- FY26-Q1 has 12 SOLD events at BLR; 2 at MUM; 1 at CHE
- All 15 events have valid `gstMargin` payload matching recomputed value within ₹1

**When:**
- R22 navigates to `/finance/gst`
- Sets period = FY26-Q1, outlet scope = ALL

**Then:**
- Table renders 15 rows, sorted by saleDate desc
- Total liability tile shows sum of all 15 `computedGstPaise` rendered as ₹X.XL
- Zero discrepancy chips visible
- "Open" filter shows all 15; "Reconciled" shows 0
- R22 multi-selects 5 rows + clicks "Mark reconciled" → dialog opens, optional notes, confirm
- After confirm: 5 rows show green check chip, audit log gains 5 `MARGIN_ROW_RECONCILED` events
- Toast "5 rows reconciled by R22-X"

### S-F-2 — Discrepancy detected + R22 acknowledgement

**Given:**
- A SOLD event at BLR has `gstMargin: 26850000` (paise) stored
- Recomputed margin × 18/118 = 26847500 paise (₹25 difference, > ₹1 tolerance)

**When:**
- R22 opens `/finance/gst` for FY26-Q1
- Row renders with amber discrepancy chip

**Then:**
- Chip copy: "Stored ₹2,68,500 · Recomputed ₹2,68,475 · Diff +₹25"
- R22 clicks the row → drill-down `/finance/gst/[vin]`
- Drill-down shows the breakdown with discrepancy section visible
- R22 clicks "Acknowledge" → reason dialog (required, ≥ 10 chars)
- R22 enters reason: "Line-rounding accumulated drift; accepted"
- After confirm: chip changes to grey "Acknowledged by R22-X · 27 Apr 2026"
- Audit log gains `MARGIN_DISCREPANCY_ACK` event with reason

### S-F-3 — R12 attempts mark-paid (rejected)

**Given:**
- R12 (Finance Manager, BLR) is logged in
- Vendor invoice `VI-001` is in `approved` status

**When:**
- R12 navigates to `/finance/vendor-invoices/VI-001`

**Then:**
- "Approve" CTA is disabled (already approved)
- "Mark paid" CTA renders disabled with tooltip "R22+ required"
- "Dispute" CTA is enabled
- R12 clicks "Mark paid" via keyboard accelerator → no-op (button is `aria-disabled`)
- No audit event written
- Toast NOT shown (no action attempted; per L8 fail-silent on disabled)

### S-F-4 — TCS threshold breach + auto-applied on next sale

**Given:**
- Customer `cust-jp-mehta` has cumulative FY26 purchase ₹9,80,000 across 1 prior sale
- A new SOLD event lands for ₹3,00,000 at BLR
- `tcsWaived` is `false` on the new event

**When:**
- R22 opens `/finance/tcs` for FY26

**Then:**
- Row for `cust-jp-mehta` shows cumulative ₹12,80,000 + red "Threshold breached" chip
- TCS collected total = ₹3,000 (1% of ₹3,00,000 only — the breaching sale)
  - Note: prior sale at ₹9,80,000 was sub-threshold so no TCS was collected on it; this matches Doc 06 §TCS policy that TCS only kicks in once threshold is crossed and applies to subsequent sales
- Drill-down side panel lists 2 events; the second has `tcsAppliedPaise: 300000`
- The amber chip from the prior month's report (when cumulative was ₹9,80,000)
  is now superseded by the red chip — consistent across re-renders

### S-F-5 — TCS waiver renders separately

**Given:**
- Customer `cust-rk-iyer` has cumulative FY26 purchase ₹15,00,000 across 1 sale
- That sale has `tcsWaived: true` with `tcsWaivedReason: "Customer is registered NRI; TCS handled separately under §195"` and `tcsWaivedBy: 'staff-r12-blr-2'`

**When:**
- R22 opens `/finance/tcs` and switches to "Waivers" tab

**Then:**
- Cumulative tab shows `cust-rk-iyer` row with TCS collected ₹0 (despite over threshold) and a "Waived" chip in the threshold column
- Waivers tab shows a row: VIN + saleDate + invoiceValue ₹15L + waivedReason text + waivedBy "Anita Sharma (R12)"
- Cumulative purchase on row still shows ₹15,00,000 (purchase happened; TCS just not collected)
- Audit cross-check: `tcsCollectedTotalPaise` for this customer = 0; `cumulativePurchasePaise` = 1500000 * 100

### S-F-6 — Journal CSV export (happy path)

**Given:**
- R22 is logged in
- FY26-M07 (Oct 2025) has: 8 SOLD events, 12 service RO invoices, 4 custom-build invoices, 6 vendor invoices marked paid in the period, 1 payroll run
- All vouchers balance per L28 sanity check

**When:**
- R22 navigates to `/finance/journal`
- Sets period = FY26-M07, scope = BLR
- Clicks "Export CSV"

**Then:**
- CSV download triggers: filename `BN_BLR_FY26-M07_journal.csv`
- CSV starts with the L9 header row exactly
- Voucher count = 31 (8 + 12 + 4 + 6 + 1)
- Each voucher's Dr legs sum equals Cr legs sum (asserted per L28)
- Audit log gains a `JOURNAL_EXPORTED` event with payload {period, scope, voucherCount: 31, csvByteLength: N, exportedBy: 'staff-r22-blr-1'}
- Toast: "Exported 31 vouchers · BN_BLR_FY26-M07_journal.csv"

### S-F-7 — GSTIN format validation rejects invalid

**Given:**
- R12 is on `/finance/vendor-invoices/new`
- Form is filled with vendor name + outlet + 1 line + amounts

**When:**
- R12 enters GSTIN `29ABCDE1234F1Z` (14 chars — invalid)
- R12 attempts to submit

**Then:**
- Submit is blocked at form-validation step
- Inline error under GSTIN field: "Invalid GSTIN format" (i18n key `finance.vendorInvoice.errors.gstinInvalidFormat`)
- No invoice created; no audit event written
- R12 corrects to `29ABCDE1234F1Z5` (15 chars valid) → submit succeeds → audit `VENDOR_INVOICE_CREATED` written

### S-F-8 — Customer ledger > 60d red chip + drill-down

**Given:**
- Customer `cust-vk-patil` has 1 sales-invoice (₹78L, issued 2026-02-10, unpaid), 2 service ROs (one paid, one unpaid 2026-03-12 ₹42,000), 0 custom-builds
- Today is 2026-04-29

**When:**
- R12 opens `/finance/customer-ledger`

**Then:**
- Row for `cust-vk-patil` shows totalOutstanding ₹78,42,000
- oldestUnpaidAgeDays = 78 (Feb 10 to Apr 29)
- Red aging chip
- R12 clicks row → drill-down
- Three streams visible interleaved chronologically:
  - 2026-02-10 · Vehicle invoice · MH12AA1234 · ₹78,00,000 · Outstanding ₹78,00,000 · 78 days
  - 2026-03-12 · Service RO · RO-1234 · ₹42,000 · Outstanding ₹42,000 · 48 days
- Running balance column at far right
- "Send WhatsApp reminder" CTA visible (R12+); v1 click → toast "Coming in v1.1 with Notifications module"

### S-F-9 — Vendor invoice approval round-trip

**Given:**
- R12 created `VI-002` (parts category, ₹1,20,000) — status `pending`

**When:**
- R12 opens `/finance/vendor-invoices/VI-002`
- R12 clicks "Approve" → confirmation dialog → confirm

**Then:**
- Status flips to `approved`
- `approvedBy` = staffId, `approvedAt` = ISO now
- Audit `VENDOR_INVOICE_APPROVED` written
- Toast "VI-002 approved"
- "Approve" CTA replaced by "Mark paid" (disabled for R12, enabled for R22+)

### S-F-10 — Period state is URL-shareable

**Given:**
- R22 navigates to `/finance/gst`

**When:**
- R22 sets period = FY26-Q2, outlet scope = MUM
- URL updates to `/finance/gst#period=FY26-Q2&outlet=MUM`
- R22 copies URL, opens new tab, pastes

**Then:**
- New tab renders the same view: period FY26-Q2, scope MUM, same row count
- Per L24 — no upstream stores were mutated
- Selectors run on demand on mount

### S-F-11 — Empty period rendering

**Given:**
- FY26-M02 (May 2025) has zero SOLD events at CHE

**When:**
- R22 navigates to `/finance/gst`, period = FY26-M02, scope = CHE

**Then:**
- Total liability tile shows `—` (em-dash, NOT `₹0`)
- Table renders empty state: illustration + copy "No vehicle sales at Chennai in May 2025"
- "Export filtered" button is disabled
- Per L15

### S-F-12 — R10 cannot reach finance routes

**Given:**
- R10 (Sales Advisor) is logged in

**When:**
- R10 manually types `/finance` in the address bar

**Then:**
- Server route returns 403 (or client gate redirects)
- User lands on `/dashboard`
- Sidebar: "Finance" entry was already hidden; no breadcrumb or toast (silent redirect; per L12)
- Audit: a single `unauthorized_access_attempt` event is written by the auth layer (out of finance audit scope)

### S-F-13 — Discrepancy chip dismissed after upstream fix

**Given:**
- Row for VIN `KA01XX0001` shows discrepancy chip — stored ₹2,68,500, recomputed ₹2,68,475
- An accountant edits the underlying cost-ledger entry (CL-302) via the vehicles surface, increasing allowable refurb by ₹165 — the recomputed margin × 18/118 now equals exactly ₹2,68,500

**When:**
- R22 returns to `/finance/gst` and the row re-renders

**Then:**
- The discrepancy chip is gone (selector recomputes; diff < ₹1 tolerance)
- Row shows green check chip if previously reconciled, OR open status if not
- No audit event written by the chip disappearing — it's a passive recomputation per L14
- The prior `MARGIN_DISCREPANCY_ACK` event (if any) remains in the audit log forever — append-only per L26

### S-F-14 — Vendor invoice with mixed-eligibility lines

**Given:**
- R12 creates `VI-003` for a workshop bill: 2 lines — line A "labour" eligible, line B "labour" overridden non-eligible (vendor is unregistered)

**When:**
- R12 fills the form with line B `inputCreditEligible: false` + override-reason "Vendor is composition-scheme; no GSTIN to claim against"
- Submit

**Then:**
- Top-level `inputCreditEligible: true` (because at least one line is)
- Line B carries `inputCreditEligible: false` + reason
- Journal export later: line A goes to "Input GST 18%" ledger; line B's GST goes to "Workshop Expense" ledger (cost, not credit)
- Per L23

### S-F-15 — Journal export blocked on imbalance

**Given:**
- A bug in upstream payroll writes a payroll run where `Salaries Expense Dr` ₹5,00,000 + Cr legs sum ₹4,99,950 (₹50 short — bug)

**When:**
- R22 attempts journal export for the period containing this payroll run

**Then:**
- Pre-export sanity check (L28) runs `assertVoucherBalanced` per voucher
- Throws `VoucherImbalancedError` for the payroll voucher
- Export is BLOCKED — no CSV download
- Toast (error variant): "Voucher VR-PAYROLL-2026-04-30 imbalanced by ₹0.50 — contact engineering."
- A `JOURNAL_EXPORT_BLOCKED` audit event is written (P2 — for v1, console.error suffices)

### S-F-16 — Re-export warning prompt

**Given:**
- R22 exported FY26-Q1 BLR journal on 2026-04-25
- Audit log has the `JOURNAL_EXPORTED` event from that day

**When:**
- R22 returns 4 days later and attempts another export of the same period+scope

**Then:**
- Pre-confirmation toast: "This period has been exported before on 25 Apr 2026 by Priya Iyer (R22). Re-exporting will produce a byte-identical file (per L30). Continue?"
- R22 confirms → CSV downloads with same filename
- Per L30: byte-identical to the prior export
- New audit event written; prior event preserved
- Filename pattern unchanged per L19

### S-F-17 — TCS register cumulative excludes waivers

**Given:**
- Customer has 3 sales in FY26: ₹4L (no waiver), ₹6L (waived), ₹3L (no waiver)
- Today's view of TCS register

**When:**
- Open `/finance/tcs` cumulative tab; find this customer

**Then:**
- `cumulativePurchasePaise` = ₹13L total (purchase value, NOT TCS-applicable value)
- `tcsCollectedTotalPaise` = sum of TCS collected only on non-waived sales: 0 (each non-waived sale individually was sub-threshold; cumulative non-waived is ₹7L which is also sub-threshold)
- Threshold chip: "Approaching" (cumulative ₹13L is ≥ ₹10L, but waiver excludes ₹6L from TCS-applicable — see footnote tooltip)
- Per L3 + L21 — note this is the precise edge case where a waiver changes the threshold-state interpretation; the tooltip explains "₹13,00,000 total · ₹6,00,000 waived · ₹7,00,000 TCS-applicable"

### S-F-18 — Customer ledger interleaved sources

**Given:**
- Customer has 1 vehicle invoice (2025-12-01 ₹65L), 1 service RO (2026-01-15 ₹38,000), 1 custom-build invoice (2026-02-20 ₹4,80,000)
- Two payments received: 2026-01-30 ₹65L (against vehicle invoice), 2026-02-10 ₹38,000 (against RO)

**When:**
- R12 opens drill-down for this customer

**Then:**
- 5 rows interleaved chronologically:
  - 2025-12-01 · Vehicle invoice · ₹65,00,000 (Dr)
  - 2026-01-15 · Service RO · ₹38,000 (Dr)
  - 2026-01-30 · Payment · -₹65,00,000 (Cr)
  - 2026-02-10 · Payment · -₹38,000 (Cr)
  - 2026-02-20 · Custom build · ₹4,80,000 (Dr)
- Running balance: 65L → 65,38,000 → 38,000 → 0 → 4,80,000
- totalOutstandingPaise on summary row = ₹4,80,000
- oldestUnpaidAgeDays = (today - 2026-02-20)
- Per L18

### S-F-19 — HSN-missing line excluded from journal export

**Given:**
- Vendor invoice `VI-004` (parts) has 3 lines; line 2 has `hsnSac: undefined`

**When:**
- R12 attempts to approve VI-004

**Then:**
- Approval form blocks submit with error chip on line 2: "HSN/SAC required"
- Until HSN added (L25), invoice cannot be approved
- Once added, approval flow resumes normally
- Per L25 — also enforced at journal-export time as a defense-in-depth check

### S-F-20 — Outlet GSTIN fallback when Settings module not shipped

**Given:**
- A4 Settings module is not yet shipped
- BLR outlet GSTIN constant in `outlet-gstin-fallback.ts` is `29ABCDE1234F1Z5`

**When:**
- R22 exports BLR journal for FY26-Q1
- Tally CSV row for outlet-side voucher leg renders `gstinParty=29ABCDE1234F1Z5`

**Then:**
- `gstinParty` populated from fallback constant (L29)
- A note appears at the top of the journal page: "Outlet GSTIN sourced from fallback constants — Settings module not yet shipped (A4)."
- Audit `JOURNAL_EXPORTED` event payload includes `outletGstinSource: 'fallback'`

> **Scenario count:** 20 (target ≥ 15).

---

## 8. Acceptance criteria (production-grade)

Reproduces CLAUDE.md §17 verbatim with per-item verification approach. Tick
all 16 boxes before claiming P1 done.

- [ ] **DoD §10 1–15 all pass.**
  *Verify:* run `pnpm -F staff-web typecheck` (must exit 0); `pnpm -F staff-web lint` (zero errors); `pnpm -F staff-web test` (all green; no new failures); `pnpm -F staff-web build` (zero errors).

- [ ] **Every CTA wired.** No silent no-ops.
  *Verify:* grep components/finance for `onClick=` — every handler dispatches a store action, opens a dialog, navigates, or fires a toast. Deferred actions (e.g. "Send WhatsApp reminder" before A3 ships) render an explicit info toast.

- [ ] **Empty / loading / error / success states present.**
  *Verify:* Storybook stories for each major view (`gst-view.stories.tsx`, `tcs-register.stories.tsx`, `vendor-invoice-list.stories.tsx`, `customer-ledger-view.stories.tsx`, `journal-preview.stories.tsx`) covering all four states. L15 empty-state copy validated against the spec.

- [ ] **RBAC gates use `Gate` primitive.** No inline `hasRank` in JSX.
  *Verify:* grep `apps/staff-web/src/components/finance` for `hasRank(` — should match zero JSX usages. All gates render via `<Gate role={...}>`.

- [ ] **All user-visible strings via `next-intl`.** Keys in `messages/en-IN.json` AND `messages/hi-IN.json`.
  *Verify:* grep components/finance for hardcoded English strings (heuristic: `"[A-Z][a-z]+ [a-z]+"` outside `aria-label`, `data-*`); should be zero. New keys land under `messages/en-IN/finance.json` + `messages/hi-IN/finance.json` (English fallback for hi until translator ships).

- [ ] **No `any` without `// reason: <why>`.**
  *Verify:* grep `apps/staff-web/src/lib/finance` + `src/components/finance` for `: any` — every match has an adjacent `// reason:` comment.

- [ ] **No `text-[NNpx]`, no `rounded-lg/xl` outside approved exceptions.**
  *Verify:* grep `text-\[` and `rounded-\(lg|xl\)` in finance code — zero matches outside `Dialog`/`AlertDialog` per CLAUDE.md §10.

- [ ] **Card / Field / Dialog / Slider / StatTile reused from `SPEC-ARCH-UI-001`.**
  *Verify:* Imports come from `@/components/primitives` or `@dms/ui`; no local redefinition of these primitives in `components/finance`.

- [ ] **Hooks called before any conditional return.**
  *Verify:* lint rule `react-hooks/rules-of-hooks` clean across finance module.

- [ ] **Zustand selectors return base refs; computation in `useMemo`.**
  *Verify:* code review — all `useFinanceStore(s => ...)` calls return primitive/array/object refs; computation happens in `useMemo` in components.

- [ ] **Confirmation dialog on destructive actions; type-to-confirm for permanent destruction.**
  *Verify:* Dispute action shows confirm dialog. `markVendorInvoicePaid` shows confirm. Journal export warns on re-export (S-F-16). No type-to-confirm needed in P1 (no permanent destruction surface in finance — vendor-invoice records are append-only via status changes).

- [ ] **PII never concatenated into logs / toasts / error bodies.**
  *Verify:* grep `console.log` / `toast(` in finance code — no full PAN, no full Aadhaar, no full phone. `customerPanLast4` only.

- [ ] **Tests: unit tests for all finance-core math; ≥1 integration test per scenario.**
  *Verify:* `apps/staff-web/src/lib/finance/math/__tests__/*.test.ts` covers `computeMargin`, `computeGstFromMargin`, `computeTcsApplied`, `computeAging`, `assertVoucherBalanced` with branch coverage 100%. `apps/staff-web/src/tests/finance-*.test.ts` has one integration test per S-F-1..S-F-20 (20 tests).

- [ ] **Typecheck clean; existing test suite green; no new failures introduced.**
  *Verify:* baseline (current main) test count vs post-change test count = post-change has +20 (new finance tests) and 0 regressions.

- [ ] **Spec is bumped + changelog updated if behavior changed.**
  *Verify:* this spec's §Changelog has v1.0 row at minimum; subsequent material changes bump version.

- [ ] **Cross-module wiring registry updated.** Seams 18–22 added.
  *Verify:* `specs/architecture/cross-module-wiring.md` contains rows 18–22 referencing this spec.

---

## 9. Cross-module wiring (seams 18–22)

These seams are registered in `specs/architecture/cross-module-wiring.md`.

| # | Name | Source → Target |
|---|---|---|
| 18 | Finance GST → Vehicles sales-events selector | `/finance/gst` page → `useVehiclesStore.getState().selectSoldEventsInPeriod(period, scope)` |
| 19 | Finance GST drill-down → cost-ledger selector | `/finance/gst/[vin]` → `useVehiclesStore.getState().selectAllowableRefurbForVin(vin, beforeTimestamp)` |
| 20 | Finance Customer Ledger → 3-source aggregator | `/finance/customer-ledger/[id]` → reads `useVehiclesStore` (sales events), `useServiceStore` (RO invoices), `useCustomBuildsStore` (build job invoices), and mock `customerPayments` fixture |
| 21 | Finance TCS Register → sales-events PAN aggregator | `/finance/tcs` → `useVehiclesStore.getState().selectSalesEventsByPan(fy)` |
| 22 | Finance Journal Preview → multi-source voucher composer | `/finance/journal` → reads sales events, service ROs, custom-build invoices, paid vendor invoices, payroll runs (read-only); composes JournalEntry[] via `composeJournalEntries(period, scope)` finance-core helper |

Per CLAUDE.md §6, the wiring entry MUST exist BEFORE the import lands in code.
This spec provides the entries; the implementation PR confirms they're honored.

---

## 10. Test plan

### 10.1 Unit tests (finance-core math layer)

`apps/staff-web/src/lib/finance/math/__tests__/`:

| File | Coverage |
|---|---|
| `compute-margin.test.ts` | Happy path, loss-sale clamp to 0, missing acquisitionCost throws, missing allowableRefurb defaults 0 |
| `compute-gst-from-margin.test.ts` | Margin 0 → GST 0; margin × 18/118 with banker's rounding; large numbers (₹1Cr+) |
| `compute-tcs-applied.test.ts` | Below threshold = 0; at threshold = 0 (only > triggers); above threshold = 1% of invoiceValue; tcsWaived = 0 regardless |
| `compute-aging.test.ts` | 0 days = green; 30 = green; 31 = amber; 60 = amber; 61 = red; today = 0 days |
| `assert-voucher-balanced.test.ts` | Balanced passes; imbalanced by 1 paise throws with diff in error msg |
| `gstin-format.test.ts` | Valid 15-char passes; 14-char fails; lowercase fails; missing Z fails |
| `pan-mask.test.ts` | 10-char PAN → `XXXXX1234F`; null → empty string |
| `tally-csv-format.test.ts` | Header row exact match; row order canonical; byte-identical re-export per L30 |

### 10.2 Integration tests (one per scenario)

`apps/staff-web/src/tests/finance-*.test.ts`:

`finance-gst-reconciliation.test.ts` — covers S-F-1, S-F-2, S-F-11, S-F-13.
`finance-tcs-register.test.ts` — covers S-F-4, S-F-5, S-F-17.
`finance-vendor-invoices.test.ts` — covers S-F-3, S-F-7, S-F-9, S-F-14, S-F-19.
`finance-customer-ledger.test.ts` — covers S-F-8, S-F-18.
`finance-journal-export.test.ts` — covers S-F-6, S-F-15, S-F-16, S-F-20.
`finance-rbac.test.ts` — covers S-F-12.
`finance-period-state.test.ts` — covers S-F-10.

### 10.3 Storybook coverage

One stories file per major view (5 files); each renders empty / loading /
error / success states.

### 10.4 Manual QA checklist (E2E gate)

Per CLAUDE.md §17 E2E gate:

1. R22 logs in → navigates to all 12 finance routes → no console errors, no broken links
2. R12 logs in → navigates to allowed routes only → confirms `/finance/journal` is gated correctly
3. R10 logs in → confirms sidebar has no Finance entry; manual deep-link redirects
4. Mobile breakpoint (390px) → tables collapse to card lists
5. Desktop breakpoint (1440px) → 12-col table renders without horizontal scroll
6. Reduced-motion preference → CSS animations disabled per CLAUDE.md §10 #3
7. Keyboard-only navigation → all CTAs reachable; focus rings visible per AAA on body

---

## 11. Risks + mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Margin recomputation drifts from at-sale-time `gstMargin` payload | Medium | High (regulatory) | L20 reconciliation alert + audit-log every override; per-line rounding (L11) reduces drift |
| R2 | Tally CSV format changes between Tally Prime versions | Low | High | Pin to Tally Prime XML 5.1; document the column contract in `tally-csv-format.md` (L9); fixture-test the byte-output |
| R3 | Vendor's GSTIN was valid at invoice creation but is now cancelled (GSTN portal) | Medium | Medium | v2 live verification; v1 documents the gap in DEF-FIN-7 |
| R4 | Outlet GSTIN missing because Settings module not shipped before A2 | High (timing) | Medium | L29 fallback constants; explicit banner on `/finance/journal` |
| R5 | Cross-module wiring breaks finance recomputations when an upstream module reshapes its events | Medium | High | Cross-module wiring registry seams 18–22 documented + import paths versioned in upstream specs; drift audit per CLAUDE.md §16 at module boundaries |
| R6 | TCS threshold semantics misunderstood by accountant (threshold-applicable vs threshold-cumulative) | Medium | High (compliance) | L21 4-state UI + tooltips + S-F-17 edge-case scenario tests; help-text on TCS register page |
| R7 | Banker's rounding accumulates and breaks double-entry (L28 throws) | Low | High | Pre-export sanity check L28; audit-event `JOURNAL_EXPORT_BLOCKED` (P2); alert engineering |
| R8 | PII (full PAN) leaks into logs or toast bodies | Low | High | L13 mask + grep gate in AC checklist; lint rule `no-pan-in-strings` (P2 backlog) |
| R9 | R12 sees other-outlet data via direct URL manipulation | Low | High | L27 + server-side route gate that checks `actor.outlet === scope` for R12 |
| R10 | Margin discrepancy alerts overwhelm UI for legacy fixture data | Medium | Low (UX) | "Acknowledge all (legacy)" bulk action P3; v1 just renders chips |

---

## 12. Open questions (unblocked)

| # | Question | Status |
|---|---|---|
| OQ-FIN-1 | Should `inputCreditEligibilityReason` be required or optional when defaults are overridden? | **Resolved:** Required when overridden from default; not stored when matching default. |
| OQ-FIN-2 | What happens when an outlet hosts a sale of a vehicle whose acquisition was at a different outlet? | **Resolved:** Margin reconciliation row appears at the **sale-outlet** scope (Doc 06 §outlet-attribution defers to sale-side). Acquisition-side outlet noted in drill-down. |
| OQ-FIN-3 | When TCS waiver is applied, does the cumulative running total skip the waived amount or include it? | **Resolved (L3):** Cumulative *purchase* total includes the waived sale (purchase happened); TCS *collected* total excludes it (no TCS deducted). Threshold chip considers cumulative purchase. Per Doc 06 §TCS clarification. |
| OQ-FIN-4 | Should the journal export include the audit log itself? | **Resolved:** No. Audit log is operational metadata, not financial transaction. Audit entries do not produce vouchers. |
| OQ-FIN-5 | Are insurance commission *received* by BN treated as outward supply with GST? | **Resolved:** Yes — BN charges GST 18% on commission received per IRDAI aggregator service definition. This appears as a Sales/Service voucher in the journal, distinct from the *commission paid out* vendor-invoice category. SPEC-INSURANCE-001 §commission documents the outward side; this spec's L17 `commission` category is the *inward* (paid-out) side only. |

> **Open questions:** 0 unresolved (all 5 resolved at draft time).

---

## 13. UI specifications (canonical primitives)

All UI work cites `SPEC-ARCH-UI-001`:

- **Tables:** use `DataTable` primitive with sticky header, sortable columns, multi-select. Mobile: collapse to `Card` list.
- **Filters:** sticky filter bar above tables; chip-style filter selectors; "Reset" pill at far right.
- **StatTile:** hub KPI tiles. Pre-defined sizes; surface = staff.
- **Field:** every form input wraps in the canonical `Field` primitive with label + helper + error slot.
- **Dialog:** confirmation dialogs use `Dialog` primitive — discharged from this surface only.
- **Gate:** every role-gated CTA wraps in `<Gate role={...}>` — never inline `hasRank`.
- **Banner:** L20 discrepancy alerts use the `info`/`warn` banner variant, not custom chips.
- **EmptyState:** `EmptyState` primitive — illustration + headline + sub-headline + optional CTA. L15.

Typography rules: only `text-xs / sm / base / lg / xl / 2xl` allowed. Radius:
default `rounded-md`; `rounded-lg` only on `Dialog`. Spacing: 4px grid.

Color: tokens only (`bg-surface`, `text-fg`, `border-border-subtle`); no
hex literals.

Mobile breakpoints: tables collapse to card list at < 768px; sticky filter
bar collapses to drawer toggle.

---

## 14. Dependencies + sequencing

### 14.1 Hard dependencies (must be shipped before A2)

- **SPEC-VEHICLES-001** (sales events with `gstMargin`, `tcsWaived` payloads) ✅ shipped
- **PLAN-VEHICLES-003 P1** (cost-ledger; sale-events tab) ✅ shipped
- **SPEC-INSURANCE-001** (commission-payout cross-module) ✅ shipped
- **SPEC-CUSTOM-BUILDS-001** (build-job invoices) ✅ shipped
- **SPEC-STAFF-001** (payroll runs) ✅ shipped
- **SPEC-ARCH-UI-001** (canonical primitives) ✅ shipped

### 14.2 Soft dependencies (best-effort)

- **A1 Reports** — finance KPI tiles on Reports dashboard (DEF-FIN-11; bidirectional dep — Reports surface uses Finance selectors)
- **A3 Notifications** — "Send WhatsApp reminder" CTA on customer ledger (S-F-8; v1 stub)
- **A4 Settings** — outlet GSTIN config (L29 fallback)

### 14.3 Downstream consumers (this spec unblocks)

- **D1 GSTR-1/3B returns** (DEF-FIN-1) — directly uses `getMarginReconciliation`
- **D2 E-invoicing IRN+QR** (DEF-FIN-4) — wires into journal-preview voucher composition
- Reports finance tiles
- DSR fulfillment dashboard (D3) — references customer ledger for "data we hold about you"

---

## 15. Implementation phasing within this module

P1 of A2 is everything in §1. Within P1, recommended sequencing:

1. **Foundation** — types in `packages/types/src/domain/finance.ts`; finance-core math in `apps/staff-web/src/lib/finance/math/`; finance-store skeleton.
2. **Hub + GST view** — `/finance` + `/finance/gst` + `/finance/gst/[vin]`. Drill-down. Reconciliation marks. Discrepancy chips. (Largest UX surface.)
3. **TCS register** — `/finance/tcs` cumulative + waivers + deposit schedule. Drill-down side-panel.
4. **Vendor invoices** — `/finance/vendor-invoices` list + create + detail; approve/dispute/mark-paid actions.
5. **Customer ledger** — `/finance/customer-ledger` list + drill-down; 3-source interleaved view.
6. **Journal preview + Tally CSV export** — `/finance/journal` + `exportJournalCSV` + audit log.
7. **Audit page** — `/finance/audit` (R22+).
8. **Tests** — unit (math) + integration (S-F-1..20) + Storybook stories.
9. **Drift check** — confirm all 30 L-tags honored in code; run §16 drift audit.
10. **E2E gate** — manual QA per §10.4; production-grade checklist §8.

P2/P3/P4 items per §2 deferred-items table.

---

## 16. Drift-check anchors

Drift gate (CLAUDE.md §16) for this module greps for:

- L1 formula: `* 18 / 118` AND `* 18/118` AND `0.1525` (if anyone hardcodes the multiplier instead of computing)
- L2 threshold: `1000000` (₹10L in rupees) AND `100000000` (₹10L in paise) — should appear only in finance-core constants
- L4 FY: `04-01` and `03-31` should appear only in `fy-helpers.ts`
- L6 GSTIN regex: should appear only in `gstin-format.ts`; no inline regex in components
- L13 PAN mask: every component rendering customer PAN must call `panLast4()` (no raw PAN render)
- L19 filename: every `URL.createObjectURL` call in finance must use `formatJournalFilename()`
- L26 audit append: every state-mutation action emits an audit event — grep store actions vs audit kinds; counts must match

Audit lives in `specs/architecture/drift-audits/<date>-finance.md` per CLAUDE.md §16.

---

## 17. Glossary references (Doc 09)

- **Margin scheme** — pre-owned vehicle GST regime per CBIC Rule 32(5)
- **TCS** — Tax Collected at Source per IT Act §206C(1F)
- **HSN** — Harmonized System of Nomenclature (goods)
- **SAC** — Service Accounting Code (services)
- **IRN** — Invoice Reference Number from IRP (Invoice Registration Portal)
- **GSTIN** — Goods and Services Tax Identification Number (15 chars)
- **PAN** — Permanent Account Number (10 chars)
- **CGST/SGST/IGST** — Central / State / Integrated GST
- **ITC** — Input Tax Credit
- **GSTR-1 / GSTR-3B** — Outward / Summary GST returns

---

## 18. Out of scope (explicit non-goals)

- **GSTR-1/3B return preparation** → Theme D D1; depends on this spec
- **E-invoicing IRN+QR live fetch** → Theme D D2
- **Live Tally Prime sync** → v2
- **Multi-currency** → INR-only forever (BN India operations only)
- **Bank reconciliation** → v2 (depends on payments-store which doesn't exist)
- **Per-line item GST classification at HSN level** → Finance reads HSN from upstream, never classifies
- **TDS module** → Doc 06 §payroll covers TDS on salary; Doc 06 §AP-tds covers TDS on vendors; Finance v1 captures TDS as a journal-export voucher leg only, not a separate dashboard
- **Outlet P&L computation** → Reports A1 surface, not Finance
- **Cash-flow forecasting** → v2

---

## 19. References

- Doc 06 (Finance, Tax, Employee) — primary; cited heavily throughout
- Doc 13 §3 (E-invoicing IRP) — DEF-FIN-4
- Doc 14 (Role / Permission Matrix) — RBAC L8, L12, L27
- DPDP Act 2023 §3 — PII handling L13
- IT Act §206C(1F) — TCS L2
- CBIC Notification 8/2018-CT(R) Rule 32(5) — margin scheme L1
- IRDAI Web Aggregator Guidelines 2017 — insurance commission cross-ref
- Tally Prime Voucher XML 5.1 — journal export format L9
- PLAN-VEHICLES-003 L4 (gstMargin) / L5 (TCS at-sale) / L18 (TCS waiver) — inheritance contracts
- SPEC-INSURANCE-001 L21 (commission ledger gating R22+/R19) — cross-module
- SPEC-CUSTOM-BUILDS-001 §vendor-payment hooks — DEF-FIN-9
- SPEC-STAFF-001 §payroll-run — journal voucher mapping
- SPEC-ARCH-UI-001 — canonical primitives mandate

---

## 20. Open items / deferred items registry

(Mirrors §2 in the deferred-registry CLAUDE.md §22 format.)

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-FIN-1 | GSTR-1 / GSTR-3B return preparation | P4 | Theme D D1 |
| DEF-FIN-2 | "Request margin override" task creation for R12 | P3 | L16; tasks/inbox dep |
| DEF-FIN-3 | TCS deposit-receipt upload | P3 | Doc 06 §TCS-deposit |
| DEF-FIN-4 | E-invoicing IRN+QR fetch | P4 | Theme D D2; Doc 13 §3 |
| DEF-FIN-5 | Live Tally Prime sync | v2 | L5 |
| DEF-FIN-6 | Multi-currency | v2 | non-goal |
| DEF-FIN-7 | Live GSTIN verification | v2 | L6 |
| DEF-FIN-8 | Insurance commission auto-create vendor invoice | P3 | SPEC-INSURANCE-001 wiring |
| DEF-FIN-9 | Custom-builds vendor invoice auto-create | P3 | SPEC-CUSTOM-BUILDS-001 wiring |
| DEF-FIN-10 | Per-outlet aging threshold config UI | P2 | L7; A4 dep |
| DEF-FIN-11 | Reports module finance KPI tiles | P2 | A1 dep |
| DEF-FIN-12 | Service-RO outstanding integration | P2 | L18 |
| DEF-FIN-13 | Audit-event search + filter UI | P3 | L26 |
| DEF-FIN-14 | Bulk vendor-invoice CSV import | P3 | UX nice-to-have |

---

## 21. Spec changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-29 | 1.0 | orchestrator | Initial spec — A2 of Theme A roadmap. 30 locked decisions, 20 scenarios, 6 entities, 5 P1 capabilities, 14 deferred items, 5 cross-module seams (18–22). Approved at draft time per §12 (all OQ resolved). |
