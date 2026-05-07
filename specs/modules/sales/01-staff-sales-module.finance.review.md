# SPEC-SALES-001 — Finance + Tax review

**Reviewer:** finance-reviewer
**Date:** 2026-05-07
**Spec version reviewed:** 0.4 (`status: in-build`)
**Companion to:** SPEC-FINANCE-001, PLAN-VEHICLES-003

> Lens: penalty-event scrutiny on every money / GST / TCS / IRN / refund flow.
> Cross-checked against `apps/staff-web/src/components/sales/so-complete-dialog.tsx`,
> `apps/staff-web/src/lib/sales/sales-deals-store.ts`, and the Finance spec L1/L2/L3/L5/L11/L21.

---

## Concerns

### 1. **[P0]** Margin-scheme math is invisible in the Sales spec — no contract for cost-basis lookup
**Finding.** Section 15 (Refund flow) and §3 (pipeline stages) reference TCS but the spec contains zero language on the GST **margin scheme** that governs every pre-owned sale. SPEC-FINANCE-001 L1 nails the formula (`margin = max(0, salePrice − acquisitionCost − allowableRefurb)`, `gstAmount = margin × 18 / 118`, per-line rounding) and L10 says **all money math must route through finance-core** — but SPEC-SALES-001 never declares that the `SoCompleteDialog` / `SOLD` event consumes those helpers, never declares where `acquisitionCost` comes from for the Deal, and never says the SA must see the computed margin GST before confirming the sale. Doc 06 §GST.margin makes this regulatory: full-value GST on a pre-owned sale = penalty event.

**Spec cite.** §15 (TCS note only), §7 (Deal schema has `amount` but no `acquisitionCostSnapshot`, no `gstMargin`, no `marginScheme: boolean`).
**Recommendation.** Add a Locked Decision (e.g. `L_S-MARGIN-1`): "Every SOLD event for a pre-owned vehicle uses the margin scheme. `gstMargin` is computed via `finance-core.computeMargin` reading `vehicles-store.costLedger[vin]`. The SO-complete dialog displays the breakdown line ('Sale ₹X − Cost Basis ₹Y = Margin ₹Z; GST @ 18% = ₹W') BEFORE the SA confirms. Inline math is auto-rejected." Cite SPEC-FINANCE-001 L1, L10.

### 2. **[P0]** No defined behaviour when `costBasis = 0` (orphan record)
**Finding.** The pre-P3 cross-module data audit (memory `project_pre_p3_data_audit.md`) flagged that VINs exist with SOLD events but zero cost-ledger entries. SPEC-FINANCE-001 L8 / SPEC-INVENTORY-AGING-001 L8 say `costBasis` falls back to 0 if no entries — which under margin-scheme math means `margin = salePrice` and **GST is computed on full value**, *the very mistake margin scheme is meant to avoid*. Sales spec has no guardrail.

**Spec cite.** §15, §7 (no orphan policy).
**Recommendation.** Add a hard block: "If `costBasis === 0` (no cost-ledger entries for the VIN), `SoCompleteDialog` MUST refuse to enable Confirm. R12+ may override with a typed reason captured on the SOLD event payload (`marginOverride: { reason, actorId }`). Never silently apply margin scheme to a 0-basis vehicle." This is a Doc 06 §GST.margin enforcement gap.

### 3. **[P0]** Negative-margin sale (sold at a loss) — GST treatment unspecified
**Finding.** Doc 06 §GST.margin: when sale price < cost basis, margin is negative → GST = 0 (no tax on a loss). SPEC-FINANCE-001 L1 codifies this with `max(0, ...)`. Sales spec is silent — meaning the SO-complete dialog could still pass an `gstMargin > 0` payload because the spec does not require routing through `computeMargin`.

**Spec cite.** §15.
**Recommendation.** Add to the §15 / new margin lock: "Negative margin → `gstMargin = 0`; the dialog renders the loss explicitly ('Sold below cost — no GST applies'). Loss sales above ₹X aggregate trigger a Finance flag (deferred, DEF-SALES-LOSS-1)."

### 4. **[P0]** Invoice type not differentiated — Tax Invoice vs Bill of Supply
**Finding.** Under margin scheme, sale to B2C uses **Bill of Supply** (no tax invoice — because GST liability is the dealer's, not pass-through to buyer). To B2B (where the buyer claims ITC, which they cannot under margin scheme anyway, but the document type still differs) it's a margin-scheme tax invoice with the legend "Margin Scheme — Sub-rule 5 of Rule 32". SPEC-SALES-001 has no concept of invoice type. Wrong document type = GSTR-1 mismatch + audit observation.

**Spec cite.** §15 (no invoice-type field).
**Recommendation.** Lock `Deal.invoiceType: 'BILL_OF_SUPPLY' | 'TAX_INVOICE_MARGIN'`, defaulted from `Deal.customerType: 'B2C' | 'B2B'`. Add to SOLD event payload. Reference Doc 13 §invoice-format + CGST Rule 32(5).

### 5. **[P0]** TCS — PAN of buyer is not a required field at any stage
**Finding.** The Deal schema (§7) has no `customerPan` field. The lead-capture form (§5) does not collect PAN. Per Doc 06 §TCS, **PAN is mandatory** for any sale where TCS may apply (>₹10L); absent PAN, the dealer must collect TCS at the higher rate (5%) under §206CC of the IT Act. The current `SoCompleteDialog` computes TCS @ 1% on `finalPrice > 1_000_000` with **no PAN check at all** (`so-complete-dialog.tsx:142`). Penalty exposure: 1% under-deduction × every >₹10L sale.

**Spec cite.** §5 (lead form fields), §7 (Deal schema), §15 (TCS note).
**Recommendation.** Lock: "Lead-capture form requires `customerPan` when `expectedBudgetMax ≥ ₹10L` (soft gate, warning) and `SoCompleteDialog` requires `customerPan` (hard block) when `finalPrice > ₹10L`. PAN format validation `^[A-Z]{5}[0-9]{4}[A-Z]$`. If buyer refuses PAN, TCS rate flips to 5% (§206CC) and a warning banner shows 'Higher TCS applied due to missing PAN'. PAN stored masked (last-4 only) per SPEC-FINANCE-001 L13."

### 6. **[P0]** Per-PAN per-FY cumulative TCS threshold — Sales spec doesn't acknowledge cumulative tracking
**Finding.** The TCS threshold is **per PAN, per FY, cumulative across all sales** — not per-deal. SPEC-FINANCE-001 L21 defines a 4-stage progressive chip (`< ₹6L / ₹6–8L / ₹8–10L / ≥ ₹10L`). `SoCompleteDialog` currently looks only at the current sale's `finalPrice` — a customer with three ₹4L sales escapes TCS entirely (₹12L cumulative). Sales spec has no language to surface this.

**Spec cite.** §15, no UI surface in §6 (enquiry detail).
**Recommendation.** Wire SPEC-FINANCE-001 L21's chip into the enquiry-detail Compliance & KYC sidebar (§6 Panel B) and into `SoCompleteDialog` pre-confirm: "Cumulative this FY: ₹X.XL — TCS will apply." `tcsApplicable = (cumulativePurchase + finalPrice) > ₹10L`, not `finalPrice > ₹10L`. This is the SPEC-FINANCE-001 §1.2 formula and Sales must honour it.

### 7. **[P1]** Refund flow (§15) — TCS reversal is hand-waved as "Form 26AS adjustment in next quarter"
**Finding.** §15 / L_S-REFUND-1 says: "If TCS was collected on this sale, a separate Form 26AS adjustment is required in the next quarterly filing. No automatic TCS reversal — out of scope for P1." This is operationally correct (manual quarterly Form 27EQ revision is the legal mechanism) but the spec must be sharper: (a) within-FY same-quarter refund can be netted against deposits if not yet filed; (b) cross-quarter refund needs Form 27EQ revision; (c) a credit-note (CDN) entry to the customer for the TCS amount + GST credit note for the margin GST.

**Spec cite.** §15 TCS note, L_S-REFUND-1.
**Recommendation.** Replace the single-line note with a structured section: "On refund: emit `TCS_REVERSAL_PENDING` finance event with `{ originalSaleEventId, tcsCollected, gstMargin, originalQuarter }`. Finance module's TCS register surfaces this in a 'Pending reversal' tab (DEF-FIN-N). The SO's invoice gets a corresponding **GST credit note** (CDN) record (dealer-issued, not Tally manual). Tally export wiring documented in §15."

### 8. **[P1]** Refund — GST credit note (CDN) handling unspecified
**Finding.** §15 talks about TCS only. The **margin-scheme GST** that was paid on the original sale also needs reversal: if filed → CDN; if not yet filed → cancellation. Current spec leaves this as "Tally manual reconciliation" (implied, not stated). At ₹X Cr/month sales volume this is unsustainable.

**Spec cite.** §15.
**Recommendation.** Lock: "`refundDeal` emits a `SALE_REVERSED` event consumed by Finance, which writes a CDN row to the GST register tagged to the original margin row. UI: Finance margin reconciliation table shows the original row + linked CDN row; net margin GST = original − CDN."

### 9. **[P1]** Refund — cost basis must be restored to inventory
**Finding.** A refunded vehicle re-enters inventory. The cost ledger that was consumed on SOLD must be **restored** so the next sale of the same VIN computes margin correctly. Memory `project_pre_p3_data_audit.md` already flagged that costLedger and SalesEvents disagree; refund flow risks compounding this.

**Spec cite.** §15 (no inventory restoration).
**Recommendation.** Lock: "On `refundDeal`, vehicles-store emits `RETURNED_TO_INVENTORY` event that re-activates the cost-ledger entries (or appends an inverse SOLD entry). Cross-module seam REGISTERED in `cross-module-wiring.md` BEFORE implementation."

### 10. **[P1]** Partial refund support undefined
**Finding.** §15 says `refundedAmount: refundDetails.refundedAmount` (free number) — implying partial refunds are mechanically possible, but there is no rule that `refundedAmount ≤ originalSalePrice`, no UI for partial-refund reasoning (DOA replacement at lower spec), and no story for partial GST/TCS reversal. Either lock partial refunds in or out.

**Spec cite.** §15 (`RefundBlockSchema`).
**Recommendation.** v1: lock to **full refunds only** — `refundedAmount === originalSalePrice` (validated by the store). Partial refunds = DEF-SALES-PARTIAL-REFUND-1 (P3) with explicit GST/TCS proportional-reversal rules.

### 11. **[P1]** E-invoicing / IRN / QR — SPEC-SALES-001 has no acknowledgement
**Finding.** Doc 13 §3 mandates IRP submission for B2B invoices > ₹50,000 (₹5 Cr+ turnover threshold for issuer — BN qualifies). The drift audit §5 already flagged this: `SoCompleteDialog` emits SOLD with no IRN field, no retry stub, no "P4 deferred" notice. Without IRN on a qualifying invoice the GSTR-1 will reject the row.

**Spec cite.** No mention anywhere.
**Recommendation.** Add §16 "E-invoicing": Lock `Deal.invoiceType` (concern #4) drives IRN routing. B2B invoice → SOLD payload includes `irnRequestPending: true` + Finance module's IRN worker stub. B2C / Bill-of-Supply → no IRN. v1 = stub with explicit "IRN — coming in P4" toast on SO complete; spec must say so explicitly to satisfy §17 production checklist.

### 12. **[P1]** Reservation token money — fully undefined
**Finding.** §3 says "RESERVED — deposit received (token ₹1,00,000+)" but the data model (§7) has no `tokenAmount`, no `tokenReceivedAt`, no `tokenRefundedAt`. There is no language on (a) GST treatment (advance against sale → 18%/margin GST applies on receipt?), (b) refund on `lost` / `RESERVATION_LOST` (Seam 47 force-override), (c) accounting trail (Tally voucher type — Receipt? Earnest deposit?), (d) what happens to the token when R19+ force-overrides per L_S-RES-1.

**Spec cite.** §3, §7, §13 (force override).
**Recommendation.** Either lock reservation token tracking IN — `Deal.token: { amount, receivedAt, instrumentRef, refundedAt? }` plus a `RESERVATION_TOKEN_RECEIVED` / `RESERVATION_TOKEN_REFUNDED` event pair consumed by Finance — or carve it OUT explicitly as DEF-SALES-TOKEN-1 with a "v1: token tracked manually in Tally; UI shows TOKEN PAID badge but no money flow" stub. Silent ambiguity in P1 is the worst option. Per Doc 06 §earnest-deposit, token is **not** a sale advance for GST purposes IF documented as forfeitable earnest money — this distinction must be explicit.

### 13. **[P1]** Force-override of reservation (R19+) — orphan token money path
**Finding.** L_S-RES-1 / §13 says force-override sets the conflicting deal to `stage='lost'` with `cancellationReason='MANUAL_CANCEL'`. If the conflicting deal was at `reserved` because a token was received, that token is now stuck. No refund pathway, no audit trail of the money implication.

**Spec cite.** §13.
**Recommendation.** Lock: "Force-override emits `TOKEN_REFUND_REQUIRED` finance task tied to the released deal's tokenAmount. Finance module's tasks tab surfaces it; no R19 force-override completes without acknowledging the token-refund task."

### 14. **[P1]** TCS line not visible to SA before confirm (drift-audit §5 P2 — finance-reviewer raises to P1)
**Finding.** Drift audit flagged this as P2 ("TCS line breakdown not shown to customer / in deal detail"). I am raising to P1: an SA confirming a sale of ₹85L without seeing "TCS = ₹85,000" on screen is a customer-trust event when the customer challenges the invoice ("you never told me about TCS"). Doc 14 R05 is responsible for accurate quoting.

**Spec cite.** §15 (no pre-confirm breakdown).
**Recommendation.** Lock: "`SoCompleteDialog` MUST render a money-breakdown card BEFORE the Confirm button: Sale Price, Cost Basis (R12+ only), Margin, Margin GST @18%, TCS @1% (with cumulative-FY context), Total Receivable. The customer-facing quote PDF (DEF-SALES-QUOTE-1, P3 from drift audit) must show the same lines."

### 15. **[P1]** Form 27D issuance to buyer — no UI / process
**Finding.** Income Tax Act §206C(5) requires issuing **Form 27D** (TCS certificate) to the buyer within 15 days of the end of the quarter. Sales spec is silent. Without it, the buyer cannot claim TCS credit, and the dealer is liable for a per-default penalty under §272A.

**Spec cite.** Not present.
**Recommendation.** DEF-SALES-FORM27D-1 (P4 — regulatory): Finance module emits Form 27D PDFs via the documents module; deal-detail surfaces the issuance status. P1 spec must at least name the obligation in §15 so the gap is visible.

### 16. **[P1]** Discount / haggling — no min-margin floor mentioned
**Finding.** SAs negotiate at the showroom. Spec says nothing about a floor below cost basis. SPEC-INVENTORY-AGING-001 L2 enforces a non-negotiable 5% min-margin floor for *suggested* drops; the same logic must apply to manual discounting at SO-complete time, otherwise R05 can sell below cost. Today: the SoCompleteDialog accepts any `salesOrder.amount`.

**Spec cite.** §15, §6.
**Recommendation.** Lock `L_S-PRICE-FLOOR-1`: "`SoCompleteDialog` enforces `finalPrice ≥ costBasis × 1.05` for R05–R10. Below-floor pricing requires R12+ override + reason text, captured on SOLD event payload. R19+ may override with no floor (e.g. trade-in promotion). Mirrors aging-module L2 + L6 + L18 patterns."

### 17. **[P1]** Quoted price vs final sale price — no audit trail
**Finding.** §6 has no concept of `quotedPrice`. WhatsApp template "Pricing Quote" sends a number with no record of what was quoted. If final sale ≠ quote, there is no compliance trail for the discount given. Doc 14 R10 is the discount-approver and needs evidence.

**Spec cite.** §6, §7.
**Recommendation.** Add `Deal.quotedPriceHistory: Array<{ amount, quotedAt, quotedByEmployeeId, channel }>`. Each WhatsApp / quote send appends. SO-complete shows quote-vs-final delta and routes through the discount-floor gate (#16).

### 18. **[P2]** Win-rate / revenue analytics — refund treatment undefined
**Finding.** §3 introduces `refunded` stage (separate from `lost`) but reports/win-rate semantics are not stated. Net revenue = sold − refunded? Win rate = sold / (sold + lost + refunded)? Unanswered → reports across modules will diverge.

**Spec cite.** §3, no §Reports section.
**Recommendation.** Lock: "Win rate denominator excludes `refunded` (treated as 'sold but reversed'); revenue is **net** (sold − refunded). Margin per deal is gross-of-refund; aggregate outlet margin is net-of-refund. Documented in §Reports cross-reference to SPEC-REPORTS-001."

### 19. **[P2]** Inter-outlet sales — GSTIN attribution not addressed
**Finding.** SPEC-FINANCE-001 L29 says each outlet has its own GSTIN. A car listed at BLR (29...) but sold to a Mumbai customer who pays/registers via MUM (27...) creates either an inter-outlet stock transfer (CST/IGST), or stays on BLR's GSTIN. Sales spec has no language on which outlet's GSTIN goes on the invoice.

**Spec cite.** §7 has `outlet: string` but no rules.
**Recommendation.** Lock: "`Deal.outlet` is the **selling** outlet (whose GSTIN appears on the invoice). If the vehicle's home outlet ≠ selling outlet, an inter-outlet stock-transfer event is emitted at SO-complete time → IGST applies between outlets per CGST §10. v1: hard-block cross-outlet sales (DEF-SALES-INTER-OUTLET-1, P3); v2 implement transfer voucher. P1 must explicitly block, not silently allow."

### 20. **[P2]** Locked-decision table missing — finance impact
**Finding.** Drift audit §2 flagged: "SPEC-SALES-001 has no L-tags table." §12 in v0.4 has only the W3 additions (L_S-RES-1, L_S-LOST-1, L_S-REFUND-1). All margin / TCS / IRN / token / inter-outlet / floor decisions above need to land as L-tags so future code reviewers can grep for drift per CLAUDE.md §14 / §16. Without L-tags, finance compliance cannot be auditable.

**Recommendation.** Mint at minimum: `L_S-MARGIN-1`, `L_S-COSTBASIS-0`, `L_S-NEGMARGIN-1`, `L_S-INVOICE-TYPE-1`, `L_S-PAN-1`, `L_S-TCS-CUMULATIVE-1`, `L_S-REFUND-CDN-1`, `L_S-IRN-1`, `L_S-TOKEN-1`, `L_S-PRICE-FLOOR-1`, `L_S-INTER-OUTLET-1`. Each cites SPEC-FINANCE-001 + Doc 06.

### 21. **[P2]** Finance-core dependency not declared in `depends_on`
**Finding.** Frontmatter `depends_on:` lists SPEC-PLATFORM-001 + SPEC-INVENTORY-002 only. SPEC-FINANCE-001 L10 is non-negotiable: all money math goes through `finance-core`. Sales must declare this dependency or it will diverge.

**Spec cite.** Frontmatter §depends_on.
**Recommendation.** Add `SPEC-FINANCE-001 (margin/TCS/rounding helpers via finance-core)`.

### 22. **[P3]** Lead-capture budget range — no budget-tier-based PAN nudge
**Finding.** The lead form (§5) collects budgetMin/budgetMax but doesn't use them. If `budgetMax ≥ ₹10L`, the form should soft-prompt for PAN at lead time (better than asking at SO-complete when the deal might fall through over the friction).

**Recommendation.** Concern #5's soft-gate at budgetMax ≥ ₹10L threshold. P3 polish.

### 23. **[P3]** Refund reason text length — privacy hygiene vs audit
**Finding.** §15 says `reason ≥ 30 chars` and `reasonLength` (not body) is in audit. Good privacy hygiene. But for finance audit (especially DOA where insurance recovery may apply), the reason body must be retrievable by R12+. Confirm an authorized retrieval path exists.

**Recommendation.** Note in §15: "Reason body is retrievable via finance audit log query, R12+ gated. Default audit-event payload omits body for privacy; full-body retrieval is logged as a PII access event per DPDP §8."

---

## Blockers

These MUST be resolved before SPEC-SALES-001 can transition to `approved` (see CLAUDE.md §6: finance-reviewer signoff required for any spec touching money/GST/TCS/e-invoicing/journals; this spec touches all five).

1. **Concern #1** — margin scheme not in spec. Without an L-tag binding SOLD events to `finance-core.computeMargin` + `costLedger`, `SoCompleteDialog` can ship with inline math that violates Doc 06 §GST.margin. Penalty event class.
2. **Concern #2** — orphan-record (`costBasis = 0`) policy. Today silently produces full-value GST. Hard regulatory failure.
3. **Concern #5** — buyer PAN not collected; #6 — cumulative-FY tracking missing. Both are §206C / §206CC compliance failures the moment a real >₹10L sale is processed.
4. **Concern #4** — invoice type (Bill of Supply vs margin Tax Invoice) unspecified. GSTR-1 will reject mismatched rows.
5. **Concern #11** — IRN / e-invoicing has no acknowledgement (not even a "P4 deferred" stub). Drift audit P1; raised here.
6. **Concern #12** — reservation token money is fully undefined. Cannot ship a sales pipeline with money-handling stage where money flow is not specified.

---

## Open questions

1. Is `customer-web` storefront's quote/estimate flow expected to share the same finance-core helpers as staff-web? (If yes, the finance-core package must be split out of `apps/staff-web` per SPEC-FINANCE-001 L10's "OR" clause.)
2. Doc 06 §GST.margin — is "allowable refurb" capped (recent CBIC clarification on Rule 32(5) suggests yes, parts/labour only, not transport). Sales spec must reference whichever interpretation Finance locks (SPEC-FINANCE-001 L1 doesn't elaborate).
3. For inter-state B2C sales (BLR vehicle, Mumbai resident customer), does margin-scheme GST become IGST or CGST+SGST? Doc 06 silence suggests place-of-supply = dealer's location (CGST+SGST always under §10(1)(c)). Confirm with CA before locking concern #19.
4. Customer Service Booking module + Custom Builds module both touch sales-style flows. Does refund/CDN handling here set the pattern they will inherit, or do those modules diverge?
5. Form 27D issuance (concern #15) — will it be in-house or via the existing TDS/TCS service vendor (Quicko, ClearTax)? Affects whether Finance module needs a PDF generator path or just a webhook stub.

---

## Signoff

```
signed-off: no
acknowledged-by-integrator: yes
```

**Integrator note (2026-05-07, v0.5):** All 6 P0/P1 finance blockers acknowledged. Resolutions: blocker #1 (margin scheme contract) → L_S-MARGIN-1 + DEF-SALES-MARGIN-1 (finance-core.computeMargin in SoCompleteDialog, `acquisitionCostSnapshot` captured at QUOTED). Blocker #2 (orphan cost-basis) → L_S-COSTBASIS-0 + DEF-SALES-COSTBASIS-0 (hard-block + R12 override with reason on SOLD payload). Blocker #3 (PAN + cumulative TCS) → L_S-PAN-1 + L_S-TCS-CUMULATIVE-1 + DEF-SALES-PAN-1 + DEF-SALES-TCS-CUMULATIVE-1 (lead-capture soft-gate at budgetMax≥₹10L, SO hard-block at finalPrice>₹10L, §206CC 5% fallback, cumulative-FY chip). Blocker #4 (invoice type) → L_S-INVOICE-TYPE-1 + DEF-SALES-INVOICE-TYPE-1 (Bill-of-Supply for B2C, margin Tax Invoice for B2B with Rule 32(5) legend). Blocker #5 (IRN) → L_S-IRN-1 + DEF-SALES-IRN-1 (P1 stub + toast; P4 real IRP). Blocker #6 (token) → L_S-TOKEN-1 + DEF-SALES-TOKEN-1 (token aggregate as earnest deposit, RECEIVED/REFUNDED events, TOKEN_REFUND_REQUIRED on override). Concerns #3, #7–#10, #14–#19 closed via L_S-NEGMARGIN-1, L_S-REFUND-CDN-1, L_S-PRICE-FLOOR-1, §15.2 Form 27D, L_S-INTER-OUTLET-1. Concern #20 (L-tags missing) closed by minting all 11 in §12. Concern #21 (depends_on) closed: frontmatter now lists SPEC-FINANCE-001. Status held at `in-review` pending P1 implementation.

**Rationale.** Six P0 / P1 blockers (margin scheme contract missing, orphan-cost-basis policy missing, PAN/cumulative-TCS gaps, invoice-type undefined, IRN unaddressed, reservation token undefined) span the full money flow of the module. Each is a penalty-event class issue under Doc 06 / IT Act §206C / Doc 13 §3. Spec must add the L-tags listed in concern #20, declare the SPEC-FINANCE-001 dependency (concern #21), and resolve concerns #1–#6, #11, #12 before signoff.

The integrator should NOT promote `in-build → shipped` until at minimum P0/P1 concerns land in the spec. The currently-shipped code (`SoCompleteDialog`) has working TCS @1% on `finalPrice > ₹10L` and `MARGIN_SCHEME` flow tagging — both pass at the row level — but the gaps above are spec-level: future code changes will drift without the L-tags.
