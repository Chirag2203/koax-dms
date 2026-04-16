# 13 · Integration Contracts Index

One-pager per third-party integration the DMS depends on. Each sheet lists auth model, key endpoints/events, rate limits, retry/idempotency posture, failure modes, and v1 scope. This is the authoritative index — feature specs reference by integration name and endpoint ID rather than restating.

Conventions used throughout:
- **Sandbox** = provider test environment we target pre-go-live.
- **Idempotency key** = stable business key we send on retry so the provider dedupes.
- **Circuit breaker** = open on error-rate threshold; fail-soft path per integration.
- All outbound calls go through the `integrations/` module with structured request/response logging to the Event Log.

---

## 1. Razorpay (Payments, UPI, Cards, Netbanking)

| Field | Value |
|---|---|
| Purpose | Customer-facing collections: token, down-payment, service bills, EMI down-payments |
| Auth | Basic Auth with Key ID + Key Secret per merchant account; per-outlet sub-account via Razorpay Route |
| Base URL | `https://api.razorpay.com/v1/` |
| Webhook | HMAC-SHA256 signed; secret per webhook endpoint |
| Sandbox | Test mode keys; same API surface |
| Rate limits | 300 req/min per key (documented); we target ≤60 rpm steady state |
| Retry | Idempotency via our `receipt_id`; safe to retry creation calls |

### Key endpoints
- `POST /orders` — create order with `amount`, `currency=INR`, `receipt=<our_id>`, `notes`
- `POST /payments/:id/capture` — auto-capture on successful auth
- `POST /refunds` — full or partial; require reason
- `GET /payments/:id` — reconcile
- `POST /payment_links` — WhatsApp/SMS share links (preferred for remote customers)
- `POST /subscriptions` — not used in v1
- `POST /payouts` (RazorpayX) — refunds + consignor payouts via bank transfer

### Webhook events consumed
- `payment.authorized`, `payment.captured`, `payment.failed`
- `refund.created`, `refund.processed`, `refund.failed`
- `order.paid`
- `payment_link.paid`, `payment_link.expired`

### Failure modes & fallback
- Provider outage → display bank-transfer NEFT/RTGS instructions + manual reconciliation UI
- Webhook missed → poll `GET /payments?from=<last_seen>` every 5 min as backstop
- Chargeback webhook → route to finance queue; reverse invoice state via I4/I5

### V1 scope
- Collections (orders + payment links) ✅
- Refunds ✅
- RazorpayX payouts for consignor settlement ✅
- Smart Collect (virtual account) — deferred to v1.5

---

## 2. WhatsApp Business API (via BSP)

| Field | Value |
|---|---|
| Purpose | All customer notifications: lead confirmations, quotes, estimates, OTP-for-approval, reminders, delivery updates |
| BSP candidates | Gupshup, AiSensy, MSG91, Wati — final pick pending procurement (see Doc 08 risk register) |
| Auth | API key per channel; BSP-specific |
| Cost model | Per-conversation (24h session) pricing; utility vs marketing template categories |
| Rate limits | BSP-imposed tiering (1K/10K/100K msgs/day); Meta also throttles |
| Templates | Pre-approved by Meta; categories: utility, marketing, authentication |

### Key endpoints (normalized across BSPs)
- `POST /send-template` — template name + variables + media link
- `POST /send-session-message` — free-form reply within 24h window
- `GET /template-status` — approved/pending/rejected
- `POST /opt-in` / `POST /opt-out` — consent management

### Webhook events consumed
- `message.sent`, `message.delivered`, `message.read`, `message.failed`
- `message.inbound` — customer replies; route to CRM inbox + AI classifier
- `template.approved`, `template.rejected`

### Template catalog (v1)
Lead capture ACK, test-drive confirmation, quote PDF, token receipt, delivery appointment, service booking confirmation, estimate approval (with OTP/button), service ready for pickup, invoice share, payment reminder, CSAT follow-up. Every template has English + Hindi variants; additional regional languages per outlet state.

### Failure modes & fallback
- Template rejected → use SMS (DLT) for the same message category; log template gap for ops
- 24h window expired → can only send approved template; no free-form
- Meta throttle → BSP queues and drips; for time-sensitive (OTP) fall back to SMS

### V1 scope
- Outbound templates + inbound routing ✅
- Interactive buttons (approve/decline) ✅
- Media attachments (PDFs up to 100 MB) ✅
- Chatbot/auto-reply ✅ (rule-based; AI layer deferred)

---

## 3. IRP / GSP — E-invoicing

| Field | Value |
|---|---|
| Purpose | Submit B2B invoices to IRP, receive IRN + signed QR; required above turnover threshold |
| GSP candidates | ClearTax, IRIS, Taxilla, Masters India |
| Auth | GSP-specific (OAuth2 or API key); GSP brokers to IRP |
| Rate limits | IRP: 1000 invoices / hour / GSTIN (generous); GSP may throttle |
| SLA | IRP response target <3s; our NFR-P-09 |

### Key endpoints (via GSP)
- `POST /einvoice/generate` — invoice JSON → IRN + signed QR + ack no.
- `POST /einvoice/cancel` — within 24h only
- `POST /ewaybill/generate` — goods movement
- `POST /ewaybill/update-vehicle`, `POST /ewaybill/cancel`
- `GET /einvoice/:irn` — fetch invoice

### Failure modes & fallback
- IRP downtime → queue and retry (persistent outbox); show "IRN pending" on invoice; CRON resubmit every 15 min
- Validation error (duplicate, bad HSN, bad party GSTIN) → route to finance exception queue with provider's error code
- 24h cancellation window missed → must issue credit note instead (I5)

### Invariants
- Invoice JSON must be deterministic per our invoice ID — GSP calls are idempotent keyed on our invoice ID
- Store raw request + response for 7 years (NFR-R-03)
- IRN + QR embedded in final PDF

### V1 scope
- E-invoice generate + cancel ✅
- E-way bill for inter-state / threshold cases ✅
- GSTR-1 autofill from e-invoice portal (read-only) ✅

---

## 4. DigiLocker

| Field | Value |
|---|---|
| Purpose | Customer consented pull of RC, DL, Aadhaar-eKYC-compliant ID docs |
| Auth | OAuth2 (customer-driven consent); redirect flow |
| Provider | Meri Pehchaan / DigiLocker partner portal |
| Rate limits | Per-consent, generous |

### Flow
1. Customer clicks "Fetch from DigiLocker" in our KYC UI
2. Redirect to DigiLocker; customer authenticates + grants scopes (RC, DL)
3. Callback with auth code → exchange for access token
4. `GET /documents/:doc-type` fetches signed PDF + machine-readable JSON

### Key endpoints
- `GET /oauth2/1/authorize` — consent screen
- `POST /oauth2/1/token` — exchange
- `GET /files/issued` — list available docs
- `GET /files/issued/:uri` — download

### V1 scope
- DL + RC pull for test-drive verification and paperwork ✅
- Aadhaar pull **not used** (we use sub-KUA instead — see sheet 5)

### Failure modes
- Document not available in DigiLocker → manual upload + verification path
- Token expiry → re-consent; never stored long-term for re-pulls

---

## 5. Aadhaar eKYC (via Sub-KUA)

| Field | Value |
|---|---|
| Purpose | OTP-based or biometric Aadhaar KYC for high-value paperwork, loan pre-approval, DLT |
| Sub-KUA candidates | Signzy, Shunyam, iSafe (final pick pending vendor review) |
| Auth | Sub-KUA API key; license under their KUA license |
| Compliance | DPDP + Aadhaar Act; masked Aadhaar only stored; VID preferred |

### Key endpoints
- `POST /aadhaar/otp` — send OTP to Aadhaar-linked mobile
- `POST /aadhaar/verify` — verify OTP → returns eKYC XML (name, DOB, gender, address, photo)
- `POST /vid/generate` — generate Virtual ID
- `POST /offline-kyc` — offline XML/QR verification (preferred for walk-in)

### Invariants
- Never store full Aadhaar number; only masked last-4 and VID-based reference
- Store eKYC XML encrypted; retention per DPDP retention matrix
- Purpose binding: capture "Aadhaar eKYC for vehicle purchase / loan / service" on every call

### V1 scope
- OTP eKYC for paperwork ✅
- Offline XML/QR ✅
- Biometric (fingerprint via partner device) — v1.5 if needed

---

## 6. PAN Verification (NSDL / Protean)

| Field | Value |
|---|---|
| Purpose | PAN name-match validation; mandatory for sales > ₹2L and all loan applications |
| Provider | NSDL/Protean via approved aggregator (often same as sub-KUA) |
| Auth | Aggregator API key |
| Rate limits | ~5 req/sec; cache results |

### Key endpoints
- `POST /pan/verify` — PAN + name → match confidence + status (valid, invalid, not-found)
- `POST /pan/link-status` — Aadhaar-PAN linking check
- `POST /form60/collect` — Form 60 workflow for customers without PAN

### Failure modes
- Name mismatch > threshold → route to KYC exception queue; manual verification
- NSDL outage → fallback to name-on-DL + Aadhaar as interim; re-verify overnight

### V1 scope
- PAN verify on KYC ✅
- Aadhaar-PAN link check ✅
- Form 60 workflow ✅

---

## 7. OBV — OrangeBookValue / Pricing Feed

| Field | Value |
|---|---|
| Purpose | Market valuation for trade-ins and acquisitions; benchmark listed prices |
| Provider | OBV API (Droom) or comparable aggregator |
| Auth | API key |
| Rate limits | Package-dependent; ~10K lookups/month typical |

### Key endpoints
- `GET /valuation?make=&model=&variant=&year=&km=&city=&condition=` → range + fair price
- `GET /trends?model=&window=90d` — price trend
- `GET /stock-availability` — what else is on market

### V1 scope
- Acquisition quoting: suggest offer based on OBV + internal margin model ✅
- Stale-stock detection: compare our list price vs OBV trend ✅

---

## 8. HDFC Bank Auto Loan API

| Field | Value |
|---|---|
| Purpose | Customer-consented soft-pull pre-approval, loan application submission, status tracking |
| Auth | OAuth2 client credentials + per-app customer consent token |
| Environment | HDFC Developer Portal (sandbox first; prod after UAT sign-off) |
| SLA | Pre-approval response target <30s; application submit async |

### Key endpoints
- `POST /auto-loan/pre-approval` — PAN + income bucket + desired amount → eligibility, indicative rate
- `POST /auto-loan/application` — full KYC + income docs + vehicle quote → application ID
- `GET /auto-loan/application/:id/status` — current status (in-review, sanctioned, disbursed, rejected)
- `POST /auto-loan/document-upload` — attach PDFs
- Webhook: `loan.status.changed`

### Failure modes
- Soft-pull throttled / rejected by bureau → offer ICICI path; no reason exposed to customer
- Customer drop-off mid-application → our sales exec sees pause point, follows up

### V1 scope
- Pre-approval soft pull ✅
- Full application submission ✅
- Status polling + webhook consumption ✅
- DSA co-branded journey — coordinate with HDFC business team

---

## 9. ICICI Bank Car Loans API

| Field | Value |
|---|---|
| Purpose | Parallel path to HDFC; customer choice and competitive rates |
| Auth | OAuth2; similar shape to HDFC |
| Environment | ICICI Developer Portal |
| SLA | Comparable to HDFC |

### Key endpoints (normalized)
- `POST /car-loan/eligibility` — soft pre-approval
- `POST /car-loan/application` — submit
- `GET /car-loan/application/:id` — status
- Webhook: `application.decision`

### V1 scope
- Same parity as HDFC (pre-approval, application, status) ✅
- Pricing comparison UI: show both banks side-by-side with indicative EMI ✅

---

## 10. SMS — DLT-compliant (BSP)

| Field | Value |
|---|---|
| Purpose | OTPs, transactional SMS where customer has no WhatsApp / failed WhatsApp delivery |
| BSP candidates | MSG91, Kaleyra, Gupshup (shared with WhatsApp), Netcore |
| Compliance | TRAI DLT registration mandatory: entity + template ID + sender ID |
| Auth | API key |
| Rate limits | ~1K-10K sms/min tier-dependent |

### Key endpoints
- `POST /sms/send` — phone + template ID + variables
- `GET /sms/status/:id` — delivery status
- Webhook: `sms.delivered`, `sms.failed`, `sms.bounced`

### Template governance
- Transactional, Service-Implicit, Service-Explicit, Promotional categories
- DLT template registry tracked in DMS with DLT IDs; mismatch blocks send
- Sender IDs per brand: one per outlet or one global — confirm with TRAI filing

### V1 scope
- OTP ✅ (primary OTP channel for KYC, auth, approvals)
- Transactional fallbacks (delivery, service) when WhatsApp unavailable ✅
- Promotional — requires explicit consent only; suppressed during NDNC hours

---

## 11. Tally — Statutory Accounting Sync

> **Status: working assumption pending Q8 decision.** Keep as placeholder per 2026-04-15 decision doc.

| Field | Value |
|---|---|
| Purpose | DMS → Tally daily sync of JVs, sales, purchases, payments for statutory books |
| Target versions | Tally Prime (API) preferred; Tally ERP9 (XML over ODBC/TCP) legacy support |
| Auth | Tally Prime API key; ERP9 TCP on LAN / VPN |
| Rate limits | Self-hosted; bounded by Tally machine |

### Integration shape
- Nightly CRON: collect the day's posted vouchers in DMS `journal_voucher` table
- Transform to Tally XML / JSON schema
- Push in batches; Tally returns voucher GUIDs
- On success, mark DMS voucher `synced_to_tally=true, tally_ref=<guid>`
- Reconciliation report: end-of-month trial balance diff DMS vs Tally; alert on drift

### Invariants
- DMS is source of truth for all operational finance; Tally mirrors for statutory
- If Q8 decides "build own accounting fully", this sheet is deprecated and replaced by a statutory-export-only module

### V1 scope
- Daily voucher push ✅
- Master data sync (ledgers, cost centers) ✅
- Reverse sync (bank rec from Tally) — deferred

---

## 12. VAHAN / Parivahan (Deferred)

| Field | Value |
|---|---|
| Purpose | RC lookup, RTO transfer status |
| Status | Deferred to v1.5+ |
| Reason | No stable public API; manual RTO agent workflow in v1 |
| Interim | Dealer RTO agents use VAHAN portal manually; DMS captures status via internal workflow |

---

## 13. Email (Transactional)

| Field | Value |
|---|---|
| Purpose | Invoice PDFs, certificates, onboarding, password resets |
| Provider | AWS SES (preferred, same region) or SendGrid |
| Auth | AWS SDK / SendGrid API key |
| Rate limits | SES: 14 msgs/sec default, raise on request |

### V1 scope
- Transactional only ✅
- Domain DKIM/SPF/DMARC setup per outlet domain ✅
- Marketing email — deferred; when added, separate warmed-up sub-domain

---

## 14. Storage & CDN (Internal AWS)

Not a third party, but tracked here for consistency.

- **S3** for vehicle photos (original + derived), documents, certificates, invoice PDFs, audit log archives. Bucket-per-purpose; lifecycle rules (Glacier after 90d for audit, 7y for invoices).
- **CloudFront** for public storefront assets + signed URLs for time-boxed private downloads (e.g., invoice PDF share links).
- **KMS** for column-level encryption keys; per-tenant key aliases.

---

## 15. Error & Retry Playbook (cross-integration)

Applies to all third-party calls unless overridden above.

| Signal | Action |
|---|---|
| 429 Rate Limited | Respect `Retry-After`; back off exponential base 500ms, cap 30s |
| 5xx | Retry 3x with jitter, then outbox + alert ops |
| 4xx (our bug) | No retry; route to dev exception queue |
| Timeout | Treat as 5xx; idempotency key protects against double-side-effects |
| Webhook signature invalid | Reject; alert security; do not process |
| Webhook duplicate | Dedupe by provider event ID; idempotent handler |

All outbound integration calls flow through the `integrations/` module and are recorded in `IntegrationEventLog` with request/response pairs (PII redacted at sink per NFR-D-02). Webhooks land in a signed endpoint, are persisted raw first, then processed asynchronously.

---

## 16. Integration sign-off matrix

| Integration | Vendor selected | Sandbox access | Prod access | UAT passed | Go-live approver |
|---|---|---|---|---|---|
| Razorpay | ☐ | ☐ | ☐ | ☐ | Finance Head |
| WhatsApp BSP | ☐ | ☐ | ☐ | ☐ | Marketing + Legal |
| IRP / GSP | ☐ | ☐ | ☐ | ☐ | Finance Head |
| DigiLocker | ☐ | ☐ | ☐ | ☐ | Legal / DPO |
| Aadhaar sub-KUA | ☐ | ☐ | ☐ | ☐ | Legal / DPO |
| PAN NSDL | ☐ | ☐ | ☐ | ☐ | Finance |
| OBV | ☐ | ☐ | ☐ | ☐ | Sales Head |
| HDFC Auto Loan | ☐ | ☐ | ☐ | ☐ | Sales Head + Finance |
| ICICI Car Loans | ☐ | ☐ | ☐ | ☐ | Sales Head + Finance |
| SMS BSP (DLT) | ☐ | ☐ | ☐ | ☐ | Marketing + Legal |
| Tally | ☐ | ☐ | ☐ | ☐ | Finance Head (Q8 pending) |
| SES / SendGrid | ☐ | ☐ | ☐ | ☐ | CTO |

All specs that touch an integration must cite this document's sheet number + the specific endpoint / event. Any new integration requires a new sheet in this document before the spec is approved.
