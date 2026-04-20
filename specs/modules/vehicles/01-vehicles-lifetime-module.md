---
spec_id: SPEC-VEHICLES-001
domain: vehicles
status: approved
risk_level: medium
pii_sensitivity: medium
flags: [vehicles-module]
owners: [orchestrator]
depends_on: [SPEC-PARTS-001, PLAN-SERVICE-002]
---

# Vehicles — VIN lifetime module (staff-web)

Introduces the **VIN aggregate root** for the DMS. Every event (ownership,
job card, sale, consignment, warranty, inspection, document, km reading)
attaches to a VIN and becomes visible on a single staff lifetime detail page.
Adds the ownership ledger, claim queue (consumed by the customer portal),
and cross-store wiring points that future modules hook into.

## 0. Summary of decisions (locked)

| # | Decision | Rationale |
|---|---|---|
| D1 | VIN is the aggregate root | Cross-owner service history, CPO trust signal, BMW/Porsche/Audi precedent (Doc 01 §3) |
| D2 | Touched-only scope | Only vehicles BN has acquired, sold, consigned, serviced, or inspected enter the ledger |
| D3 | Walk-in auto-registration | First JC on unknown VIN → staff captures minimum details → vehicle becomes BN-touched |
| D4 | Global `cust-bn-dealer` sentinel customer | Inventory acquisitions open ownership against this sentinel; single global (outlet lives on JC) |
| D5 | 7-day grace on all revoke triggers | Staff revoke, self-revoke, BN auto-transfer — consistent rule |
| D6 | REVOKED → ACTIVE restore allowed any time | Same row resurrects (`toAt = undefined, state = ACTIVE`); event `RESTORE` |
| D7 | 7-year PII retention on closed rows, then anonymize | Companies Act retention; placeholder `Owner #N` after TTL |
| D8 | Joint ownership capped at 2 ACTIVE rows / VIN for v1 | `isJoint: true` on both rows; both see same portal data |
| D9 | Auto-match computed in UI, passed as boolean to store | Pure claim-slice; no cross-store reads inside store (see §7.3) |
| D10 | Transfer-first then SO-complete ordering | Sales UI calls `transferOwnership` first; SO completion only proceeds if transfer succeeds (§7.1) |
| D11 | Effective-state derivation is a hard rule | Raw `state` never read outside the `effective-state` selector (ESLint rule enforced) |
| D12 | VIN normalization at every entry point | Uppercase, reject I/O/Q/U/Z, enforce 17 chars |
| D13 | **New shared package `@dms/vehicles-core`** | Houses pure types + pure functions (no store bindings). Both staff-web and customer-web import from it. Zero cross-app coupling. See §3.0. |
| D14 | Joint co-owner name visible to peer co-owner only | ACTIVE_JOINT row holders see "Shared with {peer.firstName} {peer.lastInitial}." (e.g. "Shared with Priya M."). All other prior/current owner identities remain aggregate-only. |
| D15 | `anonymizeRow` is production-safe; `runAnonymizationSweep` is a dev walker | `forceRevoke` calls `anonymizeRow` directly, no dependency on the sweep. |
| D16 | Self-revoke affects only the actor's own ownership row | In joint case, peer's row stays ACTIVE. |

## 1. Route surface

| Route | Purpose | Components | Role gate |
|---|---|---|---|
| `/vehicles` | BN-touched VIN index with filters (city, state, source, CPO) | `VehiclesIndexView`, `VehiclesFilters`, `VehiclesTable` | R05+ (city-scoped), R19+ cross-city |
| `/vehicles/[vin]` | Lifetime detail — tabs: Overview / Ownership / Service / Sales / Documents / Costs | `VehicleDetailView` + 6 tabs | R05+ view; R09+ to see prior-owner PII same-outlet; R19+ cross-outlet |
| `/vehicles/[vin]/not-found.tsx` | "Vehicle not found" shell | - | - |
| `/vehicles/ownership-queue` | Pending claim approvals queue | `OwnershipQueueView`, `ClaimReviewPanel` (SlideInPanel) | R09+ approves; R05+ view |

Sidebar: insert "Vehicles" entry **between Inventory and Service** in `staff-sidebar.tsx`. Icon: `Car`. Visible to all staff roles.

All routes are client components (`'use client'` at top). No RSC data fetching — store reads happen in the client. Aligns with parts + service modules.

## 2. Entities (new schemas)

File: `packages/types/src/domain/vehicles-aggregate.ts` (≤200 LoC).

### 2.1 VehicleMaster

Master record for any VIN BN has touched. Auto-upserted on first touch.

```ts
export const VehicleTouchSourceEnum = z.enum([
  'BN_SALE',
  'BN_CONSIGNMENT',
  'SERVICE_ONLY_WALKIN',
  'LEGACY_IMPORT',
]);

export const VehicleMasterSchema = z.object({
  vin: z.string().length(17),
  make: z.string(),
  model: z.string(),
  variant: z.string().optional(),
  year: z.number().int().min(1990).max(2030),
  color: z.string(),
  rcNumber: z.string(),
  firstTouchedAt: z.string().datetime(),
  firstTouchSource: VehicleTouchSourceEnum,
  firstTouchOutletId: z.enum(['BLR-01', 'MUM-01', 'CHE-01']),
  lastKnownKm: z.number().int().nonnegative(),
  lastKnownKmAt: z.string().datetime(),
  inventoryVehicleVin: z.string().optional(), // link to inventory.Vehicle if applicable
  schemaVersion: z.literal('v1').default('v1'),
});
```

**VIN normalization** (strict, enforced at every entry point — forms, claim submit, auto-match, URL param decoding):

```ts
// lib/vehicles/vin-normalizer.ts
export function normalizeVin(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper.length !== 17) throw new VinError('VIN must be 17 characters');
  if (/[IOQUZ]/.test(upper)) throw new VinError('VIN contains forbidden characters I/O/Q/U/Z');
  return upper;
}
```

### 2.2 VehicleOwnership

Time-sliced ledger row. Append-heavy; closures set `toAt` but row is never deleted (until TTL anonymization).

```ts
export const OwnershipStateEnum = z.enum([
  'PENDING_CLAIM',
  'ACTIVE',
  'TRANSFERRED',
  'REVOKED',
  'REJECTED',
]);

export const CloseReasonEnum = z.enum([
  'BN_SALE_TRANSFER',
  'MANUAL_REVOKE',
  'SELF_REVOKE_SOLD',
  'CLAIM_OVERLAP',
  'DECEASED_FORM31',
  'ERASURE_REQUEST',
  'REJECTED_CLAIM',
]);

export const VehicleOwnershipSchema = z.object({
  id: z.string(),
  vin: z.string(),
  customerId: z.string(),
  source: VehicleTouchSourceEnum,
  state: OwnershipStateEnum,
  isJoint: z.boolean().default(false),
  fromAt: z.string().datetime(),
  toAt: z.string().datetime().optional(),
  kmAtOpen: z.number().int().nonnegative(),
  kmAtClose: z.number().int().nonnegative().optional(),
  kmStale: z.boolean().default(false), // true if close km was staff-estimated
  graceUntilAt: z.string().datetime().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  closedBy: z.string().optional(),
  closedAt: z.string().datetime().optional(),
  closeReason: CloseReasonEnum.optional(),
  piiRetentionUntil: z.string().datetime().optional(), // toAt + 2555d
  linkedSalesOrderId: z.string().optional(),
  linkedJobCardId: z.string().optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
```

### 2.3 OwnershipClaim

Pending-queue entity for portal claims.

```ts
export const ClaimStateEnum = z.enum([
  'PENDING',
  'AUTO_APPROVED',
  'APPROVED',
  'REJECTED',
]);

export const RejectionReasonEnum = z.enum([
  'DOC_MISMATCH',
  'DUPLICATE',
  'IDENTITY_FAILED',
  'VIN_NOT_ELIGIBLE',
  'OTHER',
]);

export const OwnershipClaimSchema = z.object({
  id: z.string(),
  vin: z.string(),
  claimantCustomerId: z.string(),
  submittedAt: z.string().datetime(),
  rcScanUrl: z.string().url().optional(),
  identityProofScanUrl: z.string().url().optional(),
  autoMatchHit: z.boolean(), // computed in UI before submit
  matchedEntityId: z.string().optional(), // SalesOrder id or JobCard id
  state: ClaimStateEnum,
  decidedBy: z.string().optional(),
  decidedAt: z.string().datetime().optional(),
  rejectionReasonCategory: RejectionReasonEnum.optional(),
  overlapsOwnershipId: z.string().optional(),
  overlapsClaimId: z.string().optional(), // when a prior PENDING exists for same VIN
  schemaVersion: z.literal('v1').default('v1'),
});
```

### 2.4 OwnershipChangeEvent

Append-only audit log. Every ownership/claim action emits one event.

```ts
export const OwnershipEventKindEnum = z.enum([
  'OPEN', 'CLOSE', 'TRANSFER',
  'CLAIM_SUBMIT', 'CLAIM_APPROVE', 'CLAIM_REJECT',
  'RESTORE', 'ANONYMIZE', 'PDF_EXPORT',
  'JOINT_ADD', 'FORM31_APPROVE',
]);

export const OwnershipChangeEventSchema = z.object({
  id: z.string(),
  vin: z.string(),
  at: z.string().datetime(),
  kind: OwnershipEventKindEnum,
  actorId: z.string(),
  actorRole: z.string(),
  ownershipId: z.string().optional(),
  claimId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
```

### 2.5 Derived `EffectiveState`

Not persisted; computed by `effective-state.ts`. **No UI or filter reads raw `state` outside this module.**

```ts
export type EffectiveState =
  | 'PENDING_CLAIM'
  | 'ACTIVE'
  | 'ACTIVE_JOINT'
  | 'GRACE'
  | 'REVOKED'
  | 'TRANSFERRED'
  | 'REJECTED';

export function effectiveState(
  ownership: VehicleOwnership,
  now: string,
  peerCount: number, // count of other ACTIVE rows for same VIN
): EffectiveState {
  const nowMs = new Date(now).getTime();
  if (ownership.state === 'PENDING_CLAIM') return 'PENDING_CLAIM';
  if (ownership.state === 'REJECTED') return 'REJECTED';
  if (ownership.state === 'TRANSFERRED') return 'TRANSFERRED';
  if (ownership.state === 'ACTIVE') {
    return peerCount > 0 && ownership.isJoint ? 'ACTIVE_JOINT' : 'ACTIVE';
  }
  // state === 'REVOKED'
  if (ownership.graceUntilAt && new Date(ownership.graceUntilAt).getTime() >= nowMs) {
    return 'GRACE';
  }
  return 'REVOKED';
}
```

## 3.0 Shared package — `@dms/vehicles-core`

New package under `packages/vehicles-core/` (no `@dms/types` bloat).

**Exports (pure; no Zustand, no React, no fixtures, no store references):**

```
@dms/vehicles-core
├── vin-normalizer        normalizeVin, VinError
├── effective-state       effectiveState, EffectiveState type
├── auto-match            computeAutoMatch (takes salesOrders + jobCards + customers)
├── cpo-rule              isCpoEligible, CpoBadge type, CPO_RULE constants
├── view-types            OwnedVehicleView, OwnershipHistorySummary, ServiceRecordView, CpoBadge
└── index                 barrel
```

Both staff-web and customer-web depend on this. The `vehicles-store` wraps these pure functions in Zustand actions + selectors. Portal adapter imports directly. Zero cross-app imports.

## 3. Store contract — `vehicles-store`

Follows parts-store slice-pattern exactly. Location: `apps/staff-web/src/lib/vehicles/vehicles-store/`.

### 3.1 Slice files

```
vehicles-store/
  index.ts              (≤40 LoC: create + subscribe)
  types.ts              (≤180 LoC: state shape + action signatures)
  id-helpers.ts         (≤60 LoC: makeVin?, makeOwnershipId, makeClaimId, makeEventId)
  effective-state.ts    (≤80 LoC: derived selector)
  cpo-rule.ts           (≤120 LoC: pure CPO evaluator)
  vin-normalizer.ts     (≤50 LoC: normalize + validate)
  slices/
    vehicle-slice.ts    (≤180 LoC)
    ownership-slice.ts  (≤280 LoC)
    claim-slice.ts      (≤220 LoC)
    event-slice.ts      (≤80 LoC)
    query-slice.ts      (≤180 LoC)
```

### 3.2 State shape

```ts
export interface VehiclesState {
  vehicles: Record<string, VehicleMaster>;      // key: vin
  ownerships: Record<string, VehicleOwnership>; // key: id
  claims: Record<string, OwnershipClaim>;       // key: id
  events: OwnershipChangeEvent[];               // append-only
  // Indices (maintained on mutation, not persisted)
  ownershipIdByVin: Record<string, string[]>;
  claimIdByVin: Record<string, string[]>;
  ownershipIdByCustomer: Record<string, string[]>;
  hydrated: boolean;
}
```

### 3.3 Actions

**vehicle-slice:**
- `upsertVehicle(input, actor): { vin, created: boolean }` — VIN is normalized; if exists, update mutable fields (color, km, etc.) and return `created: false`
- `updateVehicleKm(vin, km, at, actor)` — append-like; updates `lastKnownKm`/`lastKnownKmAt` when `at > current lastKnownKmAt`
- `linkInventoryVehicle(vin, inventoryVin)` — sets `inventoryVehicleVin`

**ownership-slice:**
- `openOwnership(input, actor): ownershipId` — preconditions: VIN exists; no existing ACTIVE row unless `isJoint: true` on the new row AND on any existing row AND total would not exceed 2; emits `OPEN` event
- `closeOwnership(id, { kmAtClose?, reason, toAt? }, actor): void` — sets `state=TRANSFERRED`/`REVOKED` per reason; computes `graceUntilAt = toAt + 7d` for revoke paths; `kmStale: boolean = lastJcAgeDays > 90`
- `transferOwnership(input, actor): { closedIds: string[], openedIds: string[] }` — **atomic single-immer-transaction**; auto-discovers all ACTIVE rows, closes all of them, opens new single (or joint pair) for buyer. `openedIds` is length 1 or 2 (joint). Validates before mutation. All state reads are inside `set((state) => {...})` — never `getState()`. Spec §7.1 sequencing applies at UI level.
  - Input shape (locked):
    ```ts
    {
      vin: string,
      toCustomerId: string,
      joint?: { withCustomerId: string },   // creates 2 ACTIVE rows
      source: 'BN_SALE' | 'BN_CONSIGNMENT',
      kmAtClose: number,                     // applied to all closed rows
      kmAtOpen: number,                      // applied to new row(s)
      linkedSalesOrderId?: string,
    }
    ```
- `manualRevoke(id, reason, actor)` — R09+ via Gate; `state=REVOKED`, 7d grace
- `selfRevoke(id, reason, actor, options?: { newOwnerHint?: { name, phone } })` — portal origin; **only the row with `id` is affected** (D16: joint peer untouched); 7d grace
- `forceRevoke(id, reason: 'ERASURE_REQUEST', actor)` — R19+ only; immediate anonymize (skip grace + skip 7yr retention); calls `anonymizeRow(id, actor)` directly
- `restoreOwnership(id, reason, actor): void` — R09+; only from REVOKED; resurrects same row (sets `toAt=undefined, state=ACTIVE, graceUntilAt=undefined, closeReason=undefined, closedBy=undefined, closedAt=undefined`); emits `RESTORE` event with payload `{ priorCloseReason }`
- `addJointOwner(existingId, newCustomerId, actor)` — R09+; caps at 2 total ACTIVE rows for the VIN
- `approveForm31Transfer(vin, heirCustomerId, scanUrl, actor)` — R12+; auto-transfers ownership to heir
- `anonymizeRow(id, actor)` — production-safe; replaces `customerId` with `anon-{N}` sentinel; emits `ANONYMIZE` event. Called by `forceRevoke` directly and by `runAnonymizationSweep` for each due row.
- `scheduleAnonymization(id)` — internal; sets `piiRetentionUntil = toAt + 2555d` on close
- `runAnonymizationSweep(now)` — dev-only walker; iterates owners with `piiRetentionUntil <= now` and calls `anonymizeRow` for each

**claim-slice:**
- `submitClaim(input: { vin, claimantCustomerId, rcScanUrl?, identityProofScanUrl?, autoMatchHit, matchedEntityId? }, actor): { claimId, autoApproved, overlapsClaimId?, overlapsOwnershipId?, duplicate?: boolean }`
  - VIN normalized
  - **Duplicate guard**: if a PENDING claim already exists for `(vin, claimantCustomerId)`, reject with `duplicate: true` + return existing claimId
  - If `autoMatchHit === true`: state becomes `AUTO_APPROVED`, immediately calls `openOwnership` (bypassing queue) — single transaction
  - Else: state = `PENDING`; if other PENDING exists on same VIN (different claimant), sets `overlapsClaimId`; if ACTIVE exists on same VIN, sets `overlapsOwnershipId`
  - Emits `CLAIM_SUBMIT`
- `approveClaim(claimId, actor): { ownershipIds: string[] }`
  - R09+ (verified at UI + slice via role param)
  - If `overlapsOwnershipId` set: single transaction closes all ACTIVE rows on that VIN + opens new; `ownershipIds` is length 1 (single new) or 2 (joint)
  - Else: calls `openOwnership`
  - Emits `CLAIM_APPROVE`
- `rejectClaim(claimId, category: RejectionReason, actor)` — state = `REJECTED`; emits `CLAIM_REJECT`

**event-slice:**
- `appendEvent(kind, payload, actor)` — pure helper; only exported method on this slice; no update/delete possible
- `logPdfExport(vin, customerId, actor)` — convenience wrapper emitting `PDF_EXPORT` event; used by portal PDF export

**query-slice (pure selectors, not mutations). Shape is `(state, ...args)`; hook wrappers `useVehicles.selectX(...)` provided by the store module:**
- `selectCurrentOwnerships(state, vin): VehicleOwnership[]` — uses `effectiveState` to filter ACTIVE/ACTIVE_JOINT only
- `selectCurrentOwnerIds(state, vin): string[]`
- `selectOwnershipTimeline(state, vin): Array<VehicleOwnership | OwnershipChangeEvent>` — merged chronologically; O(n log n) via `Array.sort`; **perf budget: ≤ 20ms for 100 events** (unit-tested)
- `selectVehiclesByCustomer(state, customerId, opts: { includeGrace: boolean; now: string }): VehicleOwnership[]` — **single canonical signature** used by staff AND portal; portal adapter wraps this
- `selectClaimsByCustomer(state, customerId): OwnershipClaim[]` — for portal "My Claims" list (§11)
- `selectPendingClaims(state, opts: { outletId? }): OwnershipClaim[]` — city-scoped for R05-R10 per Doc 14 §2.3
- `selectAnonymizationDue(state, now): VehicleOwnership[]` — for dev panel

### 3.4 Auto-match rule (UI-side computation, shared helper)

**Location**: `@dms/vehicles-core/auto-match` — single source, imported by both apps.

UI layer pre-computes before calling `submitClaim`:

```ts
export function computeAutoMatch(
  vin: string,
  claimantCustomer: Customer,
  salesOrders: SalesOrder[],
  jobCards: JobCard[],
  customers: Customer[],
  priorClaims: OwnershipClaim[], // rejection-history guard
): { hit: boolean; matchedEntityId?: string } {
  const normalizedVin = normalizeVin(vin);
  // Rejection guard — if claimant had a prior REJECTED claim on this VIN, no auto-match
  const priorRejected = priorClaims.some(
    c => c.vin === normalizedVin
      && c.claimantCustomerId === claimantCustomer.id
      && c.state === 'REJECTED',
  );
  if (priorRejected) return { hit: false };

  const pan = claimantCustomer.pan?.trim().toUpperCase();
  const emailKey = claimantCustomer.email?.trim().toLowerCase();
  const phoneKey = claimantCustomer.phone?.replace(/\D/g, '');

  // Match on LATEST customer record, not JC/SO snapshot PII
  const matches = (c: Customer | undefined) => {
    if (!c) return false;
    const cpan = c.pan?.trim().toUpperCase();
    const cemail = c.email?.trim().toLowerCase();
    const cphone = c.phone?.replace(/\D/g, '');
    if (pan && cpan && pan === cpan) return true;
    if (emailKey && phoneKey && cemail === emailKey && cphone === phoneKey) return true;
    return false;
  };

  const matchingSo = salesOrders
    .filter(so => so.vin === normalizedVin && so.status === 'COMPLETED')
    .find(so => matches(customers.find(c => c.id === so.buyerId)));
  if (matchingSo) return { hit: true, matchedEntityId: matchingSo.id };

  const matchingJc = jobCards
    .filter(jc => jc.vin === normalizedVin)
    .find(jc => matches(customers.find(c => c.id === jc.customerId)));
  if (matchingJc) return { hit: true, matchedEntityId: matchingJc.id };

  return { hit: false };
}
```

Result passed as boolean into `submitClaim`. Claim-slice stays pure — no cross-store reads.

### 3.5 CPO eligibility rule

**Location**: `@dms/vehicles-core/cpo-rule`. Pure function. Memoization key = `(vin, lastJcId)` where `lastJcId = max(jc.id for jc.vin == vin)` — a selector `selectLastJcIdByVin(state, vin)` in service-store is invalidated only on JC events; memo lives in a `useCpoEligibility(vin)` hook in staff-web + customer-web apps. CPO result is cached in a `Map<string, { key: string; result: ... }>` at the hook level.

```ts
export function isCpoEligible(
  vin: string,
  jobCards: JobCard[],
  warrantyClaims: WarrantyClaim[],
  vehicle: VehicleMaster,
  now: string,
): { eligible: boolean; reasons: CpoReason[] } {
  // Filter JCs for this VIN in last 36mo
  // AND no gap > 18mo between consecutive
  // AND ≥ 4 JCs total in window
  // AND no DISPUTED warranty claim open
  // AND vehicle.lastKnownKmAt within 90 days of now
}
```

Three badge states: **Eligible** (green), **At Risk** (amber, gap 12-18mo), **Not Eligible** (no badge).

## 4. Cross-module wiring (UI layer only)

Cross-store calls live in the UI, never inside slices. Pattern: UI handler reads from source store, passes to vehicles-store.

| Trigger | UI handler | Sequence |
|---|---|---|
| Service: new JC on unknown VIN | `new-jobcard-form.tsx` `onSubmit` | 1) check `vehicles.getState().vehicles[normalizeVin(form.vin)]`; 2) if missing → open `VehicleIntakeDialog`; 3) on confirm → `vehicles.upsertVehicle()` + `vehicles.openOwnership({ source: 'SERVICE_ONLY_WALKIN', kmAtOpen: form.odometer, customerId: form.customerId })`; 4) continue `service.createJobCard()`. |
| Inventory: acquisition | `acquire-vehicle-flow.tsx` final step | `vehicles.upsertVehicle()` + `vehicles.openOwnership({ source: 'BN_CONSIGNMENT', customerId: 'cust-bn-dealer', kmAtOpen: form.odometer })` + `vehicles.linkInventoryVehicle()`. |
| Sales: SO complete | `so-complete-dialog.tsx` | **Transfer-first ordering**: `vehicles.transferOwnership({...})` first. Only if it succeeds, call `sales.markSalesOrderComplete`. Compensation note: if SO-complete fails, manual staff intervention (acceptable for mock phase; backend will use event sourcing). |
| Portal: claim submit | `ClaimForm` submit | UI reads `sales-store` + `service-store` + customers to compute `autoMatch`; passes to `vehicles.submitClaim(...)`. |

## 5. Fixture strategy

Split across three files in `packages/mocks/src/fixtures/`:
- `vehicles.fixtures.ts` — `VehicleMaster[]` (6 VINs)
- `ownership.fixtures.ts` — `VehicleOwnership[]`
- `ownership-events.fixtures.ts` — `OwnershipChangeEvent[]`
- `ownership-claims.fixtures.ts` — `OwnershipClaim[]`

Composer helper `buildVehicleFixture({ vin, ownerships, jcCount, ... })` to keep the data readable.

### 3 demo VIN narratives (locked from /research §7)

**VIN-A: WBA3A5C50DF123456** (2018 BMW M340i, Bangalore) — 3-owner chain
- 2019-03 → 2020-11: `cust-rohan-desai` (SERVICE_ONLY_WALKIN) — 4 JCs, TRANSFERRED
- 2020-11 → 2023-04: `cust-neha-kapoor` (BN_CONSIGNMENT → BN_SALE chain) — 6 JCs, km 38k→72k, TRANSFERRED
- 2023-04 → present: `cust-arjun-mehta` (BN_SALE) — 3 JCs, km 72k→93k, **ACTIVE** + CPO-eligible ✓

**VIN-B: WAUFGAFR9LA003456** (2020 Audi RS5, Mumbai) — 2-owner + rejected claim
- 2020-06 → 2024-02: `cust-vikram-singh` (BN_SALE) — 8 JCs, km 8k→68k, TRANSFERRED
- 2024-02 → present: `cust-meera-iyer` (BN_SALE) — 1 JC, **ACTIVE, CPO-at-risk** (only 1 JC in 12mo)
- 2026-04 fraud attempt: `cust-rahul-kumar` submits claim → **REJECTED** (category: `DUPLICATE`)

**VIN-C: WP0AB2A98KS123456** (2019 Porsche 911 Carrera S, Chennai) — revoke + pending + restore history
- 2019-07 → 2021-09: `cust-sunita-reddy` (BN_SALE) — 3 JCs, TRANSFERRED
- 2021-09 → 2025-11: `cust-karan-shah` (BN_CONSIGNMENT) — `REVOKED 2025-11` (mistake) → `RESTORE 2025-11` back to ACTIVE (demonstrates restore)
- 2026-04-15: `cust-karan-shah` self-revokes (sold privately) — **REVOKED 2026-04-15, in 7-day grace until 2026-04-22**
- 2026-04-18: `cust-pooja-desai` submits claim — **PENDING_CLAIM** (staff approval needed; no auto-match)

**Joint ownership sample**: VIN-A 2023-04 onward is joint between Arjun + his wife `cust-priya-mehta` — both ACTIVE rows.

**Anonymized ghost**: add one fixture entry (VIN-X, 2017 BMW) with `customerId: 'anon-1'` demonstrating post-TTL display.

All fixtures marked `// FIXTURE: demo data` at top of each file.

## 6. Component tree + LoC caps

### `/vehicles`
- `VehiclesIndexView` ≤180
- `VehiclesFilters` ≤140
- `VehiclesTable` ≤200 (DataTable columns config)
- `VehicleRowActions` ≤100

### `/vehicles/[vin]`
- `VehicleDetailView` ≤220 (tab shell + breadcrumb)
- `VehicleDetailHeader` ≤140 (VINBadge, OutletPill, km, CPO badge, ownership chip)
- `tabs/OverviewTab` ≤220
- `tabs/OwnershipTab` ≤280 (timeline + actions)
- `tabs/ServiceTab` ≤160 (reuses service-store JC list filtered by VIN)
- `tabs/SalesTab` ≤140
- `tabs/DocumentsTab` ≤180
- `tabs/CostsTab` ≤160
- `side-panels/ManualRevokePanel` ≤160
- `side-panels/ManualAssignPanel` ≤200
- `dialogs/VehicleIntakeDialog` ≤220 (shared with service flow)
- `dialogs/Form31ApprovalDialog` ≤180

### `/vehicles/ownership-queue`
- `OwnershipQueueView` ≤160
- `ClaimsTable` ≤180
- `side-panels/ClaimReviewPanel` ≤280 (scan viewer + approve/reject + dev anonymization button)

### Primitives
- **Extend** `StateChip` — add ownership & claim state variants (no new file)
- **New** `OwnershipBadge` ≤80 (wraps StateChip + source icon + joint affordance)

No other new primitives.

## 7. Critical sequences

### 7.1 Sales→vehicles transfer ordering (resolves reviewer B1)

```ts
// apps/staff-web/src/components/sales/so-complete-dialog.tsx
async function handleComplete() {
  try {
    // Step 1: validate + execute transfer FIRST
    const result = useVehiclesStore.getState().transferOwnership({
      vin: so.vin,
      toCustomerId: so.buyerId,
      joint: so.buyerIsJoint ? { withCustomerId: so.jointBuyerId } : undefined,
      source: 'BN_SALE',
      kmAtClose: so.deliveryKm,
      kmAtOpen: so.deliveryKm,
      linkedSalesOrderId: so.id,
    });
    // Step 2: only on success, mark SO complete
    useSalesStore.getState().markSalesOrderComplete(so.id);
    toast('Sale completed and ownership transferred', 'success');
  } catch (e) {
    toast(`Transfer failed: ${e.message}`, 'error');
    // SO stays in ACCEPTED state — manual staff retry
  }
}
```

### 7.2 Claim overlap approval (resolves reviewer concern 6)

`approveClaim` runs as a single immer transaction:
1. Find all ACTIVE rows for VIN (should be 1-2)
2. For each: set `state=REVOKED`, `toAt=now`, `graceUntilAt=now+7d`, `closeReason='CLAIM_OVERLAP'`, `piiRetentionUntil=now+2555d`
3. Open new ACTIVE row: `customerId=claim.claimantCustomerId`, `fromAt=now`, `kmAtOpen=vehicle.lastKnownKm`
4. Append events: `CLOSE` × N + `OPEN` × 1 + `CLAIM_APPROVE` × 1

Grace starts at approval; old owner keeps 7d portal read-access; new owner has immediate ACTIVE.

### 7.3 Auto-match in UI (resolves reviewer B4)

Claim submission flow (portal):

```ts
// apps/customer-web/src/components/portal/vehicles/claim-form.tsx
async function onSubmit(form) {
  const normalizedVin = normalizeVin(form.vin);
  // Read from sibling stores to compute match
  const salesOrders = useSalesStore.getState().salesOrders;
  const jobCards = useServiceStore.getState().jobCards;
  const customers = useCustomersStore.getState().customers;
  const currentCustomer = customers.find(c => c.id === authCustomerId);

  const { hit, matchedEntityId } = computeAutoMatch(
    normalizedVin, currentCustomer!, salesOrders, jobCards, customers,
  );

  // Pure: submitClaim never reads sibling stores
  const result = useVehiclesStore.getState().submitClaim({
    vin: normalizedVin,
    claimantCustomerId: authCustomerId,
    rcScanUrl: form.rcScanUrl,
    identityProofScanUrl: form.idScanUrl,
    autoMatchHit: hit,
    matchedEntityId,
  }, { id: authCustomerId, name: currentCustomer!.name });

  if (result.autoApproved) {
    router.push(`/vehicles/${normalizedVin}`);
    toast('Verified instantly — ownership active', 'success');
  } else if (result.overlapsClaimId) {
    toast('A prior claim is pending for this VIN — yours is queued.', 'info');
  } else {
    toast('Claim submitted for review', 'success');
  }
}
```

### 7.4 DPDP erasure path (resolves reviewer concern 1)

For an ACTIVE owner requesting erasure:
1. Staff (R19+) navigates `/customers/[id]` → "Right to Erasure" action
2. For each ACTIVE ownership held by that customer: `vehicles.forceRevoke(id, 'ERASURE_REQUEST', actor)`
3. `forceRevoke` closes row immediately (no grace), sets `piiRetentionUntil = now`, immediately runs anonymization on that row
4. Emits `ANONYMIZE` event

## 8. RBAC matrix

| Action | Min rank | Scope |
|---|---|---|
| View `/vehicles`, `/vehicles/[vin]` Overview/Service/Documents | R05 | city-scoped |
| View Ownership tab with prior-owner PII | R09 (same outlet), R19+ cross-outlet | per Doc 14 §2.3 |
| Open `VehicleIntakeDialog` (walk-in) | R07 Service Advisor | |
| `manualRevoke` / `restoreOwnership` | R09 | |
| Manual ownership assign (C360 dialog) | R09 same outlet, R19+ cross | |
| `approveClaim` / `rejectClaim` | R09 decides; R05 views queue | |
| `approveForm31Transfer` | R12 | Form 31 scan required |
| `forceRevoke(ERASURE_REQUEST)` | R19 | DPDP compliance |
| Cross-outlet vehicle list | R19+ | GM, CFO, CEO |
| Dev anonymization sweep | R24 only | dev-tools panel |

## 9. Scenarios (GPA)

- **S-V-1** — Navigate `/vehicles/VIN-A` → Overview shows lifetime km progression chart, 3-owner ownership timeline, active owner = Arjun + Priya (joint badge), CPO-eligible ✓
- **S-V-2** — Navigate `/vehicles/VIN-B` → CPO status "At Risk" chip visible; hover shows "Only 1 service in last 12 months"
- **S-V-3** — Navigate `/vehicles/VIN-C` → Current owner chip shows "Karan Shah · in grace · 3 days remaining"; Pooja's pending claim visible in Ownership tab pending sub-section
- **S-V-4** — Navigate `/vehicles/ownership-queue` as R13 Parts Counter → Can view, Approve/Reject buttons disabled with "Requires R09+" tooltip
- **S-V-5** — Switch role R24 → R09 via sidebar → queue shows Approve/Reject enabled for same-outlet claims only (Pooja's CHE-01 claim; R09 in BLR-01 sees VIN-B fraud attempt)
- **S-V-6** — Start a new JC on unknown VIN `XXXYYY12345678901` → `VehicleIntakeDialog` appears → save minimum details → JC proceeds → `/vehicles/XXXYYY12345678901` now renders with single ACTIVE ownership
- **S-V-7** — R19 opens VIN-C ownership timeline → sees full prior-owner PII (Sunita, Karan) → role-switch to R09 in CHE-01 → sees only same-outlet PII (Sunita + Karan are CHE-01, OK); role-switch to R09 in BLR-01 → PII masked to "Previous Owner #1"
- **S-V-8** — Restore flow: R09 opens VIN-C revoked Karan row → Restore → reason required → confirm → state returns to ACTIVE, `toAt` cleared
- **S-V-9** — Form 31: R13 tries to run approveForm31Transfer → button disabled with tooltip; switch to R12 → button enabled
- **S-V-10** — VIN normalization: URL `/vehicles/wba3a5c50df123456` (lowercase) → `VehicleDetailView` client component detects mismatch in `useEffect` and calls `router.replace(/vehicles/WBA3A5C50DF123456)` (uppercase). No middleware needed.
- **S-V-11** — Duplicate claim guard: same customer submits claim twice on same VIN → second submission returns `{ duplicate: true, claimId: <existing> }` without creating a new row
- **S-V-12** — `RESTORE` event: restore VIN-C Karan's REVOKED row → event payload contains `{ priorCloseReason: 'MANUAL_REVOKE' }`
- **S-V-13** — Anonymized row display: VIN-X ghost entry with `customerId: 'anon-1'` renders as "Owner #1" in both C360 + portal aggregate summary
- **S-V-14** — `transferOwnership` atomicity: unit test injects a precondition failure (invalid customerId) → zero state mutations observable; `getState()` snapshot identical before and after
- **S-V-15** — `selectOwnershipTimeline` perf: benchmark with 100 events completes in < 20ms (Vitest bench)
- **S-Typecheck** — `pnpm -F staff-web typecheck` + `pnpm -F customer-web typecheck` + `pnpm -F @dms/vehicles-core typecheck` all exit 0 after P1

## 10. Acceptance criteria

1. All scenarios S-V-1..10 + S-Typecheck pass
2. Every file ≤ 350 LoC
3. Zero new npm deps; 1 new primitive (`OwnershipBadge`) as flagged
4. Zero hex literals; all colors via `rgb(var(--state-*))` tokens
5. ESLint rule enforced: no `ownership.state === ...` outside `effective-state.ts`
6. VIN normalization enforced at every entry point (form, URL, claim, auto-match)
7. Auto-match computed in UI; `claim-slice.ts` imports no other slice files, no stores
8. All slice actions emit appropriate `OwnershipChangeEvent`
9. Fixtures cover all 5 ownership states + joint + grace + anonymized
10. `transferOwnership` is a single immer transaction (no partial commits possible)

## 11. Open items for sign-off

1. **PDF export tech** — HTML + print-CSS + `window.print()`, zero-dep (confirm acceptable vs future `@react-pdf/renderer`)
2. **Dev anonymization UI** — lives in `/vehicles/ownership-queue` dev-tools panel (R24-only); confirm OK vs separate Audit page

## 12. Risks + mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Circular store imports | ESLint rule; slice files forbid `service-store`, `sales-store`, `inventory-store` imports |
| 2 | LoC overflow on `OwnershipTab` | Pre-split into 4 sub-components in §6 |
| 3 | Portal PII leak | `portal-vehicle-adapter` in SPEC-PORTAL-VEHICLES-001 is only adapter; 100% unit test coverage; snapshot test asserts no prior-owner PII fields |
| 4 | Grace window forgotten in filters | Centralized in `effective-state.ts` + `selectVehiclesByCustomer({includeGrace})`; ESLint forbids raw state checks |
| 5 | Sales→vehicles partial commit | Transfer-first ordering (§7.1); manual retry acceptable for mock phase |
| 6 | VIN case/char mismatch auto-match miss | `normalizeVin()` at every entry point |

## 13. Changelog

| Date | Change |
|------|--------|
| 2026-04-20 | SPEC-VEHICLES-001 drafted. Incorporates plan + 5 reviewer blockers + 10 concerns + 5 gaps. Status → approved. |
| 2026-04-20 | 2nd reviewer pass applied (Approve w/ Minor Fixes → resolved): new shared package `@dms/vehicles-core` (D13), joint co-owner peer-display rule (D14), split anonymize (D15), self-revoke per-row (D16). `transferOwnership` input shape locked. `approveClaim` returns `ownershipIds: string[]`. `computeAutoMatch` now takes `priorClaims` for rejection guard. Duplicate-claim guard added. Scenarios S-V-11..15 added. `logPdfExport` added to event-slice. `selectVehiclesByCustomer` signature canonicalized. |
| 2026-04-20 | PLAN-VEHICLES-002 Phase A: added `CONSIGNED_TO_BN` + `CONSIGNMENT_RETURNED` to `CloseReasonEnum`; added `metadataIncomplete?: boolean` to `VehicleMasterSchema`; `transferOwnership` now accepts optional `closeReason?: CloseReason` (defaults to `BN_SALE_TRANSFER`, same reason stamped on ALL discovered ACTIVE rows per L8). |
