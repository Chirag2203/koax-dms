# Agent Status — Customer Web Modules

**Last updated:** 2026-04-16
**Overall status:** ALL 3 CUSTOMER MODULES COMPLETE

## Module 13: Storefront — SHIPPED
- 8 pages: Landing, VDP, Collection, Cities, Certification, Service, Journal, Sell
- 3 specs written (SPEC-STOREFRONT-001 through 003)
- VDP gallery: Cinematic Grid (Proposal 2)
- 28 vehicles with Unsplash images, Indian pricing

## Module 14: Customer Portal — SHIPPED
- 8 pages: Sign-in, Sign-up, Account, Vehicles, Vehicle Detail, Bookings, Documents, Preferences
- Mock auth via localStorage (any email works)
- Portal sidebar nav (desktop) + bottom tabs (mobile)
- 1 mock customer (Arjun Mehta), 3 owned vehicles, 2 saved, 1 reservation, 2 bookings, 8 service records, 15 documents

## Module 15: Consignor Portal — SHIPPED
- 5 pages: Dashboard, Vehicles, Payouts, Messages, Documents
- Routes at /consignor/* (real URL segment, not route group)
- 2 consigned vehicles, 2 payouts, 8 messages, 2 agreements
- Financial breakdown: sale - fee - reimbursables = net payout

## Routes Summary (21 total)
```
/ — Landing (storefront)
/collection — Inventory listing with 7 filters
/collection/[vin] — Vehicle Detail Page
/cities — Our Cities (3 outlets)
/certification — The BN Standard
/service — Service & Maintenance
/journal — The Journal
/sell — Sell Your Car
/sign-in — Auth sign-in
/sign-up — Auth sign-up
/account — Customer account home
/vehicles — My Vehicles
/vehicles/[vin] — Vehicle detail (service history + docs)
/bookings — Upcoming bookings
/documents — Document vault
/preferences — Communication preferences
/consignor — Consignor dashboard
/consignor/vehicles — Consigned vehicles
/consignor/payouts — Payout tracking
/consignor/messages — Advisor correspondence
/consignor/documents — Consignment agreements
```

## Git Commits
1. `feat: complete customer storefront` — 220 files
2. `feat: complete customer portal` — 57 files
3. `feat: complete consignor portal` — 31 files
4. `docs: master plan for staff surface build`
5. `fix: portal card backgrounds for dark theme + header auth state`
6. `fix: improve vehicle cards — equal height, grayscale, 2x2 grid`

---

# Staff Surface — Phase S0 (Foundation)

## Research: staff-surface (2026-04-17, Opus)

### Prior art — patterns to adopt
- **Linear:** status-driven list, row-level keyboard grammar (J/K nav, E edit, Enter open) — our DataTable gets row shortcuts, not hidden menus
- **Stripe Dashboard:** right-hand detail drawer over full-page nav. URL updates so drawer state is shareable. `⌘,` / `⌘.` for prev/next record within drawer
- **Notion:** command palette as creation surface — accepts verb-first ("Create lead") AND noun-first ("WP0ZZZ97…")
- **Raycast:** fuzzy match + recency/frecency ranking, categorical sections with right-rail shortcut hints. Score = 0.6·fuzzy + 0.3·recency + 0.1·roleRelevance
- **Superhuman:** keystroke chords for nav (G+I/S/V), single keys for row actions (C=new, J/K=next/prev, ⌘+Enter=submit)

### 8 staff user scenarios (3-keystroke paths)
1. Sales Associate pipeline: `G → S → Enter` — Kanban mine-only default, days-in-stage
2. Service Advisor drop-off: `⌘K → "new appt" → Enter` — customer typeahead, VIN autocomplete, bay strip
3. Parts Manager GRN approval: `G → P → Enter on row` — 3-way qty match with amber discrepancy highlight
4. Finance IRN review: `G → F → f` — invoice #, GSTIN, IRP error, inline/bulk retry
5. GM aged inventory: `G → I → stale view` — days listed (red >60d), landed cost, margin ₹+%
6. Receptionist walk-in lead: `⌘K → "new lead" → Enter` — phone+name required, auto outlet
7. Technician job update: `⌘K → "JC-2026-0341" → ⌘↵` — current stepper, next line, parts chip
8. CEO cross-outlet: `G → R → outlet=All` — 6 KPI strip, revenue trend by outlet

### Command palette requirements
- **Entities:** VINs (masked display, match full), customer names + phones, Job Cards (`JC-YYYY-NNNN`), Invoices, GRNs, Deals, Parts, Outlets, Users, Reports, verb-actions
- **Matching:** hybrid. Verb-first for actions, noun-first for entities. Score blends fuzzy + recency + role relevance
- **Recent items:** top 5 on empty open, per-user localStorage, cap 20
- **Shortcut tiers:** Global chords at AppShell provider (G+I/S/V/P/F/R/C/N, active unless input focused). Contextual via `useShortcut(scope)` hook

### DataTable design constraints
- **Configurable columns:** all non-PK toggleable/draggable/resizable, persisted per saved view
- **Sticky:** header row, first col on h-scroll, bulk strip above header when active, pagination footer
- **Density:** 56px default, 44px compact (Inventory/Parts), 68px relaxed (Customers/Deals). Per-user per-route persistence
- **Bulk actions:** sticky strip on ≥1 selection with "N selected" + actions + clear-X
- **Saved views:** 3 scopes — per-user (private), per-outlet (R03+ shared), per-role. localStorage v1, server post-v1
- **Performance 200+:** TanStack Table + TanStack Virtual row virtualization. <16ms/frame. Lazy photo thumbs, server pagination >500, cursor pagination >50

### RBAC visual language
- **Disabled-by-role:** muted present (40% opacity, not hidden). Tooltip: `"You need {Role} role to {verb} {object}."`
- **Cross-outlet records:** outlet pill in every record header. Outside home outlet: 1px accent-blue ring + tooltip
- **Co-approval:** primary CTA reads `"Request Co-Approval"` (not Confirm). Shows "Pending co-approval · waiting on {Name}" chip until second approval
- **Tooltip pattern:** sentence case, concrete verb+object, never passive, never "permission denied"

### Handoff notes to spec/build
- **DataTable ships S0** — consumed by Inventory/Sales/Service/Parts/Finance/Customers/Settings/Audit
- **CommandPaletteProvider ships S0** with `useCommandEntity({type, id, label, shortcut})` registration API
- **`useShortcut` hook ships S0**; `?` help overlay polish in S10
- **`<Gate role="..." outlet="..." fallback="tooltip">`** primitive ships S0, wraps every privileged action
- **Saved views**: localStorage per user+route in v1

## Plan: staff-S0-foundation — (awaiting plan agent)
