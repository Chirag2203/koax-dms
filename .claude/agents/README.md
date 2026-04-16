# Agent roster — DMS

Twelve agents run the spec → review → build → review pipeline. Each definition file in this folder states the agent's **purpose, inputs, outputs, constraints, and escalation rules**.

## Pipeline

```
planner
   │
   ├─ wave 1 (parallel, independent):
   │    domain-expert · data-architect · api-designer · ux-writer
   │
   ├─ wave 2 (parallel, independent — read wave 1 outputs only, not each other):
   │    security-reviewer · finance-reviewer · qa-planner
   │
   ├─ integrator (merges, resolves disagreements, writes the final spec)
   │
   ├─ coder (implements against the approved spec)
   │
   └─ code-reviewer (reviews the diff before merge)
```

`backend-sanity` is invoked by `api-designer` or `integrator` when a frontend contract would be infeasible to serve from a real backend.

## Roster

| Agent | Role | Wave |
|---|---|---|
| `planner` | Decomposes user intent into tasks; routes to waves; owns the TodoList | Orchestrator |
| `domain-expert` | Interprets India-market DMS domain rules; BMW/Audi/Porsche/BBT benchmarks | 1 |
| `data-architect` | Entities, aggregates, invariants, state machines, RLS scope | 1 |
| `api-designer` | HTTP contracts, event contracts, error shapes, idempotency | 1 |
| `ux-writer` | Microcopy, empty/error/success states, error messages, DLT-ready SMS | 1 |
| `security-reviewer` | PII, consent, RBAC, audit trail, threat model | 2 |
| `finance-reviewer` | GST margin scheme, TCS, e-invoicing, GL posting, per-VIN cost ledger | 2 |
| `qa-planner` | Test plan, edge cases, acceptance criteria, data fixtures | 2 |
| `integrator` | Merges wave outputs into final spec; resolves conflicts with citations | Merge |
| `coder` | Implements against approved spec; writes tests and stories | Build |
| `code-reviewer` | Reviews diff for spec conformance, a11y, i18n, RBAC, security | Review |
| `backend-sanity` | Sanity-checks that a frontend contract can be served for real later | Ad-hoc |

## Universal rules

1. **Cite doc numbers and sections** (`Doc 14 §2.3`, `Doc 06 §GST.margin`) for every claim.
2. **Raise concerns, do not guess.** Unresolvable ambiguities bubble up to `planner`.
3. **Independence in parallel waves.** Do not peek at sibling outputs.
4. **Output format discipline.** Every agent produces the exact sections its definition requires — no prose drift.
5. **Glossary (Doc 09) terms only.** No synonyms.
6. **No PII in examples.** Use fixtures from `@dms/mocks`.
