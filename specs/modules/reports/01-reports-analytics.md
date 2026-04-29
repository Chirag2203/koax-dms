---
spec_id: SPEC-REPORTS-001
domain: reports
title: Reports & Analytics Module (staff-web)
status: approved
risk_level: low
pii_sensitivity: low
flags: [reports-module]
owners: [orchestrator]
depends_on:
  - SPEC-VEHICLES-001
  - SPEC-CUSTOMERS-001
  - SPEC-INSURANCE-001
  - SPEC-CUSTOM-BUILDS-001
  - SPEC-STAFF-001
  - SPEC-ARCH-UI-001
docs_consulted:
  - Doc 04 §sales (sales velocity, deal aging)
  - Doc 05 §service (workshop SLA, JC turnaround)
  - Doc 06 §finance (P&L structure)
  - Doc 12 §non-functional (perf budgets for dashboard pages)
  - Doc 14 §RBAC (R19 GM, R22 CFO, R24 CEO views)
version: 1.0
created: 2026-04-29
---

# SPEC-REPORTS-001 — Reports & Analytics Module

---

## 1. Locked Decisions

| Tag | Title | Decision | Source |
|-----|-------|----------|--------|
| L1 | No new store | Reports are pure read-only selectors composed over existing module stores. No `reports-store.ts` is created. A materialized cache may be introduced in v2 when a backend lands. | PLAN-ROADMAP-001 A1; MVP philosophy (CLAUDE.md §4) |
| L2 | Client-side computation in v1 | All KPI computation runs client-side within `apps/staff-web/src/lib/reports/selectors/`. Server-side aggregation (backend query layer) is v1.5 work. Consistent with frontend-first MVP philosophy. | CLAUDE.md §4 |
| L3 | Indian Financial Year semantics | FY = April 1 to March 31. "This FY" means `April 1 of current year → March 31 of next year`. "Last FY" means the immediately preceding FY. "Last 30d" means rolling 30 calendar days from today. All period boundaries are in IST (UTC+5:30). | Doc 06 §finance; India statutory requirement |
| L4 | City-scoped selectors | Every selector accepts `scope: { outletIds: string[] }`. R10 (Sales Manager, own outlet) receives a single-element array. R19 (GM) receives all assigned outlet IDs. R22 (CFO) and R24 (CEO) receive the global `['BLR','MUM','CHE']` array. Scope enforcement is the selector's responsibility; UI must never pre-filter. | Doc 14 §RBAC; CLAUDE.md §8 |
| L5 | Inline SVG sparklines — no chart library | Trend sparklines are rendered as inline SVG polylines (no D3, no Recharts, no Victory). This keeps the bundle addition to zero and satisfies CLAUDE.md §12 (no new deps without spec justification). | CLAUDE.md §12; Doc 12 §non-functional |
| L6 | PDF export is P3 (deferred) | Browser print-to-PDF (`window.print()`) is a stub available in P1 behind a "Print / Export PDF" button. The button shows an `info` toast: "PDF export with full styling coming in P3." No silent no-op. DEF-REPORTS-6 tracks the full PDF export. | CLAUDE.md §10 DoD #15; CLAUDE.md §15 (stub vocab) |
| L7 | No polling; Zustand subscriptions only | Selectors run on every render, triggered by Zustand store subscriptions. There is no `setInterval`-based refresh or stale-while-revalidate. When stores update (e.g., a new SOLD event), KPIs recalculate automatically on next render. | L10 (cross-store read order) |
| L8 | Numeric formatting | INR amounts use `formatINR` from `@dms/vehicles-core` (or the co-located `lib/reports/format.ts` helper if that package export is unavailable). Percentages: 1 decimal place (`toFixed(1) + '%'`). Counts: integer (`Math.round`). Duration in days: integer. No raw `toLocaleString` with hardcoded locale; always use the shared formatter. | CLAUDE.md §7; `@dms/vehicles-core` |
| L9 | Empty-state KPI rendering | When a KPI selector returns zero data points for the selected period, the `StatTile` renders value `—` (em dash) and a sub-caption `reports.noDataForPeriod`. Never render `0` for a zero-data situation (ambiguous) and never render `NaN` (crash signal). A selector returning a zero-count for a period with real data may render `0`. | SPEC-ARCH-UI-001 §3.4; CLAUDE.md §10 DoD #2 |
| L10 | Cross-store read order — `useMemo` pattern | All selector calls in components follow this pattern: (1) extract base refs from each Zustand store with `useXxxStore(s => s.field)` at the top of the hook (before any conditional), (2) derive KPI values in a single `useMemo(() => selector(refs, period, scope), [refs, period, scope])`. Never call selector functions inside a Zustand selector callback — this causes infinite-render loops. | CLAUDE.md §17 (Zustand selectors rule); 2026-04-29 infinite-render fix |
| L11 | Selector module location | `apps/staff-web/src/lib/reports/selectors/` — one file per KPI family (e.g., `sales-selectors.ts`, `service-selectors.ts`). No separate package in v1. Each selector is a pure function: `(state: ReportInputState, period: ReportPeriod, scope: ReportScope) => KpiValue`. | Consistency with existing in-app lib structure |
| L12 | `ReportPeriod` type | `type ReportPeriod = { kind: 'last30d' | 'thisFY' | 'lastFY' | 'custom'; from: string; to: string }`. `from` and `to` are ISO date strings (date portion only, e.g. `'2026-04-01'`). Helpers `thisFYPeriod()`, `lastFYPeriod()`, `last30dPeriod()` live in `lib/reports/period.ts`. | L3 FY semantics |
| L13 | `ReportScope` type | `type ReportScope = { outletIds: string[] }`. `outletIds` is a non-empty array. An empty array is invalid and the selector returns empty state. Selector validates length > 0 before computing. | L4 city scoping |
| L14 | Parts margin KPI is scaffolded | The Parts module (`parts-store`) does not currently expose a `costPrice` per SKU in a way selectors can access cleanly. Parts margin % is scaffolded (type + StatTile render) with a `DEF-REPORTS-4` deferred note. The tile renders `—` with caption `reports.partsMarginDeferredNotice`. | DEF-REPORTS-4; L9 empty-state rule |
| L15 | Staff utilization KPI scope | Staff utilization (service techs + SAs) requires `staff-store` salary/attendance data (SPEC-STAFF-001 P2). P2 has shipped attendance. Selector reads `AttendancePunch[]` for hours-worked. "Hours available" defaults to `8h × working days in period` until a scheduling module exists. | SPEC-STAFF-001 P2 |
| L16 | Outlet scope toggle visibility | The outlet scope toggle (multi-select of BLR / MUM / CHE) is visible only to R19+. R10 and below see their own outlet label (non-interactive). Enforced via `<Gate>` — not inline role check. | SPEC-ARCH-UI-001 §3.10; Doc 14 §RBAC |
| L17 | Sparkline rendering is lazy | Sparklines are wrapped in `React.lazy` / `Suspense` with a skeleton fallback. They are the largest client-side computation. If the data window renders fast enough, the skeleton resolves in the same paint cycle — no visible flash. | Doc 12 §non-functional (< 2s render with full fixture set) |
| L18 | Sales velocity source | Sales velocity is derived from `vehicles-store.salesEvents` filtered for `kind === 'SOLD'` events within the period and outlet, counted per calendar week. `salesEvents` is the single source of truth (per PLAN-VEHICLES-003 L45 fixture-coverage rule). `sales-deals-store.deals` stage history is a secondary reference only. | PLAN-VEHICLES-003 L45 |
| L19 | Insurance attachment rate definition | Attachment rate = count of `InsuranceLead` records created within 7 calendar days of a `SOLD` event for the same VIN, divided by total `SOLD` events in the period, per outlet. 7-day window is configurable via `INSURANCE_ATTACH_WINDOW_DAYS` constant in `lib/reports/constants.ts`. | Doc 04 §sales |
| L20 | Custom builds revenue contribution | Build job revenue contribution = sum of `BuildJob.quoteTotal` for jobs with `stage === 'DELIVERED'` in the period, per outlet. Outlet is determined by `BuildJob.outletId`. Contribution % = buildRevenue / totalRevenue. | SPEC-CUSTOM-BUILDS-001 L9 cost-ledger pattern |

---

## 2. Summary

Reports & Analytics is a read-only dashboard module for the BN Automobiles staff surface. It replaces the current stub at `apps/staff-web/app/(shell)/reports/page.tsx` ("Coming soon") with a structured KPI grid that draws on all five operational modules — Vehicles, Sales, Service, Insurance, and Custom Builds — plus the Staff module for utilisation metrics.

The module surfaces nine core KPIs (Outlet P&L, Sales Velocity, Inventory Aging, Service Turnaround SLA, Parts Margin, Insurance Attachment Rate, CPO Conversion, Custom Builds Revenue Contribution, and Staff Utilisation) across configurable time periods and outlet scopes. It is built on pure, client-side selector functions over existing Zustand stores, with no new store, no polling, and no external data dependencies beyond the stores already mounted in the app shell.

Phase plan:

| Phase | Scope |
|-------|-------|
| **P1** | KPI cards + sparkline trend lines + period filter + outlet scope toggle |
| **P2** | Drill-down panels (click KPI → SlideInPanel with breakdown table) |
| **P3** | Export to PDF (full styled report via print stylesheet + html2canvas stub) |

---

## 3. Goals & Non-Goals

### Goals

- Surface operational KPIs to GM (R19), CFO (R22), CEO (R24), and Sales Managers (R10) in a single dashboard without requiring them to navigate five separate module pages.
- Enforce city-scoped visibility per Doc 14 RBAC rules — R10 sees own outlet; R19+ see assigned or all outlets.
- Provide period-filtered views: Last 30 days, This FY, Last FY, Custom date range.
- Render trends as sparklines so direction of change is visible without a full chart.
- Remain within the app's zero-new-dependencies constraint (CLAUDE.md §12).

### Non-Goals (v1)

- Server-side aggregation or materialized query results (v1.5+).
- Real-time push updates (selectors run on Zustand change, no WebSocket).
- Drill-down tables (P2).
- Full PDF export with styled layout (P3).
- Custom report builder or ad-hoc query.
- Multi-currency support (INR only, per Doc 06).
- Historical comparison across more than two periods simultaneously.
- Any mutation of business data — this module is **read-only without exception**.

---

## 4. Users & Roles Affected

| Role | Code | Visibility | Scope |
|------|------|-----------|-------|
| Sales Manager | R10 | Own outlet only | Own outlet KPIs; no outlet toggle |
| General Manager | R19 | All outlets assigned | Outlet toggle enabled; cross-city view |
| CFO | R22 | All outlets | Full outlet toggle; P&L + commission view |
| CEO | R24 | All outlets | Full access; all KPIs |
| Sales Executive | R09 | None (no reports route entry) | — |
| Service Advisor | R09 equiv | None | — |
| DPO | R23 | None | — |

> Per Doc 14, the Reports sidebar entry is visible to R10+. R09 and below are excluded via `<Gate fallback="hide">`. R19 sees "All Outlets" option in the scope toggle. R22 sees the Outlet P&L KPI with cost breakdown. R24 sees everything R22 sees.

---

## 5. User Stories

Each story follows the GPA (Given / Perform / Assert) format. Story IDs `S-R-1` through `S-R-10`.

---

**S-R-1 — GM views cross-outlet sales velocity dashboard**

- **Given** a logged-in user with role R19 (GM), the vehicles-store has `SOLD` events for outlets BLR, MUM, CHE in the last 8 weeks.
- **When** the user navigates to `/reports` with the period filter set to "Last 30d" and the outlet scope set to "All Outlets".
- **Then** the Sales Velocity StatTile shows "cars sold per outlet per week" for the last 8 weeks, with an inline SVG sparkline showing the weekly trend. The outlet-scope toggle is visible and interactive. A breakdown shows BLR / MUM / CHE sub-totals.

---

**S-R-2 — CFO views Outlet P&L for a custom date range**

- **Given** a logged-in user with role R22 (CFO), the vehicles cost ledger has acquisition, refurb, and staff salary data for the period.
- **When** the user sets the period filter to "Custom" and enters a 90-day range (e.g., 2026-01-01 to 2026-03-31).
- **Then** the Outlet P&L StatTile renders `revenue − directCost − operatingCost` as a signed INR amount, formatted via `formatINR`. Revenue is the sum of `salePrice` from SOLD events. Direct cost is the sum of acquisition + refurb cost-ledger entries. Operating cost is the sum of staff gross salaries for the period.

---

**S-R-3 — Sales Manager views own-outlet inventory aging**

- **Given** a logged-in user with role R10 (Sales Manager), own outlet is BLR. Vehicles-store has 12 active listings with days-listed values spread across the five aging buckets.
- **When** the user views the Inventory Aging section with "This FY" selected.
- **Then** the Inventory Aging display shows a histogram (5 horizontal bars representing counts) for <30d / 30–60d / 60–90d / 90–180d / 180+ buckets. No data from MUM or CHE outlets is included. An outlet scope toggle is absent (R10 sees no toggle per L16).

---

**S-R-4 — Service workshop manager views SLA attainment**

- **Given** a logged-in user with role R09+ (Service), service-store has JobCards with `RECEIVED` and `DELIVERED` timestamps.
- **When** the user views `/reports` with "Last 30d" period.
- **Then** the Service Turnaround SLA StatTile shows median JC duration in days for own outlet, and a `StateChip` coloured green if median ≤ 5d, amber if 5–8d, red if > 8d.

---

**S-R-5 — CEO views insurance attachment rate trend**

- **Given** a logged-in user with role R24 (CEO), insurance-store has `InsuranceLead` records, vehicles-store has SOLD events.
- **When** the user views the Reports page with "Last FY" selected.
- **Then** the Insurance Attachment Rate StatTile shows a percentage (`insuranceLeadsWithin7d / totalSOLD × 100`) and a sparkline trending over the last 8 weeks (rolling 7-day windows).

---

**S-R-6 — GM views CPO conversion rate**

- **Given** a logged-in user with role R19 (GM), vehicles-store has vehicles tagged `cpoCertified: true`.
- **When** the user views the Reports page with "This FY" selected.
- **Then** the CPO Conversion StatTile shows `(CPO-certified vehicles SOLD / total CPO-certified ACTIVE listings) × 100` as a percentage. If there are no CPO-certified active listings, the tile shows `—` with `reports.noDataForPeriod` sub-caption (L9).

---

**S-R-7 — Sales Manager views custom builds revenue contribution**

- **Given** a logged-in user with role R10, custom-builds-store has `BuildJob` records with `stage === 'DELIVERED'`.
- **When** the user views the Reports page with "Last 30d" selected.
- **Then** the Custom Builds Revenue Contribution StatTile shows build revenue as an INR amount and contribution percentage vs total vehicle sales revenue. Only own-outlet build jobs are included.

---

**S-R-8 — KPI tile shows empty state when no data exists for period**

- **Given** a logged-in user with role R10, period is "Last FY" (2024-25), no SOLD events exist for that period in own outlet.
- **When** the user views the Sales Velocity StatTile.
- **Then** the tile shows `—` in the value slot and the caption `reports.noDataForPeriod`. No `NaN`, no `0` masquerading as "no data", no error boundary fires.

---

**S-R-9 — Ineligible role cannot access Reports**

- **Given** a logged-in user with role R09 (Sales Executive, below R10).
- **When** the user navigates to `/reports` directly (deep link).
- **Then** the shell renders a `<Gate fallback="hide">` wrapper that shows a "You do not have access to this section" notice (i18n key `common.accessDenied`). No KPI data is rendered.

---

**S-R-10 — Staff utilisation KPI reflects attendance data**

- **Given** a logged-in user with role R12+, staff-store has `AttendancePunch` records for service technicians in the current month.
- **When** the user views the Staff Utilisation StatTile with "Last 30d" selected.
- **Then** the tile shows hours-worked / hours-available as a percentage for service techs in own outlet. Hours available = 8h × working-day count in period. The tile also shows SAs: leads-handled / capacity as a sub-value.

---

## 6. Domain Model — Selector Contract

Reports has **no domain entities of its own**. It is a pure read-only projection layer over existing stores. No new Zod schemas, no new Prisma models, no new fixture files.

### 6.1 Input state contract

```ts
// lib/reports/types.ts

export interface ReportInputState {
  vehicles:      VehiclesStore;        // useVehiclesStore snapshot
  salesDeals:    SalesDealsStore;      // useSalesDealsStore snapshot
  service:       ServiceStore;         // useServiceStore snapshot
  insurance:     InsuranceStore;       // useInsuranceStore snapshot
  customBuilds:  CustomBuildsStore;    // useCustomBuildsStore snapshot
  staff:         StaffStore;           // useStaffStore snapshot
}

export type ReportPeriod = {
  kind: 'last30d' | 'thisFY' | 'lastFY' | 'custom';
  from: string;   // ISO date string, e.g. '2026-04-01'
  to:   string;   // ISO date string, inclusive, e.g. '2027-03-31'
};

export type ReportScope = {
  outletIds: string[];   // non-empty; e.g. ['BLR'] or ['BLR','MUM','CHE']
};

export type KpiValue =
  | { kind: 'currency';    value: number | null;   trend?: number[] }
  | { kind: 'percentage';  value: number | null;   trend?: number[] }
  | { kind: 'count';       value: number | null;   trend?: number[] }
  | { kind: 'days';        value: number | null;   trend?: number[] }
  | { kind: 'histogram';   buckets: { label: string; count: number }[] }
  | { kind: 'deferred' }; // rendered as '—' with deferred notice (L14)
```

### 6.2 Selector signatures

Each selector is a **pure function** — no side effects, no store reads, no hooks:

```ts
// lib/reports/selectors/p-and-l-selectors.ts
export function selectOutletPnL(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'currency'

// lib/reports/selectors/sales-selectors.ts
export function selectSalesVelocity(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'count', trend: number[8] (weekly counts)

export function selectInventoryAging(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'histogram'

export function selectCpoConversion(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'percentage'

// lib/reports/selectors/service-selectors.ts
export function selectServiceSlaMedian(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'days'

// lib/reports/selectors/insurance-selectors.ts
export function selectInsuranceAttachmentRate(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'percentage', trend: number[8]

// lib/reports/selectors/parts-selectors.ts
export function selectPartsMarginPct(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'deferred' (DEF-REPORTS-4)

// lib/reports/selectors/custom-builds-selectors.ts
export function selectCustomBuildsRevContribution(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'percentage' + sub-value currency

// lib/reports/selectors/staff-selectors.ts
export function selectStaffUtilisation(
  state: ReportInputState, period: ReportPeriod, scope: ReportScope
): KpiValue   // kind: 'percentage'
```

### 6.3 KPI computation formulas

| KPI | Formula | Source stores | Audience |
|-----|---------|---------------|----------|
| **Outlet P&L** | `revenue − directCost − operatingCost`. Revenue = `sum(salesEvent.salePrice WHERE kind='SOLD', outletId IN scope, date IN period)`. Direct cost = `sum(costLedger.amount WHERE category IN ['acquisition','refurb','parts'], vin SOLD in period, outlet IN scope)`. Operating cost = `sum(staffProfile.grossSalary × daysInPeriod / totalDaysInMonth WHERE outletId IN scope)` (pro-rated monthly gross). | vehicles-store (salesEvents + costLedger), staff-store | R19+ |
| **Sales velocity** | `count(SOLD events per week per outlet)`, 8-week rolling window ending at `period.to`. Returns `trend: number[8]`. | vehicles-store.salesEvents | R10+ own outlet; R19+ all |
| **Inventory aging** | For each VIN with `listingStatus === 'ACTIVE'` and `outletId IN scope`: compute `daysListed = today − listingCreatedAt`. Bucket into `<30 / 30-60 / 60-90 / 90-180 / 180+`. Return histogram. | vehicles-store.vehicles | R10+ |
| **Service turnaround SLA** | `median(deliveredAt − receivedAt IN days)` for JC with `status === 'DELIVERED'`, `outletId IN scope`, `deliveredAt IN period`. SLA target = 5 days (constant `SERVICE_SLA_TARGET_DAYS = 5` in `lib/reports/constants.ts`, configurable per Doc 05). | service-store.jobCards | R09+ own outlet |
| **Parts margin %** | `(salePrice − costPrice) / salePrice × 100` per part SKU, rolling 90d. **Deferred** — parts-store does not expose `costPrice` cleanly in v1. Renders as `DEF-REPORTS-4` tile. | parts-store (DEF-REPORTS-4) | R10+ |
| **Insurance attachment rate** | `count(InsuranceLead WHERE createdAt ≤ soldAt + 7d AND vin IN SOLD_VINs) / count(SOLD events) × 100`. Window defined by `INSURANCE_ATTACH_WINDOW_DAYS = 7`. | insurance-store.leads + vehicles-store.salesEvents | R10+ |
| **CPO conversion** | `count(vehicles WHERE cpoCertified AND state='SOLD' AND date IN period) / count(vehicles WHERE cpoCertified AND listingStatus='ACTIVE') × 100`. | vehicles-store.vehicles | R10+ |
| **Custom builds revenue contribution** | `sum(BuildJob.quoteTotal WHERE stage='DELIVERED' AND outletId IN scope AND deliveredAt IN period) / totalRevenue × 100`. `totalRevenue` = P&L revenue (reuses `selectOutletPnL` sub-value). | custom-builds-store.buildJobs | R10+ |
| **Staff utilisation** | Tech utilisation = `sum(AttendancePunch.hoursWorked WHERE staffProfile.role IN TECH_ROLES AND outletId IN scope AND date IN period) / (8 × workingDays × techCount) × 100`. SA utilisation = `count(SOLD events WHERE advisorId IN SA_IDS AND period) / (capacity × workingDays)`. | staff-store + vehicles-store.salesEvents | R12+ |

---

## 7. State Machine

**Not applicable.** This module makes no state mutations. All stores remain write-only from the perspective of their own domains. Reports only reads.

The `reports` domain has no state machine, no status transitions, no event emission.

---

## 8. API Contracts

**None in v1.** All data is sourced from client-side Zustand stores initialised via MSW mock handlers. API stubs for future wiring:

```ts
// Future: GET /api/reports/outlet-pnl?from=&to=&outletIds=
// Future: GET /api/reports/sales-velocity?from=&to=&outletIds=
// Future: GET /api/reports/inventory-aging?outletIds=
// Future: GET /api/reports/service-sla?from=&to=&outletIds=
// Future: GET /api/reports/insurance-attach?from=&to=&outletIds=
// Future: GET /api/reports/staff-utilisation?from=&to=&outletIds=
```

All future endpoints will accept `outletIds` as a comma-separated string. Backend will enforce RBAC server-side (same scope as L4). Response shape mirrors `KpiValue` union type above.

---

## 9. UI/UX Outline

> **Mandatory reference:** `SPEC-ARCH-UI-001`. Every primitive below is imported from that spec's component set. No local re-implementations.

### 9.1 Page structure

Route: `apps/staff-web/app/(shell)/reports/page.tsx`

```
<page>
  ├── <PageHeader>               title "Reports & Analytics"
  │     └── <PeriodFilter>       Last 30d | This FY | Last FY | Custom   [right-aligned]
  │
  ├── <OutletScopeToggle>        [R19+ only — Gate fallback="hide"]
  │     checkbox pills: BLR | MUM | CHE | All Outlets
  │
  ├── <SectionHeading>           "Business Performance"
  │     └── <KpiGrid 3-col>      Outlet P&L | Sales Velocity | Service Turnaround SLA
  │
  ├── <SectionHeading>           "Sales & Inventory"
  │     └── <KpiGrid 3-col>      Inventory Aging | CPO Conversion | Custom Builds Revenue
  │
  ├── <SectionHeading>           "Insurance & Staff"
  │     └── <KpiGrid 3-col>      Insurance Attachment Rate | Staff Utilisation | Parts Margin %
  │
  └── <PrintButton>              "Print / Export PDF" — info toast stub (L6 / DEF-REPORTS-6)
```

### 9.2 `StatTile` usage (per SPEC-ARCH-UI-001 §3.4)

Each KPI renders as a `StatTile` from `SPEC-ARCH-UI-001`. Canonical markup:

```tsx
<div className="rounded-md border border-line bg-bg-surface p-4">
  <p className="text-xs text-ink-muted uppercase tracking-wider">{label}</p>
  <div className="mt-2">{value}</div>
  {trend && <InlineSparkline data={trend} className="mt-2" />}
  {subtitle && <p className="text-xs text-ink-muted mt-1">{subtitle}</p>}
</div>
```

KPI value typography:
- Currency (P&L): `font-mono text-base text-ink-primary tabular-nums` — use `formatINR(value)`
- Percentage: `font-mono text-base text-ink-primary tabular-nums` — `value.toFixed(1) + '%'`
- Count: `font-mono text-base text-ink-primary tabular-nums`
- Days: `font-mono text-base text-ink-primary tabular-nums` + ` d` suffix
- Empty / deferred: `text-base text-ink-muted` value `—`

### 9.3 `InlineSparkline` component

File: `apps/staff-web/src/components/reports/inline-sparkline.tsx`

Props:
```ts
interface InlineSparklineProps {
  data: number[];    // 8 data points; sparkline shows trend, not absolute values
  width?: number;    // defaults 80
  height?: number;   // defaults 24
  className?: string;
}
```

Renders an inline SVG `<polyline>` connecting normalised data points. Color: `stroke-accent`. Line width: `stroke-width="1.5"`. No axes, no labels, no fill. If `data.length < 2` or all values are equal, renders a flat line (no error). Respects `prefers-reduced-motion` — when motion is reduced, render static flat line with final value only.

### 9.4 `PeriodFilter` component

File: `apps/staff-web/src/components/reports/period-filter.tsx`

Renders four toggle buttons: Last 30d | This FY | Last FY | Custom. Active button: `bg-accent text-white rounded-md px-3 py-1.5 text-sm`. Inactive: `border border-line rounded-md px-3 py-1.5 text-sm text-ink-secondary hover:border-ink-secondary`. "Custom" opens a date-range picker Dialog (size="sm") with two `<input type="date">` fields.

### 9.5 `OutletScopeToggle` component

File: `apps/staff-web/src/components/reports/outlet-scope-toggle.tsx`

Visible only to R19+. Wrapped in `<Gate role={['R19','R22','R24']} fallback="hide">`. Renders pill-style checkboxes for each outlet + an "All Outlets" shortcut. Multi-select. Minimum 1 outlet must remain selected (cannot deselect all). On deselect-all attempt, the last selected outlet stays ticked.

### 9.6 Inventory Aging histogram

The Inventory Aging KPI uses a custom `InventoryAgingHistogram` component instead of a StatTile value slot:

File: `apps/staff-web/src/components/reports/inventory-aging-histogram.tsx`

Five horizontal bar rows. Each bar: `bg-accent rounded-sm h-2` with width proportional to bucket count / max-bucket-count × 100%. Label: `text-xs text-ink-muted`. Count badge: `font-mono text-xs text-ink-primary`. 90+ day bars have a `StateChip` status indicator: 90–180d → `state-pending` tint, 180+d → `state-overdue` tint (per SPEC-ARCH-UI-001 §4 banner token set, applied as `bg-[rgb(var(--state-overdue)/0.08)]` on the bar row). This aligns with the "red ≥ 180d" aging chip defined in PLAN-VEHICLES-003 L23.

### 9.7 Grid layout

KPI grid uses the 12-column canonical layout:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* StatTile per KPI */}
</div>
```

Maximum 3 tiles per row on large screens. Per SPEC-ARCH-UI-001 §8 (Card grid `grid grid-cols-1 md:grid-cols-2 gap-6` for 2-col; extended here to 3-col at lg breakpoint for the reports surface which is wider).

---

## 10. Notifications

**Not applicable in v1.** Reports is a read-only surface. No notification triggers, no DLT SMS, no WhatsApp templates.

DEF-REPORTS-7: A future P4 feature may add scheduled email digests (daily P&L summary for R22+). Tracked as deferred.

---

## 11. i18n Keys

All keys live under `messages/en-IN/reports.json` and `messages/hi-IN/reports.json`. Hi-IN values use English fallback initially; keys must exist.

```json
{
  "reports": {
    "title": "Reports & Analytics",
    "period": {
      "last30d": "Last 30 days",
      "thisFY": "This Financial Year",
      "lastFY": "Last Financial Year",
      "custom": "Custom range",
      "customFrom": "From",
      "customTo": "To",
      "apply": "Apply"
    },
    "scope": {
      "label": "Outlet scope",
      "allOutlets": "All Outlets"
    },
    "sections": {
      "businessPerformance": "Business Performance",
      "salesInventory": "Sales & Inventory",
      "insuranceStaff": "Insurance & Staff"
    },
    "kpi": {
      "outletPnL":              "Outlet P&L",
      "salesVelocity":          "Sales Velocity",
      "salesVelocityUnit":      "cars / week",
      "inventoryAging":         "Inventory Aging",
      "agingBucket_lt30":       "< 30 days",
      "agingBucket_30_60":      "30 – 60 days",
      "agingBucket_60_90":      "60 – 90 days",
      "agingBucket_90_180":     "90 – 180 days",
      "agingBucket_180plus":    "180+ days",
      "serviceSla":             "Service Turnaround SLA",
      "serviceSlaUnit":         "days (median)",
      "serviceSlaTarget":       "Target: 5 days",
      "partsMargin":            "Parts Margin %",
      "insuranceAttach":        "Insurance Attach Rate",
      "cpoConversion":          "CPO Conversion",
      "customBuildsRevenue":    "Custom Builds Revenue",
      "staffUtilisation":       "Staff Utilisation",
      "staffUtilTech":          "Technicians",
      "staffUtilSa":            "Sales Advisors"
    },
    "noDataForPeriod":          "No data for this period",
    "partsMarginDeferredNotice":"Parts cost data coming in a future release",
    "printButton":              "Print / Export PDF",
    "printComingSoon":          "PDF export with full styling coming in P3",
    "accessDenied":             "You do not have access to this section"
  }
}
```

Total new i18n keys: **34**.

---

## 12. Permissions Matrix

Per Doc 14 §RBAC. Enforced at selector level (L4) and UI level via `<Gate>`.

| Feature | R09 | R10 | R12 | R19 | R22 | R24 |
|---------|-----|-----|-----|-----|-----|-----|
| View Reports page | ✗ | ✓ own outlet | ✓ own outlet | ✓ all outlets | ✓ all outlets | ✓ all outlets |
| Outlet scope toggle | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Outlet P&L KPI | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Sales Velocity | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inventory Aging | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Service SLA | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Parts Margin % | ✗ | ✓ (deferred) | ✓ (deferred) | ✓ (deferred) | ✓ (deferred) | ✓ (deferred) |
| Insurance Attach | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CPO Conversion | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Custom Builds Rev | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Staff Utilisation | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Export / Print | ✗ | ✓ (stub) | ✓ (stub) | ✓ (stub) | ✓ (stub) | ✓ (stub) |

R09 is excluded from the sidebar Reports entry entirely. An R09 user deep-linking to `/reports` sees the access-denied notice via `<Gate fallback="hide">` wrapper on the page content.

---

## 13. Privacy & DPDP Compliance

Reports is an **aggregation-only** surface. It computes population-level summaries (e.g., total SOLD count, median JC duration) and never renders individual customer PII.

**Rules enforced by the selector layer:**

1. Selectors return aggregate `KpiValue` objects — never raw customer records, staff PII, or per-customer financial details.
2. No PII field (Aadhaar last-4, PAN, phone, email, address) is passed into any KPI value slot.
3. Staff utilisation KPI uses staff profiles by role group count, not by individual named staff member.
4. The `OutletPnL` selector returns a single signed INR figure, not a per-customer revenue breakdown.

**No new PII collection.** Reports reads existing data; it does not create new consent records, new `DocumentAccessEvent` entries, or any new data principal interaction.

**DPDP Act 2023 compliance:** The analytics module derives entirely from data already processed under existing purpose disclosures (vehicle acquisition, service delivery, sales processing). No new processing purposes are introduced. No data is exported to a third party in v1.

---

## 14. Non-Functional Requirements (NFRs)

Per Doc 12 §non-functional:

| NFR | Requirement | Measurement |
|-----|-------------|-------------|
| **Page load** | Reports page must render all KPI cards in < 2 seconds with the full fixture dataset loaded into all stores. | Measured from navigation start to `LCP` (Largest Contentful Paint). Sparklines may lazy-load within 500ms additional (L17). |
| **Selector performance** | Each selector must complete in < 50ms on the fixture dataset (fixture dataset = ~500 vehicles, ~200 SOLD events, ~150 JC records, ~100 insurance leads). | Measured via `console.time` in development mode; formal perf test in Vitest using `vi.useFakeTimers`. |
| **Bundle impact** | Zero new npm dependencies. `InlineSparkline` is pure SVG. No charting library. | `pnpm build` output diff must show zero new packages in `node_modules` vs pre-reports baseline. |
| **Accessibility** | All KPI tiles meet WCAG 2.1 AA contrast. Sparklines include `<title>` element with textual trend description for screen readers. Period filter and outlet toggle are keyboard-navigable. | SPEC-ARCH-UI-001 §13 accessibility checklist. |
| **Typecheck** | `pnpm -F staff-web typecheck` exits 0 after reports implementation. | Pre-merge gate. |

---

## 15. Failure Modes

| Failure | Behaviour |
|---------|-----------|
| **Store not yet hydrated** (`vehicles-store.hydrated === false`) | All selectors return `{ kind: 'count', value: null }`. Page renders all StatTiles with `—` value and a top-level Info Banner (SPEC-ARCH-UI-001 §4.2): "Loading data…". No spinner loop; banner disappears when `hydrated` flips to `true`. |
| **Empty fixture for a store** (service-store has no JC records) | Selector returns `{ kind: 'days', value: null }`. StatTile renders `—`. Caption: `reports.noDataForPeriod`. |
| **Cross-outlet read by ineligible role** (R10 passes multiple outletIds) | Selector enforces scope from the session user's profile — it ignores `scope.outletIds` values that the user is not authorised for. The `useReportScope` hook builds scope from `useStaffAuth().user.outletId` for R10 and below. R10 cannot override scope via URL params. |
| **Custom date range `from > to`** | `PeriodFilter` validates on blur: if `from > to`, shows inline error `text-xs text-state-danger`: "Start date must be before end date." Apply button is disabled. Selector is not called. |
| **All KPIs show `—`** (e.g., new outlet with no data) | Page renders normally with all tiles showing `—`. No error boundary fires. An Info Banner top: "No data available for this outlet and period. Start by recording sales and service events." |
| **Selector throws** (unexpected data shape) | `useKpiValues` hook wraps each selector call in `try/catch`. On throw: logs to `console.error` with selector name + error; returns `{ kind: 'count', value: null }` for that KPI. Error toast: "One or more KPIs could not be computed. Try refreshing." |

---

## 16. Test Scenarios

Every scenario maps 1:1 to a user story. Test files follow the binding from CLAUDE.md §10 DoD #9:
- Selector unit tests: `apps/staff-web/src/lib/reports/__tests__/`
- Integration tests: `apps/staff-web/src/tests/reports.test.ts`
- Component tests: `apps/staff-web/src/components/reports/__tests__/`

| Test ID | Scenario | Test type | Assertion |
|---------|----------|-----------|-----------|
| T-R-1 | S-R-1: Sales velocity with SOLD events | Selector unit | `selectSalesVelocity` returns `trend: number[8]` with correct weekly counts; outlet scoping filters BLR-only for single-outlet scope |
| T-R-2 | S-R-2: P&L with cost-ledger entries | Selector unit | `selectOutletPnL` returns `revenue − directCost − operatingCost`; negative P&L renders as negative INR with `−` prefix |
| T-R-3 | S-R-3: Inventory aging histogram | Selector unit | Vehicles in each aging bucket are counted correctly; vehicles from other outlets excluded when scope = ['BLR'] |
| T-R-4 | S-R-4: Service SLA median | Selector unit | Median computed correctly for 5 JC durations; SLA chip green when median = 4d, amber at 6d, red at 9d |
| T-R-5 | S-R-5: Insurance attachment rate | Selector unit | `insuranceLead.createdAt ≤ soldAt + 7d` logic; leads outside 7-day window not counted; percentage correctly computed |
| T-R-6 | S-R-6: CPO conversion empty state | Selector unit | Zero active CPO-certified listings → `{ kind: 'percentage', value: null }` → StatTile renders `—` |
| T-R-7 | S-R-7: Custom builds contribution | Selector unit | DELIVERED build jobs summed; contribution % = buildRevenue / totalRevenue; outlet filter applied |
| T-R-8 | S-R-8: Empty state `—` rendering | Component unit | `StatTile` with `value: null` renders `—` and `reports.noDataForPeriod` sub-caption; no `NaN`, no `0` |
| T-R-9 | S-R-9: R09 access denied | Integration | `/reports` with R09 mock auth returns access-denied Gate; no KPI DOM elements present |
| T-R-10 | S-R-10: Staff utilisation selector | Selector unit | Hours-worked sum from AttendancePunch records; percentage capped at 100% for over-utilised periods |
| T-R-11 | FY period boundary | Selector unit | `thisFYPeriod()` returns `{ from: '2026-04-01', to: '2027-03-31' }` when today = 2026-04-29; `lastFYPeriod()` returns `{ from: '2025-04-01', to: '2026-03-31' }` |
| T-R-12 | Custom range `from > to` | Component unit | PeriodFilter disables Apply and shows error message |
| T-R-13 | Sparkline with < 2 data points | Component unit | `InlineSparkline` with `data.length === 1` renders a flat line without throwing |
| T-R-14 | Store not hydrated | Integration | When `vehicles.hydrated === false`, all StatTiles render `—`; Info Banner "Loading data…" is present |
| T-R-15 | Cross-outlet scope enforcement | Selector unit | `selectSalesVelocity` with `scope.outletIds = ['BLR','MUM']` excludes CHE events; R10-scope builder produces single outletId |

---

## 17. Open Items & Deferred Items Registry

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| DEF-REPORTS-1 | Server-side aggregation endpoint | P2 (v1.5) | Adds `/api/reports/*` query layer. Selector function signatures already designed as the response shape contract (§6.2). |
| DEF-REPORTS-2 | Drill-down panels (P2) | P2 | Click a StatTile → SlideInPanel with sortable breakdown table. E.g., Sales Velocity → per-week table with VIN list per week. |
| DEF-REPORTS-3 | Scheduled email digest | P4 | Daily / weekly P&L email to R22+. Requires Notifications module (A3) + email template DLT registration. |
| DEF-REPORTS-4 | Parts margin % KPI | P2 | Blocked on parts-store exposing `costPrice` per SKU. When unblocked: remove `kind: 'deferred'` branch; implement `selectPartsMarginPct` fully. |
| DEF-REPORTS-5 | Service-to-sale conversion KPI | P2 | From Theme B4 roadmap item: JC detail "upgrade-ready" → lead → SOLD conversion rate. Blocked on Lead module (B1). |
| DEF-REPORTS-6 | PDF export (P3) | P3 | Full styled PDF via `window.print()` + print stylesheet OR html2canvas fallback. P1 ships `info` toast stub. |
| DEF-REPORTS-7 | NPS tile | P3 | Post-delivery + post-service NPS aggregate. Blocked on Reviews module (C3 roadmap). |
| DEF-REPORTS-8 | Competitor pricing intelligence | P3 | Aged inventory pricing suggestion (B3 roadmap). Mock fixture from static JSON in v1. |

---

## 18. Dependencies on Other Specs

| Spec | Dependency type | Why |
|------|----------------|-----|
| `SPEC-VEHICLES-001` | Read — `vehicles`, `ownerships`, `salesEvents`, `costLedger` | Source for P&L revenue, sales velocity, inventory aging, CPO conversion |
| `SPEC-CUSTOMERS-001` | Read — `customers` | Customer count per outlet (future NPS KPI) |
| `SPEC-INSURANCE-001` | Read — `leads`, `policies` | Insurance attachment rate |
| `SPEC-CUSTOM-BUILDS-001` | Read — `buildJobs` | Custom builds revenue contribution |
| `SPEC-STAFF-001` | Read — `staffProfiles`, `attendancePunches` | Staff utilisation; operating cost (salary) |
| `SPEC-ARCH-UI-001` | UI primitive contract | StatTile, Card, Gate, Banner, Dialog primitives |
| `PLAN-VEHICLES-003` | L23 (aging chips), L45 (fixture coverage) | Inventory aging colour rules; single-source-of-truth rule for SOLD events |

---

## 19. Cross-Module Wiring — New Seams

The Reports module adds **8 read-only seams** to `specs/architecture/cross-module-wiring.md`. These are consumer seams — Reports reads; it never writes back. All seams follow the Core Invariants established in that document (UI-layer only, stores stay pure).

| Seam # | Name | Source → Target | Nature |
|--------|------|-----------------|--------|
| 18 | Vehicles → Reports (P&L revenue) | `vehicles-store.salesEvents[].salePrice` → `selectOutletPnL` | Read-only selector |
| 19 | Vehicles → Reports (cost ledger) | `vehicles-store.costLedger[].amount` → `selectOutletPnL` | Read-only selector |
| 20 | Vehicles → Reports (inventory aging) | `vehicles-store.vehicles` (listingStatus, listingCreatedAt) → `selectInventoryAging` | Read-only selector |
| 21 | Vehicles → Reports (sales velocity) | `vehicles-store.salesEvents` (kind='SOLD', eventAt) → `selectSalesVelocity` | Read-only selector |
| 22 | Service → Reports (SLA) | `service-store.jobCards` (status, receivedAt, deliveredAt) → `selectServiceSlaMedian` | Read-only selector |
| 23 | Insurance → Reports (attachment rate) | `insurance-store.leads` (createdAt, vin) → `selectInsuranceAttachmentRate` | Read-only selector |
| 24 | Custom Builds → Reports (revenue) | `custom-builds-store.buildJobs` (stage, quoteTotal, deliveredAt, outletId) → `selectCustomBuildsRevContribution` | Read-only selector |
| 25 | Staff → Reports (utilisation + P&L cost) | `staff-store.attendancePunches`, `staff-store.staffProfiles[].grossSalary` → `selectStaffUtilisation`, `selectOutletPnL` | Read-only selector |

---

## 20. Phase Plan

### P1 — KPI cards + trend sparklines (MVP)

**Scope:**
- Page route at `app/(shell)/reports/page.tsx` — replaces stub
- `lib/reports/selectors/` — all 8 selector files (parts-margin returns `kind:'deferred'`)
- `lib/reports/types.ts`, `lib/reports/period.ts`, `lib/reports/constants.ts`, `lib/reports/format.ts`
- `components/reports/inline-sparkline.tsx`
- `components/reports/period-filter.tsx`
- `components/reports/outlet-scope-toggle.tsx`
- `components/reports/inventory-aging-histogram.tsx`
- `components/reports/kpi-grid.tsx`
- i18n keys in `messages/en-IN/reports.json` and `messages/hi-IN/reports.json`
- Unit tests for all 8 selectors (T-R-1 through T-R-10)
- Integration tests T-R-11 through T-R-15

**Acceptance gate:** all StatTiles render with real fixture data; sparklines visible; period filter switches data; R09 sees access-denied; R10 sees own-outlet data; R19 sees outlet toggle.

### P2 — Drill-down panels

**Scope:**
- Clicking any StatTile opens a `SlideInPanel` with a sortable breakdown table (per SPEC-ARCH-UI-001 §3.7)
- Parts Margin % implemented (DEF-REPORTS-4 resolved, depends on parts-store costPrice exposure)
- Service-to-sale conversion KPI (DEF-REPORTS-5 resolved, depends on Lead module B1)

### P3 — Export to PDF

**Scope:**
- Full print stylesheet (`@media print`) for the reports page
- `html2canvas` or browser-native print-to-PDF stub upgraded to production-grade export
- Scheduled email digest (DEF-REPORTS-3) if Notifications module (A3) ships

---

## 21. Acceptance Criteria

The following checklist implements the Production-Grade Checklist from CLAUDE.md §17. Every item must be ticked before marking P1 shipped.

### DoD §10 items (CLAUDE.md §10)

| # | Criterion | Verification approach |
|---|-----------|----------------------|
| 1 | Spec exists, approved, co-located | This file at `specs/modules/reports/01-reports-analytics.md`, status: `approved` |
| 2 | Empty, loading, error, success states | StatTile with `value: null` renders `—`; hydration Info Banner present when `hydrated === false`; selector `try/catch` returns null on error; successful render shows real KPI values |
| 3 | Accessibility: keyboard nav, focus rings, contrast AA | PeriodFilter buttons are keyboard-navigable; outlet toggle pills have visible focus rings; all `ink-*` / `bg-*` combinations meet AA; sparklines have `<title>` for screen readers |
| 4 | Mobile + tablet + desktop breakpoints | Reports page grid collapses to 1-col on mobile (< md), 2-col on tablet (md), 3-col on desktop (lg+). Period filter wraps gracefully. Outlet toggle scrolls horizontally on mobile. |
| 5 | Mocked data covers happy path + 2 edge cases | Happy path: fixture data renders 8 KPIs with values. Edge case 1: empty period (no SOLD events → all `—`). Edge case 2: hydration pending (loading banner). |
| 6 | RBAC gates visible via `Gate` primitive | Outlet scope toggle: `<Gate role={['R19','R22','R24']} fallback="hide">`. P&L KPI tile: `<Gate role={['R19','R22','R24']} fallback="hide">`. Staff utilisation: `<Gate role={['R12','R13','R19','R22','R24']} fallback="hide">`. No inline `hasRank` in JSX. |
| 7 | i18n: no hardcoded strings | All 34 keys in `reports.*` namespace used throughout. No hardcoded English strings. |
| 8 | Storybook story for every component | Stories for: `InlineSparkline`, `PeriodFilter`, `OutletScopeToggle`, `InventoryAgingHistogram`, `KpiGrid`. Each story covers loaded + empty states. |
| 9 | Unit tests for logic; ≥1 integration test per scenario | 15 test cases listed in §16; selector tests in `lib/reports/__tests__/`; integration test in `src/tests/reports.test.ts` |
| 10 | Reviewer signed off on diff | Code-reviewer agent sign-off required before merge |
| 11 | Typecheck clean | `pnpm -F staff-web typecheck` exits 0 |
| 12 | No `text-[NNpx]` outside approved exceptions | Grep check: `grep -rE 'text-\[[0-9]+px\]' apps/staff-web/src/components/reports apps/staff-web/src/lib/reports` returns 0 matches |
| 13 | No `rounded-lg/xl` outside approved exceptions | Grep: `grep -r 'rounded-xl\|rounded-lg' apps/staff-web/src/components/reports` returns 0 matches |
| 14 | Spec-drift check | L1–L20 each greppable in selector/component code via `// L<N>:` comments; no undocumented KPI behavior |
| 15 | Every CTA wired | Print/Export button fires `info` toast (not silent no-op) per L6; period filter Apply fires selector recalculation; outlet toggle fires scope change |

### Production-grade additions (CLAUDE.md §17)

| Criterion | Verification |
|-----------|-------------|
| Every CTA wired — no silent no-ops | Print button → info toast. Period Apply → recalculates. All confirmed in T-R tests. |
| Empty / loading / error / success present | §15 Failure Modes covers all four states. |
| RBAC via `Gate` primitive — no inline `hasRank` | Enforced at page + component level. Code review grep: `grep -r 'hasRank' apps/staff-web/src/components/reports` = 0. |
| All strings via `next-intl` — keys in en-IN AND hi-IN | 34 keys confirmed in §11; hi-IN keys exist with English fallback. |
| No `any` without justification comment | Selectors use typed `ReportInputState`. Any unavoidable `any` carries `// reason:` comment. |
| No `text-[NNpx]`, no `rounded-lg/xl` outside exceptions | Confirmed by grep gate in DoD #12 and #13. |
| Card / StatTile reused from SPEC-ARCH-UI-001 | `StatTile` markup per §3.4. `Card` from `custom-builds/shared/detail-card`. No local redefinitions. |
| Hooks before conditional returns | `useVehiclesStore`, `useSalesDealsStore`, `useServiceStore`, `useInsuranceStore`, `useCustomBuildsStore`, `useStaffStore` all called unconditionally at top of `useReportData` custom hook. |
| Zustand selectors return base refs; computation in `useMemo` | L10 enforced. `useReportData` hook: stores → base refs → `useMemo(selector, [refs, period, scope])`. |
| No confirmation dialog needed (read-only module) | N/A — no destructive actions exist. |
| PII not concatenated into logs / toasts | Selectors return aggregate values only. No customer name/phone/email in any KPI value slot. |
| Tests: unit + integration | §16 test table: 15 tests across unit + integration layers. |
| Typecheck + test suite green | CI gate; no new failures introduced. |
| Spec bumped if behavior changed | Spec version in frontmatter bumped for any material change to selector formulas or locked decisions. |

### L-tag honor check

| L-tag | Evidence in code |
|-------|-----------------|
| L1 | No `reports-store.ts` file exists; grep `reports-store` returns 0 |
| L2 | `lib/reports/selectors/*.ts` — pure functions, no server actions |
| L3 | `lib/reports/period.ts` `thisFYPeriod()` uses April 1 / March 31 boundary |
| L4 | `selectOutletPnL` and all selectors filter by `scope.outletIds`; `useReportScope` hook builds scope from auth |
| L5 | No charting library in `package.json`; `InlineSparkline` uses `<svg><polyline>` only |
| L6 | Print button fires `info` toast with `reports.printComingSoon`; no `window.print()` real call in P1 |
| L7 | No `setInterval` in `useReportData`; re-derives on Zustand subscription change |
| L8 | `formatINR` imported from `@dms/vehicles-core` (or `lib/reports/format.ts`); percentages use `.toFixed(1)` |
| L9 | StatTile value slot checks `value === null` before rendering; renders `—` with caption |
| L10 | `useReportData` hook: store reads at top, then `useMemo`; no selector call inside Zustand selector |
| L11 | Files exist at `lib/reports/selectors/*.ts` |
| L12 | `thisFYPeriod()` / `lastFYPeriod()` / `last30dPeriod()` in `lib/reports/period.ts` |
| L13 | Selector validates `scope.outletIds.length > 0` |
| L14 | `selectPartsMarginPct` returns `{ kind: 'deferred' }`; tile shows deferred notice |
| L15 | Staff utilisation uses `AttendancePunch[]`; `hoursAvailable = 8 × workingDays × techCount` |
| L16 | `OutletScopeToggle` wrapped in `<Gate role={['R19','R22','R24']}>` |
| L17 | `InlineSparkline` wrapped in `React.lazy` + `Suspense` |
| L18 | `selectSalesVelocity` reads `vehicles-store.salesEvents[].kind === 'SOLD'` |
| L19 | `INSURANCE_ATTACH_WINDOW_DAYS = 7` in `lib/reports/constants.ts` |
| L20 | `selectCustomBuildsRevContribution` reads `BuildJob.stage === 'DELIVERED'` |

---

## 22. Spec Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | orchestrator | Initial spec. 20 locked decisions, 9 KPIs, 10 user stories, 15 test scenarios, 8 cross-module seams (18–25), 8 deferred items. |

---

*This spec is the source of truth for SPEC-REPORTS-001 v1.0. Implementers must read `SPEC-ARCH-UI-001` and `cross-module-wiring.md` before touching any file in this domain.*
