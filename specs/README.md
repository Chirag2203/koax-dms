# Specs — module index & development path

Every feature in the DMS ships with a Doc-15-compliant spec. Specs live under `/specs/modules/<domain>/NN-<slug>.md`. An exemplar is at `/specs/examples/SPEC-INVENTORY-001-vehicle-listing.md`.

**Rule:** no code without an `approved` spec. The agent pipeline (planner → wave 1 → wave 2 → integrator) produces the spec; `coder` + `code-reviewer` implement it.

---

## Modules (v1.0 scope)

Numbers are stable; filenames inside each domain start from `01`.

| # | Domain (folder) | Spec IDs | Surface | Reviewers |
|---|---|---|---|---|
| 01 | `identity/` | SPEC-IDENTITY-* | both | sec (high) |
| 02 | `customers/` | SPEC-CUSTOMERS-* | staff | sec |
| 03 | `inventory/` | SPEC-INVENTORY-* | staff | sec · finance |
| 04 | `sales/` | SPEC-SALES-* | staff | sec · finance |
| 05 | `service/` | SPEC-SERVICE-* | staff | sec · finance |
| 06 | `parts/` | SPEC-PARTS-* | staff | sec · finance |
| 07 | `finance/` | SPEC-FINANCE-* | staff | sec · finance |
| 08 | `notifications/` | SPEC-NOTIFY-* | both | sec |
| 09 | `integrations/` | SPEC-INTEG-* | staff | sec (high) · finance |
| 10 | `reporting/` | SPEC-REPORT-* | staff | sec |
| 11 | `audit/` | SPEC-AUDIT-* | staff | sec (high) |
| 12 | `platform/` | SPEC-PLATFORM-* | staff | sec |
| 13 | `storefront/` | SPEC-STORE-* | customer | sec |
| 14 | `customer-portal/` | SPEC-CUSTPORTAL-* | customer | sec (high) · finance |
| 15 | `consignor-portal/` | SPEC-CONSIGN-* | customer | sec (high) · finance |

---

## Feature index per domain (v1.0)

### 01 identity
- 01 user & role (R01–R24) bootstrap
- 02 sign-in (staff SSO-ready, customer OTP)
- 03 Aadhaar eKYC (sub-KUA) and PAN (NSDL) flows
- 04 consent ledger (DPDP Act 2023)
- 05 delegation / dual control setup
- 06 service accounts (machine roles)

### 02 customers
- 01 customer profile (with household + preferences)
- 02 communication history (across all channels)
- 03 preferences & opt-outs
- 04 merge / dedupe tooling (R19+)

### 03 inventory
- 01 **vehicle listing** (flagship — see exemplar)
- 02 vehicle acquisition (outright + consignment fork)
- 03 appraisal (210-point inspection + grade)
- 04 refurb order (parts + labour + approvals)
- 05 per-VIN cost ledger
- 06 listing lifecycle (state machine)
- 07 vehicle transfer across outlets

### 04 sales
- 01 lead intake
- 02 test drive booking
- 03 reservation + deposit
- 04 sales order
- 05 delivery & handover
- 06 buyback-against-new
- 07 consignor sale waterfall

### 05 service
- 01 appointment booking
- 02 reception & job card open
- 03 bay scheduling
- 04 body shop (v1)
- 05 quality check
- 06 service delivery & customer handover
- 07 warranty claims
- 08 service campaigns

### 06 parts
- 01 parts master
- 02 supplier master
- 03 purchase order
- 04 GRN
- 05 stock transfer
- 06 stock count
- 07 issues to job card

### 07 finance
- 01 invoice (GST margin scheme + TCS)
- 02 e-invoice via IRP (IRN + QR)
- 03 thin GL (dr/cr per event)
- 04 Tally Prime export job
- 05 collections & reconciliation
- 06 refunds
- 07 floor-plan interest allocation
- 08 commission & incentive computation

### 08 notifications
- 01 WhatsApp BSP templates
- 02 DLT SMS templates
- 03 email templates
- 04 in-app inbox
- 05 consent & opt-out
- 06 delivery receipts

### 09 integrations
- 01 Razorpay Orders + webhooks
- 02 IRP / GSP (ClearTax or IRIS or Taxilla or Masters India)
- 03 Aadhaar sub-KUA (Signzy or Shunyam or iSafe)
- 04 PAN NSDL
- 05 DigiLocker
- 06 HDFC / ICICI loan APIs
- 07 Tally Prime connector
- 08 BSP (WhatsApp) provider

### 10 reporting
- 01 outlet-level operations dashboard
- 02 inventory ageing & velocity
- 03 service bay utilization
- 04 finance reconciliation report
- 05 commission & incentive report
- 06 CPO program health

### 11 audit
- 01 immutable audit log
- 02 access review workflow
- 03 event replay

### 12 platform
- 01 outlet management
- 02 feature flags
- 03 settings & org preferences
- 04 city isolation (RLS)

### 13 storefront
- 01 landing page
- 02 collection (catalog) page
- 03 vehicle detail page
- 04 city pages
- 05 journal (editorial CMS)
- 06 SEO + sitemap
- 07 sell-your-car enquiry form

### 14 customer-portal
- 01 account home
- 02 saved vehicles
- 03 reservations
- 04 owned vehicles (garage)
- 05 service history
- 06 documents
- 07 payments
- 08 preferences

### 15 consignor-portal
- 01 account home
- 02 listings (status + photos)
- 03 appraisals
- 04 payouts
- 05 messaging
- 06 documents

---

## Development path (sequence)

The sequence below satisfies the user's MVP approach: frontend-first, production quality, full v1 scope, mocked data.

### Phase 0 — Foundation (done or in progress)
- Design system + tokens (`@dms/tokens`) ✔
- Monorepo scaffold (apps/customer-web, apps/staff-web) ✔
- `.claude/` agent pipeline + commands ✔
- Google Stitch prompt for customer surface Figma output ✔
- MSW + Faker fixtures scaffolding

### Phase 1 — Customer front build (frontend-first, dark premium + editorial)
Order matches the Stitch screens:
1. SPEC-STORE-001 landing page
2. SPEC-STORE-003 vehicle detail page (dark-premium hero)
3. SPEC-STORE-002 collection (catalog) page
4. SPEC-STORE-004 city pages
5. SPEC-CUSTPORTAL-001 account home
6. SPEC-CUSTPORTAL-002 saved vehicles
7. SPEC-CUSTPORTAL-003 reservations
8. SPEC-CUSTPORTAL-004 owned vehicles
9. SPEC-CUSTPORTAL-005 service history
10. SPEC-CUSTPORTAL-006 documents
11. SPEC-IDENTITY-002 customer OTP sign-in + session
12. SPEC-IDENTITY-003 eKYC/PAN flows (customer side)
13. SPEC-STORE-007 sell-your-car enquiry → consignor lead
14. SPEC-CONSIGN-001..004 consignor portal (parallel to Phase 2)

### Phase 2 — Staff foundation (Modern Product Interface)
Common shell for all staff modules.
1. SPEC-PLATFORM-001 outlet management
2. SPEC-IDENTITY-001 user + role bootstrap
3. SPEC-IDENTITY-005 delegation / dual control
4. Staff app shell: sidebar, top bar, command palette (cmdk), breadcrumbs, page-level tabs, empty/loading/error scaffolds
5. Data table primitive (@tanstack/react-table) with: server-side filters, column visibility, density, saved views
6. VIN card, Vehicle card (staff variant), Customer card, Job card, Parts row — `@dms/ui/domain`

### Phase 3 — Inventory module (core of the business)
1. SPEC-INVENTORY-001 vehicle listing (exemplar)
2. SPEC-INVENTORY-002 acquisition
3. SPEC-INVENTORY-003 appraisal
4. SPEC-INVENTORY-005 per-VIN cost ledger
5. SPEC-INVENTORY-004 refurb order
6. SPEC-INVENTORY-006 listing lifecycle (state machine)
7. SPEC-INVENTORY-007 inter-outlet transfer

### Phase 4 — Sales module
1. SPEC-SALES-001 lead intake
2. SPEC-SALES-002 test drive booking
3. SPEC-SALES-003 reservation + deposit (Razorpay integration-dependent)
4. SPEC-SALES-004 sales order
5. SPEC-SALES-005 delivery & handover
6. SPEC-SALES-007 consignor sale waterfall
7. SPEC-SALES-006 buyback-against-new

### Phase 5 — Service + Parts (in parallel streams)
Service stream:
1. SPEC-SERVICE-001 appointment
2. SPEC-SERVICE-002 reception + job card
3. SPEC-SERVICE-003 bay scheduling
4. SPEC-SERVICE-005 QC
5. SPEC-SERVICE-006 delivery
6. SPEC-SERVICE-004 body shop
7. SPEC-SERVICE-007 warranty
8. SPEC-SERVICE-008 service campaigns

Parts stream:
1. SPEC-PARTS-001 parts master
2. SPEC-PARTS-002 supplier master
3. SPEC-PARTS-003 PO
4. SPEC-PARTS-004 GRN
5. SPEC-PARTS-007 issues to job card (links Service stream)
6. SPEC-PARTS-005 transfer
7. SPEC-PARTS-006 stock count

### Phase 6 — Finance + Notifications + Integrations
Finance:
1. SPEC-FINANCE-001 invoice (margin + TCS)
2. SPEC-FINANCE-002 e-invoice (IRP)
3. SPEC-FINANCE-003 thin GL
4. SPEC-FINANCE-005 collections
5. SPEC-FINANCE-006 refunds
6. SPEC-FINANCE-004 Tally export
7. SPEC-FINANCE-007 floor-plan interest
8. SPEC-FINANCE-008 commission & incentives

Notifications:
1. SPEC-NOTIFY-005 consent + opt-out
2. SPEC-NOTIFY-001 WhatsApp
3. SPEC-NOTIFY-002 DLT SMS
4. SPEC-NOTIFY-003 email
5. SPEC-NOTIFY-004 in-app inbox

Integrations (many unlock earlier specs — mock first, wire later):
1. SPEC-INTEG-001 Razorpay
2. SPEC-INTEG-002 IRP
3. SPEC-INTEG-008 BSP
4. SPEC-INTEG-003 Aadhaar
5. SPEC-INTEG-004 PAN
6. SPEC-INTEG-005 DigiLocker
7. SPEC-INTEG-007 Tally connector
8. SPEC-INTEG-006 loan APIs

### Phase 7 — Reporting + Audit + Platform
1. SPEC-AUDIT-001 immutable log
2. SPEC-PLATFORM-002 feature flags
3. SPEC-REPORT-001..006 dashboards
4. SPEC-AUDIT-002 access review
5. SPEC-AUDIT-003 event replay

### Phase 8 — Backend wiring
- Same contracts, real services.
- `backend-sanity` reviews each contract pre-implementation.
- Keep MSW fixtures as the e2e test data source.

---

## How to add a new spec

1. Pick a domain folder under `/specs/modules/`.
2. Use the next number (`NN-`) and a kebab slug.
3. Run `/spec` (see `.claude/commands/spec.md`) — the pipeline will produce the file.
4. Once `approved`, run `/build`.
5. Reference the spec ID in every commit: `[SPEC-INVENTORY-001] ...`.
