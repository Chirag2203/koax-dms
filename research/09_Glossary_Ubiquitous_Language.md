# 09 · Glossary & Ubiquitous Language

Canonical vocabulary for the DMS. Every spec, story, prompt, ADR, code identifier, and UI label must use these terms as defined here. If a concept is not in this glossary, it should be added before being used in a spec — unknown vocabulary is a leading cause of agent inconsistency and spec drift.

Entries are alphabetical within each group. For entries with official definitions (e.g., GST, DPDP), the definition here is the operational interpretation we apply in the product — tax/legal counsel retains authoritative interpretation for disputes.

---

## 1. Product / Domain Terms

**Accessory** — Any product sold alongside a vehicle (e.g., mats, film, alloys). Distinct from Parts (workshop consumables) and from Vehicle Options (factory-fitted, tracked on the Vehicle record).

**Acquisition** — The process by which a Vehicle enters our inventory: from sell-your-car leads, trade-ins, fleet returns, auctions, or consignment. See Doc 04 §2.

**Additional Work** — Repair Order line items added mid-job after the initial estimate was approved, usually surfaced by the technician during work. Requires a separate customer approval via WhatsApp.

**Appraisal** — An inspector-produced valuation of a vehicle being considered for acquisition. Distinct from CPO Certification and from VHC.

**ASP (Average Selling Price)** — Revenue per unit sold, a portfolio metric, typically computed per brand, per price tier, or per outlet.

**Bay** — A physical service workshop slot with specific equipment and lift capacity. Bays are assignable per RO.

**Booking Amount** — See Token.

**BSP (Business Solution Provider)** — A WhatsApp Business API accredited partner (e.g., Gupshup, AiSensy, MSG91, Wati) through which we send and receive WhatsApp messages.

**CBU (Completely Built Unit)** — A fully-assembled imported vehicle, arriving assembled. Used in Parts context to describe imported assemblies vs CKD (knock-down) kits.

**Certificate (CPO Certificate)** — The PDF + QR-code deliverable produced at the end of a successful CPO Certification inspection. Customer-facing artifact; has a public verification URL.

**CKD (Completely Knocked Down)** — Parts imported as a kit and assembled locally. Used in Parts inventory for landed-cost calculations.

**Clawback** — Reversal of previously-accrued commission when a Deal is later unwound (cancelled, refunded) within a defined window.

**Consignment** — An inventory arrangement where the Owner retains title and we market the Vehicle for a fee, remitting net proceeds on sale. Distinct from Owned inventory where we hold title. Consignment is **in v1 scope** per Q4 decision.

**Complaint-Cause-Correction (3C)** — The industry-standard model for RO line items: (1) what the customer reported, (2) what diagnosis found, (3) what we did about it. All three fields are mandatory.

**CPO (Certified Pre-Owned)** — Our own-brand certification program applied to every sale-ready Vehicle. 180-point inspection, own-brand warranty, public verifiable Certificate. Q1 decision: own-brand primary.

**Courtesy Car** — A loaner vehicle provided to a customer during a service visit. Tracked in a pooled Fleet with driver assignments and return SLA.

**Customer** — A real person who has interacted with us: Prospect (pre-sale), Buyer (purchased), Owner (registered a vehicle), Service Customer (brought a vehicle for service). Same entity, different relationships over time.

**Deal** — A sales opportunity linking a Prospect to one or more Vehicles through stages from New to Delivered. Has an 8-stage pipeline; owns Quote versions and Commission accruals.

**DMS (Data Management System)** — This product. Note: we use DMS for "Data Management System" per user's own project terminology; the automotive industry sometimes uses DMS for "Dealership Management System" — these are synonyms in our context.

**DSR (Data-Subject Rights)** — Rights a data principal (customer, employee) has under DPDP Act 2023: access, correction, deletion, grievance. We provide a self-serve portal (v1.5) and an operator-served workflow (v1.0).

**eKYC** — Electronic KYC via Aadhaar-based OTP flow, operated through a sub-KUA partner.

**Estimate** — The priced line-item breakdown of work proposed on a Repair Order, sent to the customer for approval before work begins.

**Floor Price** — Landed Cost + configured buffer. The lowest price at which an ordinary sales exec is authorized to sell without manager override. Distinct from List Price.

**GRN (Goods Receipt Note)** — The workflow of receiving parts into stock: verifies quantity, condition, and updates stock + landed cost.

**Handover** — The delivery event where Vehicle, keys, documents, and accessories are physically passed to the Buyer. Requires a checklist and customer signature.

**Holding Cost** — Accrual of capital cost per day a Vehicle remains in inventory. Computed daily as `(landed_cost × working_capital_rate / 365)` and added to Landed Cost.

**HSN (Harmonized System of Nomenclature)** — GST classification code. Vehicles 8704, Parts 8708. SAC for services: 9987 (vehicle service), 9961 (agency/consignment).

**Inspection** — A generic term. Three concrete flavors used in product:
- **Acquisition Inspection** — short, condition-grading, pre-offer (§2.3 Doc 04)
- **CPO Certification Inspection** — 180-pt, sale-readiness, customer-facing
- **VHC (Vehicle Health Check)** — ~40-pt, every service visit, upsell-driving
- **PPI (Pre-Purchase Inspection)** — paid service for third parties (v1.5)

**Invoice** — A tax document produced at sale or service delivery. Must carry IRN + QR if B2B above threshold; margin-scheme note required on pre-owned vehicle sales.

**IRN (Invoice Reference Number)** — 64-character hash returned by IRP upon successful e-invoice registration. Mandatory on qualifying invoices.

**IRP (Invoice Registration Portal)** — The government GST portal for e-invoicing; accessed via accredited GSP.

**GSP (GST Suvidha Provider)** — Accredited intermediary through which we call the IRP (ClearTax, IRIS, Taxilla, Masters India, etc.).

**Landed Cost** — The running total cost of a specific VIN: `acquisition + transport + refurb_parts + refurb_labor + certification + overhead_allocation + holding_cost`. Updated continuously; basis for Floor Price and GST margin scheme calculation.

**Lead** — An expression of interest captured from any channel (website, walk-in, call, WhatsApp, aggregator). The starting entity of a Deal.

**Lease-Return** — A Vehicle entering inventory at the end of a customer lease, typically in a corporate fleet context. Sourced into Acquisition flow.

**List Price** — Floor Price + target margin. What the customer sees on the storefront.

**Margin Scheme** — GST treatment under Rule 32(5) / Notification 8/2018 where GST is computed on `(sale_value - landed_cost)` rather than on full sale value. Default path for pre-owned vehicles acquired from unregistered sellers.

**Outlet** — A physical location where we transact: sales showroom + workshop (same facility or adjacent). The primary data partitioning dimension. Each Outlet belongs to one State and operates under one GSTIN.

**Parts** — OEM or aftermarket components used in service or refurbishment. Distinct from Accessories (sold) and Vehicle Options (factory-fitted).

**PDI (Pre-Delivery Inspection)** — Final inspection before Handover to customer; not to be confused with PPI (third-party) or CPO (certification-anchoring).

**PPI (Pre-Purchase Inspection)** — Paid third-party service: a prospective buyer of a car not in our inventory asks us to inspect it. v1.5 scope.

**Provenance** — The lineage of a Vehicle: prior owners (count and type: individual, corporate, lease), service history, accident history, odometer history. Core of luxury trust signals on the VDP.

**QC (Quality Control)** — Final check before a Vehicle is released from service bay to customer. A distinct RO state.

**Quote** — A priced proposal for a specific Vehicle to a specific Prospect, including all on-road components. Versioned.

**Reconciliation** — Bank feed ↔ ledger matching; GSTR-2B ↔ AP matching; Razorpay settlement ↔ Payment matching. A scheduled job with an unmatched-items queue.

**Refurb (Refurbishment)** — Workshop work performed on an acquired vehicle to make it sale-ready. Distinct from customer service and from warranty work in how costs route: refurb costs flow into the VIN's Landed Cost, not into service revenue.

**Reserve (as verb on Vehicle)** — A state where a Vehicle is held for a specific Deal with a TTL; not visible on storefront during Reserve. Distinct from Hold (internal off-market) and Sold (final).

**RO (Repair Order)** — A service work order for a Vehicle, owned by a Service Advisor, carrying line items on the 3C model. Core of the Service module.

**RTO (Regional Transport Office)** — Government office where vehicle registration and ownership transfer is processed. Each state has many; vehicles tied to specific RTO jurisdiction.

**SA (Service Advisor)** — The employee who owns the customer relationship on a service visit. Opens and closes the RO; mediates all customer communication.

**SFT (Statement of Financial Transactions)** — An Income Tax Act reporting obligation for high-value cash transactions. Aggregated per person per year.

**Slot** — A unit of bay-time availability for service booking. Not the same as a Bay (physical resource).

**Sold** — Final Vehicle state post-Handover; COGS recognition trigger; Commission accrual trigger.

**Stale Stock** — Inventory aged beyond configured thresholds (30 / 45 / 60 / 90 day buckets). Triggers automated price-drop suggestions and management review.

**Storefront** — The customer-facing public website. Distinct from the Customer Portal (logged-in area) and from Admin (employee back-office).

**Supersession** — OEM-initiated replacement of one part number with a newer one. System maintains supersession chains so techs auto-get the current part.

**TCS (Tax Collected at Source)** — 1% tax collected from the buyer on motor vehicle sales > ₹10L under Section 206C(1F). Remitted quarterly via Form 27EQ. Applies regardless of GST scheme.

**TDS (Tax Deducted at Source)** — Tax we deduct at specified rates when paying vendors/employees for certain services. Quarterly return 26Q.

**Token** — The booking amount a Buyer pays to reserve a specific Vehicle, typically ₹25K–₹10L. Collected via Razorpay payment link. Non-refundable per our policy unless otherwise agreed.

**Trade-in** — A customer's existing vehicle offered in part-exchange toward buying one of ours. Routes through Appraisal into Acquisition.

**VDP (Vehicle Detail Page)** — The public-facing page for a single Vehicle on the storefront with photos, video, 360°, Certification report, spec sheet, pricing breakdown, CTAs.

**VHC (Vehicle Health Check)** — ~40-point multi-point inspection every service visit. Traffic-light report (Red / Amber / Green per item) with photos and optional short video, delivered to the customer via WhatsApp. Primary service-upsell mechanism.

**VIN (Vehicle Identification Number)** — The 17-character unique identifier for a Vehicle. The primary key of the Vehicle entity in our DMS. Distinct from Engine Number, Chassis Number (subset data).

**Vehicle** — A distinct physical car identified by VIN. Not a SKU.

**Warranty (In-house CPO Warranty)** — Our own-brand warranty attached to CPO Vehicles, underwritten by us, reserved at ~2% of sale price per Q10.

**Warranty Reserve** — The liability on our books accruing from every sale to cover future CPO warranty claims. Actuarial review at 12 months.

---

## 2. India-specific Acronyms and Regulators

**Aadhaar** — 12-digit unique identity number issued by UIDAI. Basis for eKYC.

**ABDM** — Ayushman Bharat Digital Mission — not relevant to this product.

**CBIC (Central Board of Indirect Taxes and Customs)** — Authority for GST and customs.

**CERT-In (Indian Computer Emergency Response Team)** — Cyber-security incident reporting authority; 6-hour reporting rule for cyber incidents.

**DigiLocker** — Government-operated document wallet. We pull RC, DL, Aadhaar, PAN with customer consent.

**DLT (Distributed Ledger Technology for telemarketing)** — The TRAI-mandated SMS template registration system. Separate from WhatsApp; SMS senders must register Sender ID and each template with a telecom DLT portal.

**DPDP (Digital Personal Data Protection Act, 2023)** — India's comprehensive data protection law. Applies to all processing of personal data in India.

**DPO (Data Protection Officer)** — Mandated role under DPDP for significant data fiduciaries. We designate one at go-live.

**eSign** — Aadhaar-based electronic signature. Can be used in lieu of physical signature on certain documents.

**FASTag** — MoRTH-issued vehicle-toll RFID. Out of scope for v1.

**FEMA** — Foreign Exchange Management Act — affects imports; relevant for parts import accounting.

**Form 27D** — TCS certificate issued to the Buyer for their tax credit.

**Form 27EQ** — Quarterly TCS return filed by the Collector (us).

**Form 16A** — Quarterly TDS certificate issued to vendors.

**GSTIN** — Goods and Services Tax Identification Number. State-scoped: each outlet state requires a separate GSTIN.

**GSTR-1** — Monthly outward supply return.

**GSTR-2B** — Monthly auto-generated inward supply statement; basis for ITC claim.

**GSTR-3B** — Monthly summary return with GST liability payment.

**ITC (Input Tax Credit)** — Credit claimed on GST paid on inward supplies. Subject to 2B matching.

**KUA / sub-KUA** — KYC User Agency / sub-KUA for Aadhaar eKYC. We operate as customer of a sub-KUA partner (Signzy / Shunyam / iSafe).

**MeitY** — Ministry of Electronics and IT. Issues DPDP-related notifications.

**MoRTH** — Ministry of Road Transport and Highways. Parent of VAHAN.

**NEFT / RTGS / IMPS** — Indian electronic funds transfer rails. Used for high-value and same-day payments.

**NSDL (National Securities Depository Limited)** — Operates PAN infrastructure; we use NSDL APIs for PAN verification.

**OTP (One-Time Password)** — 6-digit temporary code sent via SMS or email for verification; also the legal basis for Aadhaar eKYC consent.

**PAN (Permanent Account Number)** — 10-character Income Tax identifier. Mandatory for cash receipts > ₹2L and for TCS reporting.

**PDPL** — Refers to other countries' data protection laws (UAE PDPL, KSA PDPL). Not applicable in v1 (India-only per Q12).

**PUC (Pollution Under Control)** — Certificate required for every vehicle; renewal cycle tracked as a customer reminder.

**RBI** — Reserve Bank of India. Payment-related regulator.

**RC (Registration Certificate)** — Government-issued vehicle ownership document. Transferred via RTO on sale.

**SEBI** — Not relevant.

**SFT (Statement of Financial Transactions)** — Income Tax reporting for high-value cash transactions, aggregated per person per year.

**TRAI** — Telecom Regulator. Issues DLT rules.

**UIDAI** — Aadhaar issuer.

**UPI (Unified Payments Interface)** — Interoperable bank-to-bank real-time payment rail. Primary inbound payment method.

**VAHAN** — MoRTH-operated national vehicle registry. API integration deferred to v2.

---

## 3. Engineering Terms (for code + spec consistency)

**Adapter** — A module wrapping an external integration (Razorpay adapter, IRP adapter, BSP adapter). Isolates vendor-specific code.

**ADR (Architecture Decision Record)** — Short-form document capturing one significant architecture decision with context + decision + consequences.

**Aggregate (DDD)** — A cluster of entities changed together, with a root entity. E.g., an RO is an aggregate containing Line Items, State Events, Parts Requisitions.

**Audit Log** — The append-only record of every write to financial / inventory / PII tables. Tamper-evident via hash chain.

**Bounded Context** — A module boundary within our modular monolith. E.g., Sales CRM, Service, Parts, Finance, Identity are bounded contexts.

**Consent Ledger** — The append-only record of all DPDP-relevant consent events (granted / revoked) per subject per purpose.

**DTO (Data Transfer Object)** — The validated shape at an API boundary. Different from the internal domain entity. Mapped in and out via explicit mappers.

**Idempotency Key** — A per-request unique identifier used to dedupe webhook redeliveries and retried client calls.

**LCP (Largest Contentful Paint)** — Core Web Vital; storefront target < 2s p75 mobile.

**Outbox Pattern** — Writing outbound events to a DB table inside the same transaction as the business change, picked up by a worker later. Guarantees at-least-once delivery without dual-write inconsistency.

**PII (Personally Identifiable Information)** — Data that identifies a natural person. In our schema, flagged at column level for encryption and masking.

**RBAC (Role-Based Access Control)** — Access via role assignment rather than individual permissions.

**RLS (Row-Level Security)** — PostgreSQL feature enforcing row filters at the DB layer based on session variables. Our primary outlet-isolation mechanism.

**Saga** — A multi-step business transaction spanning multiple modules, coordinated via events with compensating actions on failure.

**Source of Truth** — DMS is source of truth for operations and inventory; a statutory accounting system (Tally, pending Q8 resolution) may be source of truth for tax filings.

**Tenant** — Not applicable in v1. We are single-business, multi-outlet. "Tenancy" concepts apply if Q12 is revisited with expansion plans.

---

## 4. Reserved words / "do-not-use" list

Certain terms are ambiguous or overloaded; avoid in specs and code:

- **"Client"** — ambiguous (customer or API client?). Use Customer or API Client.
- **"Order"** — ambiguous (sale order, repair order?). Use Deal or RO.
- **"Inspection"** on its own — always qualify: Acquisition / CPO Certification / VHC / PPI / PDI.
- **"Inspection report"** — similarly qualify.
- **"Status"** without scope — use the specific state field (Deal.stage, RO.state, Vehicle.listing_state, etc.).
- **"Price"** on its own — use List Price, Floor Price, Sale Price, Quoted Price, Landed Cost, etc.
- **"Manager"** unqualified — specify: Outlet Manager, Sales Manager, Service Manager, Parts Manager, Regional Head.
- **"Customer"** should not be used to mean Buyer-only — a Customer can be a Service-only Customer without having bought from us.
- **"Stock"** — use Inventory for vehicles, Stock for parts. Never mix.
- **"Booking"** — always specify: Service Booking, Test Drive Booking, Loaner Booking. The bare word is ambiguous.

---

## 5. Term aliases (what competitors call it → what we call it)

Useful when reading research or vendor material.

| Vendor / industry term | Our term |
|---|---|
| Work order, job card | RO (Repair Order) |
| Job code | Labor Operation |
| Parts SKU | Parts Number |
| Part number supersession | Supersession Chain |
| Deal / Opportunity | Deal |
| Vehicle stock card | Vehicle record |
| Bay booking | Slot (on a Bay) |
| Inspection report | CPO Certificate (when customer-facing) / Appraisal Report (when internal) |
| Walk-around | Video Walkaround |
| Customer record | Customer |
| Primary driver | Registered Owner |
| ASN (advanced shipping notice) | GRN-expected |
| Dealer management system | DMS (same) |
| Field service job | out of scope v1 |

---

## 6. How to use this glossary

- Every spec starts with a brief "Terms used" section listing the glossary entries it references. If a needed term isn't here, add it here first (via PR + review) before proceeding.
- Code identifiers (table names, class names, API field names) must match glossary terms in their snake_case / camelCase form. `repair_order.state`, not `service_ticket.status`.
- UI labels match glossary unless UX explicitly decides a more customer-friendly term (in which case, map it here under aliases).
- Agents generating specs or prompts should load this file early in their context.
