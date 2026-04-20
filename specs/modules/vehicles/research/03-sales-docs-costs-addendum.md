# Research Addendum — PLAN-VEHICLES-003

**Status:** Corrections applied after research-reviewer pass (Needs Revision verdict).
**Supersedes:** conflicting claims in the original research report inline in the assistant turn.

This addendum records corrections + answers to research-reviewer findings so the
subsequent `/plan` and `/spec` build on accurate assumptions.

## 1. Tax-law corrections

### 1.1 TCS u/s 206C(1F) — collected by BN, not the buyer's tax
- **BN (seller) collects** TCS @ 1% on motor vehicle sales with gross consideration > ₹10L per PAN per FY.
- BN issues **Form 27D** (TCS certificate) to the buyer.
- BN files **Form 27EQ** quarterly remitting to CBDT.
- Buyer claims credit in their ITR.
- **Triggers on gross sale value**, not on margin. A loss sale with ₹12L gross still triggers TCS.
- **v1 impact:**
  - `SOLD` event payload includes `tcsCollected: number` (the 1% amount).
  - Add new document category `tcs-certificate-27d` to the 5 we already locked → **6 new categories total**.
  - Margin card on Costs tab shows TCS as a separate info line (not subtracted from margin), with tooltip "Collected from buyer; remitted to CBDT".

### 1.2 Form 28 (NOC from originating RTO) for inter-state transfers
- Present only when the vehicle's registration state differs from the buyer's delivery state.
- Required BEFORE Form 29/30 can be filed at the destination RTO.
- **v1 impact:** add a subtype to the `noc` document category rather than introducing a 7th category. Two noc subtypes: `financier-noc` (when car was financed) and `rto-noc` (Form 28 — inter-state transfer). Schema: `Document.subtype: 'financier' | 'rto'` optional field, used only when `category === 'noc'`.

### 1.3 Margin scheme ITC-on-refurb — stated as BN accounting policy
The original research said "no ITC on refurb when margin scheme is chosen for the VIN." This is **BN's conservative accounting policy**, not settled law (CBIC has not cleanly clarified; AARs have split). The spec and any helper fns must state this as **policy**, not as a legal claim.

- `@dms/vehicles-core/gst-margin.ts` helper documents policy basis + cites CBIC notification 8/2018.
- Costs tab margin card shows a small info chip "Margin scheme policy applied" with a tooltip.

### 1.4 Rule 32(5) vs Rule 28 conflation corrected
The original report implied Rule 32(5) has a related-party carve-out. It does not explicitly. The concern is that for related-party transactions, **Rule 28 (valuation between related persons)** takes precedence and margin-scheme election may be challenged. Net effect: margin-scheme is v1-applicable only to arm's-length purchases. BN tracks related-party via customer flag (deferred to v2).

### 1.5 Consignment flow — GST + TDS
- **v1 treatment:** pure agency. BN invoices buyer on behalf of consignor under consignor's GSTIN (or the appropriate principal-to-agent structure). BN's own invoice to the consignor is the **commission** — CGST/SGST if intra-state, IGST if inter-state, 18% GST.
- **TDS u/s 194H @ 5%** — consignor (if required to deduct) withholds 5% on commission paid to BN. Out of scope for v1 display but:
  - `SOLD` event payload carries `flow: 'MARGIN_SCHEME' | 'CONSIGNMENT_COMMISSION'` to disambiguate the margin card behavior.
  - Margin card under CONSIGNMENT_COMMISSION mode shows "Commission earned: ₹X · GST: ₹Y" — no acquisition/refurb/margin display.

### 1.6 TCS on loss sale
Triggers on **gross sale value**, independent of margin sign. `SOLD` event `tcsCollected` computation keys off `finalPrice`, never `margin`.

## 2. Architectural correction — two event streams, shared adapter

The original research §3 recommended merging 7 new sales event kinds into `OwnershipEventKindEnum`. Reviewer rejected this. **Final decision: two streams + shared render adapter.**

### 2.1 New schema
- `OwnershipEventKindEnum` stays as-is (11 kinds, no new entries).
- New `SalesEvent` entity in `packages/types/src/domain/vehicles-aggregate.ts`:

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
```

### 2.2 Retention clocks — three independent timers
- `OwnershipChangeEvent`: 7 yr (Companies Act, existing rule)
- `SalesEvent`: **8 yr** (Income Tax Act §44AA record-keeping for tax-linked events). New anonymize sweep reuses the existing TTL helper pattern, separate threshold const.
- `DocumentAccessEvent`: 7 yr, actor + `purpose` field anonymized after TTL.

### 2.3 Shared render adapter
Location: `@dms/vehicles-core/timeline-adapter.ts` (new file, ≤220 LoC).

```ts
export type TimelineEntry =
  | { kind: 'OWNERSHIP'; event: OwnershipChangeEvent }
  | { kind: 'SALES'; event: SalesEvent };

export function buildVehicleTimeline(
  vin: string,
  ownerships: OwnershipChangeEvent[],
  sales: SalesEvent[],
): TimelineEntry[];

export function renderTimelineEntry(
  entry: TimelineEntry,
  ctx: RenderContext,
): TimelineEntryView;
```

The `RenderContext` carries the customer-name resolver, staff directory, ownership+vehicle lookups. A single render path fixes the raw-key leak once; both streams consume it.

### 2.4 Enum-exhaustiveness guard
Add type-level test:
```ts
type AllKnownKeys = keyof OwnershipEventPayloads | keyof SalesEventPayloads;
type TranslatedKeys = keyof TranslationTable;
type Missing = Exclude<AllKnownKeys, TranslatedKeys>;
// compile-time assertion
const _check: Missing extends never ? true : Missing = true;
```
This catches payload-key drift at build time — no more raw-key leaks.

## 3. DocumentAccessEvent (renamed from DocumentAuditEvent)

Reviewer NIT accepted. "Audit" is overloaded; `DocumentAccessEvent` is sharper.

### 3.1 Schema
```ts
export const DocumentAccessKindEnum = z.enum([
  'UPLOAD',
  'UPDATE',     // metadata edit (expiresAt bumped, category reclassified)
  'REPLACE',    // new version supersedes old (old.supersededBy set)
  'DELETE',     // soft-delete; sets deletedAt
  'DOWNLOAD',
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
  purpose: z.string().optional(), // DPDP §8 — required for DOWNLOAD of PII docs
  payload: z.record(z.unknown()).optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
```

### 3.2 Placement in UI
Reviewer flagged ambiguity: inline per row vs separate section.

**Decision:** separate collapsible "Activity" section at the bottom of the Documents tab (not inline per row). Reason: inline-per-row requires a pop-over for each doc which gets crowded; a single chronological activity feed at the bottom is scannable. Each entry shows: icon + doc name + actor + timestamp + kind-specific detail ("Uploaded · insurance-2026.pdf" / "Replaced v1 → v2 · rc.pdf").

### 3.3 DPDP purpose field
- **Required** for `DOWNLOAD` kind when the document category is PII-heavy: `rc`, `insurance`, `noc`, `form-29-30`, `tcs-certificate-27d`.
- UI prompts a quick picker: "For customer handoff / audit / RTO filing / other".
- Stored on the event payload for 7 yr retention.

## 4. Small corrections + additions

### 4.1 Joint ownership consent on sale
Each joint RC holder must sign Form 29. Spec addition:
- `SOLD` event payload includes `sellerSignatures: string[]` (array of customerIds).
- Validation: must include every `customerId` of ACTIVE/ACTIVE_JOINT rows at sale time.
- Transfer UI (Sales module) collects both signatures before firing the SOLD event.

### 4.2 Stale-listing chip — v1
Already tracked via `Vehicle.listedAt` → days-on-lot. Include the chip in v1 (derived — no new state). Thresholds: `>90 days` = amber "Stale", `>180 days` = red "Very stale".

### 4.3 Revoked walk-in Costs tab empty state
When a walk-in VIN's last owner has self-revoked (sold privately) and there's no ACTIVE non-dealer ownership, the Costs tab shows: **"Last known owner sold privately. Contact BN to reacquire."** + disabled "Put up for sale" CTA. Avoids a silently-broken page.

### 4.4 R12+ gate semantics
**Locked definition:** `hasRank(viewer.role, 'R12')` where `hasRank` does `ROLE_RANK[actorRole] >= ROLE_RANK[minRole]`. Gives {R12, R13, R19, R22, R24}. Used everywhere in the spec without ambiguity.

### 4.5 Immutable-after-sale documents
Documents referenced on a closed sale (`SalesOrderStatus === 'SOLD'` with `supportingDocIds: string[]`) cannot be deleted, only superseded. DocumentAccessEvent `DELETE` action checks this and blocks with a toast "Linked to closed sale SO-2024-0123 — cannot delete. Upload a replacement to supersede."

### 4.6 RESERVED timeout without explicit RESERVATION_LOST
Reservation TTL (`Deal.reservation.expiresAt`) lapses silently today. v1 adds a tiny sweep in sales-store (`dropExpiredReservations(now)` — same pattern as anonymization sweep) that emits `RESERVATION_LOST` events for lapsed reservations. Keeps event log complete.

### 4.7 SOLD-then-RETURNED across FY
Tax reversal mechanics are **v2 scope**. v1 just records the RETURNED event; any TCS/GST adjustment is documented in event notes for finance to reconcile manually. Flag in spec §13 open items.

## 5. Renderer translation table — completeness checklist

The translation table in original research §5 missed:
- `priorCloseReason` (RESTORE events)
- `isJoint: boolean` (OPEN payloads)
- `kmAtAcquisition`, `listPrice`, `fromPrice`, `toPrice`, `depositAmount`, `finalPrice`, `tcsCollected`, `gstMargin`, `commissionEarned`, `sellerSignatures`, `dealId`, `salesOrderId`, `flow` (sales event payloads)
- `subtype` (NOC document flag)
- `purpose` (DocumentAccessEvent download)

Spec §5 must enumerate every payload key across Ownership + Sales + DocumentAccess events and assign a human label. The compile-time `Missing extends never` assertion guards against drift.

## 6. Re-answers to reviewer questions

1. **TCS direction verified** — seller (BN) collects per 206C(1F); Form 27D to buyer; Form 27EQ to CBDT.
2. **Margin scheme scope** — VIN-scoped (once elected for a VIN, refurb ITC locked out by BN accounting policy for that VIN).
3. **Consignment model** — pure agency for v1 (commission-earning; no margin scheme on consigned VINs).
4. **R12+ semantics** — numeric `ROLE_RANK[x] >= ROLE_RANK.R12` (locked §4.4).
5. **Finance ledger** — no existing TCS/TDS ledger. SOLD event payload stores the amounts; formal GL posting wires when finance module builds out. v1 is display-only.

## 7. Delta summary — what /plan must reflect

- 6 new doc categories (not 5): add `tcs-certificate-27d`.
- NOC has `subtype: 'financier' | 'rto'` optional field.
- Two event streams (Ownership + Sales), not one merged enum.
- `@dms/vehicles-core/timeline-adapter.ts` new file for shared render adapter.
- `@dms/vehicles-core/gst-margin.ts` new pure helper with `flow: 'MARGIN_SCHEME' | 'CONSIGNMENT_COMMISSION'` branching.
- `DocumentAccessEvent` (renamed), DPDP `purpose` field, placed in bottom "Activity" section.
- Compile-time enum-exhaustiveness test for translation table.
- Three retention clocks: 7/8/7 yr.
- Stale-listing chip in v1.
- Joint-owner seller signatures on SOLD event.
- Immutable-after-sale docs (delete blocked; replace only).
- `dropExpiredReservations` sweep for RESERVED → RESERVATION_LOST auto-emit.
- R12+ = numeric rank comparator (no role-name ambiguity).

## Changelog

| Date | Change |
|---|---|
| 2026-04-20 | Addendum written after research-reviewer Needs-Revision pass. 4 blockers + 8 concerns + 5 factual errors + 5 missing edges + 2 architectural reversals all resolved. Ready for /plan. |
