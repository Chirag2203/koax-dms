---
name: spec
description: Run the full spec pipeline (planner → wave 1 → wave 2 → integrator) to produce an approved spec file at /specs/modules/<domain>/NN-<slug>.md
---

# /spec — produce an approved spec

## Arguments
- `$DOMAIN` — one of: identity, customers, inventory, sales, service, parts, finance, notifications, integrations, reporting, audit, platform, storefront, customer-portal, consignor-portal
- `$SLUG` — kebab-case feature name
- `$INTENT` — one-paragraph description of what to build and why

## Steps
1. Launch `planner` with: intent, relevant doc numbers, affected `@dms/types`.
2. If `planner` raises blocking questions, ask the user via `AskUserQuestion`.
3. Launch wave 1 agents **in parallel**: `domain-expert`, `data-architect`, `api-designer`, `ux-writer`. Each receives `planner`'s context packet. Agents MUST NOT see each other's output.
4. Gather wave 1 outputs. Launch wave 2 agents **in parallel**: `security-reviewer`, `finance-reviewer` (only if money-adjacent), `qa-planner`. Each sees wave 1 outputs only.
5. Gather wave 2 outputs. If any `BLOCK`, loop back to wave 1 or surface to user.
6. Launch `integrator` with all wave outputs. It writes the final spec file and the merge report.
7. If status is `approved`, commit the spec. If `in-review`, surface open questions to user.

## Output
- File created: `/specs/modules/<domain>/NN-<slug>.md`
- Merge report shown inline.
