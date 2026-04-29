---
spec_id: PLAN-VEHICLES-003
domain: vehicles
status: approved
risk_level: medium
pii_sensitivity: high
flags: [vehicles-module, sales-events, document-access-log, gst-margin, renderer-fix]
owners: [orchestrator]
depends_on: [SPEC-VEHICLES-001, PLAN-VEHICLES-002, SPEC-CUSTOMERS-001, SPEC-PORTAL-VEHICLES-001]
research_refs: [specs/modules/vehicles/research/03-sales-docs-costs-addendum.md]
---

# Vehicles — Sales / Documents / Costs tabs + ownership renderer fix

Delivers the three stub tabs on `/vehicles/[vin]` as real, data-driven surfaces.
Introduces a parallel `SalesEvent` stream (NOT a merged enum), a new
`DocumentAccessEvent` stream with DPDP purpose-tracking, a shared
`timeline-adapter` + payload translation table with a compile-time
exhaustiveness guard (fixes the raw-key leak on Ownership tab), a
`gst-margin` pure helper branching on sale-vs-consignment flows, and a
R12+ gated Costs tab with TCS handling per Income Tax Act §206C(1F).

## 0. Locked decisions

| # | Decision | Source |
|---|---|---|
| L1 | **Two event streams**: `OwnershipEvent` (11 kinds, unchanged) + new `SalesEvent` (7 kinds). Shared `timeline-adapter` merges for render. | Addendum §2, reviewer blocker #4 |
| L2 | **Translation table with compile-time guard** — `Missing extends never` over every payload key across all three event streams. | Addendum §2.4 |
| L3 | `DocumentAccessEvent` stream (renamed from `DocumentAuditEvent`) with `purpose` field for DPDP-heavy downloads. | Addendum §3 |
| L4 | **GST formula locked**: `gstAmount = margin × 18/118` (margin is tax-inclusive per CBIC Notification 8/2018 Rule 32(5)). Clamped to 0 on loss sale. | Addendum §1.3, reviewer blocker #3 |
| L5 | **TCS @ 1%** collected BY BN on invoice value > ₹10L. Separate info line on margin card (never subtracted from margin). `tcsApplicable` keys off `salePrice` (gross), independent of margin sign. | Addendum §1.1 |
| L6 | Three retention clocks: OwnershipEvent 7yr, SalesEvent 8yr (IT Act §44AA), DocumentAccessEvent 7yr (actor + purpose anonymized after TTL). | Addendum §2.2 |
| L7 | **R12+ = numeric rank comparator** `hasRank(user.role, 'R12')` → {R12, R13, R19, R22, R24}. Inline comparisons banned. | Addendum §4.4, reviewer concern #9 |
| L8 | **Cross-store emission is UI-layer only.** Sales pipeline stage transitions call a pure helper `deriveSalesEvent(prev, next, deal): { kind, payload } \| null` then the PAGE component invokes `vehicles.emitSalesEvent(vin, kind, payload, actor)` directly. No store subscriptions, no hidden hooks. | Reviewer blocker #1 |
| L9 | **Document schema split**: `Document` (portal-shared) stays unchanged except for one field (`supersededBy`). Staff-only metadata (`supportingSalesOrderId`, `purposeOfCollection`, `version`, `deletedAt`) lives on a new sibling `StaffDocumentMetadata` entity keyed by `docId`. | Reviewer blocker #2 |
| L10 | **6 new staff document categories**: `tcs-certificate-27d`, `form-29-30`, `noc` (subtype: `financier` \| `rto`), `consignment-agreement`, `cpo-certificate`, `sale-agreement`. | Addendum §1.1-§1.2, user Q-E |
| L11 | **Lazy reservation expiry** — no background timer. `selectActiveDeals(vin)` filters expired; idempotent `markReservationExpired(dealId)` emits RESERVATION_LOST on first read after expiry. | Reviewer blocker #5 |
| L12 | **"Put on sale" CTA rule**: visible iff (no active BN_CONSIGNMENT ownership) AND (≥1 ACTIVE non-dealer ownership) AND (`isCurrentlyOnSale === false`). Deep-links to `/inventory/new?mode=existing&vin=<vin>`. **Surfaced on the Sales tab header (right-side action bar)** alongside View Sale Details / Edit Listing. R10+ gated. The `/inventory/new` page reads the `vin` query param and pre-selects the VIN, skipping the `ExistingVehiclePicker` step. (Originally planned for Costs tab P4 — moved earlier per user request 2026-04-29.) | Addendum §1.4 (user Q-D), reviewer cross-spec #1 |
| L13 | **Download-purpose required categories**: `rc`, `insurance`, `noc`, `form-29-30`, `tcs-certificate-27d`. `consignment-agreement` + `sale-agreement` excluded (business docs, not PII-heavy). | Addendum §3.3 |
| L14 | **Closed-sale = SOLD event emitted** for that VIN. Immutable-delete guard triggers on this condition; payment/RC-transfer state not required. | Reviewer concern #5 |
| L15 | **Joint seller signatures**: each joint holder signs independently via stub checkbox. Stored as `sellerSignatures: { customerId, signedAt, actorId }[]` on SOLD payload. Store-action level guard throws if incomplete (not UI-only). | Reviewer concern #4, trap #5 |
| L16 | **R19+ override** for deceased/unreachable joint holder. Mandatory `overrideReason` text + `overrideProofDocIds: string[]` (death cert, PoA). Logged on SOLD payload `override: { by, reason, proofDocIds }`. V1. | Reviewer blocker #4 |
| L17 | **Commission % = hardcoded const** `DEFAULT_COMMISSION_PCT = 15` in `@dms/vehicles-core/gst-margin.ts` for v1. `ConsignmentAgreement` entity is v2. | Reviewer concern #1 |
| L18 | **TCS exemption (206C(1H)) in v1**: staff can mark `tcsWaived: true` with mandatory reason text in SoCompleteDialog. Payload: `tcsWaived: boolean, tcsWaivedReason?: string`. | Reviewer trap #4 |
| L19 | **Legacy events** (payloads missing expected keys): renderer falls through to `renderLegacyFallback()` showing `{kind label · timestamp · actor}` with no payload details. No `LEGACY_RAW` enum pollution. | Reviewer concern #3 |
| L20 | **Renderer behaviors to preserve** (from current ownership renderer): consecutive-same-kind collapse within 5-minute window, joint-holder badge, `formatINR` currency, relative timestamps. Snapshot-test enforced. | Reviewer concern #8 |
| L21 | **`docs-slice` pre-split**: `docs-slice.ts` (state + mutations) + `docs-access-emitter.ts` (DocumentAccessEvent side effect). | Reviewer concern #7 |
| L22 | **Superseded docs UX**: shown in "Older versions (N)" collapsed disclosure on the card, NOT hidden. | Reviewer concern #10 |
| L23 | **Stale-listing chip**: amber ≥90d, red ≥180d. **Suppressed while deal in RESERVED stage.** | Reviewer question open item |
| L24 | **Add-cost-entry categories (v1)**: full `CostLedgerCategoryEnum` allowed. | Reviewer concern answer |
| L25 | **Commission GST is additive** (tax-exclusive): `commissionGst = round(commissionEarned × 18/100)`. Service fees per Doc 06 — GST added on top of invoice value, not extracted. **Margin-scheme GST remains tax-inclusive** (`margin × 18/118`). | Spec-review cross-spec #3 + Q1 |
| L26 | **`DealStage` does NOT add `EXPIRED`.** Expiry is modelled as `stage: CANCELLED` + `cancellationReason: 'EXPIRED' \| 'BUYER_WITHDREW' \| 'INVENTORY_SOLD' \| 'MANUAL_CANCEL'` on the deal record. `deriveSalesEvent` branches on `cancellationReason` when `next === 'CANCELLED'` coming from `RESERVED`. | Spec-review cross-spec #5 + Q2 |
| L27 | **Portal `supersededBy` renders as boolean only**, never as an id. Adapter transforms `Document.supersededBy: string` → `isReplaced: boolean` at the portal boundary. Staff-web keeps the id for linking. | Spec-review trap #4 + Q3 |
| L28 | **Runtime payload validation**: new §2.5 `event-payload-validators.ts` with per-kind `z.object` validators. `emitSalesEvent`, `emitDocAccessEvent`, and all fixture loaders MUST call them before store write. Invalid payload throws `PayloadValidationError` — the translation table never sees malformed data. | Spec-review blocker #1 |
| L29 | **Per-kind-per-key translation**. Table keys take form `${EventStream}.${EventKind}.${PayloadKey}` (e.g., `SALES.RESERVATION_LOST.reason`). Exhaustiveness guard is per-kind-per-key, not per-key-alone. Same payload key in different kinds gets independent labels + formatters. | Spec-review blocker #3 |
| L30 | **i18n key existence test**: Vitest in P1 loads `messages/en-IN.json` and asserts every `PAYLOAD_KEY_LABELS[*].i18nKey` + every `TimelineEntryView.titleKey` enumerated in §12 resolves to a string. Missing keys fail CI. | Spec-review concern #1 |
| L31 | **docs-slice three-way split** (finer than L21): `docs-slice.ts` (state + pure selectors, ≤160) + `docs-mutations.ts` (≤180) + `docs-access-emitter.ts` (≤120). | Spec-review concern #2 |
| L32 | **Cross-store snapshot via return value, not `getState()`**. `salesStore.advanceStage(dealId, next)` returns the updated deal; pass to `deriveSalesEvent`. Eliminates race on concurrent-tab edits. | Spec-review concern #3, trap #3 |
| L33 | **DocumentAccessEvent Activity feed uses `DocumentAccessEventRow`**, NOT merged into `buildVehicleTimeline`. Separate renderer in Documents tab bottom section. | Spec-review concern #5 |
| L34 | **P2 ships SellerSignaturesChecklist + R19 override in SoCompleteDialog.** P4 only adds margin-card / cost-ledger side-effects on SOLD emission. No dialog re-work in P4. | Spec-review concern #8 |
| L35 | **TCS boundary strict**: `tcsApplicable = salePrice > 1_000_000` (exclusive of exactly ₹10L per Income Tax Act §206C(1F) "exceeding ten lakh rupees"). Test at exactly ₹10,00,000 confirms no TCS. | Spec-review trap #1 |
| L36 | **`commissionPct` explicit nullish check**: `const pct = input.commissionPct ?? DEFAULT_COMMISSION_PCT;` — `0` is a valid explicit value (unusual but legal) and MUST NOT fall through to default. Test at `commissionPct: 0`. | Spec-review trap #2 |
| L37 | **Lazy expiry wrapped in effect**, not inside selector body. `selectActiveDeals` is pure read; expiry detection + `markReservationExpired` emit happens in a parent `useEffect` keyed by `[deals, now]`. Avoids side-effect during React render. | Spec-review trap #3 |
| L38 | **Override proof-doc FK integrity**: `emitSalesEvent('SOLD', { override: { proofDocIds } })` validates every id exists in `docs-slice`, belongs to the VIN, and has category ∈ {`noc`, `cpo-certificate`, `sale-agreement`}. Throws on miss. | Spec-review trap #5 |
| L39 | **`VehicleMaster.listedAt`** added to schema in P2; set at LISTED event emission time. Stale-chip helper reads it. | Spec-review trap #6 |
| L40 | **`actorRole` uses `RoleIdEnum`** from `@dms/types`, not `z.string()`. Applied to both `SalesEventSchema` and `DocumentAccessEventSchema`. | Spec-review cross-spec #4 |
| L41 | **§12 titles are source-of-truth** — they reference (not replace) PLAN-VEHICLES-002 renderer strings. The renderer moves behind `timeline-adapter` in P1; the title strings remain identical to the PLAN-002 implementation. | Spec-review cross-spec #1 |
| L42 | **No hardcoded SalesEvent seeds** — hydrator Phase C derives ALL events from inventory + deals fixtures (§3.5). Inventory VIN → ACQUIRED + LISTED; deals on inventory VINs → RESERVED / SOLD / RESERVATION_LOST per stage. Deals whose VIN is not in inventory are skipped. | P2 implementation feedback |
| L43 | **`isCurrentlyOnSale` derives from events stream**, not `inventoryVehicleVin` alone (§3.6). Last event ∈ {ACQUIRED, LISTED, PRICE_CHANGED, RESERVED, RESERVATION_LOST} → on sale. SOLD/RETURNED are terminal. ActiveDealCard + stale chip are gated on this bool to prevent stale-reservation displays on sold vehicles. | P2 implementation feedback |
| L44 | **Sales tab "View Sale Details" + "Edit Listing" actions** (§3.7) link to `/inventory/${inventoryVehicleVin}` and `/edit`. Gated on `isCurrentlyOnSale` so the link never 404s. View = ungated (all staff roles), Edit = R10+. | P2 implementation feedback |
| L45 | **Inventory fixture coverage**: `inventory.ts:vehicleRefs` is now derived to cover all 28 storefront VINs (10 curated + 18 stub). Stubs auto-generate 3 cost-ledger entries (acquisition `round(exShowroom × 0.85)`, refurb-mechanical, registration-tax) per uncurated VIN; appraisals/timeline/documents builders cycle the curated arrays modulo 10. Closes the `/inventory/[vin]` blank-page bug for all storefront VINs. **Deferred to a follow-up audit pass**: replacing the `0.85` heuristic with a single-source-of-truth selector, fixing the `customerIdFromName` dangling-FK risk, scrubbing the `SALVA2BN8HA198012` ghost VIN from `sales.ts`, and consolidating `vehicleRefs.listedAt` against `vehicles.ts:listedAt`. See `specs/architecture/fixture-coverage-audit.md` §4. | fixture-coverage-audit.md, FIXTURE-COV-001 |

## 1. Schemas

File: `packages/types/src/domain/vehicles-aggregate.ts` (extend). ≤ 200 LoC net add.

### 1.1 `SalesEvent`

```ts
export const SalesEventKindEnum = z.enum([
  'ACQUIRED',
  'LISTED',
  'PRICE_CHANGED',
  'RESERVED',
  'RESERVATION_LOST',
  'SOLD',
  'RETURNED',
]);
export type SalesEventKind = z.infer<typeof SalesEventKindEnum>;

// Per-kind payload shapes (discriminated union at TypeScript level;
// Zod stores as generic record but runtime-validates via helpers)
export const SalesEventSchema = z.object({
  id: z.string(),
  vin: z.string(),
  at: z.string().datetime(),
  kind: SalesEventKindEnum,
  actorId: z.string(),
  actorRole: z.string(),
  dealId: z.string().optional(),
  salesOrderId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type SalesEvent = z.infer<typeof SalesEventSchema>;

// TypeScript-only discriminated union for type-safe payload access
export type SalesEventPayloads = {
  ACQUIRED: { acquisitionCost: number; kmAtAcquisition: number; source: VehicleTouchSource; consignorCustomerId?: string };
  LISTED: { listPrice: number; outletId: OutletId };
  PRICE_CHANGED: { fromPrice: number; toPrice: number; reason?: string };
  RESERVED: { dealId: string; depositAmount: number; expiresAt: string };
  RESERVATION_LOST: { dealId: string; reason: 'EXPIRED' | 'CANCELLED' | 'BUYER_WITHDREW' };
  SOLD: {
    salesOrderId: string;
    finalPrice: number;
    flow: 'MARGIN_SCHEME' | 'CONSIGNMENT_COMMISSION';
    tcsCollected: number;
    tcsWaived?: boolean;
    tcsWaivedReason?: string;
    gstMargin?: number;
    commissionEarned?: number;
    sellerSignatures: Array<{ customerId: string; signedAt: string; actorId: string }>;
    override?: { by: string; reason: string; proofDocIds: string[] };
    buyerCustomerId: string;
  };
  RETURNED: { salesOrderId: string; reason: string; noteForFinance?: string };
};
```

### 1.2 `DocumentAccessEvent`

New file: `packages/types/src/domain/documents.ts`.

```ts
export const DocumentAccessKindEnum = z.enum([
  'UPLOAD', 'UPDATE', 'REPLACE', 'DELETE', 'DOWNLOAD',
]);

export const DocumentAccessEventSchema = z.object({
  id: z.string(),
  docId: z.string(),
  vin: z.string(),
  customerId: z.string().optional(),
  kind: DocumentAccessKindEnum,
  at: z.string().datetime(),
  actorId: z.string(),
  actorRole: z.string(),
  purpose: z.enum(['CUSTOMER_HANDOFF','AUDIT','RTO_FILING','OTHER']).optional(),
  purposeNote: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  schemaVersion: z.literal('v1').default('v1'),
});

export type DocumentAccessEventPayloads = {
  UPLOAD: { category: StaffDocumentCategory; subtype?: 'financier'|'rto'; fileName: string; expiresAt?: string };
  UPDATE: { before: Partial<Document>; after: Partial<Document> };
  REPLACE: { previousDocId: string; previousVersion: number; newVersion: number };
  DELETE: { reason?: string; blockedByClosedSaleId?: string };
  DOWNLOAD: { purpose?: DownloadPurpose; purposeNote?: string };
};
```

### 1.3 `Document` schema changes

`packages/types/src/domain/portal.ts` `DocumentSchema` — add ONE field only:
```ts
supersededBy: z.string().optional(), // id of newer doc that replaced this
```

Portal customer can see "Replaced" label; no other new fields leak to customer surface.

### 1.4 `StaffDocumentMetadata` — new sibling entity

New file `packages/types/src/domain/documents.ts`:
```ts
export const StaffDocumentCategoryEnum = z.enum([
  'tcs-certificate-27d',
  'form-29-30',
  'noc',
  'consignment-agreement',
  'cpo-certificate',
  'sale-agreement',
]);

export const StaffDocumentMetadataSchema = z.object({
  docId: z.string(),
  version: z.number().int().min(1).default(1),
  subtype: z.enum(['financier','rto']).optional(),   // only when category==='noc'
  deletedAt: z.string().datetime().optional(),
  supportingSalesOrderId: z.string().optional(),
  purposeOfCollection: z.string().optional(),         // DPDP consent purpose at upload
  schemaVersion: z.literal('v1').default('v1'),
});
```

Staff-web reads `Document ⋈ StaffDocumentMetadata` on docId. Customer-web never sees the metadata entity.

### 1.5 Cost ledger — no schema change

`CostLedgerEntrySchema` stays. New store slice wraps the existing fixture.

## 2. Shared helpers — `@dms/vehicles-core`

### 2.1 `gst-margin.ts` (~120 LoC)

```ts
export const DEFAULT_COMMISSION_PCT = 15;
export const TCS_THRESHOLD_INR = 1_000_000;
export const TCS_RATE = 0.01;
export const GST_RATE = 18; // percent
export const GST_DIVISOR = 118; // tax-inclusive

export function computeGstMargin(input: {
  flow: 'MARGIN_SCHEME' | 'CONSIGNMENT_COMMISSION';
  salePrice: number;
  acquisitionCost?: number;   // MARGIN_SCHEME only
  refurbCost?: number;         // MARGIN_SCHEME only (informational; not included in margin per policy)
  commissionPct?: number;       // CONSIGNMENT_COMMISSION; defaults to DEFAULT_COMMISSION_PCT
  tcsWaived?: boolean;
}): ComputedGstMargin;
```

**MARGIN_SCHEME branch:**
- `margin = max(0, salePrice - acquisitionCost)`
- `gstTaxable = margin`
- `gstAmount = round(gstTaxable × 18 / 118)` (tax-inclusive, L4)
- Loss sale: `margin === 0 → gstAmount === 0`
- Policy notes: `["Margin scheme per CBIC Notification 8/2018", "BN policy: no ITC on refurb inputs"]`

**CONSIGNMENT_COMMISSION branch (per L25, L36):**
- `const pct = input.commissionPct ?? DEFAULT_COMMISSION_PCT;` — explicit nullish check; `0` is a valid explicit zero
- `commissionEarned = round(salePrice × pct / 100)`
- `commissionGst = round(commissionEarned × 18 / 100)` — **additive, tax-exclusive** (service fee per Doc 06; contrasts with margin-scheme tax-inclusive formula)
- `margin`, `gstTaxable`, `gstAmount` are `undefined`

**Worked example (MARGIN_SCHEME — include as jsdoc comment block):**
```
Input:  salePrice ₹12,00,000 (tax-inclusive sticker)
        acquisitionCost ₹10,00,000 (tax-inclusive purchase)
Output: margin ₹2,00,000 (tax-inclusive per CBIC Notif 8/2018 Rule 32(5))
        gstAmount = round(2,00,000 × 18/118) = ₹30,508
        BN net revenue (pre-TCS) = ₹1,69,492
        TCS collected from buyer = round(12,00,000 × 1%) = ₹12,000
        (TCS NOT subtracted from margin — it's buyer's tax, remitted to CBDT)
```

**Worked example (CONSIGNMENT_COMMISSION):**
```
Input:  salePrice ₹15,00,000, commissionPct 15%
Output: commissionEarned = round(15,00,000 × 15/100) = ₹2,25,000
        commissionGst = round(2,25,000 × 18/100) = ₹40,500  (additive)
        BN invoices consignor: ₹2,25,000 + ₹40,500 = ₹2,65,500
        Consignor TDS u/s 194H @ 5% = ₹11,250 (v2; v1 display-only)
        TCS on sale to end-buyer = round(15,00,000 × 1%) = ₹15,000
```

**Finance-reviewer sign-off required** before P4 merges per Doc 06 GST margin-scheme + commission-GST classification.

**Common:**
- `tcsApplicable = salePrice > TCS_THRESHOLD_INR && !tcsWaived`
- `tcsAmount = tcsApplicable ? round(salePrice × 0.01) : 0`

### 2.2 `timeline-adapter.ts` (~220 LoC)

```ts
export type TimelineEntry =
  | { kind: 'OWNERSHIP'; event: OwnershipChangeEvent }
  | { kind: 'SALES'; event: SalesEvent };

export function buildVehicleTimeline(
  ownerships: OwnershipChangeEvent[],
  sales: SalesEvent[],
): TimelineEntry[];  // sorted by at desc, filters deleted/anonymized

export function renderTimelineEntry(
  entry: TimelineEntry,
  ctx: RenderContext,
): TimelineEntryView;

export interface RenderContext {
  resolveCustomerName(id: string): string;
  resolveStaffName(id: string): string;
  resolveVehicleRef(vin: string): string;
  resolveOwnershipRef(ownershipId: string): string;
  now: string;
}

export interface TimelineEntryView {
  id: string;
  at: string;
  icon: string;
  titleKey: string;       // i18n key — e.g., "staff.vehicles.timeline.sold.marginScheme"
  titleParams: Record<string, string | number>;
  chips: Array<{ kind: 'info'|'success'|'warning'|'danger'; labelKey: string; labelParams?: Record<string,unknown> }>;
  meta: Array<{ labelKey: string; value: string }>;
  isJoint?: boolean;
}
```

**Consecutive-collapse (L20)**: `buildVehicleTimeline` collapses entries with same `kind` + `subject id` + within 5 minutes into a single entry with `count` and array of source ids.

**Legacy fallback (L19)**: `renderLegacyFallback(entry)` returns `{ titleKey: 'staff.vehicles.timeline.legacyRaw', titleParams: { kind, actor }, chips: [], meta: [] }`.

### 2.3 `translation-table.ts` (~180 LoC) — per-kind-per-key (L29)

```ts
// Key shape: `${Stream}.${Kind}.${PayloadKey}` → unique label + formatter
// Eliminates same-key collision (blocker #3): SALES.RESERVATION_LOST.reason
// gets a different label than SALES.PRICE_CHANGED.reason.

export const PAYLOAD_KEY_LABELS = {
  'OWNERSHIP.CLAIM_SUBMIT.claimantCustomerId': { i18nKey: 'staff.vehicles.timeline.keys.claimant', formatter: 'customerRef' },
  'OWNERSHIP.CLAIM_APPROVE.overlapsOwnershipId': { i18nKey: 'staff.vehicles.timeline.keys.overlap', formatter: 'ownershipRef' },
  'OWNERSHIP.CLAIM_REJECT.category': { i18nKey: 'staff.vehicles.timeline.keys.rejectCategory', formatter: 'enumLabel' },
  'SALES.PRICE_CHANGED.reason': { i18nKey: 'staff.vehicles.timeline.keys.priceChangeReason', formatter: 'freeText' },
  'SALES.RESERVATION_LOST.reason': { i18nKey: 'staff.vehicles.timeline.keys.reservationLostReason', formatter: 'enumLabel' },
  'SALES.RETURNED.reason': { i18nKey: 'staff.vehicles.timeline.keys.returnReason', formatter: 'freeText' },
  'SALES.SOLD.override.reason': { i18nKey: 'staff.vehicles.timeline.keys.overrideReason', formatter: 'freeText' },
  'DOCUMENT.DELETE.reason': { i18nKey: 'staff.vehicles.timeline.keys.deleteReason', formatter: 'freeText' },
  // ... complete list in §12 — every tuple validated by Missing-extends-never
} as const satisfies Record<string, { i18nKey: string; formatter: FormatterName }>;

type QualifiedKey = `OWNERSHIP.${OwnershipEventKind}.${string}`
  | `SALES.${SalesEventKind}.${string}`
  | `DOCUMENT.${DocumentAccessKind}.${string}`;

type KnownQualifiedKeys =
  | { [K in OwnershipEventKind]: `OWNERSHIP.${K}.${keyof OwnershipEventPayloads[K] & string}` }[OwnershipEventKind]
  | { [K in SalesEventKind]: `SALES.${K}.${keyof SalesEventPayloads[K] & string}` }[SalesEventKind]
  | { [K in DocumentAccessKind]: `DOCUMENT.${K}.${keyof DocumentAccessEventPayloads[K] & string}` }[DocumentAccessKind];

type TranslatedKeys = keyof typeof PAYLOAD_KEY_LABELS;
type Missing = Exclude<KnownQualifiedKeys, TranslatedKeys>;

// Compile-time assertion — build fails if any (stream, kind, key) triple is untranslated
const _exhaustivenessGuard: Missing extends never ? true : Missing = true as never;
```

**CI tests (P1) — three layers:**
1. Exhaustiveness: add a stray key to a payload type → `pnpm -F @dms/types build` fails
2. i18n resolution (L30): load `messages/en-IN.json` at test time, assert every `PAYLOAD_KEY_LABELS[*].i18nKey` + every §12 enriched `titleKey` resolves to a non-empty string
3. Same-key independence: assert `PAYLOAD_KEY_LABELS['SALES.RESERVATION_LOST.reason'].i18nKey !== PAYLOAD_KEY_LABELS['SALES.PRICE_CHANGED.reason'].i18nKey` (proves keys aren't collapsed)

### 2.4 `doc-expiry.ts` (~40 LoC)

- `documentExpiryChip(expiresAt?: string, now: string): 'expired' | 'warning-30d' | null`
- `staleListingChip(listedAt: string, now: string, dealStage?: DealStage): 'stale-90d' | 'very-stale-180d' | null`
  - Suppresses when `dealStage === 'RESERVED'` (L23)

### 2.5 `event-payload-validators.ts` (~180 LoC) — **runtime Zod validation per L28**

Resolves spec-reviewer Blocker #1. `SalesEvent.payload` and `DocumentAccessEvent.payload` are typed `z.record(z.unknown())` at the envelope level for forward-compat; this file provides **per-kind Zod objects** that MUST be validated at every write boundary.

```ts
// Sales event payload validators — one z.object per SalesEventKind
export const SalesEventPayloadValidators: Record<SalesEventKind, z.ZodTypeAny> = {
  ACQUIRED: z.object({
    acquisitionCost: z.number().nonnegative(),
    kmAtAcquisition: z.number().int().nonnegative(),
    source: VehicleTouchSourceEnum,
    consignorCustomerId: z.string().optional(),
  }),
  LISTED: z.object({
    listPrice: z.number().positive(),
    outletId: z.enum(['BLR-01','MUM-01','CHE-01']),
  }),
  PRICE_CHANGED: z.object({
    fromPrice: z.number().nonnegative(),
    toPrice: z.number().positive(),
    reason: z.string().optional(),
  }),
  RESERVED: z.object({
    dealId: z.string(),
    depositAmount: z.number().nonnegative(),
    expiresAt: z.string().datetime(),
  }),
  RESERVATION_LOST: z.object({
    dealId: z.string(),
    reason: z.enum(['EXPIRED','CANCELLED','BUYER_WITHDREW']),
  }),
  SOLD: z.object({
    salesOrderId: z.string(),
    finalPrice: z.number().positive(),
    flow: z.enum(['MARGIN_SCHEME','CONSIGNMENT_COMMISSION']),
    tcsCollected: z.number().nonnegative(),
    tcsWaived: z.boolean().optional(),
    tcsWaivedReason: z.string().optional(),
    gstMargin: z.number().nonnegative().optional(),
    commissionEarned: z.number().nonnegative().optional(),
    sellerSignatures: z.array(z.object({
      customerId: z.string(),
      signedAt: z.string().datetime(),
      actorId: z.string(),
    })),
    override: z.object({
      by: z.string(),
      reason: z.string().min(1),
      proofDocIds: z.array(z.string()).min(1),
    }).optional(),
    buyerCustomerId: z.string(),
  }),
  RETURNED: z.object({
    salesOrderId: z.string(),
    reason: z.string().min(1),
    noteForFinance: z.string().optional(),
  }),
};

// Document access payload validators — one z.object per DocumentAccessKind
export const DocumentAccessPayloadValidators: Record<DocumentAccessKind, z.ZodTypeAny> = {
  UPLOAD: z.object({ category: StaffDocumentCategoryEnum, subtype: z.enum(['financier','rto']).optional(), fileName: z.string(), expiresAt: z.string().datetime().optional() }),
  UPDATE: z.object({ before: z.record(z.unknown()), after: z.record(z.unknown()) }),
  REPLACE: z.object({ previousDocId: z.string(), previousVersion: z.number().int().min(1), newVersion: z.number().int().min(1) }),
  DELETE: z.object({ reason: z.string().optional(), blockedByClosedSaleId: z.string().optional() }),
  DOWNLOAD: z.object({
    purpose: z.enum(['CUSTOMER_HANDOFF','AUDIT','RTO_FILING','OTHER']).optional(),
    purposeNote: z.string().optional(),
  }),
};

export class PayloadValidationError extends Error { /* ... */ }

export function validateSalesEventPayload(kind: SalesEventKind, payload: unknown): void {
  const validator = SalesEventPayloadValidators[kind];
  const result = validator.safeParse(payload);
  if (!result.success) throw new PayloadValidationError(`Invalid payload for ${kind}`, result.error);
}

export function validateDocumentAccessPayload(kind: DocumentAccessKind, payload: unknown): void { /* same pattern */ }
```

**Enforcement points (non-negotiable)**:
- `sales-events-slice.emitSalesEvent` — calls `validateSalesEventPayload(kind, payload)` before `set()`
- `docs-access-emitter.emitDocAccessEvent` — calls `validateDocumentAccessPayload(kind, payload)` before write
- All fixture loaders (hydrator) — validate every event on load; log + skip invalid rows
- MSW handlers — validate request body before write

This ensures the translation table never sees malformed data; renderer can assume validity.

## 3. Store design

### 3.1 `vehicles-store` slice additions

```
apps/staff-web/src/lib/vehicles/vehicles-store/slices/
├── sales-events-slice.ts        (≤180) — new
├── docs-slice.ts                 (≤260) — new: state + Document + StaffDocumentMetadata + mutations
├── docs-access-emitter.ts        (≤120) — new: DocumentAccessEvent emission (L21 split)
└── cost-ledger-slice.ts          (≤200) — new
```

**sales-events-slice:**
- State: `salesEvents: Record<vin, SalesEvent[]>`
- Actions: `emitSalesEvent(vin, kind, payload, actor)`, `selectSalesEvents(vin)`, `hydrateSalesEvents(seed)`
- **SOLD validation**: throws `SellerSignaturesIncomplete` if `payload.sellerSignatures.length < activeJointOwnerCount` AND no `override` present

**docs-slice:**
- State: `documents: Record<docId, Document>`, `staffMeta: Record<docId, StaffDocumentMetadata>`
- Actions: `addDocument`, `replaceDocument` (sets old.`supersededBy`), `updateDocumentMeta`, `softDeleteDocument` (blocks if `supportingSalesOrderId && salesOrderIsSold(id)`), `markSupporting(docId, salesOrderId)`
- Every mutation calls `docs-access-emitter` side-effect (pure-function emit helper)

**docs-access-emitter:**
- Pure function `emitDocAccessEvent(state, kind, payload, actor)` — appends to `documentAccessEvents` state collection; no other logic

**cost-ledger-slice:**
- State: `costLedger: Record<vin, CostLedgerEntry[]>`
- Actions: `hydrateFromInventory(seed)`, `addCostEntry(vin, entry, actor)`, `selectCostTotals(vin)`
- R12+ gate enforced at UI level via `<Gate minRank="R12">`, but slice also throws `R12Required` error if actor role < R12 (defence-in-depth per L7)

### 3.2 `sales-store` additions

New file `apps/staff-web/src/components/sales/derive-sales-event.ts` (≤120 LoC) — pure helper:
```ts
export function deriveSalesEvent(
  prev: DealStage, next: DealStage, deal: Deal,
): { kind: SalesEventKind; payload: unknown } | null;
```

Mapping table (locked):

| Prev → Next | Emit |
|---|---|
| `NEGOTIATION → RESERVED` | `RESERVED` |
| `RESERVED → CANCELLED` (manual) | `RESERVATION_LOST` (reason: `CANCELLED`) |
| `RESERVED → EXPIRED` (lazy sweep) | `RESERVATION_LOST` (reason: `EXPIRED`) |
| `SO_CONFIRMED → DELIVERED` | `SOLD` (via SoCompleteDialog, not auto) |
| `DELIVERED → RETURNED` | `RETURNED` |
| all others | null |

`sales-store.markReservationExpired(dealId)` — idempotent; flips stage + emits `RESERVATION_LOST`. Called from `selectActiveDeals(vin)` selector on first read after `now > deal.reservation.expiresAt`.

### 3.3 Cross-store wiring (PAGE-level, L8 + L32)

`salesStore.advanceStage(dealId, next)` **returns the updated deal** — no `getState()` re-read (eliminates race on concurrent-tab edits).

```ts
// apps/staff-web/app/.../deal-stage-action.tsx
function handleAdvanceStage(next: DealStage) {
  const prev = deal.stage;
  const updated = salesStore.advanceStage(dealId, next);  // returns the mutated Deal
  const derived = deriveSalesEvent(prev, next, updated);
  if (derived) {
    vehiclesStore.emitSalesEvent(updated.vin, derived.kind, derived.payload, actor);
    // emitSalesEvent internally calls validateSalesEventPayload (§2.5)
  }
}
```

**No hooks, no subscriptions, no transparent emitters.** L8 + L32 resolved.

### 3.4 Lazy reservation expiry (L11 + L37)

`selectActiveDeals(vin)` is a **pure selector** — no side effects. A parent `useEffect` in the page component detects expired reservations and fires the emit:

```ts
// In /vehicles/[vin] page component
const deals = useSalesStore(s => s.deals);
const now = useNowTick(60_000); // updates every minute

useEffect(() => {
  for (const deal of Object.values(deals)) {
    if (deal.stage === 'RESERVED' && new Date(deal.reservation.expiresAt) < new Date(now)) {
      const updated = salesStore.markReservationExpired(deal.id);
      vehiclesStore.emitSalesEvent(deal.vin, 'RESERVATION_LOST', { dealId: deal.id, reason: 'EXPIRED' }, SYSTEM_ACTOR);
    }
  }
}, [deals, now]);
```

`markReservationExpired` is idempotent — repeated calls are no-ops once stage is CANCELLED.

### 3.5 Cross-module derivation of SalesEvents (L42 — no hardcoded seeds)

**Decision**: SalesEvents MUST be derived from real cross-module fixture data,
never hardcoded. Hardcoded seeds caused three breakages in the P2 build:

1. VINs with seeded sales events that weren't in BN inventory → "View Sale
   Details" link broke (404 on `/inventory/[vin]`)
2. `VehicleMaster.listedAt` was set on customer-owned VINs that were never
   actually on the lot → stale-listing chip showed incorrectly
3. Seed data drifted from the canonical deal/inventory fixtures, creating
   inconsistencies between the Sales tab and the Sales Kanban

**Derivation rules (VehiclesStoreHydrator Phase C):**

```ts
function buildDerivedSalesEvents(
  invVehicles: Vehicle[],
  deals: Deal[],
): SalesEvent[]
```

For every **inventory Vehicle** (`inv.vin` in inventory fixtures):
- Emit `ACQUIRED` at `listedAt − 15–45 days` (deterministic via VIN hash).
  Payload: `{ acquisitionCost: round(listPrice × 0.85), kmAtAcquisition: inv.km, source: 'BN_CONSIGNMENT' }`
- Emit `LISTED` at `inv.listedAt`. Payload: `{ listPrice: inv.pricing.exShowroom, outletId }`

For every **Deal** with `vehicleVin` in inventory:
- Stage ∈ { 'reserved', 'sales-order', 'delivered' } → emit `RESERVED` at
  `lastActivityAt`. Payload: `{ dealId, depositAmount: round(amount × 0.1), expiresAt }`
- Stage === 'delivered' → additionally emit `SOLD`. Payload uses `deal.amount`,
  `MARGIN_SCHEME` flow, TCS if `amount > 1_000_000`, `buyerCustomerId` derived
  from `deal.customerName`, `sellerSignatures: []`.
- Stage === 'lost' with `cancellationReason` → emit `RESERVATION_LOST`.
  Payload: `{ dealId, reason: EXPIRED | CANCELLED | BUYER_WITHDREW }`

**Filter rule**: `if (!invVinSet.has(vin)) continue;` — deals on VINs not in
BN inventory are skipped. Ensures the "View Sale Details" link never orphans.

**Sort**: events sorted chronologically by `at` before write.

**Consequences**:
- VINs not in inventory (customer-owned legacy VINs like Arjun's BMW) have
  ZERO sales events → Sales tab shows "Not on sale"
- Sales tab and Sales Kanban share the same source of truth (the `deals`
  fixture), so adding/moving a deal in the Kanban automatically updates the
  vehicle's Sales tab on next hydration
- `VehicleMaster.listedAt` only set when a LISTED event is emitted for a real
  inventory vehicle (L39 enforcement is preserved)

### 3.6 Current-on-sale derivation + active-deal gating (L43)

**Decision**: The UI's "currently on sale" boolean derives from the sales-events
stream, not from `vehicle.inventoryVehicleVin` alone:

```ts
const lastEvent = salesEvents[salesEvents.length - 1];
const isCurrentlyOnSale = !lastEvent
  ? Boolean(vehicle.inventoryVehicleVin)
  : (lastEvent.kind === 'ACQUIRED'
    || lastEvent.kind === 'LISTED'
    || lastEvent.kind === 'PRICE_CHANGED'
    || lastEvent.kind === 'RESERVED'
    || lastEvent.kind === 'RESERVATION_LOST');
```

Terminal events (`SOLD`, `RETURNED`) take the vehicle off sale. The
`ActiveDealCard` is only rendered when `isCurrentlyOnSale === true`, preventing
a stale "Reserved by X" card from showing alongside a SOLD timeline entry.

The stale-listing chip (§2.4) is also gated on `isCurrentlyOnSale` — a
SOLD vehicle never displays "On lot 180+ days".

### 3.7 Sales tab cross-module action links (L44)

When `isCurrentlyOnSale === true` AND `vehicle.inventoryVehicleVin` resolves,
the Sales Summary card surfaces two action buttons:

| Action | URL | Role gate |
|---|---|---|
| **View Sale Details** | `/inventory/${vehicle.inventoryVehicleVin}` | None (all staff roles) |
| **Edit Listing** | `/inventory/${vehicle.inventoryVehicleVin}/edit` | R10+ (`['R10','R19','R22','R24']`) |

Both links are hidden when the vehicle is not currently on sale, ensuring the
link never 404s. View Sale Details is deliberately ungated because reading
listing detail is part of the standard staff workflow for R05+ advisors.

## 4. Route surface + tab composition

Route `/vehicles/[vin]` unchanged. Three tabs evolve from stubs to real:

### 4.1 SalesTab
- Renders `buildVehicleTimeline(ownerships, sales)` filtered to `SALES` kinds + ownership entries with `linkedSalesOrderId` (context)
- **Sales Summary card** — mirrors OwnershipTab ledger-card shell (`rounded-md border border-line bg-bg-surface overflow-hidden`). Header shows section title + stale chip (gated on L43). Body shows either `ActiveDealCard` (if `isCurrentlyOnSale` AND there's an active deal) or a compact Status line.
- **Action links** in summary header per L44: "View Sale Details" (all roles) + "Edit Listing" (R10+ via `Gate`). Hidden when not on sale.
- **Sales Events section** mirrors OwnershipTab events sub-section. Uses shared `TimelineEntryRow`.
- Stale-listing chip per §2.4 (suppressed if RESERVED OR not on sale per L43)
- Empty state: "No sales activity recorded for this VIN yet."
- **Data source**: SalesEvents derived from inventory + deals fixtures per §3.5; no hardcoded seeds.

### 4.2 DocumentsTab
- Category-grouped grid (6 new staff categories + existing portal ones)
- Each card: icon + name + version + expiry chip + actions (view / download / replace / delete)
- Upload CTA → `UploadDocumentDialog`
- Bottom collapsible **Activity** section — chronological DocumentAccessEvent feed
- Download of PII-heavy category opens `DownloadPurposePrompt` (L13)
- Delete on linked doc: dialog shows blocked state + "Upload replacement" CTA (L14)

### 4.3 CostsTab — **R12+ gated**
- Route-level gate: whole tab returns `<RankDeniedNotice minRank="R12" />` for lower ranks
- Cost ledger table (grouped by category) + running totals
- Margin card (flow-branched per §2.1)
- TCS info line (L5)
- "Put up for sale" CTA (L12 visibility rule)
- Revoked walk-in empty state: "Last known owner sold privately. Contact BN to reacquire." (addendum §4.3)
- "Add cost entry" R12+ dialog — full `CostLedgerCategoryEnum` (L24)

## 5. Component tree + LoC caps

```
apps/staff-web/src/components/vehicles/detail/tabs/

shared/
├── timeline-entry-row.tsx            ≤180  (new primitive — reused by Ownership + Sales)
└── timeline-entry-chips.tsx          ≤80

sales/
├── sales-tab.tsx                     ≤180
├── sales-timeline-list.tsx           ≤120
├── active-deal-card.tsx              ≤160
├── stale-listing-chip.tsx            ≤40
└── sales-tab-empty.tsx               ≤60

documents/
├── documents-tab.tsx                 ≤180   # actual implementation
# (sibling) tabs/documents-tab.tsx           # thin re-export wrapper that imports
#                                            # from documents/documents-tab.tsx — kept
#                                            # so the parent tab registry can `import
#                                            # { DocumentsTab } from './documents-tab'`
#                                            # without reaching into the sub-folder.
├── document-category-group.tsx       ≤120
├── document-card.tsx                 ≤160
├── upload-document-dialog.tsx        ≤260
├── replace-document-dialog.tsx       ≤180
├── delete-document-dialog.tsx        ≤140
├── download-purpose-prompt.tsx       ≤120
└── document-activity-feed.tsx        ≤160

costs/
├── costs-tab.tsx                     ≤180
├── cost-ledger-table.tsx             ≤180
├── add-cost-entry-dialog.tsx         ≤220
├── margin-card.tsx                   ≤100   (dispatcher)
├── margin-card-margin-scheme.tsx     ≤180
├── margin-card-consignment.tsx       ≤140
├── put-up-for-sale-cta.tsx           ≤100
└── tcs-info-line.tsx                 ≤60

ownership/  (existing, modified)
└── ownership-timeline-event.tsx      ≤80 (was ~220; now delegates to shared row)
```

Every file ≤ 350 LoC hard cap. Pre-budgets above leave 30–80 LoC headroom each.

## 6. RBAC matrix (consolidated, numeric rank semantic per L7)

| Action | Min rank | Notes |
|---|---|---|
| View Sales tab | R05 | city-scoped |
| View Documents tab list + expiry chips | R05 | |
| View Document preview / filename | R09 | |
| Download non-PII doc (consignment-agreement, sale-agreement, etc) | R09 | logged, no purpose required |
| Download PII-heavy doc (rc, insurance, noc, form-29-30, tcs-27d) | R09 | purpose required (L13) |
| Upload document | R09 | logged as UPLOAD access event |
| Update document metadata | R09 | logged as UPDATE |
| Replace document | R09 | logged as REPLACE + sets `supersededBy` |
| Delete document (not closed-sale-linked) | R12 | logged as DELETE; soft-delete sets `deletedAt` |
| Delete document (closed-sale-linked) | **BLOCKED** | L14 — all ranks; logged as DELETE with `blockedByClosedSaleId` |
| View DocumentAccessEvent feed | R09 | |
| View Costs tab | **R12** | L7 |
| View margin / TCS amounts | R12 | |
| Add cost entry | R12 | |
| Emit SOLD event | R09 | via SoCompleteDialog |
| Seller-signature override on SOLD | R19 | L16 |
| Advance deal stage (→ RESERVED) | R05 | |
| Cross-outlet | R19+ | existing rule |

## 7. Scenarios (GPA)

### P1 (renderer foundation)
- **S-V3-1** — All 11 OwnershipEventKinds render with resolved customer/staff/vehicle names; no raw payload keys visible in DOM across 3 sample VINs (snapshot test per kind)
- **S-V3-2** — Compile-time exhaustiveness guard: adding a key to `OwnershipEventPayloads` without updating `PAYLOAD_KEY_LABELS` breaks `pnpm -F types build`
- **S-V3-3** — Consecutive-same-kind events within 5 minutes collapse into one entry with `(N)` counter
- **S-V3-4** — Legacy event (payload missing expected keys) falls through to `renderLegacyFallback` — shows kind/timestamp/actor only, no error

### P2 (Sales)
- **S-V3-5** — Deal advancing NEGOTIATION → RESERVED emits RESERVED event within one render cycle; Sales tab shows it
- **S-V3-6** — Lazy expiry: deal with `reservation.expiresAt = yesterday` + user opens `/vehicles/[vin]` → RESERVATION_LOST emitted idempotently; re-reading doesn't duplicate the event
- **S-V3-7** — Stale-listing chip: day 91 → amber "Stale"; day 181 → red "Very stale"; suppressed while RESERVED
- **S-V3-8** — SoCompleteDialog SOLD with all seller signatures → succeeds; with one missing → store action throws `SellerSignaturesIncomplete`; override path with `overrideReason` + R19 actor + `proofDocIds[]` succeeds

### P3 (Documents)
- **S-V3-9** — Upload of type `rc` requires `purposeOfCollection`; blank submit is rejected by slice
- **S-V3-10** — Delete of doc linked to a SOLD sales order shows blocked dialog + emits DELETE event with `blockedByClosedSaleId`; `deletedAt` remains unset
- **S-V3-11** — Replace increments version + sets `supersededBy` on old doc; old doc shows in "Older versions" disclosure
- **S-V3-12** — Download of `rc` without selecting purpose → blocked; with purpose "RTO_FILING" → event logged with purpose
- **S-V3-13** — Expiry chip: insurance expiring in 15 days → amber; expired 3 days ago → red; > 30 days away → no chip

### P4 (Costs)
- **S-V3-14** — R09 user navigates to `/vehicles/[vin]` → Costs tab shows `<RankDeniedNotice minRank="R12" />`; R12 user sees full content; R13 user also sees (numeric rank semantic L7)
- **S-V3-15** — MARGIN_SCHEME VIN: salePrice 12L, acquisition 10L → margin 2L, GST `round(200000 × 18/118) = 30508`, TCS `12000` (₹12L × 1%); loss sale salePrice 11L acquisition 12L → margin 0, GST 0, TCS 11000 (on gross, independent of margin)
- **S-V3-16** — CONSIGNMENT_COMMISSION VIN: salePrice 15L → commission 225000 (15%), commissionGst `round(225000 × 18/100)` = ₹40,500 (additive per L25, NOT margin-scheme tax-inclusive), no acquisition/refurb shown
- **S-V3-17** — "Put up for sale" CTA: visible on VIN with active Arjun ownership + no active BN_CONSIGNMENT; hidden on VIN currently in BN dealer stock; hidden with revoked empty state on walk-in with all owners revoked
- **S-V3-18** — Add cost entry R12+ dialog: R09 user → Gate disables button with tooltip; R12 user → dialog opens; submit creates CostLedgerEntry + updates totals

### Cross-phase
- **S-Typecheck** — `pnpm -F staff-web typecheck && pnpm -F customer-web typecheck && pnpm -F @dms/vehicles-core typecheck && pnpm -F @dms/types typecheck` all exit 0
- **S-Tests** — per-phase Vitest counts enforced (see §8)
- **S-V3-19** — **Same-key collision** (spec-review missing AC #1): craft a fixture with two SalesEvents — one `PRICE_CHANGED` with `reason: "festive pricing"`, one `RESERVATION_LOST` with `reason: "EXPIRED"`. Renderer must show different labels: "Price change note" vs "Reservation ended: Expired".
- **S-V3-20** — **R19 override path on SOLD** (spec-review missing AC #2): build a SOLD payload with 1-of-2 joint signatures + `override: { by: R19_user, reason: "Joint owner deceased", proofDocIds: [noc-cert-123] }`. Assert: emit succeeds, proofDocIds resolve to real VIN-scoped documents of category ∈ {noc, cpo-certificate, sale-agreement}; emit with an invalid proofDocId throws `OverrideProofInvalid`.
- **S-V3-21** — **Unknown-kind legacy event** (spec-review concern #7): inject an event with `kind: 'UNKNOWN_FUTURE_KIND'` into fixtures. Renderer falls through to `renderLegacyFallback` showing "Unknown event · {timestamp} · {actor}" with no payload expansion; no crash.
- **S-V3-22** — **`commissionPct: 0`** (spec-review trap #2): call `computeGstMargin({ flow: 'CONSIGNMENT_COMMISSION', salePrice: 15_00_000, commissionPct: 0 })`. Assert `commissionEarned === 0, commissionGst === 0`. Explicit zero does NOT fall through to the 15% default.
- **S-V3-23** — **TCS @ exactly ₹10,00,000** (spec-review trap #1): `computeGstMargin({ salePrice: 10_00_000 })`. Assert `tcsApplicable === false, tcsAmount === 0` (strict `>` per L35). At `salePrice: 10_00_001`, `tcsApplicable === true, tcsAmount === 10_000`.
- **S-V3-24** — **DocumentAccessEvent Activity feed** (spec-review missing AC #5): R09 user uploads insurance doc → Activity feed shows the UPLOAD event with uploader name + timestamp + filename; downloads same doc with purpose RTO_FILING → DOWNLOAD entry with purpose chip; feed orders chronologically newest-first.

## 8. Test plan per phase (enforced minimums)

| Phase | Unit tests | Integration tests | Snapshot tests |
|---|---|---|---|
| P1 | 11 (one per OwnershipEventKind) + 1 (exhaustiveness guard fires) + 1 (i18n key resolution from en-IN.json, L30) + 1 (same-key independence S-V3-19) + 1 (legacy fallback S-V3-21 with unknown kind) + 1 (collapse) + computeGstMargin × 10 cases (MS loss/profit/zero/negative, COMM default/custom/zero [S-V3-22], TCS strict-boundary @ ₹10,00,000 + ₹10,00,001 [S-V3-23], commission-additive-not-inclusive). Payload validators (§2.5): 1 per SalesEventKind happy-path + 1 per DocumentAccessKind happy-path + 5 reject cases (missing required, wrong type, extra key, invalid enum, invalid datetime) | 1 (renderer end-to-end on all kinds) | 11 (one per kind) |
| P2 | 7 SalesEventKind emission tests + 1 override path with proofDocIds FK [S-V3-20] + 1 seller-signatures-incomplete + 1 lazy expiry (useEffect-based, L37) + 1 stale-chip-boundary (day 91, 181, suppressed-in-RESERVED) + 1 derive-event mapping × 6 transitions + 1 commissionPct-0 [S-V3-22 covered in P1 helper test] + 1 deal.cancellationReason branch check (L26) | 1 (deal stage advance → event visible on SalesTab) | 0 (covered by P1 renderer tests) |
| P3 | 5 DocumentAccessKind emission + 1 purpose-required + 1 immutable-block + 1 replace-versioning + 1 soft-delete-with-audit + 1 expiry-chip boundary + 1 Activity feed ordering + purpose chip [S-V3-24] + 1 portal `supersededBy` renders as boolean-only (L27) | 1 (full upload → replace → delete-blocked flow) | 1 (DocumentCard states) |
| P4 | 1 R12-gate-denies-R11 + 1 R12-gate-allows-R13 + 4 margin-card branches + 1 TCS-on-loss-sale + 1 CTA-visibility-rule (all 3 branches) + 1 revoked-walk-in-empty-state + 1 add-cost R12-throw + 1 commission-default-const | 1 (sale completion → cost ledger reflects + margin card updates) | 2 (margin card both flows) |

**E2E test** (Playwright; goes into `apps/staff-web/tests/e2e/sales-flow.spec.ts`):
- Full flow `reserve → agreement → SOLD → RC transfer doc upload`. Acceptance: timeline shows 4 events in order; TCS line shown on invoice view; seller signatures panel captured.

## 9. Phase breakdown (build order)

### Phase 1 — Foundations + renderer fix (~900 LoC)
Deliverables: schemas, translation-table + guard, timeline-adapter, gst-margin helper, doc-expiry, shared TimelineEntryRow primitive, ownership-timeline-event rewrite, Storybook + Vitest per §8.
Acceptance: S-V3-1..4 + S-Typecheck pass; renderer fix visible across all VINs on `/vehicles/[vin]` Ownership tab.
Risk: enum drift — mitigated by compile-time guard + CI test.

### Phase 2 — Sales tab (~1100 LoC)
Deliverables: sales-events-slice, SalesTab UI, `deriveSalesEvent` pure helper + stage-transition wiring in pages, SoCompleteDialog extended with SellerSignaturesChecklist + override path (L16), inventory Add Car flow emits ACQUIRED + LISTED, lazy reservation expiry in selectActiveDeals, `VehicleMaster.listedAt` field for stale-chip.
Acceptance: S-V3-5..8.
Risk: hidden emission — mitigated by L8 UI-layer-only rule.

### Phase 3 — Documents tab (~1400 LoC)
Deliverables: docs-slice + docs-access-emitter (L21 split), 6 new staff categories, Document.supersededBy, StaffDocumentMetadata, DocumentsTab UI, upload/replace/delete/download dialogs, purpose prompt, Activity feed, immutable-after-sale guard (L14), superseded "Older versions" disclosure (L22).
Acceptance: S-V3-9..13.
Risk: purpose-prompt bypass — mitigated by slice-level enforcement (not UI-only).

### Phase 4 — Costs tab + sale completion (~1200 LoC)
Deliverables: cost-ledger-slice (hydrates from inventory fixtures), CostsTab UI R12+ gated, margin card both flows, TCS info line, "Put up for sale" CTA w/ L12 visibility + revoked empty state, add-cost-entry R12+ dialog, SellerSignaturesChecklist final validation, TCS-waived UI with reason (L18).
Acceptance: S-V3-14..18 + E2E.
Risk: GST policy wrong — mitigated by finance-reviewer sign-off + policy chip on margin card.

## 10. Risks + mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Enum drift leaks raw keys back | Compile-time `Missing extends never` guard + CI test that intentionally breaks guard to prove it fires |
| 2 | Cross-store subscription accidentally added | L8 explicitly bans; code-review checklist item; ESLint rule candidate (v2) |
| 3 | GST policy claim challenged | Policy-based language in helper + chip on margin card + CBIC 8/2018 citation |
| 4 | Joint seller signatures missed | Store-action-level throw (not UI-only); S-V3-8 covers |
| 5 | Immutable-after-sale bypass | Store-action throws on linked doc + UI dialog; S-V3-10 covers |
| 6 | Legacy events crash renderer | `renderLegacyFallback` + S-V3-4 test |
| 7 | Stale snapshot in cross-store emit | Pass snapshot by argument to emit helper (trap #2); not via `getState()` inside |
| 8 | TCS on loss sale miscomputed | `tcsApplicable` keys off `salePrice` not `margin`; S-V3-15 covers |
| 9 | Download purpose bypass | Slice-level required field; DOWNLOAD event rejected without purpose for L13 categories |
| 10 | v2 tax-reversal on RETURNED | Documented as v2 open item in §11; v1 records event only, finance reconciles manually |

## 11. Open items (v2 or explicitly deferred)

- `ConsignmentAgreement` entity (addendum §1.5) — v2. V1 uses `DEFAULT_COMMISSION_PCT = 15`.
- SOLD-then-RETURNED tax reversal mechanics (addendum §4.7) — v2. V1 records event only.
- Related-party margin-scheme disallowance (Rule 28 conflation) — v2 via customer flag.
- VAHAN integration for RC transfer auto-sync — v2 per Doc 13 note.
- Background `dropExpiredReservations` timer — v2 if lazy-read proves insufficient.
- Background TTL sweep for DocumentAccessEvent anonymization — v2 (same pattern as ownership sweep).
- ESLint rule banning `customer.phone`/`email`/`addressLine` outside maskedContactFor + ban cross-slice imports — v2.
- Extended commission model (per-agreement override) — v2.

## 12. Component-level translation table coverage (§6 from research addendum)

The `PAYLOAD_KEY_LABELS` map (§2.3) must cover:

**Ownership payload keys**: `claimantCustomerId`, `overlapsOwnershipId`, `category` (rejection reason), `autoMatchHit`, `priorCloseReason`, `isJoint`, `heirCustomerId`, `reason`, `buyerCustomerId`, `consignorCustomerId`, `kmAtOpen`, `kmAtClose`, `closeReason`, `source`, `graceUntilAt`, `jointWithCustomerId`.

**Sales payload keys**: `acquisitionCost`, `kmAtAcquisition`, `listPrice`, `outletId`, `fromPrice`, `toPrice`, `reason`, `dealId`, `depositAmount`, `expiresAt`, `salesOrderId`, `finalPrice`, `flow`, `tcsCollected`, `tcsWaived`, `tcsWaivedReason`, `gstMargin`, `commissionEarned`, `sellerSignatures`, `override.by`, `override.reason`, `override.proofDocIds`, `buyerCustomerId`, `noteForFinance`.

**Document access payload keys**: `category`, `subtype`, `fileName`, `expiresAt`, `before`, `after`, `previousDocId`, `previousVersion`, `newVersion`, `reason`, `blockedByClosedSaleId`, `purpose`, `purposeNote`.

**Enriched title lines for OPEN events** (L20 preserve):
- `OPEN + BN_SALE` → "Sale to {buyerName}"
- `OPEN + BN_CONSIGNMENT` → "Consignment from {consignorName}"
- `OPEN + SERVICE_ONLY_WALKIN` → "Service intake — {customerName}"
- `OPEN + LEGACY_IMPORT` → "Legacy import — {customerName}"
- `OPEN + PENDING_CLAIM` → "Claim pending — {claimantName}"

(Plus existing title enrichments from research §5.)

## 13. Finance-reviewer sign-off gate

Before P4 merges, the `gst-margin.ts` helper + margin card UI must be reviewed by the finance-reviewer agent (per CLAUDE §6). Required checks:
1. MARGIN_SCHEME formula `margin × 18/118` matches CBIC Notif 8/2018 Rule 32(5) — worked example in §2.1
2. CONSIGNMENT_COMMISSION formula `commission × 18/100` (additive) matches Doc 06 service-fee GST treatment (L25)
3. TCS @ 1% strict > ₹10L per IT Act §206C(1F) (L35)
4. Policy claim "no ITC on refurb under margin scheme" is labelled as **BN accounting policy** not settled law (addendum §1.3)
5. TCS waiver flow + reason field (L18) does not create a tax liability bypass

Sign-off blocks the P4 commit; the margin card ships with a "Policy applied" chip citing CBIC notification.

## 14. Changelog

| Date | Change |
|---|---|
| 2026-04-20 | PLAN-VEHICLES-003 drafted. Consolidates addendum + plan-review (Needs Revision → resolved all 5 blockers + 10 concerns + 5 traps + 5 missing ACs + 5 questions into L1–L24). |
| 2026-04-20 | Spec-reviewer Approve-with-Minor-Fixes applied: 3 blockers + 8 concerns + 6 traps + 5 missing ACs + 3 questions all resolved into L25–L41. Commission GST switched from tax-inclusive to additive (L25). DealStage `EXPIRED` replaced by `CANCELLED + cancellationReason` (L26). Portal `supersededBy` renders as boolean only (L27). Runtime Zod payload validators added as §2.5 (L28). Per-kind-per-key translation table (L29). i18n key existence test (L30). `docs-slice` three-way split (L31). Cross-store snapshot via return value (L32). DocumentAccessEventRow separate renderer (L33). P2 ships the full SoCompleteDialog (L34). TCS boundary strict (L35). `commissionPct: 0` explicit nullish (L36). Lazy expiry in useEffect not selector (L37). Override proof-doc FK integrity (L38). `VehicleMaster.listedAt` added in P2 (L39). `actorRole` uses `RoleIdEnum` (L40). §12 titles reference PLAN-002 renderer (L41). Scenarios S-V3-19..24 added. Finance-reviewer sign-off gate added as §13. Status → **approved**. Ready for phased implementation. |
