# Agent pipeline — quick reference

```
┌────────────┐
│  planner   │  decomposes intent, routes
└─────┬──────┘
      │
      │ context packet
      ▼
┌───────────────────────────────────────────────────────────────┐
│ WAVE 1 (parallel, independent)                                │
│                                                               │
│  domain-expert   data-architect   api-designer   ux-writer    │
│                                                               │
└───────────────┬──────────────┬──────────────┬─────────────────┘
                │              │              │
                ▼              ▼              ▼
           (optional)
       ┌──────────────────┐
       │  backend-sanity  │  invoked by api-designer/integrator
       └──────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ WAVE 2 (parallel, independent — see wave 1 outputs only)      │
│                                                               │
│  security-reviewer   finance-reviewer*   qa-planner           │
│                                                               │
│  *finance-reviewer mandatory on money-adjacent specs          │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
         ┌────────────┐
         │ integrator │  merges, writes spec, resolves conflicts
         └─────┬──────┘
               │ approved spec
               ▼
          ┌─────────┐
          │  coder  │  implements
          └────┬────┘
               │ diff
               ▼
        ┌──────────────┐
        │ code-reviewer│
        └──────────────┘
```

## Money-adjacent domains (finance-reviewer mandatory)
- sales, service, parts, finance, storefront checkout, consignor payouts, employee payroll, any GL posting, petty cash, expenses, refunds, settlements.

## Parallel-launch discipline
- Wave 1: single message with 4 `Agent` tool calls.
- Wave 2: single message with 2–3 `Agent` tool calls.
- Do not leak wave-1 outputs across wave-1 agents.
- Do not leak wave-2 outputs across wave-2 agents.

## When to loop
- Wave 2 `BLOCK` → back to relevant wave-1 agent with the blocker.
- `code-reviewer` `BLOCK` → back to `coder`.
- User decision needed → `AskUserQuestion`.
