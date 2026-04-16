# 07 · Tech Architecture Patterns

Engineering starting point for v1.0. Stack recommendation, deployment shape, data model patterns, integration topology, and the decisions that protect future velocity without over-engineering for year one.

---

## 1. Architectural stance

**Start as a modular monolith on AWS Mumbai. Extract services when pain is real, not imagined.**

At 3–10 outlets, microservices is premature optimization. The team will ship faster, debug faster, and keep a consistent data model if the entire system is one deployable unit with clean internal boundaries. The modular monolith pattern keeps the option open: well-drawn module boundaries become service boundaries later without rewrites.

Plan explicit extraction candidates for Phase 2:
- **Notifications service** — high-volume, async, bursty; natural first extraction
- **Finance / accounting service** — audit-critical, slower iteration, different compliance posture
- **Integration hub** — webhook handlers and third-party I/O (WhatsApp, Razorpay, IRP, Tally) — naturally isolated
- **Inventory listing read API** — if storefront traffic scales beyond monolith comfort

Kafka, service mesh, polyglot persistence, and multi-region active-active are **not** v1 concerns. Resist them.

---

## 2. Recommended stack

### Backend
- **Runtime**: Node.js 20+ LTS
- **Framework**: NestJS — opinionated module / controller / service structure matches modular monolith naturally; dependency injection; first-class TypeScript
- **Language**: TypeScript strict mode
- **ORM**: Prisma (clean schema, migrations, type-safe queries) with raw SQL escape hatches for complex reports
- **Validation**: class-validator + class-transformer (NestJS-native) or Zod at API boundaries

### Frontend
- **Customer storefront**: Next.js 14+ (App Router, React Server Components, ISR for listings)
- **Admin back-office**: Next.js or Vite + React (lean to Next.js for shared component library)
- **UI system**: Tailwind CSS + a component library tuned for luxury (custom on top of Radix UI primitives; do not pick a generic e-commerce template)
- **State**: React Query / TanStack Query for server state; Zustand for local state
- **Forms**: React Hook Form + Zod

### Mobile (Phase 1.5 / 2)
- **Inspector tablet app** (iPad / Android tablet) — v1.0: PWA with offline cache; v1.5: React Native
- **Technician app** — v1.5 React Native
- **Customer app** — v2 React Native if PWA engagement data justifies

### Data
- **Primary OLTP**: PostgreSQL 16 (managed via AWS RDS Multi-AZ; read replica in-region for reporting)
- **Cache / session / rate-limiting**: Redis (ElastiCache)
- **Search**: Elasticsearch / OpenSearch — inventory search, fuzzy VIN search, parts search
- **Queue / async**: RabbitMQ (managed via AmazonMQ) — order-of-magnitude simpler than Kafka at this scale; sufficient for notifications, webhook processing, Tally sync, PDF generation
- **Object storage**: S3 — photos, videos, invoices, certificates
- **CDN**: CloudFront (storefront assets + secured invoice/certificate downloads)

### Observability
- **Metrics**: Prometheus + Grafana
- **Logs**: Loki (cost-effective at this scale) or CloudWatch Logs
- **Tracing**: OpenTelemetry → Grafana Tempo or Jaeger (v1.5 — defer if team capacity limited)
- **Errors**: Sentry
- **Uptime / synthetic**: Better Uptime / UptimeRobot
- **Paging**: PagerDuty or Ops Genie

### Cloud and networking
- **Provider**: AWS ap-south-1 (Mumbai) — data residency requirement
- **Compute**: ECS Fargate for API + workers; no need for EKS at this scale
- **DB**: RDS PostgreSQL Multi-AZ
- **Storage**: S3 with bucket-level encryption, versioning, lifecycle policies
- **Secrets**: AWS Secrets Manager
- **KMS**: AWS KMS for column-level encryption keys
- **VPC**: Private subnets for DB + internal services; public subnets only for ALB + NAT

### CI/CD
- **VCS**: GitHub (private)
- **CI**: GitHub Actions (free tier covers most needs)
- **Deploy**: ECR + ECS deploy pipelines; blue/green via ECS
- **IaC**: Terraform
- **Secrets in CI**: GitHub OIDC → AWS IAM role (no long-lived keys)

### Dev tooling
- **Package manager**: pnpm (monorepo)
- **Monorepo**: Turborepo or Nx
- **Linting**: ESLint + Prettier; pre-commit via Husky
- **Testing**: Vitest for unit; Playwright for e2e; supertest for API contract

---

## 3. Why not alternatives

- **Java / Spring Boot**: fine technology; Node-stack advantage is team velocity and shared language across frontend/backend
- **Go**: great for microservices; overkill and slower for a monolith with heavy ORM usage
- **Python / Django**: viable; lose some type-safety edge; Node ecosystem for integrations (WhatsApp SDKs, PDF generation) is richer
- **Kubernetes (EKS)**: operational overhead not justified at 3–10 outlets; ECS Fargate is simpler and sufficient
- **MongoDB / NoSQL**: financial + relational data (parts, VINs, ROs) is inherently relational; enforce integrity at the database
- **Kafka**: RabbitMQ is simpler, operationally cheaper, sufficient for our throughput
- **Microservices from day one**: premature; will slow team velocity without payoff until we have 15+ outlets
- **Salesforce / custom on SF**: considered during scoping; user has confirmed custom build

---

## 4. Module boundaries (modular monolith)

Inside the single NestJS deployment, enforce module boundaries that mirror our verticals:

```
apps/
  api/                      # single NestJS deployable
  storefront/               # Next.js customer site
  admin/                    # Next.js back-office
  inspector-pwa/            # PWA for inspectors
packages/
  db/                       # Prisma schema + migrations
  shared/                   # shared types, DTOs, validation schemas
  ui/                       # shared component library
modules/ (within api)
  identity/                 # auth, users, roles, permissions, RBAC
  customers/                # customer master, vehicle registration, portal
  inventory/                # VIN lifecycle, pricing, refurb, certification
  sales-crm/                # leads, deals, quotes, commissions
  service/                  # RO, VHC, warranty, bays, assignments
  parts/                    # parts master, stock, PO, GRN
  finance/                  # invoices, GST, TCS, AR, AP, ledger
  tally-sync/               # Tally bidirectional sync
  notifications/            # WhatsApp, SMS, email, in-app
  integrations/             # Razorpay, IRP, KYC partners, DigiLocker
  reporting/                # read-side queries, dashboards
  audit/                    # immutable audit log
  platform/                 # health, feature flags, rate limits
```

Rules:
- Modules expose service interfaces; cross-module calls go through services, not direct DB access to other modules' tables
- Shared types in `packages/shared`; modules may import from `shared` but not from each other's internal files
- Each module has clear ownership of a set of tables
- Cross-module transactions use an **application-level saga** pattern (Inventory reserve → Finance invoice → Notification) orchestrated in a dedicated orchestrator module or via RabbitMQ events

---

## 5. Multi-tenant / multi-outlet data model

### 5.1 The tenancy question

This is a **single-business, multi-outlet** deployment — not multi-tenant SaaS. However, data partitioning per outlet is still essential for RBAC, reporting, and (future) franchise scenarios.

### 5.2 Partitioning strategy

- Every mutable business table has an **`outlet_id`** column (even if conceptually cross-outlet, like a customer who services at multiple; in those cases `outlet_id` on the event/record, not the customer master)
- **Postgres RLS policies** on every outlet-partitioned table:

```sql
CREATE POLICY outlet_isolation ON repair_orders
  USING (outlet_id = ANY (current_setting('app.accessible_outlets')::uuid[]))
  WITH CHECK (outlet_id = ANY (current_setting('app.accessible_outlets')::uuid[]));
```

- Session variable `app.accessible_outlets` set per request from JWT claims; RLS enforces filtering regardless of whether the application remembers to
- Break-glass: Super Admin session sets `app.bypass_rls = true` with audit logging

### 5.3 Customer model — cross-outlet

Customers can engage at any outlet (service today in Mumbai, buy next car in Bangalore). The `customers` table is not outlet-partitioned; RLS on dependent tables (ROs, deals, vehicles) enforces outlet scope. A customer-360 query joins from customers down into those tables and inherits outlet filtering.

### 5.4 GSTIN and state

Each state is a separate GSTIN. `outlets` table holds `state_code` and `gstin`; invoices pick the GSTIN based on outlet + place-of-supply rules.

---

## 6. Core data model highlights

### 6.1 Per-VIN cost ledger

```
vehicles (the VIN)
  vin PK, make, model, year, variant, color, engine, fuel, km, current_status, 
  acquisition_source, owned_flag (owned / consignment), current_outlet_id, ...

vehicle_cost_entries (ledger)
  id PK, vin FK, entry_type (acquisition | transport | refurb_parts | refurb_labor |
    certification | overhead_allocation | holding_cost | adjustment),
  amount, currency, entry_date, source_ref (RO id, PO id, etc.), 
  created_by, created_at, notes

-- landed_cost(vin) is a SQL function / materialized view that sums entries up to a timestamp
```

### 6.2 RO with 3C line items

```
repair_orders
  id PK, vin FK, customer_id FK, outlet_id FK, state, created_at, ...

ro_line_items
  id PK, ro_id FK, sequence, complaint TEXT, cause TEXT, correction TEXT,
  labor_hours, labor_rate, parts_total, warranty_flag, ...

ro_state_events (audit on state transitions)
  id PK, ro_id FK, from_state, to_state, transitioned_by, transitioned_at, reason
```

### 6.3 Quote versioning

```
quotes
  id PK, deal_id FK, vin FK, version, parent_quote_id FK self, status,
  price_breakdown JSONB (line items), total, gst_breakdown JSONB, 
  created_by, created_at, expires_at
```

### 6.4 Consent ledger (DPDP)

```
consent_events
  id PK, subject_type (customer | employee | vendor), subject_id,
  purpose (marketing | kyc | service_comms | ...), 
  consent_state (granted | revoked),
  evidence_artifact_s3_key, ip, device_fingerprint, ts
```

### 6.5 Audit log with hash chain

```
audit_events
  id PK, entity_type, entity_id, action (create | update | delete),
  actor_id, ip, device_fp, before JSONB, after JSONB, ts,
  prev_hash BYTEA, this_hash BYTEA GENERATED ALWAYS AS (
    sha256(id::text || prev_hash || ts::text || entity_type || entity_id::text || action || before::text || after::text)
  ) STORED
```

Hash chain check: nightly job verifies chain integrity; break triggers P1 alert.

---

## 7. Integration topology

### 7.1 Inbound webhooks

- **Razorpay** — payment.captured, payment.failed, order.paid, refund.processed
- **WhatsApp BSP** — incoming message, delivery status, template-approval updates
- **SMS BSP** — delivery status
- **IRP / GSP** — IRN generation confirmations, rejection, cancellation (polled or webhook per GSP)

### 7.2 Outbound calls

- **IRP via GSP** — per-invoice call
- **Razorpay API** — create payment link, fetch payment, refund
- **OBV API** — valuation during acquisition
- **WhatsApp BSP** — template messages, session messages (within 24h window)
- **DigiLocker** — OAuth flow from customer portal; document pull
- **Aadhaar eKYC** via sub-KUA — OTP flow
- **PAN NSDL** — name match
- **Tally** — daily XML push / Prime API calls

### 7.3 Reliability patterns

- **Outbox pattern** — every outbound event written to an outbox table in same transaction as business change; worker publishes to queue; handles retries + dead-letter
- **Idempotency keys** on inbound webhooks to handle duplicate deliveries
- **Circuit breakers** on third-party API clients (opossum or equivalent)
- **Retry with exponential backoff + jitter**
- **Dead-letter queue** with alerting for permanently-failed items
- **Reconciliation jobs** — nightly Razorpay transaction ↔ DB match; Tally voucher ↔ DB match; alerts on deltas

---

## 8. Performance targets (v1 working targets)

- **Storefront LCP** (p75 mobile): < 2s
- **Inventory search** (p95): < 200ms
- **VDP load**: < 2s
- **API latency** (p95 read): < 300ms
- **API latency** (p95 write): < 500ms
- **PDF generation** (invoice / certificate): < 5s
- **IRP round-trip**: < 3s (GSP-dependent; plan for 10s worst case with async UX)
- **Tally sync end-of-day**: < 30 min for typical daily volume

Sizing baseline: 3–10 outlets, 500–2,000 vehicle units/year, 20,000–50,000 service ROs/year, 10–50 concurrent back-office users, 1,000–10,000 daily storefront visitors. A well-tuned PostgreSQL on RDS can handle this with ease; Node.js app tier autoscaled ECS.

---

## 9. Security baseline

- **TLS 1.2+** everywhere; HSTS on public endpoints
- **Encryption at rest**: RDS (KMS-managed), S3 SSE-KMS, EBS default
- **Column-level encryption** for PAN, Aadhaar, bank account, phone (where applicable) — application-layer via KMS envelope encryption
- **Secrets**: Secrets Manager with rotation for DB credentials, API keys
- **Network**: private subnets for compute + DB; only ALB public; WAF on ALB
- **Authentication**: JWT with short TTL access tokens + rotating refresh tokens; revocation list in Redis
- **Password**: Argon2id hashing; no plaintext or MD5/SHA1
- **MFA**: mandatory for Super Admin, financial payout roles
- **Rate limiting**: per-user and per-IP on public endpoints
- **CORS**: locked-down origins per environment
- **CSP**: strict on storefront + admin
- **Dependency scanning**: Dependabot + Snyk
- **SAST**: GitHub CodeQL
- **Pen test**: pre-go-live + annual thereafter
- **OWASP top 10** awareness baseline for all devs

---

## 10. DPDP compliance architecture

See Doc 06 §19 for obligations; architecture implications:

- Consent ledger table + middleware that checks consent before any marketing action
- Retention engine: scheduled job per data class (leads: 18 months; customer PII: 7 years for financial, 3 years for marketing; employee: statutory)
- DSR handling: access (export JSON of all PII), correction (update with audit), deletion (anonymize while preserving financial records per Income Tax Act retention)
- Data inventory maintained — table-level, column-level classification (PII / financial / commercial)
- DPA template ready for every processor

---

## 11. DevEx and release process

- **Trunk-based with short-lived feature branches** (< 2 days lifespan)
- **Every PR triggers**: lint, typecheck, unit tests, build, integration tests on ephemeral environment
- **Feature flags** (v1.5) — LaunchDarkly or OpenFeature-compatible open-source — decouple deploy from release
- **Environments**: dev (ephemeral on PR), staging (always-on, integration sandboxes), production
- **Database migrations**: reversible; deploy-migrate-deploy pattern for destructive changes
- **Release cadence**: weekly production deploy; hotfixes any time via expedited path
- **Change management**: every prod deploy logged in change log; on-call engineer monitors for 1h post-deploy

---

## 12. Testing strategy

- **Unit tests** — business logic (pricing, margin GST calc, RO state transitions, commission engine)
- **Integration tests** — against real Postgres in ephemeral environment; ~80% API coverage
- **Contract tests** — for third-party integrations; mock services for unreliable / rate-limited third parties (IRP, BSP)
- **E2E tests** — Playwright scripts for critical flows: book test drive → quote → token → invoice; service booking → RO → VHC → invoice; inspector flow → certification PDF
- **Load tests** — storefront + inventory search; quarterly
- **Tax logic regression suite** — golden-file tests for margin-scheme GST computation across many scenarios; any change requires tax-counsel sign-off before merge

---

## 13. Backup, DR, BCP

- **RDS PITR** enabled; retention 14 days
- **S3 versioning** + **Glacier lifecycle** for photos/videos > 90 days
- **Daily logical backups** stored cross-region (ap-south-2 Hyderabad) for DR
- **RPO**: 1 hour; **RTO**: 4 hours
- **Quarterly DR drill**: restore from backup into isolated VPC, run smoke tests
- **Runbook**: documented recovery procedures for common failure modes (DB corruption, region outage, ransomware)

Multi-region active-active is explicitly out of v1/v2 scope. Only revisit if franchising or international expansion is confirmed.

---

## 14. Team shape (recommended)

- **1 Tech Lead / Architect**
- **3–5 Senior / Mid full-stack engineers** (Node + React + Postgres)
- **1 DevOps / Platform engineer**
- **1 QA lead** (test automation + manual exploratory)
- **1 UX / UI designer** (luxury-grade; full-time for MVP period, part-time after)
- **1 Product manager** (embedded with business stakeholders)
- **2 mobile engineers** (from Phase 1.5 when React Native apps start)
- **1 Security consultant** (part-time; pen test + DPDP review + IAM policy audit)
- **Tax / accounting consultant** (external; reviews GST, TCS, commission, Tally sync before go-live and quarterly thereafter)

---

## 15. Phased roadmap

| Phase | Duration | Deliverables |
|---|---|---|
| **0 — Foundations** | 3–4 weeks | Infra (AWS, VPC, RDS, ECS), CI/CD, monorepo scaffold, auth + RBAC, audit log, observability baseline, staging env, initial designs |
| **1 — MVP** | 5–7 months | All Doc 02 Must-have features, all integrations (Razorpay, WhatsApp BSP, IRP, Tally, KYC partners, OBV), storefront + admin + customer portal, inspector PWA |
| **1.5 — Polish** | 2–3 months | Doc 02 Should-haves in CX, Service, Finance; regional languages; finance partner pre-approval; competitor price monitoring; extended warranty; OCR on AP bills |
| **2 — Mobile + scale** | 3–4 months | React Native customer + technician apps; advanced reporting; finance aggregation; lead scoring; recall management automation |
| **3 — Platform** | 6+ months | Notifications / Finance / Integrations service extraction; event sourcing for finance; self-serve analytics; optional multi-region |

All timelines are working estimates, not commitments. Firm up after Doc 08 open questions are answered.

---

## 16. Risks specific to tech architecture

- **Tally single-writer bottleneck** — if accountant's Tally runs on a single desktop, sync writes must serialize; plan for queue + retry + alerting
- **WhatsApp template approval latency** — 6–10 weeks; start Day 1 with BSP
- **GSP IRP reliability** — schedule buffers for IRP outages (CBIC downtime is non-zero); queue + retry
- **KYC partner rate limits** — plan batch processing windows and fallback to video KYC
- **Photo / video storage growth** — CPO certification + VHC produces GBs of media per VIN; lifecycle policies mandatory
- **Prisma / ORM boundaries** — complex reports may need raw SQL; plan for that without breaking type safety everywhere
- **Technical debt from MVP velocity** — explicit debt register from Day 1; 20% of each sprint earmarked for paydown

---

## 17. Non-goals (v1)

Explicit list to prevent scope creep:

- Kubernetes / service mesh
- Multi-region active-active
- Event sourcing
- GraphQL federation
- Native mobile apps (v1 is PWA only)
- AI pricing optimization
- Real-time GPS tracking
- VAHAN API integration
- Full multi-tenant SaaS partitioning
- OEM DMS bidirectional integration
- Full HRMS
- Custom payroll engine
- Chat bots / AI assistants (keep storefront purely human-escalated)
