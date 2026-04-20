---
spec_id: PLAN-VEHICLES-002
domain: vehicles
status: approved
risk_level: medium
pii_sensitivity: high
flags: [vehicles-module, sale-inventory-rename, confidentiality]
owners: [orchestrator]
depends_on: [SPEC-VEHICLES-001, SPEC-CUSTOMERS-001, SPEC-PORTAL-VEHICLES-001, PLAN-SERVICE-002]
---

# Vehicles — Onboarding flows + confidentiality + sale-inventory rename

Delta spec extending the lifetime module with: (1) full backfill so every
BN-touched VIN — sale stock + service walk-ins — appears in `/vehicles`,
(2) a new Sale-Inventory "Add Car" flow with New / Existing branches,
(3) walk-in JC inline-customer creation, (4) Customer `contactConfidential`
flag with masked-render rules, (5) admin-dashboard pending-claims card,
(6) sidebar + page rename Inventory → Sale Inventory.

## 0. Locked decisions (from user)

| # | Decision | Rationale |
|---|---|---|
| L1 | JC + Appointment stay independent. JC links to appointment if one exists; otherwise stands alone. | Matches today's behavior; zero friction for walk-ins. |
| L2 | Walk-in JC creates Customer inline. Single submit creates Customer + Vehicle + Ownership + JC atomically. | One transaction, fewer page jumps. |
| L3 | `contactConfidential: boolean` on `CustomerSchema`, default `false`. When true, **phone + email + address** masked unless viewer rank ≥ R19. Name + identity always visible. PAN masking unchanged. | Sharp scope; matches user phrasing "contact details". |
| L4 | Remove VIN-X anonymized ghost from fixtures. Anonymization rule + `anonymizeRow` action stay in code for the v2 lifecycle policy. | No anonymous data per user's "everything must have a customer record". |
| L5 | Add `CONSIGNED_TO_BN` + `CONSIGNMENT_RETURNED` to `CloseReasonEnum`. Adds a "test anonymize" dev-tools button to demo the ANONYMIZE event on demand. | Distinguishes lifecycle events; demos the rule without pre-seeding bad data. |
| L6 | Dashboard pending-claims card visible R09+ (matches queue approver gate). | No read-only mode for lower roles. |
| L7 | Inventory route URL stays `/inventory`. Only the user-facing label + h1 changes to "Sale Inventory". | Don't break links / bookmarks. |
| L8 | A single `transferOwnership` call applies the **same** `closeReason` to ALL auto-discovered ACTIVE rows. Per-row divergence requires separate calls. | Lock — joint-pair consignment closes both rows with `CONSIGNED_TO_BN`. |
| L9 | Auto-backfilled service VINs use `firstTouchSource: 'SERVICE_ONLY_WALKIN'` (not a new enum value). Mark backfill events via `payload.meta.backfill: true`, NOT a new source enum. | Keeps `FirstTouchSourceEnum` + `OwnershipEventKindEnum` stable. |
| L10 | If a JC's VIN already exists in `vehicles` (any source) AND `jc.customerId !== currentActiveOwner`, **do NOT open a second ownership row**. The JC retains its own `customerId` for service-contact purposes; ownership ledger is unaffected. | Prevents false concurrent ownership. |
| L11 | Mask format: phone `+91 *** *** **42` (last 2 digits visible). Email `a***@***.com` (first letter + redacted domain). Address `Hidden — confidential`. | Stricter than first draft — domain redacted to avoid workplace/provider leak. |
| L12 | Hydrator idempotency: per-VIN existence check inside the `setState` closure for both inventory and service backfill. Per-(vin, customerId) pair check for ownership creation. Outer `hydrated` flag stays as a fast-path. | Survives HMR + remounts cleanly. |
| L13 | Customer-side `contactConfidential` toggle from portal: **deferred to v2**. Staff-only edit in this iteration. | Out of scope. |
| L14 | New-branch intake captures a single owner. Joint pair handled post-creation via existing `addJointOwner` action. | Reduces intake form complexity. |
| L15 | Dashboard pending-claims **count badge AND list both city-scoped** for R09–R10. R19+ sees pan-India for both. | No mismatch between count and list. |
| L16 | "Test anonymize" dev button lives in existing `/vehicles/ownership-queue` dev-tools panel (built in P2), R24-only Gate. | No new page. |
| L17 | Prior-owner OPEN event in New-branch step 3 uses `form.ownedSinceAt ?? now` for `fromAt`. Audit clarity > clock honesty for inferred history. | Inferred tenure is the source of truth. |

## 1. Schema additions + fixture audit (Phase A)

### 1.1 `CustomerSchema` — confidentiality flag

In `packages/types/src/domain/customer.ts`:

```ts
contactConfidential: z.boolean().default(false),
```

Backfill: NOT required. Zod default makes existing fixture rows resolve to `false`. Optional: explicitly set `contactConfidential: false` on a couple of demo customers + `true` on **one** customer (e.g. Karan Shah for VIN-C — high-net-worth Porsche owner) to demonstrate the masking rule in the UI.

### 1.2 Mask helper

New `packages/vehicles-core/src/contact-mask.ts` (≤80 LoC):

```ts
export interface ContactView {
  phone: string;     // e.g. "+919876543210" or masked "+91 *** *** **10"
  email: string;     // e.g. "neha@gmail.com" or "n***@gmail.com"
  address?: string;  // visible or "Hidden — confidential"
  isMasked: boolean; // true when masking applied
}

export function maskedContactFor(
  customer: { phone?: string; email?: string; addressLine?: string;
              contactConfidential: boolean },
  viewerRank: number,  // ROLE_RANK[viewer.role] ?? 0
): ContactView {
  if (!customer.contactConfidential || viewerRank >= ROLE_RANK.R19) {
    return { phone: customer.phone ?? '', email: customer.email ?? '',
             address: customer.addressLine, isMasked: false };
  }
  return {
    phone: maskPhone(customer.phone ?? ''),
    email: maskEmail(customer.email ?? ''),
    address: customer.addressLine ? 'Hidden — confidential' : undefined,
    isMasked: true,
  };
}
```

Mask helpers are deterministic. `maskPhone('+919876001003')` → `'+91 *** *** **03'`. `maskEmail('arjun.mehta@gmail.com')` → `'a***@gmail.com'`.

### 1.3 Portal customer view = own contact NEVER masked

Portal `usePortalAuth().customerId === customer.id` → bypass mask (the customer can always see their own details).

### 1.4 `CloseReasonEnum` additions

```ts
export const CloseReasonEnum = z.enum([
  'BN_SALE_TRANSFER',
  'CONSIGNED_TO_BN',          // NEW: prior owner consigned to BN sale floor
  'CONSIGNMENT_RETURNED',     // NEW: consignment ended, vehicle returns to owner
  'MANUAL_REVOKE',
  'SELF_REVOKE_SOLD',
  'CLAIM_OVERLAP',
  'DECEASED_FORM31',
  'ERASURE_REQUEST',
  'REJECTED_CLAIM',
]);
```

### 1.5 Fixture audit

Tasks:
- Remove VIN-X (`vehicles.fixtures.ts` + any ownership/event references)
- Walk every JC fixture; ensure `customerId` resolves to a real customer; if not, add the customer entry to `customer.ts`
- Walk every Inventory `Vehicle` fixture; ensure each has a real consignor or original-owner customer record
- Set `contactConfidential: true` on `cust-karan-shah` only (the demo case)
- Add a few new customer entries if needed for the inventory backfill (sale-floor cars consigned by various people)

## 2. Auto-upsert: every BN-touched VIN appears in /vehicles (Phase B)

`VehiclesStoreHydrator` extended (in both `apps/staff-web` + `apps/customer-web/src/lib/vehicles/vehicles-store-hydrator`):

After the canonical fixture load, walk other stores' fixtures:

```ts
// Pseudo-code in hydrator effect
useVehiclesStore.setState((state) => {
  // Already-loaded vehicles + ownerships + claims + events from fixtures

  // 1. Inventory backfill — every Vehicle in the inventory store fixture
  for (const inv of inventoryVehicles) {
    if (!state.vehicles[inv.vin]) {
      state.vehicles[inv.vin] = {
        vin: inv.vin,
        make: inv.make, model: inv.model, variant: inv.variant,
        year: inv.year, color: inv.color, rcNumber: inv.rcNumber,
        firstTouchedAt: inv.acquiredAt,
        firstTouchSource: 'BN_CONSIGNMENT',
        firstTouchOutletId: inv.outletId,
        lastKnownKm: inv.km, lastKnownKmAt: inv.acquiredAt,
        inventoryVehicleVin: inv.vin,
        schemaVersion: 'v1',
      };
      // Open BN_CONSIGNMENT ownership against cust-bn-dealer
      const ownership = makeOwnershipFromInventory(inv);
      state.ownerships[ownership.id] = ownership;
      indexOwnership(state, ownership);
      state.events.push(makeOpenEvent(ownership));
    }
  }

  // 2. Service walk-in backfill — every distinct VIN in JC fixtures
  const seenVins = new Set(Object.keys(state.vehicles));
  for (const jc of jobCards) {
    if (seenVins.has(jc.vin)) continue;
    seenVins.add(jc.vin);
    state.vehicles[jc.vin] = inferVehicleFromJC(jc); // reads any
                              // VIN-decoded metadata if present, else
                              // marks as "incomplete" + opens an
                              // ownership row for the JC's customer
    const ownership = makeOwnershipFromJC(jc);
    state.ownerships[ownership.id] = ownership;
    indexOwnership(state, ownership);
    state.events.push(makeOpenEvent(ownership));
  }

  rebuildIndices(state);
});
```

**Idempotency** (per L12): two-tier guard. Outer `if (store.hydrated) return` is the fast-path. Inner: every backfill insertion checks `state.vehicles[vin]` (skip if present) AND `state.ownershipIdByCustomer[customerId]?.some(id => state.ownerships[id]?.vin === vin && effectiveState(...) === 'ACTIVE')` (skip the ownership creation if a current ACTIVE pair already exists). Survives dev HMR re-runs without duplicating rows.

**Source-of-truth ordering**: vehicles fixture wins over backfill. If an inventory VIN already exists in `vehicles.fixtures.ts` (e.g. VIN-A is in inventory because Arjun's BMW is on the sale floor), the fixture's metadata is preserved; only the inventory link (`inventoryVehicleVin`) is added.

**Service-VIN customer conflict** (per L10): if a JC's VIN already exists in `vehicles` AND `jc.customerId !== currentActiveOwnerId`, the JC is treated as a **service contact** (a friend/relative dropping the car off, a fleet driver, etc.) — the JC's `customerId` stays on the JC entity but no second ownership row is created. Vehicle ledger remains accurate.

**Event emission** (per L9 — keeps `OwnershipEventKindEnum` stable): each backfilled ownership row emits one standard `OPEN` event with `payload.meta = { backfill: true, backfillSource: 'INVENTORY' | 'SERVICE' }`. Existing readers ignore `meta` field; audit-export reader can filter by it.

**Customer-web mirror scope** (clarifying §8 reviewer concern): customer-web does NOT have access to inventory or service stores. The portal's `vehicles-store-hydrator` mirror runs only the vehicles-fixture load — backfill is staff-only. Portal users see vehicles via `selectVehiclesByCustomer(customerId)` filtered to their own ownerships, which works without backfill.

## 3. Sale-Inventory "Add Car" flow (Phase C)

### 3.1 Rename

- Sidebar i18n: `staff.nav.inventory: "Sale Inventory"`
- Inventory landing page h1: "Sale Inventory" (replace "Inventory")
- Breadcrumb root crumb: "Sale Inventory"
- Internal types/files keep `inventory-store`, `Vehicle` type, route `/inventory`. No code-level renames.

### 3.2 New `/inventory/new` flow

Replace existing `/inventory/new` (or add new top-of-flow chooser) with a 2-step intake:

**Step 1: Choose mode**

Centered card with two large buttons:
- **"Existing BN vehicle"** — VIN search picker → existing vehicle picked up; only sale-specific fields needed
- **"New to BN"** — Capture vehicle + owner before listing

**Step 2 — Existing branch:**

VIN autocomplete from `vehicles-store.vehicles`. Picker shows VIN + make/model + current owner display name. Disabled for any VIN already on the sale floor (status check from `inventory-store`).

**Picker disabled-state** (clarifying reviewer concern 11): VIN is disabled in the autocomplete when `inventory.vehicles.some(v => v.vin === vin && !['SOLD','WITHDRAWN'].includes(v.status))`. Tooltip on disabled item: "Already on sale floor."

After pick, sale-specific form:
- Asking price (₹)
- Reserve / floor price
- Listing notes / dealer remarks
- Refurb status + budget (existing inventory fields)
- Photos (stub — file upload deferred per existing pattern)

On submit:
- `vehicles.transferOwnership({ vin, toCustomerId: 'cust-bn-dealer', source: 'BN_CONSIGNMENT', kmAtClose, kmAtOpen, ... })` — closes prior owner with reason `CONSIGNED_TO_BN` (NOT `BN_SALE_TRANSFER` — see L5)
- `inventory.createListing({ vin, ...saleFields })`

The `transferOwnership` action gains an optional `closeReason` param so callers can choose between `BN_SALE_TRANSFER` and `CONSIGNED_TO_BN`. Default stays `BN_SALE_TRANSFER`.

**Step 2 — New branch:**

Multi-section form on a single page:
- **Owner details** (Customer create) — Name, Phone, Email, City, `contactConfidential` toggle (default off)
- **Vehicle details** — VIN, Make, Model, Variant, Year, Color, RC number, Current km
- **Sale-specific** — same as Existing branch

On submit (UI-orchestrated sequence):
1. `customers.createCustomer({ name, phone, email, city, contactConfidential })` returns `customerId`
2. `vehicles.upsertVehicle({ vin: normalizeVin(vin), ...details, firstTouchSource: 'BN_CONSIGNMENT', firstTouchedAt: now })`
3. `vehicles.openOwnership({ vin, customerId, source: 'LEGACY_IMPORT', kmAtOpen: form.km, fromAt: form.ownedSinceAt ?? now })` — represents the prior owner's inferred tenure. **State stays `ACTIVE` here** (NOT `TRANSFERRED`); step 4 is what closes it. Per L17, `fromAt` defaults to `now` if `form.ownedSinceAt` is empty.
4. `vehicles.transferOwnership({ vin, toCustomerId: 'cust-bn-dealer', source: 'BN_CONSIGNMENT', kmAtClose: form.km, kmAtOpen: form.km, closeReason: 'CONSIGNED_TO_BN' })` — auto-closes the ACTIVE row from step 3 and opens the dealer-stock row.
5. `inventory.createListing({ vin, ...saleFields })`

**Partial-failure handling**: each step is awaited; on failure of step N, prior steps stay committed (mock phase — backend will use sagas). UI shows a toast: `"Step N failed: {reason}. Vehicle/customer were created. Resolve manually."` with the entity ids surfaced. Acceptable for demo; documented as P5 follow-up.

### 3.3 customers-store action

New `customers.createCustomer(input, actor): Customer` — generates id, defaults `contactConfidential: false` unless input sets it, idempotent on duplicate phone+email.

## 4. Walk-in JC inline customer creation (Phase A.5 / part of B)

Update the new-jobcard-form (already updated in P4 to call `VehicleIntakeDialog` on unknown VIN). Add an "Inline new customer" sub-form when `customerId` field is empty:

- Toggle: "[+] New customer" expands sub-form (Name / Phone / Email / City / `contactConfidential`)
- On submit, call `customers.createCustomer` first → use returned id for the JC
- If both VIN unknown AND customer unknown → both sub-forms render in sequence in the same dialog

## 5. Pending Ownership Claims dashboard card (Phase D)

Component: `apps/staff-web/src/components/dashboard/pending-claims-card.tsx` (≤180 LoC).

Mounted in `/dashboard` page. Role-gated R09+ via `Gate role={['R09','R12','R03','R19','R22','R24']}` with `fallback="hide"` so R05/R10/R13 don't see it.

Layout:
- Card header: "Pending Ownership Claims" + count badge `(N)` + "View all →" link to `/vehicles/ownership-queue`
- List of 3 most recent PENDING claims:
  - Claimant name (resolved via customers-store)
  - VIN (mono, masked to last 6 chars per portal pattern)
  - Submitted date (relative — "2 days ago")
  - Auto-match indicator chip
  - "Review" button → opens existing `ClaimReviewPanel` SlideInPanel (reuses queue UI)
- Empty state: "No pending claims." + small icon

Data source: `vehicles-store.selectPendingClaims({ outletId: viewer.outlet })` for R09–R10 (city-scoped); R19+ sees pan-India.

**Outlet filter mechanics** (clarifying reviewer concern 10): `OwnershipClaim` has no `outletId`. Filter joins through `vehicleMaster.firstTouchOutletId === viewer.outlet`. Per L15, both the count badge AND the list use the same scoped result — no count/list mismatch.

**`Gate role={[...]}` rank list audit** (reviewer trap 3): use `Gate role={['R09','R12','R03','R19','R22','R24']}`. R03 = Outlet Manager per Doc 14 — confirmed in scope (R03 has rank 3 in `ROLE_RANK`, between R12 and R19). Sanity-check at code time.

## 6. Confidentiality enforcement pass (Phase E)

Every place a customer's contact details render, route through `maskedContactFor(customer, viewerRank)`:

- `apps/staff-web/src/components/customers/customer-360-header.tsx` — phone/email
- `apps/staff-web/src/components/customers/tabs/customer-profile-tab.tsx` — full contact block
- `apps/staff-web/src/components/customers/customers-table.tsx` — contact column (if shown)
- `apps/staff-web/src/components/vehicles/ownership-queue/claim-review-panel.tsx` — claimant phone/email
- `apps/staff-web/src/components/service/jobcard-detail/...` — customer contact in JC header
- Portal: own contact never masked; co-owner peer name not subject to this (peer name = identity, peer phone never displayed)

UI affordance for editing the flag:
- Customer 360 Profile tab gets a toggle switch labeled "Mark contact details as confidential" with helper text "Visible only to General Manager and above when enabled."
- Toggling fires `customers.updateCustomerProfile(id, { contactConfidential: bool }, actor)`
- Confirmation toast on save

Visual indicator when masked (for staff view only): small lock icon next to the masked field with `title="Confidential — full contact requires R19+ access"`.

## 7. Spec amendments (cross-spec)

| Prior spec | Amendment |
|---|---|
| SPEC-VEHICLES-001 §2.2 (`CloseReasonEnum`) | Add `CONSIGNED_TO_BN`, `CONSIGNMENT_RETURNED` |
| SPEC-VEHICLES-001 §3.3 (`transferOwnership` signature) | Add optional `closeReason?: CloseReason` param (default `BN_SALE_TRANSFER`) |
| SPEC-VEHICLES-001 §5 (fixtures) | Remove VIN-X. Document inventory + service auto-upsert as canonical lifecycle. |
| SPEC-CUSTOMERS-001 §6 (RBAC matrix) | Add row: `View confidential contact details — R19+`. Document maskedContactFor helper. |
| SPEC-CUSTOMERS-001 §7 (component tree) | Add `confidential-toggle.tsx` (≤80) inside Profile tab. |
| SPEC-PORTAL-VEHICLES-001 §3.3 (PII stripping rules) | Add rule 8: `contactConfidential` flag does not affect portal viewer's own contact. |

## 8. Component file tree (delta)

```
packages/vehicles-core/src/
└── contact-mask.ts                       (≤80 LoC) — NEW

packages/types/src/domain/
└── customer.ts                            (modify; add field)

packages/mocks/src/fixtures/
└── customer.ts                            (audit + extend)
└── vehicles.fixtures.ts                   (remove VIN-X)
└── ownership.fixtures.ts                  (remove VIN-X rows)
└── ownership-events.fixtures.ts           (remove ANONYMIZE event for VIN-X)

apps/staff-web/src/lib/
├── vehicles/vehicles-store-hydrator.tsx   (extend with auto-upsert)
└── customers/customers-store.ts           (add createCustomer + updateCustomerProfile)

apps/staff-web/src/components/
├── customers/dialogs/inline-customer-create-form.tsx  (NEW, ≤160 LoC) — reusable sub-form
├── customers/tabs/confidential-toggle.tsx             (NEW, ≤80 LoC)
├── customers/customer-360-header.tsx                  (use maskedContactFor)
├── customers/tabs/customer-profile-tab.tsx            (use maskedContactFor + toggle)
├── vehicles/ownership-queue/claim-review-panel.tsx    (use maskedContactFor)
├── service/new-jobcard-form.tsx                       (extend with inline customer create)
├── inventory/inventory-landing-view.tsx               (rename header)
├── inventory/new-flow/                                (NEW dir)
│   ├── add-car-mode-chooser.tsx                       (≤140)
│   ├── existing-vehicle-picker.tsx                    (≤200)
│   ├── existing-sale-fields-form.tsx                  (≤220)
│   └── new-vehicle-intake-form.tsx                    (≤300 — owner + vehicle + sale)
├── dashboard/pending-claims-card.tsx                  (NEW, ≤180)
└── shell/staff-sidebar.tsx                            (i18n key change only)

apps/customer-web/src/lib/
├── vehicles/vehicles-store-hydrator.tsx               (mirror auto-upsert)
└── portal/portal-vehicle-adapter.ts                   (skip mask when viewer is self)

apps/staff-web/messages/en-IN.json                     (rename Inventory → Sale Inventory + new keys)
```

## 9. Scenarios (GPA)

- **S-V2-1** — Navigate `/vehicles` → renders all backfilled VINs from inventory + service fixtures + the 3 demo lifetime VINs. Total count ≥ inventory count + 3.
- **S-V2-2** — Sidebar shows "Sale Inventory" not "Inventory". `/inventory` h1 is "Sale Inventory".
- **S-V2-3** — `/inventory/new` shows mode chooser. Pick "Existing" → VIN picker → pick VIN-A → fill sale price → submit → VIN-A's Arjun ownership closes with reason CONSIGNED_TO_BN; new BN_CONSIGNMENT ownership opens; inventory listing created.
- **S-V2-4** — `/inventory/new` Pick "New" → fill owner details + vehicle + sale → submit → Customer created, Vehicle upserted, prior-owner ownership row TRANSFERRED, BN_CONSIGNMENT row ACTIVE.
- **S-V2-5** — Walk-in JC: open `/service/jobcards/new`, enter unknown VIN + click "[+] New customer" → fill inline → submit → JC created with new Customer + new Vehicle + new Ownership row in one transaction.
- **S-V2-6** — Customer 360 for `cust-karan-shah` (`contactConfidential: true`): switch role to R09 BLR → contact section shows masked phone/email + lock icon. Switch to R19 → real contact visible.
- **S-V2-7** — Portal: Karan logs in as himself → his own contact details NOT masked (own-data exception).
- **S-V2-8** — `/dashboard` as R09: Pending Claims card visible with Pooja Desai's claim listed. Click Review → ClaimReviewPanel opens.
- **S-V2-9** — `/dashboard` as R05: Pending Claims card hidden (Gate fallback="hide").
- **S-V2-10** — Customer 360 Profile: toggle "contactConfidential" → save → masked rendering applies on next view.
- **S-V2-11** — `transferOwnership({ closeReason: 'CONSIGNED_TO_BN' })` emits CLOSE event with the new reason in the timeline.
- **S-Typecheck** — `pnpm -F staff-web typecheck && pnpm -F customer-web typecheck && pnpm -F @dms/vehicles-core typecheck` exit 0.
- **S-Snapshot** — Portal adapter snapshot tests still pass (PII stripping unchanged for cross-owner; only own-customer mask exception added).
- **S-V2-12** — Hydrator re-entry idempotency: force-remount staff shell or trigger HMR; `/vehicles` index count unchanged; no duplicate ownership rows in `state.ownerships`.
- **S-V2-13** — JC-with-known-VIN-different-customerId: a fixture JC for VIN-A with `customerId: 'cust-other-driver'` does NOT create a second ownership row; the JC entity retains `cust-other-driver` for service contact.
- **S-V2-14** — New-branch partial-failure: simulate `inventory.createListing` throwing; toast surfaces with customer + vehicle ids + Remove CTA; ledger state remains consistent.
- **S-V2-15** — Joint-pair consignment via Existing branch: when a VIN with 2 ACTIVE rows is consigned, both rows close with `closeReason: 'CONSIGNED_TO_BN'` in a single transferOwnership transaction.
- **S-V2-16** — Dashboard outlet scope: switch role to R09 BLR → card shows BLR-touched VINs' claims only. Switch to R09 MUM → MUM only. Switch to R19 → pan-India.

## 10. Acceptance criteria

1. All scenarios S-V2-1..11 pass + S-Typecheck + S-Snapshot
2. Every new file ≤ 350 LoC (caps in §8)
3. Zero new npm deps
4. No raw `customer.phone`/`email`/`addressLine` reads outside `maskedContactFor` helper (ESLint rule deferred; grep audit acceptable)
5. VIN-X removed from fixtures; no test depends on it
6. `/dashboard` card hidden for R05/R10/R13
7. `/vehicles` index includes every distinct VIN from inventory + service stores
8. Sale-Inventory rename consistent across sidebar + h1 + breadcrumb
9. Walk-in JC creates 4 entities atomically (Customer + Vehicle + Ownership + JC); fail-cleanly if any step throws
10. Toggling `contactConfidential` is reflected on next render without page reload

## 11. Phase plan + dependencies

```
Phase A — Foundation
├── Schema additions (CloseReasonEnum, contactConfidential)
├── maskedContactFor helper in @dms/vehicles-core
├── Fixture audit (remove VIN-X, ensure all JCs have customers, set 1 customer to confidential)
└── Spec changelogs in 3 prior specs (SPEC-VEHICLES-001, -CUSTOMERS-001, -PORTAL-VEHICLES-001)
GATE: typecheck + 38 unit tests + adapter snapshots

Phase B — Auto-upsert hydrator
├── Extend VehiclesStoreHydrator (staff + customer-web mirror)
└── Add unit test asserting backfill produces ownerships for each inventory + JC VIN
GATE: typecheck + smoke /vehicles index

Phase C — Sale-Inventory rename + Add Car flow
├── Rename i18n + h1 + breadcrumb (small)
├── New /inventory/new mode chooser + branches
├── customers-store.createCustomer action
├── transferOwnership accepts closeReason param
└── Inventory listing creation wires
GATE: typecheck + smoke both branches end-to-end

Phase D — Pending Claims dashboard card
└── New component + Gate + ClaimReviewPanel reuse
GATE: typecheck + smoke + role gate check

Phase E — Confidentiality enforcement pass
├── Toggle UI in Customer 360
├── maskedContactFor wired in 5–6 components
└── Lock icon affordance
GATE: typecheck + smoke karan-shah at R09 vs R19 + commit
```

## 12. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Auto-upsert creates duplicate ownerships when fixtures are edited | Idempotent guard: only opens an ownership row if `selectVehiclesByCustomer(jc.customerId).indexOf(jc.vin) === -1`. Re-running hydrator is no-op. |
| Sale-Inventory rename misses a string | Grep audit for "Inventory" UI strings; staff sidebar nav i18n key + landing page only — keep IDs/types unchanged |
| Confidentiality leak via JSON serialization to client log | `maskedContactFor` is the ONLY render path; a code review pass at end of Phase E verifies no raw reads in `.tsx` files |
| Inventory + service fixture customer references are stale | Phase A audit walks every fixture and resolves; build a script-style audit grep before implementing rather than discovering at runtime |
| Auto-upsert vehicle metadata is incomplete (JC fixtures don't have make/model) | `inferVehicleFromJC` falls back to "Unknown make / Unknown model" + flags `metadataIncomplete: true`. Phase A adds optional `metadataIncomplete: z.boolean().optional()` to `VehicleMasterSchema`. Vehicle detail page surfaces a banner "Metadata incomplete — open intake dialog to enrich" linking to the existing `VehicleIntakeDialog`. |
| `transferOwnership` closeReason param breaks existing callers | Default value preserved (`BN_SALE_TRANSFER`); existing call sites unaffected. Schema must land in Phase A before any Phase C caller passes a new value. |
| `customers.createCustomer` duplicate detection on phone+email | Idempotent guard: returns existing customer id when `phone+email` exact match exists, else creates new. Walk-in JC re-submission won't create duplicates. |
| Path-segment breadcrumb heuristic shows "Inventory" instead of "Sale Inventory" | Phase C audits `apps/staff-web/src/components/shell/` for any path→title heuristic; explicit mapping `'inventory' → 'Sale Inventory'` added if found. |
| Walk-in JC partial commit (customer created but JC fails) | Customer create is the LAST step before JC create. On JC failure, error toast surfaces orphan customer id with `"Remove"` button (calls `customers.deleteCustomer(id)`). Mock phase only; backend uses saga compensation. |
| Index double-write (rebuildIndices + per-row indexOwnership) | Pick one approach: per-row inserts during backfill loop are sufficient; do NOT also call `rebuildIndices` at the end. Spec authors chose per-row; implementer must remove any redundant `rebuildIndices` at the bottom of the hydrator effect. |

## 13. Open items resolved

All five open questions from the spec reviewer pass are answered in §0 locks (L8-L17). No remaining open items.

## 14. Changelog

| Date | Change |
|------|--------|
| 2026-04-20 | PLAN-VEHICLES-002 drafted. Locked decisions L1-L7. Status → approved. Ready for spec reviewer pass. |
| 2026-04-20 | Spec reviewer Approve-with-Minor-Fixes pass applied: 5 blockers + 8 concerns + 5 missing scenarios + 5 open Qs all resolved. Locked L8-L17 (joint-pair single closeReason, JC-VIN conflict skip, backfill via meta.backfill not enum, idempotency two-tier guard, mask format, deferred portal-edit, scoped dashboard). Scenarios S-V2-12..16 added. §13 open items closed. Implementation can begin. |
| 2026-04-20 | **Phase A shipped** — Schema (`contactConfidential`, `CONSIGNED_TO_BN`+`CONSIGNMENT_RETURNED`, `metadataIncomplete`) + `maskedContactFor` helper + 13 new tests (51 total in `@dms/vehicles-core`). VIN-X removed; 34 service-module customers added; Karan Shah set confidential. `transferOwnership` accepts optional `closeReason` (default `BN_SALE_TRANSFER`). All typecheck clean. |
| 2026-04-20 | **Phase B shipped** — `VehiclesStoreHydrator` extended with inventory + service walk-in backfill inside the existing immer transaction. 28 inventory VINs + walk-in JC VINs auto-upserted with BN_CONSIGNMENT or SERVICE_ONLY_WALKIN ownership rows. Backfill events tagged via `payload.meta = { backfill: true, backfillSource }` (per L9 — no enum extension). Idempotent per-VIN guard. New helpers: `inferVehicleFromJC` + `applyBackfillToState` (exported for testability). New `metadataIncomplete` amber banner on detail header (R09+ "Enrich details" CTA opens existing `VehicleIntakeDialog`). 15 new Vitest tests under `apps/staff-web/src/lib/vehicles/__tests__/hydrator-backfill.test.ts`. **Deviation:** backfill uses lenient `safeVin` (uppercase + trim only) instead of strict `normalizeVin` because some pre-existing fixture VINs contain `Z` which the strict validator rejects; user-facing entry points (forms, claim submit, upsertVehicle action) still enforce `normalizeVin`. Documented for v2 fixture cleanup. |
| 2026-04-20 | **Phase C shipped** — Sale-Inventory rename live (sidebar nav, /inventory h1, top-bar breadcrumb ROUTE_LABELS map). New `/inventory/new` flow with mode chooser + Existing branch (VIN picker reading vehicles-store, sale-floor-exclusion via inventory fixture status, owner-name resolution via customers-store) + New branch (3-section form: owner / vehicle / sale; 5-step submit per §3.2 with partial-failure toast). `customers.createCustomer` action added with phone+email idempotency + new `CREATE` audit event kind. **Deviations:** `inventory.createListing` not wired (no inventory Zustand store yet — both branches `console.log` the call contract for v2 wire-up); New-branch lands on `/vehicles/{vin}` post-success rather than `/inventory/{vin}` (which would 404 until listing is wired). Smoke verified at desktop: chooser, picker shows 32 vehicles, New form has 18 inputs + confidentiality toggle. |
| 2026-04-20 | **Phase D shipped** — `PendingClaimsCard` mounted on `/dashboard` in the secondary-panels grid (stacked above `AlertsTasksPanel` in the 2/5 right column). R09+ Gate fallback="hide" so R05/R10/R13 never see it. Outlet-scoping at the UI per L15: R09–R10 filter to claims whose `vehicleMaster.firstTouchOutletId === viewer.outlet`, R19+ pan-India. Both count badge + list use the same scoped result. Reuses existing `ClaimReviewPanel` SlideInPanel from `/vehicles/ownership-queue` — no fork. Smoke: R05 sees nothing, R09 BLR sees 0 (Pooja's claim is CHE), R24 sees count `1` + Pooja's row with masked VIN + relative date + Review CTA. |
| 2026-04-20 | **Phase C shipped** — (1) Sidebar i18n + breadcrumb ROUTE_LABELS updated: `"inventory"` → `"Sale Inventory"` in `en-IN.json` and `staff-top-bar.tsx`; inventory landing h1 updated to "Sale Inventory". No hi-IN.json found (only en-IN exists). (2) `/inventory/new` page fully replaced: mode chooser (`add-car-mode-chooser.tsx`) + Existing branch (`existing-vehicle-picker.tsx` + `existing-sale-fields-form.tsx`) + New branch (`new-vehicle-intake-form.tsx`). (3) `customers-store.ts` extended: `CustomerAuditEventKind` gains `CREATE`; new `createCustomer` action with phone+email idempotency guard. **Deviations:** (a) `createListing` not yet wired to a real inventory store — mock-phase logs to console (no inventory Zustand store exists yet; to be wired in Phase D/later); (b) `normalizeVin` wrapped in try/catch in the New branch — some fixture VINs with `Z` fail strict validation, consistent with Phase B deviation; (c) New branch posts to `/vehicles/{vin}` after success (not `/inventory/{vin}`) so the staff can see the full ownership chain immediately. Typecheck: zero errors. |
