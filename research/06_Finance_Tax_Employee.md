# 06 · Finance, Tax & Employee Management

India-specific finance and tax blueprint for a multi-outlet luxury pre-owned dealer. This is the document that must be reviewed by tax counsel before go-live — the margin-scheme GST treatment and TCS logic carry direct legal exposure if modelled incorrectly.

---

## 1. Guiding principles

1. **DMS is source of truth; Tally is reporting slave.** Do not force accountants to migrate away from Tally. Instead, design one-way-dominant sync (DMS → Tally daily) with careful reverse-sync for Tally-originated adjustments.
2. **Per-VIN financial identity.** Each pre-owned unit is a distinct asset with its own cost ledger. P&L per car is a first-class report, not a derivation.
3. **Margin-scheme GST from the database up.** Quote engine, invoice generator, GSTR-1 output, and P&L reports must all handle margin-scheme correctly. Retrofitting is painful.
4. **Immutable audit trail for any financial or inventory-moving action.** Every mutation gets a before/after snapshot, user, IP, device, timestamp. Regulatory, forensic, and internal-fraud defensible.
5. **RBAC with row-level security per outlet.** An outlet manager in Mumbai cannot read Bangalore data unless explicitly granted. Enforced at the query layer, not the application layer.
6. **DPDP Act 2023 as architecture, not bolt-on.** Consent ledger, retention engine, data-subject-rights portal, and purpose-binding are designed into data models on day one.

---

## 2. GST margin scheme — the central tax design

### 2.1 Legal basis

- **Notification 8/2018-Central Tax (Rate)** — established margin scheme for second-hand motor vehicles
- **Notification 25/2023-Central Tax (Rate)** — clarifies/updates rates
- Applies when: supplier is a **registered dealer** in second-hand goods; buyer was an **unregistered person** (or a registered person from whom dealer did not take ITC); no ITC was claimed on inward supply

### 2.2 Rate structure

- **18% GST on margin** for motor vehicles (engine capacity > 1200cc petrol / > 1500cc diesel, and > 4000mm length — practically all luxury cars)
- **12% GST on margin** for smaller engines / sub-4000mm (edge case for luxury segment; may apply for some hot hatches)
- Rate is on **(sale value − landed cost)**, not on full sale value
- If margin is zero or negative, **no GST payable** (but transaction still reported in GSTR-1)

### 2.3 System design implications

- Every VIN has a computed **landed cost** at any point in time (acquisition + allocable costs — see Doc 04 §5.1)
- Quote engine computes margin GST as `max(0, sale_price − landed_cost) × rate`
- Invoice shows margin-scheme disclosure line: "GST computed under Rule 32(5) — Margin Scheme"
- HSN 8704 configured with margin-scheme flag
- GSTR-1 export includes margin-scheme transactions in correct section (B2C or B2B depending on buyer)
- **Fallback to normal scheme** for cars acquired from registered GST dealers with ITC taken — flag set on acquisition; different accounting path

### 2.4 Disclosure to customer

Invoice presents the on-road price breakdown with margin-scheme GST shown distinctly. Customer-facing explainer: "GST is computed on the dealer's margin as permitted under GST Notification 8/2018; this is different from a new-car sale where GST is on the full price."

---

## 3. TCS (Tax Collected at Source)

- **Section 206C(1F)** — TCS at 1% on sale of motor vehicles where consideration > ₹10 lakh
- Applies **regardless of scheme** (margin or normal)
- Collected from buyer, deposited with government
- Reported in **Form 27EQ** (quarterly TCS return)
- Buyer receives TCS credit via **Form 27D** certificate

### System requirements
- Auto-flag TCS applicability on any quote/invoice where sale_value > ₹10L
- Capture buyer PAN (mandatory) for TCS reporting
- Monthly TCS liability report → finance team initiates challan payment
- Quarterly 27EQ data export
- Form 27D generation for customers

---

## 4. E-invoicing (IRP / IRN / QR)

### 4.1 Mandate

E-invoicing is mandatory for B2B invoices where aggregate turnover > ₹5 crore. Luxury pre-owned dealers will typically cross this threshold; assume applicability. Additional triggers per CBIC timelines — track going forward.

### 4.2 Workflow

For each qualifying invoice:
1. DMS generates invoice JSON per IRP schema
2. Call IRP API via accredited GSP (ClearTax, IRIS Business, Taxilla, Masters India) — direct integration not typically allowed
3. IRP returns IRN (64-char hash) + QR code
4. IRN + QR embedded in PDF invoice
5. E-way bill generated for inter-state movement (auto-trigger for any inter-outlet transfer or delivery where ex-showroom crosses state lines)

### 4.3 Edge cases
- **Cancellation window** — IRN can be cancelled within 24 hours; after that, credit note is the only correction path
- **Credit note workflow** — for sale reversal, price correction, returns; maps to original IRN
- **Failure handling** — if IRP is down, invoice held in queue; retry with alerting
- **Quarterly reconciliation** — compare DMS invoices to IRP data, flag discrepancies

---

## 5. State-wise GST setup

- Each state is a **separate GSTIN**; a multi-outlet dealer with outlets in Bangalore + Mumbai + Chennai has 3 GSTINs
- Each GSTIN files its own **GSTR-1** (outward supplies, monthly) and **GSTR-3B** (summary + payment, monthly)
- **GSTR-2B** (inward supplies from vendor's GSTR-1) used for ITC reconciliation
- DMS GSTIN picker: every invoice tagged to the correct GSTIN based on outlet + customer + place-of-supply rules
- Inter-state transactions use IGST; intra-state use CGST + SGST

---

## 6. HSN/SAC configuration

- **8704** — motor vehicles (our sales)
- **8708** — parts and accessories
- **9987** — repair / service labor (note: specific SAC for "maintenance and repair services of motor vehicles"; verify current with tax advisor)
- **9961** — commission / agency services (if consignment fee applicable)
- Each SKU / job code maps to an HSN/SAC; system prevents invoice generation without mapping

---

## 7. Chart of accounts (indicative)

Structured for a multi-location auto dealer with three profit centers (Sales / Service / Parts):

- **Revenue accounts**
  - Pre-owned vehicle sales (margin-scheme)
  - Pre-owned vehicle sales (normal scheme)
  - Service labor revenue
  - Parts revenue
  - Warranty reimbursement revenue
  - Accessories revenue
  - Extended warranty commission
  - Insurance commission
  - Finance referral commission
  - PPI revenue
  - Consignment fee revenue (if in scope)
- **COGS accounts**
  - Vehicle COGS per VIN (landed cost expensed at sale)
  - Parts COGS
  - Labor cost absorbed into COGS (if standard costing for warranty)
- **Expenses** — rent, electricity, staff, marketing, tooling licenses, insurance, consumables, bad debts, depreciation
- **Assets** — inventory (vehicles, parts), fixed assets (tools, equipment, courtesy fleet), AR, cash/bank, prepaid
- **Liabilities** — AP, GST payable (CGST/SGST/IGST), TCS payable, warranty reserve, deferred revenue (extended warranty, AMC), employee dues, loans
- **Equity** — standard

Multi-profit-center tagging: every transaction line stamped with (outlet, department, profit center) for slicing.

---

## 8. Per-VIN inventory accounting

- Each VIN maintained as a **separate inventory asset** with its own ledger
- **Not FIFO, not weighted-average** — bespoke per-unit cost tracking
- Cost components accumulated continuously: acquisition, transport, refurb parts, refurb labor, certification, allocable overhead (daily rate × days held), holding-cost accrual
- On sale: entire landed cost moves to COGS in one journal entry; difference is gross margin
- Inventory revaluation workflow for stale stock (>90 days) — finance can book provision
- Physical verification quarterly; any VIN on books must be physically present at one of the outlets

---

## 9. AR (Accounts Receivable)

### 9.1 Customer segments

- **Retail customers** — rare for sales (most sales are settled before delivery); common for service
- **Finance companies / NBFCs** — dominant in sales; disbursement cycle 3–10 days post paperwork
- **Insurance companies** — AR for total-loss / claim settlements
- **Corporate fleet customers** — extended credit terms (typically 30–45 days)

### 9.2 AR sub-ledger

- Aging buckets: 0–30, 30–60, 60–90, 90+
- Dunning workflow by aging bucket (automated WhatsApp + email reminders)
- Write-off workflow with manager approval
- DSO dashboards per customer segment
- Application of receipts — auto-match on UTR / reference where possible; unmatched queue for finance review

### 9.3 Cash handling

- **PAN mandatory** for any cash receipt above ₹2L (IT Act 269ST)
- Aggregation logic: per-person-per-day cash receipts above ₹2L flagged
- SFT (Statement of Financial Transactions) reporting for reportable transactions
- Cash deposit limits per outlet; cash-in-transit tracking to bank
- POS machine settlements reconciled daily

---

## 10. AP (Accounts Payable)

- **OEM parts distributors** — largest vendor category; credit terms 15–30 days typical
- **Refurbishment vendors** — body shops (if outsourced), detailers, specialist repairs
- **Tool and diagnostic equipment vendors** — license renewals, calibration
- **Utility, rent, services** — regular monthly cycles
- **Consignment sellers** — if in scope, payout-on-sale model

### 10.1 Bill processing

- 3-way match: PO ↔ GRN ↔ vendor invoice
- Approval workflow by amount tier (> ₹50K needs manager; > ₹5L needs director)
- Payment scheduling with optimization: take early-payment discounts where offered; defer to terms otherwise
- OCR on vendor bills (v1.5) with AWS Textract / Google Document AI → auto-fill AP form

### 10.2 TDS on vendor payments

- TDS applicable on various vendor categories (professional services 10%, rent 10%, contracts 2%)
- TDS deducted and remitted monthly; quarterly return (26Q)
- Form 16A generated per vendor at year-end

---

## 11. Payments

### 11.1 Inbound (customer → us)

- **UPI Collect / Intent** — via Razorpay; link sent on WhatsApp; customer pays from app; webhook updates DMS
- **UPI QR on premises** — printed QRs at reception; amount-auto-entered via dynamic QR
- **Razorpay cards** — link-based or POS integration
- **NEFT / RTGS** — beneficiary pre-filled link with amount + ref; reconciled against bank statement
- **Cash** — captured with PAN if > ₹2L
- **Cheques / DDs** — deprecated in favor of electronic but still used by some customers

### 11.2 Outbound (us → vendor / employee / government)

- NEFT / RTGS / IMPS via corporate banking integration (manual file upload v1; API v2)
- GST / TCS / TDS challan payments — manual v1 (finance clerk operates bank portal); reconciled back into DMS
- Vendor payments in bulk batches with maker-checker approval
- Employee salary payouts via bank file (HRMS integration — see §15)

### 11.3 Bank reconciliation

- Daily feed from bank (MT940 / CSV / bank API where available)
- Auto-match: amount + UTR + date within tolerance
- Unmatched queue: manual assignment with comment
- Reconciled-to-close rate is a KPI for finance team

---

## 12. Commission engine

- Per-role commission config (sales exec, sales manager, finance manager)
- Base commission: flat % of margin, flat ₹ per deal, or tiered by margin%
- Slab bonuses: units/month, margin/month, target achievement %
- Clawback rules: if deal unwinds within N days, commission reversed in next payout
- Split commission for team-closed deals (lead-gen + closer)
- Real-time accrual visible to earner
- Monthly payout: approved by sales manager → HR processes with salary

---

## 13. Period-end close

Monthly routine:
1. Cut-off enforced on T-1 (no new invoices dated in prior month)
2. Bank reconciliation complete for all accounts
3. Inventory recount (physical vs system) — discrepancies investigated
4. AR aging finalized; provisions booked for doubtful debts
5. AP aging finalized; accruals for unbilled services booked
6. Warranty reserve actuarial review; top-up if claims depleting reserve
7. Deferred revenue realization (extended warranty, AMC — amortize monthly)
8. Fixed asset depreciation run
9. **GSTR-1** outward supply prepared and filed
10. **GSTR-2B** inward supply matched against AP; ITC reconciled
11. **GSTR-3B** summary prepared and filed; GST payment challan
12. **TCS 27EQ** quarterly prepared (end of quarter)
13. **TDS 26Q** quarterly prepared (end of quarter)
14. P&L consolidated + per-outlet run; management review

System supports this routine with close-check dashboard (what's outstanding, what's done).

---

## 14. Standard reports

- Consolidated P&L (month, quarter, year)
- P&L per outlet, per profit center
- Gross margin per car (realized)
- Margin portfolio view (by brand / age / price tier / days-to-sell)
- OpEx ratio (OpEx / revenue)
- Service revenue mix (labor / parts / warranty / extended)
- Contribution margin per bay
- AR aging; DSO trend
- AP aging; DPO trend
- Cash conversion cycle
- GST reconciliation: GSTR-1 vs 3B vs book
- Commission accrual vs paid
- Employee productivity (sales: closes/month; service: hours earned)
- Tax liability dashboard (GST, TCS, TDS upcoming)
- Warranty reserve health

---

## 15. Employee management (light HRMS v1; full HRMS deferred)

### 15.1 v1.0 scope

- Employee master (personal, role, outlet, reporting manager, start date, certifications)
- **RBAC mapping** — employee role drives system permissions
- Attendance (login-based + optional biometric feed)
- Leave requests + approvals
- Shift scheduling (service workshop has shift patterns)
- Commission and incentive visibility (self-service)
- Certification/training history
- Document vault (offer letter, appointment, ID proofs, tax declarations)

### 15.2 Payroll

**Do not build in-DMS payroll.** Instead, integrate with **greytHR or Keka** (India payroll leaders):
- DMS exports attendance + commission CSV monthly
- greytHR/Keka computes salary, TDS, PF, ESI, professional tax
- Salary bank file generated externally
- Form 16 generated externally at year-end

### 15.3 v1.5 additions

- Shift swap workflow
- OT approval workflow
- Expense reimbursement workflow
- Performance review cycle support (goals, reviews, ratings)

### 15.4 What NOT to build

- Payroll computation (use greytHR/Keka)
- PF/ESI/PT returns (use payroll provider)
- Biometric hardware (third party)
- Recruitment ATS (use external tools)

---

## 16. RBAC and row-level security

### 16.1 Role set (minimum)

- Super Admin (full access, MFA required)
- Regional Head (multi-outlet read + write in region)
- Outlet Manager (single outlet full access)
- Sales Manager / Service Manager / Parts Manager (departmental within outlet)
- Sales Exec / Service Advisor / Technician / Parts Counter (individual contributor)
- Accounts (cross-outlet financial access; no inventory mutation)
- Marketing (lead + campaign data; no financial)
- Customer Care (read-only customer 360; create tickets)
- HR (employee data; no financial; no customer PII)

### 16.2 Enforcement model

- **Row-level security at database** (Postgres RLS) — every query automatically filters on user's outlet scope
- Application cannot override at query time (by design); only a break-glass procedure (audit-logged, manager-approved) grants temporary cross-outlet access
- Field-level masking for ultra-sensitive fields (PAN, Aadhaar, bank account) shown as masked unless role permits unmask (unmask is audit-logged)

### 16.3 MFA

- Mandatory for Super Admin, Regional Head, finance roles with payment initiation
- TOTP-based (Google Authenticator / Authy) or SMS (last resort)
- Optional for all other roles; recommended default-on

---

## 17. Audit trail

- Every write to finance, inventory, customer, RO, quote, payment tables is logged
- Log entry includes: entity id, action (create/update/delete), user, IP, device fingerprint, **before/after JSON diff**, timestamp (UTC)
- Log stored in append-only table; tamper-evident via hash chain (each row hashes prior row's hash)
- Alerts on tampering attempt (detected via chain break)
- 7-year retention (aligns with Income Tax Act record-keeping)
- Queryable UI for auditors (read-only; also audit-logged)

---

## 18. KYC

### 18.1 Flows

- **Aadhaar eKYC** — via sub-KUA partner (Signzy / Shunyam / iSafe); OTP-based customer consent
- **PAN verification** — NSDL API; name match against declared name
- **DigiLocker** — pull RC, driving license, Aadhaar, PAN with customer consent; optional but recommended
- **Video KYC** — for high-value transactions (> ₹50L) or name-mismatch cases; FATF-aligned

### 18.2 When

- At test drive booking (DL + basic identity)
- At token / deal close (full KYC: PAN + address proof)
- At sale invoice (PAN mandatory for TCS; full verified identity for sales > ₹10L)
- At service (basic identity; no full KYC needed)
- At finance application (as per NBFC partner's KYC; separate from ours)

### 18.3 Consent

- Consent capture at KYC, DPDP-compliant (purpose-bound, time-bound, revocable)
- Consent artifact stored with KYC record
- Audit trail of consent collection + revocation events

---

## 19. DPDP Act 2023 compliance

### 19.1 Core obligations

- **Consent** — purpose-specific, informed, revocable; captured at collection
- **Purpose limitation** — data used only for stated purpose
- **Data minimization** — don't collect what you don't need
- **Retention** — time-bound; auto-delete after purpose fulfilled
- **Security** — encryption at rest (KMS) + in transit (TLS 1.2+); access controls
- **Breach notification** — 72h to Data Protection Board in material breach
- **Data Subject Rights** — access, correction, deletion, grievance

### 19.2 System design

- **Consent ledger** — every consent event stored (purpose, scope, duration, revocation)
- **Retention engine** — scheduled job deletes / anonymizes records past retention
- **DSR portal** (v1.5) — customer-facing self-serve for access / correction / deletion requests; fulfilled within statutory timelines
- **PII encryption** — column-level encryption for PAN, Aadhaar, bank details; KMS-managed keys; field-level audit on decryption
- **Data residency** — all data in AWS **ap-south-1 Mumbai**; cross-border transfer only if/when whitelisted jurisdictions rules finalize
- **DPO (Data Protection Officer)** — designate (regulation threshold applies based on scale); contact published

### 19.3 Vendor / processor contracts

- DPA (Data Processing Agreement) with every processor (BSP, KYC partner, cloud, analytics)
- Sub-processor list maintained and disclosed
- Audit rights reserved

---

## 20. Tally integration

### 20.1 Why Tally-first

Most Indian accountants live in Tally. The accounting team at the dealership will resist any migration. **Design accepts this reality** — DMS is source of truth for operations and modelling; Tally gets a clean, consolidated sync for reporting and statutory compliance.

### 20.2 Sync model

- **Direction** — DMS → Tally daily (primary); Tally → DMS weekly (for accountant adjustments and reclassifications)
- **Transport** — Tally XML over TCP socket (Tally's native ODBC-like model) OR Tally Prime API for newer deployments
- **Volume** — end-of-day batch (daily cut-off at 23:59 local); individual voucher sync for invoices needing same-day visibility (invoice on sale, receipt on payment)

### 20.3 What syncs

- Sales vouchers (invoices)
- Receipt vouchers (customer payments)
- Purchase vouchers (vendor bills)
- Payment vouchers (vendor payments)
- Journal vouchers (accruals, depreciation, revaluation, warranty reserve movements)
- Credit/debit notes
- GST master (GSTINs, HSN codes, rates)
- Party ledgers (customers, vendors)
- Cost-center breakdown (outlet + department + profit center)

### 20.4 Reverse sync

- Accountant reclassification journals made in Tally → pulled back weekly to keep DMS books in sync
- Conflict handling: DMS is authoritative for operations data; Tally is authoritative for reclassifications and tax adjustments

### 20.5 Zoho Books alternative (v1.5)

- For dealers preferring cloud accounting, provide Zoho Books sync as alternative
- Same data contract; different transport (REST API)

### 20.6 Why not QuickBooks

- QuickBooks India does not model GST margin scheme cleanly; significant custom workarounds needed. Recommend avoiding for this use case.

---

## 21. Key integration partners

- **E-invoicing GSP** — ClearTax / IRIS / Taxilla / Masters India
- **KYC partners** — Signzy / Shunyam / iSafe (sub-KUA); PAN NSDL direct
- **DigiLocker** — government, no cost
- **Razorpay** — payment gateway (UPI, cards, NEFT, RTGS links)
- **WhatsApp BSP** — Gupshup / AiSensy / MSG91 / Wati
- **SMS** — MSG91 with DLT registration
- **Email** — SES (AWS) or SendGrid
- **Tally** — desktop installation with network file share OR Tally Prime with cloud connector
- **greytHR / Keka** — payroll
- **Cloud** — AWS ap-south-1 Mumbai

---

## 22. Open decisions affecting this vertical

See Doc 08. Finance-specific:

1. Consignment in scope → changes AP, title, GST treatment
2. Tally vs Zoho choice per outlet (or hybrid)
3. E-invoicing GSP selection
4. KYC partner selection (requires commercial negotiation)
5. Warranty reserve % (actuarial model or heuristic to start)
6. Payroll provider (greytHR / Keka / other)
7. Finance partner list (drives AR sub-ledger for financier receivables)
8. Data residency stance for any future international expansion
