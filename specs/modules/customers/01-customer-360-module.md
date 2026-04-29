---
spec_id: SPEC-CUSTOMERS-001
domain: customers
status: approved
risk_level: medium
pii_sensitivity: high
flags: [customers-module]
owners: [orchestrator]
depends_on: [SPEC-VEHICLES-001]
---

# Customers — 360° profile module (staff-web)

Evolves `/customers` from a stub into a full CRM surface. Customer 360 page
at `/customers/[id]` composes the Vehicles detail module as a nested tab,
adds interaction/comms/consent history, and provides the manual ownership
assign + revoke staff actions that close the loop from the Vehicles module.

## 1. Scope

- `/customers` — searchable index with filters (city, lifecycle, last interaction, consents)
- `/customers/[id]` — 360° profile: Profile / Vehicles / Interactions / Comms / Consents tabs
- Manual ownership assign (from C360 Vehicles tab → staff can attach an existing or new VIN to the customer)
- Manual revoke (R09+) on any ACTIVE ownership row for the customer
- Audit export (watermarked PDF) of the full customer 360
- DPDP "Right to Erasure" trigger (R19+) — cascades `forceRevoke` across all ACTIVE ownerships

Out of scope (future phases):
- Customer-initiated account deletion flow
- Merge/dedupe duplicate customer records
- Bulk customer import
- CSAT / NPS capture

## 2. Route surface

| Route | Purpose | Components | Gate |
|---|---|---|---|
| `/customers` | Index | `CustomersIndexView`, `CustomersFilters`, `CustomersTable` | R05+ city, R19+ cross-city |
| `/customers/[id]` | 360 profile | `Customer360View` + 5 tabs | R05+ (same city), R19+ cross-city |
| `/customers/[id]/not-found.tsx` | Shell | - | - |

Breadcrumb: `Staff › Customers › {name}`. Breadcrumb links to `/customers` index.

## 3. Tabs overview

| Tab | Purpose | Data source |
|---|---|---|
| **Profile** | Contact, address, ID docs, lifecycle stage, segment | customers fixture |
| **Vehicles** | All VINs this customer has owned (ACTIVE + historical) with inline expand to full Vehicles detail view | vehicles-store `selectVehiclesByCustomer` |
| **Interactions** | Cross-module timeline: test drives, SO, JCs, warranty claims, visits | composition from sales+service stores |
| **Comms** | WhatsApp / SMS / email log with DLT template ids | comms-store (existing) |
| **Consents** | DPDP consent log: purpose, timestamp, captured-by, revoke status | new consent-log fixture |

## 4. Store contract

No new store. `/customers/[id]` page composes reads from:
- `customers-store` (existing) — profile fields
- `vehicles-store` — ownership + VehicleMaster via `selectVehiclesByCustomer(customerId, { includeGrace: true, now })`
- `sales-store` — SOs filtered by `buyerId === customerId`
- `service-store` — JCs filtered by `customerId`
- `comms-store` — messages filtered by `customerId`

**New actions required** in existing stores:

- `customers-store.updateCustomerProfile(id, patch, actor)` — for inline profile edits
- `customers-store.createCustomer(payload, actor)` — Add Customer flow (S-C-13). Idempotent via phone+email match; throws `CustomerAlreadyExistsError` on duplicate. On success emits `CREATE` audit event AND captures DPDP `DATA_PROCESSING` consent into consent-log.
- `customers-store.logAuditExport(customerId, { target: 'C360_PDF' }, actor)` — separate from vehicles ownership events; emits a `CustomerAuditEvent` (kinds: `CREATE`, `PROFILE_UPDATE`, `DOCUMENT_EXPORT`, `ERASURE`, `ASSIGN_VEHICLE`, `CONSENT_WITHDRAWN`).
- `customers-store.logErasure(customerId, actor)` — companion to §5.3
- `customers-store.withdrawConsent(consentId, reason, actor)` — DPDP §6 partial withdrawal (S-C-10, S-C-14). Sets `revokedAt`/`revokedBy`/`revocationReason` on the `ConsentEntry`; emits `CONSENT_WITHDRAWN` audit event. Reason min 4 chars validated at the dialog and re-validated at the store boundary.
- `customers-store.captureConsent(id, consent, actor)` — wired in P3 (was deferred to v2 in earlier draft; now active for the Add Customer flow's DPDP capture).
- **No new actions** in vehicles-store; existing `openOwnership`, `manualRevoke`, `forceRevoke`, `transferOwnership` cover all C360 use cases.

### 4.1 New entity types

`ConsentEntry` (`packages/types/src/domain/customer.ts`):

```ts
ConsentPurpose = 'WHATSAPP_MARKETING' | 'EMAIL_MARKETING' | 'SERVICE_REMINDER' | 'DATA_PROCESSING' | 'INSURANCE_MARKETING';
ConsentSource = 'PORTAL_SIGNUP' | 'STAFF_FORM' | 'IMPORT';

ConsentEntry = {
  id, customerId, purpose, capturedAt (ISO),
  capturedBy (staff id), capturedByName, source,
  revokedAt?, revokedBy?, revokedByName?, revocationReason?
}
```

Fixture: `packages/mocks/src/fixtures/consent-log.ts` — entries for 5 named customers (4 purposes each, mix of active + revoked).

### 4.2 New CustomerSchema fields

| Field | Type | Purpose |
|---|---|---|
| `lifecycleStage` | enum `'PROSPECT' \| 'ACTIVE' \| 'DORMANT' \| 'CHURNED'` (optional) | CRM lifecycle state. Rendered as Profile chip + index filter. |
| `segment` | enum `'STANDARD' \| 'PREMIER' \| 'ULTRA_HNW'` (optional) | Spend tier. Rendered as Profile chip. |
| `aadhaarLast4` | `z.string().length(4).optional()` | Last 4 digits only — Doc 13 §Aadhaar (sub-KUA, never store full). |
| `referredBy` | `z.string().optional()` | Customer-id of referrer OR `'event'`/`'website'`/`'walk-in'`. |
| `referredByName` | `z.string().optional()` | Denormalized referrer name when `referredBy` is a customer-id. |

## 5. Key flows

### 5.1 Manual ownership assign

Purpose: staff attaches a vehicle to a customer without going through the portal claim queue.

Trigger: "Assign Vehicle" button on `/customers/[id]` Vehicles tab.

Flow:
1. Modal `ManualOwnershipAssignDialog` opens
2. VIN search input — normalized via `normalizeVin` — autocomplete against `vehicles-store.vehicles`
3. If VIN not in store → shows "Vehicle not tracked at BN — add via Service intake first" + link
4. If VIN exists → shows existing ACTIVE ownerships (if any) + warning "will replace current owner(s)"
5. Staff enters `kmAtOpen` (required; pre-filled from `lastKnownKm`), source (SERVICE_ONLY_WALKIN / LEGACY_IMPORT), optional notes
6. Confirm → single transaction:
   - If no existing ACTIVE: `openOwnership(...)` (state = ACTIVE)
   - If existing ACTIVE: `transferOwnership({ vin, toCustomerId: customerId, source: 'LEGACY_IMPORT', ... })` closes all current ACTIVE rows + opens new
7. Toast: "Vehicle assigned to {name}"

Role gate: R09+ same outlet; R19+ cross-outlet.

### 5.2 Manual revoke

Trigger: "Revoke" button on each ACTIVE row in the Vehicles tab.

Flow:
1. `AlertDialog` with reason required (min 4 chars)
2. Confirm → `vehicles.manualRevoke(ownershipId, reason, actor)`
3. Grace 7d set automatically
4. Toast: "Ownership revoked — portal access ends {graceUntilAt}"

Role gate: R09+ same outlet; R19+ cross-outlet.

### 5.3 Right to Erasure (DPDP §13)

Trigger: "Right to Erasure" button in Profile tab (R19+ only).

Flow:
1. `AlertDialog` destructive + `requireTypeToConfirm` (type customer email to confirm)
2. On confirm, sequence in single client transaction:
   - For each ACTIVE ownership: `vehicles.forceRevoke(id, 'ERASURE_REQUEST', actor)` — closes + anonymizes immediately
   - Patch customer: `{ name: 'Redacted', email: null, phone: null, pan: null, addressLine: null, ... }`
   - Log event via new `customers.logErasure(id, actor)`
3. Toast: "Customer erased — {N} ownerships force-revoked"

Role gate: R19+ only (GM, CFO, CEO).

### 5.4 Audit export

Trigger: "Export PDF" button in header.

Flow:
1. Client-side HTML template rendered in a hidden iframe
2. Watermark overlay: "Generated for {actor.name} ({actor.role}) on {date}"
3. `window.print()` → user saves as PDF
4. Log via `customers.logAuditExport(id, { target: 'C360_PDF' }, actor)` — emits `CustomerAuditEvent { kind: 'DOCUMENT_EXPORT' }` (NOT on the VIN-scoped ownership event log)

Role gate: R09+ (sensitive data).

## 6. RBAC matrix

| Action | Min rank | Scope |
|---|---|---|
| View `/customers` index | R05 | city |
| View `/customers/[id]` basic profile | R05 | same city |
| View full PII (address, PAN, Aadhaar-last4) | R09 | same city |
| Cross-city customer access | R19 | GM/CFO/CEO |
| Edit profile fields | R09 | same city |
| Manual ownership assign | R09 | same city |
| Manual revoke | R09 | same city |
| Right to Erasure (DPDP §13) | R19 | |
| Audit PDF export | R09 | logged |
| Capture consent on behalf of | R09 | logged (v2 — scaffold only in P2) |

### 6.1 Cross-outlet cascade rule (clarifies reviewer concern 8)

**Customer scope is defined by the customer record's home city**, not per-JC outlet. If a same-city customer (BLR) has JCs performed at another outlet (MUM), an R09 BLR sees those JCs in the Interactions tab (the customer is within their scope; the vehicle's outlet doesn't re-gate). An R05 BLR sees only same-outlet JCs since their view is further restricted. Only `R19+` crosses customer-home-city.

## 7. Component tree + LoC

```
apps/staff-web/src/components/customers/
  customers-index-view.tsx              ≤180
  customers-filters.tsx                 ≤140
  customers-table.tsx                   ≤200
  customer-row-actions.tsx              ≤100
  customer-360-view.tsx                 ≤200 (tab shell, breadcrumb, header, export button)
  # Shared "detail body" extracted from /vehicles/[vin] for drawer reuse:
  # apps/staff-web/src/components/vehicles/detail/vehicle-detail-body.tsx (≤200)
  # Used by both the standalone page and the C360 drawer.
  customer-360-header.tsx               ≤160 (name, avatar, lifecycle chip, outlet, quick stats)
  tabs/customer-profile-tab.tsx         ≤180
  tabs/customer-vehicles-tab.tsx        ≤220
  tabs/customer-interactions-tab.tsx    ≤200
  tabs/customer-comms-tab.tsx           ≤180
  tabs/customer-consents-tab.tsx        ≤180
  vehicles-tab/customer-vehicle-card.tsx      ≤160
  vehicles-tab/customer-vehicle-history-drawer.tsx ≤220 (embeds Vehicles Detail in drawer)
  dialogs/manual-ownership-assign-dialog.tsx   ≤220
  dialogs/manual-revoke-dialog.tsx             ≤140
  dialogs/right-to-erasure-dialog.tsx          ≤180
  dialogs/consent-capture-dialog.tsx           ≤160
```

All files ≤350 LoC; most are tightly sized.

## 8. Fixtures

- Existing `customers` fixture expanded to include: `pan` (masked), `aadhaarLast4`, `consents: ConsentEntry[]`, `lifecycleStage`, `segment`
- New `consent-log.fixtures.ts` — `ConsentEntry[]` for each customer (WhatsApp marketing, email, SMS, service reminders) with captured timestamps + purpose
- New `interactions.fixtures.ts` — derived at runtime from sales/service/comms stores; no separate fixture needed

## 9. Scenarios

- **S-C-1** — Navigate `/customers` → search "arjun" → select → `/customers/cust-arjun-mehta` → Profile tab shows full PII (R24 role)
- **S-C-2** — Vehicles tab → VIN-A card expanded → "View full history" drawer → embedded Vehicles Detail renders with Ownership + Service tabs inline
- **S-C-3** — Manual assign: "Assign Vehicle" → VIN search `VIN-B` → warning "will replace Meera Iyer" → confirm → Meera's ownership closes, Arjun's opens
- **S-C-4** — Revoke: click Revoke on active row → reason required → confirm → row moves to "Revoked · grace 7d" chip
- **S-C-5** — Erasure: R19 on `/customers/cust-rohan-desai` → "Right to Erasure" → type email → confirm → all 4 prior ownerships anonymized, profile fields redacted
- **S-C-6** — Role gate: switch to R05 → "Right to Erasure" button not rendered (Gate hides)
- **S-C-7** — Cross-city: R09 at BLR-01 opens `/customers/cust-karan-shah` (CHE-01) → profile shows but "same city only" banner limits write actions
- **S-C-8** — Audit PDF: export → hidden iframe renders → print dialog opens → event logged
- **S-C-9** — Lifecycle/Segment chips: Profile tab renders `lifecycleStage` chip (PROSPECT/ACTIVE/DORMANT/CHURNED) and `segment` chip (STANDARD/PREMIER/ULTRA_HNW) using existing state-* tokens (no new colors).
- **S-C-10** — Consent log read + revoke: Consents tab renders 4 purpose rows (`WHATSAPP_MARKETING`, `EMAIL_MARKETING`, `SERVICE_REMINDER`, `DATA_PROCESSING`, `INSURANCE_MARKETING`) with active/revoked status + captured-by + source; R09+ "Withdraw" button opens AlertDialog with reason textarea (min 4 chars) → calls `withdrawConsent` → revokedAt/revokedBy/revocationReason set → `CONSENT_WITHDRAWN` audit event emitted. Cross-module sync: when purpose is `WHATSAPP_MARKETING` and customer has insurance opt-out, indicator badge renders.
- **S-C-11** — Aadhaar last-4 row: Profile tab Identity card renders `XXXX-XXXX-{last4}` when `aadhaarLast4` present, masked icon otherwise. R02+ / R23 only per Doc 14.
- **S-C-12** — Inline profile edit: R09+ sees pencil icons on `name`, `email`, `phone`. Click → inline edit field → save calls `updateCustomerProfile` → toast on success. R05 sees read-only grid. PAN/aadhaar/city/language are read-only (identity-immutable per Doc 13).
- **S-C-13** — Add Customer flow: R09+ clicks "Add Customer" on `/customers` index → `NewCustomerDialog` opens with name/phone (+91 E.164)/email/preferredCity/DPDP consent checkbox → on submit calls `createCustomer` (idempotency via phone+email) AND captures `DATA_PROCESSING` consent into consent-log → toast → navigate to `/customers/{id}`. R05 does not see the button.
- **S-C-14** — DPDP partial consent withdrawal: customer logs WhatsApp opt-out via portal → backend writes consent revocation row with purpose `WHATSAPP_MARKETING` → C360 Consents tab reflects revoked state → insurance audience builders exclude customer at next `sendTemplateMessage` boundary (per SPEC-INSURANCE-001 L14).
- **S-C-15** — Referral attribution: Profile tab "Referral source" row renders. If `referredBy` is a customer-id, links to `/customers/{id}` with `referredByName`. If `referredBy` is `'event'` / `'website'` / `'walk-in'`, renders as a plain badge. Index page filter `?referralSource=` narrows the list.
- **S-C-16** — Confidentiality toggle audit: R19 toggles `contactConfidential` on cust-karan-shah → `PROFILE_UPDATE` audit event emitted with field-level diff → audit log shows the change with actor and timestamp.
- **S-Typecheck** — `pnpm -F staff-web typecheck` exits 0

## 10. Acceptance criteria

1. All scenarios S-C-1..8 + S-Typecheck pass
2. File caps enforced
3. No raw `ownership.state` reads in this module — all via `effectiveState` selector
4. `Right to Erasure` triggers `forceRevoke` on every ACTIVE row and redacts profile fields in one staff confirm
5. Audit PDF logs `DOCUMENT_EXPORT` event with actor + timestamp
6. Cross-city PII masked per Doc 14 §2.3

## 11. Open items

1. **Consent capture UX** — consent log is a read-only view in P2; write path (capture consent via dialog) is v2 deferred OR implemented minimally in P2?
2. **Interactions tab ordering** — all events chronological, or grouped by module (Sales / Service / Comms)?

My defaults: #1 read-only in P2 + add `captureConsent` action scaffold for v2. #2 chronological single feed.

## 12. Changelog

| Date | Change |
|------|--------|
| 2026-04-20 | SPEC-CUSTOMERS-001 drafted. Composes SPEC-VEHICLES-001. Status → approved. |
| 2026-04-20 | PLAN-VEHICLES-002 Phase A: added `contactConfidential: boolean` field to `CustomerSchema` (default `false`); added `maskedContactFor(customer, viewerRank): ContactView` helper in `@dms/vehicles-core` — staff below R19 (rank 4) see masked phone/email/address when flag is true. `cust-karan-shah` is the sole demo fixture with `contactConfidential: true`. |
| 2026-04-29 | **v1.1 — C360 enhancements pass.** Added `lifecycleStage`, `segment`, `aadhaarLast4`, `referredBy`, `referredByName` fields to `CustomerSchema` (all optional). New `ConsentEntry` type + `consent-log.ts` fixture. New store actions `createCustomer`, `withdrawConsent`. New audit event kinds `CREATE`, `ASSIGN_VEHICLE`, `CONSENT_WITHDRAWN`. Profile tab gains lifecycle/segment chips + Aadhaar row + inline edit. C360 header gains "Staff › Customers" breadcrumb prefix + lifecycle chip + quick-stats row. Cross-city read-only banner (S-C-7) implemented. `ManualRevokeDialog` now uses Dialog + reason textarea (min 4 chars). `ManualOwnershipAssignDialog` detects existing ACTIVE owner → routes to `transferOwnership`. New scenarios S-C-9 through S-C-16. Real PDF export (`print-c360-pdf.ts`) replaces alert() stub. Consents tab is no longer a stub. |
