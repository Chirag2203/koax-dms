---
audit_id: FIXTURE-COV-001
date: 2026-04-28
status: complete
blocker_for: PLAN-VEHICLES-003 P3 (Documents tab)
---

# Fixture Coverage Audit — Cross-Module Data Consistency

Audit triggered by user report 2026-04-21: VIN `WBY2Z21090VX45678` shows Sales-tab data on `/vehicles/[vin]` but `/inventory/[vin]` shows no cost ledger or timeline. Pre-condition blocker for PLAN-VEHICLES-003 P3.

---

## 1. Per-VIN Coverage Matrix

**Legend:** ✓ = present / D = derived at hydration / ✗ = absent

28 VINs in `vehicles.ts`. 10 covered by `inventory.ts`. 3 disjoint VINs in `vehicleMasters` (VIN-A/B/C). 1 ghost VIN in `deals` only.

| VIN | vehicles.ts | vehicleMasters | costLedger | appraisals | timelineEvents | vehicleDocuments | ownershipRows | ownershipEvents | deals |
|---|---|---|---|---|---|---|---|---|---|
| WP0AB2A91MS247831 | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | D | D | ✓ (5 deals incl. delivered) |
| WP0ZZZ97ZNS112045 | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | D | D | ✓ (4 deals up to sales-order) |
| WP1ZZZ9YZPS034789 → WDC2229601A234567 (8 more) | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | D | D | ✗ |
| **18 BMW/Audi/LR/Jaguar/Volvo VINs** | **✓** | **✗** | **✗** | **✗** | **✗** | **✗** | **D** | **D** | **✗** |
| WBA3A5C50DF123456 (VIN-A) | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| WAUFGAFR9LA003456 (VIN-B) | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| WP0AB2A98KS123456 (VIN-C) | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| **SALVA2BN8HA198012 (ghost)** | **✗** | **✗** | **✗** | **✗** | **✗** | **✗** | **✗** | **✗** | **✓ (5 incl. delivered)** |

**Asymmetric coverage summary:**
- 18 inventory VINs (vehicles 11–28) have storefront + derived ownership but **zero** inventory-detail data
- `vehicleMasters` and `vehicles.ts` have **zero overlap** (two disjoint VIN sets)
- `SALVA2BN8HA198012` has 5 deals incl. delivered — but no VehicleMaster, no inventory entry. `buildDerivedSalesEvents` skips it; Kanban shows it fine; `/inventory/[vin]` 404s

---

## 2. Single-Source-of-Truth Violations

### 2.1 `listedAt`
| Source | Location |
|---|---|
| Storefront | `vehicles.ts:64` `vehicle.listedAt` |
| Inventory ref | `inventory.ts:37` `vehicleRefs[].listedAt` |
| Hydrator-derived | `vehicles-store-hydrator.tsx:641` (set from LISTED event) |

**Drift risk:** Editing `vehicleRefs.listedAt` independently of `vehicles.ts:listedAt` causes Inventory cost-ledger dates to disagree with Sales-tab acquired dates. Currently aligned for 10 curated VINs by manual coincidence.

### 2.2 Acquisition Cost (HIGHEST RISK)
| Source | Computation | For WP0AB2A91MS247831 |
|---|---|---|
| Cost ledger | `inventory.ts:68` explicit `amount` | ₹1,02,40,000 |
| Sales hydrator | `hydrator:442` `round(listPrice × 0.85)` | ₹1,08,80,000 |

**₹6,40,000 discrepancy on the same vehicle** — Costs tab and Sales tab show different acquisition costs simultaneously. For the 18 uncurated VINs only the heuristic exists.

### 2.3 Km at Acquisition
| Source | Value |
|---|---|
| `vehicles.ts:vehicle.km` (current) | 18,400 |
| `hydrator:455` `kmAtAcquisition: v.km` | 18,400 (wrong — uses today's km as historical) |

ACQUIRED event stores today's km as if it were the km at acquisition.

### 2.4 Prices (4-way overlap)
- `vehicle.price` (on-road, computed) — `vehicles.ts:49`
- `vehicle.pricing.exShowroom` — `vehicles.ts:50`
- `vehicleRefs[].exShowroom` — `inventory.ts:37`
- `Deal.amount` — `sales.ts` (on-road, doesn't match `pricing.onRoadPrice`)

LISTED event reads `pricing.exShowroom ?? price` — falls back to on-road price for VINs without pricing breakdown, inflating acquisitionCost.

### 2.5 Customer IDs (HIGH risk)
`hydrator:415` `customerIdFromName('Vikram Desai')` → `'cust-vikram-desai'`. **Not verified against canonical customer fixture IDs.** SOLD event's `buyerCustomerId` is likely a dangling FK; customer detail's `selectVehiclesByCustomer` won't find this vehicle.

---

## 3. Cross-Module Derivations Audit

### 3.1 Vehicles Phase B (`applyBackfillToState`) — `hydrator:180–395`
| Step | Inputs | Outputs | Heuristics |
|---|---|---|---|
| B.1 inventory backfill | `vehicles.ts` (28 VINs) | VehicleMaster + 2-row ownership chain | `acquiredAt = listedAt − (15+hash%30)d`; `priorOwnedSince = acquiredAt − (2+hash%3)y`; km hash-derived |
| B.2 JC walk-in backfill | `jobCards` | VehicleMaster (`metadataIncomplete`) + SERVICE_ONLY_WALKIN ownership | none |

### 3.2 Vehicles Phase C (`buildDerivedSalesEvents`) — `hydrator:419–581`
| Event | Inputs | Heuristics |
|---|---|---|
| ACQUIRED | each inv VIN | `acquiredAt = listedAt − (15+hash%30)d`; `acquisitionCost = round(exShowroom × 0.85)`; `kmAtAcquisition = vehicle.km` (current — wrong) |
| LISTED | each inv VIN | `listPrice = pricing.exShowroom ?? price` (fallback inflates) |
| RESERVED | most-advanced deal per VIN | `depositAmount = round(amount × 0.1)`; `expiresAt = lastActivityAt + 7d` |
| SOLD | `delivered` deals | `buyerCustomerId = customerIdFromName(...)` — dangling FK; `sellerSignatures: []` always |

### 3.3 Service / Parts / Customers hydrators
No derivation — direct fixture seed only. No cross-module reads.

---

## 4. Recommendation: Option B (single-source derivation)

**Why not A (expand fixtures):** Authoring ~90 cost ledger entries, 18 appraisals, ~120 timeline events, 72 documents manually for the missing 18 VINs. O(VIN-count) maintenance.

**Why not C (restrict derivation to 10):** Breaks demo — Kanban becomes decorative, Sales tab empty for 18 vehicles.

**Why B:** Aligns with L42 ("no hardcoded seeds, derive from real data"). User preference. Closes blank-page bug for all 28 VINs.

### B implementation

**Canonical source per field:**

| Field | Canonical | Derivation |
|---|---|---|
| `listedAt` | `vehicles.ts:vehicle.listedAt` | Deprecate `vehicleRefs.listedAt`; inventory hydrator reads from `vehicles.ts` |
| `exShowroom` | `vehicles.ts:vehicle.pricing.exShowroom` | Deprecate `vehicleRefs.exShowroom` |
| Acquisition cost | Cost ledger if present, else `round(exShowroom × 0.85)` | New selector `getCostLedgerAcquisitionAmount(vin)` |
| `kmAtAcquisition` | New `vehicleRefs.kmAtAcquisition` for 10 curated; else hash-derived delta | Same hash approach as Phase B |
| Buyer customerId | Customer-fixture lookup by `displayName` | Fall back to kebab + warning log |
| Cost ledger / appraisal / timeline / docs (uncurated) | Generated at hydration | New "Phase D" inventory stubs hydrator |

**Migration steps:**
1. Add `Phase D` to vehicles hydrator: for each `vehicles.ts` VIN not in `inventory.ts`, generate stub cost ledger (1× acquisition entry), 1× appraisal from `certificationPoints`, 4× timeline events (CREATED/REFURB_STARTED/REFURB_COMPLETE/PUBLISHED), 2× documents (RC + Insurance using `registrationState`/`registrationExpiry`)
2. Replace `acquisitionCost` heuristic with selector reading cost ledger first
3. Pass `customers` fixture to `buildDerivedSalesEvents`; lookup by display name; fall back to kebab + warn
4. Extract `computeAcquiredAt(listedAt, vin)` shared helper for Phase B + C identity
5. Add `kmAtAcquisition` field to `vehicleRefs[]` for 10 curated VINs; derive for others
6. Move `inventory.ts` consumers to read `vehicles.ts` for `listedAt`/`exShowroom`
7. Decide on `SALVA2BN8HA198012` ghost VIN: either add to `vehicles.ts` + inventory, or scrub from deals fixture

---

## 5. L45 Draft

```
| L45 | **Fixture single-source-of-truth**: `vehicles.ts` is the canonical source for `listedAt`, `exShowroom`, `km`, and identity for all 28 inventory VINs. `inventory.ts:vehicleRefs[]` is deprecated as a source of `listedAt`/`exShowroom`; those are read from `vehicles.ts` at hydration. For VINs lacking explicit cost ledger/appraisal/timeline/document fixtures, a new Phase D inventory-stubs hydrator generates: 1× acquisition ledger entry (`round(exShowroom × 0.85)`), 1× appraisal (from `certificationPoints`), 2× documents (RC + Insurance), 4× timeline events (CREATED/REFURB_STARTED/REFURB_COMPLETE/PUBLISHED). Heuristic `acquisitionCost = round(exShowroom × 0.85)` is replaced by selector `getCostLedgerAcquisitionAmount(vin)` reading explicit ledger first. `customerIdFromName` is replaced by customer-fixture display-name lookup with kebab fallback + warning log. Shared `computeAcquiredAt(listedAt, vin)` helper extracted so Phase B + C are provably identical. Pre-condition for P3 (Documents tab). | fixture-coverage-audit.md §4, FIXTURE-COV-001 |
```
