---
spec_id: SPEC-SERVICE-SALE-001
domain: service
title: Service-to-Sale Upgrade Loop (Theme B4)
status: approved
risk_level: low
pii_sensitivity: low
flags: [service-to-sale]
owners: [orchestrator]
depends_on:
  - SPEC-VEHICLES-001
  - SPEC-REPORTS-001
  - SPEC-ARCH-UI-001
docs_consulted:
  - Doc 01 §1 (service-to-sale loop; "the sale happens once; service happens for years")
  - Doc 04 §sales (lead intake, B1 funnel)
  - Doc 05 §1 (service guiding principle)
  - Doc 14 §RBAC (R09 Service Advisor eligibility to see and act)
version: 1.0
created: 2026-04-30
---

# SPEC-SERVICE-SALE-001 — Service-to-Sale Upgrade Loop

---

## 1. Locked Decisions

| Tag | Title | Decision | Source |
|-----|-------|----------|--------|
| L1 | Eligibility thresholds are hardcoded in v1 | Age threshold: **5 years** (vehicle `year` field; `currentYear − vehicleYear ≥ 5`). Odometer threshold: **70,000 km** (`jobCard.odometerIn ≥ 70_000`). Both values live in `upgrade-eligibility.ts` as named constants (`UPGRADE_AGE_YEARS = 5`, `UPGRADE_KM_THRESHOLD = 70_000`). They are tunable in v2 via the Settings module; hardcoded for v1 per brief. | Brief §Hard rules; CLAUDE.md §4 MVP philosophy |
| L2 | Recall data is a runtime fixture stub | No recall registry is wired to live government data in v1. Recalls are provided as a static `VehicleRecall[]` array passed into `isUpgradeReady`. The JC detail view constructs a stub list from a hardcoded VIN→recall map. A real recall integration (NHTSA-IN API or manufacturer feed) is DEF-SERVICE-SALE-1. | Brief §Hard rules; CLAUDE.md §15 stub vocab |
| L3 | Lead creation uses B1 store with graceful fallback | `isUpgradeReady(...).ready === true` → SA clicks "Create sales lead" → component calls `useLeadsStore.getState().createLead({ ..., source: 'SERVICE_UPGRADE', stage: 'NEW' })`. If `useLeadsStore` does not exist (B1 not yet shipped), the component catches the import error and fires an info toast: "Lead funnel ships in B1 — would create lead for {customerName}" and logs to `console.info`. The fallback is explicit and user-visible per CLAUDE.md §10 DoD #15. | Brief §stub fallback; CLAUDE.md §10 DoD #15 |
| L4 | Lead source value is the string literal `'SERVICE_UPGRADE'` | Used as `source` on the lead entity. This is the discriminant that the Reports selector uses to measure service→sale conversion. Must not be changed without bumping the Reports selector. | Brief §B4; PLAN-ROADMAP-001 B4 |
| L5 | Conversion rate definition | `selectServiceToSaleConversion` = (leads created from `source === 'SERVICE_UPGRADE'` that reached stage `CLOSED_WON` within period) / (total distinct JCs flagged as upgrade-eligible in period). Denominator is the count of DELIVERED/active JCs in scope + period where `isUpgradeReady` returns `ready: true`. Zero-divisor → `value: null` (not `0`) per L9 of SPEC-REPORTS-001. | Brief §Reports KPI; SPEC-REPORTS-001 L9 |
| L6 | Banner placement — above action bar | The upgrade-ready banner renders **above the action bar** (between the header block and the blocked-state banners). It does NOT replace the blocked banner. Both can coexist. | SPEC-ARCH-UI-001 §5 (banner patterns); Brief §B4 |
| L7 | RBAC — R09+ can see the banner; R09+ can create a lead | Gate: `['R09', 'R12', 'R19', 'R22', 'R24']`. The banner is hidden (`fallback="hide"`) for R11 (Technicians) and below. | Doc 14 §RBAC |
| L8 | Reasons array format | `isUpgradeReady` returns `reasons: Array<'age-over-5y' | 'km-over-70k' | 'open-recall'>`. All matched reasons are returned (not just the first). The banner renders each as a chip. | Brief §eligibility helper |
| L9 | Reports selector lives in `sales-selectors.ts` | `selectServiceToSaleConversion` is appended to the existing `apps/staff-web/src/lib/reports/selectors/sales-selectors.ts` file. It reads from `state.salesDeals` (leads in the B1 store when available; falls back to reading `state.service` for eligible JC denominator counting). | SPEC-REPORTS-001 L11 (selector module location) |
| L10 | KPI tile section — "Revenue Funnel" | A fourth section is added to `ReportsHubView` titled "Revenue Funnel" containing the `serviceToSaleConversion` KPI tile. This avoids disturbing the existing three sections (Business Performance, Sales & Inventory, Insurance & Staff). | SPEC-REPORTS-001 §9.1; SPEC-ARCH-UI-001 §3 |
| L11 | Eligibility check uses VehicleMaster year field | Vehicle age is computed as `new Date().getFullYear() − vehicleYear` where `vehicleYear` comes from `VehicleMaster.year` (the manufacture year integer from the shared type). The JC's `vin` is used to look up the master via `useVehiclesStore(s => s.vehicles[jc.vin])`. If no master is found, age-check is skipped (unknown vehicle does not trigger age reason). | SPEC-VEHICLES-001 §3.2; VehicleMaster type |
| L12 | No new module, no new sidebar entry | This feature extends the existing service module. No new `app/(shell)/service-to-sale/` route is created. No sidebar entry is added. | Brief §NO new module; PLAN-ROADMAP-001 B4 |
| L13 | seam-30 registered in cross-module-wiring.md | The JC detail view → leads store call is Seam 30. Service JC → Reports (service-to-sale conversion) is Seam 31. Both must be registered before code lands, per CLAUDE.md §6. | CLAUDE.md §6 cross-module wiring rule |

---

## 2. Summary

The Service-to-Sale Upgrade Loop (B4) surfaces "upgrade-ready" signals to Service Advisors during active job card handling. When a vehicle meets at least one eligibility criterion (age ≥ 5 years, odometer ≥ 70,000 km, or open recall), an inline banner appears on the Job Card detail view offering a one-click "Create sales lead" CTA. The lead is created in the B1 leads store (or gracefully degraded to a toast if B1 has not shipped). The resulting conversion metric — service-to-sale conversion rate — is surfaced on the Reports dashboard.

Per Doc 01 §1: "the sale happens once; service happens for years." This feature closes the upgrade loop by making service touchpoints into revenue-generating moments.

Phase plan:

| Phase | Scope |
|-------|-------|
| **P1** | Eligibility helper + JC banner + Reports KPI tile + tests |
| **P2** | Recall registry integration (real NHTSA-IN or manufacturer feed) |
| **P3** | Lead funnel deep-link from banner (B1 must have shipped) |

---

## 3. Goals & Non-Goals

### Goals
- Surface upgrade-ready signals to Service Advisors on the JC detail view.
- Create a lead in the B1 funnel from the service context with source `SERVICE_UPGRADE`.
- Track service→sale conversion rate on the Reports dashboard.
- Graceful fallback when B1 leads store is not yet available.

### Non-Goals
- Real recall data feed (deferred — DEF-SERVICE-SALE-1).
- Automated customer notifications (no outbound comms from this feature in v1).
- New module page or sidebar entry.
- Modifying the service store or vehicles store schemas.

---

## 4. User Stories

1. As a Service Advisor (R09), when I open a job card for a vehicle that is >5 years old, I see an "upgrade-ready" banner with an age chip and a "Create sales lead" button.
2. As a Service Advisor (R09), when I open a job card for a vehicle with >70,000 km on the odometer, I see the banner with a km chip.
3. As a Service Advisor (R09), when I open a job card for a vehicle with an open recall, I see the banner with a recall chip.
4. As a Service Advisor (R09), when multiple eligibility criteria are met, I see all reason chips in the banner.
5. As a Service Advisor (R09), when I click "Create sales lead," a lead is created and I see a success toast.
6. As a Service Advisor (R09), when B1 hasn't shipped and I click "Create sales lead," I see an info toast explaining the fallback.
7. As a GM (R19), I can see the service-to-sale conversion rate on the Reports dashboard.
8. As a Technician (R11), I do NOT see the upgrade-ready banner (RBAC gate hides it).

---

## 5. Eligibility Logic

```
isUpgradeReady(vehicle: VehicleMaster | null, jobCard: JobCard, recalls: VehicleRecall[]): UpgradeReadinessResult

Where UpgradeReadinessResult = { ready: boolean; reasons: UpgradeReason[] }
And   UpgradeReason = 'age-over-5y' | 'km-over-70k' | 'open-recall'
```

Criteria (all independent; any one triggers `ready: true`):

| ID | Criterion | Check |
|----|-----------|-------|
| C1 | Age ≥ 5 years | `vehicle !== null && (currentYear − vehicle.year) >= UPGRADE_AGE_YEARS` |
| C2 | Odometer ≥ 70,000 km | `jobCard.odometerIn >= UPGRADE_KM_THRESHOLD` |
| C3 | Open recall | `recalls.some(r => r.vin === jobCard.vin && r.status === 'OPEN')` |

---

## 6. Entities

### VehicleRecall (stub type — v1 only)

```ts
interface VehicleRecall {
  id:          string;
  vin:         string;
  title:       string;
  issuedAt:    string;  // ISO date
  status:      'OPEN' | 'CLOSED';
  description: string;
}
```

### UpgradeReadinessResult

```ts
interface UpgradeReadinessResult {
  ready:   boolean;
  reasons: UpgradeReason[];
}
type UpgradeReason = 'age-over-5y' | 'km-over-70k' | 'open-recall';
```

---

## 7. Scenarios (GPA format)

### S-STS-1 — Age-only trigger

**Given** a Job Card for VIN `WP0AB2A91MS247831` (Porsche 911 Carrera S, year 2021, odometerIn 28,450 km, no open recalls)  
**When** `isUpgradeReady` is called in year 2026  
**Then** `ready === true`, `reasons === ['age-over-5y']`

### S-STS-2 — Odometer-only trigger

**Given** a Job Card with odometerIn `71,200 km`, vehicle year 2024 (age 2 years), no open recalls  
**When** `isUpgradeReady` is called  
**Then** `ready === true`, `reasons === ['km-over-70k']`

### S-STS-3 — Recall-only trigger

**Given** a Job Card with odometerIn `35,000 km`, vehicle year 2023, and an OPEN recall for the VIN  
**When** `isUpgradeReady` is called  
**Then** `ready === true`, `reasons === ['open-recall']`

### S-STS-4 — All three triggers

**Given** a Job Card with odometerIn `75,000 km`, vehicle year 2020 (age 6 years), and an OPEN recall  
**When** `isUpgradeReady` is called  
**Then** `ready === true`, `reasons` contains all three: `['age-over-5y', 'km-over-70k', 'open-recall']`

### S-STS-5 — Not eligible (none triggered)

**Given** a Job Card with odometerIn `40,000 km`, vehicle year 2024 (age 2 years), no open recalls  
**When** `isUpgradeReady` is called  
**Then** `ready === false`, `reasons === []`

### S-STS-6 — Unknown vehicle (no VehicleMaster)

**Given** a Job Card with a VIN not in the vehicles store, odometerIn `30,000 km`, no recalls  
**When** `isUpgradeReady(null, jobCard, [])` is called  
**Then** `ready === false` (age check skipped; odometer and recall also not triggered)

### S-STS-7 — Banner renders for eligible JC

**Given** an R09 user views a Job Card where `isUpgradeReady(...).ready === true` with reasons `['age-over-5y']`  
**When** the `JobCardDetailView` renders  
**Then** the upgrade-ready banner appears above the action bar containing an 'age-over-5y' chip and a "Create sales lead" button

### S-STS-8 — Banner does not render for ineligible JC

**Given** an R09 user views a Job Card where `isUpgradeReady(...).ready === false`  
**When** the `JobCardDetailView` renders  
**Then** no upgrade-ready banner is present

### S-STS-9 — Conversion rate with real data

**Given** 10 DELIVERED JCs in the period where `isUpgradeReady` is true, and 3 leads sourced from `SERVICE_UPGRADE` closed as `CLOSED_WON` in the period  
**When** `selectServiceToSaleConversion` is called  
**Then** `value === 30` (percentage)

### S-STS-10 — Conversion rate zero-divisor

**Given** 0 upgrade-eligible JCs in the period  
**When** `selectServiceToSaleConversion` is called  
**Then** `value === null` (not `0`, per SPEC-REPORTS-001 L9)

### S-STS-11 — RBAC gate hides banner from R11

**Given** an R11 (Technician) user views a Job Card that is upgrade-eligible  
**When** the `JobCardDetailView` renders  
**Then** the upgrade-ready banner is hidden (Gate `fallback="hide"`)

### S-STS-12 — Lead creation toast on success

**Given** an R09 user views an upgrade-eligible JC and clicks "Create sales lead"  
**When** the B1 leads store is available (`createLead` resolves)  
**Then** a success toast reads "Sales lead created for {customerName}"

---

## 8. Cross-Module Wiring

| Seam | Direction | Detail |
|------|-----------|--------|
| 30 | Service JC detail view → Leads store (B1) | `JobCardDetailView` calls `useLeadsStore.getState().createLead({ vin, customerId, source: 'SERVICE_UPGRADE', stage: 'NEW' })` |
| 31 | Service store → Reports (conversion selector) | `selectServiceToSaleConversion` reads `state.service.jobCards` for denominator (eligible JC count) |

---

## 9. Deferred Items

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| DEF-SERVICE-SALE-1 | Real recall registry integration | P3 | Wire to NHTSA-IN or manufacturer API; replace stub `VehicleRecall[]` fixture |
| DEF-SERVICE-SALE-2 | Outbound notification on banner creation | P3 | WhatsApp/SMS to SA when a vehicle they are assigned becomes recall-eligible |
| DEF-SERVICE-SALE-3 | Tunable thresholds via Settings module | P2 | Move `UPGRADE_AGE_YEARS` + `UPGRADE_KM_THRESHOLD` to Settings store once Theme A4 settings module is extended |

---

## 10. Open Items

None. All decisions locked in §1.

---

## Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | orchestrator | Initial spec — approved. 13 L-tags, 12 scenarios, 2 seams (30, 31). |
