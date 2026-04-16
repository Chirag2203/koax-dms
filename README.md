# DMS — Luxury Pre-Owned Data Management System

Custom DMS for a multi-city India luxury pre-owned car business. Unifies customer CX, sales, service, parts, marketing, and management into one platform.

## Repository structure

```
dms/
├── apps/
│   ├── customer-web/        Next.js 14 — public storefront + customer portal + consignor portal
│   └── staff-web/           Next.js 14 — internal DMS (sales, service, parts, finance, admin)
├── packages/
│   ├── tokens/              Design tokens (Customer + Staff surfaces, light + dark)
│   ├── ui/                  Shared component library (shadcn/ui + domain components)
│   ├── mocks/               MSW handlers + fixtures covering Doc 11 state-machine states
│   ├── types/               Shared TS types + domain types + API contracts (Zod)
│   ├── config-tailwind/     Tailwind preset consuming tokens
│   ├── config-eslint/       Shared ESLint config
│   └── config-typescript/   Shared tsconfig bases
├── research/                Docs 00-15 — authoritative product + architecture pack
├── design/                  Design direction, design system doc, Figma links, Stitch prompts
├── specs/                   Module + feature specs following Doc 15 template
├── .claude/                 Project-wide Claude agent config + instructions + local skills
└── (root config files)
```

## Prereqs

- Node 20.11+ (`.nvmrc` pinned)
- pnpm 9+ (`packageManager` pinned in root package.json)

## Getting started

```sh
pnpm install
pnpm dev          # runs both apps on separate ports
pnpm storybook    # ui library
pnpm typecheck
pnpm lint
pnpm test
```

## Development workflow

1. Read the relevant research pack doc (00-15) + affected module spec in `/specs/`.
2. Work through flow spec + design + agent review per Doc 15 §4.
3. Build against the typed mock layer in `/packages/mocks/` — no real backend in MVP phase.
4. Backend build starts only after spec + API contract freeze (post stakeholder demo).

## Key references

- [Research pack index](research/README.md)
- [Design system](design/01_design_system.md)
- [Spec template + prompt conventions](research/15_Spec_Template_Prompt_Conventions.md)
- [Claude instructions](.claude/CLAUDE.md)

## Surfaces

- **Customer surface** (editorial + dark premium): `/apps/customer-web/`
- **Staff surface** (modern product interface, dark default): `/apps/staff-web/`

Token source of truth: `/packages/tokens/src/index.ts`
