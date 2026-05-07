# Agentic Spec-Driven Autonomous Development — Playbook

A project-independent base for spinning up a new codebase that runs on
spec-first, agent-orchestrated, production-grade autonomous
development. Battle-tested over thousands of agent-hours; every section
is a pattern that paid for itself by catching a real regression or
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
2. [The agent pipeline](#2-the-agent-pipeline)
3. [Model routing](#3-model-routing)
4. [Spec discipline](#4-spec-discipline)
5. [Locked-decision (L-tag) protocol](#5-locked-decision-l-tag-protocol)
6. [Cross-aggregate consistency contract](#6-cross-aggregate-consistency-contract)
7. [Code quality enforcement](#7-code-quality-enforcement)
8. [Drift-detection guardrail tests](#8-drift-detection-guardrail-tests)
9. [Memory + cross-session continuity](#9-memory--cross-session-continuity)
10. [Commit discipline](#10-commit-discipline)
11. [Production-grade checklist](#11-production-grade-checklist)
12. [Bootstrap checklist for a new project](#12-bootstrap-checklist-for-a-new-project)
13. [Anti-patterns to avoid](#13-anti-patterns-to-avoid)
14. [Operating rhythm + escalation](#14-operating-rhythm--escalation)
15. [Templates](#15-templates)

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
   pipeline where security-reviewer, finance-reviewer, qa-planner, and
   code-reviewer run *blind to each other's output* surfaces real
   issues. Don't collapse the waves.

3. **Static enforcement beats discipline every time.** Every recurring
   bug class becomes a guardrail test. We caught the same Zustand
   infinite-loop pattern three times in three different files; the
   fourth was caught by a test that scans the whole codebase. Never
   rely on a person remembering the rule.

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
│   └── known-issues.md            # pre-existing failure budget
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
├── specs/
│   ├── modules/<domain>/          # capability specs (NN-<slug>.md per spec)
│   │   └── <domain>/01-<feature>.md
│   ├── architecture/              # cross-cutting reference docs
│   │   ├── canonical-ui-patterns.md       # SPEC-ARCH-UI-001 — UI primitives
│   │   ├── cross-module-wiring.md         # numbered seam registry
│   │   ├── fixture-coverage-audit.md      # data-source-of-truth audits
│   │   └── drift-audits/<date>-<module>.md
│   ├── plans/PLAN-<MODULE>-NNN.md         # implementation plans
│   ├── research/<date>-<topic>.md         # research outputs
│   └── roadmap/next-themes.md             # what's next, ranked by leverage
│
├── research/                      # external reference docs (PDFs, market data, regulatory)
│   └── 00-executive-summary.md (etc.)
│
├── design/                        # design direction(s), Figma/Stitch screenshots
│
└── README.md
```

### Why this layout

- **`specs/` is sacred.** It is the only folder where decisions are
  recorded. Code without a corresponding spec gets rejected at review.
- **`.claude/CLAUDE.md` is the only file agents need to read first.**
  Everything else is referenced from there. Make it the single
  on-ramp.
- **`packages/types`** holds Zod schemas. Both apps consume them.
  Schema drift between surfaces is impossible by construction.
- **Drift audits are kept**, not deleted. Trend over time matters.

---

## 2. The agent pipeline

The canonical flow for any non-trivial feature:

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

### Rules of the pipeline

1. **Never skip waves on production-bound work.** Skipping
   wave-2 reviews is the single biggest source of post-ship pain.

2. **Reviewers are independent.** Each wave-2 reviewer reads the spec
   in a fresh context, never sees the others' output. Their reports
   land as `<spec-name>.<reviewer>.review.md` next to the spec. The
   integrator is the only agent that merges findings.

3. **Each reviewer signs off `yes`, `no`, or `with-concerns`.** The
   spec cannot move from `in-review → approved` until every required
   reviewer has signed `yes` or `with-concerns + acknowledged-by-integrator: yes`.

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

### Agent prompt shape

Every agent dispatch follows this structure:

```
Context:     what the agent needs to know; cite docs by reference
Task:        single, crisp deliverable
Constraints: hard rules (spec L-tags, DoD items, NFRs, RBAC, regulatory)
Output:      exact format expected back
```

**Terse command-style prompts are banned.** They produce shallow,
generic work. A good prompt is 200–600 words with the agent's reading
list, the deliverable shape, and the quality gates it must pass.

### When NOT to use the pipeline

- Single-line typos
- Renaming a variable
- Adding a missing comma
- Answering a user question

For everything else, use the pipeline. The cost is real — a full
research → plan → spec → wave-2 → implement cycle is 3–6 hours of
agent time — but the cost of NOT using it (post-ship rework, security
holes, regulatory failures) is orders of magnitude higher.

---

## 3. Model routing

Default sub-agent model is **Sonnet**. Use **Opus** only for
genuinely-hard reasoning. Use **Haiku** for purely mechanical work.

### When to use Opus

- Spec drafting (the integrator pass especially)
- Wave-2 reviews on critical surfaces:
  - security-reviewer (auth, PII, encryption, compliance)
  - finance-reviewer (money, tax, refunds, journal entries)
- Complex multi-file debugging
- Writing this kind of cross-cutting design document
- Cross-aggregate consistency analysis

### When Sonnet is enough

- Implementation following an approved spec
- Writing tests from scenarios in the spec
- QA-planner reviews (structured rubric work)
- Research gathering (web search + summarisation)
- Refactoring within a single file with clear instructions
- Building UI from a Stitch/Figma screen
- Storybook stories
- API routes following established patterns
- Documentation, READMEs, inline comments

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

## 4. Spec discipline

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
docs_consulted: [list of canonical doc references]
effective_date: <YYYY-MM-DD>
---
```

1. **Summary** — 1 paragraph: what + why + who
2. **Locked decisions** — table (Tag/Title/Decision/Source); 3+ rows
3. **Routes** — every URL the spec adds or modifies
4. **Personas** — every role that interacts with this surface
5. **Data model** — Zod schemas, errors, enums
6. **State machine** — every legal transition + every illegal one
7. **Cross-module integration** — every seam (numbered registry)
8. **Cross-aggregate consistency contract** — see §6
9. **UI surfaces** — components + primitive citations
10. **Scenarios** (Given/When/Then) — minimum 12, often 18+
11. **Acceptance criteria** — falsifiable, references scenarios
12. **RBAC** — table per role
13. **DPDP / compliance** — privacy, regulatory, retention
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

## 5. Locked-decision (L-tag) protocol

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

## 6. Cross-aggregate consistency contract

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
| ... | | | |

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

### Why this matters

We've shipped several modules where the same VIN appeared on three
aggregates with three different writers. A typo on one became an
"orphaned" record everywhere else. The cross-aggregate contract makes
this class of bug impossible by construction.

---

## 7. Code quality enforcement

### The pre-flight UI checklist

Every UI implementation prompt MUST include this verbatim. Past
experience: agents drift on these without it, even when CLAUDE.md is
cited.

```
PRE-FLIGHT UI CHECKLIST (run BEFORE writing any JSX)

1. Open <path-to-canonical-Card-and-Field>.tsx and import them.
   Do NOT redefine locally.
2. Use ONLY: text-xs / text-sm / text-base / text-lg / text-xl / text-2xl.
   FORBIDDEN: text-[NNpx], text-[NNrem]. Drift test will reject.
3. Use ONLY rounded-md (rounded-full for circular).
   FORBIDDEN: rounded-lg, rounded-xl, rounded-2xl, rounded-3xl
   outside the Dialog/AlertDialog primitive itself.
4. Use the Gate primitive for RBAC: <Gate role={['Rxx']} fallback="hide">…</Gate>.
   FORBIDDEN: inline `{hasRank(...) && <button>…}` patterns in JSX.
5. i18n keys go to messages/<locale>.json AT THE ROOT.
   New module 'foo' creates a top-level "foo": { ... } object.
6. NO `useStore((s) => …)` selector that returns a fresh array/object
   literal. Filter in `useMemo` outside; module-level `EMPTY_*` constants.
7. AFTER writing code, BEFORE returning: run all guardrail tests.
```

### Banned patterns

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

### Production-grade strings only

Stop reaching for "MVP" or "demo grade" without saying so. If you
cannot tick every box on the production-grade checklist (§11), the
code is not production-grade — say so explicitly.

### TypeScript strictness

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

### No `any` without a comment

```ts
// reason: third-party lib's types are wrong; PR upstream filed at <link>
const x = thing as any;
```

If you can't write the comment, you can't use `any`.

---

## 8. Drift-detection guardrail tests

The single most-important infrastructure investment. Every recurring
bug class becomes a test that scans the whole codebase.

### Recommended initial set (≤ 1 day to set up; 30+ saved bugs)

#### `ui-canon-drift.test.ts`

Walks every `.tsx`/`.ts` under `app/` and `src/`. Catches:
- `text-[NNpx]` / `text-[NNrem]` (with a frozen baseline of pre-existing files)
- `rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-3xl` (with baseline)
- New top-level i18n namespace mismatches (e.g., `useTranslations('foo.…')` calls
  where `foo` doesn't exist as a top-level key in the locale JSON)

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
- `onClick`
- `type="submit"`
- `formAction`
- `disabled`
- `aria-disabled`
- `{...spread}` attribute
- `asChild` (for shadcn-style)

Frozen baseline of pre-existing dead buttons. New ones fail CI.

#### `zustand-selector-anti-patterns.test.ts`

The single most-saved-our-bacon test. Walks every `.tsx`/`.ts`.
Catches:
- `useStore((s) => s.foo ?? [])` — fresh array literal
- `useStore((s) => s.foo ?? {})` — fresh object literal
- `useStore((s) => s.foo.filter(...))` (and `.map` / `.sort` / `.slice` / `.reverse` / `.concat` / `.flatMap` / `.flat` / `.reduce`)
- `useStore((s) => s.selectXxx(...))` where `selectXxx` likely filters
  internally (allowlist `*ById` since Record lookups are stable)

Each pattern returns a fresh reference per render → infinite re-render.
We caught this exact bug class three times before adding the test;
zero times after.

#### `error-boundaries.test.ts`

Walks `app/(shell)/<module>/`. Asserts every module dir has
`error.tsx` that imports + uses the canonical `ModuleErrorFallback`.
Also asserts:
- Shell-level `app/(shell)/error.tsx` exists.
- Global `app/global-error.tsx` exists and renders its own `<html>` + `<body>`.
- Every module `error.tsx` is marked `'use client'`.

Without these, an error in one module crashes the whole app shell.

### Adding new guardrails

When you find yourself fixing the same class of bug twice: write a
test. The test should:

1. Walk the codebase (`apps/`, `src/`, `packages/`).
2. Use a regex pattern for the anti-pattern.
3. Maintain a **baseline** of pre-existing violations (frozen
   `Set<string>`).
4. Fail if the count grows.
5. Print a clear error message with file:line and the fix.

Example pattern (from `zustand-selector-anti-patterns.test.ts`):

```ts
const SELECTOR_FRESH_METHOD_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.[\w.]*\.(?:filter|map|sort|slice|reverse|concat|flatMap|flat|reduce)\s*\(/g;
```

### Quality gates per task

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

## 9. Memory + cross-session continuity

### Three layers of memory

1. **`.claude/CLAUDE.md`** — global rules, never changes per session.
   Read at the start of every session.

2. **`.claude/agent-status.md`** — per-session shared state.
   Gitignored. Every spawned agent reads this before starting and
   writes to it at every checkpoint.

3. **`specs/architecture/*.md`** — committed architecture knowledge.
   Updated when the architectural fact changes — drift audits,
   cross-module seams, canonical patterns.

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
     Pass the partial state explicitly: "the prior agent crashed at
     step N; files X, Y, Z exist with content <summary>; finish steps
     N+1 onwards."
   - **Revert and restart** only if partial state is incoherent (rare).
5. **Update `agent-status.md`** with `CRASHED → recovered` or
   `CRASHED → relaunched`.

Never silently absorb a crash.

### Pre-existing failure budget

`.claude/known-issues.md` tracks pre-existing failures that aren't
your problem to fix today. Format:

```markdown
| KI-N | file:line | error summary | owner | ETA | blocker? |
```

Rules:
- Budget: ≤ 5 pre-existing failures across all apps.
- If more accumulate: dispatch a `/fix` agent before any new feature work.
- Every sub-agent report must explicitly state "introduced 0 new
  failures; N pre-existing remain (logged in known-issues.md)."

---

## 10. Commit discipline

### When to commit

- At every phase / module boundary. Never let uncommitted work span sessions.
- After every quality-gate pass (typecheck + tests green). Failed-gate
  work stays uncommitted while the fix is in flight.
- Never commit half-finished agent output without auditing per §Crash recovery.

### Conventional-commit prefixes

```
feat(<module>):       new user-facing feature
fix(<module>):        bug fix
chore(<scope>):       housekeeping, no behavior change
docs(<scope>):        spec / readme / comment updates
refactor(<module>):   code restructure with no behavior change
test(<module>):       test-only additions
perf(<module>):       performance improvement
```

`<module>` is the domain (`vehicles`, `service`, `customers`, `auth`)
or `architecture` for cross-cutting work.

### Commit message body

- First line ≤ 72 chars, no period.
- Blank line, then body explaining **why** (the diff shows what).
- Cite spec L-tags / scenarios / doc references liberally.
- Co-author footer for agent-assisted work.

### Splitting commits

Aim for 30–80 files per commit; each commit is one of:

- types + mocks foundation
- one module's full slice (spec + UI + store + tests)
- cross-cutting infra (shell, primitives, deps)

A 1000-LoC monolithic commit is hard to review and impossible to
revert cleanly. A 4-commit batch covering the same work is reviewable.

### Never

- Never `git add -A` or `git add .` (catches `.env` / build artifacts).
- Never amend a pushed commit.
- Never commit `tsconfig.tsbuildinfo` (add to `.gitignore`).
- Never bypass pre-commit hooks (`--no-verify`).

---

## 11. Production-grade checklist

"Production grade" is vague. Use this concrete rubric. If you cannot
tick every box, say "MVP grade" or "demo grade" instead.

```
□ Spec exists, approved, co-located
□ Empty / loading / error / success states present
□ Keyboard nav, focus rings, AA contrast (AAA for body), reduced-motion
□ Mobile + tablet + desktop verified
□ Mocked data covers happy path + 2 edge cases
□ RBAC via Gate primitive — no inline hasRank in JSX
□ All user-visible strings via i18n
□ Storybook story for every component
□ Unit tests for new logic; ≥1 integration test per spec scenario
□ Reviewer signed off on the diff
□ Typecheck clean — zero errors
□ Lint clean — zero errors (warnings acceptable if pre-existing)
□ No text-[NNpx], no rounded-lg/xl outside approved exceptions
□ Card / Field / Dialog reused from canonical primitives
□ Hooks all called before any conditional return
□ Zustand selectors return base refs; computation in useMemo
□ Confirmation dialog on destructive actions
□ Type-to-confirm for permanent destruction (delete, anonymize, force-revoke)
□ PII never in logs / toasts / error message bodies
□ Every CTA wired to a real action — silent no-ops auto-rejected
□ Spec is bumped + changelog updated if behavior changed
```

### End-of-feature E2E gate

After all phases of a multi-phase implementation:

1. Run the full test suite (unit + integration).
2. Run E2E tests across critical user journeys (Playwright or equivalent).
3. If no E2E framework: manually verify via preview tools (navigate
   the complete journey, test happy path + key error paths, test
   across viewports if UI changed).
4. Run a final production build.
5. Report all metrics:

```
[E2E GATE] Final verification complete
  Unit tests: X passing, X failing
  Integration tests: X passing, X failing
  E2E tests: X passing, X failing (or "manual — all flows verified")
  Build: pass | fail
  Spec drift: none detected | [list of drifts]
  Visual: verified on mobile + desktop | [issues found]
```

---

## 12. Bootstrap checklist for a new project

Day 1 (≤ 4 hours):

- [ ] `pnpm init` monorepo with `pnpm-workspace.yaml`.
- [ ] Set up Turbo (`turbo.json`) for caching task runs.
- [ ] Create the repo skeleton from §1.
- [ ] Author `.claude/CLAUDE.md` from §15 template.
- [ ] Write the project's North Star doc: `research/00-executive-summary.md`.
  - What is this product?
  - Who uses it?
  - What are the regulatory / compliance constraints?
  - What are the surface(s)? (web, mobile, internal tool)
- [ ] Define the Role / Permission Matrix: `research/14-role-permission-matrix.md`.
- [ ] Initialize `packages/types`, `packages/tokens`, `packages/ui`,
  `packages/mocks`, `packages/config-eslint`, `packages/config-tailwind`.
- [ ] Wire up TypeScript strict mode + `noUncheckedIndexedAccess`.

Day 2-3:

- [ ] Stand up the first surface app with shell + auth stubs.
- [ ] Implement the canonical UI primitives (Card, Field, Button,
  Dialog, Slider, Gate, Toast, ErrorBoundary, ModuleErrorFallback).
- [ ] Author `specs/architecture/canonical-ui-patterns.md` (the UI
  spec — primitives + radius rules + typography rules + spacing).
- [ ] Author `specs/architecture/cross-module-wiring.md` (empty
  registry; will fill as features ship).
- [ ] Wire up the 6 drift-detection guardrail tests from §8 with
  empty baselines.
- [ ] Set up `next-intl` (or equivalent) with primary + fallback locales.
- [ ] Wire up MSW for mocked data.

Day 4 onwards:

- [ ] First capability spec via the full pipeline (research → plan →
  spec → reviews → integrator → implement → tests → review).
- [ ] Set up a `specs/roadmap/next-themes.md` ranking the next 4 themes.
- [ ] Establish the commit cadence (every phase boundary).

The point of the bootstrap is to land the infrastructure that makes
everything afterwards FAST. Skipping any of these compounds for
months.

---

## 13. Anti-patterns to avoid

A list of bugs we shipped at least once each. Do not repeat them.

### State management

- **Zustand selector returning a fresh ref.** `useStore((s) => s.foo ?? [])`,
  `useStore((s) => ({a, b}))`, `useStore((s) => s.foo.filter(…))`. All
  cause infinite re-render. Caught by the guardrail test now.
- **Store-side `selectXxx()` that filters.** Looks safe but isn't —
  same fresh-ref problem. Pull base ref via the hook; filter in
  `useMemo` outside.
- **Mutating store state in a render-time selector.** Don't.

### React

- **Hooks after early returns.** Rules of Hooks. ESLint catches if
  configured (`react-hooks/rules-of-hooks: 'error'`).
- **`useEffect` with `[obj]` where `obj` is a fresh ref each render.**
  Re-runs forever.
- **`<button>` with no onClick.** Auto-reject; wire an action or
  show explicit "coming soon".

### Data shape

- **Same field on multiple aggregates with multiple writers.**
  Cross-aggregate consistency violation. Pick one writer; everyone
  else reads via selector.
- **Hardcoded test data (customer names, VINs) in UI.** Drift from
  the actual store. Read from `useStore((s) => s.customers)`.
- **PII text in audit-log payloads.** Use `freeTextLength` or hash;
  never the raw text.

### Spec drift

- **Skipping wave-2 reviews.** Single biggest source of post-ship pain.
- **Promoting `in-build → approved` without all reviewers signed off.**
- **Deleting an L-tag.** Use the supersession protocol.
- **Saying "we'll fix it later" without a tracked deferred item.**

### Process

- **Letting uncommitted work span sessions.** Lose context, lose work.
- **Committing on red gates.** Don't.
- **Mass-skipping pre-commit hooks.** They exist for a reason.
- **Trusting an agent's "I did it" without verifying.** Trust but
  verify.

### Performance

- **Bundling heavy deps in the client.** Use `dynamic(() => import(...), { ssr: false })`.
- **Whole-state Zustand selectors.** `useStore((s) => s)` re-renders
  on every change.
- **Loading entire variable-font families when only 4 weights are used.**
  Pin `weight: ['400', '500', '600', '700']`.
- **Loading large base64 dataUrls in localStorage.** Quota.

### UI

- **`text-[NNpx]` instead of the canonical scale.** Drift test catches.
- **`rounded-lg`/`xl` outside Dialog primitive.** Drift test catches.
- **Inline `hasRank` in JSX.** Use Gate primitive.
- **Local `Card` / `Field` redefinitions.** Import from canonical.

---

## 14. Operating rhythm + escalation

### Daily rhythm

1. Read `.claude/agent-status.md`.
2. Pick highest-priority work (use `specs/roadmap/next-themes.md`).
3. Dispatch agents per the pipeline.
4. Verify gates; commit; repeat.

### Weekly rhythm

1. Run drift audits on every shipped module (§8).
2. Sweep `.claude/known-issues.md`; fix any items that hit the
   pre-existing budget threshold (≤ 5).
3. Update `MEMORY.md` with significant outcomes.
4. Refresh `next-themes.md` with the next 4 themes ranked by leverage.

### Escalation ladder

When stuck:

1. **Self-fix (max 2 attempts).** Try independently.
2. **Check context.** Read `agent-status.md` + recent commits.
3. **Report to orchestrator** with full error context.
4. **Escalate to user** with clear summary: what was tried, what
   failed, what's needed.

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
  Why: <reason>
  Expected output: <what>

[PROGRESS] /implement — Task 3/7 complete: <description>
  Files changed: <list>
  Next: <what>

[BLOCKED] /implement — Task 4/7 stuck
  Problem: <issue>
  What I tried: <attempt>
  Decision needed: <ask>
  Options: A | B | C with tradeoffs

[HANDOFF] /spec complete → deploying /plan
  Spec produced: <summary>
  Plan will cover: <focus>

[COMPLETE] All agents finished
  What was built: <summary>
  Files changed: <count>
  Tests: <passing/failing>
  Open items: <list>
```

Never let agents run silently. Never hide problems.

---

## 15. Templates

### `CLAUDE.md` skeleton

```markdown
# <Project> — Project-wide instructions (CLAUDE.md)

Read this file at the start of every session before opening any code.

## 1. What this product is
<one paragraph: what + who + why>

## 2. Canonical documents — read before you act
<table of doc references with "when to read" column>

## 3. Stack & toolchain
<table: layer → choice>

## 4. The MVP philosophy
<one paragraph on quality bar + how mocks fit>

## 5. Agent pipeline
<diagram + rules from §2 of this playbook>

## 6. Spec discipline
<reference §4 + the 21-section template + frontmatter shape>

## 7. Naming & language
<reference glossary doc + naming conventions>

## 8. RBAC & data boundaries
<reference role-permission matrix>

## 9. <Domain>-specific guardrails
<regulatory / compliance — DPDP, GST, HIPAA, SOC2, etc.>

## 10. Definition of Done
<the 15-item checklist>

## 11. Citation discipline
<cite docs by reference>

## 12. What not to do
<reference §13 anti-patterns>

## 13. When uncertain
<stop, ask the user>

## 14. Locked-decision (L-tag) protocol
<reference §5>

## 15. Spec lifecycle + phase tagging
<reference §4>

## 16. Spec-drift detection
<reference §5>

## 17. Production-grade checklist
<reference §11>

## 18. Crash recovery + agent handoff
<reference §9>

## 19. Commit discipline
<reference §10>

## 20. Memory file usage
<reference §9>

## 21. Pre-existing failure budget
<reference §9>

## 22. Deferred items registry
<reference §4>
```

### Spec template

See §4 for the 21-section list. Each section starts with a one-line
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

## 3. PDF/UI layout spec (if UI-heavy)

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

### Research template

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

**Reviewer:** <security | finance | qa>
**Date:** <YYYY-MM-DD>

## Concerns
<numbered list — each: severity (P0/P1/P2/P3) + finding + spec section + recommendation>

## Blockers
<numbered list — anything preventing in-review → approved>

## Open questions
<numbered list>

## Signoff

signed-off: yes | no | with-concerns
acknowledged-by-integrator: pending
```

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
  Without the §8 contract, the bug would have shipped as "customer
  sees wrong VIN on their service receipt."
- **Pre-flight UI checklist eliminated `text-[NNpx]` drift on
  greenfield code.** Before the checklist: every new module added
  3-10 violations. After: zero new violations.

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

Beyond these three: write the spec. The cost is real but the
alternative is worse.

---

*Last updated: 2026-05-08*
*Maintained by: project orchestrator*
