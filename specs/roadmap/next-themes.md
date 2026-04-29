---
spec_id: PLAN-ROADMAP-001
title: Next-themes roadmap (post-2026-04-29 module-completeness pass)
domain: roadmap
status: open-for-pick
risk_level: low
pii_sensitivity: none
flags: [roadmap]
owners: [orchestrator]
created: 2026-04-29
related_specs:
  - SPEC-VEHICLES-001
  - PLAN-VEHICLES-003
  - SPEC-CUSTOMERS-001
  - SPEC-INSURANCE-001
  - SPEC-CUSTOM-BUILDS-001
  - SPEC-STAFF-001
  - SPEC-CUSTOMER-PORTAL-001
  - SPEC-CUSTOMER-PORTAL-002
  - SPEC-ARCH-UI-001
---

# Next-themes roadmap — post-2026-04-29

After the 2026-04-29 multi-session push (5 modules shipped, foundational specs locked, ~940 tests green, canonical UI patterns documented), the product has a strong **transaction surface** but is missing the **operational backbone**, the **revenue funnel**, and several **CX differentiators**. This doc enumerates all 4 candidate themes the orchestrator proposed; pick one (or items across themes) in a new session.

## State of the product (as of 2026-04-29)

**Modules shipped (with specs + tests):**
- Vehicles (3 specs: 001 base + 002 onboarding + 003 P3 sales/docs/costs)
- Customer 360 (v1.1 — lifecycle/segment/aadhaar/referral/consent log)
- Insurance (v1.x — leads, quotes, marketing, AI calling stub, audit, commission)
- Custom Builds (v2.x — kanban, 3D visualizer, parts, vendors, customer preview)
- Staff Management v0.2 (directory, leaves admin, exit workflow, salary, attendance)
- Customer Service Booking (book + list + status tracker)
- Customer Portal v1.0 (8 pages, account home, vehicles, bookings, documents, preferences)

**Specs / architecture docs:**
- `SPEC-ARCH-UI-001` — canonical UI patterns
- `specs/architecture/cross-module-wiring.md` — 17 module seams
- `specs/architecture/fixture-coverage-audit.md` — single-source-of-truth audit

**Stubs that need filling (today's gap):**
- `/reports`, `/finance`, `/notifications`, `/settings` — all stub pages, no real views
- Lead-intake side of sales funnel (deals exist but no enquiry/lead capture)
- Storefront filters + advanced search (single-list today)
- Reviews / NPS surface
- GST returns + e-invoicing wiring

**What's strong:**
- 5 production-grade modules with full RBAC, fixtures, audit trails, and tests
- Canonical UI patterns enforced across modules
- DPDP + IRDAI + GST margin scheme primitives in place
- Cross-module wiring solid (17 seams documented)
- 940+ tests, both apps typecheck clean

**What's missing:**
- The views leadership uses to **run the business** (Theme A)
- The funnel that brings **revenue in** (Theme B)
- The differentiators that **delight customers** (Theme C)
- The **regulatory hardening** that makes this deployable (Theme D)

---

## Theme A — "Run the business" (operational backbone)

These are stub pages today. Without them the rest is orphaned: leadership cannot see across modules, finance cannot reconcile, and operators cannot configure.

**Why this theme first:** A 3-outlet luxury car business with a DMS that doesn't show outlet P&L stops being used within a week. This theme moves the product from "demo" to "deployable".

| # | Item | What | Where | Why | Effort |
|---|---|---|---|---|---|
| A1 | **Reports & Analytics dashboards** | Outlet P&L card, sales velocity (cars/week per outlet), inventory aging histogram, service turnaround SLA, parts margin %, insurance attachment rate, CPO conversion. CXO/GM/CFO views per Doc 14 (R19, R22, R24). Card grid layout per canonical UI spec; data drawn from existing `vehicles-store`, `sales-store`, `service-store`, `insurance-store`, `parts-store` (read-only). | `apps/staff-web/app/(shell)/reports/page.tsx` (currently stub) + new `src/components/reports/*` | **The single highest-impact build.** Leadership cannot run a 3-outlet business without this. Unlocks ~6 personas with RBAC defined but no screens. | ~2 days |
| A2 | **Finance module** | GST margin-scheme reconciliation table (sales → margin → GST liability per Doc 06 §GST.margin), TCS register (1% on > ₹10L sales per L5), vendor invoice tracking (custom-builds parts + service consumables), customer ledger (per-customer running balance), journal-entry preview ready for export to Tally Prime. | `app/(shell)/finance/page.tsx` (stub) + new `src/components/finance/*` + `src/lib/finance/*` | India regulatory compliance is binary. Margin-scheme miscalculation = penalty. Closes the gap between sales/cost events and Tally GL. | ~3 days |
| A3 | **Notifications module** | Central log + DLT template registry. Each entry: channel (WhatsApp/SMS/email), template id, recipient, status (queued/sent/delivered/failed), payload variables, sent timestamp. Filter by module (insurance, custom-builds, service-booking, sales). Per Doc 09 §DLT + Doc 13 §WhatsApp BSP. Insurance already has its own marketing slice — consolidate so other modules use one pipe. | `app/(shell)/notifications/page.tsx` (stub) + new `src/components/notifications/*` + `src/lib/notifications/notifications-store.ts` | Single source of truth for outbound comms. Today each module logs comms in its own slice; consolidating prevents drift and makes DPDP audit (DSR fulfillment) tractable. | ~1 day |
| A4 | **Settings module** | Outlet config (BLR/MUM/CHE addresses, GSTINs, manager assignments), RBAC permissions UI (read-only matrix per Doc 14 in v1, edits in v2), integration credentials (WhatsApp BSP, SMS DLT vendor, IRP for e-invoicing — mocked in v1), feature flags surface (currently scattered across `flags:` frontmatter). | `app/(shell)/settings/page.tsx` (stub) + new `src/components/settings/*` | Product needs a place to configure things that aren't business data. Today everything is hardcoded in fixtures. | ~1 day |

**Theme A total: ~7 days agent-time = ~3 hours orchestration.**

**Pick this theme if:** the next priority is making the product genuinely deployable to a real BN Automobiles outlet.

**Spec references:** Doc 06 (Finance, Tax, Employee), Doc 13 (Integration Contracts), Doc 14 (Role / Permission Matrix).

---

## Theme B — "Sell more cars" (revenue funnel)

The sales-deals Kanban exists but the **front of the funnel is missing**. There's no way to capture a lead, score it, hand it to an advisor, or run the test-drive flow that converts to a sale.

**Why this theme:** Directly drives revenue. Per Doc 04 §sales, lead intake → test drive → quote → SO is the canonical journey. We have the back half (SO + delivery in PLAN-VEHICLES-003 P3) but not the front half.

| # | Item | What | Where | Why | Effort |
|---|---|---|---|---|---|
| B1 | **Lead → Sale conversion funnel** | Web-form lead intake (storefront → staff `/leads/new`), walk-in capture (staff-only quick form), referral tracking (uses existing `referredBy` field on Customer). Lead scoring (cold/warm/hot heuristic from interaction count + recency). Lead-detail view with assigned advisor, next-action timer, link to test drive + quote + SO. Stage Kanban: NEW → CONTACTED → QUALIFIED → TEST_DRIVE → QUOTED → SO_RAISED → DELIVERED / LOST. | New module: `app/(shell)/leads/`, `src/components/leads/*`, `src/lib/leads/leads-store.ts`, `packages/types/src/domain/lead.ts` | Closes the gap between Doc 04 §sales spec (which describes lead intake fully) and the shipped sales-deals store (which assumes a deal already exists). | ~3 days |
| B2 | **Test-drive booking flow** | Customer-portal initiates (vehicle → "Book test drive" CTA → date/slot/outlet) → staff confirms slot in advisor's calendar → on-day execution checklist (license verified, fuel level, odometer pre/post, route notes) → post-drive feedback (interest level, follow-up cadence). Wires into B1 funnel as the TEST_DRIVE stage transition. | New: `app/(portal)/test-drive/`, `app/(shell)/test-drives/`, `src/components/test-drive/*`, `src/lib/test-drive/test-drive-store.ts` | Major CX moment for ₹50L cars. The test drive IS the sale for luxury — botching this loses the deal. | ~1.5 days |
| B3 | **Inventory aging + pricing intelligence** | Per-VIN listing-age chip on Sales tab (amber ≥90d, red ≥180d — already locked in PLAN-VEHICLES-003 L23). Add a Reports view that lists all aged inventory with suggested price drop based on (a) days listed, (b) competitor scrape data (mocked from a static fixture), (c) cost basis (margin guardrail — never suggest a price below cost + min-margin %). R10+ to apply suggestion via a new `applySuggestedPriceDrop(vin, newPrice, reason, actor)` action. | Extends `vehicles-store` + new `src/components/vehicles/aging-pricing/*` + Reports surface (overlaps with A1) | Inventory carrying cost in luxury is high (depreciation + insurance + space). Sitting > 6 months destroys margin. Per Doc 01 BBT/Porsche Approved benchmark. | ~1 day |
| B4 | **Service-to-sale loop** | When a customer's vehicle (a) is in Service AND (b) is older than 5 years OR mileage > 70,000 km OR has an open recall, surface to the SA: "This customer is upgrade-ready." Triggers a sales-follow-up CTA on the JC detail view → creates a lead in B1 with stage NEW + source `'SERVICE_UPGRADE'`. Tracked metric on the Reports dashboard: service→sale conversion rate. | Cross-module wiring: service module's JC detail → leads store (B1 dependency) | The differentiator vs cheaper competitors. Doc 01 §1: "the sale happens once; service happens for years" — closes the upgrade loop. Doc 05 §1 guiding principle. | ~1 day |

**Theme B total: ~6.5 days agent-time. Depends on Theme A1 (Reports) for the dashboard surface.**

**Pick this theme if:** the next priority is increasing top-of-funnel conversion. Best paired with at least A1 from Theme A so the metrics are visible.

**Spec references:** Doc 04 §sales (lead → SO journey), Doc 01 §benchmarking (BBT, Porsche Approved patterns).

---

## Theme C — "Customer love" (CX differentiation)

Luxury pre-owned competes on **trust + experience**, not price. Today the customer surface is functional but not delightful. These are the moments that move a buyer from "shopping" to "loyal".

**Why this theme:** Doc 03 §CX calls out specific differentiators. Reviews + photo-shoot quality + portal documents vault + advanced search are competitive table stakes for luxury, currently missing or stubbed.

| # | Item | What | Where | Why | Effort |
|---|---|---|---|---|---|
| C1 | **Storefront filters + advanced search** | Faceted filter sidebar: price range slider, year range, fuel (petrol/diesel/EV/hybrid), transmission (auto/manual), mileage range, body style (sedan/SUV/coupe/convertible), color (with swatch picker), CPO-only toggle, outlet (BLR/MUM/CHE/all-pan-india). Saved searches (logged-in customers). Side-by-side compare (up to 3 vehicles, full spec table + price + photos). Active filter chips with clear-each + clear-all. URL-driven (`?priceMin=&priceMax=&fuel=` etc). | `apps/customer-web/app/(storefront)/inventory/page.tsx` (currently single-list) + new `src/components/storefront/filters/*` + `src/components/storefront/compare/*` | Today storefront browse is a flat list. Luxury buyers cross-shop and need to filter. Compare is the conversion accelerator. | ~2 days |
| C2 | **Customer portal documents vault** | RC, insurance, PUC, warranty, invoices, custom-build quotes — all viewable + downloadable. Each download triggers DPDP `purpose` prompt (per L13 staff-side categories) and writes a `DocumentAccessEvent` (already-built stream). Dropbox-style file list with type icons + "uploaded by" + date + expiry chip (insurance/PUC nearing expiry → amber chip). Wires to existing staff `documents-store`. | `apps/customer-web/app/(portal)/documents/page.tsx` (currently basic list) — upgrade to full vault | Trust signal. A luxury customer expecting concierge-level service should never have to call to ask for their RC copy. | ~1 day |
| C3 | **Reviews & ratings (post-delivery + post-service)** | Internal NPS capture: 24h after delivery, customer gets a portal notification "How was your experience?" → 1-question NPS (0–10) + free-text. Same after every service (24h after `READY_FOR_DELIVERY`). Public review surface on storefront VDP: top 3 most recent + aggregate stars. Staff-side: review moderation queue (R10+ approves before public; R02+ can hide). NPS dashboard tile on Reports (A1). | New: `packages/types/src/domain/review.ts`, `apps/customer-web/app/(portal)/reviews/*`, `apps/customer-web/src/components/storefront/reviews-section.tsx`, `apps/staff-web/src/components/reviews/moderation-queue.tsx` | Reviews are the #1 trust signal for luxury pre-owned. BBT and Porsche Approved both heavily promote owner reviews. We currently have zero. | ~1.5 days |
| C4 | **Photo/video shoot scheduling** | After a vehicle is acquired (`ACQUIRED` event) → auto-creates a "shoot pending" task in a new `/shoots` route. Photographer assignment (R11 Marketing role per Doc 14). Shoot completion gates the LISTED transition (cannot list a vehicle without ≥10 photos + 1 video — locked rule). Shoot detail: photographer, scheduled-at, completed-at, asset count, asset URLs (mocked S3 paths). | New: `app/(shell)/shoots/`, `src/components/shoots/*`, `src/lib/shoots/shoots-store.ts`, extends `packages/types/src/domain/vehicles.ts` with `shootStatus` field | Doc 04 mentions but never built. Today vehicles list with placeholder photos — this is a polish vector that costs nothing to build but elevates the storefront feel. | ~1 day |

**Theme C total: ~5.5 days agent-time. Independent of Theme A; can run in parallel.**

**Pick this theme if:** the next priority is making the product feel premium for buyers/owners — the "wow" pass.

**Spec references:** Doc 01 §benchmarking, Doc 03 §CX, Doc 04 §marketing (shoots).

---

## Theme D — "Compliance hardening" (regulatory)

Necessary but unsexy. Skip until needed for production rollout. India regulatory environment is unforgiving — these become hard blockers when going live.

**Why this theme:** Without these, the product cannot be deployed to a real outlet. They're spec'd in the canonical docs but never built. Each is a binary regulatory check.

| # | Item | What | Where | Why | Effort |
|---|---|---|---|---|---|
| D1 | **GST returns prep** | GSTR-1 export (outward supplies — sales events with margin-scheme breakdown), GSTR-3B export (summary returns), per-month CSV download per outlet GSTIN. Read-only views, no real GSTN filing in v1 (manual upload by accountant). Audit trail: every export logged with actor + timestamp + period. | New: `apps/staff-web/app/(shell)/finance/gst-returns/*` (depends on A2 Finance module) + `src/lib/finance/gst-returns/*` | Doc 06 §GST. Quarterly filing is mandatory; manual prep today is error-prone for margin-scheme. | ~2 days |
| D2 | **E-invoicing IRN+QR** | IRP integration (mocked in v1 — fixture handler returns IRN+QR after 200ms delay). Auto-fires on every B2B invoice above threshold (₹50,000 per Doc 13 §3). Retry policy (3 attempts, exponential backoff). Failed IRN fetch triggers a Notifications entry (Theme A3). Invoice PDF embeds IRN as text + QR code (use existing canvas-based QR lib if any, else a static SVG QR fixture). | New: `apps/staff-web/app/api/irp/route.ts` (mock handler) + `src/lib/finance/e-invoicing/*` + integrates with sales SOLD event | Doc 13 §3. Mandatory for B2B above threshold. Without IRN on invoice, the buyer cannot claim ITC. | ~1.5 days |
| D3 | **DPDP DSR fulfillment dashboard** | Track Data Subject Requests (access, erasure, portability, correction) per DPDP Act 2023 §11–13. Each request: customer, type, raised-at, due-at (30 days SLA), status, fulfilled-at, fulfilled-by, proof-doc-id. Dashboard for R23 DPO with SLA timer chips (green > 7 days remaining, amber 3–7, red < 3). One-click "Generate access bundle" (PDF export of all customer data). One-click "Initiate erasure" (calls existing `forceRevoke` + redacts profile fields). | New: `app/(shell)/dpdp/`, `src/components/dpdp/*`, `src/lib/dpdp/dsr-store.ts`, `packages/types/src/domain/dsr.ts` | DPDP Act 2023 mandates 30-day SLA on DSR fulfillment. Without a tracking dashboard, fulfillment is ad-hoc and audit-fragile. R23 DPO has no surface today. | ~1.5 days |

**Theme D total: ~5 days agent-time. Depends on Theme A2 (Finance) for D1+D2.**

**Pick this theme if:** the next priority is moving from demo-grade to production-deployable. Trigger this theme **before any pilot outlet rollout**.

**Spec references:** Doc 06 §GST, Doc 13 §3 (E-invoicing), Doc 13 §Aadhaar (sub-KUA), DPDP Act 2023.

---

## How to pick

### Recommended sequencing

The themes naturally chain:

```
Theme A (operational backbone) ──┬─→ Theme B (revenue funnel)
                                  └─→ Theme D (compliance hardening)
Theme C (CX differentiation) ── independent, can run anytime
```

- **A1 (Reports)** unlocks the dashboards every other theme references — build it first regardless.
- **A2 (Finance)** unlocks **D1 + D2** (GST returns + e-invoicing both depend on the finance reconciliation surface).
- **B1 (Leads)** unlocks **B2 + B3 + B4** (test drive, aging-pricing, service-to-sale all hand off to leads as the funnel root).
- **Theme C** has no dependencies — best filler when waiting on Theme A's data integration.

### Single-theme picks (if only one slot)

| If you want… | Pick | First item |
|---|---|---|
| The product to feel deployable | **Theme A** | A1 Reports |
| To increase top-of-funnel revenue | **Theme B** (preceded by A1) | B1 Lead funnel |
| To delight buyers + owners | **Theme C** | C1 Storefront filters |
| To be production-rollout-ready | **Theme D** (preceded by A2) | D1 GST returns |

### Cross-theme picks (cherry-pick high-value items)

If you want a balanced sprint that touches all four themes:
- **A1** (Reports) — leadership pulse
- **B1** (Lead funnel) — top of revenue funnel
- **C1** (Storefront filters) — buyer-side wow
- **D3** (DSR dashboard) — compliance hygiene without the GST/IRN heavy lift

That's ~7.5 days agent-time and lands one big-impact item per theme.

### How a new session picks up this doc

In a fresh Claude session, the user can say:
- "Build Theme A from `specs/roadmap/next-themes.md`" — orchestrator dispatches A1→A2→A3→A4 in sequence
- "Build A1 + B1 + C1 + D3 cherry-pick" — orchestrator dispatches in parallel where independent
- "Tell me what's in Theme B" — orchestrator reads this doc and re-summarizes

The orchestrator should:
1. Read this file in full at session start
2. Confirm the user's pick
3. For each item: write a sub-spec at `specs/modules/<module>/NN-<slug>.md` with frontmatter, scenarios, AC
4. Dispatch implementation agents per the agent-pipeline rules in `~/.claude/CLAUDE.md`
5. Update this file's "Decision log" section below as items move from `open-for-pick` → `in-build` → `shipped`

---

## Decision log

| Date | Picked | Outcome | Notes |
|---|---|---|---|
| 2026-04-29 | _none yet_ | — | Doc created. Awaiting user pick. |
| 2026-04-29 | **Theme A (all 4 items)** | **Shipped** — A1 Reports, A2 Finance, A3 Notifications, A4 Settings | 4 specs (3,735 lines, 85 L-tags, 64 scenarios) + 4 implementations. **+294 staff-web tests** (909→1203). Both apps typecheck clean. Commits `bb0ccc1` (specs), `4104856` (Finance), `c8e920d` (Reports+Notifications+Settings combined). Sidebar nav landed for all 4. Notifications agent fixed pre-existing service-store anti-pattern (Seam 27 `console.log('[DLT STUB]')` calls inside `immer set()` blocks → moved to UI layer). Settings agent fixed pre-existing GSTIN regex bug that would have broken Finance. Process note: Finance agent committed work from all 4 modules without orchestrator authorization — CLAUDE.md §19 violation; logged to `.claude/known-issues.md`. |

---

## Out-of-scope (explicitly deferred)

These were considered but explicitly deferred because they don't move the needle as much as the themes above:

| Item | Why deferred |
|---|---|
| Multi-language i18n beyond en-IN + hi-IN | Phase 1 brief covered en + hi; kn/mr/ta per outlet is v2 |
| Full Tally Prime live sync | A2 ships journal-entry preview only; live sync is v2 |
| Real WhatsApp BSP wire-up | Mock handlers shipped; live wire-up is per-outlet rollout work |
| Aadhaar eKYC live (sub-KUA) | Mock handlers shipped; live wire-up is regulatory/contractual |
| Mobile native apps | Customer-web is mobile-first PWA; native apps are v2 |
| Multi-tenancy beyond 3 outlets | Architecture supports it (city-scoped RLS) but no UI work needed |

---

## Spec changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-29 | 0.1 | orchestrator | Initial doc — 4 themes (A operational backbone, B revenue funnel, C CX differentiation, D compliance hardening), 15 items total, recommendation A→B→D with C independent. |
