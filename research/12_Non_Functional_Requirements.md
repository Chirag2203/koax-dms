# 12 · Non-Functional Requirements (NFRs)

Consolidated quality bars the product must meet. Every feature spec must include an NFR section that references entries here by ID rather than restating. If a feature has stricter targets than the defaults, it states them explicitly.

NFRs are measurable by design. "Fast" is not an NFR; "p95 < 300ms" is.

---

## 1. How to read this document

Each NFR has:
- **ID** — cite by ID in specs
- **Category** — Performance / Availability / Security / Compliance / etc.
- **Requirement** — the measurable bar
- **Applies to** — which modules / flows
- **Test method** — how it is verified
- **Escalation** — what happens if it isn't met

---

## 2. Performance

### NFR-P-01 — Storefront page load
- **Requirement:** Largest Contentful Paint (LCP) p75 < 2.0s on mobile, p95 < 3.0s
- **Applies to:** Home, Listing, VDP
- **Test:** Synthetic + RUM; WebPageTest nightly; Chrome UX Report monthly review
- **Escalation:** Regression > 20% triggers P2; rollback candidate

### NFR-P-02 — Storefront interactivity
- **Requirement:** Interaction to Next Paint (INP) p75 < 200ms
- **Applies to:** All storefront pages
- **Test:** RUM
- **Escalation:** Regression > 25% triggers investigation

### NFR-P-03 — API read latency
- **Requirement:** p95 < 300ms, p99 < 1s for authenticated reads
- **Applies to:** All REST endpoints
- **Test:** Service-level tracing; synthetic probes
- **Escalation:** p95 > 500ms sustained 15 min → page

### NFR-P-04 — API write latency
- **Requirement:** p95 < 500ms, p99 < 2s
- **Applies to:** All REST writes
- **Test:** As above
- **Escalation:** As above

### NFR-P-05 — Inventory search
- **Requirement:** p95 < 200ms for faceted search queries returning ≤ 50 items
- **Applies to:** `/api/inventory/search`
- **Test:** Load test monthly with realistic filter distribution
- **Escalation:** Over-target → index tuning sprint

### NFR-P-06 — IRP round-trip
- **Requirement:** p95 < 3s, p99 < 10s end-to-end including GSP
- **Applies to:** Invoice generation
- **Test:** Probe + UI-layer async fallback
- **Escalation:** If IRP degrades, invoice stays in `Generated` state with IRN pending; UX communicates clearly

### NFR-P-07 — PDF generation (invoice / certificate)
- **Requirement:** p95 < 5s; p99 < 15s
- **Applies to:** Invoice PDF, CPO Certificate PDF, RO summary PDF
- **Test:** Background job metrics

### NFR-P-08 — WhatsApp template send (BSP queue → delivered)
- **Requirement:** p95 enqueue-to-delivered < 30s; delivery status updates within 2 min
- **Applies to:** Notifications module
- **Test:** BSP delivery callbacks + synthetic

### NFR-P-09 — Inspector PWA offline sync
- **Requirement:** Full day of offline inspection data (typ. 5 CPO + 20 VHC) syncs within 60s of coming online
- **Applies to:** Inspector PWA
- **Test:** Integration test with airplane-mode simulation

### NFR-P-10 — Dashboard render
- **Requirement:** Reporting dashboard first interaction < 2s; chart-render < 5s with cached aggregates
- **Applies to:** Admin reporting pages
- **Test:** Synthetic

### NFR-P-11 — Bulk job throughput
- **Requirement:** Daily Tally/accounting sync completes < 30 min for typical day (≤ 2k vouchers); end-of-month run < 2h
- **Applies to:** Finance sync
- **Test:** Staging runs

---

## 3. Capacity & Scale

### NFR-C-01 — Baseline throughput
- **Requirement:** System handles 3 outlets × (500–2000 sales units/year + 20k–50k ROs/year) without degradation
- **Test:** Capacity planning model reviewed quarterly

### NFR-C-02 — Peak concurrent users
- **Requirement:** 50 concurrent back-office users (avg), 200 peak; 1k concurrent storefront visitors (avg), 5k peak
- **Test:** Load test against realistic mix

### NFR-C-03 — Data volume
- **Requirement:** Postgres handles 5y of data (~5M invoices, ~10M RO line items, ~100M audit events) without partitioning until exceeded
- **Test:** Projection based on first 12 months

### NFR-C-04 — Media storage
- **Requirement:** S3 growth projected at ~1TB/year across inventory media + VHC evidence; lifecycle policies cap active cost

---

## 4. Availability & Reliability

### NFR-A-01 — Overall uptime
- **Requirement:** 99.5% monthly for all back-office + storefront (≈ 3.6h downtime/mo)
- **Test:** Uptime monitoring; incident review
- **Exclusions:** Scheduled maintenance windows, announced

### NFR-A-02 — Customer-facing uptime
- **Requirement:** Storefront 99.9% monthly (luxury buyers expect polish)
- **Test:** CloudFront + uptime probes
- **Exclusions:** None — even scheduled maintenance should use blue/green

### NFR-A-03 — Critical-transaction success rate
- **Requirement:** Payment + invoice-IRN flows: 99.95% success excluding upstream (IRP / Razorpay) outages
- **Test:** Failure-rate tracking by transaction type

### NFR-A-04 — Recovery Point Objective (RPO)
- **Requirement:** ≤ 1 hour data loss in disaster
- **Test:** RDS PITR + cross-region backup verified quarterly

### NFR-A-05 — Recovery Time Objective (RTO)
- **Requirement:** ≤ 4 hours to restore service in disaster
- **Test:** DR drill quarterly with documented runbook

### NFR-A-06 — Maintenance window
- **Requirement:** Planned maintenance during 02:00–05:00 IST Wed or Sun; customer-notified 48h prior
- **Test:** Deploy schedule adherence

---

## 5. Security

### NFR-S-01 — Transport encryption
- **Requirement:** TLS 1.2+ everywhere; HSTS on public endpoints; certificate auto-renewal
- **Test:** SSL Labs monthly scan target A+

### NFR-S-02 — Encryption at rest
- **Requirement:** All stored data encrypted at rest (RDS KMS, S3 SSE-KMS, EBS default)
- **Test:** Config review quarterly

### NFR-S-03 — Sensitive field encryption
- **Requirement:** PAN, Aadhaar, bank account, DL: column-level encryption using application-layer KMS envelope
- **Test:** Schema review; random row inspection

### NFR-S-04 — Secrets management
- **Requirement:** No secrets in code or env files; AWS Secrets Manager with rotation for DB, API keys
- **Test:** Repo scan in CI; secrets rotation audit

### NFR-S-05 — Authentication
- **Requirement:** Argon2id password hashing; JWT access token TTL ≤ 15 min; refresh token rotation; MFA mandatory for Super Admin + financial-payout roles
- **Test:** Auth flow integration test

### NFR-S-06 — Authorization
- **Requirement:** RBAC with outlet-scoped RLS; no direct DB writes from services without session context; break-glass audit-logged
- **Test:** Penetration test — verify no cross-outlet read via API

### NFR-S-07 — Rate limiting
- **Requirement:** Per-user 100 req/min, per-IP 300 req/min default; stricter for login + OTP flows
- **Test:** Rate-limit probe + abuse monitoring

### NFR-S-08 — Dependency hygiene
- **Requirement:** No known criticals in production dependencies older than 7 days; Dependabot + weekly review
- **Test:** CI fail on critical CVE

### NFR-S-09 — SAST / DAST
- **Requirement:** CodeQL on every PR; DAST weekly on staging; annual pen test
- **Test:** Track findings → remediation SLA (critical 7 days, high 30, medium 90)

### NFR-S-10 — Session management
- **Requirement:** Idle session timeout 30 min (configurable per role); concurrent session limit per user configurable
- **Test:** Integration test

### NFR-S-11 — Audit log tamper-evidence
- **Requirement:** Hash-chained audit log with nightly integrity verification; tamper detection pages on-call
- **Test:** Integrity job + synthetic tamper drill

### NFR-S-12 — Logging hygiene
- **Requirement:** No PII or secrets in application logs; structured logging with masking middleware
- **Test:** Log-scan job in CI + nightly production log sampling

---

## 6. Privacy & Data Protection (DPDP Act 2023)

### NFR-D-01 — Data residency
- **Requirement:** All personal data stored and processed in India (AWS ap-south-1); cross-border transfer only if/when whitelisted jurisdictions allow
- **Test:** Infrastructure review

### NFR-D-02 — Consent capture
- **Requirement:** Every personal-data collection point captures purpose-specific consent; consent event logged
- **Test:** UX review + consent ledger spot-check

### NFR-D-03 — Consent enforcement
- **Requirement:** Notifications & marketing automation verify current consent state at send-time; no send on revoked
- **Test:** Unit tests + nightly audit of send logs vs consent ledger

### NFR-D-04 — Data retention
- **Requirement:** Personal data retained per purpose-specific retention schedule (customer 7y financial + 3y marketing; lead 18mo; employee statutory); anonymization / deletion automated
- **Test:** Retention job audit monthly

### NFR-D-05 — Data Subject Rights response SLA
- **Requirement:** Access & correction: 7 days; deletion: 30 days; grievance acknowledged 48h
- **Test:** DSR workflow metrics

### NFR-D-06 — Breach notification
- **Requirement:** Material breach notified to Data Protection Board within 72h; CERT-In 6h for cyber incidents
- **Test:** Tabletop exercise annually

### NFR-D-07 — Data Processing Agreements
- **Requirement:** DPA signed with every processor / sub-processor; list published
- **Test:** Vendor compliance audit quarterly

### NFR-D-08 — PII access audit
- **Requirement:** All reads of encrypted PII columns audit-logged; anomaly detection on read-volumes
- **Test:** Daily review of top-reader users

---

## 7. Compliance (India tax / regulatory)

### NFR-R-01 — GST margin-scheme correctness
- **Requirement:** Margin-scheme GST computation passes golden-file regression suite covering all edge cases (negative margin, zero margin, high-value, trade-in offsets); tax counsel signs off before go-live and on any change
- **Test:** CI golden-file suite; quarterly counsel review

### NFR-R-02 — TCS correctness
- **Requirement:** TCS 1% applied on all motor-vehicle sales > ₹10L; Form 27EQ data export matches computed liability
- **Test:** Monthly reconciliation

### NFR-R-03 — E-invoicing reliability
- **Requirement:** 100% of qualifying invoices receive IRN within 24h of generation; exception queue for IRP downtime
- **Test:** Nightly reconciliation; unmatched alerts

### NFR-R-04 — E-way bill
- **Requirement:** E-way bill generated for all inter-state movements above threshold before transport begins
- **Test:** Logistics-launch blocker if missing

### NFR-R-05 — GSTR-1 filing accuracy
- **Requirement:** GSTR-1 export reconciles to book of invoices per GSTIN within 0.01%
- **Test:** Monthly reconciliation prior to filing

### NFR-R-06 — Record retention
- **Requirement:** 7y retention for tax and invoice records per Income Tax Act and GST Act; immutable store
- **Test:** Archive policy audit

### NFR-R-07 — DLT compliance for SMS
- **Requirement:** All transactional SMS sent on registered DLT templates; promotional SMS sent only with opt-in consent within TRAI windows
- **Test:** SMS audit monthly

### NFR-R-08 — Cash receipt PAN
- **Requirement:** Any cash receipt > ₹2L captures PAN; aggregation warning > ₹2L per person per day
- **Test:** Cash handling UX blocks without PAN; monthly SFT audit

---

## 8. Usability & Accessibility

### NFR-U-01 — WCAG 2.1 AA baseline
- **Requirement:** Storefront, Customer Portal, Admin pages conform to WCAG 2.1 AA
- **Test:** axe-core + manual audit pre-launch + quarterly

### NFR-U-02 — Contrast
- **Requirement:** Minimum 4.5:1 for normal text, 3:1 for large text; strict on luxury brand palette

### NFR-U-03 — Keyboard navigation
- **Requirement:** All interactive elements keyboard-operable; visible focus

### NFR-U-04 — Screen-reader semantics
- **Requirement:** All images have alt text; ARIA landmarks on page structure; form labels programmatically associated

### NFR-U-05 — Mobile responsiveness
- **Requirement:** Storefront + Customer Portal fully functional on 360×640 through 1920×1080; touch targets ≥ 44×44px

### NFR-U-06 — Internationalization
- **Requirement:** v1.0 EN + Hindi; v1.5 Marathi + Tamil + Telugu; all user-facing strings externalized; date/number formats locale-aware (INR formatting, ₹5,00,000 lakh convention)

### NFR-U-07 — Tolerant input
- **Requirement:** Phone + VIN + PAN + Aadhaar inputs tolerate common formats (with/without spaces/dashes); friendly validation messages in user's language

---

## 9. Observability

### NFR-O-01 — Metrics coverage
- **Requirement:** RED (Rate, Errors, Duration) per API endpoint; custom domain metrics per module (e.g., `deals_won_total`, `ro_cycle_time_seconds`)
- **Test:** Grafana dashboard review

### NFR-O-02 — Distributed tracing (v1.5)
- **Requirement:** OpenTelemetry instrumentation; trace sampling 100% for writes, 10% for reads in prod; 100% in staging
- **Test:** Trace-completeness check

### NFR-O-03 — Structured logging
- **Requirement:** All logs JSON-structured with correlation IDs (request-id, user-id, outlet-id); no secrets / PII
- **Test:** Log schema validation in CI

### NFR-O-04 — Error tracking
- **Requirement:** Sentry captures all unhandled exceptions; triage SLA (critical 1h, high 1 day)
- **Test:** Weekly triage review

### NFR-O-05 — Alerting SLA
- **Requirement:** Pager on P0/P1 within 2 min of trigger; no alert > 10 min mean-time-to-ack for on-call

### NFR-O-06 — Business KPI dashboards
- **Requirement:** Outlet-level KPI dashboards (conversion, cycle time, margin, NPS) refreshed at least hourly
- **Test:** Stakeholder review monthly

---

## 10. Maintainability

### NFR-M-01 — Code coverage
- **Requirement:** Unit-test coverage ≥ 70% across core modules; tax logic ≥ 95%; no hard target for UI
- **Test:** CI enforcement

### NFR-M-02 — Deployment frequency
- **Requirement:** Capable of daily production deploys; actual cadence weekly; hotfix path any-time

### NFR-M-03 — Rollback
- **Requirement:** Every deploy rollback-able within 15 min; DB migrations reversible; blue/green where possible

### NFR-M-04 — Documentation freshness
- **Requirement:** OpenAPI spec auto-generated from code; ADRs created for every significant decision; runbooks updated on incident postmortem

### NFR-M-05 — Tech-debt budget
- **Requirement:** 20% of each sprint capacity reserved for debt paydown / refactor / tooling

### NFR-M-06 — Dependency minimalism
- **Requirement:** New dependency additions require review; lockfile committed

---

## 11. Operability

### NFR-OP-01 — Runbook coverage
- **Requirement:** Every alert maps to a runbook

### NFR-OP-02 — Feature flags
- **Requirement:** v1.5 onwards: new customer-facing features gated behind flags; flag cleanup within 30 days of rollout

### NFR-OP-03 — Configuration management
- **Requirement:** No config via code changes; settings table + IaC for infrastructure

### NFR-OP-04 — Backup verification
- **Requirement:** RDS PITR + cross-region backup restored to staging quarterly; restore time measured

### NFR-OP-05 — Chaos / resilience (v1.5)
- **Requirement:** Quarterly fault injection (DB failover, BSP outage simulation, IRP outage simulation)

---

## 12. Integration & Interoperability

### NFR-I-01 — API versioning
- **Requirement:** All public APIs versioned (`/v1/`); breaking changes only in new major; deprecation notice 90 days

### NFR-I-02 — Webhook idempotency
- **Requirement:** All webhooks idempotent via provider-ref key; dupe deliveries no-op

### NFR-I-03 — Integration adapter isolation
- **Requirement:** Every third-party has adapter layer; swap-out possible without business-logic change

### NFR-I-04 — Circuit breakers
- **Requirement:** All outbound third-party calls wrapped in circuit breakers with half-open recovery

### NFR-I-05 — Retry semantics
- **Requirement:** Exponential backoff + jitter; max 5 retries before DLQ; DLQ monitored with alerting

### NFR-I-06 — Reconciliation jobs
- **Requirement:** Daily reconciliation jobs for Razorpay, IRP, bank, Tally — with unmatched queue

---

## 13. Localization

### NFR-L-01 — Currency
- **Requirement:** INR default; Indian lakh/crore formatting in UI; internal storage in minor units (paise)

### NFR-L-02 — Date/time
- **Requirement:** Internal UTC; UI IST; ISO 8601 in APIs

### NFR-L-03 — Language packs
- **Requirement:** Language switcher on every user-facing surface; fallback to English for missing keys

---

## 14. How specs reference NFRs

In every feature spec, include a short NFR section:

```
## NFRs
- NFR-P-03 (API read latency p95 < 300ms) — applies; standard
- NFR-S-03 (sensitive field encryption) — applies; PAN captured
- NFR-D-02 (consent capture) — applies; new consent purpose introduced: `finance_soft_pull`
- NFR-R-01 (GST margin-scheme correctness) — applies; new golden-file test cases added
```

If your feature has stricter targets, state them explicitly with rationale. If an NFR does not apply, note "N/A — does not process PII".

---

## 15. Notes for agents

Prompts that generate specs should instruct the agent to:
1. List which NFR IDs apply to the feature
2. Note any stricter-than-default targets
3. Flag new NFR categories that should be added to this doc via follow-up PR
4. Not restate NFR text — only cite and specialize
