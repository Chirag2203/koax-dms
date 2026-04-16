# Citation discipline

Every non-trivial claim in a spec, review, or agent output must cite the document and section.

## Canonical doc numbers

- **Doc 00** — Executive Summary
- **Doc 01** — Market & Competitive Landscape
- **Doc 02** — Feature Matrix
- **Doc 03** — Customer CX & Storefront
- **Doc 04** — Sales & Inventory (Pre-Owned)
- **Doc 05** — Service & Parts Workshop
- **Doc 06** — Finance, Tax & Employee
- **Doc 07** — Tech Architecture Patterns
- **Doc 08** — Open Questions & Risks
- **Doc 09** — Glossary / Ubiquitous Language
- **Doc 10** — Domain Model
- **Doc 11** — State Machines
- **Doc 12** — Non-Functional Requirements
- **Doc 13** — Integration Contracts Index
- **Doc 14** — Role / Permission Matrix
- **Doc 15** — Spec Template & Prompt Conventions
- **Design 00** — Design Direction Comparison (HTML)
- **Design 01** — Design System

## Citation format

- Short form: `Doc 14 §2.3`
- With quote: `Doc 14 §2.3 — "Service Advisor (R09) cannot approve refunds exceeding ₹25,000 without dual control."`
- Cross-doc: `Doc 06 §GST.margin + Doc 13 §3 (IRP)`
- Glossary: `Doc 09 — "VIN"`

## Rules

1. Never restate a rule without a citation.
2. If two docs conflict, cite both and flag to `planner`/`integrator`.
3. If no doc covers the point, raise it as an open question; do not invent.
4. Copy (customer-facing) cites `ux-writer` output + design system tone rules.
5. Visual decisions cite `Design 01`.
