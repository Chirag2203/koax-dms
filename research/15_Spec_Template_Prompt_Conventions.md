# 15 · Spec Template & Prompt Conventions

Meta-document. Defines the standard feature-spec template and prompt conventions for downstream agent-driven spec generation and code generation. Every feature spec we produce from this point forward must follow this template verbatim. Every prompt that orchestrates agents (planner → spec → code → review) must follow the conventions in §4.

---

## 1. Why a fixed spec template

We are using a multi-agent pipeline: a planner agent proposes; specialist agents (domain, security, data, UX, QA) critique; an integrator agent consolidates; a coder agent implements; a reviewer agent verifies. Agents cannot reliably cross-check each other unless the artifact they exchange — the spec — is in a predictable, machine-readable shape.

The template below is that contract. It is written so that:
- Specs are self-contained: a coder agent can implement a feature from the spec + research pack alone.
- Specs are testable: every acceptance criterion maps to a test.
- Specs are reviewable: every risk/compliance/perf axis has a named section so reviewers can do targeted passes.
- Specs are composable: cross-cutting references (to Docs 09–14) are by ID, not restated.

---

## 2. Spec file location & naming

Feature specs live under `/dms/specs/` in this repo. Each spec is its own markdown file.

Naming: `NN-domain-feature-slug.md`

Where:
- `NN` is a monotonically increasing two-digit index within the domain.
- `domain` is one of: `identity`, `customers`, `inventory`, `sales`, `service`, `parts`, `finance`, `notifications`, `integrations`, `reporting`, `audit`, `platform`, `storefront`, `customer-portal`, `consignor-portal`.
- `feature-slug` is kebab-case, ≤6 words.

Example: `specs/sales/03-lead-capture-whatsapp-intake.md`

Each spec gets an auto-assigned spec ID: `SPEC-<DOMAIN>-NNN` (three-digit global). The ID, not the filename, is used in cross-references.

---

## 3. The spec template

Every spec must contain the following sections in this order. Sections marked **Required** cannot be empty; sections marked **Conditional** are required only when the feature touches that concern.

```markdown
---
spec_id: SPEC-SALES-012
title: <short title>
domain: sales
status: draft | review | approved | in-build | shipped | deprecated
owner: <product owner name>
engineering_owner: <eng lead name>
version: 1.0
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
supersedes: <spec_id | null>
related_specs: [SPEC-CUSTOMERS-004, SPEC-NOTIFICATIONS-002]
research_refs: [Doc 04 §3.2, Doc 11 §1 (Lead SM), Doc 14 §6]
flags: [v1.0 | v1.5 | v2.0]
risk_level: low | medium | high
pii_sensitivity: none | low | medium | high
---

# 1. Problem statement (Required)
What user problem or business problem does this feature solve? 2–5 sentences.
Anchor in real behavior from research or user interviews; not "we want to build X".

# 2. Goals and non-goals (Required)
## Goals
- Bullet list of outcomes this feature delivers. Outcome-oriented, not output-oriented.
## Non-goals
- Bullet list of adjacent scope explicitly out of scope. Avoids scope creep during build.

# 3. Users and roles affected (Required)
Reference roles from Doc 14 by Role ID.
- R05 Sales Executive — primary actor
- R04 Sales Manager — oversight/approval
- R20 Customer — secondary actor
Describe the change to each role's day-to-day if any.

# 4. User stories / jobs-to-be-done (Required)
Gherkin-style or JTBD. Minimum 3, typically 5–10.

Story S1: As a <role>, I want to <action>, so that <outcome>.

Acceptance criteria:
- Given <context>, when <action>, then <observable result>.

Each story has a unique ID (S1, S2, ...) — tests reference these IDs.

# 5. Domain model changes (Conditional — required if entities change)
Reference Doc 10. For every entity added/changed:
- Entity name
- Fields added/removed/changed (with types)
- Aggregate boundary impact
- Invariants added
If adding a new entity, include a small ER diagram (mermaid) and note aggregate root.

# 6. State machine changes (Conditional — required if any state machine changes)
Reference Doc 11. For every transition added/changed:
- Machine name
- Transition ID (new or modified)
- From → To
- Trigger, Guard, Side effects
If a new machine, include the full states/transitions table per Doc 11 format.

# 7. API contracts (Required)
REST/GraphQL endpoints added or changed. For each:
- Method + path
- Purpose
- Auth (which roles from Doc 14)
- Request schema (JSON)
- Response schema (JSON)
- Error codes + meanings
- Idempotency strategy (if mutating)
- Rate limits

For webhooks consumed: reference Doc 13 sheet # and event name.

# 8. UI/UX outline (Conditional — required if UI-visible)
- Primary screen(s): what the user sees, key affordances
- Empty states, error states, loading states
- Responsive / mobile considerations
- Accessibility notes (WCAG 2.1 AA per NFR-U-01)
- Copy tone (UX Copy skill if used)
- Wireframe/mock link (Figma URL)

# 9. Notifications (Conditional — required if external comms triggered)
Reference Doc 13 sheets 2, 10, 13 as applicable.
For each notification:
- Template ID (WhatsApp/SMS DLT/email)
- Trigger event
- Recipient (by role)
- Variables
- Consent requirement
- Fallback channel

# 10. Integrations (Conditional — required if touches third-party)
Reference Doc 13. For each integration:
- Sheet # + endpoint/event ID
- New fields captured/sent
- Auth scope needed
- Failure fallback

# 11. Data & analytics (Required)
- Events to emit to analytics (name, properties)
- Dashboards / KPIs affected
- New columns in reporting views (if any)

# 12. Permissions & RBAC (Required)
Reference Doc 14.
- New permissions introduced (with Role IDs allowed)
- RLS predicate changes (if any)
- Sensitive actions added (require reason? see Doc 14 §28)

# 13. Privacy & compliance (Required)
- PII fields introduced (name each)
- Purpose binding (what purposes authorize processing)
- Consent requirement (new ConsentEvent purpose? or existing?)
- Retention policy impact
- DPDP DSR impact (does this change what's returned in access/erasure?)
- GST/Tax impact (if finance-touching)
- DLT impact (if SMS template needed)
- Legal/DPO review required? (yes/no + why)

# 14. Non-functional requirements (Required)
Reference Doc 12 NFR IDs. Call out any this feature must specifically meet beyond the global baseline:
- Performance targets (e.g., NFR-P-04)
- Availability (NFR-A-##)
- Security (NFR-S-##)
Any feature-specific NFR should be added here (not in Doc 12 — that's only for cross-cutting).

# 15. Failure modes & edge cases (Required)
Exhaustive list. For each:
- What can go wrong
- Detection (log/metric/alert)
- Recovery (automatic/manual)
- User-facing message

Minimum 5 entries. If you can't find 5, you haven't thought hard enough.

# 16. Migration & rollout (Required)
- Database migration plan (if schema change): forward + rollback
- Backfill plan
- Feature flag name + rollout stages (canary → outlet 1 → all outlets)
- Sunset of old path (if replacing)
- Training needed for staff

# 17. Test plan (Required)
- Unit test coverage targets
- Integration tests (which integrations stubbed vs live-sandbox)
- End-to-end scenarios (reference user stories S#)
- Load tests (if NFR-P or NFR-C impacted)
- Security tests (authz bypass attempts, injection)
- Accessibility tests (NFR-U-01)
- UAT scenarios + who runs them

# 18. Open questions (Conditional — required during draft state)
Bulleted list. Each must have:
- Question
- Who can answer
- Decision due by (date)
- Default if undecided

Zero open questions before status = approved.

# 19. Dependencies (Required)
- Other specs that must ship first
- External vendor actions (e.g., Meta template approval)
- Infra readiness (e.g., new queue topic)
- Hiring / training

# 20. Rollback plan (Required for high-risk)
How do we turn this off if prod is burning?
- Feature flag kill switch
- Data cleanup script (if partial writes)
- Customer comms if visible impact

# 21. Changelog (Required, growing)
| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-15 | 0.1 | Chirag | Initial draft |
```

---

## 4. Prompt conventions (multi-agent pipeline)

Specs and code are generated through a predictable agent pipeline. Every prompt we author follows the conventions below. This is not about cleverness — it is about making agents auditable and composable.

### 4.1 Canonical agent roster

| Agent | Role | Reads | Produces |
|---|---|---|---|
| `planner` | Breaks feature into spec outline + sub-agents to recruit | Docs 00–14 + request | Spec outline + agent plan |
| `domain-expert` | DDD + state machine + invariants | Docs 09, 10, 11 + outline | Domain model delta |
| `data-architect` | Storage, indexes, migration | Doc 10, 12 + delta | Data design |
| `api-designer` | REST/GraphQL contracts | Doc 07, 10, 14 | API spec |
| `ux-writer` | Copy + flows + a11y | UX Copy / Design Critique skills | UI/UX section |
| `security-reviewer` | RBAC, RLS, PII, DPDP | Doc 12, 13, 14 | Security review + amendments |
| `finance-reviewer` | GST/TCS/IRN correctness | Doc 06, 12, 13 | Finance review (if finance-touching) |
| `qa-planner` | Tests, edge cases, load | Doc 12, spec | Test plan |
| `integrator` | Merges agent outputs into spec | All sub-agent outputs | Final spec |
| `coder` | Implements approved spec | Spec + codebase | Code + migrations + tests |
| `code-reviewer` | Cross-checks code against spec | Spec + diff | Review comments + approval |

Agents are recruited via the Task tool as parallel sub-agents per the user's preference (iterative cross-review before commit).

### 4.2 Prompt shape (all agents)

Every agent prompt has four sections in this exact order:

```
## Context
<who you are, what pack docs you have, what spec you are working on>

## Task
<one clear directive, outcome-oriented>

## Constraints
<must-nots, citations to Docs 09–14 by ID, quality bars>

## Output format
<exact schema the integrator expects — usually a markdown fragment for one spec section>
```

### 4.3 Citation discipline

- Reference research pack by doc + section: `Doc 11 §1 (Lead SM) transition L6`.
- Reference permissions by role ID: `R05`.
- Reference integrations by sheet: `Doc 13 sheet 3 (IRP) endpoint einvoice/generate`.
- Reference NFRs by ID: `NFR-P-04`.
- Never reword these — copy-paste only. If an agent needs to disagree, it raises a delta in a Concerns block, does not silently reword.

### 4.4 Disagreement protocol

When agent B disagrees with agent A's output, B writes:

```
## Concerns
- Concern: <what is wrong>
- Evidence: <citation Doc X §Y or new finding>
- Proposed fix: <concrete amendment>
- Blocker? (yes/no)
```

The `integrator` is responsible for resolving every Concerns block before the spec moves to `status = review`. Unresolved blockers stop the pipeline.

### 4.5 Definition of done per agent

Each agent's output must include a `## DoD` block that checks the agent's own outputs:

```
## DoD
- [ ] All citations verified against source docs
- [ ] No reserved vocabulary violations (Doc 09 §reserved)
- [ ] Spec sections I own are complete
- [ ] Open questions captured in §18
```

The `integrator` rejects agent outputs missing a DoD block.

### 4.6 Parallelism rules

- Per the user's preference, domain-expert / data-architect / api-designer / ux-writer run in parallel on the same planner outline.
- `security-reviewer`, `finance-reviewer`, `qa-planner` run in a second wave after first-wave outputs merge.
- `integrator` runs serially, last.
- `coder` does not start until `status = approved` on the spec.
- `code-reviewer` runs parallel to `coder` finishing — reviewing as commits land, not at PR end.

### 4.7 Context budget discipline

Agents must not re-read the entire research pack on every task. Planner pre-selects the minimal doc set per spec (usually 3–5 docs) and passes doc excerpts (not full docs) to sub-agents. Full-doc reads are reserved for authoritative lookup of a specific section.

### 4.8 Never-do list (prompt-level)

Agents are instructed never to:
- Invent entities/fields not in Doc 10 without raising a Concern
- Invent new state transitions without raising a Concern against Doc 11
- Invent permissions without referencing Doc 14
- Use integrations not in Doc 13 without raising a Concern
- Remove PII protections to simplify an implementation
- Skip the Concerns protocol to "move faster"
- Mark a spec approved while open questions exist

---

## 5. Planner prompt skeleton

The planner agent is the entry point. Its prompt shape:

```
## Context
You are the planner in the DMS spec pipeline. Research pack docs 00–14 are available at /dms/research/. Current codebase is at /dms/src/. User has requested: "<feature request>".

## Task
Produce (a) a draft outline of the spec using the template at Doc 15 §3, and (b) an agent recruitment plan listing which sub-agents to run in parallel and what each should receive as input.

## Constraints
- Use Doc 15 §3 template verbatim.
- Cite research doc sections for every sub-agent's inputs.
- If the feature touches finance, include finance-reviewer; if PII, include security-reviewer with DPDP scope.
- Flag open questions clearly; do not invent answers.
- No code.

## Output format
### Spec outline
(markdown: frontmatter + section headers + 1-line hooks for what goes in each)

### Recruitment plan
| Wave | Agent | Input | Expected output section(s) |
```

---

## 6. Integrator prompt skeleton

```
## Context
You are the integrator. Sub-agent outputs for SPEC-<ID> follow. The approved spec template is Doc 15 §3.

## Task
Merge sub-agent outputs into a single spec file following Doc 15 §3. Resolve every Concerns block — either accept the proposed fix (cite why) or reject with a counter (cite why). Preserve citations exactly.

## Constraints
- Do not introduce content that is not supported by a sub-agent's output or research pack.
- Every Concerns block must be resolved with evidence.
- Final spec must pass the Doc 15 §7 checklist before you output it.

## Output format
The full spec as a single markdown file ready to save at the path per Doc 15 §2.
Followed by:

### Resolution log
| Concern source | Concern | Resolution | Evidence |
```

---

## 7. Spec review checklist (human + reviewer-agent gate)

Before a spec moves from `review → approved`, this checklist must pass:

- [ ] Frontmatter complete (all fields)
- [ ] All 21 sections present (or Conditional sections correctly omitted with justification)
- [ ] Zero open questions in §18
- [ ] Every citation resolvable (Docs 09–14 sections exist as cited)
- [ ] Every user story (§4) has at least one mapped test (§17)
- [ ] Every new permission (§12) has a Doc 14 patch filed
- [ ] Every new state transition (§6) has a Doc 11 patch filed
- [ ] Every new entity (§5) has a Doc 10 patch filed
- [ ] PII touches (§13) reviewed by DPO if pii_sensitivity ≥ medium
- [ ] Finance touches (§10/§13) reviewed by Finance Head if finance impact
- [ ] Rollback plan (§20) present if risk_level = high
- [ ] Migration + feature-flag plan (§16) present
- [ ] Dependencies (§19) listed and scheduled

Any unchecked item blocks approval.

---

## 8. Code generation conventions

Once a spec is approved, the coder agent implements. Conventions:

- Branch name: `feat/<spec-id>-<short-slug>` (e.g., `feat/SPEC-SALES-012-whatsapp-lead-intake`)
- One PR per spec (unless spec explicitly decomposed)
- PR description auto-generated: copy of spec §1, §2, §4 + checklist linking §17 tests
- Commit messages cite spec ID: `[SPEC-SALES-012] add lead capture webhook handler`
- Tests colocated with code; test file names mirror story IDs where feasible
- Migrations numbered + named after spec: `20260415_SPEC-SALES-012_lead_capture.sql`
- Feature flag named after spec slug: `feat_spec_sales_012_whatsapp_lead_intake`

---

## 9. Review-agent conventions

The `code-reviewer` agent runs against every diff:

- Reads: spec + diff + relevant research pack sections cited in spec
- Checks: (a) implementation matches spec; (b) no permission bypasses; (c) no PII leaks in logs; (d) tests cover stories; (e) migrations are reversible; (f) rollback plan is actually wired
- Output: a review comment structure with Blocking / Non-blocking / Nit categorization
- Cannot approve if any Blocking items remain

---

## 10. Versioning & deprecation

- Specs are versioned via `version:` frontmatter.
- A change that alters external contracts (API, notifications, user-visible UI) requires a `+1` version.
- A fully replaced spec goes to `status = deprecated` and sets `supersedes` on the replacement.
- Deprecated specs remain in the repo (git history is not enough — we need the doc linked from active specs for context).

---

## 11. Working-with-this-template examples

### Example A — Small feature
Feature: "Let sales execs re-send a quote to customer via WhatsApp from deal page."

- Frontmatter: domain `sales`, risk `low`, pii_sensitivity `low`
- Agents to recruit: domain-expert (light), api-designer, ux-writer, qa-planner
- Likely skipped sections: §5 (no entity change), §6 (no state change, still in Sent), §10 (integration unchanged — same Doc 13 sheet 2 endpoint)
- Required sections: §7 new endpoint for resend, §9 notification re-use existing template, §12 same permission, §13 consent re-check, §15 edge cases (template rejected since last send)

### Example B — Large feature
Feature: "Consignment onboarding (seller portal + contract signing + escrow payout)"

- Frontmatter: domain `inventory` primary + `finance` secondary, risk `high`, pii_sensitivity `high`
- Agents: all of them
- All sections required
- Likely 3–5 dependent specs spun out (consignor portal, e-sign integration, payout ledger, GST treatment delta, storefront "consigned" badge)
- Doc 10, 11, 13, 14 patches all likely
- DPO + Finance Head + Legal sign-off gate before build

---

## 12. Anti-patterns we will not tolerate

- Specs that say "obviously" or "simply" — ambiguity masqueraded as confidence.
- Copy-pasting between specs instead of citing. Leads to divergent truth.
- Agents that silently rewrite Doc 09–14 content rather than raising a Concern.
- Open questions deferred to "we'll figure it out in code review." Decide, or explicitly defer to v1.5 with a flag.
- Skipping §15 (failure modes) because "nothing can really go wrong." Something always goes wrong.
- Approved specs with `version: 1.0` that never get a `version: 1.1` even after code changes reality. Specs drift and become lies.

---

## 13. Living documents

Docs 09–14 are living. When a spec's patch to Doc 10/11/13/14 is accepted, the relevant research doc is updated as part of the same PR. This keeps the research pack authoritative. Doc 15 itself is living — meta-changes (new agent type, new section in the template) follow the same PR-with-diff discipline.

---

## 14. What comes next

With Docs 09–15 complete, we are ready to move from research to build:

1. Confirm Docs 00–15 as the frozen research pack v1.0.
2. Reopen Q8 (accounting module) with a time-boxed decision session.
3. Identify the v1 MVP feature list from Doc 02 + Q-decisions (Doc 08 follow-up).
4. Use this template (§3) and prompt conventions (§4) to generate the first batch of specs — recommend starting with a foundation set: identity, outlet config, customers, vehicle listing CRUD, lead capture. These unblock the rest.
5. Wire up the multi-agent pipeline (planner → specialists → integrator → coder → reviewer) for spec #1 and tune before scaling.

The research pack exists so that from here on, every spec can be produced in hours, not days, with multi-agent parallelism and cross-review, because the shared context is frozen and referenced — not re-derived.
