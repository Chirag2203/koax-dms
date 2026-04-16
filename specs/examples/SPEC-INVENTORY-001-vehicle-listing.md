---
spec_id: SPEC-INVENTORY-001
domain: inventory
title: Vehicle Listing (staff + storefront publication)
status: approved
risk_level: medium
pii_sensitivity: low
flags: [inventory.listing.v1]
owners: [planner, data-architect, api-designer, ux-writer, finance-reviewer, security-reviewer, qa-planner, integrator]
depends_on:
  - SPEC-INVENTORY-002 (acquisition)
  - SPEC-INVENTORY-003 (appraisal)
  - SPEC-INVENTORY-004 (refurb)
  - SPEC-INVENTORY-005 (per-VIN cost ledger)
  - SPEC-PLATFORM-001 (outlet management)
  - SPEC-IDENTITY-001 (users & roles)
docs_consulted:
  - Doc 02 §Inventory
  - Doc 04 §Listing
  - Doc 06 §GST.margin
  - Doc 07 §ReadModels
  - Doc 09 (Glossary)
  - Doc 10 §Vehicle, §Listing
  - Doc 11 §ListingStateMachine
  - Doc 12 §Performance, §SEO
  - Doc 14 §2.Inventory
  - Design 01 §Components.VehicleCard
effective_date: 2026-04-15
---

# SPEC-INVENTORY-001 — Vehicle Listing

> Exemplar spec. New specs should follow this structure, section-for-section, as defined in **Doc 15**.

---

## 1. Summary

Publish a curated pre-owned vehicle to the customer storefront and expose it for internal operations (sales, service, finance). A **Listing** is the publication-state projection of a **Vehicle** (Doc 10) that has completed acquisition (SPEC-INVENTORY-002), appraisal (SPEC-INVENTORY-003), and refurb (SPEC-INVENTORY-004), and whose landed cost from the per-VIN cost ledger (SPEC-INVENTORY-005) has been frozen.

The feature covers:

1. The staff UI to compose a listing (title, narrative, price, CPO flag, photos, visibility).
2. The listing lifecycle state machine (`DRAFT → IN_REVIEW → PUBLISHED → RESERVED → SOLD → ARCHIVED`, with `UNPUBLISHED` side-state).
3. The customer-storefront read model that renders on `/vehicles` and `/vehicles/[vin]`.

## 2. Context & motivation

The luxury pre-owned buyer makes decisions on narrative and provenance, not sticker price alone (Doc 01 §Benchmarks — BMW Premium Selection, Porsche Approved). The listing must read like an editorial feature while the internal tooling must keep the operation traceable and GST-correct.

## 3. Goals

- Staff (R09 Sales Associate, R10 Sales Manager, R19 GM) can compose, preview, and publish a listing from a completed vehicle in ≤ 5 minutes.
- Customer storefront renders a listing with LCP < 2.5s, INP < 200ms, CLS < 0.1 on a cold 4G-equivalent cellular network (Doc 12 §Performance).
- Price changes are auditable (Doc 11 §ListingStateMachine — `priceAdjusted` event).
- GST margin-scheme disclosure visible on every listing where applicable (Doc 06 §GST.margin).

## 4. Non-goals

- Dynamic price optimization — deferred to v1.1.
- Multi-currency — deferred.
- Customer-facing "compare" feature — deferred.
- Changing the state-machine of Vehicle itself — that is `SPEC-INVENTORY-006`.

## 5. Personas & roles (Doc 14)

| Role | Action |
|---|---|
| R09 Sales Associate | Draft listing, attach photos, propose price |
| R10 Sales Manager | Publish, unpublish, set featured |
| R19 General Manager | Cross-outlet visibility, override price beyond threshold |
| R24 CEO | Read-only everywhere |
| Customer (anonymous and authenticated) | Read published listings; reserve |
| R23 Finance Controller | Read-only price/cost reconciliation views |

Cross-outlet publishing requires R19+. Price overrides beyond ±7.5% of system-suggested price require dual control (Doc 14 §3.ConditionalThresholds).

## 6. Ubiquitous language (Doc 09)

- **Vehicle** — the identified automobile by VIN.
- **Listing** — the publishable projection of a Vehicle.
- **CPO** — Certified Pre-Owned (210-point program).
- **Landed Cost** — per-VIN total from cost ledger.
- **Ask Price** — published sale price (pre-TCS).
- **Suggested Price** — system-computed from benchmarks + landed cost + outlet strategy.
- **VIN** — 17-char global identifier.
- **Ownership state** — outright vs consignment (affects display and payout).

## 7. Domain rules (from `domain-expert`)

1. A Listing cannot be created for a Vehicle whose `costLedger.frozenAt` is null (Doc 11 §ListingStateMachine — guard `G-LST-01`).
2. A Listing cannot be `PUBLISHED` without a completed Appraisal (grade ≥ B) and a minimum of 8 photos including exterior 4-angles, interior, odometer, VIN plate, and service history cover (Doc 04 §Publication.quality).
3. CPO badge requires a passed 210-point checklist and minimum grade A/A-.
4. Consignment listings display "On behalf of owner" language; the payout waterfall is triggered on sale (SPEC-SALES-007).
5. Price must be >= `max(landedCost * 1.08, suggestedPriceFloor)` unless R19+ override with justification.
6. Two outlets may list a Vehicle only if it has been transferred (SPEC-INVENTORY-007); a single Vehicle cannot be simultaneously published in two outlets.
7. Unpublishing is reversible; archiving is not.
8. A `PUBLISHED` listing transitions to `RESERVED` on a successful reservation (SPEC-SALES-003). Other outlets' views reflect the reservation in near-real-time.

## 8. State machine (Doc 11)

```
              ┌─────────┐
              │  DRAFT  │
              └────┬────┘
                   │ submit (R09)
                   ▼
              ┌─────────────┐
              │  IN_REVIEW  │
              └────┬────────┘
           publish │   reject
          (R10+)   │      │
                   ▼      ▼
              ┌────────────┐        ┌────────────┐
              │ PUBLISHED  │ ◀────▶ │UNPUBLISHED │  (R10+, reversible)
              └────┬───────┘        └────────────┘
                   │ reserve (SPEC-SALES-003 hook)
                   ▼
              ┌──────────┐
              │ RESERVED │
              └────┬─────┘
         sell ◀────┴────▶ release (auto or manual)
                   │
                   ▼
              ┌──────┐
              │ SOLD │ → (R23 finalization) → ARCHIVED
              └──────┘
```

Guards:
- `G-LST-01`: `vehicle.costLedger.frozenAt != null` on `submit`.
- `G-LST-02`: minimum photos + appraisal grade on `publish`.
- `G-LST-03`: price within allowed band on `publish`; override requires dual-control.
- `G-LST-04`: cross-outlet publish only with `outletOfRecord` match; transfer first.

## 9. Entities (from `data-architect`)

### `Listing` (new aggregate root)

| field | type | required | default | constraints | pii |
|---|---|---|---|---|---|
| `listingId` | UUID | yes | gen | primary | none |
| `vehicleId` | UUID (FK Vehicle) | yes | — | unique-one-active-per-vehicle | none |
| `outletId` | UUID (FK Outlet) | yes | — | — | none |
| `status` | enum | yes | `DRAFT` | see §8 | none |
| `title` | string(140) | yes | — | glossary-allowed terms only | none |
| `narrative` | markdown(4000) | yes | — | sanitized | none |
| `askPriceMinor` | bigint | yes | — | >= floor from §7.5 | none |
| `currency` | string(3) | yes | `INR` | ISO-4217 | none |
| `suggestedPriceMinor` | bigint | yes | — | frozen on submit | none |
| `cpo` | boolean | yes | false | if true, appraisalGrade ∈ {A, A-} | none |
| `ownershipState` | enum | yes | — | `OUTRIGHT` \| `CONSIGNMENT` | none |
| `featured` | boolean | no | false | R10+ only | none |
| `photos` | array<Photo> | yes | [] | ≥ 8 on PUBLISHED | none |
| `publishedAt` | timestamptz | no | — | set on PUBLISHED | none |
| `lastPriceAdjustedAt` | timestamptz | no | — | — | none |
| `reservationId` | UUID | no | — | set when RESERVED | none |
| `salesOrderId` | UUID | no | — | set when SOLD | none |
| `createdAt` | timestamptz | yes | now | — | none |
| `updatedAt` | timestamptz | yes | now | — | none |
| `createdBy` | UUID (R09+) | yes | — | — | none |
| `updatedBy` | UUID | yes | — | — | none |

Indexes: `(outletId, status)`, `(status, publishedAt DESC)`, `(vehicleId)` unique partial where `status IN (DRAFT, IN_REVIEW, PUBLISHED, UNPUBLISHED, RESERVED)`.

Retention: listings are retained indefinitely after `ARCHIVED` (business history).

### `Photo` (value object inside Listing)

| field | type | required |
|---|---|---|
| `photoId` | UUID | yes |
| `url` | string | yes |
| `alt` | string(160) | yes |
| `order` | int | yes |
| `kind` | enum | yes (`EXTERIOR_FRONT`, `EXTERIOR_REAR`, `EXTERIOR_LEFT`, `EXTERIOR_RIGHT`, `INTERIOR`, `ODO`, `VIN_PLATE`, `SERVICE_HISTORY`, `OTHER`) |

### Invariants

- `I1`: `cpo == true` ⇒ `vehicle.appraisal.grade ∈ {A, A-}`.
- `I2`: `status == PUBLISHED` ⇒ `photos.length >= 8 ∧ allKindsPresent(EXTERIOR_FRONT, EXTERIOR_REAR, EXTERIOR_LEFT, EXTERIOR_RIGHT, INTERIOR, ODO, VIN_PLATE)`.
- `I3`: At any time, a `vehicleId` has at most one active Listing (`status ∉ {SOLD, ARCHIVED}`).
- `I4`: `askPriceMinor > 0 ∧ askPriceMinor >= max(vehicle.landedCost * 1.08, suggestedPriceFloor)` unless R19+ override with `PriceOverride` record attached.
- `I5`: Monetary values are `bigint` minor units (paise) + ISO currency; no floats.

### RLS scope

- R09/R10 see own-outlet listings only.
- R19+/R23+ see all outlets.
- Public storefront read-model excludes DRAFT / IN_REVIEW / UNPUBLISHED / ARCHIVED.

### Per-VIN cost ledger impact

- New entry type `LISTING_PHOTO_COSTS` allowed (photography fee attributions).
- Listing publication freezes `vehicle.costLedger.frozenAt`.

### Events emitted

- `listing.drafted.v1` — `{ listingId, vehicleId, outletId, by }`
- `listing.submitted.v1` — `{ listingId }`
- `listing.published.v1` — `{ listingId, outletId, askPriceMinor, cpo }`
- `listing.priceAdjusted.v1` — `{ listingId, from, to, reason, by }`
- `listing.unpublished.v1` — `{ listingId, reason, by }`
- `listing.reserved.v1` — `{ listingId, reservationId }`
- `listing.sold.v1` — `{ listingId, salesOrderId }`
- `listing.archived.v1` — `{ listingId }`

## 10. API contracts (from `api-designer`)

All mutation endpoints accept `Idempotency-Key` header. Error shape: RFC 9457 Problem Details (`type`, `title`, `status`, `detail`, `instance`, optional `code`, `errors[]`).

### Staff API (consumed by `staff-web`)

| verb | path | roles | purpose |
|---|---|---|---|
| `GET` | `/api/v1/listings` | R09+ own-outlet, R19+ all | list with filters (status, outletId, make, price band, featured) |
| `GET` | `/api/v1/listings/:id` | R09+ | get one |
| `POST` | `/api/v1/listings` | R09+ | create draft from vehicleId |
| `PATCH` | `/api/v1/listings/:id` | R09+ (draft), R10+ (any state) | update narrative, price, photos |
| `POST` | `/api/v1/listings/:id/submit` | R09+ | → IN_REVIEW |
| `POST` | `/api/v1/listings/:id/publish` | R10+ | → PUBLISHED (guards G-LST-02, G-LST-03) |
| `POST` | `/api/v1/listings/:id/unpublish` | R10+ | PUBLISHED ↔ UNPUBLISHED |
| `POST` | `/api/v1/listings/:id/archive` | R19+ | → ARCHIVED (from SOLD only) |
| `POST` | `/api/v1/listings/:id/price-override` | R19+ with co-approver | attaches `PriceOverride` |

### Public storefront API (consumed by `customer-web`)

| verb | path | auth | purpose |
|---|---|---|---|
| `GET` | `/api/public/v1/collection` | none | paginated list of PUBLISHED listings |
| `GET` | `/api/public/v1/collection/:vin` | none | one listing with narrative + photos |

Pagination: cursor-based `{ before, after, limit }`. Public max limit 24.

### Cache keys (TanStack Query)

- `['listings', { outletId, status, ...filters }]`
- `['listing', id]`
- `['publicCollection', { cursor, filters }]`
- `['publicListing', vin]`

### Mocks plan (@dms/mocks)

- `handlers/listings/*.ts` — all staff endpoints + public reads.
- `fixtures/listing.panamera.ts`, `listing.range-rover-autobiography.ts`, `listing.audi-rs-e-tron.ts`, `listing.draft-incomplete.ts`, `listing.unpublished.ts`, `listing.archived.ts`.
- Error fixtures: 403 cross-outlet, 409 vehicle-has-active-listing, 422 photos-missing.

### Backend-sanity notes

- Public collection must be materialized (read model) — do not join on every request. Refresh on `listing.published.v1` / `listing.priceAdjusted.v1` / `listing.unpublished.v1`.
- Cross-outlet reservation state updates use SSE from staff clients, 30s poll fallback.

## 11. UX (from `ux-writer` + Design 01)

### Staff screens (`/inventory/listings`)

- **List view** — data table. Columns: photo thumb, VIN (masked), title, outlet, status pill, ask price, suggested price, days in status, ageing indicator. Column density toggle. Saved views per role.
- **Detail / edit** — two-column: left is the composer (title input, narrative Markdown editor, photos drag-drop grid with `kind` tagging), right is the side panel (price + suggested + override indicator, CPO toggle, ownership state read-only from Vehicle, publish CTA with guard explanations).
- **Preview** — exact render of customer storefront with a watermark banner.
- **State controls** — primary button label maps to next legal transition; disabled controls show tooltip citing the guard (e.g., "Add at least 3 more photos — `I2`").

### Customer storefront (storefront consumer; this spec provides the read model only)

Rendering details are owned by SPEC-STORE-002 (collection) and SPEC-STORE-003 (vehicle detail). This spec guarantees the fields those screens need.

### Copy (customer surface — editorial, sentence case)

- Status label when reserved publicly: "This car has a hold."
- CTA on published listing: "Reserve for ₹1,00,000"
- CPO badge: "CPO · 210-point certified"
- GST disclosure: "Price inclusive of GST under the margin scheme. TCS applicable on total > ₹10,00,000."
- Empty collection: "We are preparing the next issue of the collection."

### Copy (staff surface — direct, title case on controls)

- Primary CTA labels: "Save Draft", "Submit for Review", "Publish Listing", "Unpublish", "Archive".
- Validation messages include guard IDs (G-LST-02) so support can search.

### i18n keys (en-IN)

All keys under `messages/en-IN/inventory.listing.json`.
Sample keys: `inventory.listing.title.placeholder`, `inventory.listing.narrative.helpText`, `inventory.listing.guard.G_LST_02`, etc.
hi-IN phase 1 translation required before v1 go-live in Mumbai.

## 12. Security & privacy (from `security-reviewer`)

- PII exposure: Listing contains no PII. Photos must not contain VIN-plate recognizable in public render beyond last-4 blurred; `security-reviewer` mandates automated face-blur on interior photos if any person is visible.
- Consent: not applicable (product data).
- RBAC:
  - Cross-outlet listings require R19+; hardcoded role check fails build.
  - Price override co-approver cannot be the same user as the proposer (Doc 14 §3.2).
- Audit: every state transition and price change produces an audit log entry with before/after snapshot.
- Webhooks: not applicable for v1.
- Secrets: none reachable from client bundles.
- Verdict: **APPROVE-WITH-CONDITIONS** — `face-blur pipeline` required before v1 go-live.

## 13. Finance (from `finance-reviewer`)

- GST: margin scheme visible on price disclosure — see copy above.
- TCS: disclosed on listing page when projected sale > ₹10,00,000; actual TCS collected in SPEC-FINANCE-001.
- Per-VIN ledger: publish freezes `costLedger.frozenAt`; price adjustments do not touch ledger (they are listing events).
- GL: no postings in this spec (postings begin at Sales Order → Invoice).
- Verdict: **APPROVE** — no conditions.

## 14. QA (from `qa-planner`)

### Acceptance criteria (Gherkin)

- **AC1**: GIVEN a vehicle with frozen cost ledger, appraisal grade A, and 8 valid photos, WHEN R10 publishes, THEN status = `PUBLISHED`, event `listing.published.v1` emitted, storefront read model updated within 60s, and audit entry written.
- **AC2**: GIVEN a draft listing with 5 photos, WHEN R09 submits, THEN the API returns 422 with `code=G-LST-02` and the UI disables "Submit" with inline guard message.
- **AC3**: GIVEN a published listing at outlet BLR, WHEN R09 from MUM attempts edit, THEN API returns 403.
- **AC4**: GIVEN a published listing, WHEN R19 adjusts price within band, THEN event `listing.priceAdjusted.v1` emitted, audit log populated, storefront reflects new price within 60s.
- **AC5**: GIVEN a reservation created for the listing (SPEC-SALES-003), WHEN reservation webhook fires, THEN listing transitions to RESERVED; customer-facing storefront shows "This car has a hold."

### Unit tests

- `listing.guards.test.ts` — G-LST-01..04.
- `listing.stateMachine.test.ts` — all legal and illegal transitions.
- `listing.priceBand.test.ts` — boundaries of §7.5 with landed cost + suggested price.

### Component (Storybook)

- `ListingComposer.stories.tsx` — empty, partial, invalid photos, valid, submitted, published.
- `ListingTable.stories.tsx` — empty, single-outlet, multi-outlet, dense view.
- `ListingStatusPill.stories.tsx` — all 7 states + reserved secondary chip.

### E2E (Playwright)

- `@flow/listing-draft-to-publish`: R09 creates draft on a prepared Vehicle, uploads 8 photos, submits; R10 publishes; verify storefront shows listing.
- `@flow/listing-cross-outlet-guard`: R09 from MUM tries to edit a BLR listing; expect 403.
- `@flow/listing-price-override`: R09 proposes 10% discount; R10 cannot approve; R19 + R23 can.

### Performance budgets

- Staff list page TTI < 1.5s on mid-range laptop.
- Customer `/vehicles/[vin]` LCP < 2.5s; image payload ≤ 1.2 MB (AVIF + sizes).

### Fixtures

- At least 5 Listings across 3 outlets; 1 reserved, 1 sold, 1 archived, 1 unpublished, 1 in review.
- Photos are internal sample assets; no real car photographs in fixtures.

## 15. Observability

- Metrics:
  - `listing_publish_count{outlet, cpo}`
  - `listing_time_in_status_seconds{status}`
  - `listing_price_override_count{outlet}`
- Logs: audit log for every state change + price change; level = info; never include PII.
- Dashboards: add tiles to the Inventory ops dashboard (SPEC-REPORT-002).

## 16. Rollout

- Feature flag: `inventory.listing.v1`, default off, enabled per-outlet post-sign-off.
- Data migration: none (new entity).
- Backfill: for Vehicles already in the system with frozen cost ledger, the import script creates `DRAFT` listings (one per vehicle) for R10 to review.

## 17. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Price override abuse | high | Dual-control + audit + monthly report |
| Photo personal-data leak | high | Face-blur pipeline before publish |
| Stale storefront after publish | medium | Event-driven read-model refresh + 60s SLA check |
| Cross-outlet visibility confusion | medium | Clear `outlet of record` ribbon; outlet filter persists per user |

## 18. Open questions

- Q: Should CPO removal require GM approval? — Deferred to SPEC-INVENTORY-003 governance update.
- Q: Featured quota per outlet? — Marketing team decision, not blocking v1 ship.

## 19. Dependencies, order, and definition of done

- Depends on: `depends_on` list above.
- Must ship before: SPEC-SALES-003 (reservation), SPEC-STORE-002 (collection), SPEC-STORE-003 (detail).

Definition of Done:

- [ ] Spec approved (this).
- [ ] Zod types in `@dms/types` for Listing, Photo, Events.
- [ ] MSW handlers and fixtures in `@dms/mocks`.
- [ ] `@dms/ui` domain components: `ListingComposer`, `ListingStatusPill`, `ListingPhotoGrid`, `ListingPriceDisclosure`.
- [ ] Staff screens in `apps/staff-web` (list, detail/edit, preview).
- [ ] Public storefront consumer reads (exposed via read-model API) — consumed by SPEC-STORE-002/003.
- [ ] All AC1–AC5 Playwright flows green.
- [ ] All unit + Storybook tests green.
- [ ] a11y pass: keyboard, focus, reduced motion, contrast.
- [ ] i18n keys in en-IN; hi-IN translation ticket opened.
- [ ] Feature flag wired.
- [ ] Observability metrics emitting.
- [ ] Security condition (face-blur) shipped.

## 20. Change history

- 2026-04-15 — created (exemplar) — status `approved` (via integrator with wave-2 verdicts: security APPROVE-WITH-CONDITIONS, finance APPROVE, qa APPROVE).

## 21. Appendix — agent verdict log

- `planner`: scope single spec; money-adjacent due to price + disclosure; routed with full wave-2 set.
- `domain-expert`: rules 1–8 above; raised no unresolved concerns.
- `data-architect`: entity `Listing` with 3 invariants upgraded to 5 after security feedback.
- `api-designer`: contracts §10; `backend-sanity` required materialized public collection.
- `ux-writer`: copy in §11; flagged hi-IN blocker for Mumbai go-live.
- `security-reviewer`: APPROVE-WITH-CONDITIONS — face-blur.
- `finance-reviewer`: APPROVE.
- `qa-planner`: AC1–AC5 + fixture list.
- `integrator`: merged; resolved 1 conflict (ux-writer "used car" → Doc 09 "pre-owned"). Spec status `approved`.
