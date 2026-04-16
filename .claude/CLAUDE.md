# DMS — Project-wide instructions (CLAUDE.md)

Read this file at the start of every session before opening any code. It is the single source of truth for how Claude and every sub-agent must collaborate on this repository.

---

## 1. What this product is

A custom **Data Management System (DMS)** for a luxury pre-owned car business in India, covering inventory, sales, service, parts, finance, marketing, storefront, customer/consignor portals and analytics, across three outlets (Bangalore, Mumbai, Chennai) with a pan-India storefront.

Two distinct user surfaces:

- **Customer surface** — public marketing site, storefront, customer account, consignor portal. Design direction = **01 Editorial Luxury + 05 Dark Premium**.
- **Staff surface** — internal DMS (sales, service advisor, workshop, parts, finance, GM, CXO). Design direction = **03 Modern Product Interface**.

Core non-negotiables: India regulatory compliance (GST margin scheme, TCS 1% > ₹10L, e-invoicing/IRN/QR, DPDP Act 2023, DLT SMS, Aadhaar eKYC via sub-KUA), per-VIN cost ledger, thin GL in DMS + Tally Prime statutory, 24-role RBAC with RLS, multi-tenant city isolation.

---

## 2. Canonical documents — read before you act

All docs live under `/research/` and `/design/`. Each doc has a number; cite by number.

| # | Document | When to read |
|---|---|---|
| 00 | Executive Summary | Every session opener |
| 01 | Market & Competitive Landscape | When benchmarking UX/features against BMW / Audi / Porsche / BBT |
| 02 | Feature Matrix | Scoping a new spec; checking v1 vs v1.1 vs backlog |
| 03 | Customer CX & Storefront | Any customer-surface work; portal, storefront, marketing |
| 04 | Sales & Inventory (Pre-Owned) | Consignment, acquisition, refurb, pricing, listing, sales orders |
| 05 | Service & Parts Workshop | Service reception, bays, parts, warranty, labour |
| 06 | Finance, Tax & Employee | GST, margin scheme, TCS, e-invoicing, payroll, employee lifecycle |
| 07 | Tech Architecture Patterns | Any system-design decision; data contracts; event patterns |
| 08 | Open Questions & Risks | Before assuming a decision; Q1–Q12 are locked as of 2026-04-15 |
| 09 | Glossary / Ubiquitous Language | Naming; use exact terms — do not invent synonyms |
| 10 | Domain Model | Entity shapes, aggregates, relationships |
| 11 | State Machines | Any status/transition logic |
| 12 | Non-Functional Requirements | Perf, availability, observability, security targets |
| 13 | Integration Contracts Index | Any 3rd-party integration (Razorpay, WhatsApp BSP, IRP/GSP, Aadhaar, etc.) |
| 14 | Role / Permission Matrix | Any auth/authorization work; 24 roles R01–R24 |
| 15 | Spec Template & Prompt Conventions | Writing, reviewing or consuming any spec |
| Design 00 | Design Direction Comparison (HTML) | Context on the two-surface decision |
| Design 01 | Design System (authoritative) | Every UI task — tokens, typography, components |

**Rule:** if a request touches a domain and you have not cited at least one of the relevant docs above, stop and read first.

---

## 3. Stack & toolchain

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turbo |
| Runtime | Node 20.11+ |
| Apps | Next.js 14 App Router (customer-web :3000, staff-web :3001) |
| Language | TypeScript strict, `noUncheckedIndexedAccess`, ES2022 |
| UI | Tailwind + shadcn/ui-style primitives, CVA, lucide-react |
| Motion | Framer Motion |
| Forms | React Hook Form + Zod |
| Data | TanStack Query + MSW (mocks) in v0 |
| i18n | next-intl (en-IN base; hi-IN phase 1; kn/mr/ta per outlet) |
| Test | Vitest + Playwright + Storybook |
| Tokens | `@dms/tokens` (TS source of truth, consumed by Tailwind preset) |

Design-system packages:

- `@dms/tokens` — primitives + customer + staff semantic tokens
- `@dms/config-tailwind` — preset consuming `@dms/tokens` via CSS vars (`[data-surface]`, `[data-theme]`)
- `@dms/ui` — primitives, surface-specific components, domain components (VehicleCard, VINBadge, CPOBadge, GSTBreakdown, ...)
- `@dms/types` — shared Zod/TS types
- `@dms/mocks` — MSW handlers + Faker seeds

---

## 4. The MVP philosophy

**Frontend-first, production-quality, full v1 scope, dummy data via MSW.**

1. Build every v1 module end-to-end in the frontend using mocked data.
2. Freeze UI + spec per module.
3. Wire real backend behind the same contracts.

Do not take "mock" as permission for rough work. Every screen must ship with empty/loading/error/success states, accessibility pass, motion pass, and spec co-located.

---

## 5. Agent pipeline (how work flows)

Every non-trivial task runs the following pipeline. Use the `Agent` tool. Never skip the review waves.

```
planner
    │
    ├── (parallel wave 1) domain-expert · data-architect · api-designer · ux-writer
    │
    ├── (parallel wave 2) security-reviewer · finance-reviewer · qa-planner
    │
    ├── integrator       ← merges, resolves conflicts, writes the final spec
    │
    ├── coder            ← implements against the spec
    │
    └── code-reviewer    ← reviews the diff
```

Extra agents when relevant:

- `backend-sanity` — called when a frontend mock contract would be infeasible / painful to back with real services.

### Rules

- **Parallel agents must not see each other's output during wave 1 or wave 2.** Independence is the whole point of the review.
- The `integrator` is the only agent that resolves disagreements. If agents disagree, the integrator must quote both positions and justify the merge with a doc citation.
- Every agent output must cite the doc number(s) it relied on (e.g., "per Doc 14 §2.3, Service Advisor R09 cannot approve refunds > ₹25,000").
- If an agent cannot answer without a decision the user has not made, it must **raise a concern**, not guess. Open questions surface up to `planner`.

### Prompt shape (every agent call)

```
Context:     what the agent needs to know; cite docs by number
Task:        single, crisp deliverable
Constraints: hard rules (doc references, DoD items, NFRs, RBAC)
Output format: exact sections expected back
```

Terse command-style prompts are banned — they produce shallow output.

---

## 6. Spec discipline

Every feature ships with a spec under `/specs/modules/<domain>/NN-<slug>.md`, conforming to the 21-section template in **Doc 15**. Spec ID format: `SPEC-<DOMAIN>-NNN`.

Required frontmatter:

```yaml
---
spec_id: SPEC-<DOMAIN>-NNN
domain: <identity|inventory|sales|service|parts|finance|...>
status: draft | in-review | approved | in-build | shipped | deprecated
risk_level: low | medium | high | critical
pii_sensitivity: none | low | medium | high
flags: [feature-flag-names]
owners: [agent-or-human]
depends_on: [SPEC-XXX-NNN]
---
```

No code lands without an `approved` spec. No spec lands without all three wave-2 reviewers signing off (security, finance where applicable, qa). The `finance-reviewer` is mandatory for anything that touches money, GST, TCS, e-invoicing, payroll, or journal entries.

---

## 7. Naming & language

- Use the **exact terms from Doc 09** (glossary). Do not paraphrase. `VIN`, `Consignor`, `Appraisal`, `CPO`, `Job Card`, `RO` (Repair Order), `GRN`, etc.
- Spec filenames: `NN-domain-feature-slug.md` (zero-padded).
- Component names match domain language: `VehicleCard`, `JobCardTimeline`, `GSTBreakdown`, `VINBadge`, `CPOBadge`, `ConsignorPayoutSheet`.

---

## 8. RBAC & data boundaries

- 24 roles R01–R24 (see Doc 14). Never hardcode roles — consume from `@dms/types`.
- Every list query is **city-scoped by default** (RLS). Cross-city access requires R19+ (GM), R22+ (CFO), R24 (CEO) or explicit delegation.
- PII fields (Aadhaar last-4, PAN masked, phone, email, address) are `pii_sensitivity: medium|high` and must route through a masked render by default.

---

## 9. India-specific guardrails

- **GST margin scheme** applies on pre-owned vehicle sales; never compute full-value GST on margin-scheme sales.
- **TCS @ 1%** triggers on sale value > ₹10,00,000 (per PAN per FY). Show the TCS line explicitly.
- **E-invoicing**: all B2B invoices above threshold must go to IRP → IRN + QR on the invoice PDF. Retry policy per Doc 13 §3.
- **DPDP Act 2023**: purpose limitation + consent + data principal rights. Every PII collection point shows consent text + purpose.
- **DLT SMS**: every SMS template must have a DLT template ID. No free-text SMS sends.
- **Aadhaar eKYC**: only via sub-KUA; never store full Aadhaar numbers; display last-4 only.

---

## 10. Definition of Done (every task)

Before marking anything "done":

1. Spec exists, approved, and co-located with the UI.
2. Empty, loading, error, and success states rendered.
3. Accessibility: keyboard nav, focus rings, color contrast AA min (AAA for body), reduced-motion honored.
4. Mobile + tablet + desktop breakpoints verified (customer surface: mobile-first; staff surface: desktop-first).
5. Mocked data covers the happy path + 2 edge cases minimum.
6. RBAC gates visible in the UI where applicable.
7. i18n: no hardcoded user-facing strings; keys under `messages/<locale>/<domain>.json`.
8. Storybook story for every component.
9. Unit tests for logic; Playwright for critical flows.
10. Reviewer agent signed off on the diff.

---

## 11. Citation discipline

When responding to the user or writing a spec:

- Cite doc numbers and section numbers: "Doc 14 §2.3", "Doc 06 §GST.margin".
- When two docs disagree, flag the conflict to `planner` and quote both.
- Do not invent requirements. If the docs are silent, raise it as an open question.

---

## 12. What not to do

- Do not introduce a new color, font, or radius outside `@dms/tokens`.
- Do not bypass the spec → code order.
- Do not add a dependency without justifying it in the spec.
- Do not call external services from the frontend; always go through a server action / route handler even in the mocked phase.
- Do not concatenate PII into logs.
- Do not assume a role can do something — check Doc 14.
- Do not ship text without `next-intl`.
- Do not write summaries the user asked not to see; the diff speaks for itself.

---

## 13. When uncertain

Stop. Ask the user via `AskUserQuestion`. Never guess on:

- Regulatory behavior (tax, compliance, data protection).
- Money flows (pricing, splits, payouts, refunds, GL mapping).
- Role/permission decisions.
- Customer-visible copy tone.

For everything else — plan, run the agent pipeline, review, ship.
