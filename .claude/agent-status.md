# Agent Status — BN Automobiles DMS

**Last updated:** 2026-04-17
**Session:** Customer-web complete; Staff-web phases S0→S2.1 shipped, S3 in progress

---

## Surfaces

### Customer-web (:3000) — ALL 3 MODULES SHIPPED

| Module | Status | Routes | Notes |
|--------|--------|--------|-------|
| 13 Storefront | Shipped | /, /collection, /collection/[vin], /cities, /certification, /service, /journal, /sell (8) | Editorial luxury design, Playfair Display + Inter + IBM Plex Mono, cinematic grid VDP gallery |
| 14 Customer Portal | Shipped | /sign-in, /sign-up, /account, /vehicles, /vehicles/[vin], /bookings, /documents, /preferences (8) | Mock auth via localStorage, sidebar nav, profile avatar in storefront header when signed in |
| 15 Consignor Portal | Shipped | /consignor, /consignor/vehicles, /consignor/payouts, /consignor/messages, /consignor/documents (5) | Routes at /consignor/* (real URL segment, not route group) |

**Total customer-web routes: 21.**

### Staff-web (:3001) — IN PROGRESS

| Phase | Module | Status | Key features |
|-------|--------|--------|--------------|
| S0 | Foundation | **Shipped** | App shell, 220px sidebar, 48px topbar, cmdk command palette (⌘K), 7 providers, 10 primitives, staff types + fixtures |
| S1 | Dashboard | **Shipped** | / and /dashboard — 4 stat cards, Inventory panel full-width, Sales+Service 2-col, Activity Feed + Alerts (3+2 split) |
| S2 | Inventory | **Shipped** | /inventory (dense DataTable, saved views, filters, bulk actions), /inventory/[vin] (6 tabs: Overview/Cost Ledger/Photos/Appraisal/Timeline/Documents) |
| S2.1 | Inventory action flows | **Shipped** | /inventory/new (4-step wizard), /inventory/[vin]/edit (single-page form), 5 action modals (cost entry, photos upload, appraisal panel, doc upload, more-actions menu with Transfer/Clone/Archive) |
| S3 | Sales | **IN PROGRESS** | Kanban pipeline + lead capture + enquiry detail (2 build agents running) |
| S4-S10 | Service, Parts, Finance, Customers, Reports, Settings, Polish | Pending | Per master plan |

---

## Routes inventory (all live)

### Customer-web (:3000)
```
Storefront:
  /                               Landing
  /collection                     Inventory listing (7 filters, URL-driven)
  /collection/[vin]               Vehicle Detail Page (cinematic grid gallery)
  /cities                         3 outlets with team + service matrix
  /certification                  210-point pillars
  /service                        Service page with booking form
  /journal                        Editorial article grid
  /sell                           Consignment lead form

Customer Portal:
  /sign-in                        Mock email + OTP
  /sign-up                        Mock customer creation
  /account                        Greeting + saved cars + reservations + visits + history + docs
  /vehicles                       Owned vehicle cards (2x2 grid, grayscale→color hover)
  /vehicles/[vin]                 Service history timeline + documents
  /bookings                       Test drives + service appointments
  /documents                      All docs grouped by vehicle
  /preferences                    DPDP-compliant toggles

Consignor Portal:
  /consignor                      Dashboard with stats
  /consignor/vehicles             Consigned vehicle cards
  /consignor/payouts              Financial breakdown (sale - fee - reimbursables = net)
  /consignor/messages             Advisor correspondence
  /consignor/documents            Consignment agreements
```

### Staff-web (:3001)
```
/                                 → redirects to /dashboard
/dashboard                        Operational overview (4 KPIs, 3 panels, feed, alerts)
/inventory                        Vehicle list (DataTable, saved views, filters, bulk actions)
/inventory/[vin]                  Vehicle detail (6 tabs, state machine, financial snapshot)
/inventory/new                    Create new vehicle (4-step wizard)
/inventory/[vin]/edit             Edit vehicle (single-page form, VIN read-only)
/sales, /service, /parts, /customers, /finance, /reports, /settings, /audit, /notifications — placeholder routes
```

---

## Architectural decisions locked (do not change)

1. **Two surfaces, one token source.** `@dms/tokens` exports `customerTokens.light/dark` + `staffTokens.light/dark`. Tailwind preset maps them to CSS variables via `[data-surface="customer|staff"][data-theme="light|dark"]` attributes.

2. **Customer-web = Editorial Luxury.** Light default, Playfair Display + Inter + IBM Plex Mono, warm cream paper `#faf7f0`, brass accent `#8a6a3d`.

3. **Staff-web = Modern Product Interface.** DARK default (`#0A0A0A` canvas), Inter + IBM Plex Mono only (NO serif), blue accent `#3B82F6`, dense tables, keyboard-first.

4. **NEVER use `getTranslations` from `next-intl/server`.** We don't have the server plugin. All components that need i18n use `'use client'` + `useTranslations`.

5. **NEVER use raw `var(--color-*)` in Tailwind arbitrary syntax.** Use token classes: `bg-bg-surface`, `text-ink-primary`, `border-line`, `text-accent`. This was a recurring bug in customer portal — fully scrubbed now, same rule applies to staff-web.

6. **Mock auth only.** Customer-web: localStorage `bn-auth-user`. Staff-web: localStorage `bn-staff-user`. Both support role/profile switching via dev tools. No real OAuth/OTP.

7. **Vehicle links use VIN** (not slug). `/collection/[vin]` (customer), `/inventory/[vin]` (staff).

8. **Dialog/AlertDialog/Toast primitives at `@/src/components/primitives`** in staff-web. Used by inventory modals; future modules must reuse — do NOT build new modal primitives.

9. **Gate RBAC primitive** wraps all role-gated UI. Fallback modes: `hide | disable | tooltip`. Role checks use role code arrays (`['R10','R19','R22','R24']`), NOT "R15+" shorthand.

10. **No `getTranslations` outside next-intl client** — restated because it bit us in customer portal earlier.

---

## Mock data shape

Located in `packages/mocks/src/`:

### Fixtures shipped
- `vehicles.ts` — 28 vehicles with real Unsplash images, pricing breakdown, Indian registration
- `outlets.ts` — 3 outlets (Bangalore, Mumbai, Chennai)
- `articles.ts` — 8 journal articles
- `service-types.ts` — 6 service types
- `customer.ts` — 1 mock customer (Arjun Mehta)
- `portal.ts` — 3 owned vehicles, 2 saved, 1 reservation, 2 bookings, 8 service records, 15 documents
- `consignor.ts` — 2 consigned vehicles, 2 payouts, 8 messages, 2 agreements
- `staff.ts` — 8 staff users (R05, R09, R10, R12, R16, R19, R22, R24), 53 command palette items, 12 notifications, 4 dashboard stats
- `inventory.ts` — 50 cost ledger entries, 10 appraisals, 62 timeline events, 40 documents (across first 10 vehicles)

### Types shipped
- `packages/types/src/domain/` — vehicle, outlet, article, service-type, customer, portal, consignor, staff, inventory

### MSW handlers shipped
- All CRUD for vehicles, outlets, articles
- Portal endpoints: me, saved-vehicles, reservations, owned-vehicles, bookings, service-history, documents, preferences
- Consignor endpoints: vehicles, payouts, messages, agreements
- Staff endpoints: me, users, notifications, command-palette, dashboard stats
- Inventory endpoints: 19 handlers (list, detail, cost-ledger CRUD, appraisal, documents, photos, transfer, clone, mark-stale, archive, vin-check, POST vehicles)

---

## Known quirks / workarounds

1. **Staff dashboard layout v0.2** — Inventory panel moved from 3-column grid to its own full-width row (was too narrow for price column). Sales + Service below in 2-col. Spec updated.

2. **Edit Vehicle Gate** — initially set to R15+, blocked R10 Sales Manager (default mock user). Fixed to `['R10','R12','R15','R16','R19','R22','R24']`. Acquisition section within the form remains R19+ only.

3. **Portal cards used raw `var(--color-*)`** everywhere — caused broken dark-mode rendering. Fully migrated to Tailwind token classes. Same rule applies to staff-web.

4. **VIN read-only in edit form** — VIN is identity, cannot change after creation (Doc 09).

5. **Command palette placeholders** — CommandPalette ships with hardcoded placeholder items; real fuzzy search across all entities is polish (S10).

6. **No real keyboard help overlay** yet — `?` to open shortcuts help deferred to S10.

7. **Stitch designs may not exist** for all staff pages beyond those listed. When missing, use design agent to propose a layout following the staff design language, OR ask the user.

8. **Next.js webpack cache** occasionally caches stale module-not-found errors after parallel agents create files — fix by `rm -rf .next` + restart.

---

## Next steps

- **S3 Sales (in progress)** — Kanban pipeline + lead capture + enquiry detail. 2 Sonnet agents building in parallel right now.
- **S4 Service** — 14 Stitch screens, largest module after Inventory. Bay board, job cards with 6 tabs, VHC inspection, warranty claims.
- **S5 Parts** — Stock list, POs, GRNs with dual approval, low-stock alerts.
- **S6 Finance** — Invoice list/detail with margin-scheme GST, TCS, IRN status, Tally export.
- **S7 Customers** — 360° profile with PII masking + role-based reveal.
- **S8 Reports** — Operations dashboard with outlet filter + role-locked KPIs (charts library TBD: Recharts or visx).
- **S9 Settings & Platform** — Users/roles permission matrix, feature flags, audit log, notification templates.
- **S10 Notifications + Polish** — Full notification inbox, command palette item registrations across modules, keyboard shortcut help overlay (`?`), Storybook stories, Playwright E2E.

---

## Active agents

Currently 2 parallel Sales build agents (S3a+b Kanban + S3c lead/enquiry) running. Progress captured here by a 3rd historian agent.
