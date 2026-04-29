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

**Architecture specs** (in `/specs/architecture/`) are also mandatory reads:

| Spec | Mandatory for |
|---|---|
| `SPEC-ARCH-UI-001` (`canonical-ui-patterns.md`) | Every UI task — Card/Field/Dialog/Slider/StatTile primitives, banner patterns, typography rules, radius rules, spacing, color, RBAC `Gate` usage |
| `cross-module-wiring.md` | Every cross-store dependency — must register a numbered seam before the dependency lands in code |
| `fixture-coverage-audit.md` | Every fixture change — single-source-of-truth check |

**Rule:** if a request touches a domain and you have not cited at least one of the relevant docs above, stop and read first. UI work without `SPEC-ARCH-UI-001` is auto-rejected at review.

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

### Review-wave artifacts

- Each wave-2 reviewer (security, finance, qa) writes a companion `.review.md` next to the spec — same path, suffix `.review.md`. Format: H1 spec id + reviewer-name + date; sections "Concerns", "Blockers", "Open questions"; signoff line `signed-off: yes | no | with-concerns`.
- The integrator merges `.review.md` findings into the spec's L-tags (locked decisions) or §Open questions. Reviewers do NOT edit the main spec — only their `.review.md`.
- A spec cannot transition `in-review → approved` without all required `.review.md` files containing `signed-off: yes` or `with-concerns + acknowledged-by-integrator: yes`.

### Model routing for sub-agents

Default every spawned `Agent` call to **Sonnet** (`model: "sonnet"`). Use Opus only for: new-module first-draft specs, finance-reviewer on money flows, security-reviewer on auth/encryption, complex multi-file debugging. Use Haiku for pure mechanical work (renames, barrel exports). The orchestrator (this thread) stays on default.

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

**Mandatory cross-references in every spec:**
- UI sections must cite `SPEC-ARCH-UI-001` for primitives. Inventing local `Card`/`Field` redefinitions is a review-rejection.
- Any cross-store dependency must register a numbered seam in `specs/architecture/cross-module-wiring.md` BEFORE the import is added. PR without a registered seam is auto-rejected.
- Every `flags:` entry in frontmatter must have a corresponding entry in the relevant app's `feature-flags.ts`. Verified by a CI check (or manual grep until CI lands).

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
6. RBAC gates visible in the UI where applicable, via the `Gate` primitive (never inline `hasRank` in JSX).
7. i18n: no hardcoded user-facing strings; keys under `messages/<locale>/<domain>.json`.
8. Storybook story for every component.
9. Unit tests for logic; Playwright for critical flows. **Test placement convention** (binding):
   - **Pure-logic / store / helper tests** → `apps/<app>/src/lib/<module>/__tests__/<file>.test.ts` (co-located with the code under test)
   - **Cross-module integration tests** → `apps/<app>/src/tests/<feature>.test.ts` (top-level)
   - **Primitive component tests** → `apps/<app>/src/components/primitives/__tests__/<primitive>.test.ts`
   - Naming: `<feature-or-file>.test.ts`. No `*.spec.ts` (reserve for Playwright).
10. Reviewer agent signed off on the diff.
11. **Typecheck clean** — `pnpm -F <app> typecheck` exits 0 on every changed app. Pre-existing errors in unchanged files are NOT a free pass; the orchestrator MUST decide between (a) "in-scope: fix it now," (b) "out-of-scope: log to `.claude/known-issues.md` with owner + ETA." Unlogged failures block merge.
12. **No `text-[NNpx]` in new code.** Use `text-xs/sm/base/lg/xl/2xl`. Approved exceptions are documented in `SPEC-ARCH-UI-001` §6 — anything else is a reject. **Enforced by `apps/staff-web/src/tests/ui-canon-drift.test.ts` — new files outside the 2026-04-29 baseline that introduce `text-[NNpx]` will fail the test suite.**
13. **No `rounded-lg` / `rounded-xl` in new code** unless the element is a full-page hero modal or the primitive `Dialog`/`AlertDialog` itself. Default is `rounded-md`. Enforced by the same drift test.
13a. **i18n top-level namespace existence** is enforced by the drift test. New module pages calling `useTranslations('<module>.…')` MUST add `<module>` as a top-level key in `messages/en-IN.json` AND `messages/hi-IN.json`. Nesting under another module's key (e.g. accidentally putting `finance.*` under `staff.*`) is a regression that the test catches.
14. **Spec-drift check** — confirm code still matches every L-tag in the spec. If a locked decision is no longer being honored, either fix the code OR follow the supersession protocol in §14. Drift without a [SUPERSEDED] tag is a regression.
15. **Every CTA wired to a real action** (store call, toast, navigation, dialog open). Silent no-ops are auto-rejected. If a behavior is genuinely deferred, render an explicit `info`-toast or "coming in vN.N" notice — never a silent click.

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

---

## 14. Locked-decision (L-tag) protocol

Every spec maintains a "Locked decisions" table at the top. Each row is an L-tag — a non-negotiable contract that subsequent code, reviewers, and refactors must honor.

### Format

```
| Tag | Title | Decision | Source |
|---|---|---|---|
| L1  | <short title> | <one-paragraph decision, written in prose> | <doc citation or reviewer-finding ref> |
```

L-tags are numbered sequentially per spec (`L1`, `L2`, …). Some specs use scoped tags (`L_S7`, `L_PORTAL_2`) when the number namespace is shared across multi-spec families — both forms are acceptable; sequential is preferred.

### Minting an L-tag

Mint an L-tag when:
1. A trade-off was made and the alternative would be tempting later (lock the choice).
2. A regulatory or compliance constraint is being honored (cite the source).
3. A reviewer raised a concern that was resolved by an explicit decision (cite the review wave + concern number).
4. A cross-module contract is being established (the L-tag becomes the integration point).

Do NOT mint an L-tag for routine implementation choices ("we used `useState` not `useReducer`"). L-tags are for decisions that future maintainers might unknowingly violate.

### Citing an L-tag

Code comments referencing a locked decision MUST cite the L-tag:

```tsx
// L18: TCS waiver requires R12+ + reason text — see PLAN-VEHICLES-003
```

This makes drift detection greppable.

### Superseding an L-tag

When a locked decision is replaced (e.g., an architecture pivot like 2D→3D in custom-builds):

1. **Do not delete the original L-tag.** Edit it in place: prepend `**[SUPERSEDED by L<new-tag> — see §<new-section>]**` to the title cell, then keep the original decision text wrapped as `Original:` for archeological clarity.
2. Add the new L-tag below.
3. Add a §N section (numbered after the existing sections) describing the supersession: trigger, migration path, fallback handling.
4. Update the spec changelog with `vN.M — L<old> superseded by L<new>` line.
5. Code comments referencing the old L-tag stay valid (history); new code references only the new L-tag.

Example: `specs/modules/custom-builds/01-custom-builds-module.md` L4/L5 marked `[SUPERSEDED by L51]` with §30 documenting the 2D→3D pivot.

### Drift gate

A code-reviewer agent or orchestrator running a drift check must:
1. Read every L-tag in the relevant spec.
2. For each, grep the codebase for evidence that the decision is honored.
3. If evidence is missing or contradicts, flag drift in `.claude/agent-status.md` with the L-tag and file:line.

---

## 15. Spec lifecycle + phase tagging

### `status:` frontmatter values

| Value | Means | Who can transition it |
|---|---|---|
| `draft` | Author working on the spec; reviewers not yet engaged | Author |
| `in-review` | Wave-2 reviewers have been spawned | Author or planner |
| `approved` | All required `.review.md` files signed off; coding can begin | Integrator |
| `in-build` | Coder agent is actively implementing | Coder |
| `shipped` | Implementation merged + tests green; ready for E2E gate | Code-reviewer |
| `deprecated` | Spec is no longer the current source of truth (a successor spec exists) | Orchestrator |

A material change to an `approved` or `shipped` spec (new locked decision, new entity, new scenario) requires bumping `version:` in frontmatter (e.g. `1.0 → 1.1`) AND noting the change in §Changelog. If the change invalidates a wave-2 reviewer's prior signoff, status drops back to `in-review`.

### Phase tags (`P1`, `P2`, `P3`, …)

Phase tags break a multi-pass spec into shippable slices. Convention:

- **P1** = MVP — minimum viable, end-to-end (happy path)
- **P2** = enrichment — edge cases, polish, secondary flows
- **P3** = integration — cross-module wiring, deep links, unified surfaces
- **P4** = compliance — regulatory hardening (GST returns, IRN, DPDP DSR)
- **P5** = scale — perf, observability, analytics

Phase numbers are per-module-spec, not global. A feature is `P2 deferred` until it's `P2 in-build` until it's `P2 shipped`.

### Stub vs deferred vs scaffolded vocabulary

These mean different things — pick the right one:

- **Stub** — UI renders something (placeholder card, "coming in vN.N" notice) but has no logic. Acceptable in `P1 shipped` if the spec explicitly lists it as P1 stub. Must show user-visible "coming soon" text — no silent no-ops.
- **Deferred** — not built at all. Tracked in spec `§Open items` or `§Deferred items` with an ID (`DEF-<MODULE>-N`), a priority, and an implementation hint. Code may have no reference to a deferred item.
- **Scaffolded** — the type / store contract exists in `@dms/types` and the store, but no UI consumes it. Useful when downstream specs depend on the type but the surface ships later.

When a deferred item lands, change its status: `DEF-INS-1 → shipped` in the spec; remove from the `§Deferred items` table; add a Changelog entry.

---

## 16. Spec-drift detection

Spec drift is the silent killer of a spec-driven codebase. Detection is part of the gate.

### When to run a drift check

- **Per-module:** at every phase boundary (P1→P2, P2→P3, etc.). Before bumping the spec version.
- **Cross-module:** at every "feature complete" milestone — the orchestrator dispatches a Sonnet sub-agent with the prompt template below.
- **Ad-hoc:** when a code-reviewer suspects a divergence (smell: behavior changed without a spec edit).

### Drift check prompt template

Use this verbatim when dispatching a drift agent:

```
You are doing a SPEC DRIFT AUDIT for module <X>. Research only — DO NOT modify any files.

Spec: <path>
Code surface: <list of dirs>
Routes: <list>

For each L-tag in the spec, grep the code for evidence the decision is honored
or contradicted. For each scenario in §Scenarios, find the matching
implementation. For each store action in §Store contract, verify it exists with
the documented signature.

Output three sections:
1. Documented but NOT implemented (L-tag/scenario/action with no code)
2. Implemented but NOT documented (code with no spec reference)
3. Divergences (spec says X, code does Y; cite file:line)

End with: "Recommended doc updates" — top 5 items to fix, prioritized.
```

### Outputs are tracked in `specs/architecture/drift-audits/<date>-<module>.md`

The drift audit is itself a spec-template document. Audits are kept (not deleted) so we can see the trend over time.

---

## 17. Production-grade checklist

"Production grade" is a vague term. Use this concrete checklist when claiming work is production-ready:

- [ ] DoD §10 1–15 all pass
- [ ] Every CTA wired (no silent no-ops; deferred actions render an explicit toast or notice)
- [ ] Empty / loading / error / success states present
- [ ] RBAC gates use the `Gate` primitive — no inline `hasRank` in JSX
- [ ] All user-visible strings via `next-intl`; keys land in `messages/en-IN.json` AND `messages/hi-IN.json` (use English fallback for hi-IN if translator hasn't shipped, but the key MUST exist)
- [ ] No `any` without a `// reason: <why>` comment
- [ ] No `text-[NNpx]`, no `rounded-lg/xl` outside approved exceptions
- [ ] Card / Field / Dialog / Slider / StatTile reused from `SPEC-ARCH-UI-001` — local redefinitions are rejected
- [ ] Hooks all called before any conditional return (Rules of Hooks)
- [ ] Zustand selectors return base refs; computation in `useMemo` (avoids infinite-render bugs)
- [ ] Confirmation dialog on destructive actions; type-to-confirm for permanent destruction (delete, anonymize, force-revoke)
- [ ] PII never concatenated into logs / toast / error message bodies
- [ ] Tests: unit tests for new logic; ≥1 integration test per scenario in spec §Scenarios
- [ ] Typecheck clean; existing test suite green; no new failures introduced
- [ ] Spec is bumped + changelog updated if behavior changed

If you cannot tick every box, the work is not production-grade — say "MVP grade" or "demo grade" instead. Words matter.

### 17.1 First-pass UI compliance — ZERO drift from the first commit

The 2026-04-29 Theme A pass exposed a pattern: even when CLAUDE.md and `SPEC-ARCH-UI-001` are cited in the implementation prompt, sub-agents drift on `text-[NNpx]`, `rounded-lg`, and i18n nesting. To prevent this, **every UI implementation prompt MUST include the following pre-flight block** (copy verbatim into the prompt's "Hard rules" section):

```
PRE-FLIGHT UI CHECKLIST (run BEFORE writing any JSX)

1. Open `D:/dms/dms/apps/staff-web/src/components/custom-builds/shared/detail-card.tsx`
   and import Card + Field from there. Do NOT redefine locally.
2. Use ONLY these text-size classes:
   text-xs / text-sm / text-base / text-lg / text-xl / text-2xl
   FORBIDDEN: text-[NNpx], text-[NNrem]. The drift test will reject.
3. Use ONLY rounded-md (and rounded-full for circular elements).
   FORBIDDEN: rounded-lg, rounded-xl, rounded-2xl, rounded-3xl outside the
   Dialog/AlertDialog primitive itself.
4. Use the Gate primitive for RBAC: <Gate role={['Rxx']} fallback="hide">…</Gate>.
   FORBIDDEN: inline `{hasRank(...) && <button>…}` patterns in JSX.
5. i18n keys go to messages/en-IN.json AND hi-IN.json AT THE ROOT of the JSON
   (not nested under another module). New module 'foo' creates a top-level
   "foo": { ... } object.
6. AFTER writing code, BEFORE returning: run
   `pnpm -F staff-web exec vitest run src/tests/ui-canon-drift.test.ts`
   Test must pass. If it fails, fix the violations — do NOT add your file
   to the baseline.

These rules are enforced by ui-canon-drift.test.ts. CI/test-suite blocks merges
with violations.
```

Including this block in every UI prompt is the difference between "first-pass clean" and "audit-and-fix-later."

---

## 18. Crash recovery + agent handoff

### Shared status file: `.claude/agent-status.md`

Every spawned agent reads this before starting and writes to it at every checkpoint. Format:

```markdown
## Agent: <task-name>
**Status:** STARTED | IN_PROGRESS | BLOCKED | COMPLETE | CRASHED
**Model:** opus | sonnet | haiku
**Started:** <ISO timestamp>

### Plan
1. ...
2. ...

### Files Involved
- <path> (create | modify | read)

### Progress
- [x] Step 1: <description>
- [ ] Step 2: <in progress>

### Blocker (if BLOCKED)
- What failed: ...
- Tried: ...
- Needed: ...

### Handoff Notes (if COMPLETE)
- <anything the next agent / orchestrator needs>
```

### When an agent crashes

If a spawned agent reports an API error, non-zero exit, or vanishes without a completion summary:

1. **Audit the working tree.** `git status` + per-file diff. Identify partial writes.
2. **Run typecheck on every touched app.** Pre-existing errors should be unchanged; new errors are the crashed agent's fault.
3. **Run targeted tests** if the crashed agent was supposed to add tests.
4. **Decide:**
   - **Finish the work yourself** if the crashed agent was ≥80% done (typical: spec backfill, last few tests, doc fixes).
   - **Relaunch with full context** if the agent was <50% done. Pass the partial state explicitly: "the prior agent crashed at step N; files X, Y, Z exist with content <summary>; finish steps N+1 onwards."
   - **Revert and restart** only if partial state is incoherent (rare).
5. **Update `agent-status.md`** with `CRASHED → recovered-by-orchestrator` or `CRASHED → relaunched`.

Never silently absorb a crash. The user must know which agent failed and what was recovered.

---

## 19. Commit discipline

### When to commit

- **At every phase / module boundary** — never let uncommitted work span sessions. The 2026-04-29 audit found 4 entire modules sitting uncommitted; this is a process failure.
- **After every quality-gate pass** (typecheck + tests green). Failed-gate work stays uncommitted while the fix is in flight.
- **Never commit half-finished agents' output** without auditing per §18.

### Conventional-commit prefixes (binding)

```
feat(<module>):       new user-facing feature or capability
fix(<module>):        bug fix
chore(<scope>):       housekeeping, no behavior change
docs(<scope>):        spec / readme / comment updates
refactor(<module>):   code restructure with no behavior change
test(<module>):       test-only additions
perf(<module>):       performance improvement
```

`<module>` is the domain (`vehicles`, `insurance`, `customers`, …) or `architecture` for cross-cutting work.

### Commit message body

- First line ≤72 chars, no period
- Blank line, then a body explaining **why** (not what — the diff shows what)
- Cite spec L-tags / scenarios / Doc numbers liberally
- Co-author footer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

### Splitting commits

When a session produces many changed files, split per-module rather than monolithic. Aim for 30–80 files per commit; each commit is one of:

- types + mocks foundation
- one module's full slice (spec + UI + store + tests)
- cross-cutting infra (shell, primitives, deps)

Use the 2026-04-29 9-commit batch as the reference exemplar.

### Never

- Never `git add -A` or `git add .` — lists files explicitly to avoid catching `.env` / build artifacts
- Never amend a commit that's been pushed
- Never commit `tsconfig.tsbuildinfo` files — add to `.gitignore` if not already
- Never bypass pre-commit hooks

---

## 20. Memory file usage

User-level: `~/.claude/projects/<project>/memory/MEMORY.md` (auto-managed). Never edit directly — the user owns it.

Project-level: `.claude/agent-status.md` (per-session, gitignored). Read at start of every spawned agent's run; append at every checkpoint.

Architecture knowledge: `specs/architecture/*.md` (committed). Update when the architectural fact changes — drift audits, cross-module seams, canonical patterns.

Roadmap: `specs/roadmap/next-themes.md` (committed). The "what's next" pickup point for new sessions.

When a session wraps up something significant, the orchestrator should propose appending a one-line note to MEMORY.md (the user runs the append). Format: `[Topic](slug.md) — TL;DR + pointer.`

---

## 21. Pre-existing failure budget

When typecheck or tests show pre-existing failures (not caused by the current change):

1. **Count and locate.** Note the count + file:line of each.
2. **Triage in `.claude/known-issues.md`** with: file:line, error summary, owner, ETA, blocker-or-not.
3. **Do not absorb silently.** Every report from a sub-agent must explicitly state "introduced 0 new failures; N pre-existing remain (logged in known-issues.md)."
4. **Budget: ≤ 5 pre-existing failures across both apps.** If more, the orchestrator dispatches a `/fix` agent before any new feature work.

This prevents the slow rot of accumulating "tolerated" failures.

---

## 22. Deferred items registry

Each module spec carries a `§Open items` or `§Deferred items` section listing things known but not yet built. Format:

```
| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-<MODULE>-<N> | <short title> | P1 | P2 | P3 (UX polish) | P4 (regulatory) | <impl hint + spec ref> |
```

The cross-cutting `specs/roadmap/next-themes.md` rolls these up into themes for sprint planning.

When a deferred item ships:
- Remove from §Deferred items
- Add scenario / AC to the spec
- Bump spec version
- Update changelog
- Link the commit hash in the changelog row

---

## Changelog

| Date | Change |
|---|---|
| 2026-04-29 | v0.1 — initial CLAUDE.md (sections 1–13) |
| 2026-04-29 | v0.2 — added §14 L-tag protocol, §15 spec lifecycle + phase tags + stub/deferred/scaffolded vocab, §16 spec-drift detection, §17 production-grade checklist, §18 crash recovery + agent-status.md, §19 commit discipline, §20 memory files, §21 pre-existing failure budget, §22 deferred items registry. Edits to §2 (architecture specs as mandatory reads), §5 (`.review.md` companion + Sonnet-default routing), §6 (cross-references mandatory: `SPEC-ARCH-UI-001`, `cross-module-wiring.md`, `flags:` validation), §10 (DoD expanded from 10 to 15 items: typecheck-as-gate, no `text-[NNpx]`, no `rounded-lg/xl` defaults, spec-drift check, every CTA wired, test placement convention). Codifies meta-rules learned from the 2026-04-29 multi-module ship + audit pass. |
