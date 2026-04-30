---
spec_id: SPEC-SHOOTS-001
title: Photo/Video Shoot Scheduling
domain: shoots
status: approved
version: 1.0
risk_level: low
pii_sensitivity: none
flags: []
owners: [orchestrator]
created: 2026-04-30
depends_on:
  - SPEC-VEHICLES-001
  - PLAN-VEHICLES-003
related_docs:
  - Doc 04 §marketing (shoots)
  - Doc 14 §R11 (Marketing Manager)
  - SPEC-ARCH-UI-001
---

# SPEC-SHOOTS-001 — Photo/Video Shoot Scheduling

## Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L1 | Auto-create on ACQUIRED | When a vehicle emits an `ACQUIRED` SalesEvent (in the vehicles-store hydrator Phase C or via live `emitSalesEvent`), a `Shoot` entity is auto-created with `status: 'pending'` and the VIN linked. Creation fires from the UI layer (Seam 39). | Doc 04 §marketing; cross-module rule per SPEC-ARCH-UI-001 |
| L2 | LISTED guard: ≥10 photos + 1 video | A vehicle cannot transition to LISTED unless its linked Shoot has `assetCount >= 10` AND `videoCount >= 1`. Enforced by `ShootIncompleteError` thrown from `emitSalesEvent` in the sales-events-slice. Checked via `shoots-store.getShootByVin(vin)` at the LISTED call site (Seam 40). | Doc 04 §marketing; hardcoded for v1 — outlet-configurable in v1.5 (L_DEFER_1) |
| L3 | Photographer role gate: R11 | Assigning a photographer to a shoot is gated behind role R11 (Marketing Manager per Doc 14). The `assignPhotographer` action rejects actors with rank < R11. | Doc 14 §R11 |
| L4 | Asset URLs are mocked S3 paths | Asset URLs use the pattern `https://cdn.bn.example/shoots/{vin}/{n}.jpg` (photos) and `https://cdn.bn.example/shoots/{vin}/video-{n}.mp4` (video). No real S3 integration in v1. | No-dep constraint per build brief |
| L5 | Status progression | Shoot status progresses: `pending → scheduled → in-progress → completed`. Transitions are one-directional. `completed` is terminal and required before LISTED is allowed. | Domain model §3 |
| L6 | One active shoot per VIN | Only one non-completed Shoot per VIN at a time. Auto-create on ACQUIRED is idempotent: if a shoot already exists for the VIN (any status), skip creation. | Simplicity; prevents duplicate queue entries |
| L7 | Store is Zustand + Immer | Pattern matches vehicles-store / notifications-store. Hydrator seeds fixture data. Hoisted into AppShell. | SPEC-ARCH-UI-001 §store-patterns |
| L8 | Shoot ID format | `shoot-{vin}-{timestamp}` for auto-created shoots; `shoot-{nanoid}` for fixture entries. | Consistency with event ID patterns in vehicles-store |
| L9 | LISTED guard only applies to inventory vehicles | The guard queries `shoots-store.getShootByVin(vin)`. If no shoot exists for the VIN (e.g. service-only walk-in vehicles), the guard is skipped (shoots are only created for BN_CONSIGNMENT / ACQUIRED path). | Avoids breaking service-only VINs |
| L10 | No real asset upload in v1 | Upload CTAs show a mock confirmation toast and seed a new mocked URL into the store. Real S3 upload is DEF-SHOOTS-1. | No-dep constraint per build brief |
| L11 | completedAt set on status → completed | When the operator marks the shoot complete, `completedAt` is stamped with `now()`. `assetCount` and `videoCount` must already satisfy the threshold for completion to succeed (guard: `ShootIncompleteError`). | L2; consistency with service JC `closedAt` pattern |

---

## 1. Overview

When BN acquires a vehicle, high-quality photos and a walk-around video are essential before the listing goes live on the storefront. This spec covers the full lifecycle of a "shoot task": creation, queue management, photographer assignment, shoot execution (mocked asset upload), completion gate, and how the completed shoot unlocks the LISTED transition in the vehicles module.

**In scope (v1):**
- Auto-create shoot on ACQUIRED SalesEvent
- Queue view: pending/scheduled/in-progress/completed tabs
- Photographer assignment (R11)
- Mock asset upload with mocked S3 URLs
- Completion checklist (≥10 photos, ≥1 video)
- LISTED transition guard
- Full CRUD for shoot detail

**Out of scope (see §Deferred items):**
- Real S3 upload integration (DEF-SHOOTS-1)
- Calendar integration for scheduling (DEF-SHOOTS-2)
- Storefront VDP reads shoot.assetUrls (DEF-SHOOTS-3)
- Outlet-configurable threshold (DEF-SHOOTS-4, planned v1.5)

---

## 2. Entities

### Shoot

```ts
interface Shoot {
  id: string;                      // shoot-{vin}-{ts} or fixture id
  vin: string;
  photographerId: string | null;   // null until assigned
  scheduledAt: string | null;      // ISO 8601; null until scheduled
  completedAt: string | null;      // ISO 8601; null until completed
  status: ShootStatus;             // 'pending' | 'scheduled' | 'in-progress' | 'completed'
  assetCount: number;              // photos uploaded (mock)
  videoCount: number;              // videos uploaded (mock)
  assetUrls: string[];             // mocked S3 paths
  createdAt: string;               // ISO 8601
  createdBy: string;               // actorId
  notes: string;                   // optional free-text
  outletId: 'BLR-01' | 'MUM-01' | 'CHE-01';
  vehicleMake?: string;            // denormalized for list display
  vehicleModel?: string;           // denormalized for list display
  vehicleYear?: number;            // denormalized for list display
}
```

### ShootStatus FSM

```
pending → scheduled → in-progress → completed
```

All transitions are sequential except `pending → in-progress` (allowed if photographer
goes straight to shoot without scheduling in advance).

---

## 3. Store contract

### State

```ts
interface ShootsState {
  shoots: Record<string, Shoot>; // key: id
  shootIdByVin: Record<string, string>; // key: vin → latest shoot id
  hydrated: boolean;
}
```

### Actions

| Action | Signature | Guard |
|---|---|---|
| `createShoot` | `(vin, outletId, actor, meta?) => Shoot` | L6: idempotent — returns existing if VIN has non-completed shoot |
| `assignPhotographer` | `(shootId, photographerId, actor) => void` | L3: actor.role must be R11 |
| `scheduleShoot` | `(shootId, scheduledAt, actor) => void` | status must be pending or scheduled |
| `startShoot` | `(shootId, actor) => void` | status must be pending or scheduled |
| `addMockAsset` | `(shootId, type: 'photo' \| 'video', actor) => void` | L4: appends mocked URL, increments count |
| `completeShoot` | `(shootId, actor) => void` | L11: assetCount ≥ 10 AND videoCount ≥ 1 |
| `getShootByVin` | `(vin) => Shoot \| null` | — |
| `selectByStatus` | `(status) => Shoot[]` | — |

### Errors

```ts
class ShootIncompleteError extends Error {
  vin: string;
  assetCount: number;
  videoCount: number;
}

class ShootNotFoundError extends Error {
  shootId: string;
}

class InsufficientRoleError extends Error {
  required: string;
  actual: string;
}
```

---

## 4. Cross-module seams

| Seam # | Description | Source → Target |
|---|---|---|
| 39 | ACQUIRED → auto-create Shoot | `vehicles-store-hydrator.tsx` ACQUIRED emission → `shoots-store.createShoot(vin, outletId, actor)` (UI layer) |
| 40 | LISTED guard | `VehicleSalesTab` "List Vehicle" CTA → `shoots-store.getShootByVin(vin)` → throws `ShootIncompleteError` if guard fails |

---

## 5. RBAC

| Action | Minimum role | Note |
|---|---|---|
| View queue | R05 (receptionist) | All staff can view |
| Assign photographer | R11 (Marketing Manager) | Doc 14 |
| Schedule / start shoot | R11 | |
| Add assets (mock) | R11 | |
| Complete shoot | R11 | |
| Force-complete (override) | R19 (GM) | Override threshold guard |

---

## 6. Routes

| Route | Component | Notes |
|---|---|---|
| `/shoots` | `ShootsQueuePage` | Stage tabs: Pending / Scheduled / In-Progress / Completed |
| `/shoots/[id]` | `ShootDetailPage` | Photographer assignment, asset grid, completion checklist |

---

## 7. Scenarios

### SC-01: Auto-create shoot on ACQUIRED event

**Given** a vehicle VIN `XYZ` is hydrated with ACQUIRED SalesEvent  
**When** the VehiclesStoreHydrator runs Phase C  
**Then** `shoots-store` contains a Shoot with `vin=XYZ`, `status='pending'`, `assetCount=0`, `videoCount=0`

### SC-02: LISTED blocked when shoot is incomplete

**Given** a Shoot for VIN `ABC` exists with `assetCount=5` and `videoCount=0`  
**When** staff attempts to emit LISTED for VIN `ABC`  
**Then** `ShootIncompleteError` is thrown with `vin='ABC'`, `assetCount=5`, `videoCount=0`

### SC-03: LISTED allowed when shoot is complete

**Given** a Shoot for VIN `DEF` exists with `assetCount=12`, `videoCount=1`, `status='completed'`  
**When** staff emits LISTED for VIN `DEF`  
**Then** the event is accepted without error and `salesEvents` includes the LISTED event

### SC-04: Photographer assignment gated to R11

**Given** the current actor has role R09 (Sales Executive)  
**When** `assignPhotographer(shootId, photographerId, actorR09)` is called  
**Then** `InsufficientRoleError` is thrown

### SC-05: Photographer assignment succeeds for R11

**Given** the current actor has role R11 (Marketing Manager)  
**When** `assignPhotographer(shootId, photographerId, actorR11)` is called  
**Then** `shoot.photographerId = photographerId` and `shoot.status` advances to `'scheduled'` if `scheduledAt` is set, else stays `'pending'`

### SC-06: Shoot completion blocked with insufficient assets

**Given** a Shoot with `assetCount=8`, `videoCount=0`  
**When** `completeShoot(shootId, actor)` is called  
**Then** `ShootIncompleteError` is thrown (assetCount < 10 or videoCount < 1)

### SC-07: Shoot completion succeeds with ≥10 photos + ≥1 video

**Given** a Shoot with `assetCount=10`, `videoCount=1`  
**When** `completeShoot(shootId, actor)` is called  
**Then** `shoot.status = 'completed'` and `shoot.completedAt` is stamped

### SC-08: Idempotent auto-create — second ACQUIRED event skips creation

**Given** a Shoot already exists for VIN `GHI` (any status)  
**When** `createShoot('GHI', ...)` is called again  
**Then** the existing Shoot is returned, no new Shoot is created

### SC-09: Mock asset add increments counters and appends URL

**Given** a Shoot `shoot-123` in `in-progress` status  
**When** `addMockAsset('shoot-123', 'photo', actor)` is called  
**Then** `shoot.assetCount` increments by 1 and a mocked CDN URL is appended to `shoot.assetUrls`

### SC-10: No shoot for VIN — LISTED guard is skipped

**Given** VIN `JKL` is a service-only walk-in with no ACQUIRED event  
**And** no Shoot exists for `JKL`  
**When** staff emits LISTED for VIN `JKL`  
**Then** the LISTED event is accepted (guard is skipped when no shoot exists per L9)

### SC-11: Queue view shows stage-filtered list

**Given** the shoots store has 3 pending, 2 scheduled, 1 in-progress shoots  
**When** the user navigates to `/shoots` and selects the "Pending" tab  
**Then** only the 3 pending shoots are displayed

### SC-12: Shoot detail shows photographer assignment slot

**Given** a Shoot with `photographerId=null`  
**When** an R11 user views `/shoots/[id]`  
**Then** the detail page shows an "Assign Photographer" CTA wired to `assignPhotographer`

---

## 8. Deferred items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-SHOOTS-1 | Real S3 upload integration | P4 | Replace mocked URLs with a Next.js API route handler wired to AWS S3 presigned PUT |
| DEF-SHOOTS-2 | Calendar integration for scheduling | P3 | Integrate with staff calendar / availability for shoot slot booking |
| DEF-SHOOTS-3 | Storefront VDP reads shoot.assetUrls | P2 | Replace static vehicle images on the storefront VDP with shoot.assetUrls when shoot is completed |
| DEF-SHOOTS-4 | Outlet-configurable threshold | P3 | Move the ≥10 photos + ≥1 video threshold to outlet config (L2 locked to hardcoded for v1) |

---

## 9. Acceptance criteria

- [ ] `packages/types/src/domain/shoot.ts` exports `Shoot`, `ShootSchema`, `ShootStatus`, `ShootStatusEnum`, `ShootIncompleteError`, `ShootNotFoundError`
- [ ] `packages/mocks/src/fixtures/shoots.ts` exports 12 fixtures spanning all statuses
- [ ] `apps/staff-web/src/lib/shoots/shoots-store.ts` implements all 8 actions
- [ ] `apps/staff-web/src/lib/shoots/shoots-store-hydrator.tsx` seeds fixtures + auto-creates from ACQUIRED events
- [ ] AppShell includes `<ShootsStoreHydrator />`
- [ ] `/shoots` page renders stage tabs with correct filtered lists
- [ ] `/shoots/[id]` page renders detail, assignment, assets, checklist
- [ ] `error.tsx` exists for shoots module
- [ ] Sidebar shows "Shoots" nav item under Operations with Camera icon
- [ ] LISTED guard in `sales-events-slice.ts` throws `ShootIncompleteError` when conditions unmet
- [ ] All i18n strings land in `messages/en-IN.json` + `messages/hi-IN.json` under top-level `shoots` key
- [ ] `apps/staff-web/src/tests/shoots.test.ts` has ≥12 passing tests
- [ ] Both apps typecheck clean

---

## 10. Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-30 | 1.0 | orchestrator | Initial approved spec |
