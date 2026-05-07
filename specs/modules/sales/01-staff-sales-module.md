---
spec_id: SPEC-SALES-001
domain: sales
title: Staff Sales Module (Kanban pipeline + lead capture + enquiry detail)
status: in-review
version: 0.5
risk_level: medium
pii_sensitivity: high
flags: [staff.sales.v1, staff.sales.reservation-guard.v1, staff.sales.deal-lost-reason.v1, staff.sales.refund.v1]
owners: [planner, ux-writer, qa-planner, integrator]
depends_on:
  - SPEC-PLATFORM-001 (app shell + primitives + Dialog/AlertDialog/Toast)
  - SPEC-INVENTORY-002 (vehicle fixtures + detail deep-links)
  - SPEC-FINANCE-001 (margin / TCS / IRN / CDN / rounding helpers via finance-core; cumulative-FY tracking; per-PAN ledger)
docs_consulted:
  - Doc 02 §Sales (v1 feature list)
  - Doc 04 §Sales CRM (lead pipeline, test drive, reservation, sales order, delivery)
  - Doc 06 §GST.margin, §TCS, §earnest-deposit, §DPDP
  - Doc 09 (Glossary — Lead, Enquiry, Deal, Reservation)
  - Doc 11 §DealStateMachine
  - Doc 13 §3 (E-invoicing / IRN / IRP)
  - Doc 14 §R05 Sales Associate, §R09 Sales Manager, §R10 SM-2, §R12 Sr.SM, §R19 GM, §R23 DPO
  - Design 03 Screen 5 (Sales pipeline)
  - Stitch: sales_deal_pipeline_kanban_dark, sales_deal_pipeline_kanban_drag_state, sales_deal_pipeline_list_view_dark, sales_deal_pipeline_light, sales_create_new_lead, sales_enquiry_detail
effective_date: 2026-04-17
---

# SPEC-SALES-001 — Staff Sales Module

## 1. Summary

Sales pipeline from first lead to delivered vehicle. Kanban is the default view (6 stages), list view is the alternative. Lead capture from 5 sources (website, WhatsApp, phone, walk-in, referral). Full enquiry detail page with interaction ledger + compliance/KYC sidebar.

## 2. Routes

| Route | Description |
|-------|-------------|
| `/sales` | Deal pipeline Kanban (default) |
| `/sales?view=list` | List/table view of all deals |
| `/sales/leads/new` | Lead capture form |
| `/sales/leads/[id]` | Enquiry detail with interaction ledger |
| `/sales/deals/[id]` | Deal detail (later stages, alias for leads/[id]) |

## 3. Pipeline stages (Doc 11)

```
NEW_LEAD → CONTACTED → TEST_DRIVE → QUOTED → RESERVED → SALES_ORDER → DELIVERED
                                                              │
                                                              └→ REFUNDED (terminal)
                          ↘ LOST (terminal — pre-SO)         ↗
                          ON_HOLD (side state, recoverable)
```

- **NEW_LEAD** — just captured, not yet contacted
- **CONTACTED** — first contact made (call, WhatsApp, email)
- **TEST_DRIVE** — test drive booked or completed
- **QUOTED** — formal quote issued (price + GST + TCS breakdown), see L_S-PRICE-FLOOR-1
- **RESERVED** — token deposit received, see L_S-TOKEN-1
- **SALES_ORDER** — full agreement signed, paperwork in progress
- **DELIVERED** — vehicle handed over, closed-won (terminal-positive)
- **LOST** — pre-SO drop, requires structured reason (L_S-LOST-1) — terminal
- **REFUNDED** — post-SO reversal, R12+ only (L_S-REFUND-1) — terminal
- **ON_HOLD** — paused, recoverable to any prior live stage

Terminal states: `DELIVERED`, `LOST`, `REFUNDED`. No forward transitions. Backward transitions illegal except via `voidDeal` (R19+ admin) which strikes from analytics but retains audit row.

## 4. Kanban pipeline (`/sales`)

### 4.1 Layout
Reference: Stitch `sales_deal_pipeline_kanban_dark`

- Page header: "Sales Pipeline" Inter 28/600. Right: "New Lead" primary button + filter controls
- Filter bar row: assigned-to-me toggle, **outlet filter (scoped by L_S-RLS-1)**, date range, source filter
- View toggle tabs: Kanban (default) | List
- Kanban: 6 horizontal columns with horizontal scroll on smaller screens
- Summary footer (sticky bottom): "17 active deals · ₹8.4 Cr pipeline · 5 delivered this month"

### 4.2 Deal card (280px wide)

- Top row: customer name + source pill
- **Phone: masked per L_S-PII-2** — last-4 only by default for R05–R09; full reveal via eye icon for R10+ emits `pii_reveal` audit event
- Vehicle: VIN-pinned label
- Amount: mono
- Bottom row: timestamp + micro-pill ("Token Paid", "Awaiting docs")
- Click: opens enquiry detail `/sales/leads/[id]`

### 4.3 Drag and drop

- Drag between columns; optimistic update; POST `/api/staff/sales/deals/:id/move`
- **Skip-stage forward drops emit a warning toast and require explicit confirmation** (gap from drift audit; previously silent)
- **Backward drops to a non-terminal stage are rejected** (state-machine guard)
- **Drops to terminal `LOST` open `MarkDealLostDialog`** (L_S-LOST-1)
- **Drops to `REFUNDED` are blocked from kanban**; refund only via Refund CTA on enquiry detail (L_S-REFUND-1)
- **Drops to `RESERVED`** invoke reservation-guard (L_S-RES-1); conflict opens `ReservationConflictDialog` for R19+ override path

### 4.4 List view (toggle)
Same data in DataTable; preserves filters via URL searchParams.

## 5. Lead capture (`/sales/leads/new`)

Reference: Stitch `sales_create_new_lead`

**Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Client Name | Text | Yes | 2-80 chars |
| Phone Number | Text (+91 prefix) | Yes | 10 digits |
| Email Address | Email | No | valid email |
| Lead Source | Select | Yes | WEB / REFERRAL / WALK-IN / WHATSAPP / PHONE |
| Target Vehicle | Combobox | No | fuzzy match |
| Expected Budget Range | Min/Max ₹ | No | max ≥ min |
| **Buyer PAN** | Text | Conditional (soft-required if `budgetMax ≥ ₹10L`) | `^[A-Z]{5}[0-9]{4}[A-Z]$` — see L_S-PAN-1 |
| **DPDP Consent** | Checkbox | **Yes (hard block)** | Must show purpose statement + check before Submit enables (L_S-DPDP-1) |
| Operational Notes | Textarea | No | max 1000 |

**DPDP consent block (L_S-DPDP-1):**
> "BN Automobiles will store and process this contact information for sales follow-up, KYC verification, and (where applicable) statutory tax reporting under the IT Act and CGST Act. You may withdraw consent or request access/erasure at any time via privacy@bnautomobiles.in (DPDP Act 2023 §6, §11)."
> [ ] I consent to the above purposes.

**Customer reuse:** Lead form first searches `cust-store` by phone. If a customer exists, the lead links via `customerId` and the existing `consentBlock` is reaffirmed (timestamp captured). New PII is NOT re-stored on the Deal — Deal carries `customerId` only (L_S-DSAR-1).

**Submission:**
- Without consent → Submit disabled
- Without PAN when `budgetMax ≥ ₹10L` → soft warning ("PAN will be required at sale; collecting now reduces friction")
- POST `/api/staff/sales/leads`

## 6. Enquiry detail (`/sales/leads/[id]`)

(unchanged sections inherited from v0.4 — see git history for §6.0–§6.5 detail; modifications below)

**§6 Panel B — Compliance & KYC** (extended per L_S-PII-1, L_S-PAN-1, L_S-TCS-CUMULATIVE-1):

- **PAN row**: shows last-4 only by default. Reveal full = R12+ + emits `pii_reveal` audit. Storage: encrypted at rest; never logged.
- **Aadhaar row**: shows last-4 only EVER. Source-of-truth = Sub-KUA verification reference token, not the number. Full Aadhaar never stored (CLAUDE.md §9).
- **Cumulative TCS chip** (L_S-TCS-CUMULATIVE-1): "FY26: ₹X.XL of ₹10L threshold" — 4-stage progressive chip per SPEC-FINANCE-001 L21. Drives `tcsApplicable = (cumulativePurchaseFY + finalPrice) > ₹10L`.
- **Bank Statement Shared**: Pending / Verified.

**§6.3 WhatsApp Quick Action** — Custom Message path emits `templateId: 'CUSTOM_FREEFORM'` interaction. DLT-grade compliance for free-form deferred to DEF-SALES-DLT-CUSTOM-1.

**§6.4 AI Call Dialog** — recording retention + consent-capture script deferred to SPEC-AI-CALL-001 (DEF-SALES-AI-CALL-1).

## 7. Data model

```typescript
export const DealStageEnum = z.enum([
  'new-lead','contacted','test-drive','quoted','reserved','sales-order','delivered',
  'lost','refunded','on-hold',
]);

export const DealSchema = z.object({
  id: z.string(),
  // Customer reference (NEVER store PII directly; lifts from cust-store)
  customerId: z.string(),                       // L_S-DSAR-1
  // Cached display fields (NOT source of truth; rehydrated at render)
  customerNameCached: z.string(),
  customerPhoneLast4: z.string(),               // L_S-PII-2 — full phone in cust-store only
  customerType: z.enum(['B2C','B2B']),         // drives invoice type — L_S-INVOICE-TYPE-1
  customerPan: z.string().optional(),           // encrypted; last-4 displayed — L_S-PAN-1
  // Vehicle
  vehicleVin: z.string().optional(),
  acquisitionCostSnapshot: z.number().optional(),  // L_S-MARGIN-1 — captured on QUOTED
  // Money
  amount: z.number(),
  quotedPriceHistory: z.array(z.object({
    amount: z.number(), quotedAt: z.string(),
    quotedByEmployeeId: z.string(), channel: z.string(),
  })).default([]),                              // L_S-PRICE-FLOOR-1, audit trail
  finalPrice: z.number().optional(),
  marginScheme: z.boolean().default(true),      // L_S-MARGIN-1
  gstMargin: z.number().optional(),             // computed via finance-core
  tcsAmount: z.number().optional(),
  tcsRate: z.union([z.literal(0.01), z.literal(0.05)]).optional(),  // L_S-PAN-1 (5% if no PAN)
  invoiceType: z.enum(['BILL_OF_SUPPLY','TAX_INVOICE_MARGIN']).optional(),  // L_S-INVOICE-TYPE-1
  irnRequestPending: z.boolean().default(false), // L_S-IRN-1
  // Token
  token: z.object({
    amount: z.number(), receivedAt: z.string(),
    instrumentRef: z.string(),
    refundedAt: z.string().optional(),
  }).optional(),                                // L_S-TOKEN-1
  // Stage
  stage: DealStageEnum,
  source: LeadSourceEnum,
  priority: DealPriorityEnum,
  outlet: z.string(),                           // selling outlet — L_S-INTER-OUTLET-1
  assignedTo: z.string().optional(),
  // Lifecycle blocks
  consentBlock: z.object({                      // L_S-DPDP-1
    consentedAt: z.string(),
    formVersion: z.string(),
    capturedByEmployeeId: z.string(),
  }),
  lostReason: LostReasonSchema.optional(),       // L_S-LOST-1
  refund: RefundBlockSchema.optional(),          // L_S-REFUND-1
  refundPayout: RefundPayoutSchema.optional(),   // L_S-REFUND-2
  anonymizedAt: z.string().optional(),           // L_S-DSAR-1 — DPDP §11 erasure
  createdAt: z.string(),
  lastActivityAt: z.string(),
  daysInStage: z.number(),
});

export const RefundPayoutSchema = z.object({    // L_S-REFUND-2
  method: z.enum(['NEFT','UPI','CASH']),
  last4OfAccountOrUpiHandle: z.string(),
  gatewayRef: z.string().optional(),
  capturedByEmployeeId: z.string(),
  capturedAt: z.string(),
});
```

**Store contract additions** (§7 store contract):
- `selectDealsForUser(actor)` — outlet-scoped by default per L_S-RLS-1
- `selectDealsByCustomerId(customerId)` — DSAR pipeline, R23 DPO only (L_S-DSAR-1)
- `cancelReservation(dealId, { reason, refundTokenAmount })` — distinct from `markDealLost` (security #13)
- `voidDeal(dealId, { reason })` — R19+ admin, removes from analytics
- `forceReserveOverride(dealId, { reason, actor })` — extended audit payload per L_S-RES-2

## 8–11. Fixtures, MSW, Build phases, NFRs

(See v0.4 — unchanged. NFR addition: Kanban list query MUST refuse to execute without an outlet scope at the store layer per L_S-RLS-1.)

## 12. Locked Decisions

| Tag | Title | Decision | Source |
|-----|-------|----------|--------|
| L_S-RES-1 | Concurrent reservation guard | `advanceStage(dealId, 'reserved')` throws `ReservationConflictError` if another deal holds an active (non-expired) reservation for the same VIN. The only bypass is `forceReserveOverride`, R19+ only. | AUDIT-SALES-2026-05-07 §4 #3 / W3.1 |
| L_S-LOST-1 | Deal lost reason required | Every manual transition to `stage='lost'` MUST carry a structured `lostReason` (category + optional freeText). Auto-expiry uses the existing `cancellationReason:'EXPIRED'` path. | AUDIT-SALES-2026-05-07 §4 #1 / W3.2 |
| L_S-REFUND-1 | Refund R12+ only; type-to-confirm | `refundDeal` rejects actors below R12. Dialog requires type-to-confirm "REFUND". Deal moves to `stage='refunded'`. Reason ≥30 chars. | AUDIT-SALES-2026-05-07 §4 #5 / W3.3 |
| L_S-DPDP-1 | DPDP consent at lead capture | Lead-capture form MUST display a purpose statement AND require a checkbox confirming consent before Submit enables. Consent record `{consentedAt, formVersion, capturedByEmployeeId}` persists on the Deal as `consentBlock`. Deal creation against an existing customer with no consent record is BLOCKED with an explicit message directing the SA to re-capture consent. Sales never originates new customer PII without consent. | security #1; CLAUDE.md §9; Doc 06 §DPDP §6 |
| L_S-PII-1 | PAN + Aadhaar PII grading | Frontmatter `pii_sensitivity: high`. PAN: encrypted at rest; display last-4 by default; full reveal R12+ + `pii_reveal` audit event. Aadhaar: last-4 only EVER; source-of-truth = Sub-KUA verification reference token, raw number never stored. New §16 codifies masking + audit + storage. | security #2; CLAUDE.md §9; Doc 06 §TCS |
| L_S-PII-2 | Phone masking + reveal-audit | Last-4 only for R05–R09 by default; eye toggle reveals for R10+ and emits `pii_reveal` audit event with `{actorId, dealId, field:'phone'}`. WhatsApp/tel deeplink construction de-masking IS a reveal — also audited. Threshold uses centralized `hasRank('R10')` — inline string-parsing of role IDs is forbidden. | security #3 |
| L_S-RES-2 | Force-override audit completeness + notification | Override audit event payload MUST include `releasedDealCustomerIds`, `releasedAssignedToEmployeeIds`, `releasedReservationCreatedAt[]`, `releasedHadToken[]`. Override schedules notifications: (a) in-app to displaced SA, (b) DLT-SMS template `RESERVATION_RELEASED` to displaced customer. Notification dispatch failure logs but does not block the override (override is irreversible after audit emission). If `releasedHadToken[i] === true`, also emit `TOKEN_REFUND_REQUIRED` (L_S-TOKEN-1). | security #4; finance #13 |
| L_S-REFUND-2 | Refund payout-channel + GST/TCS reversal hygiene | `refundPayout` aggregate captures `{method, last4OfAccountOrUpiHandle, gatewayRef, capturedByEmployeeId, capturedAt}`. Display masked. Full reveal R12+ + `pii_reveal`. Gateway tokens NEVER appear in audit payloads or logs. Refund event payload `{category, refundedAmount, reasonLength, priorStage}` — no reason text body. | security #5; finance #7 |
| L_S-LOST-2 | Lost-reason freeText DPDP grading + erasure | `lostReason.freeText` capped 500 chars; field-level `pii_sensitivity: medium`. Default visibility: deal-owner + R10+. R05 viewing another SA's deal sees only the category. On §11 erasure request the freeText is anonymized to `[redacted-on-request]` while the category and the audit event survive (CPA-2019 + IT Act + GST 7-year retention carve-out). | security #6 |
| L_S-DSAR-1 | DPDP §11 data-principal rights | Every Deal carries `customerId` keyed to cust-store. Sales never originates new customer PII; lead capture either selects existing customer or creates one in cust-store, then references. DSAR answered via `selectDealsByCustomerId(customerId)` — R23 DPO access. Erasure: PII fields anonymized in-place; numeric/categorical financial data + audit events retained 7 years per CPA-2019/GST/IT Act, with `anonymizedAt` marker. New §17 codifies. | security #7; Doc 06 §DPDP §11 |
| L_S-RLS-1 | Cross-outlet RLS default | Default `selectDealsForUser(actor)` returns only deals where `outlet === actor.outlet`. R19+ may pass `crossOutlet: true`. Outlet filter dropdown options scoped by role. Store layer REJECTS any list query that omits outlet scope — fail closed. Mirrors CLAUDE.md §8. | security #8 |
| L_S-SRV-1 | Server-side route hardening | Every mutation in §9 is mirrored by a server route handler that re-validates actor role + outlet scope + stage guard server-side. Client-side checks are UX hints, not security boundaries. Backend phase: harden similarly to L12 (intake). | security #9 |
| L_S-MARGIN-1 | GST margin scheme via finance-core | Every SOLD event for a pre-owned vehicle uses the margin scheme. `gstMargin = max(0, finalPrice − acquisitionCostSnapshot − allowableRefurb) × 18 / 118` computed via `finance-core.computeMargin` reading `vehicles-store.costLedger[vin]`. `acquisitionCostSnapshot` is captured on QUOTED stage (cost-basis pin). `SoCompleteDialog` displays the breakdown line ('Sale ₹X − Cost Basis ₹Y = Margin ₹Z; GST @ 18% = ₹W') BEFORE the SA confirms. Inline math auto-rejected. | finance #1; SPEC-FINANCE-001 L1, L10; Doc 06 §GST.margin |
| L_S-COSTBASIS-0 | Orphan cost-basis hard block | If `costBasis === 0` (no cost-ledger entries for the VIN), `SoCompleteDialog` MUST refuse to enable Confirm. R12+ may override with a typed reason captured on the SOLD event payload (`marginOverride: { reason, actorId }`). Never silently apply margin scheme to a 0-basis vehicle. | finance #2; pre-P3 audit memory |
| L_S-NEGMARGIN-1 | Loss-sale GST treatment | When `finalPrice < acquisitionCostSnapshot`: `gstMargin = 0` (per `max(0,…)`). Dialog renders explicit "Sold below cost — no GST applies" chip. Loss-sales aggregate above ₹X/quarter triggers Finance flag (DEF-SALES-LOSS-1). | finance #3; SPEC-FINANCE-001 L1; Doc 06 §GST.margin |
| L_S-INVOICE-TYPE-1 | Bill of Supply vs margin Tax Invoice | `Deal.invoiceType` defaulted from `Deal.customerType`: B2C → `BILL_OF_SUPPLY` (margin scheme: dealer's GST liability, not pass-through); B2B → `TAX_INVOICE_MARGIN` (with legend "Margin Scheme — Sub-rule 5 of Rule 32"). Invoice type drives IRN routing (L_S-IRN-1) and CDN handling on refund (L_S-REFUND-CDN-1). Cited in SOLD event payload. | finance #4; CGST Rule 32(5); Doc 13 §invoice-format |
| L_S-PAN-1 | Buyer PAN capture + §206CC fallback | `Deal.customerPan` required hard-block when `finalPrice > ₹10L` at SoCompleteDialog. Soft-prompt at lead-capture when `budgetMax ≥ ₹10L`. Format `^[A-Z]{5}[0-9]{4}[A-Z]$`. If buyer refuses: TCS rate flips to 5% per IT Act §206CC; warning banner "Higher TCS applied due to missing PAN" surfaces in dialog and on invoice. PAN stored encrypted; last-4 display only (L_S-PII-1). | finance #5; IT Act §206C / §206CC; SPEC-FINANCE-001 L13 |
| L_S-TCS-CUMULATIVE-1 | Per-PAN per-FY cumulative TCS | TCS threshold tested cumulatively: `tcsApplicable = (cumulativePurchaseFY[customerPan] + finalPrice) > ₹10L`, NOT `finalPrice > ₹10L` per-deal. Cumulative-FY chip from SPEC-FINANCE-001 L21 surfaces in §6 Panel B AND in `SoCompleteDialog` pre-confirm ("Cumulative this FY: ₹X.XL — TCS will apply"). | finance #6; SPEC-FINANCE-001 §1.2 + L21 |
| L_S-REFUND-CDN-1 | Refund GST/TCS reversal via CDN | On `refundDeal`: emit `SALE_REVERSED` event consumed by Finance, which writes a CDN row to the GST register tagged to the original margin row (if invoice already filed) OR cancels the original (same period, not yet filed). Emit `TCS_REVERSAL_PENDING` event with `{originalSaleEventId, tcsCollected, gstMargin, originalQuarter}`. Within-FY same-quarter refund nettable; cross-quarter requires Form 27EQ revision. Vehicles-store emits `RETURNED_TO_INVENTORY` to restore cost-ledger entries. v1: full refunds only (`refundedAmount === originalSalePrice`); partial refunds = DEF-SALES-PARTIAL-REFUND-1 (P3). | finance #7, #8, #9, #10; SPEC-FINANCE-001 |
| L_S-IRN-1 | E-invoicing for B2B | `Deal.invoiceType === 'TAX_INVOICE_MARGIN'` AND `finalPrice > ₹50,000` triggers IRP submission via Finance module's IRN worker. SOLD payload includes `irnRequestPending: true`. P1 = stub with explicit "IRN — coming in P4" toast on SO complete. P4 = real-phase IRP integration with retry policy per Doc 13 §3. B2C / Bill-of-Supply → no IRN. | finance #11; Doc 13 §3 |
| L_S-TOKEN-1 | Reservation token money | `Deal.token: { amount, receivedAt, instrumentRef, refundedAt? }`. GST treatment: token is **earnest deposit**, NOT a sale advance — no GST on receipt per Doc 06 §earnest-deposit; GST attaches at SO. Events: `RESERVATION_TOKEN_RECEIVED` / `RESERVATION_TOKEN_REFUNDED` consumed by Finance (Tally voucher type: Receipt > Earnest Deposit ledger). On `forceReserveOverride` (L_S-RES-2) with `releasedHadToken === true` → emit `TOKEN_REFUND_REQUIRED` Finance task; override completion blocked until task acknowledged. On `markDealLost` of a reserved deal → same. | finance #12, #13; Doc 06 §earnest-deposit |
| L_S-PRICE-FLOOR-1 | Min-margin floor + quote audit | `SoCompleteDialog` enforces `finalPrice ≥ acquisitionCostSnapshot × 1.05` for R05–R10. Below-floor pricing requires R12+ override + reason text, captured on SOLD event payload. R19+ may override with no floor. Mirrors aging-module L2/L6/L18. `Deal.quotedPriceHistory` appends on every WhatsApp quote / formal quote send; SO-complete shows quote-vs-final delta. | finance #14, #16, #17 |
| L_S-INTER-OUTLET-1 | Inter-outlet GSTIN attribution | `Deal.outlet` = the selling outlet (whose GSTIN appears on the invoice). If vehicle's home outlet ≠ selling outlet → emit inter-outlet stock-transfer event at SO-complete time → IGST applies between outlets per CGST §10. v1: hard-block cross-outlet sales (DEF-SALES-INTER-OUTLET-1, P3); P3+ implements transfer voucher. P1 must explicitly block, never silently allow. | finance #19; SPEC-FINANCE-001 L29; CGST §10 |

## 13. Reservation conflict + force-override (L_S-RES-1, L_S-RES-2)

(W3.1 detail unchanged from v0.4; force-override audit payload extended per L_S-RES-2.)

## 14. Deal lost reason capture (L_S-LOST-1, L_S-LOST-2)

(W3.2 detail; freeText now field-level `pii_sensitivity: medium`, capped 500 chars, R05 cross-deal visibility = category-only.)

### 14.1 Reservation cancellation (manual)

`cancelReservation(dealId, { reason, refundTokenAmount })` — distinct from `markDealLost`. Reverts stage `reserved → contacted`, schedules token refund task per L_S-TOKEN-1. (security #13)

### 14.2 Void (R19+ admin)

`voidDeal(dealId, { reason })` — strikes the deal from win-rate/revenue analytics but retains the audit row. For data hygiene only. (security #13)

## 15. Refund / cancellation flow (L_S-REFUND-1, L_S-REFUND-2, L_S-REFUND-CDN-1)

(W3.3 detail; payout-channel aggregate added; CDN/27EQ obligations codified; full-refund-only in v1.)

### 15.1 TCS-waiver CTA in SoCompleteDialog

Gated `<Gate role={['R12','R19','R22','R24']}>`; reason capture (≥10 chars) required; emits `tcs_waived` audit event with `reasonLength` only. (security #12)

### 15.2 Form 27D issuance

Income Tax Act §206C(5) requires issuing Form 27D (TCS certificate) to the buyer within 15 days of quarter-end. Tracked as DEF-SALES-FORM27D-1 (P4 — regulatory). (finance #15)

## 16. PII handling (NEW — L_S-PII-1, L_S-PII-2, L_S-DPDP-1)

| Field | Sensitivity | Storage | Default render | Reveal gate |
|---|---|---|---|---|
| Customer name | low | cust-store | full | always full |
| Phone | medium | cust-store (full); Deal carries last-4 cache | last-4 + `··· ··XXXX` | R10+ via eye → `pii_reveal` audit |
| Email | medium | cust-store | full for owner+R10+; masked otherwise | R10+ |
| PAN | **high** | encrypted at rest (cust-store) | last-4 (`XXXXX1234X` → `…234X`) | R12+ via eye → `pii_reveal` audit |
| Aadhaar (last-4) | **high** | last-4 only EVER stored | last-4 | never reveals more (no full to reveal) |
| Aadhaar (full) | — | NEVER stored | n/a | n/a |
| Sub-KUA ref token | medium | cust-store | reference id only | R12+ |
| Bank account / UPI VPA (refund) | high | RefundPayout aggregate | last-4 | R12+ via eye → `pii_reveal` audit |
| Lost reason freeText | medium | Deal | category-only for R05 cross-deal; full for owner+R10+ | n/a |

**Audit-event payload hygiene:** all sales audit events emit `category + amount + reasonLength` only — never freeText body, never full PII. Server-side filters on viewer role for any sales server route (mirrors L12 from intake — see L_S-SRV-1).

**Logging:** PII never concatenated into logs / toast bodies / error messages (CLAUDE.md §12).

## 17. Data-principal rights (NEW — L_S-DSAR-1, L_S-LOST-2)

**Access (DPDP §11):** R23 DPO retrieves all deals for a given customerId via `selectDealsByCustomerId(customerId)` — returns Deal records with full fields (DPO is the legal recipient). 30-day SLA per DPDP Act 2023 §11(1).

**Correction:** Customer correction requests propagate via cust-store; Deal cached fields rehydrate on next render.

**Erasure (DPDP §11(3)):** Sales data retention overrides apply — CPA-2019 (3 years), IT Act (8 years for PAN-bearing transactions), CGST Act (6 years post-FY-end). Erasure is therefore implemented as **anonymization-in-place**:
- PII fields (`customerNameCached`, `customerPhoneLast4`, `customerPan`, refund-payout last-4) → set to `[redacted-on-request]`
- `lostReason.freeText` → set to `[redacted-on-request]`
- Numeric/categorical fields (`finalPrice`, `gstMargin`, `tcsAmount`, `category`) retained
- `anonymizedAt` timestamp set
- Audit events untouched (regulatory immutability)

**Consent (DPDP §6):** Deal creation requires existing customer consent. If `cust-store.consentBlock` absent for the linked `customerId` → block creation with toast "Customer consent record missing — recapture via lead form." Re-capture lifts an updated `consentBlock` onto the Deal. (L_S-DPDP-1)

## 18. Scenarios (NEW)

| ID | Scenario |
|---|---|
| SC-1 | **Given** R05 SA on `/sales/leads/new` with valid fields and consent checked, **when** they Submit, **then** lead is created in `new-lead` stage with `consentBlock` populated, `customerId` linked, redirect to `/sales/leads/[id]`. |
| SC-2 | **Given** a deal in `new-lead`, **when** R09 advances through `contacted → test-drive → quoted → reserved → sales-order → delivered` with valid prerequisites at each stage, **then** all transitions succeed and audit events emit per stage. |
| SC-3 | **Given** Deal-A holds active reservation on VIN-X, **when** R09 attempts to advance Deal-B to `reserved` with same VIN, **then** `ReservationConflictError` thrown; Deal-B reverts; toast `salesDeals.reservationConflict.toastMessage` shown. (L_S-RES-1) |
| SC-4 | **Given** SC-3 conflict, **when** R19 invokes `forceReserveOverride(Deal-B, {reason})`, **then** Deal-A.stage='lost' with `cancellationReason='MANUAL_CANCEL'`; Deal-B.stage='reserved'; audit event `RESERVATION_FORCE_OVERRIDE` emits with `{reason, releasedDealIds, releasedDealCustomerIds, releasedAssignedToEmployeeIds, releasedReservationCreatedAt[], releasedHadToken[], actorRole}`; in-app notification + DLT-SMS scheduled to displaced SA + customer; if any `releasedHadToken === true` → `TOKEN_REFUND_REQUIRED` task emitted. (L_S-RES-2, L_S-TOKEN-1) |
| SC-5 | **Given** SC-3 conflict, **when** R09 attempts `forceReserveOverride`, **then** UNAUTHORIZED thrown; no state change. |
| SC-6 | **Given** R09 marks deal lost via `MarkDealLostDialog`, **when** category is OTHER and freeText is 9 chars, **then** dialog rejects with validation error; Confirm disabled. **When** freeText is exactly 10 chars, **then** Confirm enables and stage='lost' on submit. (L_S-LOST-1, boundary) |
| SC-7 | **Given** SC-6 success, **when** `markDealLost` completes, **then** `deal_lost` audit event payload is `{category, freeTextLength}` only — no freeText body. (L_S-LOST-1, L_S-LOST-2) |
| SC-8 | **Given** R12 SrSM on a deal in `sales-order`, **when** they invoke `RefundDealDialog` with category, reason ≥30 chars, full refundedAmount, type "REFUND", **then** stage='refunded'; refund block persisted; `SALE_REVERSED` + `TCS_REVERSAL_PENDING` + `RETURNED_TO_INVENTORY` events emit; vehicles-store re-activates cost-ledger entries. (L_S-REFUND-1, L_S-REFUND-CDN-1) |
| SC-9 | **Given** R09 on a deal in `delivered`, **when** they attempt refund, **then** UNAUTHORIZED; refund button not visible (Gate hidden). |
| SC-10 | **Given** SC-8 success, **when** `deal_refunded` audit event emits, **then** payload is `{category, refundedAmount, reasonLength, priorStage}` only — no reason body, no gateway tokens, no payout last-4. (L_S-REFUND-2) |
| SC-11 | **Given** a Deal references VIN-X via `vehicleVin`, **when** Deal detail renders, **then** vehicle name + image hydrate from vehicles-store at render time (not cached on Deal). |
| SC-12 | **Given** R05 SA whose `actor.outlet === 'BLR'`, **when** they call `selectDealsForUser`, **then** result excludes any deal with `outlet === 'MUM'` server-side. Client-side outlet filter dropdown shows only BLR. Direct list query without outlet scope is REJECTED at store layer. (L_S-RLS-1) |
| SC-13 | **Given** R23 DPO with customerId for a customer with 3 historical deals, **when** they call `selectDealsByCustomerId(customerId)`, **then** all 3 deals returned within 30 days. R09 calling the same selector → UNAUTHORIZED. (L_S-DSAR-1) |
| SC-14 | **Given** SoCompleteDialog open for VIN-Y with `costBasis === 0`, **when** R05 attempts to confirm, **then** Confirm disabled with banner "Cost basis missing — reconcile cost ledger or escalate to R12+". When R12 overrides with reason, SOLD payload carries `marginOverride: {reason, actorId}`. (L_S-COSTBASIS-0) |
| SC-15 | **Given** SoCompleteDialog with `finalPrice = ₹95L < costBasis = ₹100L`, **when** confirmed, **then** dialog renders "Sold below cost — no GST applies" chip; `gstMargin = 0` in SOLD payload. (L_S-NEGMARGIN-1) |
| SC-16 | **Given** B2C deal at `finalPrice = ₹50L`, **then** `invoiceType = 'BILL_OF_SUPPLY'`; no IRN requested. **Given** B2B deal at `finalPrice = ₹50L`, **then** `invoiceType = 'TAX_INVOICE_MARGIN'`; `irnRequestPending = true`; "IRN — coming in P4" toast surfaces. (L_S-INVOICE-TYPE-1, L_S-IRN-1) |
| SC-17 | **Given** customer with `cumulativePurchaseFY = ₹7L` and current sale ₹4L, **when** SoCompleteDialog opens, **then** chip shows "Cumulative this FY: ₹7L — TCS will apply on this sale" and TCS computed on full ₹4L. **Given** same customer with no PAN at ₹4L sale, **then** TCS rate = 5% (§206CC), warning banner shown. (L_S-TCS-CUMULATIVE-1, L_S-PAN-1) |
| SC-18 | **Given** R05 attempts `finalPrice = ₹X` where X < `costBasis × 1.05`, **then** Confirm disabled with "Below min-margin floor — R12+ approval required". R12 override captures reason on SOLD payload. `quotedPriceHistory` shows quote-vs-final delta in dialog. (L_S-PRICE-FLOOR-1) |
| SC-19 | **Given** lead form at `budgetMax = ₹15L` with consent unchecked, **when** SA clicks Submit, **then** Submit is disabled; consent is hard-blocked. With consent checked but no PAN, soft warning surfaces; Submit enables. (L_S-DPDP-1, L_S-PAN-1 soft-gate) |
| SC-20 | **Given** R23 DPO triggers erasure for customerId, **when** anonymizeCustomerDeals runs, **then** all PII fields → `[redacted-on-request]`; `anonymizedAt` set; `gstMargin`/`tcsAmount`/audit events untouched. (L_S-DSAR-1, L_S-LOST-2) |
| SC-21 | **Given** vehicle home outlet=BLR sold to customer at MUM outlet, **when** SoCompleteDialog confirms, **then** P1 hard-block with "Inter-outlet sale not yet supported (DEF-SALES-INTER-OUTLET-1)". (L_S-INTER-OUTLET-1) |
| SC-22 | **Given** a `delivered` deal, **when** any actor attempts `advanceStage(deal, 'new-lead')` (backward) or `advanceStage(deal, 'sales-order')` (terminal escape), **then** transition rejected at store layer with `IllegalTransitionError`. |

## 19. Acceptance criteria (NEW)

| AC | Statement | Scenarios |
|---|---|---|
| AC-1 | Lead form Submit is disabled while DPDP consent checkbox is unchecked. | SC-1, SC-19 |
| AC-2 | Deal creation against an existing customer with no `consentBlock` is blocked with explicit toast. | SC-1 |
| AC-3 | Reservation conflict on same VIN raises `ReservationConflictError` and is caught with localized toast (en-IN + hi-IN). | SC-3 |
| AC-4 | `forceReserveOverride` requires R19+; below-rank actor receives UNAUTHORIZED. | SC-4, SC-5 |
| AC-5 | Force-override audit payload contains all 7 documented fields including `releasedHadToken[]`. | SC-4 |
| AC-6 | Force-override scheduling: in-app notification to displaced SA + DLT-SMS to displaced customer. | SC-4 |
| AC-7 | `markDealLost` rejects category=OTHER with freeText length < 10; accepts at length === 10 (boundary). | SC-6 |
| AC-8 | `deal_lost` audit payload contains `{category, freeTextLength}` only — no freeText body. | SC-7 |
| AC-9 | Lost-reason freeText capped 500 chars; R05 cross-deal visibility = category only. | (SC-7 extension) |
| AC-10 | `refundDeal` rejects below-R12 actors; UI Refund button hidden via `<Gate>`. | SC-9 |
| AC-11 | `RefundDealDialog` Confirm disabled until user types "REFUND" exactly (case-sensitive). | SC-8 |
| AC-12 | `deal_refunded` audit payload omits reason text body, gateway tokens, and full payout details. | SC-10 |
| AC-13 | Refund emits `SALE_REVERSED` (Finance CDN), `TCS_REVERSAL_PENDING`, `RETURNED_TO_INVENTORY` (vehicles cost-ledger restore). | SC-8 |
| AC-14 | Partial refunds blocked v1 — `refundedAmount === originalSalePrice` enforced. | (SC-8 extension) |
| AC-15 | `selectDealsForUser` outlet-scopes by default; query without outlet scope rejected at store layer. | SC-12 |
| AC-16 | `selectDealsByCustomerId` is R23-DPO gated; below-rank → UNAUTHORIZED. | SC-13 |
| AC-17 | Anonymization redacts PII fields, sets `anonymizedAt`, retains numeric/categorical + audit. | SC-20 |
| AC-18 | `SoCompleteDialog` blocks Confirm when `costBasis === 0`; R12 override captures reason on SOLD payload. | SC-14 |
| AC-19 | Loss-sale (`finalPrice < costBasis`) renders explicit chip; `gstMargin = 0` in payload. | SC-15 |
| AC-20 | `invoiceType` defaults from `customerType`; B2B routes to IRN stub with toast; B2C does not. | SC-16 |
| AC-21 | Cumulative-FY TCS chip + dialog use `(cumulativePurchaseFY + finalPrice) > ₹10L`, not per-deal. | SC-17 |
| AC-22 | PAN missing at `finalPrice > ₹10L` → TCS @ 5% with §206CC warning banner. | SC-17 |
| AC-23 | `finalPrice < costBasis × 1.05` blocked for R05–R10; R12+ override captures reason. | SC-18 |
| AC-24 | `quotedPriceHistory` appends on every quote send and SO-complete shows quote-vs-final delta. | SC-18 |
| AC-25 | Inter-outlet sales hard-blocked v1 with explicit DEF-SALES-INTER-OUTLET-1 message. | SC-21 |
| AC-26 | Backward and terminal-escape transitions throw `IllegalTransitionError`. | SC-22 |
| AC-27 | PAN, Aadhaar, phone, payout-channel reveal each emit `pii_reveal` audit; threshold via `hasRank` (no inline string-parsing). | (cross-cutting; covered in tests) |

## 20. Test plan (NEW)

| Test file | Scenarios covered |
|---|---|
| `apps/staff-web/src/lib/sales/__tests__/sales-deals-store.reservation-guard.test.ts` (20 it() — actual count, supersedes W3 commit's "11" claim) | SC-3, SC-4, SC-5, SC-22 (terminal escape from `reserved`) |
| `apps/staff-web/src/lib/sales/__tests__/sales-deals-store.deal-lost.test.ts` (7 it()) | SC-6 (incl. boundary length===10 — added), SC-7 |
| `apps/staff-web/src/lib/sales/__tests__/sales-deals-store.refund.test.ts` (7 it()) | SC-8, SC-9, SC-10 |
| `apps/staff-web/src/lib/sales/__tests__/sales-deals-store.test.ts` | SC-1, SC-2, SC-11 |
| `apps/staff-web/src/lib/sales/__tests__/sales-deals-store.rls.test.ts` (NEW — DEF-SALES-RLS-TEST-1) | SC-12, SC-15 (negmargin), SC-22 |
| `apps/staff-web/src/lib/sales/__tests__/sales-deals-store.dsar.test.ts` (NEW) | SC-13, SC-20 |
| `apps/staff-web/src/components/sales/__tests__/refund-dialog.test.tsx` (NEW) | AC-11 (type-to-confirm UI test) |
| `apps/staff-web/src/components/sales/__tests__/so-complete-dialog.test.tsx` (NEW) | SC-14, SC-15, SC-16, SC-17, SC-18 |
| `apps/staff-web/src/components/sales/__tests__/lead-form-consent.test.tsx` (NEW) | SC-1, SC-19 |
| `apps/staff-web/src/tests/sales-cross-module.test.ts` (NEW) | SC-8 (cost-ledger restore seam), SC-21 (inter-outlet) |

### Quality gates

Per CLAUDE.md §10 #11–#13a, §17:

- `pnpm -F staff-web typecheck` — zero errors
- `pnpm -F staff-web lint` — zero new errors
- `apps/staff-web/src/tests/ui-canon-drift.test.ts` — no `text-[NNpx]`, no `rounded-lg/xl` regressions (drift audit found 43 violations to clean)
- `apps/staff-web/src/tests/error-boundaries.test.ts` — `app/(shell)/sales/error.tsx` present
- Locale-completeness gate — top-level `salesDeals` namespace in `messages/en-IN.json` AND `messages/hi-IN.json` (audit found zero `useTranslations` usage in core sales components — DEF-SALES-I18N-1)
- Dead-button-detector — no silent CTAs (audit flagged "Assign Lead" — DEF-SALES-ASSIGN-1)
- Zustand selector anti-patterns test — selectors return base refs; computation in `useMemo`
- i18n-key-resolution test — every `useTranslations('salesDeals.*')` key resolves in both locale files

## 21. Spec traceability matrix (NEW)

| Scenario | AC | Test file | L-tag |
|---|---|---|---|
| SC-1 | AC-1, AC-2 | sales-deals-store.test.ts; lead-form-consent.test.tsx | L_S-DPDP-1 |
| SC-2 | (state-machine) | sales-deals-store.test.ts | (state machine §3) |
| SC-3 | AC-3 | reservation-guard.test.ts | L_S-RES-1 |
| SC-4 | AC-4, AC-5, AC-6 | reservation-guard.test.ts | L_S-RES-1, L_S-RES-2, L_S-TOKEN-1 |
| SC-5 | AC-4 | reservation-guard.test.ts | L_S-RES-1 |
| SC-6 | AC-7, AC-9 | deal-lost.test.ts | L_S-LOST-1, L_S-LOST-2 |
| SC-7 | AC-8 | deal-lost.test.ts | L_S-LOST-1 |
| SC-8 | AC-13, AC-14 | refund.test.ts; sales-cross-module.test.ts | L_S-REFUND-1, L_S-REFUND-CDN-1 |
| SC-9 | AC-10 | refund.test.ts | L_S-REFUND-1 |
| SC-10 | AC-12 | refund.test.ts | L_S-REFUND-2 |
| SC-11 | — | sales-deals-store.test.ts | (cross-aggregate hydration) |
| SC-12 | AC-15 | rls.test.ts | L_S-RLS-1 |
| SC-13 | AC-16 | dsar.test.ts | L_S-DSAR-1 |
| SC-14 | AC-18 | so-complete-dialog.test.tsx | L_S-COSTBASIS-0 |
| SC-15 | AC-19 | so-complete-dialog.test.tsx; rls.test.ts | L_S-NEGMARGIN-1 |
| SC-16 | AC-20 | so-complete-dialog.test.tsx | L_S-INVOICE-TYPE-1, L_S-IRN-1 |
| SC-17 | AC-21, AC-22 | so-complete-dialog.test.tsx | L_S-TCS-CUMULATIVE-1, L_S-PAN-1 |
| SC-18 | AC-23, AC-24 | so-complete-dialog.test.tsx | L_S-PRICE-FLOOR-1 |
| SC-19 | AC-1 | lead-form-consent.test.tsx | L_S-DPDP-1, L_S-PAN-1 |
| SC-20 | AC-17 | dsar.test.ts | L_S-DSAR-1, L_S-LOST-2 |
| SC-21 | AC-25 | sales-cross-module.test.ts | L_S-INTER-OUTLET-1 |
| SC-22 | AC-26 | rls.test.ts | (state machine §3) |
| (cross) | AC-27 | (component tests, all) | L_S-PII-1, L_S-PII-2 |

## 22. Out of scope

- Customer-web deal-status display (deferred to SPEC-CX-PORTAL-002, DEF-SALES-CX-1)
- Customer notifications on stage changes (DEF-SALES-CX-1)
- AI Call recording retention + script (SPEC-AI-CALL-001, DEF-SALES-AI-CALL-1)
- WhatsApp custom-freeform DLT compliance (DEF-SALES-DLT-CUSTOM-1)
- Form 27D issuance (DEF-SALES-FORM27D-1)
- Partial refunds (DEF-SALES-PARTIAL-REFUND-1)
- Inter-outlet stock-transfer voucher (DEF-SALES-INTER-OUTLET-1)
- Loss-Reasons analytics widget (DEF-SALES-LOST-1)

## 23. Storybook

Required stories (CLAUDE.md §10 #8):
- `MarkDealLostDialog` — valid / invalid / OTHER-branch / boundary-length-10 states
- `RefundDealDialog` — role-gated (R09 hidden, R12 visible) / type-to-confirm enabled-disabled / payout-channel masked-revealed states
- `ReservationConflictDialog` — conflict-shown / R09 (no override) / R19 (override CTA + reason input) states
- `SoCompleteDialog` — happy / cost-basis-zero / loss-sale / B2B-IRN / PAN-missing-§206CC / below-floor / inter-outlet-blocked states
- `LeadCaptureForm` — consent-unchecked-disabled / consent-checked / budget≥10L-PAN-soft-warning states

## 24. Events emitted

| Event | Payload | Privacy notes |
|---|---|---|
| `deal_created` | `{dealId, customerId, source, outlet, consentVersion}` | no PII |
| `stage_changed` | `{dealId, fromStage, toStage, actorId}` | — |
| `RESERVATION_FORCE_OVERRIDE` | `{reason, releasedDealIds, releasedDealCustomerIds, releasedAssignedToEmployeeIds, releasedReservationCreatedAt[], releasedHadToken[], actorRole}` | reason captured (≥10 chars); no PII bodies |
| `deal_lost` | `{dealId, category, freeTextLength}` | NO freeText body |
| `deal_refunded` | `{dealId, category, refundedAmount, reasonLength, priorStage}` | NO reason body, NO payout details |
| `SALE_REVERSED` | `{dealId, originalSaleEventId, gstMargin}` | Finance-consumed (CDN) |
| `TCS_REVERSAL_PENDING` | `{originalSaleEventId, tcsCollected, originalQuarter}` | Finance-consumed |
| `RETURNED_TO_INVENTORY` | `{vin, refundEventId}` | vehicles-store-consumed |
| `RESERVATION_TOKEN_RECEIVED` | `{dealId, amount, instrumentRef}` | — |
| `RESERVATION_TOKEN_REFUNDED` | `{dealId, amount, refundEventId}` | — |
| `TOKEN_REFUND_REQUIRED` | `{dealId, amount, triggerEventId}` | Finance-task-queue |
| `pii_reveal` | `{actorId, dealId, field, revealedAt}` | privacy audit; no values |
| `tcs_waived` | `{dealId, actorId, reasonLength}` | NO reason body |

Audit-event casing standardized: `SCREAMING_SNAKE_CASE` for cross-module events consumed by Finance/vehicles; `snake_case` for sales-internal audit. (qa #3 — codified.)

## 25. i18n

Top-level namespace `salesDeals` MUST exist in `messages/en-IN.json` AND `messages/hi-IN.json` (CLAUDE.md §10 #13a). Required key groups:

- `salesDeals.pipeline.*` — column headers, stage labels, filter labels
- `salesDeals.lostReason.*` — categories, dialog copy, validation
- `salesDeals.refund.*` — dialog copy, type-to-confirm prompt, TCS notice
- `salesDeals.reservationConflict.*` — toast, override dialog
- `salesDeals.soComplete.*` — money breakdown, PAN warning, cost-basis-zero, loss-sale, IRN-coming
- `salesDeals.leadForm.*` — DPDP consent text, PAN soft-warning

DEF-SALES-I18N-1 captures bulk migration of currently-hardcoded strings.

## 26. Deferred items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-SALES-DPDP-1 | Lead-capture consent flow + deal-block-on-no-consent + cust-store consent lookup | P1 | Closes security blocker #1; L_S-DPDP-1 |
| DEF-SALES-PII-1 | Frontmatter sensitivity high; PAN/Aadhaar masking helpers + reveal-audit wiring | P1 | Closes security blocker #2; L_S-PII-1, L_S-PII-2 |
| DEF-SALES-RES-2 | Force-override extended audit payload + DLT-SMS + in-app notification | P1 | Closes security blocker #3; L_S-RES-2 |
| DEF-SALES-DSAR-1 | DSAR pipeline: `selectDealsByCustomerId` + R23 gate + anonymization helper | P1 | Closes security blocker #4; L_S-DSAR-1 |
| DEF-SALES-RLS-1 | Outlet-scoped `selectDealsForUser` + reject-on-omitted-scope | P1 | Closes security blocker #5; L_S-RLS-1 |
| DEF-SALES-MARGIN-1 | finance-core `computeMargin` integration in SoCompleteDialog + `acquisitionCostSnapshot` capture on QUOTED | P1 | Closes finance blocker #1; L_S-MARGIN-1 |
| DEF-SALES-COSTBASIS-0 | Orphan-cost-basis hard block + R12 override capture | P1 | Closes finance blocker #2; L_S-COSTBASIS-0 |
| DEF-SALES-PAN-1 | Buyer PAN field on Deal + lead/SO gates + §206CC fallback | P1 | Closes finance blocker #3a; L_S-PAN-1 |
| DEF-SALES-TCS-CUMULATIVE-1 | Per-PAN-FY cumulative tracker + chip in §6 + dialog | P1 | Closes finance blocker #3b; L_S-TCS-CUMULATIVE-1 |
| DEF-SALES-INVOICE-TYPE-1 | `Deal.invoiceType` defaulting + Bill-of-Supply vs margin Tax Invoice rendering | P1 | Closes finance blocker #4; L_S-INVOICE-TYPE-1 |
| DEF-SALES-IRN-1 | IRN stub + toast on B2B SO complete; P4 = real IRP integration | P1 (stub) / P4 (real) | Closes finance blocker #5; L_S-IRN-1 |
| DEF-SALES-TOKEN-1 | Token aggregate + RECEIVED/REFUNDED events + Finance ledger wiring | P1 | Closes finance blocker #6; L_S-TOKEN-1 |
| DEF-SALES-SCENARIOS-1 | (this spec) §Scenarios + §AC + §Test plan + §Traceability matrix added | P1 (closed-by-this-version) | Closes qa blocker #1, #2, #3; this v0.5 |
| DEF-SALES-LIFECYCLE-1 | Status reverted in-build → in-review pending blocker resolution | P1 (closed-by-this-version) | Closes qa blocker #4; this v0.5 |
| DEF-SALES-NEGMARGIN-1 | Loss-sale chip + zero-GST enforcement | P2 | L_S-NEGMARGIN-1 |
| DEF-SALES-PRICE-FLOOR-1 | Min-margin floor + quotedPriceHistory audit | P2 | L_S-PRICE-FLOOR-1 |
| DEF-SALES-REFUND-CDN-1 | CDN/27EQ event wiring; cost-ledger restore | P2 | L_S-REFUND-CDN-1 |
| DEF-SALES-SRV-1 | Server-side route hardening (post-mock-phase) | P3 (backend phase) | L_S-SRV-1 |
| DEF-SALES-INTER-OUTLET-1 | Inter-outlet sale block v1; transfer voucher v2 | P3 | L_S-INTER-OUTLET-1 |
| DEF-SALES-LOST-1 | Loss Reasons analytics widget on Reports | P3 | L_S-LOST-1 (existing W3) |
| DEF-SALES-PARTIAL-REFUND-1 | Partial refunds with proportional GST/TCS reversal | P3 | L_S-REFUND-1 |
| DEF-SALES-ASSIGN-1 | Wire "Assign Lead" CTA (currently silent) | P2 | qa #15; CLAUDE.md §10 #15 |
| DEF-SALES-I18N-1 | Migrate hardcoded sales strings to `salesDeals.*` namespace | P2 | qa #10 |
| DEF-SALES-FORM27D-1 | Form 27D PDF issuance pipeline | P4 | finance #15; IT Act §206C(5) |
| DEF-SALES-LOSS-1 | Aggregate-loss-per-quarter Finance flag | P3 | L_S-NEGMARGIN-1 |
| DEF-SALES-DLT-CUSTOM-1 | DLT compliance for WhatsApp custom-freeform path | P3 | security #14 |
| DEF-SALES-AI-CALL-1 | SPEC-AI-CALL-001 — recording retention + consent-capture script | P3 | security #15 |
| DEF-SALES-CX-1 | Customer-web deal-status display + DLT notifications on stage change | P3 | qa #14 |
| DEF-SALES-DOC-1 | Invoice PDF SHA-256 pinning at DELIVERED (mirror intake L16) | P3 | security #11 |
| DEF-SALES-SEAM-REPORTS-1 | Register `use-report-data.ts` → `useSalesDealsStore` seam | P2 | qa open-q #2 |

## 27. Open questions (deferred to next review wave)

1. Existing `cust-store.consentBlock` shape — verify before DEF-SALES-DPDP-1 implementation.
2. Sub-KUA Aadhaar verification reference token format.
3. `lostReason.freeText` retention period after §11 erasure — answered: anonymize-in-place + retain category (L_S-LOST-2).
4. Reservation token escrow (BN vs gateway) — affects automatic refund obligation; current decision: BN-held earnest deposit (L_S-TOKEN-1).
5. `customerId` on Deal — confirmed required-field migration in DEF-SALES-DSAR-1.
6. `cancelReservation` vs `markDealLost` — answered: separate transition (§14.1).
7. `refunded` recoverability — answered: terminal (§3).
8. `service-to-sale` cross-module seam ownership — DEF-SALES-SEAM-REPORTS-1.
9. Inter-state B2C IGST vs CGST+SGST — locked to CGST+SGST per §10(1)(c) pending CA confirmation (finance OQ #3).

## 28. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-17 | 0.1 | Claude (integrator) | Initial spec for staff Sales Phase S3 |
| 2026-04-17 | 0.2 | Claude (integrator) | Phase S3 shipped (Kanban + list + lead capture + enquiry detail + 2 modals). |
| 2026-04-17 | 0.3 | Claude (integrator) | Added §6.0 Contact Details, §6.3 WhatsApp quick action, §6.4 AI Call dialog, §6.5 `call-ai` interaction. |
| 2026-05-07 | 0.4 | Claude (implement — W3 audit fixes) | Added §12 Locked Decisions (L_S-RES-1, L_S-LOST-1, L_S-REFUND-1), §13–§15 W3 flows. Status promoted to `in-build`. |
| 2026-05-07 | 0.5 | Claude (integrator) | Wave-2 reviews integration: 3 reviewers signed off `no` with 15 P0/P1 blockers + ~20 new L-tags. Added §Scenarios (22), §Acceptance criteria (27), §Test plan, §PII handling (§16), §Data-principal rights (§17), §Spec traceability matrix (§21), §Events emitted (§24), §i18n (§25). Minted L_S-DPDP-1, L_S-PII-1, L_S-PII-2, L_S-RES-2, L_S-REFUND-2, L_S-LOST-2, L_S-DSAR-1, L_S-RLS-1, L_S-SRV-1, L_S-MARGIN-1, L_S-COSTBASIS-0, L_S-NEGMARGIN-1, L_S-INVOICE-TYPE-1, L_S-PAN-1, L_S-TCS-CUMULATIVE-1, L_S-REFUND-CDN-1, L_S-IRN-1, L_S-TOKEN-1, L_S-PRICE-FLOOR-1, L_S-INTER-OUTLET-1 (20 new). Frontmatter `pii_sensitivity: medium → high`; `status: in-build → in-review` (NOT approved — reviewers' signed-off:no honoured; promotion blocked pending blocker resolution per CLAUDE.md §6). `depends_on` adds SPEC-FINANCE-001. 30 DEF-SALES-* deferred items track each blocker. Each future code commit closing a DEF item updates this changelog with the commit hash. |
