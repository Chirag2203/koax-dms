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
| 11 | Custom Builds new-flow → Customers | `wizard-step-customer.tsx` → `createCustomer()` → `CustomerSchema` (with `dpdpConsentGivenAt`) | SPEC-CUSTOM-BUILDS-001 §32 L65 |
| 12 | Custom Builds new-flow → Vehicles | `wizard-step-vehicle.tsx` → `upsertVehicle` + `openOwnership` + `appendEvent` (source: `CUSTOM_BUILD_LINKED`) | SPEC-CUSTOM-BUILDS-001 §32 L66, L67 |
| 13 | Vehicles Sales tab → Inventory new (existing) | `sales-tab.tsx` "Put on Sale" CTA → `/inventory/new?mode=existing&vin=<vin>` (page reads `vin` query param + skips picker) | PLAN-VEHICLES-003 L12 (moved to Sales tab 2026-04-29) |
| 14 | Insurance Compare → Customers | `compare-view.tsx` customer typeahead → `useCustomersStore.customers` (existing) OR `createCustomer()` (new mode → Save as new lead) | SPEC-INSURANCE-001 §42 L_P1_5 |
| 15 | Insurance Compare → Vehicles (linked) | `compare-view.tsx` linked-vehicle picker → `useVehiclesStore.ownershipIdByCustomer[customerId]` filtered to `state === 'ACTIVE'` | SPEC-INSURANCE-001 §42 L_P1_5 |
| 16 | Insurance Compare → New Lead | `compare-view.tsx` "Save as new lead" → sessionStorage `bn-insurance-comparison-handoff` → `/insurance/leads/new?from=compare` | SPEC-INSURANCE-001 §42 L_P1_7 |
| 17 | Insurance Compare → Existing Lead | `compare-view.tsx` "Attach to existing lead" → `AttachToLeadDialog` → `saveQuote(leadId, q)` per quote → routes to lead detail | SPEC-INSURANCE-001 §42 |
| 18 | Vehicles → Reports (P&L revenue) | `vehicles-store.salesEvents[].salePrice` (kind='SOLD') → `selectOutletPnL` in `lib/reports/selectors/p-and-l-selectors.ts` | SPEC-REPORTS-001 §19 |
| 19 | Vehicles → Reports (cost ledger) | `vehicles-store.costLedger[].amount` (category: acquisition/refurb/parts) → `selectOutletPnL` direct cost computation | SPEC-REPORTS-001 §19 |
| 20 | Vehicles → Reports (inventory aging) | `vehicles-store.vehicles` (listingStatus, listingCreatedAt, outletId) → `selectInventoryAging` histogram | SPEC-REPORTS-001 §19 |
| 21 | Vehicles → Reports (sales velocity) | `vehicles-store.salesEvents` (kind='SOLD', eventAt, outletId) → `selectSalesVelocity` weekly trend | SPEC-REPORTS-001 §19 |
| 22 | Service → Reports (SLA) | `service-store.jobCards` (status, receivedAt, deliveredAt, outletId) → `selectServiceSlaMedian` median computation | SPEC-REPORTS-001 §19 |
| 23 | Insurance → Reports (attachment rate) | `insurance-store.leads` (createdAt, vin) cross-joined with `vehicles-store.salesEvents` → `selectInsuranceAttachmentRate` | SPEC-REPORTS-001 §19 |
| 24 | Custom Builds → Reports (revenue contribution) | `custom-builds-store.buildJobs` (stage='DELIVERED', quoteTotal, deliveredAt, outletId) → `selectCustomBuildsRevContribution` | SPEC-REPORTS-001 §19 |
| 25 | Staff → Reports (utilisation + P&L operating cost) | `staff-store.attendancePunches` (hoursWorked) + `staff-store.staffProfiles[].grossSalary` → `selectStaffUtilisation` and operating cost arm of `selectOutletPnL` | SPEC-REPORTS-001 §19 |
| 26 | Insurance → Notifications (write-through audit) | `whatsapp-slice.ts` post-BSP-success → `notifications-store.recordSent({ module: 'INSURANCE', channel: 'WHATSAPP', ... })` | SPEC-NOTIFICATIONS-001 §8 Seam 26 |
| 27 | Service Booking → Notifications (write-through audit) | `service-store.ts` `confirmPortalBooking` / `createPortalBooking` / `declinePortalBooking` → `notifications-store.recordSent({ module: 'SERVICE_BOOKING', channel: 'SMS', ... })` replaces `console.log('[DLT STUB] ...')` | SPEC-NOTIFICATIONS-001 §8 Seam 27 |
| 28 | Custom Builds → Notifications (write-through audit) | `job-slice.ts` stage transitions with customer-facing comms → `notifications-store.recordSent({ module: 'CUSTOM_BUILDS', channel: 'WHATSAPP', ... })` | SPEC-NOTIFICATIONS-001 §8 Seam 28 |
| 29 | Customers → Notifications (write-through audit) | `customers-store` post-`createCustomer` consent confirmation + post-`withdrawConsent` acknowledgement → `notifications-store.recordSent({ module: 'CUSTOMERS', channel: 'SMS', ... })` | SPEC-NOTIFICATIONS-001 §8 Seam 29 |
| 34 | Finance GST → Vehicles sales-events selector | `/finance/gst` page → `useVehiclesStore.getState().selectSoldEventsInPeriod(period, scope)` (read-only); per-VIN row composes salePrice + customerPan + gstMargin payload from PLAN-VEHICLES-003 L4 | SPEC-FINANCE-001 §9 Seam 18 / L1 |
| 35 | Finance GST drill-down → Vehicles cost-ledger selector | `/finance/gst/[vin]` → `useVehiclesStore.getState().selectAllowableRefurbForVin(vin, beforeTimestamp)` (read-only); sums cost-ledger entries with `isAllowableRefurb: true` before the SOLD timestamp | SPEC-FINANCE-001 §9 Seam 19 / L1 |
| 36 | Finance Customer Ledger → 3-source aggregator | `/finance/customer-ledger/[customerId]` reads `useVehiclesStore` (sales-event invoices), `useServiceStore` (RO invoices), `useCustomBuildsStore` (build job invoices) + mock `customerPayments` fixture; all read-only; interleaved chronological view | SPEC-FINANCE-001 §9 Seam 20 / L18 |
| 37 | Finance TCS Register → Vehicles sales-events PAN aggregator | `/finance/tcs` → `useVehiclesStore.getState().selectSalesEventsByPan(fy)` (read-only); reads `tcsWaived` + `tcsWaivedReason` from event payloads per PLAN-VEHICLES-003 L18; threshold chip per L21 | SPEC-FINANCE-001 §9 Seam 21 / L2, L3 |
| 38 | Finance Journal → multi-source voucher composer | `/finance/journal` → composes `JournalEntry[]` via `composeJournalEntries(period, scope)` reading sales events + service ROs + custom-build invoices + paid vendor invoices + payroll runs; pre-export `assertVoucherBalanced` per voucher; idempotent byte-identical CSV per L30 | SPEC-FINANCE-001 §9 Seam 22 / L9, L28, L30 |
| 39 | Vehicles ACQUIRED → Shoots auto-create | `ShootsStoreHydrator` — after seeding fixture shoots, iterates `inventoryVehicles` (each has an ACQUIRED event via Phase C) → `useShootsStore.getState().createShoot(vin, outletId, actor)` (idempotent per L6); live path: `VehicleSalesTab` ACQUIRED CTA → `assertShootComplete` skipped, `createShoot` called in same handler | SPEC-SHOOTS-001 L1, Seam 39 |
| 40 | Vehicles LISTED guard → Shoots store | `VehicleSalesTab` "List Vehicle" CTA → `assertShootComplete(vin)` (from `src/lib/shoots/shoots-listed-guard.ts`) → throws `ShootIncompleteError` if shoot exists + assetCount < 10 or videoCount < 1; guard skipped if no shoot for VIN (service-only walk-in per L9) | SPEC-SHOOTS-001 L2, L9, Seam 40 |
| 30 | Service JC detail → Leads store (B1) | `JobCardDetailView` upgrade-ready banner "Create sales lead" CTA → `useLeadsStore.getState().createLead({ vin, customerId, source: 'SERVICE_UPGRADE', stage: 'NEW' })` with graceful fallback toast if B1 not shipped (L3) | SPEC-SERVICE-SALE-001 L3, L4 |
| 31 | Service store → Reports (service-to-sale conversion) | `selectServiceToSaleConversion` reads `state.service.jobCards` (denominator: upgrade-eligible JC count in period+scope) + `state.salesDeals` (numerator: SERVICE_UPGRADE leads closed-won) | SPEC-SERVICE-SALE-001 L5, L9 |
| 41 | Leads UI → Customers store (READ) | `lead-detail-page.tsx` + `lead-card.tsx` → `useCustomersStore(s => s.customers[lead.customerId])` (read-only); resolves customer name + phone for display; no mutation of customers-store from leads module | SPEC-LEADS-001 §13 Seam 39 (renumbered 41) |
| 42 | Leads UI → Vehicles store (READ) | `lead-detail-page.tsx` + `new-lead-page.tsx` + `lead-card.tsx` → `useVehiclesStore(s => s.vehicles[lead.vehicleInterestVin])` (read-only); resolves make/model/year for display in VIN picker and detail view; no mutation of vehicles-store | SPEC-LEADS-001 §13 Seam 40 (renumbered 42) |
| 43 | Service → Leads store (WRITE, P1 stub) | `JobCardDetailView` "Create sales lead" CTA → `useLeadsStore.getState().createLead({ source: 'service-upgrade', customerId, vehicleInterestVin: vin, outletId }, actor)` (P1: fires toast stub; P2: live call when B1 is shipped); fallback toast shown if `LeadsStoreHydrator` not mounted | SPEC-LEADS-001 §13 Seam 41 (renumbered 43), L16 |
| 44 | Test Drive createBooking → Sales Deals upsert | `useTestDriveStore.createBooking` action → `useSalesDealsStore.getState().upsertDealFromTestDrive(...)` (best-effort try/catch; booking succeeds even if deal upsert fails); back-ref `booking.linkedDealId` set on success | SPEC-TEST-DRIVE-001 cross-module integration |

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

### 11. Custom Builds new-flow → Customers

**File:** `apps/staff-web/src/components/custom-builds/new-flow/wizard-step-customer.tsx`

**Call chain:**
```tsx
// User clicks "+ Create New Customer" → fills inline form → submits
const onNewCustomerSubmit = handleSubmit((values) => {
  const newCust = useCustomersStore.getState().createCustomer(
    {
      name: values.name,
      phone: values.phone,
      email: values.email,
      preferredCity: values.preferredCity,
      preferredLanguage: values.preferredLanguage,
      dpdpConsentGivenAt: new Date().toISOString(), // DPDP §9
    },
    actor,
  );
  // Auto-select + flag wizard state
  onUpdate({ ...data, customerId: newCust.id, customerName: newCust.name, customerCreatedDuringWizard: true });
});
```

**DPDP gate:** The `dpdpConsent: z.literal(true)` field is required in the form schema.
The form rejects submit if the checkbox is not checked. `dpdpConsentGivenAt` is stored as
an ISO timestamp on the `Customer` record.

**Idempotency:** `createCustomer` deduplicates on `(phone, email)` — submitting the same
person twice returns the existing record without creating a duplicate. `customerCreatedDuringWizard`
stays `true` even if an existing record is returned (phone+email match = probably same wizard session).

**Ordering:** customer must be created before advancing to step 2 (vehicle selection).
This is enforced by wizard step gating (`canProceed`).

**Spec:** `SPEC-CUSTOM-BUILDS-001 §32 L65`

---

### 12. Custom Builds new-flow → Vehicles

**File:** `apps/staff-web/src/components/custom-builds/new-flow/wizard-step-vehicle.tsx`

**Call chain (3-step transaction):**
```tsx
const onLinkCarSubmit = handleSubmit((values) => {
  // safeVin: try strict normalizeVin, fall back trim+upper for legacy demo VINs
  let vin: string;
  try { vin = normalizeVin(values.vin); }
  catch { vin = values.vin.trim().toUpperCase(); }

  const vehiclesStore = useVehiclesStore.getState();

  // Step a: upsert VehicleMaster
  vehiclesStore.upsertVehicle({
    vin, make, model, ...,
    firstTouchSource: 'CUSTOM_BUILD_LINKED',
    firstTouchOutletId: outletId,
  }, actor);

  // Step b: open ownership for this customer
  const ownershipId = vehiclesStore.openOwnership({
    vin, customerId, source: 'CUSTOM_BUILD_LINKED', kmAtOpen: km, fromAt: now,
  }, actor);

  // Step c: explicit audit event with wizard provenance
  vehiclesStore.appendEvent('OPEN', {
    source: 'CUSTOM_BUILD_LINKED',
    linkedFromBuildJobWizard: true,
    kmAtOpen: km,
    customerId,
  }, actor, { vin, ownershipId });

  onUpdate({ ...data, vin, vehicleLabel: label, vehicleLinkedDuringWizard: true });
});
```

**Filtering:** The vehicle dropdown is filtered via `selectVehiclesByCustomer(state, customerId, { includeGrace: true, now })`
— only shows this customer's owned VINs. New customers see empty state with "Link a Car" CTA;
existing customers see their list plus a "Link Another Car" link.

**New `VehicleTouchSource`:** `'CUSTOM_BUILD_LINKED'` added to `VehicleTouchSourceEnum` in
`packages/types/src/domain/vehicles-aggregate.ts`. No existing exhaustive switches are broken —
the enum extends additively.

**Partial-failure handling:** if `openOwnership` throws (VIN already has an active owner),
the error propagates to the UI — the `upsertVehicle` call stays committed (idempotent update
semantics), ownership is not opened. User sees error via form error state.

**Spec:** `SPEC-CUSTOM-BUILDS-001 §32 L66, L67`

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

---

### 18–25. Reports — read-only aggregation seams (SPEC-REPORTS-001)

All 8 seams are **read-only selector seams**. The Reports module reads from existing stores; it never mutates them. All seams comply with Core Invariant #1 (UI-layer only) and Invariant #2 (stores stay pure).

**Pattern:** In `apps/staff-web/app/(shell)/reports/page.tsx` (and the `useReportData` custom hook), each store is accessed via the standard Zustand selector at the top of the hook (before any conditional), then passed as a `ReportInputState` object into pure selector functions inside a `useMemo`. No store imports another store. No Zustand subscription from one store to another.

```tsx
// Canonical pattern — useReportData hook
const vehicles    = useVehiclesStore(s => s);        // seams 18–21
const service     = useServiceStore(s => s);         // seam 22
const insurance   = useInsuranceStore(s => s);       // seam 23
const customBlds  = useCustomBuildsStore(s => s);    // seam 24
const staff       = useStaffStore(s => s);           // seam 25

const state: ReportInputState = { vehicles, service, insurance, customBuilds: customBlds, staff };

const pnl = useMemo(
  () => selectOutletPnL(state, period, scope),
  [vehicles, service, staff, period, scope]  // explicit deps — no infinite-render risk (L10)
);
```

**Failure handling:** If a store hasn't hydrated (`vehicles.hydrated === false`), the selector returns `{ kind: 'count', value: null }`. The page renders `—` in the StatTile and a top-level Info Banner. No cross-store try/catch is needed — selector functions return null-safe values.

**Why read-only is safe:** All KPI values are aggregations (sums, medians, percentages). The Reports module never calls any store action (no `set`, no `immer` mutation). Confirmed by the `// L1:` comment in every selector file.

**Test coverage:** 15 selector unit tests + 1 integration test per SPEC-REPORTS-001 §16.

---

---

### 26. Insurance → Notifications (write-through audit)

**Spec:** `SPEC-NOTIFICATIONS-001 §8 Seam 26`

**File (to be modified):** `apps/staff-web/src/lib/insurance/insurance-store/slices/whatsapp-slice.ts`

**Call chain:** After `sendTemplateMessage` receives a `messageId` from the BSP (mock path: always returns), add:
```ts
try {
  useNotificationsStore.getState().recordSent({
    templateId,
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: recipientId },
    variables,
    consentSnapshot: /* read from customers-store consent log for purpose WHATSAPP_MARKETING */,
    sourceEntityId: leadId,
    sourceEntityType: 'INSURANCE_LEAD',
  });
} catch { /* L17: best-effort; log gap does not block insurance dispatch */ }
```

**Ordering guarantee:** `recordSent` is called AFTER the BSP call succeeds. A `recordSent` failure does NOT roll back the BSP send.

**Pre-condition for go-live:** The insurance WhatsApp template fixtures must have matching `NotificationTemplate` records in the notifications store with `status: 'APPROVED'` and the same `dltTemplateId`.

**Belt-and-braces in v1:** Both the insurance slice's own L13 guard AND `notifications-store.recordSent`'s L1 guard run in v1. In v1.1, the insurance slice guard is removed and `recordSent` is the single enforcement point.

---

### 27. Service Booking → Notifications (write-through audit)

**Spec:** `SPEC-NOTIFICATIONS-001 §8 Seam 27`

**File (to be modified):** `apps/staff-web/src/lib/service/service-store.ts` (lines ~1281, ~1312, ~1349)

**Pre-existing stubs (to be replaced):**
```ts
// BEFORE (v1 stub):
console.log('[DLT STUB] notifyBookingCreated', { templateId: 'DLT_SVC_BOOKING_CREATED', ... });

// AFTER (seam wired):
try {
  useNotificationsStore.getState().recordSent({
    templateId: 'DLT_SVC_BOOKING_CREATED',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: sessionCustomerId },
    variables: { job_no: jc.jobNo, outlet: jc.outlet ?? '', date: jc.scheduledDate ?? '' },
    consentSnapshot: /* customers-store consent snapshot for SERVICE_REMINDER */,
    sourceEntityId: jc.id,
    sourceEntityType: 'JOB_CARD',
  });
} catch { /* L17 */ }
```

Same pattern for `DLT_SVC_BOOKING_CONFIRMED` and `DLT_SVC_BOOKING_DECLINED`.

**Pre-condition:** Three SMS template fixtures (`DLT_SVC_BOOKING_CREATED`, `DLT_SVC_BOOKING_CONFIRMED`, `DLT_SVC_BOOKING_DECLINED`) seeded in notifications store with `status: 'APPROVED'` and mock DLT IDs.

**Implementation note (2026-04-29):** `recordSent` calls are placed AFTER the `set()` block completes, following the same pattern as `trackServiceBookingConfirmedByStaff` (which is also called from inside the store action post-set). Each call is wrapped in a try/catch per L17 so notifications never block the booking flow. The `console.log('[DLT STUB]...')` anti-pattern inside `set()` has been removed. `useNotificationsStore` imported at top of `service-store.ts`.

---

### 28. Custom Builds → Notifications (write-through audit)

**Spec:** `SPEC-NOTIFICATIONS-001 §8 Seam 28`

**File (to be modified):** `apps/staff-web/src/components/custom-builds/` — the component that calls `advanceStage`, not the slice itself (per Core Invariant #2).

**Trigger:** Stage transitions where a customer-facing notification is appropriate:
- `ENQUIRY → APPROVED` — "Your custom build has been approved"
- `PRODUCTION → READY_FOR_DELIVERY` — "Your build is ready for delivery"

**Call chain (component layer):**
```ts
// After advanceStage(jobId, next, actor) succeeds:
try {
  useNotificationsStore.getState().recordSent({
    templateId: 'DLT_CB_STAGE_UPDATE',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: job.customerId },
    variables: {
      job_title: job.title,
      stage: next,
      advisor_name: actor.name,
    },
    consentSnapshot: /* customers-store consent snapshot for DATA_PROCESSING */,
    sourceEntityId: job.id,
    sourceEntityType: 'BUILD_JOB',
  });
} catch { /* L17 */ }
```

**Ordering:** `advanceStage` succeeds first; notification is best-effort side effect.

**Note:** Only specific stage transitions trigger a notification — not every `advanceStage` call. The triggering stages (`APPROVED`, `READY_FOR_DELIVERY`) are enumerated in the fixture template `DLT_CB_STAGE_UPDATE`'s `variables[].example`.

---

### 29. Customers → Notifications (write-through audit)

**Spec:** `SPEC-NOTIFICATIONS-001 §8 Seam 29`

**File (to be modified):** `apps/staff-web/src/components/customers/` — component layer calling `createCustomer` and `withdrawConsent`.

**Triggers:**
1. `createCustomer(payload, actor)` success → send `DLT_CUST_CONSENT_CONFIRMED` SMS to confirm DPDP data-processing consent was captured
2. `withdrawConsent(consentId, reason, actor)` success → send `DLT_CUST_CONSENT_WITHDRAWN` SMS to acknowledge the withdrawal

**Call chain:**
```ts
// After createCustomer succeeds:
try {
  useNotificationsStore.getState().recordSent({
    templateId: 'DLT_CUST_CONSENT_CONFIRMED',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: newCustomer.id },
    variables: { customer_name: newCustomer.name.split(' ')[0] },
    consentSnapshot: { purpose: 'DATA_PROCESSING', capturedAt: now, capturedBy: actor.id, source: 'STAFF_FORM' },
    sourceEntityId: newCustomer.id,
    sourceEntityType: 'CUSTOMER',
  });
} catch { /* L17 */ }
```

**DPDP significance:** The `DLT_CUST_CONSENT_CONFIRMED` notification is itself a DPDP-mandated notice — the data fiduciary (BN Automobiles) must inform the data principal (customer) of the processing and their rights at the time of first contact. Per Doc 03 §10. This notification's dispatch record serves as evidence of that notice in a DSR.

---

---

### 30. Settings → Staff (outlet manager reference)

**Source:** `apps/staff-web/src/components/settings/outlets/outlet-edit-form.tsx` — manager dropdown
**Target:** `apps/staff-web/src/lib/staff/staff-store.ts`

**Contract:**
```tsx
// UI-layer only — settings-store does NOT import staff-store
const eligibleManagers = useStaffStore(s =>
  Object.values(s.profiles).filter(
    p => p.outlet === outletId && hasRank(p.role, 'R03')
  )
);
// Passed as prop to OutletEditForm; form managerId Zod schema validates against this list
```

**Failure handling:** If no R03+ staff exists for the outlet, the dropdown renders empty with hint: "No eligible managers — assign a staff member to this outlet at R03 or above first." Save is blocked.

**Per SPEC-SETTINGS-001 L3.**

---

### 31. Settings outlet deactivation → Consuming modules (inactive-outlet guard)

**Source:** `apps/staff-web/src/lib/settings/settings-store.ts` — `deactivateOutlet(id)`
**Target:** `service-booking-store`, `sales-store`, `custom-builds-store` — new entity creation actions

**Contract:**
```tsx
// Pattern enforced at the top of each consuming module's create action
const outletActive = useSettingsStore.getState().outlets[outletId]?.active ?? true;
if (!outletActive) {
  throw new OutletInactiveError(
    `Outlet ${outletId} is inactive. New ${entityType} cannot be created.`
  );
}
```

**Cross-module invariant:** Consuming modules must add this guard before the deactivate feature ships. `OutletInactiveError` bubbles to the UI as an inline form error: "This outlet is currently inactive. Contact your Org Admin to reactivate it."

**Per SPEC-SETTINGS-001 L9.**

---

### 32. Feature flags registry → All flag-gated features

**Source:** `apps/staff-web/src/lib/feature-flags/registry.ts` — canonical registry (SPEC-SETTINGS-001 L12)
**Target:** Every module that checks a feature flag (e.g., `insurance/insurance-store/slices/ai-call-slice.ts` checking `feat_insurance_ai_calling`)

**Contract:**
```ts
export function getFlag(key: string): boolean | string {
  // 1. Check settings-store in-memory override (R02+ toggle in v1)
  const override = useSettingsStore.getState().flags[key];
  if (override !== undefined) return override.value;
  // 2. Fall back to registry default
  return FEATURE_FLAG_REGISTRY[key]?.defaultValue ?? false;
}
```

**Migration note:** `ai-call-slice.ts` currently checks a hardcoded constant. It must be updated to call `getFlag('feat_insurance_ai_calling')`. The constant becomes the `defaultValue` in the registry entry.

**Per SPEC-SETTINGS-001 L6 and L12.**

---

### 33. Settings RBAC matrix view → Doc 14 action registry

**Source:** `apps/staff-web/src/lib/settings/rbac-matrix.ts` — static constant hand-maintained from Doc 14
**Target:** `/settings/rbac` route — matrix renderer

**Contract:**
```ts
// rbac-matrix.ts — derived from Doc 14 §§4-26; update on every Doc 14 change
export const RBAC_MATRIX: RbacMatrixRow[] = [
  // { domain, action, notes, cells: { R01: 'allow', R02: 'allow', ... } }
]
```

**Drift gate:** Any change to Doc 14 must be reflected in `rbac-matrix.ts`. The Settings spec drift check must compare `RBAC_MATRIX` row count and domain grouping against Doc 14 section headings.

**Read-only invariant:** Nothing writes to `rbac-matrix.ts` at runtime. RBAC edit workflow (v2) will replace this static constant with a mutable config.

**Per SPEC-SETTINGS-001 L4 and L17.**

---

## Changelog

| Date | Change |
|---|---|
| 2026-04-21 | Created. Documents 10 cross-module seams with file:line + flows + ordering + error handling + gotchas. Verified against commit `f75e4c7`. Future seams added here at introduction time. |
| 2026-04-29 | Added seams 11 + 12: Custom Builds new-flow → Customers (DPDP-gated inline create) and Custom Builds new-flow → Vehicles (CUSTOM_BUILD_LINKED upsert + ownership + audit event). Per SPEC-CUSTOM-BUILDS-001 §32 L65–L68. |
| 2026-04-29 | Added seams 13: Vehicles Sales tab → Inventory new (existing). Per PLAN-VEHICLES-003 L12. |
| 2026-04-29 | Added seams 14–17: Insurance Compare → Customers, Insurance Compare → Vehicles, Insurance Compare → New Lead, Insurance Compare → Existing Lead. Per SPEC-INSURANCE-001 §42. |
| 2026-04-29 | Added seams 18–25: Reports module — 8 read-only aggregation seams from vehicles/service/insurance/custom-builds/staff stores into `lib/reports/selectors/`. Per SPEC-REPORTS-001 §19. All seams are read-only; no store mutation from Reports. |
| 2026-04-29 | Added seams 26–29: Notifications module — write-through audit seams from Insurance, Service Booking, Custom Builds, and Customers into `notifications-store.recordSent`. Per SPEC-NOTIFICATIONS-001 §8. All seams are best-effort (try/catch at call site — L17); a log gap does not block the originating module's dispatch. |
| 2026-04-29 | Added seams 30–33: Settings module — outlet manager reference (→ staff-store), outlet deactivation guard (→ service/sales/custom-builds), feature flags registry (→ all flag-gated features), RBAC matrix constant (→ Doc 14 action registry). Per SPEC-SETTINGS-001 L3, L9, L12, L17. |
| 2026-04-29 | Added seams 34–38: Finance module (SPEC-FINANCE-001) — GST reconciliation reads sales-events + cost-ledger; TCS register reads sales-events grouped by PAN (with `tcsWaived` from PLAN-VEHICLES-003 L18); Customer ledger composes vehicles + service + custom-builds + payments; Journal preview composes all monetary modules + asserts double-entry balance per L28 + idempotent byte-identical CSV per L30. All seams are READ-ONLY — Finance never mutates upstream stores per SPEC-FINANCE-001 L14. |
| 2026-04-30 | Added seams 41–43: Leads module (SPEC-LEADS-001) — Leads UI reads customers-store for customer name/phone display (READ-ONLY, seam 41); Leads UI reads vehicles-store for VIN/make/model display and picker (READ-ONLY, seam 42); Service module "Create sales lead" CTA writes into leads-store `createLead` (WRITE, P1 stub — toast only; P2 wires live call when B1 ships, seam 43). Seam 43 corresponds to the P1 stub referenced in SPEC-LEADS-001 §13 L16. |
| 2026-04-30 | Added seam 44: Test Drive → Sales Deals (WRITE, Seam 44). `useTestDriveStore.createBooking` calls `useSalesDealsStore.getState().upsertDealFromTestDrive(...)` after booking is added to state. Best-effort (try/catch); booking creation succeeds even if deal sync fails. Back-reference `booking.linkedDealId` set on deal creation/resolution. |
