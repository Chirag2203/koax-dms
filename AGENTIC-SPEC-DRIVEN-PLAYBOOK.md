# Agentic Spec-Driven Autonomous Development — Playbook

A project-independent base for spinning up a new codebase that runs on
spec-first, agent-orchestrated, production-grade autonomous
development — covering the full lifecycle from cold-start research
through ship.

Battle-tested over thousands of agent-hours; every section is a
pattern that paid for itself by catching a real regression or
preventing a costly mis-build.

This document is **prescriptive**. Treat the rules as binding unless
you have explicit reason to deviate, and write that reason down.

> **Scope.** Use this when starting a new project — web app, internal
> tool, multi-tenant SaaS, anything where production quality matters
> and a single human cannot keep every detail in their head. The
> playbook scales from one engineer + agents to a small team + agents.

---

## Table of contents

0. [Mental model](#0-mental-model)
1. [Repo skeleton](#1-repo-skeleton)
2. [The agent roster](#2-the-agent-roster)
3. [Phase 0 — Project kickoff (discovery)](#3-phase-0--project-kickoff-discovery)
4. [Phase 1 — Bootstrap from kickoff](#4-phase-1--bootstrap-from-kickoff)
5. [Phase 2 — Per-feature pipeline](#5-phase-2--per-feature-pipeline)
6. [Model routing](#6-model-routing)
7. [Spec discipline](#7-spec-discipline)
8. [Locked-decision (L-tag) protocol](#8-locked-decision-l-tag-protocol)
9. [Cross-aggregate consistency contract](#9-cross-aggregate-consistency-contract)
10. [Design pipeline + visual consistency rules](#10-design-pipeline--visual-consistency-rules)
11. [SEO track](#11-seo-track)
12. [Brand + content track](#12-brand--content-track)
13. [Code quality enforcement](#13-code-quality-enforcement)
14. [Drift-detection guardrail tests](#14-drift-detection-guardrail-tests)
15. [Memory + cross-session continuity](#15-memory--cross-session-continuity)
16. [Commit discipline](#16-commit-discipline)
17. [Production-grade checklist](#17-production-grade-checklist)
18. [Anti-patterns to avoid](#18-anti-patterns-to-avoid)
19. [Operating rhythm + escalation](#19-operating-rhythm--escalation)
20. [Optional integrations (Linear, etc.)](#20-optional-integrations)
21. [Templates](#21-templates)

Appendix A — [Why this works](#appendix-a--why-this-works)
Appendix B — [When to deviate](#appendix-b--when-to-deviate)

---

## 0. Mental model

### Three principles

1. **The spec is the source of truth, not the code.** Code expresses
   the spec. Drift between spec and code is a regression. The L-tag
   table in the spec is a contract; future changes that violate an
   L-tag must either fix the code or supersede the L-tag. There is no
   third option.

2. **Independence is the value of multiple agents.** A single agent
   doing planning + implementation + review hides its own mistakes. A
   pipeline where security-reviewer, finance-reviewer, qa-planner,
   accessibility-auditor, and code-reviewer run *blind to each other's
   output* surfaces real issues. Don't collapse the waves.

3. **Static enforcement beats discipline every time.** Every recurring
   bug class becomes a guardrail test. We caught the same Zustand
   infinite-loop pattern three times in three different files; the
   fourth was caught by a test that scans the whole codebase. Never
   rely on a person remembering the rule.

### Two phases, not one

The work splits into two phases that need very different agent
postures:

- **Phase 0 — Discovery.** Research-heavy, written-deliverable-heavy.
  No code. Produces the canonical document set + design system spec +
  roadmap. Runs once at project kickoff. Takes 3-5 days agent-time.
- **Phase 2+ — Per-feature execution.** Spec-driven build. Each
  feature is a research → plan → spec → wave-2 reviews → integrator
  → implement → test → review cycle. Specs are written **as we go**,
  one per feature, NOT all upfront in Phase 0.

Phase 1 (bootstrap) sits between them: scaffold the monorepo, install
the design system from Phase 0, wire guardrail tests, set up auth
stubs. Day-or-two of work.

This phasing matters because the agent ROSTER is different in each
phase. Phase 0 needs market researchers and design strategists; Phase
2 needs implementation engineers and code reviewers. Don't ask one
agent to do both.

### The four roles you play

When orchestrating agents, you are simultaneously:

- **Lead.** Decide priorities; route work; resolve conflicts between
  agents; escalate to the user.
- **Integrator.** Merge wave-2 review findings into the spec; mint
  L-tags; flip status.
- **Senior reviewer.** Trust-but-verify everything an agent claims it
  did. Run the gates yourself before committing.
- **Historian.** Maintain MEMORY.md, agent-status.md, and the spec
  changelog so future sessions (and other engineers) can pick up
  cleanly.

If you are skipping any of these roles, the system breaks down within
days.

---

## 1. Repo skeleton

```
<repo-root>/
├── .claude/
│   ├── CLAUDE.md                  # global rules (the only doc agents MUST read)
│   ├── agent-status.md            # per-session shared state (gitignored)
│   ├── known-issues.md            # pre-existing failure budget
│   └── linear-config.json         # optional — see §20
│
├── apps/                          # user-facing apps (1+ surfaces)
│   ├── <surface-A>/               # e.g. customer-web, staff-web, mobile
│   └── <surface-B>/
│
├── packages/                      # shared workspace packages
│   ├── types/                     # Zod schemas + TS types (single source of truth)
│   ├── tokens/                    # design tokens (TS source consumed by Tailwind preset)
│   ├── ui/                        # primitives + domain components
│   ├── mocks/                     # MSW handlers + Faker seeds
│   ├── config-eslint/             # shared lint config
│   ├── config-tailwind/           # shared Tailwind preset
│   └── config-typescript/         # shared tsconfig.base.json
│
├── research/                      # KICKOFF doc set — Phase 0 outputs
│   ├── K00-executive-summary.md
│   ├── K01-market-and-competitive-landscape.md
│   ├── K02-business-model-and-monetization.md
│   ├── K03-user-research-and-personas.md
│   ├── K04-feature-matrix.md
│   ├── K05-customer-experience-and-journey-maps.md
│   ├── M01-<domain-module-brief>.md ... MNN  # 1 per major business domain
│   ├── K06-tech-architecture-patterns.md
│   ├── K07-glossary.md
│   ├── K08-domain-model.md
│   ├── K09-state-machines.md
│   ├── K10-non-functional-requirements.md
│   ├── K11-integration-contracts-index.md
│   ├── K12-role-permission-matrix.md
│   ├── K13-open-questions-and-risks.md
│   ├── K14-brand-and-content-strategy.md
│   ├── K15-seo-strategy.md         # public-facing surfaces only
│   └── K16-spec-template-and-conventions.md
│
├── design/                        # KICKOFF design outputs
│   ├── D00-design-direction-comparison.md   # 5 directions evaluated
│   ├── D01-design-system.md                 # canonical UI spec (locked)
│   ├── screens/                             # per-screen high-fidelity (Stitch / Figma exports)
│   └── tokens/                              # raw design-token source if separate from packages/tokens
│
├── specs/
│   ├── modules/<domain>/          # capability specs (NN-<slug>.md per spec)
│   │   └── <domain>/01-<feature>.md
│   ├── architecture/              # cross-cutting reference docs
│   │   ├── canonical-ui-patterns.md       # SPEC-ARCH-UI-001 — derived from D01
│   │   ├── cross-module-wiring.md         # numbered seam registry
│   │   ├── fixture-coverage-audit.md      # data-source-of-truth audits
│   │   └── drift-audits/<date>-<module>.md
│   ├── plans/PLAN-<MODULE>-NNN.md         # per-feature implementation plans
│   ├── research/<date>-<topic>.md         # per-feature research outputs (vs Phase 0 K-docs)
│   └── roadmap/next-themes.md             # what's next, ranked by leverage
│
└── README.md
```

### Why this layout

- **`research/` and `design/` are kickoff outputs** — committed once
  during Phase 0; thereafter referenced. Per-feature research lives
  under `specs/research/` (different folder, different lifetime).
- **`specs/` is sacred.** It is the only folder where per-feature
  decisions are recorded. Code without a corresponding spec gets
  rejected at review.
- **`.claude/CLAUDE.md` is the only file agents need to read first.**
  Everything else is referenced from there. Make it the single
  on-ramp.
- **`packages/types`** holds Zod schemas. Both apps consume them.
  Schema drift between surfaces is impossible by construction.
- **Drift audits are kept**, not deleted. Trend over time matters.
- **K-docs use a numbered prefix** (K00–K16) so they sort cleanly and
  can be cited by number ("per K06 §3" is unambiguous).
- **M-docs are domain modules** (e.g., `M01-sales-and-inventory.md`,
  `M02-service-and-parts.md`). One per major business domain;
  numbered after K05 so sorting stays intuitive.

---

## 2. The agent roster

The full agent team. Each agent has a single responsibility, model
preference, and known reading list. Mix-and-match per task.

### Phase 0 — Discovery agents (run during project kickoff only)

| Agent | Model | Output | Reading list |
|---|---|---|---|
| **market-researcher** | Opus | K01 Market & Competitive Landscape | brief + web search |
| **business-strategist** | Opus | K02 Business Model & Monetization | K01 + brief |
| **user-researcher** | Sonnet | K03 User Research & Personas | brief + interview transcripts (if any) |
| **feature-scoper** | Opus | K04 Feature Matrix (v1/v1.1/backlog) | K00–K03 |
| **journey-mapper** | Sonnet | K05 Customer Experience & Journey Maps | K03 + K04 |
| **domain-module-author** | Opus | M01..MN one per domain | K04 + brief |
| **architecture-strategist** | Opus | K06 Tech Architecture Patterns | K00 + brief |
| **glossary-author** | Sonnet | K07 Glossary / Ubiquitous Language | all M-docs |
| **domain-modeler** | Opus | K08 Domain Model (entities, aggregates) | M-docs + K07 |
| **state-machine-author** | Opus | K09 State Machines | K08 |
| **nfr-author** | Sonnet | K10 Non-Functional Requirements | K00 + K06 |
| **integration-cataloguer** | Sonnet | K11 Integration Contracts Index | M-docs + K06 |
| **rbac-architect** | Opus | K12 Role / Permission Matrix | K03 + M-docs |
| **risk-register-author** | Sonnet | K13 Open Questions & Risks | all prior K-docs |
| **brand-voice-definer** | Opus | K14 Brand & Content Strategy | K00 + K03 |
| **seo-strategist** | Opus | K15 SEO Strategy (public surfaces only) | K00 + K03 + K14 |
| **spec-conventions-author** | Sonnet | K16 Spec Template & Conventions (meta) | this playbook |
| **design-direction-explorer** | Opus | D00 Design Direction Comparison (5 dirs) | K00 + K03 + K14 |
| **design-system-architect** | Opus | D01 Design System (locked tokens) | D00 (locked direction) |
| **screen-designer** | Sonnet | per-screen design exports | D01 |
| **roadmap-synthesizer** | Opus | specs/roadmap/next-themes.md | all K-docs + D01 |

### Phase 2+ — Per-feature pipeline agents

| Agent | Model | Output | When |
|---|---|---|---|
| **/research** | Sonnet | specs/research/<date>-<topic>.md | unfamiliar domain / new tooling |
| **/plan** | Opus | specs/plans/PLAN-<MODULE>-NNN.md | every non-trivial feature |
| **/spec** | Opus | specs/modules/<domain>/NN-<slug>.md | every approved plan |
| **security-reviewer** | Opus | <spec>.security.review.md | wave-2; spec touching auth/PII/regulatory |
| **finance-reviewer** | Opus | <spec>.finance.review.md | wave-2; spec touching money/tax/payouts |
| **qa-planner** | Sonnet | <spec>.qa.review.md | wave-2; every spec |
| **accessibility-reviewer** | Sonnet | <spec>.a11y.review.md | wave-2; every UI spec |
| **integrator** | Opus | (edits main spec + flips status) | after all wave-2 returns |
| **/implement** | Sonnet | code | after spec status: approved |
| **/test** | Sonnet | tests | after implement (often during) |
| **/code-review** | Opus | review notes / approvals | before commit |
| **/scaffold** | Sonnet | boilerplate | new modules / components |
| **/refactor** | Sonnet | restructure | clear instructions |
| **/fix** | Opus | bug fix | any reported defect |

### Cross-cutting expert reviewers (recurring; not just at ship)

| Agent | Model | Cadence | What they catch |
|---|---|---|---|
| **performance-auditor** | Sonnet | Per release; pre-launch | bundle size, LCP/INP/CLS, hot paths |
| **accessibility-auditor** | Sonnet | Per UI feature; pre-launch | WCAG 2.2 AA + AAA aspirational |
| **seo-auditor** | Sonnet | Per public-surface release | Core Web Vitals, semantic HTML, schema |
| **security-auditor** | Opus | Per release; pre-launch | OWASP Top 10, auth, PII, headers |
| **visual-consistency-auditor** | Sonnet | Per UI feature; weekly | drift from D01 (rules in §10) |
| **spec-drift-auditor** | Sonnet | Per phase boundary | L-tag drift, scenario gaps |
| **brand-voice-auditor** | Sonnet | Per public-content release | tone consistency, banned phrases |

### Specialized authoring agents

| Agent | Model | What they write |
|---|---|---|
| **ux-writer** | Sonnet | microcopy, empty states, error toasts, dialog copy |
| **per-page-seo-author** | Sonnet | titles, meta, OG, structured data per route |
| **content-strategist** | Sonnet | blog/landing copy with editorial calendar |
| **design-handoff-author** | Sonnet | dev handoff specs from screens |
| **changelog-author** | Sonnet | user-facing release notes |

### Total agent count

22 Phase-0 agents + 14 Phase-2 agents + 7 cross-cutting + 5 specialized = **48 distinct agents**. You don't need all 48 active at once. The playbook tells you which to dispatch when.

---

## 3. Phase 0 — Project kickoff (discovery)

**Goal**: produce the foundational document set, the locked design
system, and the roadmap. No code. Once Phase 0 ships, you have
everything you need to start building features in Phase 2.

**Time budget**: 3-5 days agent-time, ~2 days human review/signoff.

### 3.1 The kickoff brief

Before any agent runs, the human writes a kickoff brief — a single
document the user (you) authors that bootstraps every Phase-0 agent.
File: `research/_brief.md` (the leading underscore sorts it before
K-docs).

The brief must answer:

```
1. Product name + one-line pitch
2. Who uses it? (rough personas — agents will refine)
3. What does it replace / compete with?
4. Target market (geography, segment, scale)
5. Regulatory environment? (DPDP, GDPR, HIPAA, SOC2, FedRAMP, etc.)
6. Core constraints (e.g., "must integrate with Tally Prime",
   "must work offline in low-bandwidth", "must be self-hostable")
7. Surfaces (web, mobile, internal tool, API, multi-tenant SaaS, etc.)
8. Tech preferences (e.g., "Next.js + TypeScript", "Postgres", "no AWS")
9. Time horizon (MVP date, beta date, GA date)
10. Anything else that's pre-decided
```

This is the only doc YOU write by hand. Everything else flows from it.

### 3.2 Kickoff agent ordering

```
[Day 1 — parallel discovery]
  ├── market-researcher       → K01
  ├── user-researcher         → K03 (interviews if available)
  └── architecture-strategist → K06 (rough)

[Day 1 → 2 — synthesis]
  business-strategist (reads K01)            → K02
  feature-scoper (reads K00–K03)             → K04
  domain-module-author × N (reads K04)        → M01..MN

[Day 2 — domain modeling, parallel]
  ├── glossary-author (reads M-docs)         → K07
  ├── nfr-author (reads K00 + K06)           → K10
  ├── integration-cataloguer (reads M-docs)  → K11
  ├── brand-voice-definer (reads K00 + K03)  → K14
  └── seo-strategist (reads K00 + K14)       → K15

[Day 2 → 3 — depends on glossary]
  domain-modeler (reads M-docs + K07)        → K08
  state-machine-author (reads K08)           → K09
  rbac-architect (reads K03 + M-docs)        → K12

[Day 3 — risk register]
  risk-register-author (reads ALL)           → K13

[Day 3 — design discovery]
  design-direction-explorer (reads K00, K03, K14) → D00 (5 directions)
  [HUMAN PICKS direction(s) — one per surface allowed]
  design-system-architect (reads D00 + locked direction) → D01

[Day 4 — meta + roadmap]
  spec-conventions-author (reads playbook)   → K16
  journey-mapper (reads K03, K04, D01)       → K05
  roadmap-synthesizer (reads ALL)            → specs/roadmap/next-themes.md

[Day 5 — review pass]
  Human review of every doc.
  Risk-register-author re-runs if material gaps.
  Stakeholder signoff (CEO/founder).
```

### 3.3 The kickoff doc set — mandatory content

Each doc has prescribed mandatory sections. Skipping a section = a
spec drift later. Don't skip.

#### K00 — Executive Summary (≤2 pages)
- Product mission (1 paragraph)
- Target users (3-5 personas, 1 line each)
- v1 scope in 5 bullets
- Critical non-negotiables (regulatory, performance, brand)
- Success metric (the ONE metric that determines whether v1 worked)
- Anti-mission (what this product is explicitly NOT)

#### K01 — Market & Competitive Landscape (3-8 pages)
- Market sizing (TAM/SAM/SOM if relevant)
- Direct competitors (table: name, positioning, pricing, weakness)
- Indirect competitors / substitutes
- Pricing benchmarks (table: tier, price, included features)
- Differentiation hypothesis (3-5 angles)
- Competitive risk register (top 5 threats)
- Citation list (sources used)

#### K02 — Business Model & Monetization (2-5 pages)
*Required per user direction — capture findings now even if monetization is deferred.*
- Revenue model (subscription / transactional / hybrid / freemium)
- Pricing strategy (tier structure if SaaS; commission rates if marketplace)
- Unit economics (CAC, LTV, payback period — even rough)
- Cost structure (fixed vs variable; licensing; vendor costs)
- Margin expectations
- Funding plan / runway implications
- Pivot scenarios (if v1 metric misses, what's plan B?)

#### K03 — User Research & Personas (3-10 pages)
- Primary personas (3-5, each: name, role, goals, frustrations, daily workflow, tech comfort)
- Secondary personas (2-4)
- Anti-personas (who this product is NOT for)
- Jobs-to-be-done (5-10 JTBDs ranked by priority)
- Interview transcripts / source data (appendix)

#### K04 — Feature Matrix (1-3 pages, table-heavy)
- v1 features (must-ship for launch)
- v1.1 features (can ship within 30 days post-launch)
- Backlog (prioritized; everything else)
- Each row: feature name, persona, JTBD reference, priority (P0/P1/P2), domain module
- Out of scope (v2+) — explicitly listed

#### K05 — Customer Experience & Journey Maps (2-5 pages)
- Top 5 user journeys (start state → end state)
- Touchpoints per journey (table: step, surface, action, success criteria)
- Critical moments (the 3-5 moments that determine whether the customer comes back)
- Failure modes (what breaks experience; how to recover)

#### M-docs — Domain Module Briefs (one per major business domain; 3-8 pages each)
- Module purpose (1 paragraph)
- Stakeholders (which personas from K03)
- Core entities (rough — refined in K08)
- Key workflows (5-15 bullet flows)
- Regulatory constraints specific to this domain
- Integration points (refined in K11)
- Open questions for spec phase

#### K06 — Tech Architecture Patterns (3-6 pages)
- Stack decisions (table: layer → choice + rationale)
- State management approach (Zustand recommended)
- Data flow patterns (UI-layer cross-store calls per playbook §9)
- Mock/fixture strategy (MSW recommended)
- Auth strategy (mock-phase + real-backend swap)
- Testing strategy (Vitest unit, Playwright E2E)
- CI/CD outline

#### K07 — Glossary / Ubiquitous Language (alphabetical)
- Every domain term used in M-docs, defined.
- Banned synonyms (e.g., "we say `Customer`, never `Client`/`User`/`Consumer`")
- Acronyms expanded
- Pronunciation if non-obvious

#### K08 — Domain Model (5-15 pages, schema-heavy)
- Entity-relationship diagram (text-based or linked Mermaid)
- Each entity: fields, types, validation rules, lifecycle
- Aggregates (which entities cluster around which root)
- Identity rules (UUID? ULID? domain-specific like VIN? Composite?)
- Audit fields (createdAt, updatedAt, createdBy, updatedBy — locked once)

#### K09 — State Machines (1-3 pages per state machine)
- Every status field on every entity
- Transition table: from → to + actor + side-effects + invariants
- Illegal transitions explicitly listed
- Terminal states identified

#### K10 — Non-Functional Requirements (2-4 pages)
- Performance budgets (LCP, INP, CLS, TTFB targets per surface)
- Availability targets (99.5%? 99.9%? with maintenance window)
- Scale targets (concurrent users at v1, v1.1, v2)
- Security baseline (OWASP Top 10 mitigations, headers, encryption-at-rest/transit)
- Observability (logs, metrics, traces — what's required from day 1)
- Data retention + deletion policies (DPDP/GDPR alignment)

#### K11 — Integration Contracts Index (1-3 pages)
- Every external service the product talks to
- Per-integration: vendor, contract type (REST/webhook/GraphQL), authentication, rate limits, retry policy, fallback if service down, mock-phase stub
- Data Processing Agreement requirements (DPDP §8(5), GDPR Art. 28)

#### K12 — Role / Permission Matrix (2-5 pages)
- Every role in the system (R01..RNN with rank ladder)
- Capability matrix (table: action × role → allowed/denied/scoped)
- Hierarchy rules ("R12 can do everything R09 can do, plus...")
- Cross-tenant rules (if multi-tenant: who can see what)
- Special roles (DPO for DSAR, Auditor for read-only, Owner for everything)

#### K13 — Open Questions & Risks (running document)
- Open questions table (Q-NNN, question, owner, due date, status)
- Risk register (RISK-NNN, description, likelihood, impact, mitigation)
- Q-NNN gets resolved during spec phase OR escalated; never quietly ignored

#### K14 — Brand & Content Strategy (3-6 pages)
- Brand mission (1 paragraph)
- Voice attributes (3-5: e.g., "confident but not arrogant", "warm but not chummy")
- Tone modulation (formal vs casual per surface; map per surface)
- Banned phrases / overused words to avoid
- Reference brands (3-5 we're inspired by, with WHY)
- Content pillars for marketing/blog (3-5 themes)
- Editorial calendar template (cadence per channel)

#### K15 — SEO Strategy (public-facing surfaces only, 3-6 pages)
- Target keyword clusters (5-10 clusters, each with primary + 5-15 long-tail)
- Search intent per cluster (informational/navigational/transactional)
- Content architecture (URL structure, breadcrumb depth, internal linking pattern)
- Pillar/cluster model if blog-heavy
- Technical SEO baseline (sitemap, robots.txt, canonical strategy, hreflang if i18n, structured data schemas to use)
- Competitor SEO snapshot (top 5 competitors' keyword overlap)
- Quarterly content goals (e.g., "publish 12 long-form per quarter")

#### K16 — Spec Template & Conventions (meta — see §7)
- The 21-section template (copy from this playbook)
- Frontmatter shape
- Naming conventions for spec_id, file paths
- L-tag conventions

#### D00 — Design Direction Comparison (3-5 pages)
- 5 distinct directions evaluated
- Per direction: name, mood (3-5 adjectives), reference brands, rough swatch + type pairing + sample component
- Pros/cons per direction
- Recommendation (with second/third choice)
- **Locked direction(s) per surface** — different surfaces (customer / staff / admin) MAY use different directions

#### D01 — Design System (10-30 pages, the canonical UI spec)
This becomes `specs/architecture/canonical-ui-patterns.md` (or
`SPEC-ARCH-UI-001`). See §10 for the full content of D01.

### 3.4 Phase 0 quality gates

Before flipping from Phase 0 → Phase 1:

- [ ] All K00-K16 docs exist and signed off by stakeholder
- [ ] All M-docs exist (at least one per major business domain)
- [ ] D00 has a locked direction per surface
- [ ] D01 has all token tables filled (colors, type scale, spacing, motion, radii, icons)
- [ ] K13 has zero open P0 questions (P1+ acceptable)
- [ ] roadmap/next-themes.md ranks the next 4-8 themes
- [ ] Risk register reviewed; top 3 risks have explicit mitigations

If any unticked: do not start coding. The cost of Phase 1+2 work
built on incomplete kickoff is 5-10× the cost of finishing Phase 0
properly.

---

## 4. Phase 1 — Bootstrap from kickoff

**Goal**: scaffold the monorepo with the design system installed,
guardrail tests wired, and a working dev environment. No features
yet — just the infrastructure that makes Phase 2 fast.

**Time budget**: 1-2 days agent-time.

### 4.1 Bootstrap checklist

```
Day 1 (≤4 hours):
  □ pnpm init monorepo with pnpm-workspace.yaml
  □ Set up Turbo (turbo.json) for cached task runs
  □ Create the repo skeleton from §1
  □ Author .claude/CLAUDE.md from §21 template
  □ Initialize packages/types, packages/tokens, packages/ui,
    packages/mocks, packages/config-eslint, packages/config-tailwind,
    packages/config-typescript
  □ Wire TypeScript strict mode + noUncheckedIndexedAccess
  □ Wire @<scope>/tokens with values copied from D01
  □ Wire @<scope>/config-tailwind preset consuming tokens via CSS vars

Day 2 (≤6 hours):
  □ Stand up the first surface app with shell + auth stubs
  □ Implement canonical UI primitives (Card, Field, Button, Dialog,
    Slider, Gate, Toast, ErrorBoundary, ModuleErrorFallback) using D01 tokens
  □ Author specs/architecture/canonical-ui-patterns.md (the UI spec —
    derived directly from D01)
  □ Author specs/architecture/cross-module-wiring.md (empty seam registry)
  □ Wire up the 6 drift-detection guardrail tests from §14
    (with empty baselines — they pass on day 1 and stay green)
  □ Set up next-intl with primary + fallback locales (per K15 if i18n)
  □ Wire up MSW for mocked data
  □ Set up Playwright for E2E
  □ Wire ESLint with react-hooks/rules-of-hooks: error
  □ Optional: Linear webhooks if using §20 integration
```

### 4.2 Phase 1 quality gates

- [ ] `pnpm typecheck` exits 0 across all packages
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` runs (even if no tests yet — infrastructure works)
- [ ] All 6 guardrail tests pass with empty baselines
- [ ] First app boots; sample page renders; auth stub works
- [ ] Design tokens flow from packages/tokens → Tailwind → rendered page
- [ ] Storybook runs (if using); at least one primitive has a story

---

## 5. Phase 2 — Per-feature pipeline

**Goal**: ship features. One feature at a time through the pipeline.

**Cadence**: a typical feature is 1-3 days agent-time depending on
scope; a major spec (like our Shoots v2.1) is 3-5 days.

### 5.1 The canonical pipeline

```
research                              [Sonnet — gathers context]
   │
   ▼
plan                                  [Opus — architecture decisions]
   │
   ▼
spec                                  [Opus — formalises plan into contract]
   │
   ▼  (status: draft → in-review)
   │
   ├── (parallel wave-2)
   │     security-reviewer            [Opus — DPDP/PII/auth]
   │     finance-reviewer             [Opus — money flows; if applicable]
   │     qa-planner                   [Sonnet — scenarios/AC/test plan]
   │     accessibility-reviewer       [Sonnet — WCAG; if UI-bearing]
   │
   ▼
integrator                            [Opus — merges reviews; mints L-tags]
   │
   ▼  (status: in-review → approved, OR stays in-review with deferred items)
   │
implement                             [Sonnet — code; split into phases for big specs]
   │
   ▼
test                                  [Sonnet — unit + integration; mostly already in spec]
   │
   ▼
code-reviewer                         [Opus — final gate before commit]
   │
   ▼
commit
```

### 5.2 Rules of the pipeline

1. **Never skip waves on production-bound work.** Skipping wave-2
   reviews is the single biggest source of post-ship pain.

2. **Reviewers are independent.** Each wave-2 reviewer reads the spec
   in a fresh context, never sees the others' output. Their reports
   land as `<spec-name>.<reviewer>.review.md` next to the spec. The
   integrator is the only agent that merges findings.

3. **Each reviewer signs off `yes`, `no`, or `with-concerns`.** The
   spec cannot move from `in-review → approved` until every required
   reviewer has signed `yes` OR `with-concerns + acknowledged-by-integrator: yes`.

4. **The integrator never hides reviewer findings.** Every blocker
   either becomes a minted L-tag (if resolvable in spec text) OR a
   tracked deferred item with a target version. "We'll fix it later"
   without a tracked item is forbidden.

5. **`/research` is mandatory for unfamiliar domains.** New API,
   regulatory question, competitive pattern, integration shape — all
   require research first. Plans built on assumptions are rejected.

6. **Implementation is split into phases for specs > ~1000 LoC.**
   Phase 1 is foundation (types + store + i18n + tests for store
   actions). Phase 2 is UI + cross-store wiring + integration tests.
   Each phase commits independently; quality gates green between.

7. **Background agents for parallelism.** If three reviewers can run
   in parallel, dispatch them in parallel. Don't serialise unless
   there's a real dependency.

8. **Specs are written as we go.** Phase 0 produces FOUNDATIONAL docs
   (K-docs + D01) and the ROADMAP. Specs themselves come per-feature
   in Phase 2. Don't try to write all specs upfront in Phase 0 —
   you'll guess wrong and rework them.

### 5.3 Agent prompt shape

Every agent dispatch follows this structure:

```
Context:     what the agent needs to know; cite docs by reference
Task:        single, crisp deliverable
Constraints: hard rules (spec L-tags, DoD items, NFRs, RBAC, regulatory,
             pre-flight UI checklist if UI work)
Output:      exact format expected back
```

**Terse command-style prompts are banned.** They produce shallow,
generic work. A good prompt is 200–600 words with the agent's reading
list, the deliverable shape, and the quality gates it must pass.

### 5.4 When NOT to use the pipeline

- Single-line typos
- Renaming a variable
- Adding a missing comma
- Answering a user question
- Pure refactor with no behavior change (use `/refactor` solo)

For everything else, use the pipeline. The cost is real — a full
research → plan → spec → wave-2 → implement cycle is 3–6 hours of
agent time — but the cost of NOT using it (post-ship rework, security
holes, regulatory failures) is orders of magnitude higher.

### 5.5 Cross-cutting reviewers in Phase 2

Beyond wave-2 (which is per-spec), schedule recurring expert reviews:

- **Per-release** (before tagging): performance, security, SEO (if public), accessibility
- **Weekly**: visual-consistency-auditor (drift from D01)
- **Monthly**: spec-drift-auditor (per-module audit; output to `specs/architecture/drift-audits/`)

Each cross-cutting reviewer produces a markdown report with prioritized
P0/P1/P2/P3 findings. Treat their findings the same as wave-2
findings — blockers become L-tags or deferred items.

---

## 6. Model routing

Default sub-agent model is **Sonnet**. Use **Opus** for genuinely-hard
reasoning. Use **Haiku** for purely mechanical work.

### When to use Opus

- Spec drafting (the integrator pass especially)
- Wave-2 reviews on critical surfaces:
  - security-reviewer (auth, PII, encryption, compliance)
  - finance-reviewer (money, tax, refunds, journal entries)
- Complex multi-file debugging
- Cross-aggregate consistency analysis
- All Phase 0 strategic-thinking agents (market, business, feature scoping, domain modeling, RBAC, brand voice, design direction, design system, roadmap)

### When Sonnet is enough

- Implementation following an approved spec
- Writing tests from scenarios in the spec
- QA-planner reviews (structured rubric work)
- Per-feature research gathering (web search + summarisation)
- Refactoring within a single file with clear instructions
- Building UI from a Stitch/Figma screen
- Storybook stories
- API routes following established patterns
- Documentation, READMEs, inline comments
- Cross-cutting recurring auditors (perf, a11y, SEO, brand-voice)
- Phase 0 supporting agents (user research synthesis, glossary, NFRs,
  integration cataloguing, risk register, content strategy, journey
  mapping, screen design)

### When Haiku wins

- Bulk find-and-replace
- Generating barrel exports
- Adding JSDoc to existing code
- File renames and moves
- Simple config changes (env vars, feature flags)

### The token-efficiency rule

Always pick the cheapest model that can complete the task without
needing rework. A bad Sonnet output that needs an Opus rewrite is
twice as expensive as just using Opus. A good Haiku barrel-export
that took 3 seconds is a huge win over Sonnet doing the same.

For critical tasks, prefer Opus — quality matters more than tokens.
For everything else, default Sonnet and reach for Opus only when the
task gets stuck.

---

## 7. Spec discipline

### The 21-section template

Every capability spec uses this structure. Sections that don't apply
get a one-line "N/A — reason." Never delete sections.

```yaml
---
spec_id: SPEC-<DOMAIN>-NNN
domain: <domain>
title: <Human-readable title>
status: draft | in-review | approved | in-build | shipped | deprecated
version: <semver>
risk_level: low | medium | high | critical
pii_sensitivity: none | low | medium | high
flags: [feature-flag-names]
owners: [planner, ux-writer, qa-planner, security-reviewer, integrator]
depends_on: [other SPEC-IDs]
related_research: <RESEARCH-ID>
related_plan: <PLAN-ID>
docs_consulted: [list of canonical doc references — K-docs by number]
effective_date: <YYYY-MM-DD>
---
```

1. **Summary** — 1 paragraph: what + why + who
2. **Locked decisions** — table (Tag/Title/Decision/Source); 3+ rows
3. **Routes** — every URL the spec adds or modifies
4. **Personas** — every role (cite K12 RBAC)
5. **Data model** — Zod schemas, errors, enums (cite K08)
6. **State machine** — every legal transition + every illegal one (cite K09)
7. **Cross-module integration** — every seam (numbered registry)
8. **Cross-aggregate consistency contract** — see §9
9. **UI surfaces** — components + primitive citations (cite D01)
10. **Scenarios** (Given/When/Then) — minimum 12, often 18+
11. **Acceptance criteria** — falsifiable, references scenarios
12. **RBAC** — table per role (cite K12)
13. **Compliance** — privacy, regulatory, retention (cite K10, K13)
14. **Telemetry / events emitted** — payload shapes (no PII text)
15. **Open questions** — anything needing human signoff
16. **Deferred items** — `DEF-<MODULE>-N` registry
17. **Out of scope** — explicitly negative scope
18. **Migration / rollout** — feature flag gating, backfill
19. **Test plan** — file paths + scenario coverage + Quality Gates
20. **Spec traceability matrix** — Scenario # → AC # → test file → L-tag
21. **Changelog** — every version bump with reasoning

### Status lifecycle

| Status | Meaning |
|---|---|
| `draft` | Author working; reviewers not yet engaged |
| `in-review` | Wave-2 reviewers spawned |
| `approved` | All required `.review.md` signed off; coding can begin |
| `in-build` | Coder agent actively implementing |
| `shipped` | Implementation merged; tests green; ready for E2E gate |
| `deprecated` | Successor spec exists |

A material change to an `approved` or `shipped` spec requires
bumping `version:` and noting the change in §Changelog. If the
change invalidates a wave-2 reviewer's prior signoff, status drops
back to `in-review`.

### Phase tags

Multi-pass specs use phase tags:

- **P1** — MVP, end-to-end happy path
- **P2** — enrichment, edge cases, secondary flows
- **P3** — integration, cross-module wiring
- **P4** — compliance hardening
- **P5** — scale, performance, observability

A feature is `P2 deferred` until it's `P2 in-build` until it's
`P2 shipped`.

### Stub vs deferred vs scaffolded

Pick the right vocabulary:

- **Stub** — UI renders something (placeholder card, "coming in vN.N"
  notice) but no logic. User sees the placeholder. Acceptable in
  `P1 shipped` if the spec lists it as a P1 stub.
- **Deferred** — not built at all. Tracked in spec §Deferred items
  with an ID, priority, and impl hint. Code may have no reference.
- **Scaffolded** — type/store contract exists in `@<scope>/types` and
  the store, but no UI consumes it.

When a deferred item lands: change status, remove from §Deferred,
bump spec version, add changelog entry, link the commit hash.

---

## 8. Locked-decision (L-tag) protocol

L-tags are non-negotiable contracts. They make spec drift greppable
in the codebase and machine-checkable.

### When to mint an L-tag

1. A trade-off was made and the alternative would be tempting later.
2. A regulatory or compliance constraint is being honored.
3. A reviewer concern was resolved by an explicit decision.
4. A cross-module contract is being established.

**Do NOT mint an L-tag for routine choices.** "We used `useState` not
`useReducer`" is not L-tag material. L-tags are for decisions that
future maintainers might unknowingly violate.

### Format

```markdown
| Tag | Title | Decision | Source |
|---|---|---|---|
| L1 | <short title> | <one-paragraph decision in prose> | <doc citation or review #> |
```

### Citing in code

```ts
// L18: TCS waiver requires R12+ + reason text — see PLAN-VEHICLES-003
```

This makes drift detection greppable and onboarding faster.

### Supersession protocol

When a locked decision is replaced:

1. **Do NOT delete the original L-tag.** Edit the title cell:
   `**[SUPERSEDED by L<new> — see §<new-section>]**` followed by the
   original title.
2. Wrap the original Decision text as `*Original (vN.M):*`.
3. Add the new L-tag below.
4. Add a §N section describing the supersession (Trigger, Migration,
   Fallback handling).
5. Update §Changelog with a `vN.M — L<old> superseded by L<new>` row.
6. Code comments referencing the old L-tag stay valid (history); new
   code references the new L-tag.

### Drift gate

Periodically (per phase, per release):

1. Read every L-tag.
2. For each, grep the codebase for evidence the decision is honored.
3. If evidence is missing or contradicts: flag drift in
   `agent-status.md` with the L-tag and file:line.

---

## 9. Cross-aggregate consistency contract

The single most-important section of any spec touching shared data.

### The pattern

When a field appears on multiple aggregates (e.g., `vin` exists on
Vehicle, Shoot, ServiceJobCard, IntakeInspection), the spec MUST
include a §Cross-aggregate consistency contract section with this
table:

| Shared field | Source-of-truth aggregate | Downstream readers | Drift guard |
|---|---|---|---|
| `vin` | Vehicle | JobCard, IntakeInspection | Read-only via vehicles-store selector; never duplicated |
| `customerId` | JobCard | IntakeInspection | IntakeInspection reads via JC.customerId; never stores its own |
| `customerName` | Customer | IntakeInspection (display only) | Resolved at PDF render time, not stored |

### The rule

Any field that exists on more than one aggregate MUST have **exactly
ONE** source-of-truth. Readers fetch via selector at render time,
NEVER by copying into their own state. Drift between aggregates is a
regression caught by a `cross-aggregate-<module>-consistency.test.ts`
test.

### Three enforcement layers

1. **Compile-time.** Mark deprecated fields with JSDoc `@deprecated`;
   prefer Zod `.deprecate()` if available; lint-rule for new writes.
2. **Render-time.** Selectors hydrate the live value. Components
   never receive a copy from their own props/state.
3. **Test-time.** A drift test mutates the source, asserts every
   downstream reader reflects the new value within the same render
   tick.

---

## 10. Design pipeline + visual consistency rules

This is the most-prescriptive section in the playbook. "Exceptional
and consistent" UI requires LOCKED rules; principles aren't enough.
Every rule below is binding from D01 onwards.

### 10.1 D01 — Design system mandatory content

The D01 doc (`design/D01-design-system.md`) → installed as
`specs/architecture/canonical-ui-patterns.md` (SPEC-ARCH-UI-001) →
referenced by every spec. Mandatory sections:

#### Type scale (LOCKED)

Exactly 6 sizes for body content. Display sizes for hero use only.

```ts
// packages/tokens/src/typography.ts — locked
export const TYPE_SCALE = {
  xs:    '12px',  // line-height 16px
  sm:    '14px',  // line-height 20px
  base:  '16px',  // line-height 24px
  lg:    '18px',  // line-height 28px
  xl:    '20px',  // line-height 28px
  '2xl': '24px',  // line-height 32px
  // Hero ONLY (display fonts; max 2 hero levels per surface):
  '3xl': '30px',  // line-height 36px
  '4xl': '36px',  // line-height 40px
} as const;
```

**Banned**: `text-[NNpx]`, `text-[NNrem]`, any arbitrary value. The
`ui-canon-drift.test.ts` enforces this.

**Max 3 type families per surface**: 1 sans (UI chrome), 1 mono (code/numbers/IDs), optionally 1 display/serif (hero/brand wordmark).

**Max 4 font weights per family**: typically 400/500/600/700.

**Line heights**: 1.2 (display), 1.4 (body 14-18px), 1.6 (long-form 16-20px).

#### Spacing (LOCKED)

Pick a 4pt OR 8pt base grid. Lock for life. **Recommended**: 4pt
grid (matches Tailwind defaults).

```ts
export const SPACING = {
  0:  '0',
  1:  '4px',   2:  '8px',
  3:  '12px',  4:  '16px',
  5:  '20px',  6:  '24px',
  8:  '32px',  10: '40px',
  12: '48px',  16: '64px',
  20: '80px',  24: '96px',
} as const;
```

**Banned**: arbitrary `m-[Npx]`, `p-[Npx]`, inline styles with raw px.

#### Radius (LOCKED)

Exactly 3 named radii.

```ts
export const RADIUS = {
  none:  '0',
  sm:    '4px',  // chips, badges, small buttons
  md:    '6px',  // cards, panels, inputs, default
  lg:    '12px', // ONLY for full-page hero / Dialog primitive
  full:  '9999px', // circular only (avatars, status dots)
} as const;
```

`rounded-md` is the default for everything. `rounded-lg` ONLY for
the Dialog/AlertDialog primitive itself or full-page hero modals.
**Banned everywhere else** — drift-test enforced.

#### Color tokens (LOCKED — semantic only)

No raw hex in components. Every color is a semantic token:

```ts
export const COLORS = {
  // Ink (text)
  'ink-primary':   /* darkest, body */,
  'ink-secondary': /* heading-on-card / labels */,
  'ink-muted':     /* metadata / secondary info */,
  'ink-subtle':    /* placeholders / disabled */,

  // Backgrounds
  'bg-base':       /* page bg */,
  'bg-surface':    /* cards / panels */,
  'bg-elevated':   /* dialogs / popovers */,
  'bg-subtle':     /* form inputs / chips */,

  // Borders
  'border-line':   /* default rule */,
  'border-strong': /* emphasized divider */,

  // States (ONE accent + 4 semantic states)
  'accent':        /* brand primary */,
  'accent-hover':  /* hover state */,
  'state-success': /* green */,
  'state-warning': /* amber */,
  'state-danger':  /* red */,
  'state-info':    /* blue */,
} as const;
```

**Surface variants** via `[data-surface]` and `[data-theme]` CSS
attributes. Don't fork tokens per app — variant via CSS vars.

**Contrast (LOCKED)**:
- Body text: ≥4.5:1 (WCAG AA)
- Body text aspirational: ≥7:1 (AAA)
- Large text (≥18px or ≥14px bold): ≥3:1
- UI components / focus rings: ≥3:1 against adjacent surfaces

#### Motion (LOCKED)

Exactly 2 easing curves. Exactly 4 durations. Reduced-motion always
honored.

```ts
export const MOTION = {
  ease: {
    natural: 'cubic-bezier(0.4, 0, 0.2, 1)',  // most things
    snappy:  'cubic-bezier(0.3, 0, 0, 1)',     // micro-interactions
  },
  duration: {
    micro:   '150ms',  // hover, focus
    default: '250ms',  // most transitions
    modal:   '400ms',  // sheets, dialogs
    page:    '600ms',  // route transitions (sparingly)
  },
} as const;
```

**Rules**:
- One entrance animation per page-fold; staggers via offsets.
- All durations honor `@media (prefers-reduced-motion: reduce)` →
  drop to instant or single 100ms fade.
- No spring physics by default (deterministic curves only). Springs
  allowed for drag-drop where physics IS the affordance.
- No `animate-spin`, `animate-pulse`, `animate-bounce` outside
  loading states.

#### Iconography (LOCKED)

One icon family per surface. Pick one, lock it.

```ts
export const ICONS = {
  family: 'lucide-react',  // OR 'phosphor', 'heroicons' — pick one, lock
  strokeWidth: 1.5,         // OR 2.0 — pick one, lock
  sizes: [12, 14, 16, 20, 24, 32], // exact set; no others
} as const;
```

#### Imagery (LOCKED)

- One photography style per surface (color-graded consistently —
  pick "warm editorial" / "neutral product" / "high-key bright" / etc.)
- One illustration style if used (line / flat / isometric — lock one)
- Aspect ratios allowed: 16:9, 4:3, 3:2, 1:1 (no others)
- All photography processed through the same LUT/preset

#### Density (LOCKED per surface)

```ts
export const DENSITY = {
  // Pick ONE per surface and lock
  compact:     { rowHeight: 32, padding: 8  },  // data-heavy admin
  comfortable: { rowHeight: 40, padding: 12 },  // most B2B SaaS — RECOMMENDED
  spacious:    { rowHeight: 48, padding: 16 },  // consumer / luxury
} as const;
```

#### Tap targets (LOCKED)

- Mobile minimum: 44×44px (WCAG 2.2 AAA recommendation)
- Desktop minimum (with touch fallback): 32×32px clickable; visual
  may be smaller if hit-area is padded
- Keyboard focus ring: ≥2px solid, ≥3:1 contrast against adjacent

### 10.2 Canonical UI primitives (mandatory in `packages/ui`)

Every project ships with this set. Before any feature work begins:

| Primitive | Purpose | Notes |
|---|---|---|
| `Card` | Containing surface | radius=md, border-line, bg-surface |
| `Field` | Label + input + error/help text | required-asterisk, error styling |
| `Button` | All button variants | variants: primary/secondary/ghost/danger/link |
| `Dialog` | Modal | radius=lg ALLOWED here only |
| `AlertDialog` | Destructive confirm | type-to-confirm pattern |
| `Slider` | Range input | numeric or stepped |
| `Toast` | Transient notice | success/info/warning/error |
| `Badge` | State label | sm radius |
| `Gate` | RBAC wrapper | `<Gate role={['Rxx']} fallback="hide">` |
| `Tooltip` | Hover help | 250ms delay default |
| `Tabs` | Tab navigation | underline style; not pill |
| `Select` | Dropdown | native or accessible custom |
| `Combobox` | Searchable select | for >7 options |
| `DataTable` | Tabular data | sortable, sticky header |
| `EmptyState` | "No data" surface | every list MUST handle |
| `LoadingState` | Skeleton or spinner | every async surface MUST handle |
| `ErrorBoundary` | Class component | catches render errors |
| `ModuleErrorFallback` | Module-level error.tsx body | per CLAUDE.md §17.0 |

Banned: locally redefining any of these. Import from `@<scope>/ui`
or fail review.

### 10.3 The pre-flight UI checklist (binding)

Every UI implementation prompt MUST include this verbatim. Past
experience: agents drift on these without it, even when CLAUDE.md is
cited.

```
PRE-FLIGHT UI CHECKLIST (run BEFORE writing any JSX)

1. Open <path-to-canonical-Card-and-Field>.tsx and import them.
   Do NOT redefine locally.
2. Use ONLY: text-xs / text-sm / text-base / text-lg / text-xl / text-2xl
   (and text-3xl/4xl ONLY for hero, max 2 levels per surface).
   FORBIDDEN: text-[NNpx], text-[NNrem]. Drift test will reject.
3. Use ONLY rounded-md (rounded-full for circular, rounded-sm for chips/badges,
   rounded-lg ONLY in Dialog/AlertDialog primitive).
   FORBIDDEN: arbitrary rounded values elsewhere.
4. Use the Gate primitive for RBAC: <Gate role={['Rxx']} fallback="hide">…</Gate>.
   FORBIDDEN: inline `{hasRank(...) && <button>…}` patterns in JSX.
5. i18n keys go to messages/<locale>.json AT THE ROOT.
   New module 'foo' creates a top-level "foo": { ... } object.
6. NO `useStore((s) => …)` selector that returns a fresh array/object
   literal. Filter in `useMemo` outside; module-level `EMPTY_*` constants.
7. Tap targets ≥44px mobile, ≥32px desktop. Focus rings ≥2px solid 3:1 contrast.
8. Empty/loading/error/success states all rendered. No silent CTAs.
9. Motion uses ONLY: ease.natural | ease.snappy; duration.micro/default/modal/page.
   Reduced-motion honored.
10. AFTER writing code, BEFORE returning: run all guardrail tests
    (ui-canon-drift, zustand-selector-anti-patterns, dead-button-detector,
    locale-completeness, i18n-key-resolution, error-boundaries).
    All must pass. NO new files added to baseline.
```

### 10.4 Design pipeline (per feature)

When a new feature with novel UI lands:

```
[before /spec]
  screen-designer (Sonnet) drafts hi-fi screens — exports to design/screens/
  HUMAN reviews; signs off OR iterates
  accessibility-reviewer (Sonnet) audits the design — flags WCAG issues
  visual-consistency-auditor (Sonnet) checks against D01 — flags drift

[during /spec]
  /spec references the locked screens via design/screens/<feature>/
  spec §9 UI surfaces cites screens by file + D01 primitive references

[during /implement]
  Pre-flight checklist enforced
  Storybook story per component; visual snapshot test if available

[before commit]
  visual-consistency-auditor runs against the implementation; reports drift
```

### 10.5 Multi-surface design directions

If your project has multiple surfaces (e.g., consumer-web,
staff-admin, internal-ops), D00 picks one direction per surface.
Common pairings:

- **Consumer / public** — emotional, image-led, trust-building
- **Staff operational** — dense, fast, keyboard-friendly
- **Admin / executive** — calm, summary-heavy, slow-moving

D01 inherits per-surface tokens via `[data-surface="consumer"]` /
`[data-surface="staff"]` / etc. Same primitive, different paint.

---

## 11. SEO track

Public-facing surfaces only. Internal tools should not rank.

### 11.1 K15 SEO Strategy mandatory content

(See §3.3 K15 spec.) Authored once during Phase 0 by
`seo-strategist` (Opus). Locked thereafter; reviewed quarterly.

### 11.2 Per-page SEO authoring

For every public route:

| Element | Source | Notes |
|---|---|---|
| `<title>` | per-page | ≤60 chars; primary keyword first; brand suffix |
| Meta description | per-page | ≤155 chars; CTA verb; primary keyword in first 100 |
| Canonical URL | auto | trailing-slash policy locked in K15 |
| OG tags | per-page | og:title/description/image (1200×630) |
| Twitter card | per-page | summary_large_image |
| Structured data | per-page | JSON-LD; Organization on every page; Product/Article/etc. per type |
| `<h1>` | per-page | exactly one; matches/extends title |
| Internal links | per-page | per K15 cluster strategy |

### 11.3 Technical SEO baseline (mandatory)

Wire during Phase 1 bootstrap:

- [ ] `sitemap.xml` auto-generated from routes; resubmitted on deploy
- [ ] `robots.txt` correct (allow public; disallow staff/admin)
- [ ] `<link rel="canonical">` on every public page
- [ ] `hreflang` if multilingual (per K15)
- [ ] Schema.org JSON-LD per page type
- [ ] OG image generation (Next.js OG / Vercel OG / equivalent)
- [ ] Core Web Vitals targets per K10 (LCP <2.5s, INP <200ms, CLS <0.1)
- [ ] Semantic HTML (nav/main/article/section/aside/footer)
- [ ] Proper heading hierarchy (h1 once; h2-h6 nested correctly)
- [ ] Alt text on every meaningful image; empty alt on decorative
- [ ] Lazy-loading below-the-fold images
- [ ] Preload hero image; preconnect to critical third-party origins

### 11.4 SEO auditor (recurring)

`seo-auditor` (Sonnet) runs:

- Per public-surface release
- Monthly site-wide
- Reports: title tag drift, missing meta descriptions, broken
  canonicals, CWV regressions, structured-data validation, internal
  linking coverage

Output: `specs/architecture/seo-audits/<date>-<surface>.md`

### 11.5 Content production (per K15 calendar)

`content-strategist` (Sonnet) drafts:
- Long-form articles per K15 pillars
- Landing pages for keyword clusters
- FAQ pages targeting long-tail queries

Each piece:
- Reviewed by `brand-voice-auditor` for tone consistency
- Reviewed by `seo-auditor` for keyword targeting
- Published with full per-page SEO authoring (§11.2)

---

## 12. Brand + content track

### 12.1 Brand voice (locked in K14)

`brand-voice-definer` (Opus) authors K14 during Phase 0. Mandatory
content:

- 3-5 voice attributes (e.g., "confident, plain-spoken, warm,
  technically precise, never glib")
- Tone modulation map per surface (formal vs casual)
- Banned phrases / overused words
- Persona-aware tone (B2B vs B2C; expert vs novice)
- Reference brands (3-5 we're inspired by, with WHY)

### 12.2 UX writer (per surface)

`ux-writer` (Sonnet) drafts:
- Empty states ("No deals yet — start one →")
- Error toasts ("Couldn't reach the server. Trying again in 5 seconds…")
- Confirmation dialog copy
- Onboarding microcopy
- Form labels + helper text

Every string lands via `next-intl` (or equivalent); never hardcoded.

### 12.3 Content authoring (per K15)

`content-strategist` (Sonnet) drafts long-form content per the K15
editorial calendar. Each piece:
- Targets a K15 keyword cluster
- Cites K14 brand voice
- Includes per-page SEO from §11.2
- Reviewed by `brand-voice-auditor` (Sonnet)

### 12.4 Brand voice auditor (recurring)

Per public-content release:
- Scans copy against K14 banned-phrases list
- Flags tone inconsistencies (e.g., overly casual on formal surface)
- Reports drift

Output: `specs/architecture/brand-audits/<date>-<surface>.md`

---

## 13. Code quality enforcement

### 13.1 Banned patterns

| Pattern | Why | Alternative |
|---|---|---|
| `text-[NNpx]` | breaks visual scale | `text-xs/sm/base/lg/xl/2xl` |
| `rounded-lg`/`xl`/`2xl` | breaks radius scale | `rounded-md` |
| Inline `{hasRank(user, 'R12') && …}` | RBAC scattered | `<Gate role={['R12']}>` |
| `useStore((s) => s.foo ?? [])` | infinite re-render | module-level `EMPTY` const |
| `useStore((s) => ({...}))` | infinite re-render | base-ref + useMemo outside |
| `useStore((s) => s.foo.filter(...))` | infinite re-render | base-ref + useMemo outside |
| `useStore((s) => s.selectXxx(...))` | infinite re-render (if filter inside) | base-ref + useMemo outside |
| Hooks AFTER `if (...) return …` | Rules of Hooks | hooks before all early returns |
| Hardcoded customer/data lists in UI | drift from store | read from store via selector |
| Silent `<button>` with no onClick | dead CTA, auto-reject | wire action OR explicit "coming soon" toast |
| PII in audit log payloads | leaks PII | log lengths/hashes/ids only |
| `useStore((s) => s)` (whole-state) | re-renders on every change | granular selector |
| Local `Card`/`Field` redefinitions | drift from primitives | import from `@<scope>/ui` |

### 13.2 Production-grade strings only

Stop reaching for "MVP" or "demo grade" without saying so. If you
cannot tick every box on the production-grade checklist (§17), the
code is not production-grade — say so explicitly.

### 13.3 TypeScript strictness

```jsonc
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "exactOptionalPropertyTypes": true,
  "isolatedModules": true,
  "verbatimModuleSyntax": true
}
```

`noUncheckedIndexedAccess` catches a huge class of bugs at compile
time. Worth the noise.

### 13.4 No `any` without a comment

```ts
// reason: third-party lib's types are wrong; PR upstream filed at <link>
const x = thing as any;
```

If you can't write the comment, you can't use `any`.

### 13.5 ESLint must include

```js
extends: [
  'eslint:recommended',
  'plugin:@typescript-eslint/recommended',
  'plugin:react/recommended',
  'plugin:react-hooks/recommended',  // catches Rules of Hooks violations
  'next/core-web-vitals',             // if Next.js
  'prettier',
],
rules: {
  'react-hooks/rules-of-hooks': 'error',     // hooks-after-early-return
  'react-hooks/exhaustive-deps': 'warn',
  '@typescript-eslint/consistent-type-imports': 'error',
}
```

`react-hooks/rules-of-hooks: 'error'` is non-negotiable — it catches
the "useMemo after early return" class of bug at lint time.

---

## 14. Drift-detection guardrail tests

The single most-important infrastructure investment. Every recurring
bug class becomes a test that scans the whole codebase.

### 14.1 The mandatory 6 tests

Wire during Phase 1 bootstrap with empty baselines.

#### `ui-canon-drift.test.ts`

Walks every `.tsx`/`.ts` under `app/` and `src/`. Catches:
- `text-[NNpx]` / `text-[NNrem]` (frozen baseline of pre-existing files)
- `rounded-lg`/`xl`/`2xl`/`3xl` (with baseline)
- New top-level i18n namespace mismatches

Baseline pattern: `const TEXT_PX_BASELINE = new Set([...])`. New
files outside the baseline that introduce violations fail the test.
Existing baseline can only SHRINK, never grow.

#### `i18n-key-resolution.test.ts`

Walks every `.tsx`/`.ts`. Extracts every `useTranslations('ns')` +
`t('key')` pair. Asserts each combined path resolves to a string in
the locale JSON. Frozen allowlist for missing-key tech debt; new
violations fail the test.

#### `locale-completeness.test.ts`

Walks every locale JSON. Asserts every leaf path in the primary
locale exists in every other locale (English fallback values are
acceptable; the KEY must exist).

#### `dead-button-detector.test.ts`

Walks every `.tsx`. Scans `<button>` and `<Button>` JSX for missing:
`onClick`, `type="submit"`, `formAction`, `disabled`, `aria-disabled`,
`{...spread}`, `asChild`. Frozen baseline of pre-existing dead
buttons. New ones fail CI.

#### `zustand-selector-anti-patterns.test.ts`

The single most-saved-our-bacon test. Walks every `.tsx`/`.ts`.
Catches:
- `useStore((s) => s.foo ?? [])` — fresh array literal
- `useStore((s) => s.foo ?? {})` — fresh object literal
- `useStore((s) => s.foo.filter(...))` (and `.map` / `.sort` /
  `.slice` / `.reverse` / `.concat` / `.flatMap` / `.flat` / `.reduce`)
- `useStore((s) => s.selectXxx(...))` where `selectXxx` likely filters
  internally (allowlist `*ById` since Record lookups are stable)

Each pattern returns a fresh reference per render → infinite re-render.

#### `error-boundaries.test.ts`

Walks `app/(shell)/<module>/`. Asserts every module dir has
`error.tsx` that imports + uses the canonical `ModuleErrorFallback`.
Also asserts:
- Shell-level `app/(shell)/error.tsx` exists.
- Global `app/global-error.tsx` exists and renders its own `<html>` + `<body>`.
- Every module `error.tsx` is marked `'use client'`.

### 14.2 Adding new guardrails

When you find yourself fixing the same class of bug twice: write a
test. The test should:

1. Walk the codebase (`apps/`, `src/`, `packages/`).
2. Use a regex pattern for the anti-pattern.
3. Maintain a **baseline** of pre-existing violations (frozen
   `Set<string>`).
4. Fail if the count grows.
5. Print a clear error message with file:line and the fix.

### 14.3 Quality gates per task

Every task must pass before commit:

```
□ pnpm typecheck           # zero errors
□ pnpm lint                # zero errors
□ pnpm test                # zero failures
□ All drift tests pass     # baselines shrink or stay; never grow
□ Spec drift check         # L-tags still honored
□ Visual check (UI tasks)  # screenshot + zero console errors
□ Build check              # production build succeeds
```

If ANY gate fails: stop, diagnose, fix, re-run. Only proceed when
green. Never commit on red.

---

## 15. Memory + cross-session continuity

### Three layers of memory

1. **`.claude/CLAUDE.md`** — global rules, never changes per session.
   Read at the start of every session.

2. **`.claude/agent-status.md`** — per-session shared state.
   Gitignored. Every spawned agent reads this before starting and
   writes to it at every checkpoint.

3. **`research/` (K-docs) and `specs/architecture/*.md`** — committed
   long-term knowledge. K-docs from Phase 0 are foundational;
   architecture specs evolve as the system grows.

4. **User-level memory** (e.g. `~/.claude/projects/<project>/memory/MEMORY.md`)
   — auto-managed by your tooling; never edit directly.

### `agent-status.md` format

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

### Crash recovery

If a spawned agent reports an API error, non-zero exit, or vanishes
without a completion summary:

1. **Audit the working tree.** `git status` + per-file diff. Identify
   partial writes.
2. **Run typecheck on every touched app.** Pre-existing errors should
   be unchanged; new errors are the crashed agent's fault.
3. **Run targeted tests** if the crashed agent was supposed to add tests.
4. **Decide:**
   - **Finish yourself** if the crashed agent was ≥80% done.
   - **Relaunch with full context** if the agent was <50% done.
     Pass the partial state explicitly.
   - **Revert and restart** only if partial state is incoherent (rare).
5. **Update `agent-status.md`** with `CRASHED → recovered` or
   `CRASHED → relaunched`.

Never silently absorb a crash.

### Pre-existing failure budget

`.claude/known-issues.md` tracks pre-existing failures that aren't
your problem to fix today.

```markdown
| KI-N | file:line | error summary | owner | ETA | blocker? |
```

Rules:
- Budget: ≤ 5 pre-existing failures across all apps.
- If more accumulate: dispatch a `/fix` agent before any new feature work.
- Every sub-agent report must explicitly state "introduced 0 new
  failures; N pre-existing remain (logged in known-issues.md)."

---

## 16. Commit discipline

### When to commit

- At every phase / module boundary. Never let uncommitted work span sessions.
- After every quality-gate pass (typecheck + tests green).
- Never commit half-finished agent output without auditing per §15 Crash recovery.

### Conventional-commit prefixes

```
feat(<module>):       new user-facing feature
fix(<module>):        bug fix
chore(<scope>):       housekeeping, no behavior change
docs(<scope>):        spec / readme / comment updates
refactor(<module>):   code restructure with no behavior change
test(<module>):       test-only additions
perf(<module>):       performance improvement
seo(<surface>):       SEO-specific changes (titles, schema, sitemap)
a11y(<scope>):        accessibility-specific changes
```

`<module>` is the domain (`vehicles`, `service`, `customers`, `auth`)
or `architecture` for cross-cutting work.

### Commit message body

- First line ≤ 72 chars, no period.
- Blank line, then body explaining **why** (the diff shows what).
- Cite spec L-tags / scenarios / K-doc references liberally.
- Co-author footer for agent-assisted work.

### Splitting commits

Aim for 30–80 files per commit; each commit is one of:

- types + mocks foundation
- one module's full slice (spec + UI + store + tests)
- cross-cutting infra (shell, primitives, deps)

A 1000-LoC monolithic commit is hard to review and impossible to
revert cleanly.

### Never

- Never `git add -A` or `git add .` (catches `.env` / build artifacts).
- Never amend a pushed commit.
- Never commit `tsconfig.tsbuildinfo` (add to `.gitignore`).
- Never bypass pre-commit hooks (`--no-verify`).

---

## 17. Production-grade checklist

```
□ Spec exists, approved, co-located
□ Empty / loading / error / success states present
□ Keyboard nav, focus rings ≥2px solid 3:1, AA contrast (AAA aspirational for body)
□ Mobile + tablet + desktop verified
□ Reduced-motion honored on every animation
□ Mocked data covers happy path + 2 edge cases
□ RBAC via Gate primitive — no inline hasRank in JSX
□ All user-visible strings via i18n
□ Storybook story for every component
□ Unit tests for new logic; ≥1 integration test per spec scenario
□ Reviewer signed off on the diff
□ Typecheck clean — zero errors
□ Lint clean — zero errors
□ No text-[NNpx], no rounded-lg/xl outside Dialog primitive
□ Card / Field / Dialog reused from canonical primitives
□ Hooks all called before any conditional return
□ Zustand selectors return base refs; computation in useMemo
□ Confirmation dialog on destructive actions
□ Type-to-confirm for permanent destruction
□ PII never in logs / toasts / error message bodies
□ Every CTA wired to a real action — silent no-ops auto-rejected
□ Spec is bumped + changelog updated if behavior changed
□ Visual-consistency-auditor signed off (no D01 drift)
□ For public surfaces: SEO author signed off + Core Web Vitals green
□ For UI changes: a11y-auditor signed off (WCAG 2.2 AA min)
□ Tap targets ≥44px mobile / ≥32px desktop
□ Brand-voice-auditor signed off (no tone drift) for public copy
```

### End-of-feature E2E gate

After all phases of a multi-phase implementation:

1. Run the full test suite (unit + integration).
2. Run E2E tests across critical user journeys (Playwright or equivalent).
3. If no E2E framework: manually verify via preview tools.
4. Run a final production build.
5. Run all 4 cross-cutting auditors (perf, a11y, SEO if public, security).
6. Report all metrics:

```
[E2E GATE] Final verification complete
  Unit tests: X passing, X failing
  Integration tests: X passing, X failing
  E2E tests: X passing, X failing (or "manual — all flows verified")
  Build: pass | fail
  Spec drift: none detected | [list of drifts]
  Visual: verified on mobile + desktop | [issues found]
  Performance: LCP <Xs, INP <Xms, CLS <X
  Accessibility: WCAG 2.2 AA pass | [issues]
  SEO (public): titles/meta/schema valid | [issues]
  Security: OWASP Top 10 mitigated | [issues]
```

---

## 18. Anti-patterns to avoid

A list of bugs we shipped at least once each. Do not repeat them.

### State management

- **Zustand selector returning a fresh ref.** `useStore((s) => s.foo ?? [])`,
  `useStore((s) => ({a, b}))`, `useStore((s) => s.foo.filter(…))`. All
  cause infinite re-render.
- **Store-side `selectXxx()` that filters.** Same fresh-ref problem.
- **Mutating store state in a render-time selector.** Don't.

### React

- **Hooks after early returns.** Rules of Hooks. ESLint catches if
  configured (`react-hooks/rules-of-hooks: 'error'`).
- **`useEffect` with `[obj]` where `obj` is a fresh ref each render.**
  Re-runs forever.
- **`<button>` with no onClick.** Auto-reject.

### Data shape

- **Same field on multiple aggregates with multiple writers.**
  Cross-aggregate consistency violation. Pick one writer.
- **Hardcoded test data (customer names, etc.) in UI.** Drift.
- **PII text in audit-log payloads.** Use `freeTextLength` or hash.

### Spec drift

- **Skipping wave-2 reviews.** Single biggest source of post-ship pain.
- **Promoting `in-build → approved` without all reviewers signed off.**
- **Deleting an L-tag.** Use the supersession protocol.
- **"We'll fix it later" without a tracked deferred item.**

### Process

- **Letting uncommitted work span sessions.** Lose context, lose work.
- **Committing on red gates.** Don't.
- **Mass-skipping pre-commit hooks.** They exist for a reason.
- **Trusting an agent's "I did it" without verifying.** Trust but verify.

### Performance

- **Bundling heavy deps in the client.** Use `dynamic()`.
- **Whole-state Zustand selectors.** Re-render on every change.
- **Loading entire variable-font families when only 4 weights are used.**
- **Loading large base64 dataUrls in localStorage.** Quota.

### UI

- **`text-[NNpx]` instead of canonical scale.**
- **`rounded-lg`/`xl` outside Dialog primitive.**
- **Inline `hasRank` in JSX.**
- **Local `Card` / `Field` redefinitions.**
- **Multiple typefaces from D01 mixed inside a single page-fold.**
- **Animation duration outside the locked 4 values.**
- **Tap target <44px on mobile.**

### Phase 0 / kickoff

- **Skipping K02 Business Model.** "We'll figure out monetization later"
  is how products ship without a viable model.
- **Skipping K12 RBAC matrix.** Every spec downstream assumes it. Build
  it once.
- **Skipping K07 Glossary.** Every domain term gets renamed at least
  once without it; refactors compound.
- **Letting the design direction stay open past D00 → D01.** Pick a
  direction. Lock it. Build.

### SEO / brand

- **Not setting Core Web Vitals targets in K10.** No targets, no
  enforcement.
- **Hardcoding marketing copy in components instead of CMS/i18n.**
  Marketing changes copy weekly; engineers shouldn't ship for that.
- **Same `<title>` on every page.** Auto-reject.
- **Brand voice drift in error toasts.** Run brand-voice-auditor on
  empty/error states too — they're the most-seen copy.

---

## 19. Operating rhythm + escalation

### Daily rhythm

1. Read `.claude/agent-status.md`.
2. Pick highest-priority work (use `specs/roadmap/next-themes.md`).
3. Dispatch agents per the pipeline.
4. Verify gates; commit; repeat.

### Weekly rhythm

1. Run drift audits on every shipped module (§14).
2. Run visual-consistency-auditor across all surfaces.
3. Sweep `.claude/known-issues.md`; fix items hitting the budget threshold (≤5).
4. Update `MEMORY.md` with significant outcomes.
5. Refresh `next-themes.md` with the next 4 themes ranked by leverage.

### Per-release rhythm (before tagging)

1. Run all 4 cross-cutting auditors (perf, a11y, SEO for public, security).
2. E2E gate (§17).
3. Tag the release; push to staging.
4. Monitor for 24 hours; if green, push to production.
5. Author a release-notes ChangeLog (via `changelog-author` agent).

### Escalation ladder

When stuck:

1. **Self-fix (max 2 attempts).** Try independently.
2. **Check context.** Read `agent-status.md` + recent commits.
3. **Report to orchestrator** with full error context.
4. **Escalate to user** with clear summary.

Format:

```
[ESCALATE] Could not resolve after 2 attempts.
  Tried:
    1. <first approach + result>
    2. <second approach + result>
  Root cause: <your analysis>
  Recommendation: <what user should do>
```

Never:
- Loop more than 2 times on the same error.
- Suppress errors to appear successful.
- Make assumptions about blocked permissions or missing config.

### Communication with the user

Surface every meaningful event:

```
[DEPLOYING] /spec → Writing capability spec for <module>
[PROGRESS] /implement — Task 3/7 complete: <description>
[BLOCKED] /implement — Task 4/7 stuck — Decision needed: <ask>
[HANDOFF] /spec complete → deploying /plan
[COMPLETE] All agents finished — summary
```

Never let agents run silently. Never hide problems.

---

## 20. Optional integrations

### 20.1 Linear (optional project management)

If using Linear, wire it as follows. **Optional** — if you don't use
Linear, ignore this section entirely.

#### Setup

- Project key per module (e.g., `SAL` for sales, `SVC` for service)
- Issue numbering matches `DEF-<MODULE>-N` from spec deferred items
- Webhooks → `.claude/linear-config.json` for agent reference

#### Mapping

| Spec artifact | Linear artifact |
|---|---|
| Spec module | Linear project |
| `DEF-<MODULE>-N` | Linear issue |
| L-tag | Linear issue label `L-tag/<id>` |
| Phase tag (P1/P2) | Linear cycle / milestone |
| Reviewer signoff | Linear PR comment + status |
| Drift audit finding | Linear issue tagged `drift-audit` |

#### Agent integration

The orchestrator can dispatch an `issue-sync` agent (Sonnet) that:
- Reads `specs/modules/*/§Deferred items` tables
- Creates / updates corresponding Linear issues
- Closes Linear issues when commits reference `Closes DEF-XXX-N`

#### When NOT to use

If your team is small (1-3 people) and you live in commits + specs +
roadmap, Linear adds friction without value. Skip until team scales.

### 20.2 Other optional integrations

- **Sentry** — error tracking (recommended once in production)
- **Posthog / Plausible** — product analytics (per K10 NFRs)
- **Vercel / Netlify / Cloudflare** — deployment (per K06)
- **Storybook** — visual regression (recommended for design-heavy projects)
- **Chromatic** — visual diff CI (paid; evaluate per project)

Each gets a one-paragraph note in K06 if used; full integration
contract in K11.

---

## 21. Templates

### `CLAUDE.md` skeleton

```markdown
# <Project> — Project-wide instructions (CLAUDE.md)

Read this file at the start of every session before opening any code.

## 1. What this product is
<one paragraph: what + who + why; cite K00>

## 2. Canonical documents — read before you act
<table of K-docs + D-docs + architecture specs with "when to read">

## 3. Stack & toolchain
<table: layer → choice; cite K06>

## 4. The MVP philosophy
<one paragraph on quality bar + how mocks fit>

## 5. Agent pipeline
<diagram + rules from §5 of this playbook>

## 6. Spec discipline
<reference §7 + the 21-section template + frontmatter shape>

## 7. Naming & language
<reference K07 glossary>

## 8. RBAC & data boundaries
<reference K12>

## 9. <Domain>-specific guardrails
<regulatory / compliance — cite K10, K13>

## 10. Definition of Done
<the production-grade checklist from §17>

## 11. Citation discipline
<cite K-docs / D-docs / specs by reference>

## 12. What not to do
<reference §18 anti-patterns>

## 13. When uncertain
<stop, ask the user>

## 14. Locked-decision (L-tag) protocol
<reference §8>

## 15. Spec lifecycle + phase tagging
<reference §7>

## 16. Spec-drift detection
<reference §8>

## 17. Production-grade checklist
<reference §17>

## 18. Crash recovery + agent handoff
<reference §15>

## 19. Commit discipline
<reference §16>

## 20. Memory file usage
<reference §15>

## 21. Pre-existing failure budget
<reference §15>

## 22. Deferred items registry
<reference §7>

## 23. Design system rules
<reference §10 + D01>

## 24. SEO + brand discipline (if public)
<reference §11 + §12>
```

### Spec template

See §7 for the 21-section list. Each section starts with a one-line
description; expand as the spec evolves.

### Plan template

```markdown
---
plan_id: PLAN-<MODULE>-NNN
title: <feature> — implementation plan
domain: <domain>
status: draft
risk_level: low | medium | high
pii_sensitivity: none | low | medium | high
related_research: <RESEARCH-ID>
extends_spec: <SPEC-ID> (or new sibling)
phase: P1 (MVP); P2 deferred
owners: [planner, integrator]
---

# PLAN-<MODULE>-NNN — <Feature>

## 1. Architecture decisions
<each with reasoning + alternatives rejected; mint L-tag candidates>

## 2. Field list (final)
<schema sketches>

## 3. UI layout spec (if UI-heavy)
<cite D01 primitives + locked screens at design/screens/>

## 4. Task breakdown
<numbered table: # | task | files | LoC | depends-on>

## 5. Risks + mitigations
<table>

## 6. Cross-module-wiring update
<seam numbers + descriptions>

## 7. Open questions for the integrator
<numbered list — needs human signoff>

## 8. Out of scope (Phase 2+)
<deferred items table: ID | item | priority | notes>

## L-tag summary
<table: Tag | Title | Source>
```

### Research template (per-feature)

```markdown
---
research_id: RESEARCH-<DOMAIN>-NNN
title: <topic>
date: <YYYY-MM-DD>
related_specs: [SPEC-IDs]
status: draft | complete
---

# <Topic> — research

1. Executive summary (5 bullets)
2. Industry prior art
3. Tooling / API landscape
4. Recommended approach
5. Workflow recommendation
6. Failure modes + mitigations
7. Compliance / regulatory angle
8. Recommended phased approach
9. Open questions for the planner
10. Sources
```

### Wave-2 review template

```markdown
# <SPEC-ID> — <reviewer> review

**Reviewer:** <security | finance | qa | accessibility>
**Date:** <YYYY-MM-DD>

## Concerns
<numbered — each: severity (P0/P1/P2/P3) + finding + spec section + recommendation>

## Blockers
<numbered — anything preventing in-review → approved>

## Open questions
<numbered>

## Signoff

signed-off: yes | no | with-concerns
acknowledged-by-integrator: pending
```

### K-doc templates

Each K-doc has its mandatory sections specified in §3.3. The
spec-conventions-author writes K16 which captures these as
project-specific templates.

### Drift audit prompt

```
You are doing a SPEC DRIFT AUDIT for module <X>. Research only —
DO NOT modify any files.

Spec: <path>
Code surface: <list of dirs>
Routes: <list>

For each L-tag in the spec, grep the code for evidence the decision
is honored or contradicted. For each scenario in §Scenarios, find
the matching implementation. For each store action in §Store contract,
verify it exists with the documented signature.

Output three sections:
1. Documented but NOT implemented (L-tag/scenario/action with no code)
2. Implemented but NOT documented (code with no spec reference)
3. Divergences (spec says X, code does Y; cite file:line)

End with: "Recommended doc updates" — top 5 items, prioritized.
```

### Cross-cutting auditor prompt (template)

```
You are the <perf | a11y | seo | security | brand-voice | visual-consistency> auditor.

Surface(s) under review: <list>
Reference docs: <K-docs / D01 / spec L-tags relevant to your audit lens>

Audit the surface(s) against the reference docs. Output:

## Findings (severity-ordered)
| # | Severity (P0/P1/P2/P3) | Finding | File:line | Recommendation |

## Pass list
What was checked and passed.

## Recommended fix waves
Wave 1 (P0+P1, must fix this release):
Wave 2 (P2, should fix next release):
Wave 3 (P3, polish):

## Signoff

signed-off: yes | no | with-concerns
```

---

## Appendix A — Why this works

This playbook is the codification of patterns we shipped under fire.
Each one paid for itself:

- **Specs caught a margin-scheme math error before it reached
  production.** A code-only build would have shipped wrong tax for
  every pre-owned vehicle sale. The wave-2 finance reviewer caught
  it during the spec phase.
- **L-tag protocol prevented an architecture pivot from breaking
  three downstream specs.** The 2D→3D visualizer change was an L-tag
  supersession; the marker made future maintainers see "this used to
  work differently" instantly.
- **Drift tests caught the same Zustand bug class three times in
  three different files.** After the test landed, the bug class
  hasn't appeared since.
- **Cross-aggregate consistency contract caught a VIN drift between
  the staff-side service module and the customer-facing storefront.**
- **Pre-flight UI checklist eliminated `text-[NNpx]` drift on
  greenfield code.** Before: every new module added 3-10 violations.
  After: zero.
- **Phase 0 K02 (Business Model) caught a pricing tier mismatch
  between the product roadmap and the revenue model** before any code
  was written. Fixing in K02 cost a day; fixing post-launch would
  have cost a month + a pricing migration.
- **D01 design system locked the type scale BEFORE any feature work.**
  No "what size should this be?" debates in 200+ component sessions.
- **Wave-2 accessibility-reviewer caught a focus-trap bug in the
  Dialog primitive that would have blocked screen-reader users
  entirely.** Caught during the design system spec phase.

The patterns scale. A team of one engineer + agents can ship a 1500
LoC feature with full review pipeline in a day. A team of three can
ship four modules in a week. The bottleneck stops being "did we
remember every check" and becomes "what should we build next."

---

## Appendix B — When to deviate

Every rule in this playbook has a real reason. But:

- **Genuinely greenfield exploration** (research spikes, prototypes
  for a stakeholder demo): you can skip the spec → review → integrator
  cycle. Mark commits `chore(spike):`. Throw the code away.
- **Hotfixes for production incidents**: ship the fix, then
  retroactively author the spec + post-mortem. Do NOT skip the
  retroactive doc — incidents that don't get documented happen again.
- **One-off scripts / data migrations**: a spec is overkill. A README
  explaining what the script does and how to re-run it is enough.
- **Solo founder, day 1, no users yet**: you can compress Phase 0 to
  a 1-day sprint with abbreviated K-docs. Don't skip them — but you
  don't need 8 pages on K01 if you have one stakeholder.

Beyond these four: write the spec. The cost is real but the
alternative is worse.

---

*Last updated: 2026-05-08*
*Maintained by: project orchestrator*
*Length: ~3,000 lines covering Phase 0 → Phase 2+ lifecycle, 48 agents, locked design system rules, and full SEO/brand/a11y/perf reviewer integration.*
