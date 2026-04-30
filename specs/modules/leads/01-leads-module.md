---
spec_id: SPEC-LEADS-001
title: Lead → Sale Conversion Funnel
domain: leads
version: "1.0"
status: approved
risk_level: medium
pii_sensitivity: medium
flags: [feat_leads_module]
owners: [orchestrator]
created: 2026-04-30
depends_on:
  - SPEC-CUSTOMERS-001
  - SPEC-VEHICLES-001
  - PLAN-VEHICLES-003
  - SPEC-ARCH-UI-001
related_specs:
  - SPEC-INSURANCE-001
  - SPEC-STAFF-001
  - SPEC-NOTIFICATIONS-001
---

# SPEC-LEADS-001 · Lead → Sale Conversion Funnel

> **Purpose.** This spec defines the end-to-end lead management module for BN Automobiles: from the first moment a buyer expresses interest (walk-in, web-form, phone, referral, or service-upgrade trigger) through Kanban stage progression to a raised Sales Order. It covers types, store actions, RBAC, UI surfaces, and cross-module wiring.

---

## §1. Locked Decisions

| Tag | Title | Decision | Source |
|-----|-------|----------|--------|
| L1 | Lead is independent of Deal | A `Lead` and a `Deal` (sales-store) are distinct entities. A Lead becomes a Deal only when an SO is raised (`SO_RAISED` stage). Until that point, no vehicle is reserved. The handoff is a one-way write: `transitionStage` to `SO_RAISED` creates a stub entry in the sales pipeline (P2 wiring; P1 renders a toast). | Doc 04 §sales; Theme B roadmap |
| L2 | Stage machine is linear with single bypass | Valid transitions follow NEW → CONTACTED → QUALIFIED → TEST_DRIVE → QUOTED → SO_RAISED → DELIVERED. A lead may be marked LOST from any stage. Skipping stages forward is allowed for walk-in fast-track (e.g. NEW → QUOTED). Backwards transitions are blocked — the advisor must create a new activity note instead. | Doc 04 §sales lead flow |
| L3 | Score is computed, not stored | `scoreCold/Warm/Hot` is NOT a stored field. Score is computed by `computeLeadScore(lead, activities)` pure helper from interaction count + recency. The enum in the type is used only for display. Computed on every render via `useMemo`. | Theme B B1 spec; avoids stale score bugs |
| L4 | Walk-in form is staff-only | The `/leads/new` route is gated behind R05+. A walk-in lead may be created by any sales-desk staff. The `source` field is set to `'walk-in'` by default in the quick-form, but staff may override to `'phone'`, `'referral'`, or `'service-upgrade'`. | Doc 14 §Sales roles; Doc 04 §lead intake |
| L5 | RBAC: assign advisor requires R09+ | `assignAdvisor` action validates that the acting user is R09 (Sales Manager) or above. Sales Executives (R05) cannot self-assign or re-assign leads. They may only add activities to leads already assigned to them. | Doc 14 §2.3 Sales Manager capabilities |
| L6 | Next-action timer is advisory only | `nextActionAt` is a datetime the advisor sets manually or from a preset. No automated reminders in P1 — a chip turns amber/red when the time is past. Automated WhatsApp reminder is a P2 stub. | Doc 13 §WhatsApp BSP deferred |
| L7 | Activity log is append-only | Activities (`LeadActivity[]`) are append-only inside the store. No delete or update action exists. An incorrect entry must be superseded by a new correction note. Mirrors the OwnershipEvent + SalesEvent append-only contract in PLAN-VEHICLES-003. | Doc 07 §event patterns; PLAN-VEHICLES-003 L7 |
| L8 | Vehicle interest is a VIN pointer, not a copy | `vehicleInterestVin` is a foreign-key reference to the vehicles-store. The lead does NOT copy vehicle data. Renders pull from `useVehiclesStore` via a single base-ref selector per SPEC-ARCH-UI-001 Zustand rule. | SPEC-ARCH-UI-001 §Zustand anti-patterns |
| L9 | outletId scopes the lead | Every lead is scoped to one outlet at creation. Cross-outlet transfer is not supported in P1 — the outlet field is read-only after creation. City-RLS behaviour mirrors vehicles and service modules. | Doc 12 §data boundaries |
| L10 | bulkImportFromCsv is P2 stub | The action exists in the store signature but throws `NotImplementedError` in P1. The UI renders a disabled "Import CSV" button with a "coming in v2" tooltip. No silent no-op. | CLAUDE.md §10 DoD item 15 — every CTA wired |
| L11 | PII display follows existing masking contract | Phone numbers and email addresses shown in lead detail are subject to the `maskedContactFor` helper from `@dms/vehicles-core` when `customer.contactConfidential === true` and the viewing user is below R19. | PLAN-VEHICLES-002 Phase E; Doc 14 |
| L12 | Test-drive CTA is a P2 integration stub | The "Schedule Test Drive" CTA in lead detail page calls `toast('Wired in Theme B item B2 — test-drive module coming next.')` in P1. It does NOT silently do nothing. | Theme B roadmap; CLAUDE.md DoD item 15 |
| L13 | Quote CTA is a P2 integration stub | Similar to L12 — "Create Quote" CTA toasts "Quote module wired in B2 / P2." | Theme B B2 dependency |
| L14 | Score tokens map to state-* design tokens | Cold = `state-neutral` (grey), Warm = `state-warning` (amber), Hot = `state-error` (red). Implemented via `StateChip` primitive variant; NOT inline Tailwind color classes. | SPEC-ARCH-UI-001 §3 StateChip |
| L15 | i18n namespace is top-level `leads.*` | All user-visible strings live under `leads` at the root of both `en-IN.json` and `hi-IN.json`. No nesting under another module's namespace. Enforced by `ui-canon-drift.test.ts`. | CLAUDE.md §10 DoD item 7; §13a |
| L16 | Seam 39: Leads → Customers (read) | Lead detail renders customer name/phone via the customers-store. This is a READ seam — leads-store does NOT mutate customers-store. Registered in `specs/architecture/cross-module-wiring.md` as Seam 39. | cross-module-wiring.md convention |
| L17 | Seam 40: Leads → Vehicles (read) | Lead detail renders vehicle make/model/year via vehicles-store. READ-only seam. Registered as Seam 40. | cross-module-wiring.md convention |
| L18 | Seam 41: Service-upgrade → Leads (write) | B4 wiring: when the service module detects an upgrade-ready vehicle, it calls `useLeadsStore.getState().createLead(...)` with `source: 'service-upgrade'`. This is a WRITE seam from service to leads. Registered as Seam 41. P1 stub — the service module does NOT call this yet; the action exists ready for B4. | Theme B B4; cross-module-wiring.md |

---

## §2. Summary

The Leads module creates a complete top-of-funnel pipeline for BN Automobiles' sales process. Staff capture buyer interest from multiple sources (walk-in, web-form referral, phone, or service-upgrade trigger). Leads progress through 7 active stages on a Kanban board, plus a terminal LOST state. An advisor scores each lead (cold/warm/hot computed heuristic), logs activities, and converts qualified leads to Sales Orders. The module surfaces to sales staff via `/leads`, individual leads at `/leads/[id]`, and lead creation at `/leads/new`.

---

## §3. Entities

### 3.1 `LeadStage` enum

```
NEW → CONTACTED → QUALIFIED → TEST_DRIVE → QUOTED → SO_RAISED → DELIVERED
                                                              ↘
                                                              LOST (from any active stage)
```

### 3.2 `LeadSource` enum

`walk-in` | `web-form` | `phone` | `referral` | `service-upgrade`

### 3.3 `LeadScore` (display enum — L3)

`COLD` | `WARM` | `HOT`

### 3.4 `Lead`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | `LEAD-<YYYY>-<NNN>` |
| `source` | `LeadSource` | — |
| `stage` | `LeadStage` | State machine per §3.1 |
| `customerId` | `string` | FK → customers-store |
| `vehicleInterestVin` | `string?` | FK → vehicles-store (L8) |
| `assignedAdvisorId` | `string?` | FK → staff-store |
| `createdAt` | `string` | ISO 8601 |
| `lastActivityAt` | `string` | ISO 8601; updated on every activity |
| `nextActionAt` | `string?` | ISO 8601; advisory timer (L6) |
| `outletId` | `City` | Read-only after creation (L9) |
| `leadOriginUrl` | `string?` | Web-form source URL |
| `lostReason` | `string?` | Required when stage = LOST |

### 3.5 `LeadActivity`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `leadId` | `string` | Back-reference |
| `kind` | `'note'\|'call'\|'whatsapp'\|'stage-change'\|'assign'` | |
| `at` | `string` | ISO 8601 |
| `actorId` | `string` | Staff ID |
| `actorName` | `string` | Denormalised for display |
| `payload` | `Record<string, string>` | Arbitrary per kind |

---

## §4. State Machine

```
                 ┌──────────────────────────── LOST ◄─────────┐
                 │                                              │
 NEW ──► CONTACTED ──► QUALIFIED ──► TEST_DRIVE ──► QUOTED ──► SO_RAISED ──► DELIVERED
  │                                                   │
  └─────────────── fast-track (skip allowed) ─────────┘
```

**Invariants:**
- Any stage may transition to LOST (L2).
- Backwards transitions are blocked (L2).
- DELIVERED and LOST are terminal.
- `transitionStage` appends a `stage-change` LeadActivity automatically (L7).

---

## §5. Store Contract

```ts
interface LeadsStore {
  leads: Lead[];
  activities: LeadActivity[];
  hydrated: boolean;

  // Mutations
  createLead(params: CreateLeadParams, actor: Actor): Lead;
  updateLead(leadId: string, patch: Partial<Lead>, actor: Actor): void;
  transitionStage(leadId: string, toStage: LeadStage, actor: Actor): void;  // appends stage-change activity (L7)
  assignAdvisor(leadId: string, advisorId: string, actor: Actor): void;      // R09+ (L5)
  addActivity(leadId: string, activity: Omit<LeadActivity, 'id'|'leadId'>): void;
  bulkImportFromCsv(csvString: string, actor: Actor): never;                  // P2 stub — throws NotImplementedError (L10)

  // Hydration
  hydrate(leads: Lead[], activities: LeadActivity[]): void;
}
```

### `CreateLeadParams`
```ts
{
  source: LeadSource;
  customerId: string;
  outletId: City;
  vehicleInterestVin?: string;
  assignedAdvisorId?: string;
  nextActionAt?: string;
  leadOriginUrl?: string;
}
```

---

## §6. Score Helper

```ts
// Pure function — L3
function computeLeadScore(lead: Lead, activities: LeadActivity[]): LeadScore {
  const leadActivities = activities.filter((a) => a.leadId === lead.id);
  const contactActivities = leadActivities.filter(
    (a) => a.kind === 'call' || a.kind === 'whatsapp' || a.kind === 'note',
  );
  const daysSinceLastActivity =
    (Date.now() - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);

  if (contactActivities.length >= 3 && daysSinceLastActivity <= 3) return 'HOT';
  if (contactActivities.length >= 1 && daysSinceLastActivity <= 7) return 'WARM';
  return 'COLD';
}
```

---

## §7. RBAC Summary

| Action | Minimum Role | Doc 14 ref |
|--------|-------------|-----------|
| View leads list | R05 | Sales Executive |
| Create lead (walk-in / phone) | R05 | Sales Executive |
| Add activity note | R05 | Sales Executive (own-assigned leads) |
| Assign / re-assign advisor | R09 | Sales Manager |
| Transition stage | R05 | Any advisor |
| Mark LOST | R05 | Any advisor (with reason) |
| Bulk import CSV | R09 | Sales Manager (P2 stub) |
| Delete / purge lead | Not permitted in v1 | — |

---

## §8. Routes

| Route | Description | Auth |
|-------|-------------|------|
| `/leads` | Kanban board + LOST list | R05+ |
| `/leads/[id]` | Lead detail — advisor, score, history, next-action | R05+ |
| `/leads/new` | Create lead form (walk-in / phone intake) | R05+ |

---

## §9. UI Surfaces

### 9.1 `/leads` — Kanban Board

- 7 Kanban columns: NEW / CONTACTED / QUALIFIED / TEST_DRIVE / QUOTED / SO_RAISED + a LOST collapsible list at the bottom.
- Each column has: label, count chip, total VIN interest count.
- Each card shows: customer name, vehicle interest (make/model), score chip (cold/warm/hot via `StateChip`), next-action timer, assigned advisor initials.
- Drag-and-drop: HTML5 native DnD. Drop triggers `transitionStage`. Invalid transitions render an error toast.
- Filter bar: outlet (URL-synced `?outlet=`), stage, source, score.
- "New Lead" button (R05+ gated via `Gate` primitive).
- View toggle: Kanban / List (URL-synced `?view=list`).

### 9.2 `/leads/[id]` — Lead Detail

- Header: customer name, lead ID, source badge, stage chip, score chip.
- Left column:
  - **Lead Info** card (Card from `detail-card.tsx`): source, outlet, created at, VIN interest link, lead origin URL.
  - **Next Action** card: next-action timer chip (green/amber/red), set/edit action.
  - **Assigned Advisor** card: advisor name + role, R09+ change button.
- Right column:
  - **Activity Timeline**: all `LeadActivity` entries, newest first, with kind icons.
  - **Add Activity** inline form: kind selector + note text + submit.
- CTAs in header:
  - "Schedule Test Drive" → P2 stub toast (L12).
  - "Create Quote" → P2 stub toast (L13).
  - "Mark as Lost" → confirmation dialog, requires `lostReason` text.

### 9.3 `/leads/new` — Create Lead Form

- Renders in a `Dialog` primitive (full-page on mobile, centered modal on desktop).
- Fields: Customer (searchable dropdown), Vehicle Interest VIN (optional, searchable), Source (select), Outlet (select, defaults to current outlet), Next Action (date-time picker), Notes (textarea).
- Submit calls `createLead`. On success: navigate to `/leads/[newId]`.
- Cancel returns to `/leads`.

---

## §10. Scenarios

### SC-01: Sales Executive captures a walk-in lead

**Given** a logged-in Sales Executive (R05) at BLR outlet
**When** they navigate to `/leads/new` and fill: customer = Arjun Mehta, source = walk-in, VIN interest = WP0AB2A91MS247831
**Then** a Lead is created in stage NEW with outletId = bangalore, and the user is navigated to `/leads/LEAD-2026-NNN`

### SC-02: Kanban drag-and-drop advances stage

**Given** Lead LEAD-2026-001 in stage CONTACTED
**When** a staff member drags the card to the QUALIFIED column
**Then** `transitionStage('LEAD-2026-001', 'QUALIFIED', actor)` is called, a `stage-change` activity is appended, and the card renders in the QUALIFIED column

### SC-03: Backward transition is rejected

**Given** Lead LEAD-2026-002 in stage QUOTED
**When** a staff member tries to drag the card back to NEW
**Then** an error toast is shown: "Cannot move lead backward — log a note instead." The lead remains in QUOTED.

### SC-04: Sales Manager assigns advisor

**Given** Lead LEAD-2026-003 with no assigned advisor
**When** a Sales Manager (R09) clicks "Assign Advisor" and selects Rahul Kumar (staff-r05-001)
**Then** `assignAdvisor` is called, an `assign` activity is appended, and the advisor chip updates

### SC-05: Sales Executive cannot assign advisor

**Given** Lead LEAD-2026-004 with no assigned advisor
**When** a Sales Executive (R05) views the lead detail
**Then** the "Assign Advisor" button is hidden (Gate role R09+ fallback=hide)

### SC-06: Score chip — hot lead

**Given** Lead LEAD-2026-005 with 3 call activities in the last 2 days
**When** the lead card renders
**Then** `computeLeadScore` returns 'HOT' and the StateChip renders with `state-error` token (red)

### SC-07: Score chip — cold lead

**Given** Lead LEAD-2026-006 with 0 activities in the last 10 days
**When** the lead card renders
**Then** `computeLeadScore` returns 'COLD' and the StateChip renders with `state-neutral` token (grey)

### SC-08: Mark as Lost requires reason

**Given** Lead LEAD-2026-007 in stage QUALIFIED
**When** staff clicks "Mark as Lost" without entering a reason
**Then** the form shows validation error "Loss reason is required" and does not submit

### SC-09: Mark as Lost with reason

**Given** Lead LEAD-2026-008 in stage QUALIFIED
**When** staff enters reason "Customer bought from another dealer" and confirms
**Then** `transitionStage` is called with target LOST, `lostReason` is persisted, a `stage-change` activity is appended, and the lead moves to the LOST list

### SC-10: Schedule Test Drive CTA is stubbed

**Given** Lead LEAD-2026-009 in stage TEST_DRIVE
**When** staff clicks "Schedule Test Drive"
**Then** a toast shows "Test-drive module wired in Theme B item B2 — coming next." No navigation occurs.

### SC-11: bulkImportFromCsv stub throws error

**Given** an import request with a valid CSV string
**When** `bulkImportFromCsv` is called
**Then** a `NotImplementedError` is thrown with message "Bulk CSV import is a P2 feature."

### SC-12: Web-form lead intake

**Given** a web-form lead submitted via storefront with `leadOriginUrl = 'https://bnautomobiles.in/collection/WP0AB2A91MS247831'`
**When** `createLead` is called with `source: 'web-form'`
**Then** the lead is created with `leadOriginUrl` visible in the Lead Info card, and the source badge shows "Web Form"

### SC-13: Outlet scoping — BLR staff cannot see MUM leads

**Given** a logged-in BLR staff member (R05) with outletId = bangalore
**When** they view `/leads`
**Then** only leads with `outletId = 'bangalore'` are shown. MUM/CHE leads are filtered out.

### SC-14: Service-upgrade lead creation (Seam 41 stub)

**Given** a service-upgrade event triggers `createLead` with `source: 'service-upgrade'`
**When** the action completes
**Then** a Lead is created in stage NEW, the activity log contains an initial `note` entry "Service upgrade trigger: <VIN>", and the lead is visible on the board

### SC-15: Activity append-only contract

**Given** Lead LEAD-2026-010 with 2 existing activities
**When** `addActivity` is called with a new note
**Then** the activities array grows to 3; no existing activities are mutated or removed

---

## §11. Events Emitted

No domain events are emitted by the Leads module in P1. The activity log IS the event trail — `LeadActivity` entries are the audit record.

**P2 note:** On `transitionStage` to `SO_RAISED`, a `LEAD_CONVERTED_TO_DEAL` event stub will emit (cross-module, sales-store). Not in P1.

---

## §12. Events Consumed

None in P1. The service-upgrade trigger in Seam 41 will be consumed in B4.

---

## §13. Cross-Module Wiring

| Seam | Direction | From | To | Notes |
|------|-----------|------|----|-------|
| 39 | READ | leads UI | customers-store | Customer name/phone in lead detail |
| 40 | READ | leads UI | vehicles-store | Vehicle make/model/year in lead card/detail |
| 41 | WRITE | service module | leads-store | Service-upgrade lead creation (B4 — P1 stub exists) |

All three seams registered in `specs/architecture/cross-module-wiring.md`.

---

## §14. Non-Functional Requirements

| Requirement | Target | Doc ref |
|-------------|--------|---------|
| Kanban renders < 200ms for ≤ 100 leads | perf | Doc 12 §NFR |
| Lead ID is globally unique within session | uniqueness | — |
| All PII fields masked per maskedContactFor | security | Doc 14; PLAN-VEHICLES-002 |
| All strings via next-intl under `leads.*` | i18n | CLAUDE.md §10.7 |
| No `text-[NNpx]` or `rounded-lg/xl` in new code | UI canon | SPEC-ARCH-UI-001 |
| RBAC via Gate primitive — no inline hasRank in JSX | RBAC | SPEC-ARCH-UI-001 §RBAC |

---

## §15. Deferred Items

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| DEF-LEADS-1 | Test-drive booking integration (B2) | P2 | Seam: leads stage TEST_DRIVE ↔ test-drive-store |
| DEF-LEADS-2 | Quote generation from lead (B2) | P2 | Seam: leads → sales/quotes module |
| DEF-LEADS-3 | Bulk CSV import | P2 | `bulkImportFromCsv` stub exists; P2 adds parsing + validation |
| DEF-LEADS-4 | WhatsApp next-action reminder | P2 | notifications-store.recordSent on `nextActionAt` expiry |
| DEF-LEADS-5 | SO_RAISED → Deal handoff | P2 | Seam 42: leads-store → sales-store Deal creation |
| DEF-LEADS-6 | Web-form lead intake from storefront | P2 | Customer-web form POST → staff-web API route → leads-store |
| DEF-LEADS-7 | Service-upgrade live wiring (B4) | P3 | Seam 41 trigger in service JC detail |
| DEF-LEADS-8 | Lead analytics tile on Reports dashboard | P3 | Reports module reads from leads-store (read-only seam) |

---

## §16. Open Questions

None — all blocking questions resolved per Doc 04 §sales, Doc 14 §roles, Theme B roadmap.

---

## §17. Fixtures

25 leads spread across all 7 stages + LOST. Outlets: BLR (~10), MUM (~8), CHE (~7). Sources: all 5 variants. Timestamps: Apr–May 2026. Customer IDs from `packages/mocks/src/fixtures/customer.ts`. VINs from `packages/mocks/src/fixtures/vehicles.ts`.

---

## §18. Test Coverage Requirements

≥ 20 unit/integration tests in `apps/staff-web/src/tests/leads-store.test.ts`. Must cover:

1. `createLead` — happy path
2. `createLead` — duplicate prevention
3. `transitionStage` — valid forward transition
4. `transitionStage` — backward transition throws
5. `transitionStage` — appends stage-change activity (L7)
6. `transitionStage` — LOST from any stage
7. `transitionStage` — terminal state (DELIVERED) throws
8. `assignAdvisor` — R09+ succeeds
9. `assignAdvisor` — R05 throws InsufficientRoleError (L5)
10. `addActivity` — append-only (L7)
11. `computeLeadScore` — HOT case (≥3 contacts, ≤3 days)
12. `computeLeadScore` — WARM case (≥1 contact, ≤7 days)
13. `computeLeadScore` — COLD case (0 contacts or >7 days)
14. `bulkImportFromCsv` — throws NotImplementedError (L10)
15. Fixture coverage — 25 leads loaded, spread across 7 stages
16. Fixture VINs — all vehicleInterestVins exist in vehicles fixtures
17. Fixture customers — all customerIds exist in customer fixtures
18. Outlet scoping — leads filtered by outletId correctly
19. `updateLead` — patch applies, lostReason persisted
20. `hydrate` — idempotent (double-call does not duplicate)

---

## §19. Acceptance Criteria

- [ ] L1–L18 all honoured in code (verified by spec-drift check)
- [ ] SC-01 through SC-15 all passing (unit + integration)
- [ ] Kanban renders 7 stage columns + LOST list
- [ ] Lead detail page renders all fields with Card + Field from `detail-card.tsx`
- [ ] New-lead form opens as Dialog, validates, and navigates on success
- [ ] Score chips use `StateChip` with correct tokens (L14)
- [ ] "Schedule Test Drive" toasts the P2 message (L12)
- [ ] `bulkImportFromCsv` throws `NotImplementedError` (L10)
- [ ] Sidebar nav entry "Leads" under Operations group, Funnel icon
- [ ] `error.tsx` present and uses `ModuleErrorFallback` (CLAUDE.md §17.0)
- [ ] `LeadsStoreHydrator` mounted in `AppShell`
- [ ] `pnpm -F staff-web exec vitest run src/tests/ui-canon-drift.test.ts` — passes
- [ ] `pnpm -F staff-web exec vitest run src/tests/error-boundaries.test.ts` — passes
- [ ] `pnpm -F staff-web typecheck` — 0 errors
- [ ] `pnpm -F staff-web exec vitest run` — all green, no regressions

---

## §20. Dependencies

- `packages/types/src/domain/lead.ts` — new types file (this spec)
- `packages/mocks/src/fixtures/leads.ts` — 25 lead fixtures (this spec)
- `apps/staff-web/src/lib/leads/leads-store.ts` — Zustand store (this spec)
- `apps/staff-web/src/lib/leads/leads-store-hydrator.tsx` — hydrator (this spec)
- `apps/staff-web/src/components/leads/` — UI components (this spec)
- `apps/staff-web/app/(shell)/leads/` — route pages (this spec)
- `specs/architecture/cross-module-wiring.md` — Seams 39–41 added

---

## §21. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | orchestrator | Initial spec — 21 sections, 18 L-tags, 15 scenarios, full P1 definition. |
