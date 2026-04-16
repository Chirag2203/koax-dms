---
plan_id: PLAN-STAFF-SURFACE-001
title: Staff Surface — Master Build Plan
status: approved
owner: integrator
created: 2026-04-17
surface: staff-web (:3001)
design_direction: "03 Modern Product Interface (Linear / Stripe Dashboard / Raycast)"
---

# Staff Surface — Master Build Plan

This plan covers the entire staff surface build across 12 modules. Customer-web (storefront + portals, 21 routes) is fully shipped. We now pivot to the internal DMS used by dealership staff.

---

## 1. Design direction (locked)

**Reference:** Linear, Stripe Dashboard, Notion, Raycast, Superhuman.
**Anti-reference:** Salesforce, SAP, Dynamics, any Indian ERP.

- **Fonts:** Inter (primary) + IBM Plex Mono (VINs, amounts, timestamps). NO serif anywhere.
- **Default theme:** Dark (#0A0A0A canvas, #141414 surface). Light theme is user-switchable but secondary.
- **Accent:** Action blue (#3B82F6 dark / #2563EB light). Different from the customer surface's brass.
- **Density:** Compact. 4–16px spacing range. 48px top bar, 40px nav items, 56px table rows (default).
- **Layout:** 220px sidebar + 48px top bar + main canvas. Sidebar collapses to 56px.
- **Tables are first-class.** Every list view is a dense data table with column config, sticky headers, alternating rows, keyboard nav.
- **Command palette (⌘K)** is always one keystroke away — Raycast-style fuzzy search across all entities.
- **No scroll-tied animations. No motion >240ms. No decorative imagery.**

Full design tokens already exist in `@dms/tokens` under `staffTokens.light` and `staffTokens.dark`.

---

## 2. What we're building — 64 Stitch screens across 12 modules

Stitch designs cover the following (all files in `design/stitch_automotive_staff_surface_interface/`):

### Shell & navigation (4 screens)
- `app_shell_master_layout_dark` / `_light`
- `command_palette_search_results_dark`
- `design_system_component_specimen_dark`

### Dashboard (2 screens)
- `dashboard_operational_overview_dark` / `_light`

### Inventory (11 screens)
- `inventory_vehicle_list_dark` / `_light`
- `inventory_vehicle_list_bulk_actions`
- `inventory_advanced_filters_dark`
- `inventory_empty_state_dark` / `_light`
- `inventory_vehicle_detail_full_page_dark` / `_light`
- `inventory_vehicle_detail_draft_variant`
- `inventory_vehicle_detail_in_refurb_state`
- `inventory_vehicle_detail_published_state`
- `inventory_vehicle_detail_timeline_full_dark`
- `inventory_vehicle_detail_documents_full_dark`

### Sales (5 screens)
- `sales_deal_pipeline_kanban_dark` / `_light`
- `sales_deal_pipeline_kanban_drag_state`
- `sales_deal_pipeline_list_view_dark`
- `sales_create_new_lead`
- `sales_enquiry_detail`

### Service (14 screens)
- `service_job_card_board_dark` / `_light`
- `service_job_card_detail_in_progress_dark` / `_light`
- `service_job_card_detail_inspection_tab_dark` / `_light`
- `service_job_card_detail_invoice_preview_dark` / `_light`
- `service_job_card_detail_parts_tab_dark` / `_light`
- `service_job_card_detail_timeline_tab_dark` / `_light`
- `service_job_card_ready_for_delivery`
- `service_new_appointment`
- `service_warranty_claim`

### Parts (6 screens)
- `parts_stock_list_dark` / `_light`
- `parts_low_stock_detail_dark` / `_light`
- `parts_grn_detail_pending_approval` / `_light`

### Finance (4 screens)
- `finance_invoice_list_dark` / `_light`
- `finance_invoice_detail_light`
- `finance_invoice_detail_vehicle_sale_dark`

### Customers (4 screens)
- `customer_profile_overview_dark` / `_light`
- `customer_profile_transactions_dark` / `_light`

### Reports (2 screens)
- `reports_operations_dashboard_dark` / `_light`

### Settings (6 screens)
- `settings_users_roles_dark` / `_light`
- `settings_feature_flags_dark` / `_light`
- `settings_notification_templates_dark`
- `settings_audit_log_dark`

### Notifications (1 screen)
- `notifications_inbox_dark`

### Misc (1 screen)
- `velocity_console` (operational console — likely the ops dashboard variant)

**Total: 64 screens → mapped to ~35 unique routes.**

---

## 3. Module inventory (from Doc context/modules.md)

| # | Module | Scope | Money | PII |
|---|--------|-------|-------|-----|
| 01 | `identity` | Users, roles, auth, Aadhaar/PAN eKYC, consent | no | high |
| 02 | `customers` | Profile, household, prefs, comms | no | medium |
| 03 | `inventory` | Acquisition, appraisal, refurb, cost ledger, listing | yes | low |
| 04 | `sales` | Lead, test drive, reservation, sales order, delivery, buyback | yes | medium |
| 05 | `service` | Appointment, job card, bay, QC, delivery, warranty | yes | medium |
| 06 | `parts` | Parts master, PO, GRN, stock, issues | yes | low |
| 07 | `finance` | Invoicing (margin+TCS), e-invoicing/IRN, thin GL, Tally export | yes | medium |
| 08 | `notifications` | WhatsApp templates, DLT SMS, email, consent | no | medium |
| 10 | `reporting` | Dashboards, ops reports, mgmt reports | no | low |
| 11 | `audit` | Immutable audit log, access review | no | medium |
| 12 | `platform` | Outlet mgmt, feature flags, settings, city isolation | no | none |
| n/a | `integrations` | Razorpay, IRP/GSP, Aadhaar, Tally, BSP — backend-only in v1 (frontend only surfaces integration status) | yes | high |

---

## 4. Build phases (vertical slices)

Same pattern as customer-web: each phase is independently demonstrable, typecheck+visual verified, then committed.

### Phase S0 — Foundation (blocker for all modules)

Shell, theme, command palette, primitives. Nothing else builds without this.

1. **Next.js 14 App Router scaffold** for `apps/staff-web`:
   - `app/layout.tsx` with dark-default theme, Inter + IBM Plex Mono via `next/font`
   - `app/globals.css` with staff token CSS variables (both themes)
   - `tailwind.config.ts` consuming `@dms/config-tailwind` + staff-surface overrides
   - `next.config.mjs` with transpilePackages, image remote patterns
   - tsconfig, postcss, eslint
2. **Providers:**
   - `ThemeProvider` (dark default, localStorage-persisted)
   - `StaffAuthProvider` (mock staff user: role, outlet, permissions)
   - `OutletProvider` (selected outlet: BLR/MUM/CHE/ALL)
   - `CommandPaletteProvider` (open/close state, global ⌘K listener)
   - `IntlProvider` (en-IN, reuse customer-web messages where possible)
   - `QueryClientProvider` (TanStack Query)
3. **App shell components:**
   - `StaffSidebar` — 220px→56px collapsible, nav groups (Core/Operations/System), outlet pill, user card, theme toggle
   - `StaffTopBar` — 48px, breadcrumbs, ⌘K trigger, notifications bell, outlet badge, avatar
   - `CommandPalette` (cmdk) — fuzzy search, recent items, actions, keyboard nav
   - `AppShell` layout wrapping all pages
4. **Staff-specific UI primitives** (extend `@dms/ui`):
   - `DataTable` (TanStack Table wrapper) — column config, sort, select, sticky header, alternating rows, pagination
   - `StateChip` — status badge with colored dot (Listed/Reserved/Refurb/Stale/Sold/Draft/Overdue/CPO/Pending)
   - `OutletPill` — BLR/MUM/CHE uppercase mono badges
   - `VINBadge` — monospace VIN with copy-to-clipboard (staff sees full VIN, not masked)
   - `AmountCell` — right-aligned tabular-nums with Indian grouping
   - `SlideInPanel` — right drawer at 40–60% viewport width for record detail
   - `ProgressStepper` — horizontal lifecycle indicator (Received → Diagnosed → In Progress → QC → Ready)
   - `KbdShortcut` — mono kbd badges (⌘K, ⎋, ↵)
   - `RoleBadge` — role code + name (R10 · Sales Manager)
5. **Staff mock data layer** (extend `@dms/mocks`):
   - Staff users (1 per role across R09-R24, linked to outlets)
   - Expand existing vehicle fixtures with staff-side fields (appraisal grade, cost ledger, timeline events)
   - Job cards (8 fixtures across lifecycle states)
   - Deals (17 fixtures across pipeline stages)
   - Invoices (mix of vehicle sale, service, parts, refund)
   - Parts master (~40 items), GRNs, POs
   - Audit log events
   - MSW handlers for all staff endpoints

**Gate S0:** `pnpm --filter @dms/staff-web dev` boots on :3001, shows empty dashboard with full app shell, ⌘K opens command palette, theme toggles work, typecheck clean.

---

### Phase S1 — Dashboard (Module 10 entry, role-adaptive)

Home screen after login. GM/CFO see everything; Sales Manager sees their domain; Service Advisor sees theirs.

**Stitch refs:** `dashboard_operational_overview_dark` + `_light`, `velocity_console`

**Route:** `/`
**Components:** StatStrip (4 cards), InventorySnapshotPanel, SalesPipelinePanel, ServiceBayPanel, RecentActivityFeed, AlertsTasksPanel

**Role adaptation:**
- R09 Sales Associate: deals only
- R10 Sales Manager: deals + inventory
- R13 Service Advisor: service bay + job cards
- R19 GM: everything (single outlet)
- R24 CEO: everything (cross-outlet)

**Gate S1:** All 4 stat cards render, 3 main panels populated with fixtures, activity feed + alerts visible, role-based content adapts on user switch (dev tool).

---

### Phase S2 — Inventory Module (Module 03)

Most complex module. 11 Stitch screens.

**Routes:**
- `/inventory` — vehicle list (dense data table with filters, bulk actions)
- `/inventory/[vin]` — vehicle detail full page (Overview, Cost Ledger, Photos, Appraisal, Timeline, Documents tabs)
- `/inventory/new` — add vehicle form
- `/inventory/[vin]/edit` — edit vehicle
- (slide-in panel variant from list)

**Sub-phases:**
- S2a — Vehicle list (table, filters, bulk actions, saved views, empty state)
- S2b — Vehicle detail (tabs: overview, cost ledger, photos, appraisal, timeline, documents)
- S2c — Add/edit vehicle flow
- S2d — Listing state machine (Draft → In Review → Published → Reserved → Sold → Archived)

**Gate S2:** All inventory CRUD flows work against mocks, state transitions trigger fixture updates, list view ≥200 rows renders under 200ms, keyboard nav works.

---

### Phase S3 — Sales Module (Module 04)

**Stitch refs:** 5 sales screens

**Routes:**
- `/sales` — deal pipeline Kanban (default view)
- `/sales?view=list` — list/table view
- `/sales/leads/new` — create lead form
- `/sales/leads/[id]` — lead/enquiry detail (slide-in panel + full page)
- `/sales/deals/[id]` — deal detail

**Key features:**
- Kanban drag-and-drop between 6 columns (New Lead → Contacted → Test Drive → Reserved → Sales Order → Delivered)
- Deal card shows customer, vehicle, amount, assigned advisor, priority, days-in-stage
- List view toggle with same data in dense table
- Lead capture form (multi-source: website, WhatsApp, phone, walk-in, referral)

**Gate S3:** Kanban drag works, deal cards render per column, list↔kanban toggle preserves filters, lead creation submits to mock.

---

### Phase S4 — Service Module (Module 05)

**Stitch refs:** 14 service screens (the largest module)

**Routes:**
- `/service` — bay board (visual grid of 8 bays)
- `/service?view=appointments` — appointments list
- `/service?view=jobcards` — job card list
- `/service?view=warranty` — warranty claims
- `/service/appointments/new` — new appointment
- `/service/jobcards/[id]` — job card detail (tabs: overview, labour, parts, inspection, timeline, invoice preview)
- `/service/warranty/new` — warranty claim form

**Key features:**
- Bay board: 8 bays in 4×2 grid, occupied vs empty states, technician/vehicle info
- Job card lifecycle: Received → Diagnosed → In Progress → QC → Ready for Delivery
- VHC (Vehicle Health Check) inspection tab with 40-point checklist
- Parts requisition from RO to stock
- 3C model (complaint-cause-correction) line items
- Margin-scheme GST on service invoice preview

**Gate S4:** Bay board renders, clicking bay opens job card detail, all 6 job card tabs render with fixture data, state transitions work.

---

### Phase S5 — Parts Module (Module 06)

**Stitch refs:** 6 parts screens

**Routes:**
- `/parts` — stock list
- `/parts?view=pos` — purchase orders
- `/parts?view=grns` — GRNs
- `/parts?view=suppliers` — suppliers
- `/parts?view=transfers` — inter-outlet transfers
- `/parts/po/new` — create PO
- `/parts/grn/[id]` — GRN detail (3-way match, dual approval for high value)
- `/parts/stock/[partId]` — part detail with stock by outlet

**Key features:**
- Low-stock highlighting (danger-red left border when qty ≤ reorder level)
- GRN approval workflow with dual control for amount > threshold
- ABC/VED classification badges
- Supersession chains
- Landed cost tracking for imports

**Gate S5:** Stock list with low-stock rows highlighted, GRN approval requires dual control above threshold, transfers between outlets work.

---

### Phase S6 — Finance Module (Module 07)

**Stitch refs:** 4 finance screens

**Routes:**
- `/finance` — invoice list
- `/finance/invoices/[id]` — invoice detail/generator
- `/finance/invoices/new` — create invoice
- `/finance/gl` — thin GL
- `/finance/tcs` — TCS filings
- `/finance/collections` — payment tracking

**Key features:**
- **Margin-scheme GST** computation (GST on margin, not full value) — critical
- TCS @ 1% on sales > ₹10L with PAN-FY tracking
- E-invoicing (IRP) status: Filed/Pending/Failed with retry, IRN + QR display
- B2B vs B2C: CGST+SGST (intra-state) vs IGST (inter-state) vs no e-invoice (B2C below threshold)
- Thin GL with Tally Prime export

**Gate S6:** Invoice with margin-scheme GST computed correctly, TCS added for >₹10L sales, IRN status visible per invoice, Tally export renders CSV.

---

### Phase S7 — Customers Module (Module 02)

**Stitch refs:** 4 customer screens

**Routes:**
- `/customers` — customer list
- `/customers/[id]` — customer profile (tabs: overview, vehicles, service history, transactions, comms, documents)

**Key features:**
- 360° customer view
- PII masking (phone, PAN, Aadhaar) with role-based reveal (R19+ sees unmasked)
- KYC status (Aadhaar ✓, PAN ✓, DigiLocker ✓)
- Lifetime value card
- Communication log (WhatsApp, SMS, email with delivery status)

**Gate S7:** Customer list filters work, profile page renders all 6 tabs, PII masking respects role, LTV computed correctly.

---

### Phase S8 — Reports Module (Module 10)

**Stitch refs:** 2 reports screens

**Routes:**
- `/reports` — operations dashboard
- `/reports/[reportId]` — individual reports (inventory ageing, sales performance, service productivity, margin report, TCS report)

**Key features:**
- Outlet selector (All / BLR / MUM / CHE)
- Date range picker
- 6 KPI cards with trends
- 2 side-by-side charts (revenue trend, inventory composition)
- Role-locked KPIs (CFO-only cards show lock + tooltip)

**Gate S8:** Reports render with chart library (Recharts), outlet filter + date range work, locked KPIs show lock state for non-CFO roles.

---

### Phase S9 — Settings & Platform (Modules 11/12)

**Stitch refs:** 6 settings screens + audit + notifications

**Routes:**
- `/settings/organization`
- `/settings/outlets`
- `/settings/users` — users & roles table with permission matrix drawer
- `/settings/flags` — feature flags toggle table
- `/settings/integrations` — integration status tiles
- `/settings/templates` — notification templates (WhatsApp/SMS/email)
- `/settings/audit` — immutable audit log with filters
- `/settings/appearance` — theme, density, language

**Key features:**
- Permission matrix: module × action (read/write/approve/admin)
- Feature flag toggles with outlet-level override
- Audit log: tamper-evident, immutable, filterable by actor/action/entity/date
- DLT/BSP template registration status

**Gate S9:** Permission matrix editable (mock), flags toggle persists, audit log shows fixture events with filters, templates visible by channel.

---

### Phase S10 — Notifications + Polish

**Routes:**
- `/notifications` — full inbox page
- Notification slide-down from bell icon (global, accessible from any page)

**Polish items:**
- Command palette registrations for all modules (global search)
- Keyboard shortcuts registered (G+I, G+S, G+V, ⌘/, ⌘K)
- Empty states for every list view
- Loading skeletons per route
- Toast notifications wired across all mutations
- Storybook stories for all staff primitives
- Playwright E2E tests for critical flows

**Gate S10:** ⌘K finds any VIN/customer/job card across modules, all keyboard shortcuts work, zero Axe violations on dashboard/list views.

---

## 5. Execution strategy

Same pipeline as customer-web:

1. **Research + Plan** (parallel Opus agents) for each phase before spec
2. **Spec** (integrator Opus) per phase following Doc 15 template
3. **Build** (parallel Sonnet agents, non-overlapping file paths)
4. **Typecheck + visual verify** after every phase
5. **Code review agent** on diff, fix all findings before moving forward
6. **Commit** per phase with detailed message
7. **Update `.claude/agent-status.md` and memory** at milestones

### Wave sizing (rough):
- Phase S0: 2-3 parallel agents (shell + types + mocks, providers + primitives, command palette)
- Phase S1: 1 agent (dashboard only, reuses primitives)
- Phase S2: 2-3 parallel agents (list, detail, forms)
- Phase S3: 2 parallel agents (kanban + list view, lead forms)
- Phase S4: 3 parallel agents (bay board, job card detail tabs, appointments/warranty)
- Phase S5-S6: 2 parallel each
- Phase S7-S8: 1 each
- Phase S9-S10: 2 parallel

### Scope boundaries (v1):
- All data is MOCK via MSW. No real API calls.
- No real auth. Staff user is selectable via dev tool to test RBAC.
- Integrations surfaces show STATUS only — no real Razorpay/IRP/Aadhaar calls.
- Real-time features (live bay updates, push notifications) are mocked with interval polling.
- Tally export generates CSV client-side from fixture data.

---

## 6. Dependencies & reuse from customer-web

| Existing | Reused by staff-web |
|----------|---------------------|
| `@dms/tokens` | staffTokens.light + staffTokens.dark already defined |
| `@dms/config-tailwind` | Preset works for both surfaces (CSS var-based) |
| `@dms/config-typescript` | Same base/nextjs configs |
| `@dms/types` | Extend with staff-specific types (Appraisal, JobCard, PO, GRN, Invoice, AuditEvent, FeatureFlag, StaffUser) |
| `@dms/mocks` | Extend with staff fixtures + handlers |
| `@dms/ui` primitives | Button/Badge/Card/Skeleton/Toast/Input reused; add DataTable/StateChip/SlideInPanel/ProgressStepper as staff-specific |

---

## 7. Decision log

- **Dark-default confirmed** per Doc 03 §7 and staff Stitch prompt.
- **`app/` router**, not pages router (matches customer-web).
- **cmdk** library for command palette (already in deps).
- **@tanstack/react-table v8** for all tables (already in deps).
- **Recharts or visx** for charts — decide at S8 based on bundle size.
- **Mock auth** uses same pattern as customer-web but with role/outlet switcher in dev.
- **Slide-in panels** for detail views where possible (per Stitch section 4a); full-page variants accessible via panel action.

---

## 8. Open questions

None currently. All Doc 08 questions (Q1-Q12) are locked. The staff surface inherits all those decisions.

---

## 9. Timeline estimate

Not providing time estimates per user preference. The work will proceed phase-by-phase, each phase committed before the next begins.

---

## 10. Next action

Start Phase S0 (Foundation). Deploy:
1. **Research agent** — staff UX patterns, Linear/Stripe Dashboard prior art, DataTable requirements, command palette patterns
2. **Plan agent** — detailed Phase S0 file structure, component contracts, mock data shapes for shell + dashboard dependencies
3. **Spec agent** — SPEC-PLATFORM-001 for app shell, SPEC-REPORTING-001 for dashboard

Then build Phase S0 with parallel Sonnet agents.
