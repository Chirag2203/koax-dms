---
spec_id: SPEC-PLATFORM-001
domain: platform
title: Staff App Shell + Dashboard (Phase S0+S1)
status: draft
risk_level: medium
pii_sensitivity: medium
flags: [staff.shell.v1, staff.dashboard.v1]
owners: [planner, ux-writer, qa-planner, integrator]
depends_on: []
docs_consulted:
  - Doc 03 §7 (staff surface direction)
  - Doc 07 §Architecture patterns
  - Doc 12 §Performance
  - Doc 14 (24 roles R01-R24)
  - Design 01 §3 (Staff surface tokens)
  - Design 03 (Staff Stitch prompt — authoritative)
  - Stitch: app_shell_master_layout_dark, dashboard_operational_overview_dark, command_palette_search_results_dark
  - Research agent findings (Linear/Stripe/Notion/Raycast/Superhuman patterns)
  - Master plan: PLAN-STAFF-SURFACE-001
effective_date: 2026-04-17
---

# SPEC-PLATFORM-001 — Staff App Shell + Dashboard

## 1. Summary

This spec covers Phase S0 (Foundation) + S1 (Dashboard) of the staff surface — the container that every other staff module lives inside, plus the first user-facing screen.

**Routes delivered:**
- `/` — Dashboard (role-adaptive operational overview)
- `/dashboard` — explicit dashboard route (redirect target)
- Placeholder routes for nav: `/inventory`, `/sales`, `/service`, `/parts`, `/customers`, `/finance`, `/reports`, `/settings`, `/audit`, `/notifications` — all show "Module coming in Phase SN" placeholders

**What this delivers:** functional app shell with sidebar nav + top bar + command palette + dashboard, against mock data. Staff user is switchable via dev tool to test role-based rendering.

## 2. Goals

- Staff user sees a fully functional shell that persists across all routes
- Sidebar nav groups (Core / Operations / System) with active state and collapsible behavior
- Command palette (⌘K) finds vehicles, customers, job cards, invoices, and supports verb-first actions
- Dashboard shows 4 KPI stats + 3 panels (Inventory/Sales/Service) + activity feed + alerts
- Role-adaptive content: different roles see different KPI sets
- Theme toggle (dark default, light secondary) persisted to localStorage
- Outlet selector (BLR/MUM/CHE/ALL) persists in cookie + localStorage
- Keyboard shortcuts: ⌘K (palette), G+I/S/V (nav chords), Escape (close), ⌘/ (focus search)

## 3. Non-goals

- Real authentication — mock staff user in localStorage with dev tool to switch roles
- Real-time updates — all fixtures are static in v1
- Actual module screens (inventory list, deal pipeline, etc.) — placeholder pages only
- Server-side saved views — localStorage only in v1
- Full `?` keyboard help overlay — deferred to S10 polish

## 4. Routing structure

```
apps/staff-web/
  app/
    layout.tsx                  — RootLayout: html, body, fonts, theme, providers, AppShell
    globals.css                 — Staff CSS variable emission (light + dark)
    page.tsx                    — redirect to /dashboard
    loading.tsx                 — app-level skeleton
    not-found.tsx               — staff 404 page
    dashboard/
      page.tsx                  — Dashboard (role-adaptive)
    inventory/page.tsx          — placeholder
    sales/page.tsx              — placeholder
    service/page.tsx            — placeholder
    parts/page.tsx              — placeholder
    customers/page.tsx          — placeholder
    finance/page.tsx            — placeholder
    reports/page.tsx            — placeholder
    settings/page.tsx           — placeholder
    audit/page.tsx              — placeholder
    notifications/page.tsx      — placeholder
```

## 5. Component contracts

### 5.1 Shell components (`src/components/shell/`)

**`app-shell.tsx`** — client component
- Props: `{ children: ReactNode }`
- Renders: `<StaffSidebar /> + <div className="flex-1"><StaffTopBar /><main>{children}</main></div> + <CommandPalette /> + <ShortcutRegistry />`
- Full viewport: `min-h-screen flex`

**`staff-sidebar.tsx`** — client
- Width: 220px expanded, 56px collapsed (hover tooltip shows label)
- State: collapsed toggle (localStorage `bn-staff-sidebar-collapsed`)
- Groups: Core (Dashboard, Inventory, Sales, Service, Parts), Operations (Customers, Finance, Reports), System (Notifications, Settings, Audit)
- Each nav item: 40px height, 12px left padding, lucide icon 20px + Inter 14/500 label
- Active state: `bg-bg-active text-ink-primary` + 2px accent-blue left border
- Hover: `bg-bg-hover`
- Outlet pill at bottom (BLR/MUM/CHE toggle)
- User card at bottom: avatar 32px round + name + role badge
- Collapse toggle icon

**`staff-top-bar.tsx`** — client
- Height: 48px, sticky top-0, full width minus sidebar
- Left zone: breadcrumb (`Inventory / Vehicles / WP0ZZZ97•••1234`)
- Center zone: command palette trigger button, 320px wide, pill-shaped with search icon + placeholder + `⌘K` badge
- Right zone: notifications bell (with unread dot) + outlet pill (Inter 12/500) + user avatar (28px)
- Border-bottom: `border-line`

**`command-palette.tsx`** — client, uses cmdk
- Opens on ⌘K or click trigger
- Semi-transparent backdrop (`bg-black/60`)
- Container: 560px wide, `bg-bg-surface` rounded-lg border-line-strong, elevation-3
- Top: search input, no border, autofocus, placeholder "Type a command or search…"
- Results scrollable, max-height 400px
- Categories: Recent, Vehicles, Customers, Job Cards, Invoices, Actions
- Each result: 40px height, icon 20px + primary text Inter 14/400 + secondary text Inter 12/400 muted + optional kbd shortcut right
- Highlighted: `bg-bg-hover`
- Bottom bar: `↑↓ Navigate · ↵ Open · ⎋ Close`

**`shortcut-registry.tsx`** — client, no render
- Uses `useKeyboardShortcuts` hook
- Registers global chords: G+I/S/V/P/F/R/C/N → navigate to module
- Registers ⌘K (open palette), ⌘/ (focus search), Escape (close any panel/modal)

### 5.2 Staff primitives (`src/components/primitives/`)

**`data-table.tsx`** — client, wraps `@tanstack/react-table`
- Props: `{ columns, data, onRowClick?, bulkActions?, emptyState?, density?, savedViews? }`
- Features: column config (drag reorder, toggle, resize), sort (click header), multi-select checkbox column, bulk action strip on ≥1 selection, sticky header, alternating rows (`even:bg-bg-subtle`), pagination footer
- Row heights: `compact` 44px / `default` 56px / `relaxed` 68px
- Keyboard: arrow keys, Enter to open, Space to select, Escape to clear selection
- Virtualized at 100+ rows (via @tanstack/react-virtual)

**`state-chip.tsx`** — pure
- Props: `{ status: 'listed' | 'reserved' | 'in-refurb' | 'stale' | 'sold' | 'draft' | 'overdue' | 'cpo' | 'pending', label?: string, size?: 'sm' | 'md' }`
- Colored dot + label, rounded-sm, 4px radius
- Dark theme: `bg-{color}/10 text-{color}`, text label always present

**`outlet-pill.tsx`** — pure
- Props: `{ outlet: 'bangalore' | 'mumbai' | 'chennai', crossOutlet?: boolean }`
- Renders: mono 11px uppercase "BLR" / "MUM" / "CHE"
- If crossOutlet=true, 1px accent-blue ring

**`vin-badge.tsx`** — client
- Props: `{ vin: string, masked?: boolean }`
- Renders: mono 13px with optional copy-to-clipboard icon
- Masked form: `WP0ZZZ97•••1234` (show first 9 + last 4)
- Staff defaults: full VIN. Customer-facing: masked.

**`amount-cell.tsx`** — pure
- Props: `{ amount: number, currency?: 'INR' }`
- Renders: mono 13px right-aligned tabular-nums, Indian grouping (`₹ 1,28,50,000`)

**`slide-in-panel.tsx`** — client, uses framer-motion
- Props: `{ open, onClose, width?: '40%' | '50%' | '60%', children }`
- Slides in from right, 160ms ease-standard
- Backdrop dismiss + Escape key
- Focus trap, body scroll lock

**`progress-stepper.tsx`** — pure
- Props: `{ steps: string[], current: number }`
- Horizontal row, circle + label per step
- Past: success-green check. Current: accent-blue filled. Future: outline circle muted.

**`kbd-shortcut.tsx`** — pure
- Props: `{ keys: string }` (e.g., "⌘K", "G+I", "⎋")
- Renders: mono 11px on `bg-bg-subtle` pill

**`role-badge.tsx`** — pure
- Props: `{ roleCode: string, roleName?: string }`
- Renders: "R10 · Sales Manager" with code in mono, name in Inter

**`gate.tsx`** — client, RBAC primitive
- Props: `{ role?: string | string[], outlet?: string, fallback?: 'hide' | 'disable' | 'tooltip', children }`
- If user lacks role → render according to fallback (hide entirely, render disabled/muted with tooltip, or render disabled with hover tooltip explaining required role)

### 5.3 Providers (`src/providers/`)

**`staff-auth-provider.tsx`** — client
- `{ user: StaffUser | null, isAuthenticated, signIn, signOut, switchRole (dev) }`
- Mock: 8 staff users in localStorage, switchable via dev tool
- Exports `useStaffAuth()` hook

**`outlet-provider.tsx`** — client
- `{ outlet: 'bangalore' | 'mumbai' | 'chennai' | 'all', setOutlet }`
- Persists to localStorage + cookie
- Exports `useOutlet()` hook

**`command-palette-provider.tsx`** — client
- `{ open, setOpen, registerEntity, registerAction }`
- Modules register their searchable entities/actions via hooks on mount
- Exports `useCommandPalette()` + `useCommandEntity({type, id, label, shortcut, action})`

**`theme-provider.tsx`** — client (adapted from customer-web)
- Dark default (not light like customer-web)
- Same localStorage + cookie pattern

**`staff-intl-provider.tsx`** — client
- Reuses `en-IN.json` with staff-specific keys under `"staff"` namespace

**`providers/index.tsx`** — composition wrapper
- Order: IntlProvider > ThemeProvider > StaffAuthProvider > OutletProvider > CommandPaletteProvider > QueryClientProvider

### 5.4 Hooks (`src/hooks/`)

- `use-staff-auth.ts`
- `use-outlet.ts`
- `use-command-palette.ts`
- `use-keyboard-shortcuts.ts` — central registry
- `use-theme.ts`
- `use-saved-views.ts` — per user+route localStorage

## 6. Data types (new in `@dms/types`)

```typescript
// staff.ts
export const StaffRoleCodeEnum = z.enum(['R01','R02',...,'R24']);

export const StaffUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string(), // 2-letter initials
  role: StaffRoleCodeEnum,
  roleName: z.string(), // "Sales Manager"
  outlet: CityEnum.or(z.literal('all')), // 'all' for R19+
  permissions: z.array(z.string()),
});

export const CommandPaletteItemSchema = z.object({
  id: z.string(),
  type: z.enum(['vehicle','customer','job-card','invoice','action']),
  label: z.string(),
  hint: z.string().optional(),
  category: z.string(),
  shortcut: z.string().optional(),
  href: z.string().optional(),
});

export const StaffNotificationSchema = z.object({
  id: z.string(),
  type: z.enum(['inventory','sales','service','finance','parts','system']),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
  href: z.string().optional(),
});
```

## 7. Mock fixtures (new in `@dms/mocks`)

- `staffUsers.ts` — 8 users covering key roles:
  - R05 Rahul Kumar (Sales Associate, Bangalore)
  - R09 Priya Sharma (Service Advisor, Bangalore)
  - R10 Arjun Mehta (Sales Manager, Mumbai)
  - R12 Vikram Singh (Parts Manager, Chennai)
  - R16 Anita Desai (Finance Controller, Bangalore)
  - R19 Sunita Reddy (GM, Mumbai)
  - R22 Karan Shah (CFO, all outlets)
  - R24 Meera Iyer (CEO, all outlets)
- `staffNotifications.ts` — 12 notifications across types
- `commandPaletteItems.ts` — aggregated from existing vehicles/customers fixtures + actions
- `dashboardStats.ts` — computed values from existing fixtures for KPI strip and panels

## 8. Dashboard page

Component hierarchy:

```
DashboardPage
├── PageHeader (title "Dashboard" + outlet label + date)
├── StatStrip (4 cards)
│   ├── VehiclesInStockStat
│   ├── OpenDealsStat
│   ├── ActiveJobCardsStat
│   └── RevenueMTDStat
├── MainPanels (3-column grid)
│   ├── InventorySnapshotPanel (5-row mini table + ageing bar)
│   ├── SalesPipelinePanel (6-stage funnel)
│   └── ServiceBayPanel (4x2 bay grid + upcoming appointments)
└── SecondaryPanels (2-column)
    ├── RecentActivityFeed (60% width)
    └── AlertsTasksPanel (40% width)
```

**Role adaptation (MVP):**
- R05 Sales Associate: sees only Sales panel + own deals
- R09 Service Advisor: sees Service panel + own job cards
- R10 Sales Manager: Sales + Inventory
- R12 Parts Manager: Parts alerts only
- R19 GM and above: everything

Implementation: single page component that accepts role + outlet and conditionally renders panels.

## 9. CSS variable emission

`app/globals.css`:
```css
[data-surface="staff"][data-theme="dark"] {
  --bg-canvas: 10 10 10;      /* #0A0A0A */
  --bg-surface: 20 20 20;     /* #141414 */
  --bg-subtle: 26 26 26;      /* #1A1A1A */
  --bg-hover: 34 34 34;
  --bg-active: 42 42 42;
  --ink-primary: 237 237 237;
  --ink-secondary: 163 163 163;
  --ink-muted: 115 115 115;
  --accent: 59 130 246;
  --accent-hover: 96 165 250;
  --line: 38 38 38;
  --line-strong: 64 64 64;
  /* State chip colors omitted for brevity — per Design 03 */
}

[data-surface="staff"][data-theme="light"] {
  /* Per Design 03 light palette */
}
```

## 10. Non-functional requirements

| NFR | Target |
|-----|--------|
| First paint | < 800ms on localhost |
| Theme toggle | < 16ms (no flash) |
| Command palette open | < 100ms after ⌘K |
| DataTable with 200 rows | < 16ms/frame scroll (virtualized) |
| Keyboard shortcut response | < 50ms |
| Sidebar collapse | 120ms ease-standard |
| Dashboard load | < 1s for all panels |

## 11. Build order — parallel agents

**Wave 1 (4 parallel Sonnet agents):**
- **Agent A (Infra):** Next.js scaffold, tsconfig, Tailwind config, globals.css, root layout, fonts
- **Agent B (Providers):** Theme, Auth, Outlet, CommandPalette, Intl providers + composition
- **Agent C (Shell):** AppShell, Sidebar, TopBar, CommandPalette, ShortcutRegistry
- **Agent D (Primitives + Data):** DataTable, StateChip, OutletPill, VINBadge, AmountCell, SlideInPanel, ProgressStepper, KbdShortcut, RoleBadge, Gate + staff types + fixtures + MSW handlers

**Wave 2 (sequential after Wave 1):**
- Assemble dashboard page + placeholder routes + quality gate

## 12. Failure modes

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Command palette slow with 200+ items | cmdk has built-in virtualization; cap registered items at 200 with search triggering MSW call for overflow |
| 2 | Role switcher confuses dev | Dev tool clearly labeled, only visible when `NODE_ENV=development` |
| 3 | Theme flash on initial paint | Inline script in `<head>` reads cookie before React hydrates |
| 4 | Sidebar collapse state lost on refresh | localStorage + cookie |
| 5 | Keyboard shortcuts conflict with input focus | `useKeyboardShortcuts` detects `document.activeElement` is input/textarea/contenteditable and bails for chords (not ⌘K) |

## 13. Test plan

- **Unit:** providers return correct state, shortcuts hook detects input focus, fuzzy match ranks correctly
- **Integration:** opening palette + typing + pressing enter navigates correctly
- **E2E (Playwright):** sign in → dashboard renders → ⌘K opens palette → navigate to placeholder → back to dashboard → theme toggle persists
- **A11y:** Axe 0 violations on dashboard, all icon-only buttons have aria-label, focus rings visible

## 14. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-17 | 0.1 | Claude (integrator) | Initial spec for Phase S0+S1 |
