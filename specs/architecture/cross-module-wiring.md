---
doc_id: ARCH-CROSS-MODULE-001
type: architecture reference
status: current (2026-04-21)
owners: [orchestrator]
scope: staff-web + customer-web; all cross-module integration seams
---

# Cross-module wiring — architecture reference

Canonical reference for every integration seam between stores / modules /
surfaces in the DMS. This doc is **descriptive** (what's in the code) not
prescriptive — spec files are the prescriptive source. Use this doc to:

- Onboard to how modules talk to each other without grepping the repo
- Audit whether the "UI-layer only" rule is being held (CLAUDE §5)
- Find the exact file:line for each call chain
- Understand error-handling + ordering guarantees per seam

Last verified against commit `f75e4c7`.

## Core invariants (apply to every seam below)

1. **UI-layer only** — cross-store calls happen in React components / page
   handlers via `useXxxStore.getState().action()`. No slice imports another
   slice's store. No Zustand subscription from one store to another.
2. **Stores stay pure** — slice actions never call into other stores. Emission
   into another stream happens from the caller (UI) after the local action
   returns.
3. **Order is explicit** — when a seam has ordering constraints (e.g.
   transfer-first on SO complete), the order is documented per seam below
   AND enforced by sequential `await`-less calls wrapped in try/catch.
4. **Failures roll back upstream only** — if step 2 fails, step 1 is NOT
   automatically undone. Mock-phase compensation is manual; backend phase
   will wire sagas. Documented per seam.
5. **`hasRank(user, 'R12')`** — numeric rank comparator. `ROLE_RANK` map at
   `apps/staff-web/src/lib/vehicles/state-machine.ts`: R05=1, R07=2, R09=3,
   R12=4, R13=5, R19=6, R22=7, R24=8. "R12+" means rank ≥ 4 = {R12, R13,
   R19, R22, R24}.

## Seam registry

| # | Name | Source → Target | Introduced |
|---|---|---|---|
| 1 | Service JC → Parts PO | JC parts tab "Create PO" link → `/parts/po/new` | S5 P6 (`21059e9`) |
| 2 | Service JC → Parts detail | JC parts tab partCode link → `/parts/[partCode]` | S5 P6 |
| 3 | Parts GRN POST → Service reserve | post-grn-dialog → `service.reserveJobCardParts` | S5 P6 |
| 4 | Service JC intake → Vehicles | new-jobcard-form → VehicleIntakeDialog + `vehicles.upsertVehicle` + `vehicles.openOwnership` | SPEC-VEHICLES-001 P4 (`ed52913`) |
| 5 | Inventory Add Car → Vehicles | `/inventory/new` branches → `vehicles.*` calls | PLAN-VEHICLES-002 Phase C (`472b44f`) |
| 6 | Sales SO-complete → Vehicles | SoCompleteDialog → `vehicles.transferOwnership` | SPEC-VEHICLES-001 P4 |
| 7 | Portal claim → Vehicles | ClaimForm → `computeAutoMatch` (with priorClaims) → `vehicles.submitClaim` | SPEC-PORTAL-VEHICLES-001 (`7546749`) |
| 8 | Dashboard claims card | `/dashboard` `PendingClaimsCard` → `ClaimReviewPanel` | PLAN-VEHICLES-002 Phase D (`cee5493`) |
| 9 | Confidentiality masking | `maskedContactFor(customer, viewerRank)` | PLAN-VEHICLES-002 Phase E (`596da8b`) |
| 10 | Sidebar role switcher | `MOCK_STAFF_PROFILES` → portal'd submenu → `switchRole(code)` | S5 P6 |

## Detailed seams

### 1. Service JC → Parts PO deep-link

**File:** `apps/staff-web/src/components/service/tabs/jobcard-parts-tab.tsx:134`

```tsx
<Link href={`/parts/po/new?jobCard=${jobCardId}&part=${encodeURIComponent(line.partCode)}`}>
  Create PO
</Link>
```

**Flow:** Next.js client-side navigation. No store coupling. Target route
`/parts/po/new/page.tsx` reads `?jobCard=` + `?part=` via `useSearchParams`,
pre-fills the NewPurchaseOrderForm.

**Visibility:** rendered only when `line.status === 'REQUESTED'` (part
shortage on the JC). Gated role is implicit — anyone who can view the JC
can click; PO creation itself has its own threshold gates at submit.

**Gotcha:** `partCode` is URL-encoded because some part codes contain `/`.

---

### 2. Service JC → Parts detail cross-link

**File:** same file, line `:121`

```tsx
<Link href={`/parts/${encodeURIComponent(line.partCode)}`}>
  {line.partCode}
</Link>
```

**Flow:** direct `<Link>` to the part detail page. No store wiring.

---

### 3. Parts GRN POST → Service auto-reserve

**File:** `apps/staff-web/src/components/parts/grn-detail/action-flows/post-grn-dialog.tsx:48–82`

**Call chain:**
```tsx
async function handleConfirm() {
  setBusy(true);
  const ok = usePartsStore.getState().postGrn(grn.id, actor);
  setBusy(false);

  if (ok) {
    // Cross-module: only if linked PO has a job card AND deltas exist
    if (po?.linkedJobCardId && preview.perPartDeltas.length > 0) {
      try {
        useServiceStore.getState().reserveJobCardParts(
          po.linkedJobCardId,
          preview.perPartDeltas.map(d => ({ partCode: d.partCode, qty: d.delta })),
          actor,
        );
      } catch {
        // Silent no-op — service-store may not be hydrated
      }
    }
    onClose();
    toast(`${grn.grnNo} posted · N movements written`, 'success');
  } else {
    // postGrn denied by state machine — show inline error
  }
}
```

**Ordering guarantee:** Parts `postGrn` succeeds FIRST. Only then service
reserve fires. If reserve throws, the GRN remains posted (it's the correct
source of truth) — the reserve is a best-effort side effect.

**Why try/catch silently:** On routes where `ServiceStoreHydrator` hasn't
mounted yet (rare — only if user deep-links to GRN detail without visiting
`/service` first), the service store has no JC data. The reserve would
throw. We swallow the error — backend will enqueue a retry. V2 concern.

**Effect on service data:** flips matching `partsLine.status` from
`REQUESTED` to `RESERVED` for the JC linked to the PO. Only parts where
`delta.qty >= line.qty` flip (partial reservations stay REQUESTED).

**Spec:** `specs/modules/parts/07-p6-cross-module-wiring-and-role-switcher.md` §1

---

### 4. Service JC intake → Vehicles walk-in registration

**File:** `apps/staff-web/src/components/service/new-jobcard-form.tsx:265–305`

**Call chain:**
```tsx
const onSubmit = handleSubmit(async (data) => {
  const normalizedVin = normalizeVin(data.vin); // strict; falls back on VinError
  const vehiclesStore = useVehiclesStore.getState();
  const vehicleExists = Boolean(vehiclesStore.vehicles[normalizedVin]);

  if (!vehicleExists) {
    // Step 1: upsert skeleton vehicle
    vehiclesStore.upsertVehicle({
      vin: normalizedVin,
      make: data.make ?? '',   // blanks allowed — intake dialog enriches
      model: data.model ?? '',
      // ... firstTouchSource: 'SERVICE_ONLY_WALKIN'
    });

    // Step 2: open VehicleIntakeDialog for metadata enrichment
    setIntakeDialogVin(normalizedVin);
    setPendingJcData(jcPayload);
    return;  // JC creation is deferred until dialog confirms
  }

  // Vehicle exists — create JC directly
  const jc = createJobCard(jcPayload, actor);
  router.push(`/service/jobcards/${jc.id}`);
});

// Dialog callback:
const handleIntakeConfirm = useCallback(() => {
  const vehiclesStore = useVehiclesStore.getState();
  try {
    vehiclesStore.openOwnership({
      vin: pendingJcData.vin,
      customerId: pendingJcData.customerId,
      source: 'SERVICE_ONLY_WALKIN',
      kmAtOpen: pendingJcData.odometerIn,
    }, actor);
  } catch { /* ownership already active — proceed */ }

  const jc = createJobCard(pendingJcData, actor);
  router.push(`/service/jobcards/${jc.id}`);
}, [...]);
```

**Ordering:**
1. Validate VIN (lenient — non-standard test VINs allowed via VinError catch)
2. Upsert vehicle (skeleton if new; updates `lastKnownKm` if existing)
3. If new: open `VehicleIntakeDialog` to collect metadata; defer JC create until confirm
4. On dialog confirm: open ownership (SERVICE_ONLY_WALKIN); create JC; navigate

**Error handling:** `openOwnership` throws if an ACTIVE ownership already
exists for the VIN (per spec L12 idempotency guard). Caught + swallowed —
JC creation proceeds with the existing ownership.

**Per L10:** if VIN exists and `jc.customerId !== currentActiveOwnerId`,
no second ownership row is opened. The JC keeps its own customerId for
service-contact purposes; ownership ledger unchanged.

---

### 5. Inventory Add Car → Vehicles

**Files:**
- Existing branch: `apps/staff-web/src/components/inventory/new-flow/existing-sale-fields-form.tsx:82–120`
- New branch: `apps/staff-web/src/components/inventory/new-flow/new-vehicle-intake-form.tsx:85–130`

**Existing-vehicle branch** (user picked a VIN that's already in the vehicles ledger):
```tsx
const vehiclesStore = useVehiclesStore.getState();
vehiclesStore.transferOwnership({
  vin, toCustomerId: 'cust-bn-dealer',
  source: 'BN_CONSIGNMENT',
  kmAtClose: vehicle.lastKnownKm, kmAtOpen: vehicle.lastKnownKm,
  closeReason: 'CONSIGNED_TO_BN',   // per PLAN-VEHICLES-002 L25
}, actor);
console.log('[inventory] createListing stub —', vin, saleFields);
```

**New-to-BN branch** (5-step sequence per PLAN-VEHICLES-002 §3.2):
```tsx
// 1. Create customer
const c = useCustomersStore.getState().createCustomer(ownerDetails, actor);

// 2. Upsert vehicle master
useVehiclesStore.getState().upsertVehicle({
  vin: normalizeVin(vin),
  ...vehicleDetails,
  firstTouchSource: 'BN_CONSIGNMENT',
});

// 3. Open ownership for prior owner (inferred tenure)
useVehiclesStore.getState().openOwnership({
  vin, customerId: c.id, source: 'LEGACY_IMPORT',
  kmAtOpen: km, fromAt: form.ownedSinceAt ?? now,
}, actor);

// 4. Transfer to BN
useVehiclesStore.getState().transferOwnership({
  vin, toCustomerId: 'cust-bn-dealer',
  source: 'BN_CONSIGNMENT',
  kmAtClose: km, kmAtOpen: km,
  closeReason: 'CONSIGNED_TO_BN',
}, actor);

// 5. Inventory listing — stubbed (no inventory Zustand store yet)
console.log('[inventory] createListing stub —', vin, saleFields);
```

**Partial-failure handling:** if step N throws, prior steps stay
committed. Toast surfaces the error + entity IDs of the orphaned rows.
Acceptable for mock phase (spec §3.2). Backend sagas in v2.

**Why inventory.createListing is a stub:** no inventory Zustand store
exists yet — inventory page reads fixtures directly. Listing creation
waits for backend phase.

---

### 6. Sales SO-complete → Vehicles transfer (transfer-first)

**File:** `apps/staff-web/src/components/sales/so-complete-dialog.tsx:57–95`

```tsx
async function handleComplete() {
  try {
    // Step 1 — transfer FIRST (SPEC-VEHICLES-001 §7.1)
    useVehiclesStore.getState().transferOwnership({
      vin: salesOrder.vin,
      toCustomerId: salesOrder.buyerId,
      joint: salesOrder.buyerIsJoint ? { withCustomerId: salesOrder.jointBuyerId } : undefined,
      source: 'BN_SALE',
      kmAtClose: salesOrder.deliveryKm,
      kmAtOpen: salesOrder.deliveryKm,
      linkedSalesOrderId: salesOrder.id,
    }, actor);

    // Step 2 — only on transfer success, mark SO complete
    console.info(`[Sales v2] SO ${salesOrder.id} marked complete after transfer.`);

    setStatus('success');
  } catch (e) {
    setErrorMsg(`Transfer failed: ${e.message}`);
    setStatus('error');
    // SO NOT marked complete; ownership unchanged
  }
}
```

**Why transfer-first:** If SO is marked complete first and transfer
subsequently fails, the ledger is inconsistent: SO says "sold" but the
car still shows BN as owner. Transfer-first means either both succeed
or neither commits (from user's perspective — SO completion is deferred
until transfer returns success).

**Joint-buyer handling:** if `salesOrder.buyerIsJoint`, the `joint`
param tells `transferOwnership` to open a joint pair. Per PLAN-VEHICLES-002
L8, the same `closeReason` applies to ALL auto-discovered ACTIVE rows
for the VIN — so if seller side is joint too, both close with the same
reason.

**Pending seller-signature enforcement:** per PLAN-VEHICLES-003 L15, SOLD
emission from this dialog will throw if `sellerSignatures.length < activeJointOwnerCount`
unless `override` present. Not yet wired (v2 concern — P2 of VEHICLES-003
adds the checklist).

---

### 7. Portal claim submission → Vehicles auto-match

**File:** `apps/customer-web/src/components/portal/vehicles/claim-form.tsx`

**Call chain:**
```tsx
function onSubmit(form) {
  // UI computes auto-match BEFORE calling the store
  // (ensures claim-slice stays pure; no cross-store reads in store)
  const hit = computeAutoMatch({
    vin: normalizeVin(form.vin),
    claimantPan: currentUser.pan,
    claimantEmail: currentUser.email,
    claimantPhone: currentUser.phone,
    salesOrders: useSalesStore.getState().salesOrders,
    jobCards: useServiceStore.getState().jobCards,
    customers: useCustomersStore.getState().customers,
    priorClaims: vehiclesStore.claims.filter(c => c.claimantId === currentUser.id),
  });

  vehiclesStore.submitClaim({
    vin: normalizeVin(form.vin),
    claimantId: currentUser.id,
    autoMatchHit: hit,  // passed as boolean — claim-slice is pure
    rcScanRef: form.rcScan,
    identityProofRef: form.identityProof,
  }, actor);
}
```

**Rejection-history guard (PLAN-VEHICLES-002):** if the claimant has a
prior REJECTED claim for this VIN, `computeAutoMatch` returns `false`
unconditionally. Prevents silent re-auto-approval after a rejection.

**Why auto-match is in UI:** claim-slice has no access to sales-store /
service-store / customers-store. If auto-match logic lived in the slice,
we'd have cross-store coupling. UI-layer computes + passes boolean.

---

### 8. Dashboard pending-claims card

**File:** `apps/staff-web/src/components/dashboard/pending-claims-card.tsx`

**RBAC:** `<Gate role={['R09', 'R12', 'R03', 'R19', 'R22', 'R24']} fallback="hide">`
— lower ranks see no card, no count, no list. Per PLAN-VEHICLES-002 L6.

**Outlet scoping:** `R09/R10` see same-outlet claims only; R19+ pan-India.
The filter joins `OwnershipClaim → VehicleMaster.firstTouchOutletId` via
the vehicles-store selector.

**Reuses `ClaimReviewPanel`:** clicking Review opens the same
SlideInPanel used on `/vehicles/ownership-queue`. No forked UI.

---

### 9. Confidentiality masking (`maskedContactFor`)

**Helper:** `@dms/vehicles-core/src/contact-mask.ts`

**Call sites** (8 components):
- `apps/staff-web/src/components/customers/customer-360-header.tsx`
- `apps/staff-web/src/components/customers/customers-table.tsx`
- `apps/staff-web/src/components/customers/tabs/customer-profile-tab.tsx`
- `apps/staff-web/src/components/customers/tabs/confidential-toggle.tsx`
- `apps/staff-web/src/components/vehicles/ownership-queue/claim-review-panel.tsx`
- `apps/staff-web/src/components/service/jobcard-detail-view.tsx`
- `apps/staff-web/src/components/service/appointment-detail-view.tsx`
- `apps/staff-web/src/components/service/action-flows/appointment-checkin-dialog.tsx`

**Contract:**
```ts
maskedContactFor(
  customer: { phone?; email?; addressLine?; contactConfidential?: boolean },
  viewerRank: number,
): ContactView
```

Returns `isMasked: true` when `customer.contactConfidential === true` AND
`viewerRank < R19_RANK (=6)`. Otherwise raw values.

**Mask format:**
- Phone: `+91 *** *** **42` (last 2 digits shown)
- Email: `a***@***.com` (first letter + redacted domain)
- Address: literal `'Hidden — confidential'`

**Critical bug fix:** `R19_RANK = 6` (not 4 — was wrong in initial
Phase A, fixed in Phase E). Must match `ROLE_RANK['R19']`.

---

### 10. Sidebar role switcher

**File:** `apps/staff-web/src/components/shell/staff-sidebar.tsx:414+`

**Trigger:** "Switch role" menuitem inside the user dropdown (avatar
bottom-left). Anchored via `roleTriggerRef`.

**Portal:** because the sidebar `<aside>` has `overflow-hidden` (for the
collapse animation), the submenu is portaled to `document.body` with
fixed positioning anchored to the trigger's `getBoundingClientRect()`.
Auto-flips upward near the viewport bottom. Max-height capped to
`min(360px, calc(100vh - 24px))` with `overflow-y-auto` scroll fallback.

**Action:** each menuitem calls `switchRole(profile.role)` from the
staff-auth-provider, which:
1. Finds the matching profile in `MOCK_STAFF_PROFILES` by role code
2. Writes to `localStorage['bn-staff-user-v2']`
3. Updates the provider state — all `Gate`s + `hasRank` checks re-evaluate

**Dev-only affordance:** mock auth is localStorage-backed. Backend
replaces with real session in v2.

---

## Other cross-store reads (not seams — same-module internal)

For completeness, these `getState()` calls exist but don't cross modules:

- `ownership-tab.tsx:57+` — reads vehicles-store's own selectors
- `photos-panel.tsx:45` — reads service-store's own photos

## Test coverage map

| Seam | Unit tests | Integration tests |
|---|---|---|
| 3 (GRN→Service reserve) | `grn-slice.test.ts` covers postGrn return; service reserve action tested separately | Manual smoke via `/parts/grn/[id]` Post dialog |
| 4 (JC intake → Vehicles) | `hydrator-backfill.test.ts` covers walk-in backfill path; form test stubbed | Manual: `/service/jobcards/new` with unknown VIN |
| 5 (Inventory → Vehicles) | — | Smoke via `/inventory/new` both branches |
| 6 (SO → transfer-first) | `ownership-slice.test.ts` covers transferOwnership atomicity | Smoke via SoCompleteDialog |
| 7 (Portal claim → auto-match) | `auto-match.test.ts` covers priorClaims guard | Smoke via `/(portal)/vehicles/claim` |
| 8 (Dashboard claims card) | — | Smoke via `/dashboard` at R09+ |
| 9 (maskedContactFor) | `contact-mask.test.ts` — 13 tests covering all branches | Smoke via Customer 360 at R09 vs R24 |

Integration-test coverage is thin. **v2 adds Playwright E2E** per spec
open-items.

## Gotchas to carry forward

1. **Hydrator mount order matters.** If GRN detail page loads before
   service-store hydrates (e.g. deep-link direct to `/parts/grn/abc`
   without visiting `/service/`), `reserveJobCardParts` may throw
   because the JC isn't loaded. Seam 3 swallows this silently — GRN post
   still succeeds. Global hydrator mount at `AppShell` resolves this for
   most flows; the silent catch is a defence.
2. **`transferOwnership` uses closeReason across all ACTIVE rows.**
   Joint pairs close with the same reason in one immer transaction.
3. **Lenient `safeVin` in hydrator vs strict `normalizeVin` in forms.**
   Legacy fixture VINs with `Z` chars (banned by ISO 3779) are
   grandfathered via `safeVin` (trim + upper). Form inputs still reject.
4. **Portal adapter strips staff-only fields.** Never import
   `StaffDocumentMetadata` or any staff-only schema into customer-web —
   the portal adapter at `apps/customer-web/src/lib/portal/portal-vehicle-adapter.ts`
   enforces this boundary.
5. **`console.info` / `console.log` in SoCompleteDialog + inventory
   flows** are intentional — marks where backend integration plugs in
   for v2. Do not remove without replacing with the real call.

## Changelog

| Date | Change |
|---|---|
| 2026-04-21 | Created. Documents 10 cross-module seams with file:line + flows + ordering + error handling + gotchas. Verified against commit `f75e4c7`. Future seams added here at introduction time. |
