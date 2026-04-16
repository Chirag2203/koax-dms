# Locked decisions (v1.0, frozen 2026-04-15)

These are closed. Do not re-open without explicit user approval.

| # | Decision | Lock |
|---|---|---|
| Q1 | Consignment is in v1 scope (outright + consignment both supported). | LOCKED |
| Q2 | Body shop is in v1 scope. | LOCKED |
| Q3 | Three outlets at go-live: **Bangalore (KA), Mumbai (MH), Chennai (TN)**. | LOCKED |
| Q4 | Multi-brand listings allowed from day one. | LOCKED |
| Q5 | Customer portal in v1; consignor portal in v1. | LOCKED |
| Q6 | Languages at launch: en-IN base, hi-IN phase 1, per-outlet regional (kn-IN / mr-IN / ta-IN) phase 2. | LOCKED |
| Q7 | Payments: Razorpay primary. | LOCKED |
| Q8 | Accounting: **thin GL in DMS + Tally Prime statutory export**. Do not build a full double-entry accounting system. | LOCKED |
| Q9 | Notification stack: WhatsApp BSP (TBD), DLT SMS via aggregator, SMTP for email. | LOCKED |
| Q10 | Aadhaar eKYC via sub-KUA; never store full Aadhaar, only last-4. | LOCKED |
| Q11 | Floor-plan interest attributed per VIN in the cost ledger. | LOCKED |
| Q12 | Refurb approvals dual-controlled beyond role-specific thresholds (Doc 14 §3). | LOCKED |

## Design direction (locked)
- Customer surface: **01 Editorial Luxury + 05 Dark Premium**.
- Staff surface: **03 Modern Product Interface**.
- Typography: Playfair Display (display), Inter (sans), IBM Plex Mono (mono).

## Stack (locked)
- pnpm + Turbo; Next.js 14 App Router; TS strict; Tailwind + shadcn-style primitives; CVA; Framer Motion; RHF + Zod; TanStack Query; MSW; next-intl; Vitest + Playwright + Storybook.

## MVP approach (locked)
- Frontend-first, production quality, full v1 scope, mocked data via MSW.
- Freeze UI + spec per module → then wire real backend.
- No separate human designer; agent pipeline produces and reviews designs + specs + code.
