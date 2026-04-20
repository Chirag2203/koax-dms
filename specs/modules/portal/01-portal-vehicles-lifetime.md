---
spec_id: SPEC-PORTAL-VEHICLES-001
domain: portal
status: approved
risk_level: medium
pii_sensitivity: medium
flags: [portal-vehicles]
owners: [orchestrator]
depends_on: [SPEC-VEHICLES-001]
---

# Portal — My Vehicles lifetime view + claim + self-revoke (customer-web)

Evolves the existing flat `/(portal)/vehicles/[vin]` snapshot view into a
lifetime-aware view fed by `vehicles-store`, with aggregate-only summaries
for cross-owner history (DPDP-compliant), self-serve claim + revoke flows,
and watermarked PDF export.

## 1. Scope

- Evolve existing portal routes (listed in §1.1 below)
- Add `/(portal)/vehicles/claim` — self-serve claim form with auto-match fast path
- Add `/(portal)/vehicles/my-claims` — claim status list (PENDING / AUTO_APPROVED / APPROVED / REJECTED with reason category)
- Add `self-revoke` modal on `/(portal)/vehicles/[vin]`
- Add grace-window banner (7-day read access after revoke)
- Add CPO badge with eligibility reasons
- Add PDF export (watermarked, logged via `vehicles.logPdfExport`)
- PII stripping via `portal-vehicle-adapter`

### 1.1 Existing files being evolved (not deleted)

Per audit of `apps/customer-web`:
- `app/(portal)/vehicles/page.tsx` — list, currently reads `ownedVehicles` fixture. **Evolve** to use `portal-vehicle-adapter`.
- `app/(portal)/vehicles/[vin]/page.tsx` — detail, 52 LoC stub. **Evolve** to `LifetimeVehicleView`.
- `src/components/portal/vehicles/owned-vehicle-card.tsx` (140 LoC) — modernize, keep exports.
- `src/components/portal/vehicles/service-timeline.tsx` (163 LoC) — absorb into tabs/service-tab.tsx; remove.
- `src/components/portal/vehicles/vehicle-documents.tsx` (135 LoC) — absorb into tabs/documents-tab.tsx; remove.
- `src/components/portal/vehicles/vehicle-info-header.tsx` (182 LoC) — absorb into lifetime-header.tsx; remove.

**Role switcher on portal**: **OUT OF SCOPE for P3.** Deferred to a future dev-tools task. Portal will ship with a single hard-coded `MOCK_PORTAL_CUSTOMER_ID = 'cust-arjun-mehta'` seeded at auth-provider mount.

## 2. Routes

| Path | Purpose | Components | Auth |
|---|---|---|---|
| `/(portal)/vehicles` | List of customer's vehicles (ACTIVE + in-grace) | `OwnedVehiclesGrid`, `ClaimCTA` | portal auth |
| `/(portal)/vehicles/[vin]` | Lifetime view (current-owner scope + aggregate summary) | `LifetimeVehicleView` + 5 tabs | portal auth + visible via `selectVehiclesByCustomer` |
| `/(portal)/vehicles/claim` | Self-serve claim form | `ClaimForm`, `AutoMatchFeedback` | portal auth |
| `/(portal)/vehicles/[vin]/not-found.tsx` | Shell | - | - |

All routes are `'use client'`. MSW runs in the browser; no RSC data fetching.

## 3. Portal vehicle adapter

Single source of truth for converting store data → portal view. Location:
`apps/customer-web/src/lib/portal/portal-vehicle-adapter.ts` (≤220 LoC).

**Purpose:** strip all PII that doesn't belong to the current portal user. Only place where ServiceRecord / VehicleOwnership → portal view conversion happens.

**Imports from `@dms/vehicles-core`:** `effectiveState`, `normalizeVin`, `computeAutoMatch`, `isCpoEligible`, `OwnedVehicleView`, `ServiceRecordView`, `CpoBadge`. Zero imports from `apps/staff-web/*`.

### 3.1 View types

```ts
// OwnedVehicleView — derived; never persisted
export interface OwnedVehicleView {
  vin: string;
  make: string; model: string; variant?: string; year: number; color: string;
  registrationNumber: string;
  currentKm: number;
  lastKmAt: string;
  isCurrentlyOwned: boolean;    // ACTIVE
  inGrace: boolean;             // GRACE (effective-state)
  graceUntilAt?: string;
  isJoint: boolean;
  jointPeerDisplayName?: string;  // "Priya M." — only populated when viewer is a joint co-owner (D14)
  summary: OwnershipHistorySummary;
  cpoEligibility: CpoBadge;
}

export interface OwnershipHistorySummary {
  previousOwnerCount: number;   // aggregate only (DPDP)
  firstTouchedAt: string;
  totalBnServiceVisits: number;
  lastServiceAt?: string;
  warrantyClaims: { open: number; historical: number };
  nextScheduledService?: string;
  // NO names, phones, emails, addresses of previous owners — ever
}

export type CpoBadge =
  | { status: 'ELIGIBLE'; since: string }
  | { status: 'AT_RISK'; reasons: string[] }
  | { status: 'NOT_ELIGIBLE' };

// ServiceRecordView — PII-stripped service history entry
export interface ServiceRecordView {
  id: string;
  dateMonthYear: string;        // "March 2024" — not full date (§3.3 rule 2)
  type: string;
  km: number;
  cost: number;
  technicianDisplayName: string; // real name if still employed, else "Service Technician"
  items: string[];
  invoiceUrl?: string;
  status: 'completed' | 'in-progress';
}
```

### 3.2 Adapter API

```ts
export function selectVisibleVehicles(
  state: { vehicles, ownerships, ... },
  customerId: string,
  now: string,
  staffDirectory: Record<string, { status: 'active' | 'left' }>,
): OwnedVehicleView[];

export function buildOwnedVehicleView(
  vin: string,
  ownership: VehicleOwnership,
  vehicle: VehicleMaster,
  jobCards: JobCard[],
  warrantyClaims: WarrantyClaim[],
  peerActiveOwnerships: VehicleOwnership[],
  now: string,
): OwnedVehicleView;

export function buildServiceRecordViews(
  vin: string,
  ownerOwnershipWindow: { fromAt: string; toAt?: string }, // filters to owner's tenure
  jobCards: JobCard[],
  staffDirectory: Record<string, { status: 'active' | 'left'; displayName: string }>,
): { owned: ServiceRecordView[]; earlierCount: number };
// Owned = JCs in window; earlierCount = remaining JCs for VIN NOT in window (for footer "10 earlier visits")
```

### 3.3 Stripping rules (locked from research)

1. **Never emit** previous-owner `customerId`, `name`, `phone`, `email`, `pan`, `address`
2. Service history shown to current owner **is filtered to current owner's ownership window** — they don't see pre-tenure service records by default (aggregate summary shows the count)
3. Date granularity: month+year for pre-tenure summary aggregates; full date for owner's own tenure records
4. Technician name: show real name **iff** `staffDirectory[id].status === 'active'`; else "Service Technician"
5. Km-at-transfer per-owner deltas never shown (leaks usage). Only `currentKm` + `lastKmAt` on top-level view.
6. **`totalBnServiceVisits`** = count of all `JobCard` where `vin` matches AND status ∉ `{DRAFT, CANCELLED}`, regardless of owner. Aggregate only.
7. **Joint peer display** — `jointPeerDisplayName` is populated **only** when the viewer is themselves a holder of an `ACTIVE_JOINT` row on the same VIN. Format: `{firstName} {lastInitial}.` (e.g. "Priya M."). Never reveals peer phone / email / address / PAN. For all other viewers, the field is `undefined`.

### 3.4 Snapshot test requirement

Unit tests assert that `buildOwnedVehicleView` output **never contains** the following fields anywhere in its structure: `customerId` (other than current), `phone`, `email`, `pan`, `aadhaar`, `addressLine`, `previousOwnerName`. Snapshot-test against 3 fixture ownerships. This is the PII safety gate.

## 4. Lifetime view (`/(portal)/vehicles/[vin]`)

### 4.1 Tabs

| Tab | Content |
|---|---|
| **Overview** | Current km, CPO badge, warranty status, next service, "ownership history" aggregate card (previous-owner count + first-touch-at + total visits) |
| **Service** | `ServiceRecordView[]` for owner's tenure only (with "Earlier history at BN: {N} visits — request full breakdown" footer) |
| **Documents** | RC, insurance, PUC, warranty, invoices (owner-scope only per Doc 06 §DPDP) |
| **Timeline** | Compact event feed: own tenure events fully (JC done, document uploaded); pre-tenure only status-level ("Service performed Mar 2022") |
| **CPO** | Eligibility badge + reasons (if NOT_ELIGIBLE or AT_RISK) + explainer text |

### 4.2 Grace window banner

When `effectiveState(ownership, now) === 'GRACE'`:

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠  Access expires {graceUntilAt — "3 days remaining"}            │
│    This vehicle was transferred. You have read-only access for   │
│    7 days. Export your service history if needed.                │
└──────────────────────────────────────────────────────────────────┘
```

Token: `--state-overdue` amber. Dismissible but persistent across page loads.

### 4.3 CPO tab copy

**Eligible (green):**
> ✓ Certified Pre-Owned eligible  
> Serviced at BN Automobiles for {N} years — {M} service visits with no gap longer than 18 months. Your vehicle meets BN's Certified Pre-Owned standard.

**At risk (amber):**
> ⚠ Service gap detected  
> Your last service was {months} months ago. Schedule a visit within {days} days to maintain Certified Pre-Owned eligibility.

**Not eligible (hidden badge, explainer only if customer clicks "Why?"):**
> Your vehicle doesn't currently meet the Certified Pre-Owned criteria because: {reasons}. Book a service to start.

## 5. Claim flow (`/(portal)/vehicles/claim`)

### 5.1 Form fields

```
- VIN                                  [required, normalized on blur]
- Registration Number                  [required]
- Your relationship to the vehicle     [Purchased from BN / Purchased elsewhere / Inherited (Form 31) / Other]
- RC book scan                         [required, PDF/JPG, max 5 MB]
- ID proof scan                        [required if not purchased from BN]
- Notes                                [optional]
```

### 5.2 Submit flow

1. Normalize VIN (throw on invalid → inline error)
2. UI reads from sibling stores (sales-store, service-store, customers-store) via published selectors
3. Compute `computeAutoMatch(vin, currentCustomer, salesOrders, jobCards, customers)` — from SPEC-VEHICLES-001 §3.4
4. Call `vehicles.submitClaim({...}, actor)` with `autoMatchHit` boolean
5. Branch on result:
   - `autoApproved`: toast "Verified instantly — ownership active", redirect to `/vehicles/{vin}`
   - `overlapsClaimId`: toast "A prior claim is pending — yours is queued", redirect to `/vehicles` with pending chip
   - Plain pending: toast "Claim submitted — BN team will verify within 1 business day"

### 5.3 AutoMatchFeedback component

Before submit, as the user types their VIN + registration, show a live feedback chip:
- **"✓ We've seen this vehicle — you'll be verified instantly"** (auto-match found)
- **"⚠ We have no records — staff verification will be required"** (no match)

This sets expectations so users don't abandon after submit.

## 5.4 My Claims list (`/(portal)/vehicles/my-claims`)

Simple list page showing the customer's claims via `selectClaimsByCustomer(customerId)`. Each row:

- VIN (masked to last 6 chars for PII minimalism) + make/model
- Submitted date (full)
- State badge: PENDING (amber) / AUTO_APPROVED (green) / APPROVED (green) / REJECTED (red)
- For REJECTED: show generic category only ("Document mismatch" / "Vehicle already claimed" / "Identity verification failed" / "Vehicle not eligible" / "Contact support")
- Action: if REJECTED, show "Resubmit" button → opens `/(portal)/vehicles/claim` with VIN pre-filled (NOTE: auto-match is guarded — a rejected claimant cannot get AUTO_APPROVED on resubmit per SPEC-VEHICLES-001 §3.4)

Empty state: "No claim submissions yet. → Claim a vehicle"

Component: `my-claims-list.tsx` (≤180 LoC).

Link entry: `OwnedVehiclesGrid` header has a small "View my claims →" link when `selectClaimsByCustomer(customerId).length > 0`.

## 6. Self-revoke flow

Modal (not route) on `/(portal)/vehicles/[vin]` → button "I sold this vehicle".

### 6.1 Dialog content

- Heading: "Confirm sale"
- Body: "This will remove your access to this vehicle. You'll have read-only access for 7 days to export records."
- Fields:
  - "Sold on" date (default: today)
  - Optional: "New owner's name" + "New owner's phone" (helps BN contact for transfer)
  - Final km (pre-filled from `lastKnownKm`, editable)
- Confirm button: destructive variant, "Yes, I sold it"

### 6.2 Action

`vehicles.selfRevoke(ownershipId, reason, { newOwnerHint })` — sets grace 7d; immediate UI update.

Toast: "Revoked. You have read-only access until {graceUntilAt}."

## 7. PDF export

### 7.1 Trigger

"Export PDF" button on Overview tab.

### 7.2 Implementation

- Client-side HTML render in hidden iframe with print-specific CSS
- Watermark overlay div: `"Generated for {customer.name} · {date}"` fixed-position, low-opacity
- `window.print()` → user saves
- On print trigger, fire `useVehiclesStore.getState().logPdfExport(vin, customerId, actor)` (defined in SPEC-VEHICLES-001 §3.3 event-slice) → emits `PDF_EXPORT` event with payload `{ vin, customerId, generatedAt }`

**No new deps.** If users want a real PDF file, the backend phase adds server-side generation.

## 8. Component tree

```
apps/customer-web/src/components/portal/vehicles/
  owned-vehicles-grid.tsx                ≤180
  owned-vehicle-card.tsx                 ≤180 (existing, modernized)
  claim-cta.tsx                          ≤80
  lifetime-vehicle-view.tsx              ≤200 (tabs shell + grace banner)
  lifetime-header.tsx                    ≤140 (image, make/model, current km, CPO, export button)
  tabs/overview-tab.tsx                  ≤180
  tabs/service-tab.tsx                   ≤200
  tabs/documents-tab.tsx                 ≤160
  tabs/timeline-tab.tsx                  ≤160
  tabs/cpo-tab.tsx                       ≤140
  claim-form.tsx                         ≤260 (form + file upload stubs)
  auto-match-feedback.tsx                ≤80
  self-revoke-dialog.tsx                 ≤160
  export-pdf-button.tsx                  ≤120
  grace-banner.tsx                       ≤80
  my-claims-list.tsx                     ≤180
```

Plus one helper:
```
apps/customer-web/src/lib/portal/
  portal-vehicle-adapter.ts              ≤220
  portal-auth.ts                         ≤80 (if PortalAuthProvider needs shim)
```

All ≤350 LoC.

## 9. Portal auth audit

**P1 task**: audit `apps/customer-web` for existing auth state.
- If `PortalAuthProvider` exists with `useAuth()` returning `{ customerId }`, use as-is.
- If stub only, scaffold a minimal provider reading from localStorage with a `MOCK_PORTAL_CUSTOMER_ID = 'cust-arjun-mehta'` fallback (seeded at mount). No portal role switcher in P3 (deferred to future dev-tools task per §1.1).

Decision made during P1 implementation based on audit output.

## 10. Scenarios

- **S-P-1** — Sign in as `cust-arjun-mehta` → `/vehicles` → 1 card (VIN-A) with CPO-eligible ✓ badge, joint badge (shared with Priya)
- **S-P-2** — Click card → `/vehicles/VIN-A` → Overview shows "Ownership history: 3 previous owners · First at BN Jan 2019 · 13 total service visits" (aggregate only, no names)
- **S-P-3** — Service tab → shows 3 JCs during Arjun's tenure; footer: "Earlier BN service: 10 visits — request full breakdown"
- **S-P-4** — Sign in as `cust-karan-shah` → `/vehicles` → VIN-C card with amber grace banner "3 days remaining"; export PDF works; self-revoke already done (shows past action)
- **S-P-5** — Sign in as `cust-pooja-desai` → `/vehicles` → empty state + "Claim a vehicle" CTA → `/vehicles/claim` → submits VIN-C claim with RC scan → result: PENDING (no auto-match since she's a private buyer), banner "BN team will verify"
- **S-P-6** — Sign in as `cust-arjun-mehta`, try claim on VIN-B (Meera's) → auto-match fails (Arjun doesn't match Meera's PAN) → PENDING with overlap chip
- **S-P-7** — CPO tab on VIN-B (Meera) shows AT_RISK: "Service gap detected — 11 months since last visit"
- **S-P-8** — Self-revoke VIN-A from Arjun's portal → grace banner appears, 7d countdown visible
- **S-P-9** — PDF export → print dialog opens, watermark visible in preview, event emitted to vehicles-store
- **S-P-10** — PII audit: `/vehicles/VIN-A` DOM has no occurrence of "Neha Kapoor", "Rohan Desai", or any prior-owner phone/email/PAN — only aggregate count
- **S-P-11** — Technician display: if `jc.technicianId` points to `staff-r09-005` who left BN, Service tab shows "Service Technician"; if points to Priya Sharma (active), shows "Priya Sharma"
- **S-P-12** — Rejected claim visibility: `/(portal)/vehicles/my-claims` shows Rahul Kumar's VIN-B claim as REJECTED with category "Vehicle already claimed"; Resubmit button opens claim form; auto-match is blocked per guard → re-submission goes to PENDING
- **S-P-13** — Joint co-owner display: Arjun's portal on VIN-A shows "Shared with Priya M." (peer first name + last initial); Priya's portal on same VIN shows "Shared with Arjun M."; no phone/email leaks in DOM
- **S-P-14** — Self-revoke affects actor only: Arjun self-revokes VIN-A → Priya's portal still shows ACTIVE; Arjun's portal shows grace banner

## 11. Acceptance criteria

1. All scenarios S-P-1..11 pass
2. File caps enforced
3. `portal-vehicle-adapter.ts` snapshot tests confirm no prior-owner PII in output
4. All routes are `'use client'`
5. Grace banner appears for all `effectiveState === 'GRACE'` ownerships
6. Auto-match computed in UI and passed as boolean; `submitClaim` payload carries only `autoMatchHit`
7. PDF export emits `PDF_EXPORT` event
8. CPO tab renders all 3 states (ELIGIBLE / AT_RISK / NOT_ELIGIBLE) across fixture VINs
9. Zero hex; tokens only

## 12. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Adapter PII leak | 100% snapshot test coverage (§3.4) |
| Stale customer profile on auto-match | Match against **latest** customer record, not JC/SO snapshot |
| User abandons on pending queue | `AutoMatchFeedback` sets expectation before submit |
| Grace window missed in filter | Centralized in `selectVisibleVehicles(..., { includeGrace: true })` |
| PDF export PII | Watermark + log; content already stripped by adapter |

## 13. Changelog

| Date | Change |
|------|--------|
| 2026-04-20 | SPEC-PORTAL-VEHICLES-001 drafted. Depends on SPEC-VEHICLES-001. Status → approved. |
| 2026-04-20 | PLAN-VEHICLES-002 Phase A (PII rule 8 — own-customer mask exception): portal adapter always returns raw contact for the authenticated customer viewing their own profile; `maskedContactFor` is a staff-surface concern only and is never called in portal-vehicle-adapter paths. |
