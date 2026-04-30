---
spec_id: SPEC-REVIEWS-001
title: Reviews & Ratings (NPS) — post-delivery + post-service
domain: reviews
status: approved
version: "1.0"
risk_level: low
pii_sensitivity: medium
flags: [feat-reviews]
owners: [orchestrator]
created: 2026-04-30
depends_on:
  - SPEC-NOTIFICATIONS-001
  - SPEC-VEHICLES-001
  - SPEC-CUSTOMER-PORTAL-001
  - SPEC-REPORTS-001
related_specs:
  - SPEC-ARCH-UI-001
  - PLAN-VEHICLES-003
---

# SPEC-REVIEWS-001 — Reviews & Ratings (NPS)

## Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L1 | NPS scale 0–10 | NPS scores are integers 0–10, matching the Net Promoter Score standard. Detractors 0–6, Passives 7–8, Promoters 9–10. Score stored as-is; display derived from score. | Doc 03 §CX |
| L2 | Two review kinds | Only two `kind` values: `'delivery'` (triggered 24h after vehicle delivered to buyer) and `'service'` (triggered 24h after job card status reaches `READY_FOR_DELIVERY`). No other kinds in v1. | Doc 03 §CX, Doc 05 §1 |
| L3 | Moderation required before public | All reviews start at `'pending-moderation'`. Only R10+ can approve; R02+ can hide. A hidden review can never become `'approved'` without a new submission. Status machine: `pending-moderation → approved | hidden`. | Doc 14 §RBAC |
| L4 | PII masking on public surface | The storefront VDP shows only `{firstName} from {city}` — no last name, no email, no phone, no customer ID. Staff moderation queue shows full name (R10+ only). | Doc 03 §CX, DPDP Act 2023 §PII |
| L5 | Aggregate star mapping | NPS 0–6 → 1★; NPS 7–8 → 4★; NPS 9–10 → 5★. Note: intermediate values 2★ and 3★ are unused in v1 to keep the public display bimodal (trust vs. concern). The 5-star display is derived purely from NPS; no separate star score stored. | Doc 03 §CX benchmarking (BBT pattern) |
| L6 | VDP shows top 3 approved | Storefront VDP renders the 3 most recent `'approved'` reviews for that VIN, sorted by `submittedAt DESC`. Aggregate stars computed over all approved reviews for the same VIN. | Doc 03 §CX |
| L7 | Notification stub | Portal notifications use `recordSent` from SPEC-NOTIFICATIONS-001. In v1, the trigger is a simulated 24h delay — no real scheduler. A fixture notification dispatch is created for each review request in the fixture set. The `sourceEntityType` for review notifications is `'REVIEW_REQUEST'` — added as an extension to the dispatch union. | SPEC-NOTIFICATIONS-001 L1 |
| L8 | Review tied to VIN or JC | Field `vinOrJcId` holds either a VIN (for delivery reviews) or a Job Card ID (for service reviews). The display layer resolves to the relevant vehicle. | Doc 04, Doc 05 |
| L9 | Free text is optional | `freeText` is optional with a 1,000-character max. NPS score is required. | UX: lower friction drives response rates. |
| L10 | No re-submit | A customer may submit only one review per `(customerId, vinOrJcId)` pair. The store enforces uniqueness at submit time. | Dedup to prevent score gaming. |
| L11 | NPS dashboard tile visible to R10+ | `selectNpsAverage` is gated at R10+. The tile on Reports hub shows the average NPS across delivery + service reviews for the selected period + scope. | Doc 14 §RBAC, SPEC-REPORTS-001 |
| L12 | Hide reason required | When an R02+ moderator hides a review, a `hideReason` string is required (min 5 chars). Hiding without a reason is rejected by the store. | Audit trail for DPDP compliance. |
| L13 | No cross-outlet review browsing | Staff moderation queue is scoped to the moderator's outlet unless they are R19+ (GM) or above. | Doc 14 §RBAC, SPEC-ARCH-UI-001 scope rules |
| L14 | Review submission deep-link | The portal notification links to `/reviews/[id]` where `id` is the review record ID minted when the review request is queued. This means the review record exists (in `pending-submission` pseudo-status) before the customer submits — the store pre-mints IDs for the notification link. | UX: prevents dead-links in notifications |
| L15 | Stars rendered as filled/empty Unicode SVGs | The `StarRating` component uses SVG stars (no emoji, no external lib) for WCAG color-contrast compliance. | SPEC-ARCH-UI-001 accessibility rules |

---

## Domain model

### Review entity (`packages/types/src/domain/review.ts`)

```typescript
Review {
  id:           string       // 'rev-{nanoid}'
  customerId:   string       // FK → Customer.id
  vinOrJcId:    string       // VIN (delivery) or JC id (service)
  kind:         'delivery' | 'service'
  npsScore:     number       // 0–10 integer (L1)
  freeText?:    string       // max 1,000 chars (L9)
  submittedAt:  string       // ISO timestamp
  status:       'pending-moderation' | 'approved' | 'hidden'
  moderatedBy?: string       // staffId
  moderatedAt?: string       // ISO timestamp
  hideReason?:  string       // required when status='hidden' (L12)
  outletId:     string       // FK → Outlet.id (for scope filtering L13)
  // Denormalised display fields (PII masking: only firstName + city on public)
  customerFirstName: string
  customerCity:      string
}
```

### State machine

```
[queued-for-submission]
       ↓ (customer submits)
[pending-moderation]  ← initial status on submit
       ↓ R10+ approve              ↓ R02+ hide (reason required)
  [approved]                      [hidden]
  (public on VDP)               (never public)
```

### NPS → Stars mapping (L5)

| NPS | Stars |
|---|---|
| 0–6 | 1★ |
| 7–8 | 4★ |
| 9–10 | 5★ |

---

## Store contract (`reviews-store.ts`)

```typescript
ReviewsState {
  reviews: Review[]
}

ReviewsActions {
  submitReview(params: SubmitReviewParams): Review    // L10 dedup check
  approveReview(id: string, actorId: string): Review // R10+
  hideReview(id: string, actorId: string, reason: string): Review // R02+, L12
  selectApprovedForVin(vin: string): Review[]        // public VDP
  selectTopApprovedForVin(vin: string, limit?: number): Review[]  // top-N
  selectPendingModeration(outletId?: string): Review[] // L13 scope
  selectNpsAverage(period: ReportPeriod, scope: ReportScope): number | null // L11
  _seed(reviews: Review[]): void
}
```

---

## Scenarios

### S-REV-1: Happy path delivery NPS submit
**Given** customer Arjun Mehta has a pending delivery review link for VIN WBY2Z21090VX45678
**When** he opens `/reviews/rev-001` and sets NPS to 9 with free text "Brilliant experience!"
**Then** a new `Review` record is created with `status: 'pending-moderation'`, `npsScore: 9`, `kind: 'delivery'`
**And** the store emits no duplicate on re-submit (L10)

### S-REV-2: Happy path service NPS submit
**Given** customer Meera Iyer has a service job card JC-001 marked READY_FOR_DELIVERY
**When** she submits NPS 8 with no free text
**Then** review is stored with `kind: 'service'`, `npsScore: 8`, `freeText: undefined`

### S-REV-3: Staff moderation — approve
**Given** R10 Sales Manager sees review `rev-delivery-001` in `pending-moderation`
**When** they click "Approve"
**Then** review status changes to `'approved'`
**And** `moderatedBy` and `moderatedAt` are populated
**And** the review appears on the VDP reviews section

### S-REV-4: Staff moderation — hide
**Given** R02 sees a review containing inappropriate content
**When** they click "Hide" and enter reason "Abusive language"
**Then** review status changes to `'hidden'`
**And** `hideReason: 'Abusive language'` is stored (L12)
**And** the review does NOT appear on VDP

### S-REV-5: Hide without reason — rejected
**Given** R02 tries to hide a review
**When** they submit without entering a reason (or reason < 5 chars)
**Then** the store throws `MissingHideReasonError`
**And** the UI shows an inline error

### S-REV-6: Duplicate review — rejected (L10)
**Given** customer has already submitted a review for VIN ABC
**When** they try to submit another review for the same VIN
**Then** the store throws `DuplicateReviewError`
**And** the UI shows "You have already submitted a review for this vehicle"

### S-REV-7: VDP public reviews — PII masking (L4)
**Given** approved reviews exist for VIN WBY2Z21090VX45678
**When** a visitor views the storefront VDP
**Then** each review shows `{firstName} from {city}` only — no last name, email, or phone
**And** top 3 most recent are shown (L6)
**And** aggregate stars are shown (L5)

### S-REV-8: VDP with no approved reviews — empty state
**Given** a VIN has no approved reviews
**When** a visitor views the storefront VDP
**Then** the reviews section shows "No reviews yet" with a prompt to "Be the first to review"

### S-REV-9: NPS dashboard tile — average (L11)
**Given** 10 approved reviews exist with scores [9, 9, 10, 8, 7, 6, 5, 9, 10, 9]
**When** the reports hub loads for the last 30 days
**Then** the NPS tile shows the average NPS (8.2)

### S-REV-10: NPS tile empty — no reviews in period (L9 analog)
**Given** no reviews have been submitted in the selected period
**When** the reports hub loads
**Then** the NPS tile shows '—' with caption "No reviews in period"

### S-REV-11: RBAC gate — R09 cannot approve
**Given** R09 (Service Advisor) is viewing the moderation queue
**When** they attempt to approve a review
**Then** the Approve button is hidden via `<Gate>` (L3)

### S-REV-12: RBAC gate — R02 can hide but not approve
**Given** R02 (Customer Service Representative) is viewing the moderation queue
**When** they view a pending review
**Then** "Hide" CTA is visible; "Approve" CTA is hidden via `<Gate>` (L3)

### S-REV-13: Star aggregate — mixed scores
**Given** VIN has 3 approved reviews: NPS 9 (5★), NPS 8 (4★), NPS 5 (1★)
**When** aggregate stars are computed
**Then** average star = (5+4+1)/3 = 3.33 → displayed as "3.3 / 5"
**And** individual review cards show their own star rating (L5)

### S-REV-14: Outlet scope filtering — R10 sees own outlet only (L13)
**Given** R10 Sales Manager is assigned to BLR-01
**When** they open the moderation queue
**Then** only reviews for VINs from BLR-01 are shown
**And** MUM-01 reviews are excluded

### S-REV-15: Notification stub — review request sent
**Given** a delivery event fires for VIN XYZ
**When** the notification stub runs
**Then** a portal notification of kind `'review-request'` appears in the customer's notification list
**And** the link resolves to `/reviews/[id]` with the pre-minted review ID (L14)

---

## UI surfaces

### Customer portal: `/reviews/[id]` (submit page)
- NPS picker: 11 buttons 0–10 with colour coding (0–6 red, 7–8 amber, 9–10 green)
- Optional free-text textarea (max 1,000 chars)
- Submit CTA — disabled until score selected
- Success state: "Thank you for your feedback" with link back to account
- Expired/not-found state: "This review link is no longer valid"

### Staff web: `/reviews` (moderation queue)
- Tab row: "Pending" (count badge) | "Approved" | "Hidden"
- Each card: customer name + city, NPS score, star equivalent, free text, kind chip, date
- Approve button (Gate: R10+) | Hide button + reason dialog (Gate: R02+)
- Search by VIN / customer name
- Outlet scope auto-applied (L13)

### Storefront VDP: inline `ReviewsSection` component
- Aggregate: "N reviews · X★ average" header
- Top 3 cards: `{firstName} from {city}` · NPS star · date · free text
- "See all reviews" CTA (deferred — DEF-REVIEWS-1)
- Empty state when no approved reviews (S-REV-8)

### Reports hub: NPS tile
- Average NPS for selected period + scope
- `KpiValue` kind: `'nps'` (new variant) or reuse `'percentage'` — v1 uses `{ kind: 'percentage', value: npsAvg }` to avoid adding a new KpiValue variant

---

## Events emitted / consumed

| Event / Notification | Module | Trigger | Handler |
|---|---|---|---|
| `DELIVERY_COMPLETED` | vehicles/sales | SOLD event fires | Create pending review record; queue portal notification |
| `READY_FOR_DELIVERY` | service | JC status change | Create pending review record; queue portal notification |
| `review-request` portal notification | portal | 24h after delivery/service (simulated in fixture) | Link to `/reviews/[id]` |

---

## Cross-module seams

Register in `specs/architecture/cross-module-wiring.md`:

| Seam | From | To | Description |
|---|---|---|---|
| Seam 28 | reviews-store | reports selectors | `selectNpsAverage` reads `reviews` state; reports hub mounts `ReviewsStoreHydrator` |
| Seam 29 | reviews-store | notifications-store | Notification stub calls `recordSent` with `sourceEntityType: 'REVIEW_REQUEST'` |

---

## Acceptance criteria

- [ ] `packages/types/src/domain/review.ts` exports `Review`, `ReviewSchema`, `ReviewStatus`, `ReviewKind`, error classes
- [ ] `packages/mocks/src/fixtures/reviews.ts` — 12 reviews (mix of delivery/service, statuses, NPS scores)
- [ ] `apps/staff-web/src/lib/reviews/reviews-store.ts` — Zustand store with all actions
- [ ] `apps/staff-web/src/lib/reviews/reviews-store-hydrator.tsx` — seeds fixture data
- [ ] `apps/staff-web/app/(shell)/reviews/page.tsx` — moderation queue with tabs
- [ ] `apps/staff-web/app/(shell)/reviews/error.tsx` — canonical error boundary
- [ ] Sidebar nav entry "Reviews" with `Star` icon in Operations group
- [ ] `apps/customer-web/app/(portal)/reviews/[id]/page.tsx` — NPS submit form
- [ ] `apps/customer-web/src/components/storefront/reviews-section.tsx` — VDP inline surface
- [ ] VDP page imports and renders `ReviewsSection`
- [ ] `selectNpsAverage` selector in `apps/staff-web/src/lib/reports/selectors/reviews-selectors.ts`
- [ ] NPS tile in `ReportsHubView` (CX section)
- [ ] `reports.kpi.npsAverage` i18n key in both `en-IN.json` + `hi-IN.json`
- [ ] `reviews.*` i18n keys in staff-web + customer-web messages
- [ ] ≥15 unit tests
- [ ] Typecheck clean; all existing tests green

---

## Deferred items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-REVIEWS-1 | "See all reviews" storefront page | P2 | Full paginated review listing at `/collection/[vin]/reviews` |
| DEF-REVIEWS-2 | Real 24h scheduler | P3 | Real-time trigger after delivery/service events; v1 uses fixture stubs |
| DEF-REVIEWS-3 | Review response by BN Automobiles | P2 | Staff can post a public reply on approved reviews |
| DEF-REVIEWS-4 | Customer edit/delete own review | P3 | DPDP erasure path for review data |
| DEF-REVIEWS-5 | Google Review integration | P4 | Push approved reviews to Google My Business API |

---

## Test cases

| ID | Description | Type |
|---|---|---|
| T-REV-1 | `submitReview` creates record with correct fields | unit |
| T-REV-2 | `submitReview` throws `DuplicateReviewError` on re-submit (L10) | unit |
| T-REV-3 | `approveReview` transitions to `approved`, sets `moderatedBy` | unit |
| T-REV-4 | `hideReview` transitions to `hidden`, stores `hideReason` (L12) | unit |
| T-REV-5 | `hideReview` without reason throws `MissingHideReasonError` (S-REV-5) | unit |
| T-REV-6 | `selectApprovedForVin` returns only `approved` reviews for VIN | unit |
| T-REV-7 | `selectTopApprovedForVin` returns at most `limit` sorted by `submittedAt DESC` | unit |
| T-REV-8 | `selectPendingModeration` filters by outlet (L13) | unit |
| T-REV-9 | `selectNpsAverage` returns correct mean for given period | unit |
| T-REV-10 | `selectNpsAverage` returns null when no reviews in period (S-REV-10) | unit |
| T-REV-11 | NPS → stars mapping: 5 → 1★, 8 → 4★, 10 → 5★ (L5) | unit |
| T-REV-12 | `selectNpsAverage` scopes by outletId (L13) | unit |
| T-REV-13 | `_seed` loads 12 fixture reviews | unit |
| T-REV-14 | Fixture has mix of delivery + service kinds | unit |
| T-REV-15 | Reviews with status `'hidden'` are excluded from `selectApprovedForVin` | unit |

---

## Open questions

_None_ — all decisions locked in L-tags above.

---

## Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-30 | orchestrator | Initial approved spec |
