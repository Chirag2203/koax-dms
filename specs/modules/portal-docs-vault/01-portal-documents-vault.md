---
spec_id: SPEC-PORTAL-DOCS-001
title: Customer Portal — Documents Vault
domain: portal
status: approved
version: "1.0"
risk_level: medium
pii_sensitivity: medium
flags: [portal-docs-vault]
owners: [orchestrator]
created: 2026-04-30
depends_on:
  - SPEC-CUSTOMER-PORTAL-001
  - PLAN-VEHICLES-003
related_specs:
  - SPEC-ARCH-UI-001
---

# SPEC-PORTAL-DOCS-001 — Customer Portal Documents Vault

## Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L1 | **Document entity boundary** | The portal Documents Vault consumes the shared `Document` type from `@dms/types` (portal.ts). It does NOT import `StaffDocumentMetadata` or read from staff-web's vehicles-store directly. Staff-only fields (version, supportingSalesOrderId, deletedAt) are never surfaced to customer-web. | PLAN-VEHICLES-003 §1.3, L9 |
| L2 | **`DocumentAccessEvent` on every download** | Every customer-initiated download MUST emit a `DocumentAccessEvent` with `kind: 'DOWNLOAD'` and a `purpose` field. The purpose is collected via a prompt dialog before the download begins. If the user dismisses without choosing, the download is cancelled. No silent downloads. | PLAN-VEHICLES-003 L3, addendum §3, DPDP Act 2023 |
| L3 | **Purpose prompt categories** | Portal download prompt presents these purpose options: `CUSTOMER_HANDOFF` ("Personal use / sharing"), `RTO_FILING` ("RTO/Government filing"), `AUDIT` ("Audit or legal"), `OTHER` ("Other"). These are the 4 valid `DownloadPurpose` enum values from `@dms/types`. | PLAN-VEHICLES-003 §L13, documents.ts |
| L4 | **Expiry chip thresholds** | Amber chip when `daysUntil(expiresAt) <= 30` (not 60 — tightened from existing doc-card). Red chip when expired (`daysUntil < 0`). Categories that trigger expiry chips: `insurance`, `puc`. Other types (rc, warranty, invoice, purchase-agreement) do not get expiry chips. | Theme C brief |
| L5 | **Group by vehicle (VIN section)** | Documents are always grouped by `vehicleVin`. Each group shows: vehicle name as section header, VIN badge. Within each group, documents are sorted: expiring/expired first, then by `uploadedAt` desc. | Theme C brief |
| L6 | **`uploadedBy` field** | The portal `Document` entity is extended with an optional `uploadedBy: string` field (display name of staff member who uploaded, e.g. "BN Automobiles – Bangalore"). This is NOT PII — it is an outlet/team attribution, not a staff ID or personal name. | DPDP Act 2023 §purpose-limitation; Doc 03 §CX trust signals |
| L7 | **Adapter layer — `portal-docs-adapter.ts`** | All data wiring from the mock fixture to the vault view goes through `portal-docs-adapter.ts`. This file is the single boundary; it applies: filtering superseded docs, grouping by VIN, sorting with expiry-first priority, category/status filter application. | Doc 07 §adapter-pattern |
| L8 | **No new deps** | No new npm packages introduced. Dialog uses the existing `Dialog` primitive pattern (plain React state + portal-style overlay) already present in the portal codebase. | CLAUDE.md §12 |
| L9 | **Category enum extended** | The portal Document `type` enum is extended with: `'sale-agreement'`, `'custom-build-quote'` (customer-visible counterparts to staff StaffDocumentCategory). These are added to `DocumentSchema` in `@dms/types`. | Theme C brief: "invoices, custom-build-quotes, sale-agreement" |
| L10 | **Search is client-side** | The search input filters by `doc.name` (case-insensitive substring match) entirely on the client. No server round-trip. The vault is a bounded collection per user (≤ ~50 docs). | Doc 12 §perf — small bounded sets |

---

## 1. Domain model

### 1.1 Document (portal)

```ts
// @dms/types domain/portal.ts (extended per L6, L9)
type Document = {
  id: string;
  vehicleVin: string;
  vehicleName: string;
  type:
    | 'rc' | 'insurance' | 'puc' | 'warranty'
    | 'invoice' | 'service-record' | 'purchase-agreement'
    | 'inspection-report' | 'sale-agreement' | 'custom-build-quote';  // L9
  name: string;
  uploadedAt: string; // ISO
  expiresAt?: string; // ISO date (insurance, puc)
  fileUrl: string;
  fileSize: string;
  uploadedBy?: string;     // L6: display name, not staff id
  supersededBy?: string;   // staff-side replacement id → isReplaced in view
};
```

### 1.2 Portal vault view model

The adapter converts `Document` → `VaultDocumentView`:

```ts
interface VaultDocumentView {
  id: string;
  vehicleVin: string;
  vehicleName: string;
  type: Document['type'];
  name: string;
  uploadedAt: string;
  expiresAt?: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy?: string;
  isReplaced: boolean;       // L27 from PLAN-VEHICLES-003
  expiryStatus: 'active' | 'expiring-soon' | 'expired';  // derived (L4)
  daysUntilExpiry?: number;  // only when expiryStatus !== 'active'
}

interface VaultVehicleGroup {
  vin: string;
  vehicleName: string;
  docs: VaultDocumentView[];
  hasExpiry: boolean;  // true if any doc in group is expiring/expired
}
```

### 1.3 DocumentAccessEvent (download)

Emitted on every download (L2):

```ts
// kind: 'DOWNLOAD'
// payload: { purpose: DownloadPurpose, purposeNote?: string }
```

---

## 2. UI surface

### 2.1 Layout (`/documents`)

```
┌─ Header ────────────────────────────────────────────────────────────────┐
│  CUSTOMER PORTAL eyebrow                                                │
│  Document Vault  <h1>                                                   │
│  Subtitle                                                               │
│  ─────────────────────────── hairline ─────────────────────────────── │
└─────────────────────────────────────────────────────────────────────────┘
┌─ Controls bar ──────────────────────────────────────────────────────────┐
│  [Search by document name...]   [Category ▼]  [Status ▼]              │
└─────────────────────────────────────────────────────────────────────────┘
┌─ Vehicle Section (per VIN) ─────────────────────────────────────────────┐
│  VEHICLE NAME                      VIN BADGE                           │
│  ─────────────────────────────────────────────────────────────────────│
│  ┌─ Doc Row ──────────────────────────────────────────────────────────┐│
│  │ [icon]  Name of doc                          [EXPIRY CHIP]  [↓]   ││
│  │         TYPE · Uploaded by · Date · Size                          ││
│  └────────────────────────────────────────────────────────────────────┘│
│  ┌─ Doc Row ──────────────────────────────────────────────────────────┐│
│  │ ...                                                                 ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Purpose prompt dialog (L2, L3)

Shown when a user clicks the download button:

```
┌─ DPDP Purpose Prompt ───────────────────────────────────────────────────┐
│  DOWNLOAD: <doc name>                                                   │
│                                                                         │
│  Please select the purpose for downloading this document.               │
│  This information is recorded per the Digital Personal Data             │
│  Protection Act, 2023.                                                  │
│                                                                         │
│  ○ Personal use / sharing                                               │
│  ○ RTO / Government filing                                              │
│  ○ Audit or legal                                                       │
│  ○ Other                                                                │
│    [Optional: describe purpose ________________]                        │
│                                                                         │
│  [Cancel]  [Confirm & Download]                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Empty + filter-empty states

- **No documents**: Editorial empty state with illustration-style icon.
- **No results for filter/search**: "No documents match your filters. Clear filters to see all."

---

## 3. Store contract (portal)

The Documents Vault is **read-only** from the portal side. No mutations. Write operations (upload, replace) are staff-side only.

The `DocumentAccessEvent` for DOWNLOAD is written to a local event log via a Zustand store (or lightweight append-only list) in `portal-docs-adapter.ts`. In v1 (mock phase), this log is in-memory only (no persistence) — consistent with how the staff-side store handles events pre-backend.

---

## 4. Scenarios

### S-PD-01 — Happy path: view + search
**Given** a logged-in customer with 3 owned vehicles and 5 docs per vehicle
**When** they navigate to `/documents`
**Then** they see 3 sections (one per VIN), each with documents listed
**And** the header shows "Document Vault" with subtitle
**And** the search box is empty

### S-PD-02 — Search filters by name
**Given** the vault is open with 15 documents
**When** the user types "insurance" in the search box
**Then** only documents with "insurance" in their name are shown
**And** vehicles with no matching docs are hidden

### S-PD-03 — Category filter
**Given** the vault is open
**When** the user selects "RC" from the category dropdown
**Then** only documents of type `rc` are shown

### S-PD-04 — Status filter (expired)
**Given** at least one expired document exists
**When** the user selects "Expired" from the status dropdown
**Then** only expired documents are shown

### S-PD-05 — Expiry chip (amber, ≤30d)
**Given** a PUC document expiring in 15 days
**When** the vault renders
**Then** an amber "Expires in 15 days" chip appears on that row
**And** the doc is sorted to the top of its vehicle group

### S-PD-06 — Expiry chip (red, expired)
**Given** an insurance document expired 10 days ago
**When** the vault renders
**Then** a red "Expired" chip appears on that row

### S-PD-07 — Download triggers purpose prompt
**Given** the user clicks the download button on any document
**When** the purpose dialog opens
**Then** they see 4 radio options (Personal use, RTO filing, Audit, Other)
**And** "Other" reveals an optional text field
**And** the download does NOT start until they confirm

### S-PD-08 — Download emits DocumentAccessEvent
**Given** the user confirms purpose "RTO Filing"
**When** the download link fires
**Then** a DocumentAccessEvent with kind='DOWNLOAD', purpose='RTO_FILING' is appended to the event log
**And** the file download triggers

### S-PD-09 — Cancel purpose prompt
**Given** the purpose dialog is open
**When** the user clicks "Cancel"
**Then** the dialog closes, no download occurs, no event is emitted

### S-PD-10 — Empty state
**Given** a customer with no documents
**When** they navigate to `/documents`
**Then** they see the editorial empty state
**And** no vehicle sections render

### S-PD-11 — Filter empty state
**Given** documents exist but none match the active filter
**When** "Status: Expired" is selected but all docs are active
**Then** they see "No documents match your filters" with a clear-filters CTA

### S-PD-12 — Superseded document hidden
**Given** a document with `supersededBy` set
**When** the vault renders
**Then** the superseded document is NOT shown (only the active version appears)

---

## 5. Acceptance criteria

- [ ] AC-1: Page renders grouped by VIN with vehicle name headers
- [ ] AC-2: Search filters document name case-insensitively; empty vehicles hidden
- [ ] AC-3: Category dropdown filters by document type
- [ ] AC-4: Status dropdown filters by `active` / `expiring-soon` / `expired`
- [ ] AC-5: Amber chip for ≤30d expiry; red chip for expired (L4)
- [ ] AC-6: Expiring/expired docs sort first within their vehicle group
- [ ] AC-7: Download button opens purpose prompt; download doesn't start without selection
- [ ] AC-8: Confirmed download emits a `DocumentAccessEvent` with correct kind + purpose
- [ ] AC-9: Superseded docs hidden from portal view (L1)
- [ ] AC-10: `uploadedBy` shown on doc row when present (L6)
- [ ] AC-11: Empty state shown when no docs; filter-empty state when filtered to zero
- [ ] AC-12: Fully i18n'd (all strings in `messages/en-IN.json` + `messages/hi-IN.json`)

---

## 6. File inventory

| File | Status | Notes |
|---|---|---|
| `specs/modules/portal-docs-vault/01-portal-documents-vault.md` | new | This spec |
| `packages/types/src/domain/portal.ts` | modify | Add `uploadedBy?`, `sale-agreement`, `custom-build-quote` to Document type |
| `packages/mocks/src/fixtures/portal.ts` | modify | Add `uploadedBy` to existing documents + add sale-agreement / custom-build-quote examples |
| `apps/customer-web/src/lib/portal/portal-docs-adapter.ts` | new | Adapter: group, sort, filter, derive expiry status; DocumentAccessEvent emitter |
| `apps/customer-web/src/components/portal/documents/expiry-chip.tsx` | new | Expiry chip component (amber/red) |
| `apps/customer-web/src/components/portal/documents/purpose-prompt-dialog.tsx` | new | DPDP purpose prompt dialog |
| `apps/customer-web/src/components/portal/documents/vault-doc-card.tsx` | new | Full vault row (replaces basic DocumentCard) |
| `apps/customer-web/src/components/portal/documents/vault-vehicle-section.tsx` | new | Per-VIN section header + doc list |
| `apps/customer-web/src/components/portal/documents/vault-controls.tsx` | new | Search + Category + Status filters |
| `apps/customer-web/src/components/portal/documents/index.ts` | modify | Re-export new components |
| `apps/customer-web/app/(portal)/documents/page.tsx` | replace | Full vault page |
| `apps/customer-web/messages/en-IN.json` | modify | Extend `portal.documents` keys |
| `apps/customer-web/messages/hi-IN.json` | modify | Extend `portal.documents` keys |
| `apps/customer-web/src/lib/portal/__tests__/portal-docs-adapter.test.ts` | new | ≥10 unit tests |

---

## 7. Open items

None — all decisions locked above.

---

## Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-30 | 1.0 | orchestrator | Initial approved spec for SPEC-PORTAL-DOCS-001 |
