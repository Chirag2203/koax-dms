# 08 · Open Questions & Risks

Decisions still needed from business leadership before design sprint can commit to scope, and a risk register for the engineering / product team to price in from Day 1. Every item here has an impact line so a stakeholder can weight it quickly.

---

## 1. Decision checklist for stakeholders (work through this week)

### Q1 — Certification program identity
**Question:** Will we brand our own CPO program (e.g., "[Brand] Assured Luxury") as our primary trust anchor, or ride on the OEM program (BMW Premium Selection, Audi Approved Plus, Porsche Approved) pass-through when the car comes from that OEM channel? Or a hybrid?

**Why it matters:** Affects warranty underwriting (us vs OEM), certificate design, inspection point count branding, marketing copy, and customer messaging across the storefront and VDP.

**Default if unanswered:** Own-brand CPO with 180-point program; OEM program noted as secondary badge where applicable.

**Impact on build:** Medium. Affects certification module, storefront copy, warranty data model.

---

### Q2 — Workshop: in-house in every city, or partner network?
**Question:** Will we operate in-house workshops in every outlet city from Day 1, or rely on brand-authorized partner workshops in some cities initially?

**Why it matters:** Determines bay counts, tech hiring plan, tool/diagnostic license budget per city, and the DMS design for partner-routing workflow (if partner network, we need partner management, SLA tracking, and payout logic).

**Default if unanswered:** In-house in every outlet city (brief implies this); partner fallback only for body shop.

**Impact on build:** High. Changes service module scope, parts distribution strategy, technician certification plan.

---

### Q3 — New car franchise rights anywhere?
**Question:** Are we also a franchised new-car dealer for any OEM in any city, or pure pre-owned?

**Why it matters:** If franchised, OEM DMS integration (BMW ProConsul, Audi retail.X, Porsche PCSS) becomes a mandatory design input, not an option. Franchise brings factory-feed data, warranty claim integration, dealer-audit compliance, and target-setting obligations.

**Default if unanswered:** Pure pre-owned; no OEM DMS integration.

**Impact on build:** High if franchised; changes architecture and integration scope materially.

---

### Q4 — Consignment as a revenue line?
**Question:** Do we take cars on consignment (owner keeps title; we market for a fee; payout on sale), in addition to outright acquisition?

**Why it matters:** Consignment requires distinct title tracking, AP workflow, escrow-like payout logic, and GST treatment that differs from margin scheme. It affects quote engine, invoice engine, AR/AP, and reporting. Big Boy Toyz does consignment; if we want to match their sourcing breadth, yes. If we want simpler books, no.

**Default if unanswered:** Not in v1.0; plan as v1.5 addition pending commercial decision.

**Impact on build:** High. Adds a parallel workflow through sales, inventory, and finance.

---

### Q5 — Target ASP and margin targets
**Question:** What's the target average selling price, target gross margin per car, and target mix (entry luxury vs mid vs top)?

**Why it matters:** Drives feature-complexity ROI: AI pricing optimization, multi-partner finance aggregation, loyalty/events — all must be justified against realistic per-unit gross margin. Industry benchmark for Indian luxury pre-owned is 4–8% gross margin.

**Default if unanswered:** Assume ASP ₹40–60L, GM 6–8%. Designs proceed with conservative feature complexity.

**Impact on build:** Medium. Influences pricing engine, finance integrations, loyalty scope.

---

### Q6 — Outlet count and cities for year 1
**Question:** How many outlets open on Day 1 vs 6 months vs 12 months? Which specific cities?

**Why it matters:** Each state = separate GSTIN = separate GST return = separate configuration in the DMS. Cities determine bay counts, brand certification roster, regional language UI priority, logistics design.

**Confirmed 2026-04-15:** 3 outlets at go-live — Bangalore (KA), Mumbai (MH), Chennai (TN); expand to 7 over 12 months.

**Impact on build:** Medium. Multi-state GST setup complexity scales with state count.

---

### Q7 — Finance partner list for v1
**Question:** Which specific finance partners (HDFC, ICICI, BMW FS, Porsche FS, Bajaj Finserv, BMW India Financial Services, Audi Finance) are in v1 scope? Do we have their API maturity assessed?

**Why it matters:** Drives deal-desk scope, pre-approval flow, and invoice-to-financier AR sub-ledger. For luxury buyers, OEM captives (BMW FS, Porsche FS, Audi Finance) are highly relevant if the brand applies; NBFC-friendly partners like Bajaj Finserv are volume-friendly.

**Default if unanswered:** v1 ships with "request callback" for finance; v1.5 adds soft-pull with 1–2 volume partners.

**Impact on build:** Medium. Influences CRM/deal desk design.

---

### Q8 — Tally integration priority and method
**Question:** Is Tally the accepted accounting system for Day 1, or should we offer Zoho Books as first-class alternative? If Tally, is it Tally ERP 9 (XML-TCP) or Tally Prime (API)?

**Why it matters:** Tally ERP 9 is the older but more common install base; Tally Prime is the newer and more API-friendly. The data contract is similar; the transport differs. Forcing migration to Zoho would antagonize accounting staff.

**Default if unanswered:** Tally-first (assume Tally Prime); Zoho as v1.5 alternative.

**Impact on build:** Low-medium. Integration module design.

---

### Q9 — Body shop in scope?
**Question:** Do we operate an in-house body/paint shop, or only mechanical service in v1?

**Why it matters:** Body shop adds accident-claim coordination, insurance surveyor workflow, paint booth scheduling, panel-by-panel labor tracking — a meaningful module addition. Luxury paint work is capital-intensive; many dealers partner out.

**Default if unanswered:** Mechanical-only in v1; body shop v1.5 if commercial plan includes it.

**Impact on build:** Medium. Adds a dedicated service sub-module.

---

### Q10 — Warranty reserve model
**Question:** What % of sale price do we reserve for in-house CPO warranty liability? Will an actuary model this, or start with heuristic?

**Why it matters:** Reserve is a real liability on books; under-reserving hides future claims; over-reserving starves cash. Industry range 1.5–3% of sale for 2-year powertrain-focused warranty on luxury.

**Default if unanswered:** 2% of sale, reviewed quarterly after 12 months of claims data.

**Impact on build:** Low. Finance module config.

---

### Q11 — Courtesy car fleet capex
**Question:** Fleet size, brands, ownership vs lease, who pays for loss/damage?

**Why it matters:** Luxury customers expect a brand-appropriate loaner. 5–10 vehicles across outlets is industry norm. Capex is ₹2–5 crore; operating cost meaningful. DMS models the fleet regardless of ownership structure.

**Default if unanswered:** Plan for 2 loaners per outlet at go-live; lease preferred.

**Impact on build:** Low. Courtesy car module config.

---

### Q12 — Data residency and future international expansion
**Question:** Do we anticipate international expansion (Gulf, SE Asia) in 3–5 years? If so, data architecture must plan for multi-region segregation now.

**Why it matters:** Retrofitting multi-region is expensive. DPDP mandates India residency; GCC mandates vary (UAE PDPL, KSA PDPL). If expansion is real, design with tenant-country as partitioning dimension from Day 1.

**Default if unanswered:** India-only; revisit at 24 months.

**Impact on build:** Low if India-only; high if expansion is confirmed.

---

## 2. Risk register

Each risk is rated on **Probability (Low / Med / High)** and **Impact (Low / Med / High / Critical)**, with a mitigation direction.

### R1 — GST margin-scheme misapplication
- **Probability:** Medium at MVP; Low after tax counsel review
- **Impact:** Critical (legal exposure, retrospective tax liability, penalties)
- **Mitigation:** Tax counsel reviews product logic before any public go-live; golden-file regression tests for tax computation; quarterly counsel-reviewed audits; clear UI disclosure to customer

### R2 — DPDP Act 2023 non-compliance
- **Probability:** Medium — law is new, enforcement is evolving
- **Impact:** High (fines up to ₹250 crore per breach)
- **Mitigation:** Architecture-level design (consent ledger, retention, DSR, DPA, encryption); DPO designated; privacy-first reviews during sprint planning; external privacy audit pre-go-live

### R3 — WhatsApp template approval latency
- **Probability:** High (6–10 week timeline is typical per Meta)
- **Impact:** Medium (delays comms rollout; workarounds via SMS transitional)
- **Mitigation:** Start Meta approval flow with BSP on project Day 1; parallelize with dev; SMS fallback path always present

### R4 — Tally single-writer bottleneck
- **Probability:** High if accountant runs Tally on single desktop
- **Impact:** Medium (sync latency; potential missed syncs)
- **Mitigation:** Serialize Tally writes via queue; offer Tally Prime + cloud connector as upgrade; document manual-intervention runbook

### R5 — OEM diagnostic tool licensing cost shock
- **Probability:** Medium — easy to under-budget at planning
- **Impact:** Medium (₹25–60 lakh/year opex for multi-brand shop across outlets)
- **Mitigation:** Factor into opex plan; phase tool rollout (start with most-serviced brands); multi-brand fallback via Bosch/Launch for non-brand-locked work

### R6 — Courtesy car fleet capex under-estimation
- **Probability:** Medium
- **Impact:** Medium (CX gap on launch if fleet insufficient)
- **Mitigation:** Commit fleet capex in business case; lease options evaluated; staged launch with smaller fleet + SLA communicated honestly

### R7 — Inbound data quality (RC / insurance / service history)
- **Probability:** High — this data is genuinely messy
- **Impact:** Medium (operational friction; buyer trust risk if disclosed wrong)
- **Mitigation:** Plan for human-in-the-loop OCR review; invest in standard operating procedures; explicit "condition disclosure confidence" levels on VDP where data is thin

### R8 — IRP (e-invoicing) downtime
- **Probability:** Low-medium (occasional but real)
- **Impact:** Medium (delayed invoice generation; customer wait)
- **Mitigation:** Queue with retry; business continuity plan (temporary manual invoice with later IRN generation per CBIC guidelines); monitoring + alerts

### R9 — GSP vendor lock-in
- **Probability:** Low-medium
- **Impact:** Medium (switching cost if chosen GSP underperforms)
- **Mitigation:** Wrap GSP in adapter interface; evaluate 2+ GSPs (ClearTax, IRIS, Taxilla) before committing; contractual termination clauses

### R10 — Key person dependency (tax / tech / workshop)
- **Probability:** Medium
- **Impact:** High
- **Mitigation:** Documentation first-class deliverable; cross-training; recorded decision log; vendor/consultant redundancy for tax and tool licensing

### R11 — Scope creep during MVP
- **Probability:** High
- **Impact:** High (schedule slip, quality erosion, team burnout)
- **Mitigation:** Doc 02 feature matrix is the change-control baseline; deviations require explicit stakeholder decision with impact analysis; biweekly backlog grooming against matrix

### R12 — Photo / video storage cost escalation
- **Probability:** Medium
- **Impact:** Low-medium (opex creep)
- **Mitigation:** S3 lifecycle policies from Day 1 (IA after 30d, Glacier after 90d for archival); image compression pipeline; video retention policy agreed with ops

### R13 — Third-party SDK / API breaking change
- **Probability:** Medium (Razorpay, BSP, NSDL periodically change contracts)
- **Impact:** Medium (production issue if not caught)
- **Mitigation:** Contract tests for integrations; subscribe to vendor change announcements; wrap all integrations in adapter layer

### R14 — Multi-outlet data leakage (RBAC failure)
- **Probability:** Low-medium (if RLS is not enforced)
- **Impact:** Critical (regulatory + reputational)
- **Mitigation:** Postgres RLS mandatory on all outlet-partitioned tables; automated tests verify isolation; penetration test specifically probes cross-outlet access

### R15 — Warranty reserve under-funding
- **Probability:** Medium in first 12 months (no claims history)
- **Impact:** Medium (P&L hit if claims exceed reserve)
- **Mitigation:** Conservative initial reserve (2%); quarterly actuarial review; reinsurance option for catastrophic coverage

### R16 — Franchise / OEM relationship changes
- **Probability:** Low-medium
- **Impact:** Medium (certification badge rights, access to OEM data)
- **Mitigation:** Decouple DMS from any specific OEM dependency; design for graceful degradation if OEM relationship changes

### R17 — Indian rupee / Euro currency volatility on parts imports
- **Probability:** High over multi-year horizon
- **Impact:** Low-medium (COGS variability)
- **Mitigation:** Landed-cost tracking per shipment; pricing-engine refresh when input costs move materially; hedging only for very large import commitments

### R18 — Team hiring timeline
- **Probability:** Medium
- **Impact:** High (schedule slip if core hires delayed)
- **Mitigation:** Start hiring immediately for tech lead + 3 seniors; parallelize with initial architecture work; contingency via vetted consultancy partner

---

## 3. Compliance / legal checklist (pre-go-live)

Must all be signed off before first public sale transaction:

- [ ] Tax counsel sign-off on margin-scheme GST computation logic
- [ ] Tax counsel sign-off on TCS workflow
- [ ] Tax counsel sign-off on e-invoicing implementation against current IRP schema
- [ ] DPDP-trained legal counsel sign-off on consent flows, retention policy, DSR portal, DPA templates
- [ ] Privacy audit / pen test report addressed
- [ ] Chosen KYC partner's sub-KUA approval obtained
- [ ] WhatsApp BSP + Meta template approvals confirmed
- [ ] RBI payments compliance review (if relevant for any token-handling escrow patterns)
- [ ] DLT registration for SMS templates completed
- [ ] Dealer-license + GST registration complete for every outlet (business prerequisite, not our scope but gating)
- [ ] Fire / safety clearance for workshop operations (business, gating)
- [ ] Commercial insurance for test drives and loaner cars (business, gating)
- [ ] Employment / HR policy aligned with latest Indian labor codes

---

## 4. Sign-off and next steps

This document should be walked through with business leadership (CEO, COO, Finance Head) in one working session. Decisions captured as annotations on each Q1–Q12; any default accepted explicitly.

Once Q1–Q12 are answered:
1. Update Doc 02 feature matrix to reflect decisions
2. Update Doc 07 architecture for any structural changes (OEM DMS integration, multi-region, etc.)
3. Tax counsel engaged for R1 and pre-go-live compliance checklist
4. Privacy counsel engaged for DPDP architecture review
5. Tech lead hired or confirmed
6. Sprint 0 begins: Phase 0 deliverables from Doc 07 §15

No design sprint or engineering commitments should firm up until Q1–Q5 at minimum are closed.
