# 02 · Feature Matrix (Must / Should / Nice-to-have)

This document is the prioritization handle for v1 scope. Each vertical is split into three tiers. Treat **Must-have** as non-negotiable for go-live; **Should-have** as v1.5 / three-to-six months post launch; **Nice-to-have** as roadmap beyond v1.

Cross-reference the functional specs in Docs 03–06 for workflow depth and 07 for architectural implications.

---

## Vertical 1 — Customer CX & Storefront (Doc 03)

### Must-have (v1.0)
- Public storefront: curated hero, faceted inventory listing, saved search
- Vehicle Detail Page: 8–12 curated photos, 360° exterior (v1 minimum), spec sheet, certification badge, accident/odometer disclosure, service history summary, similar cars, pricing breakdown (on-road with margin-scheme GST + TCS + RTO + insurance line items), EMI calculator, trade-in lead form
- Primary CTAs: Book Test Drive, Request Callback, Chat on WhatsApp
- Customer signup/login (email + phone OTP; social optional)
- Customer account: multi-vehicle registration, per-vehicle document vault (RC, insurance, PUC, warranty, invoices), per-vehicle service history timeline, upcoming reminders
- Test drive booking flow with DL capture
- Service booking flow (drop-off, with slot selection by outlet)
- Reminder engine: service-due (date + KM), insurance expiry, PUC expiry, warranty expiry, RTO tax
- Notifications: WhatsApp Business API (via BSP, primary), DLT-registered SMS (transactional), email (records)
- Hindi UI toggle
- Performance targets: storefront LCP < 2s, inventory search < 200ms, VDP load < 2s
- WCAG 2.1 AA baseline: contrast, alt text, keyboard nav, focus states

### Should-have (v1.1 / v1.5)
- Interior 360°, video walkaround per unit, undercarriage photos
- Price-drop and new-inventory-match notifications
- Chauffeur-at-home test drive booking
- Real-time service RO status tracking in portal
- WhatsApp-button approval for additional service work
- Referral program + points ledger
- Saved comparison (up to 5 cars side-by-side)
- Regional language UI (Marathi, Tamil, Telugu depending on market footprint)
- Native mobile app (iOS + Android via React Native) — evaluate only if PWA engagement data justifies

### Nice-to-have (v2+)
- Full VR showroom / immersive walkthrough
- AR interior preview
- Exclusive owner events, track-day invites, member-only inventory
- Seasonal care-package booking (monsoon / winter / summer)
- Lease buy-out, corporate program storefront
- Live sales-advisor video chat

---

## Vertical 2 — Sales & Inventory (Doc 04)

### Must-have (v1.0)
- "Sell Your Car" lead intake with OBV (OrangeBookValue) API valuation, appointment scheduling
- Inspection scheduling and routing (inspector calendar, location assignment)
- Offer workflow with negotiation log, token collection (Razorpay link), final payment, RC transfer checklist (manual workflow; VAHAN API deferred)
- Refurbishment pipeline with workshop handoff, cost ceiling alerts, ready-for-sale gate
- **CPO certification inspection**: 180–220 point template, inspector tablet app (offline capable, photo per checkpoint, pass/fail/note), auto-generated PDF certificate with QR for public verification
- Per-VIN cost ledger: acquisition + refurb + overhead + holding cost → landed cost
- Listing pricing engine: floor price = landed + buffer; listed price = floor + margin target; stale-stock auto-price-drop rules with sales-manager override
- Sales CRM: lead ingestion from website, walk-in, phone, WhatsApp, referral; round-robin / location / skill-based routing; 8-stage deal pipeline (New → Qualified → Test Drive → Negotiation → Token → Paperwork → Delivery → Delivered)
- Test drive management: DL verification, insurance rider attached, return condition checklist
- Quote & invoice generation: margin-scheme-aware GST, TCS 1% on sale > ₹10L, accessories, extended warranty, insurance bundling
- Commission engine: per-deal % + slab bonus + clawback; real-time accrual dashboard
- Multi-location inventory visibility with reserve/hold/sold state machine
- Delivery handover checklist (documents, keys, manuals, demo, photo with customer)
- Reporting: inventory aging, days-to-sell, margin per car, salesperson performance, source attribution

### Should-have (v1.5)
- Trade-in appraisal tool embedded in sales flow (link to in-house appraisal workflow, not third-party)
- Finance partner soft-pull pre-approval for 1–2 partners (recommended: HDFC and Bajaj Finserv for volume + luxury-friendly NBFC)
- Competitor price monitoring (scraping CarWale / CarDekho for same make/model/year/variant)
- Marketplace listing sync (CarWale, CarDekho outbound feed with auto-delist on sale)
- Corporate fleet / lease-return bulk intake workflow
- Auction sourcing (manual upload for IBB Salvex / OEM wholesale auctions; API only if provider exposes one)
- Consignment workflow (separate title, owner agreement, marketing fee tier, escrow tracking) — **only if strategy confirms this line**

### Nice-to-have (v2+)
- Multi-partner finance aggregation panel (4+ partners with parallel soft-pulls)
- AI-based pricing optimization / demand clustering
- Real-time GPS tracking during test drive for high-value vehicles
- VAHAN API integration for real-time RC transfer status
- Lead scoring + behavioural segmentation

---

## Vertical 3 — Service, Parts & Workshop (Doc 05)

### Must-have (v1.0)
- Service booking ingestion from customer portal, WhatsApp, phone, walk-in
- Service advisor console: unified customer 360 (all vehicles, full service history, open recalls, warranty status, prior notes)
- RO creation on complaint-cause-correction (3C) model; VIN-tied; estimated labor, parts, total with margin-scheme-aware GST
- Customer approval via WhatsApp OTP / link (for estimates and supplementary work)
- Bay and technician assignment: skill-based + tool availability + brand certification gating
- Technician clock-in per job (labor time tracking)
- **Vehicle Health Check (VHC)** as a distinct workflow: 40-point multi-point check every visit, traffic-light report, photos and short video, delivered on WhatsApp
- Parts requisition from RO to stores; back-order handling; return of unused parts
- Road test checklist and quality control gate before handover
- RO state machine (Created → Awaiting Approval → Scheduled → In-Progress → Additional Work Approval → QC → Ready for Delivery → Delivered → Invoiced) with rework and cancellation branches
- Parts master: OEM part numbers with supersession chains, aftermarket cross-references, brand, category, UoM, criticality
- Multi-location parts stock with min-max reorder, ABC/VED classification
- Landed-cost tracking for imports (CBU / CKD parts from EU) including customs + GST
- GRN (Goods Receipt Note) workflow with 3-way match and batch/serial tracking for safety-critical parts (airbags, ECUs, batteries)
- In-house dealer warranty: coverage matrix, claim workflow, reimbursement logic
- OEM warranty tracking when still active: filing, approval, reimbursement audit trail
- Digital invoice with margin-scheme-aware GST
- Customer communication templates for RO lifecycle (approved via WhatsApp BSP)

### Should-have (v1.5)
- Pre-Purchase Inspection (PPI) as a paid service offered to third parties
- Extended warranty provider integration (OneAssist, Dr. Warranty, OEM extended)
- AMC / prepaid service-contract tracking (consumption against balance, renewal prompts)
- Courtesy car fleet management (vehicle pool, driver assignments, return SLA)
- Accident / body-shop workflow (if in scope — separate decision): insurance claim coordination, police report attachment, repair estimate dual-sign-off
- Technician certification tracking: BMW STAR, Audi Academy, Porsche PIWIS, Bosch ECS — with expiry alerts and work-assignment gating
- Special tools register: torque wrenches, alignment rigs, ADAS calibration, EV battery safety — with calibration schedule
- Diagnostic tool licensing tracker (ISTA, ODIS, PIWIS) with per-terminal renewal alerts
- Recall management: pull OEM recall database, match against owned/serviced cars, book service
- Post-service NPS and feedback capture per technician

### Nice-to-have (v2+)
- Predictive maintenance based on VIN + service history + OEM bulletin feed
- EV-specific workflows: battery SoH reporting, charge history, ADAS calibration for electric models
- Customer mobile app with in-progress photo/video stream from workshop
- OBD-II integration for real-time vehicle diagnostics feed

---

## Vertical 4 — Finance, Tax & Employee Management (Doc 06)

### Must-have (v1.0)
- **GST margin scheme** correctly modelled: GST on (sale − landed cost) at 12% or 18% based on HSN/engine, when car was acquired from unregistered seller with no ITC taken. Normal scheme fallback when acquired from registered dealer.
- **TCS 1%** collected on all motor vehicle sales > ₹10 lakh, regardless of scheme; remitted per Form 27EQ quarterly
- **E-invoicing (IRP)**: IRN generation, QR code, e-way bill for inter-state movement, cancellation-within-24h window handling, credit-note amendment logic
- HSN/SAC codes configured: 8704 (vehicles), 8708 (parts), 9987 (service labor)
- State-wise GST setup (each state is a separate GSTIN; multi-outlet across states means multiple returns)
- Chart of accounts for multi-location auto dealer with sales / service / parts as separate profit centers
- Per-VIN inventory accounting (each pre-owned unit its own cost ledger) — not FIFO/average-cost
- AR: customers (rare), finance companies (dominant), insurance (total-loss), corporate fleet
- AP: OEM / parts distributors, refurbishment vendors, consignment sellers (if in scope)
- Bill management with 3-way match (PO → receipt → invoice), approval workflow, payment scheduling
- Bank reconciliation: UPI, Razorpay, PayU, NEFT/RTGS, card settlements; auto-match + unmatched queue
- UPI collect/intent, QR on-premises, Razorpay card payments, NEFT/RTGS link generation with beneficiary pre-fill
- Cash-handling safeguards: PAN mandatory capture above ₹2 lakh, SFT aggregation logic
- Expense management per outlet, per department, per vehicle
- Commission accrual + monthly payout automation
- Period-end close: bank rec, inventory recount, AR/AP aging, accruals, revenue recognition, GSTR-1 outward, GSTR-2B inward match
- Standard reports: consolidated P&L, P&L per outlet, gross margin per car, margin by brand/age/price tier, OpEx ratio, service contribution
- **Tally bidirectional sync** (daily at minimum; XML file or Tally Prime API): DMS as source of truth, Tally as reporting slave
- RBAC with row-level security per outlet; minimum role set: Super Admin, Regional Head, Outlet Manager, Sales Manager, Sales Exec, Service Manager, Service Advisor, Technician, Parts Manager, Accounts, Marketing, Customer Care
- Immutable audit trail: every financial and inventory-moving action; before/after JSON diff; IP + device fingerprint; tamper-detection alert
- KYC: Aadhaar eKYC via sub-KUA partner (Signzy / Shunyam / iSafe), PAN NSDL verification, DigiLocker pull (optional but recommended), video KYC for high-value (> ₹50L) or mismatch cases
- Consent capture at KYC: DPDP-compliant
- PII encryption at rest (KMS) and in transit (TLS 1.2+)
- Data residency in India (AWS ap-south-1 Mumbai or Azure India)

### Should-have (v1.5)
- Zoho Books alternative sync (for dealers preferring cloud accounting)
- GSTR-3B draft generation from DMS
- Finance partner soft-pull + hard-pull API integration for 1–2 partners
- OCR on vendor bills (AWS Textract or Google Document AI) with auto-fill AP form
- Deferred revenue handling (extended warranty, AMC, service contracts prepaid)
- DSO / DPO / cash conversion cycle dashboards
- Light HRMS: attendance, shift, leave; CSV sync with greytHR / Keka for payroll
- Data-subject-rights self-service portal (access, correction, deletion request)

### Nice-to-have (v2+)
- Advanced financial planning: budget vs actual, rolling 13-week cash flow
- AR automation with ML-based payment-to-invoice matching
- Supply-chain visibility on parts (supplier lead times, inbound shipment tracking)
- Expense automation with credit-card feed reconciliation
- Full HRMS in-platform (deferred by design — avoid reinventing greytHR/Keka)

---

## Cross-cutting (all verticals)

### Must-have (v1.0)
- Authentication (email + phone OTP; MFA for Super Admin)
- Role-based access control with row-level security per outlet
- Immutable audit log for all write actions
- API documentation (OpenAPI)
- Automated backups (RDS PITR, S3 versioning)
- Monitoring and alerting (Grafana + Prometheus + Loki; PagerDuty or equivalent)
- Error tracking (Sentry)
- DPDP Act 2023 compliance baseline: consent, encryption, residency, retention, data-subject rights
- Staging environment with integration sandboxes

### Should-have (v1.5)
- Feature flags platform for phased rollout
- A/B testing framework for storefront experiments
- Full observability (distributed tracing)
- Chaos testing / DR drill quarterly

### Nice-to-have (v2+)
- Multi-region hot standby (only if franchising / international expansion)
- Self-serve analytics for outlet managers
- Event sourcing for financial transactions (if audit requirements demand immutability at the data layer)

---

## Sizing guidance (rough order of magnitude)

The following are working estimates from the research, to be refined by engineering after requirements review. These are for a small-to-mid full-stack team with India rates.

| Phase | Scope | Duration | Team shape |
|---|---|---|---|
| Phase 1 MVP | All Must-have above (v1.0) | 5–7 months | 4–6 full-stack + 1 DevOps + 1 QA + 1 PM + 1 designer |
| Phase 1.5 | Key Should-haves in CX + Service + Finance | +2–3 months | Same team |
| Phase 2 | Mobile native apps + advanced reporting + finance partner aggregation | +3–4 months | +2 mobile devs |
| Phase 3 | Microservices extraction + multi-region + ML pricing | +6 months | +2 platform engineers |

Validate after scope freeze. Do not commit to dates until Doc 08 open questions are answered.
