# 00 · Executive Summary

**Project:** Custom Data Management System (DMS) for a multi-city luxury pre-owned car business in India
**Scope of research:** Market and competitor analysis feeding into specs, designs, and development
**Prepared by:** Five parallel research streams with cross-review reconciliation
**Date:** 2026-04-15

---

## 1. What this pack contains

Nine documents produced from five parallel research streams (competitive landscape, customer CX, sales/inventory, service/parts/workshop, finance/tax/employee/architecture), cross-reviewed for India-specific accuracy before consolidation.

| # | Document | Purpose |
|---|----------|---------|
| 00 | Executive Summary | This document — synthesis, decisions already locked, top findings |
| 01 | Market & Competitive Landscape | OEM + Indian pre-owned + tech-pattern leaders, feature parity, gap analysis |
| 02 | Feature Matrix | Must / Should / Nice-to-have across all verticals for v1 planning |
| 03 | Customer CX & Storefront | Luxury digital storefront, customer portal, reminders engine, mobile strategy |
| 04 | Sales & Inventory (Pre-Owned) | Acquisition, CPO certification, pricing, sales CRM, deal desk, multi-location ops |
| 05 | Service, Parts & Workshop | RO lifecycle, VHC, parts inventory, warranty, multi-brand tool licensing |
| 06 | Finance, Tax & Employee | GST margin scheme, e-invoicing, UPI/KYC, AR/AP, commissions, RBAC, audit |
| 07 | Tech Architecture Patterns | Stack recommendation, multi-tenant data model, integrations, DPDP compliance |
| 08 | Open Questions & Risks | Decisions still needed from stakeholders, with impact analysis |

---

## 2. Decisions already locked (from scoping)

These are treated as fixed input and should not be re-litigated during spec/design unless deliberately reopened:

1. **Geography:** India-primary. Regulation, integrations, and compliance are designed for Indian market (GST, DPDP Act 2023, UPI, DigiLocker). Global/Gulf expansion is a later concern.
2. **Scale:** 3–10 outlets across multiple Indian cities. Single-tenant business, multi-outlet partitioned.
3. **Build stance:** Fully custom build — not Tekion / CDK / Keyloop / Salesforce Automotive Cloud. Competitor platforms used for feature parity benchmarking only.
4. **Transaction scope:** Lead-gen + test-drive/service booking + **token / booking-amount payment online**. Final sale is in-person. Not a full online checkout. KYC, finance sanction, RC transfer, and delivery are offline-coordinated.
5. **Benchmarks:** BMW, Audi, Porsche (for CX, certification, service standards) + Big Boy Toyz, Luxury Ride, Gallery 21 (Indian pre-owned direct competitors). CARS24 and Spinny studied for tech/UX patterns only.
6. **Verticals in scope equally:** Customer CX & storefront, Sales & inventory, Service & parts & workshop, Finance / tax / employee management.
7. **Mandatory India integrations (v1):** GST e-invoicing (IRP) and Payments + KYC (UPI, Razorpay, Aadhaar/PAN/DigiLocker). VAHAN and insurance partner APIs are roadmap items, not v1.

---

## 3. Top ten findings that should shape the product

1. **GST on used cars is a margin-scheme problem, not a simple rate problem.** Under Notification 8/2018 and 25/2023, GST is applied to the **margin (sale − cost)** at 12% or 18% (depending on engine/category), when the car is acquired from an unregistered seller and no ITC was taken. This is the default path for pre-owned luxury acquired from private owners. TCS at 1% still applies on any motor vehicle sale > ₹10 lakh, regardless of scheme. Getting this right is a legal, financial, and product-design prerequisite — not an accounting afterthought. Most generic DMS platforms model this poorly or not at all; this is your compliance moat. (See Doc 06.)

2. **OEM DMS and Indian pre-owned DMS are solving different problems.** BMW ProConsul, Audi retail.X, and Porsche PCSS are designed for new-car franchised networks with factory feeds, warranty claim integration, and dealer audit compliance. Big Boy Toyz, Luxury Ride, and Gallery 21 are operator-run dealerships with bespoke or basic back-office systems. Your system must steal the **CX polish and certification rigor from OEMs** and the **operator-centric workflows from pre-owned specialists**, while avoiding the bloat and rigidity of OEM DMS.

3. **The three inspections are not one inspection.** Distinct workflows, distinct UIs, distinct data: (a) **CPO certification** — 180–220 points on inbound acquisition, customer-facing certificate, anchors warranty; (b) **Service VHC** — ~40 points every service visit, traffic-light report to customer, drives upsell; (c) **Pre-Purchase Inspection (PPI)** — requested by third-party buyers of cars not yet in your inventory, revenue line. Modelling them as one will break pricing, certification, and service operations.

4. **WhatsApp is the primary customer channel, not a side channel.** Indian luxury buyers expect service communication, approvals, reminders, documents, and status updates on WhatsApp. Plan for WhatsApp Business API via a BSP (Gupshup, AiSensy, MSG91, Wati) from day one, with template approvals secured early. SMS is secondary and must be DLT-registered. Email is for records / invoices. Push is nice-to-have when a native app ships.

5. **Customer portal + multi-vehicle ownership is the underexploited moat.** Luxury customers own multiple cars, and Indian pre-owned competitors barely offer a post-purchase portal. A clean portal with per-vehicle documents, service history, reminders, and booking flow is the single highest-ROI differentiator — easy to build, hard to clone fast, keeps customers on your service bay.

6. **Each pre-owned unit is a distinct asset, not a SKU.** Cost tracking is per-VIN: acquisition cost + refurb cost + allocated overhead + holding cost → landed cost → margin at sale. FIFO/average-cost inventory logic common in retail DMS does not apply. P&L per car is a first-class report for pricing discipline and stale-stock management.

7. **Multi-brand workshop needs brand-specific diagnostic tooling.** BMW ISTA, Audi ODIS, Porsche PIWIS are per-terminal licensed (€3K–€10K/year each) and gate emission / ADAS / warranty work. The DMS must model tool licenses, technician certifications (BMW STAR, Audi Academy, Porsche PIWIS), and job-level access control. This is a compliance and insurance requirement, not a nice-to-have.

8. **Courtesy car + pickup-drop logistics are table stakes for luxury service.** Budget for the fleet and for modelling it in the DMS (vehicle pool, driver assignments, return SLA). This is not a finance-department concern — it is a CX concern that routes through the service module.

9. **Accounting integration is a political decision, not a technical one.** Most Indian accountants live in Tally. Forcing a migration is a losing fight. Design the DMS as source-of-truth with **bidirectional Tally sync (XML or Tally Prime API)** as P0, and Zoho Books as a P1 alternative for cloud-first customers. Avoid QuickBooks in India — it doesn't model margin-scheme cleanly.

10. **Start as a modular monolith on AWS Mumbai.** At 3–10 outlets, microservices are premature optimization. NestJS (Node) + PostgreSQL + Redis + RabbitMQ + Elasticsearch + S3 in AWS ap-south-1, with row-level security per outlet, will carry you through year one cleanly. Plan an extraction roadmap for Finance and Notifications services at Phase 2. Kafka is overkill.

---

## 4. Recommended v1 MVP shape (working hypothesis)

**Customer-facing (web-first, PWA):**
- Luxury storefront: curated hero, faceted inventory listing, VDP with 360° + video + certification report + transparent on-road price breakdown (margin-scheme GST + TCS + RTO + insurance shown line by line)
- Customer account: multi-vehicle registration, per-vehicle docs + service history + reminders
- Test drive booking, service booking, token payment via Razorpay (UPI/card)
- WhatsApp Business API as primary comms channel

**Back-office (admin web):**
- Inventory acquisition pipeline: lead → inspection → offer → token → RC transfer workflow → refurb → CPO certification → listing
- Sales CRM: lead routing, deal desk, quote generation with margin-scheme-aware GST and TCS, commission engine
- Service module: RO lifecycle with complaint-cause-correction model, VHC with photo evidence, bay/tech assignment, courtesy car fleet, warranty claim workflow
- Parts inventory: OEM part numbers with supersession chains, multi-location stock, landed-cost tracking for imports
- Finance/accounting: per-VIN cost ledger, AR/AP with 3-way match, GST e-invoicing via IRP, Tally daily sync, commission accrual & payout
- Roles & permissions: RBAC with row-level security per outlet, immutable audit trail

**Mobile (Phase 1.5 / 2):**
- Inspector tablet app (offline-capable, photo per checkpoint, auto-PDF certification)
- Technician mobile app (RO view, clock-in, parts requisition)
- Sales exec mobile (quote on-the-go)

**Integrations (v1):**
- Razorpay (UPI, card, NEFT/RTGS collect)
- WhatsApp BSP (Gupshup or AiSensy)
- SMS via MSG91 (DLT-registered)
- E-invoicing via ClearTax or IRIS (GSTN IRP)
- Tally bidirectional sync
- Aadhaar eKYC via sub-KUA (Shunyam / iSafe / Signzy) and PAN NSDL
- Email via SES / SendGrid
- Lead aggregators (CarWale, CarDekho) one-way inbound feed

---

## 5. Critical open questions needing stakeholder input

Twelve decisions are outlined in Doc 08. The five most blocking for design-start are:

1. **Consignment model yes/no** — affects AP, AR, title workflow, GST scheme eligibility. If yes, need a parallel workflow throughout sales and finance.
2. **In-house vs partner workshop** — the brief implies in-house (you service cars). Need bay count, brand certification roster, body-shop inclusion.
3. **Finance partner list for v1** — exact partners (HDFC, ICICI, BMW FS, Porsche FS, Bajaj) and their API maturity determine deal-desk and loan-flow scope.
4. **Tally integration priority** — confirms accounting direction.
5. **Outlet count and cities for year 1** — affects multi-tenant data partitioning tests, bay counts, state-wise GST setup (each state is a separate GSTIN).

---

## 6. Risk register (abbreviated; full version in Doc 08)

- **Regulatory:** GST margin-scheme misapplication (financial/legal exposure). Mitigate with tax counsel review of product logic before go-live.
- **DPDP Act 2023:** personal-data obligations (consent, retention, deletion rights) — must be architecture-level, not bolt-on.
- **WhatsApp template approval lead time:** 6–10 weeks with Meta via BSP. Start immediately.
- **Tally single-write bottleneck:** if one desktop hosts Tally, DMS sync must serialize writes. Plan from day one.
- **OEM diagnostic tool licensing:** €10K–€30K/year for a multi-brand shop. Factor into opex.
- **Courtesy car fleet capex:** not trivial (5–10 vehicles for luxury expectation). Factor into business case.
- **Data quality on inbound acquisition:** OCR + manual entry for RC, insurance, service history. Plan for human review cycle, not perfection.

---

## 7. Navigation

Doc 01 sets the market context. Doc 02 gives you the feature-prioritization handle. Docs 03–06 are the functional blueprints per vertical. Doc 07 is the engineering starting point. Doc 08 is the stakeholder-decision checklist you should work through with the business leadership this week before any design sprint begins.
