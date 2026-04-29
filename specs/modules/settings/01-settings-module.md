---
spec_id: SPEC-SETTINGS-001
title: Settings Module — Outlet Config, RBAC Matrix, Integrations, Feature Flags, Audit
domain: settings
status: approved
version: "1.0"
risk_level: medium
pii_sensitivity: medium
flags: [settings-module]
owners: [orchestrator]
depends_on: [SPEC-STAFF-001, SPEC-ARCH-UI-001]
created: 2026-04-29
last_updated: 2026-04-29
research_refs: [Doc 06 §5, Doc 13 §§1-15, Doc 14 §§1-31]
---

# SPEC-SETTINGS-001 · Settings Module

> **Canonical docs cited:** Doc 06 §5 (state-wise GSTINs), Doc 13 (Integration Contracts Index),
> Doc 14 (Role / Permission Matrix 24-role grid). UI primitives per SPEC-ARCH-UI-001.

---

## 0. Locked Decisions

| # | Title | Decision | Source |
|---|---|---|---|
| L1 | **3 outlets are fixed in v1** | BLR, MUM, CHE are the only outlets. Adding a 4th outlet requires a v2 migration because the outlet code is embedded in fixture VINs, RLS predicates, GSTIN configs, sales store outlet filters, and staff assignments. The UI must not present a "Create Outlet" affordance. The constraint is architectural, not a placeholder. | Doc 06 §5; existing fixtures |
| L2 | **GSTIN is mandatory per outlet and regex-validated** | Each outlet's GSTIN is required. Validation uses the canonical regex shared with `parts/05-p4-1-enhancements-phase.md`: `^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$`. Save is blocked on format mismatch. | Doc 06 §5; parts spec L-tag precedent |
| L3 | **Manager assignment is referential to staff-store** | `managerId` on an outlet must resolve to a `StaffProfile` record from `staff-store.ts` whose `role` is R03 or above (hasRank R03+) AND whose `outlet` matches the outlet being edited. The UI populates the manager dropdown from the staff store filtered to the outlet. | SPEC-STAFF-001; Doc 14 §20 |
| L4 | **RBAC matrix view is READ-ONLY in v1** | The 24-role × N-action grid (sourced from Doc 14 §§4-26) is displayed but not editable. RBAC edits require a multi-step change-control process (Doc 14 §31) that is v2 work. The view provides sort, filter by domain, and row export — but no inline cell editing. | Doc 14 §31 |
| L5 | **Integration credentials are mocked in v1** | Real credentials live in environment variables / vault per Doc 13. The Settings UI shows masked secret values (last 4 chars visible, rest asterisked), `lastUsedAt` timestamp, `status` badge, and a "Test Connection" stub. The stub always returns "OK — mocked" after an 800ms simulated delay. Real credential management is per-outlet rollout work (v1.5). | Doc 13 §§1-15; Doc 13 §16 sign-off matrix |
| L6 | **Feature flags surface but toggle is in-memory only in v1** | Flags are read from the registry at `apps/staff-web/src/lib/feature-flags/registry.ts` (this file is canonicalised by this spec — create it if absent). v1 reads the registry as the source of truth; in-memory toggle (R02+ only) changes the runtime value for the session. Persistence to durable config is v1.1. | Doc 14 §23 (R01 configures flags) |
| L7 | **Settings audit log is required** | Every mutation to outlet config, integration credential, or feature flag produces a `SettingsAuditEvent` entry with before/after diff. Audit log is readable by R12+. The log retains 3 years. No customer PII appears in settings at any point. | Doc 06 §17; Doc 14 §22 |
| L8 | **Office contact fields only; no personal PII** | `contactPhone` and `contactEmail` on `OutletConfig` are office/reception numbers — not personal phone/email of any individual. Copy must make this explicit. These fields carry no DPDP obligations. | DPDP Act 2023; Doc 06 §19 |
| L9 | **Outlet deactivation via `active: false` (soft delete)** | Deactivating an outlet does not delete any data. Staff assigned to the outlet are read-only; new service bookings, sales orders, and custom-build jobs are blocked at their respective module's state machine with an explicit "outlet inactive" error. This enforcement is out-of-scope for the Settings spec but the contract must be documented as a cross-module wiring seam. | Doc 14 §28 sensitive actions list |
| L10 | **Outlet `code` is immutable after creation** | The code values `'BLR'`, `'MUM'`, `'CHE'` are frozen. They are referenced in fixture VINs, URL segments, staff assignments, and sales store outlet filters. The edit form must not render the `code` field as editable; it is display-only. | L1 (3-outlet constraint) |
| L11 | **Connection test stub** | Clicking "Test Connection" on any integration credential fires a 800ms `setTimeout` then resolves with `{ ok: true, message: 'OK — mocked', testedAt: <ISO> }`. The result is shown in a toast and logged to `SettingsAuditEvent` with `kind: 'integration-test'`. Real probes wire in v1.5. | Doc 13 §15 Error & Retry Playbook |
| L12 | **Feature-flag registry is canonical** | The registry file at `apps/staff-web/src/lib/feature-flags/registry.ts` is the single source of truth for all flags. Each entry: `key`, `defaultValue`, `description`, `owningSpec`, `scope: 'global' | 'outlet'`. The `flags:` frontmatter field in every spec must correspond 1:1 with a registry entry. The Settings feature-flags route reads exclusively from this registry. | CLAUDE.md §6 flags-validation rule |
| L13 | **RBAC matrix is grouped by domain and paginated** | 24 roles × ~30 domain actions = ~720 cells. Actions are grouped by domain: `vehicles / sales / service / parts / finance / customers / staff / marketing / settings / platform`. Sticky column headers (role codes) and sticky row headers (action names) are required. An action search box filters rows client-side. Export to CSV is available for R12+. | Doc 14 §§4-26 |
| L14 | **Audit log retains 3 years** | Settings audit events are retained for 3 years from creation. No customer PII is in scope, so DPDP anonymization rules do not apply. R12+ can view the full log; export is watermarked. | Doc 06 §17 (7yr for financial records, 3yr for operational config sufficient) |
| L15 | **Settings hub gated at R12+ minimum; R10 and below see no nav link** | The sidebar navigation entry for Settings is hidden for roles below R12. Accessing the URL directly redirects to `/dashboard` with a "not found" treatment for sub-R12 roles. This uses the existing `Gate` primitive from SPEC-ARCH-UI-001. | Doc 14 §14 (R12 = Parts Manager — first role with explicit org configuration capability) |
| L16 | **Integration disconnect is a destructive action requiring type-to-confirm** | Disconnecting any integration credential (not just test) shows a confirmation dialog requiring the operator to type `DISCONNECT` before the action proceeds. The confirmation copy states the active module dependencies (e.g., "WhatsApp BSP is used by Insurance marketing, Service bookings"). This matches the pattern for force-revoke in SPEC-STAFF-001. | Doc 14 §28 sensitive-action inventory; SPEC-ARCH-UI-001 confirmation dialog pattern |
| L17 | **RBAC matrix source is Doc 14 §§4–26** | The matrix rows are sourced from the 24 per-role capability tables in Doc 14. The spec-time row count per domain is: customer/storefront ~15 actions, sales ~14, service ~10, parts ~7, finance ~12, marketing ~7, staff ~8, platform/settings ~6. Total ~79 named capabilities. Counts are indicative; the runtime registry enumerates them. | Doc 14 §§4-26 |

---

## 1. Goal

A configuration surface for everything that is not business data — outlet master, RBAC permission matrix (read-only in v1), integration credentials (mocked), and feature flags. Today these are scattered across fixtures, code constants, and spec frontmatter. Centralising them into a single surface prevents drift, gives operators a visible knob to turn, and provides the audit trail needed for change-control compliance.

This module addresses the gap noted in Theme A of `specs/roadmap/next-themes.md`: "Settings — outlet config (BLR/MUM/CHE addresses, GSTINs, manager assignments), RBAC permissions UI (read-only matrix per Doc 14 in v1, edits in v2), integration credentials (mocked in v1), feature flags surface (currently scattered)."

The existing stub at `apps/staff-web/app/(shell)/settings/page.tsx` renders "Coming soon" and nothing else. This spec replaces that stub with a complete, production-grade configuration surface.

---

## 2. Routes

| Route | Purpose | Minimum role | Edit capability |
|---|---|---|---|
| `/settings` | Hub — section navigation card grid | R12 | — |
| `/settings/outlets` | Outlet list (BLR, MUM, CHE) — name, address, GSTIN, manager, contact | R12 read | R02 edit |
| `/settings/outlets/[id]` | Outlet detail — full config + edit form | R12 read | R02 edit |
| `/settings/rbac` | Read-only RBAC matrix (24 roles × ~79 actions per Doc 14 §§4-26) | R12 | none (v1) |
| `/settings/integrations` | Integration credentials overview — status badges, last-used | R22 | R22 disconnect |
| `/settings/integrations/[provider]` | Per-provider detail — masked secret, connection test, history | R22 | R22 manage |
| `/settings/feature-flags` | Feature flag registry — key, value, owning spec, scope | R12 read | R02 toggle |
| `/settings/audit` | Settings change audit log — all config mutations with before/after diff | R12 | — |

**Access hierarchy notes (Doc 14):**
- R12 (Parts Manager) is the floor for the hub (L15). All roles R12 and above can view the hub and most read-only sections.
- R22 (Auditor) has read access to all financial records; integration credential visibility requires this role because credentials may expose financial integration (IRP e-invoicing, Razorpay per Doc 13 §§1,3). R02 (Org Admin) can also access integrations per Doc 14 §22.
- R02 (Org Admin) is the minimum for all edit operations (outlet config, feature-flag toggle, integration management) per Doc 14 §22: "Configure org-wide settings."
- R01 (Super Admin) can do everything per Doc 14 §23.

---

## 3. Domain Model

All types live in `packages/types/src/domain/settings.ts`.

### 3.1 OutletConfig

```ts
OutletConfig {
  id:            string              // 'outlet-blr' | 'outlet-mum' | 'outlet-che'
  code:          'BLR' | 'MUM' | 'CHE'   // L10: immutable
  name:          string              // 'BN Automobiles Bangalore'
  address: {
    line1:       string
    line2?:      string
    city:        string
    state:       string              // 'Karnataka' | 'Maharashtra' | 'Tamil Nadu'
    pin:         string              // 6-digit Indian PIN
  }
  gstin:         string              // L2: validated, mandatory
  managerId:     string              // L3: resolves to StaffProfile.id, role R03+
  contactPhone:  string              // L8: office number
  contactEmail:  string              // L8: office email
  active:        boolean             // L9: soft deactivation
  createdAt:     string              // ISO 8601
  updatedAt:     string              // ISO 8601
}
```

### 3.2 IntegrationProvider

```ts
IntegrationProvider =
  | 'whatsapp_bsp'
  | 'dlt_sms'
  | 'irp_einvoicing'
  | 'aadhaar_sub_kua'
  | 'razorpay'
  | 'tally_prime'
```

Each corresponds to a Doc 13 sheet: WhatsApp BSP (§2), DLT SMS (§10), IRP/GSP (§3), Aadhaar sub-KUA (§5), Razorpay (§1), Tally Prime (§11).

### 3.3 IntegrationCredential

```ts
IntegrationCredential {
  provider:              IntegrationProvider
  status:                'connected' | 'disconnected' | 'error'
  secretMasked:          string              // e.g. '••••••••••••K4F2'
  endpoint?:             string              // BSP base URL or GSP URL (masked)
  lastUsedAt?:           string              // ISO 8601
  connectionTestedAt?:   string              // ISO 8601
  connectionTestResult?: {
    ok:      boolean
    message: string
    testedAt: string
  }
  connectedAt?:          string              // ISO 8601
  disconnectedAt?:       string              // ISO 8601
}
```

### 3.4 FeatureFlag

```ts
FeatureFlag {
  key:          string        // e.g. 'feat_insurance_ai_calling'
  value:        boolean | string
  defaultValue: boolean | string
  description:  string
  owningSpec:   string        // e.g. 'SPEC-INSURANCE-001'
  scope:        'global' | 'outlet'
  updatedAt:    string        // ISO 8601
  updatedBy:    string        // StaffProfile.id or 'system'
}
```

### 3.5 SettingsAuditEvent

```ts
SettingsAuditEventKind =
  | 'outlet-edit'
  | 'outlet-deactivated'
  | 'outlet-reactivated'
  | 'integration-connected'
  | 'integration-disconnected'
  | 'integration-test'
  | 'feature-flag-toggled'
  | 'rbac-matrix-viewed'
  | 'rbac-matrix-exported'

SettingsAuditEvent {
  id:        string
  kind:      SettingsAuditEventKind
  at:        string              // ISO 8601
  actorId:   string              // StaffProfile.id
  actorRole: string              // role code at time of action
  subject:   string              // outlet id, provider, or flag key
  before?:   Record<string, unknown>
  after?:    Record<string, unknown>
  note?:     string
}
```

---

## 4. Settings Store Contract

Store location: `apps/staff-web/src/lib/settings/settings-store.ts`

**State:**
```ts
SettingsState {
  outlets:      Record<string, OutletConfig>
  credentials:  Record<IntegrationProvider, IntegrationCredential>
  flags:        Record<string, FeatureFlag>
  auditLog:     SettingsAuditEvent[]
}
```

**Actions:**
```ts
// Outlet
updateOutlet(id: string, patch: Partial<OutletConfig>, actor: StoreActor): void
  // Validates GSTIN regex (L2), managerId referential integrity (L3)
  // Emits 'outlet-edit' audit event with before/after diff (L7)

deactivateOutlet(id: string, actor: StoreActor): void
  // L9: sets active: false; emits 'outlet-deactivated'
  // Blocks if actor role < R02 (throws OutletEditDeniedError)

reactivateOutlet(id: string, actor: StoreActor): void
  // Sets active: true; emits 'outlet-reactivated'

// Integration
testConnection(provider: IntegrationProvider, actor: StoreActor): Promise<{ ok: boolean; message: string }>
  // L11: 800ms stub; emits 'integration-test' audit event

disconnectIntegration(provider: IntegrationProvider, actor: StoreActor): void
  // L16: requires prior type-to-confirm in UI; emits 'integration-disconnected'

// Feature flags
toggleFlag(key: string, value: boolean | string, actor: StoreActor): void
  // L6: in-memory only; R02+ only; emits 'feature-flag-toggled'

// Audit
getAuditLog(filters?: { kind?: SettingsAuditEventKind; from?: string; to?: string }): SettingsAuditEvent[]
```

---

## 5. Feature Flags Registry

File canonical location: `apps/staff-web/src/lib/feature-flags/registry.ts`

This file is established by this spec. It must be present before implementation begins. Every `flags:` frontmatter entry across all module specs maps 1:1 to an entry here.

**Shape of each entry:**

```ts
FeatureFlagRegistryEntry {
  key:          string
  defaultValue: boolean | string
  description:  string
  owningSpec:   string
  scope:        'global' | 'outlet'
}
```

**Known flags as of 2026-04-29 (sourced from spec frontmatter scan):**

| Key | Default | Owning spec | Description |
|---|---|---|---|
| `consignor-portal.v1` | `true` | SPEC-CONSIGNOR-001 | Consignor portal v1 routes |
| `custom-builds` | `true` | SPEC-CUSTOM-BUILDS-001 | Custom builds module |
| `visualizer-2d` | `false` | SPEC-CUSTOM-BUILDS-001 | 2D visualizer (superseded by 3D) |
| `visualizer-3d` | `true` | SPEC-CUSTOM-BUILDS-001 | 3D visualizer |
| `customer-portal.v1` | `true` | SPEC-CUSTOMER-PORTAL-001 | Customer portal v1 |
| `customer-service-booking` | `true` | SPEC-CUSTOMER-PORTAL-002 | Customer-side service booking |
| `customers-module` | `true` | SPEC-CUSTOMERS-001 | Customer 360 module |
| `insurance-module` | `true` | SPEC-INSURANCE-001 | Insurance leads + quotes |
| `whatsapp-marketing` | `false` | SPEC-INSURANCE-001 | WhatsApp marketing campaigns |
| `ai-calling` | `false` | SPEC-INSURANCE-001 | AI calling infrastructure |
| `feat_insurance_ai_calling` | `false` | SPEC-INSURANCE-001 | Insurance AI calling dispatch |
| `staff.inventory.v1` | `true` | SPEC-INVENTORY-001 | Staff inventory module |
| `parts-module` | `true` | SPEC-PARTS-001 | Parts module |
| `service-integration` | `true` | SPEC-PARTS-001 | Service-parts cross-module seam |
| `staff.shell.v1` | `true` | SPEC-PLATFORM-001 | Staff app shell |
| `staff.dashboard.v1` | `true` | SPEC-PLATFORM-001 | Staff dashboard |
| `portal-vehicles` | `true` | SPEC-PORTAL-VEHICLES-001 | Portal vehicle ownership flow |
| `staff.sales.v1` | `true` | SPEC-SALES-001 | Staff sales module |
| `staff.service.v1` | `true` | SPEC-SERVICE-001 | Staff service module |
| `staff-management` | `true` | SPEC-STAFF-001 | Staff management module |
| `hr-payroll` | `false` | SPEC-STAFF-001 | Payroll preview (P2) |
| `attendance-fingerprint` | `false` | SPEC-STAFF-001 | Fingerprint attendance device |
| `storefront.landing.v1` | `true` | SPEC-STOREFRONT-001 | Storefront landing page |
| `settings-module` | `true` | SPEC-SETTINGS-001 | Settings module (this spec) |

---

## 6. Routes — Detailed Descriptions

### 6.1 `/settings` — Hub

A card-grid index page using the canonical `Card` primitive from SPEC-ARCH-UI-001 §3.1. Six cards arranged in a 3-column grid (desktop) / 2-column (tablet) / 1-column (mobile):

| Card | Icon | Description | Badge |
|---|---|---|---|
| Outlets | MapPin | 3 outlets · BLR, MUM, CHE | active count |
| RBAC Matrix | ShieldCheck | 24 roles × 79 actions | "Read-only" badge |
| Integrations | Plug | 6 integrations | connected count |
| Feature Flags | ToggleRight | N flags total | active count |
| Audit Log | ClipboardList | Configuration change history | — |
| (v2 placeholder) | Lock | RBAC edit — coming in v2 | "v2" chip |

The hub itself requires R12+. The Integrations card links to `/settings/integrations` but renders the card only when `hasRank(user.role, 'R22')` — lower ranks see the card greyed with a `Gate` fallback copy "Integration credentials require Auditor access."

**Empty/loading/error states:** A skeleton grid of 6 `Card` outlines during load. Error state shows a full-page error banner per SPEC-ARCH-UI-001.

### 6.2 `/settings/outlets` — Outlet List

A table with columns: Code, Name, City, GSTIN, Manager, Status (Active/Inactive chip), Actions (Detail link).

- R12 read: sees the full table.
- R02+: sees an Edit button per row that opens `/settings/outlets/[id]`.
- The list is always 3 rows (BLR, MUM, CHE) — no pagination needed. The "Add Outlet" CTA is absent (L1).
- GSTIN is displayed in full — it is not personal PII (it is a business registration number per Doc 06 §5).
- Manager cell shows the staff member's name as a link to `/staff/[id]` (seam with SPEC-STAFF-001).

### 6.3 `/settings/outlets/[id]` — Outlet Detail + Edit

Two modes: view and edit.

**View layout:** `dt`/`dd` grid inside a `Card` per SPEC-ARCH-UI-001. Sections:
- Identification: Code (read-only chip, L10), Name, GSTIN
- Address: Line 1, Line 2 (if present), City, State, PIN
- Contact: Phone, Email (with office-number copy per L8)
- Management: Manager (linked name + role badge), Active status
- Metadata: Created, Last updated, Updated by

**Edit mode (R02+ only):** same sections become a form using React Hook Form + Zod. Inline validation:
- GSTIN: regex per L2; error copy "GSTIN format invalid (e.g. 29ABCDE1234F1Z5)"
- Manager: dropdown filtered to staff at this outlet with R03+ role (L3). Error if no eligible staff exists for the outlet: "No staff with Outlet Manager or above role found at this outlet."
- Code: displayed as read-only text; no input (L10).

**Save / Cancel:** Save is disabled until all validations pass. On save, `updateOutlet()` is called, a success toast fires, and a `SettingsAuditEvent` of kind `'outlet-edit'` is written with the before/after diff. Cancel returns to view mode without mutation.

**Deactivate / Reactivate button (R02+):** A destructive secondary button "Deactivate Outlet" renders when `active === true`. Clicking opens a confirmation dialog (per SPEC-ARCH-UI-001 confirmation dialog pattern): "Deactivating BLR will block new service bookings, sales orders, and custom-build jobs for this outlet. Staff remain read-only. Type DEACTIVATE to confirm." Type-to-confirm required (L16 pattern extended to outlet deactivation, consistent with Doc 14 §28).

### 6.4 `/settings/rbac` — RBAC Matrix

Sourced from Doc 14 §§4-26. Read-only in v1 (L4).

**Layout:** A sticky-header table. Row = action name. Column = role code (R01-R24, excluding R20/R21 which are external customer/consignor roles handled by the customer-web surface — note them in the table header as "External — see customer-web"). Column widths are fixed at 48px for role codes; row header is 240px.

**Cell values rendered as icon + conditional note:**
- ✅ Allow → green CheckCircle icon
- ⛔ Deny → grey MinusCircle icon
- 🔶 Conditional → amber Circle with `?` tooltip showing the notes column from Doc 14
- 👥 Team scope → blue Users icon overlay on the base allow/deny icon
- 🙋 Self scope → same with User icon
- 📝 Requires reason → PenLine icon overlay

**Action grouping by domain (L13):**

| Domain | Action count (indicative) |
|---|---|
| Customer / Storefront | 15 |
| Sales | 14 |
| Procurement & Consignment | 9 |
| Inspection & CPO | 5 |
| Service & Workshop | 10 |
| Parts | 7 |
| Finance & Payments | 12 |
| Marketing | 7 |
| Staff & HR | 8 |
| Platform & Settings | 6 |

Each domain group has a section heading row spanning all columns (background `bg-bg-subtle`).

**Controls above the table:**
- Search input (filters action rows client-side by name)
- Domain filter chip group (toggles visibility of domain sections)
- "Export CSV" button (R12+): downloads the full matrix as a CSV; logs `'rbac-matrix-exported'` audit event with actor

**Pagination / virtual scroll:** at 79 rows × 22 staff columns the table is ~1,700 cells. Implement with a windowed scroll approach (virtual rows) if the browser paints sluggishly; otherwise static render. The horizontal scroll is contained within the table container; sticky first column (action name) is required.

**Note banner at the top:** "This matrix is read-only in v1. RBAC edits follow the change-control process in Doc 14 §31 and are scheduled for v2."

### 6.5 `/settings/integrations` — Integration Overview

Card grid (2-column desktop, 1-column mobile) of 6 integration cards per Doc 13 §§1,2,3,5,10,11.

Each card (using canonical `Card` primitive, SPEC-ARCH-UI-001 §3.1):
- Provider name + logo placeholder (lucide icon)
- Status badge: `connected` (green), `disconnected` (slate), `error` (red)
- Last used: relative timestamp or "Never"
- Doc 13 sheet reference in `text-xs text-ink-muted` (e.g., "Doc 13 §2")
- Actions: "View Details" link; "Test Connection" button (L11); "Disconnect" button visible for R02+ only (L16)

**Integrations displayed:**

| Provider key | Display name | Doc 13 sheet | Sensitive |
|---|---|---|---|
| `razorpay` | Razorpay Payments | §1 | Yes (payments) |
| `whatsapp_bsp` | WhatsApp BSP | §2 | Medium |
| `irp_einvoicing` | IRP E-invoicing | §3 | Yes (regulatory) |
| `aadhaar_sub_kua` | Aadhaar sub-KUA | §5 | High (identity) |
| `dlt_sms` | DLT SMS | §10 | Medium |
| `tally_prime` | Tally Prime | §11 | Medium |

Gate: `<Gate role={['R02', 'R22', 'R01']} fallback={<RestrictedCard />}>` wraps the entire section. The `RestrictedCard` shows: "Integration credentials require Auditor (R22) or Org Admin (R02) access."

### 6.6 `/settings/integrations/[provider]` — Per-Provider Detail

Route resolves `[provider]` from `IntegrationProvider` enum; 404 for unknown values.

**View layout:**
- Header: provider name, status badge, last-used chip, "Doc 13 §N" citation link
- Credential card:
  - Secret: `••••••••••••K4F2` (last 4 chars, rest masked) — per Doc 13 §15 (no full secrets in UI)
  - Endpoint: masked (first 8 chars + `…`)
  - Connected at: ISO date or "Not connected"
  - Last test result: badge (OK / Error / Not tested)
- "Test Connection" button (L11): R22+ only. Fires `testConnection()` store action. Shows spinner for 800ms, then success/error toast. Button disabled during pending state.
- "Disconnect" button (R02+ only, L16): Opens `AlertDialog` with type-to-confirm. Copy: "Type DISCONNECT to confirm. This will interrupt [dependent modules list]." On confirm: `disconnectIntegration()` store action fires, audit event written.
- "Re-connect" button (when `status === 'disconnected'`): stub — shows "Coming in v1.5" info toast. Per CLAUDE.md §15 DoD item 15 (deferred actions must show explicit notice).

**Dependency notice:** below the credential card, a read-only "Used by" list enumerates modules that depend on this integration:
- `whatsapp_bsp` → Insurance marketing, Service booking confirmations, Sales OTP
- `irp_einvoicing` → Finance invoicing, Sales SOLD events
- `dlt_sms` → KYC OTP, Service notifications fallback
- `aadhaar_sub_kua` → Customer KYC, Staff onboarding
- `razorpay` → Customer payments, Token collection
- `tally_prime` → Finance journal sync

### 6.7 `/settings/feature-flags` — Feature Flags

A table listing all flags from the registry (L12).

**Columns:** Key (monospace chip), Value (green/red badge for boolean; text pill for string), Default, Owning Spec (linked to the spec file path), Scope, Last Updated, Updated By, Toggle (R02+ only).

**Toggle behavior (L6):**
- R02+ sees a toggle switch in the Toggle column.
- Toggling calls `toggleFlag(key, !currentValue, actor)`.
- A `SettingsAuditEvent` of kind `'feature-flag-toggled'` is written with before/after.
- A toast confirms: "feat_insurance_ai_calling toggled OFF — in-memory only until v1.1."
- Disabling a flag in production is listed as a sensitive action in Doc 14 §28; disabling must show a confirmation dialog: "Disabling [key] will immediately affect [owningSpec] features for all active users. Continue?"

**Note banner:** "Flag changes are in-memory and reset on server restart. Persistent configuration ships in v1.1."

**R12 read-only view:** toggle column is absent; all flags are displayed but not interactive.

### 6.8 `/settings/audit` — Settings Audit Log

A chronological, filterable table of all `SettingsAuditEvent` entries.

**Columns:** Timestamp, Actor (name + role), Event kind (badge), Subject (outlet code / provider / flag key), Summary (human-readable diff).

**Filters (above the table):**
- Date range picker (from/to)
- Event kind multi-select chip group
- Actor search

**Diff rendering:** clicking any row expands an inline `before`/`after` diff. JSON keys are displayed in a two-column `dt`/`dd` grid with changed values highlighted in amber.

**Export:** "Export CSV" (R12+, watermarked per Doc 14 §24 auditor export convention).

**Retention notice:** "Audit records are retained for 3 years (L14)."

---

## 7. RBAC Matrix — Source Mapping (Doc 14 §§4-26)

The following table maps each Doc 14 section to the action group rendered on `/settings/rbac`. This ensures the rendered matrix is complete and citable.

| Doc 14 section | Role | Domain group in matrix |
|---|---|---|
| §4 | R20 Customer | Customer / Storefront |
| §5 | R21 Consignor | Customer / Storefront |
| §6 | R05 Sales Executive | Sales |
| §7 | R04 Sales Manager | Sales |
| §8 | R06 Procurement Manager | Procurement & Consignment |
| §9 | R07 Inspector | Inspection & CPO |
| §10 | R08 Refurb Workshop Manager | Service & Workshop |
| §11 | R09 Service Advisor | Service & Workshop |
| §12 | R10 Master Technician | Service & Workshop |
| §13 | R11 Technician | Service & Workshop |
| §14 | R12 Parts Manager | Parts |
| §15 | R13 Parts Counter | Parts |
| §16 | R14 Body Shop Manager | Service & Workshop |
| §17 | R15 Finance Executive | Finance & Payments |
| §18 | R16 Finance Head | Finance & Payments |
| §19 | R17 AP Clerk | Finance & Payments |
| §20 | R03 Outlet Manager | Staff & HR |
| §21 | R18/R19 Marketing | Marketing |
| §22 | R02 Org Admin | Platform & Settings |
| §23 | R01 Super Admin | Platform & Settings |
| §24 | R22 Auditor | Platform & Settings |
| §25 | R23 DPO | Platform & Settings |
| §26 | R24 Support Agent | Customer / Storefront |
| §27 | Conditional thresholds | Rendered as footnotes, not cells |
| §28 | Sensitive-action inventory | Highlighted row treatment (amber background) |
| §29 | Delegation & impersonation | Footnote section below matrix |
| §30 | Machine accounts | Not rendered in matrix (service accounts, not humans) |

---

## 8. Scenarios

### S-S-1: R12 views outlet BLR detail

**Given** an authenticated Parts Manager (R12) navigates to `/settings/outlets/blr`
**When** the page loads
**Then** they see the full outlet config: name, address, GSTIN (29AABCT1332L1ZQ), manager link (opening `/staff/[id]`), contact phone, contact email, status chip "Active"
**And** the Edit button is absent (R12 cannot edit, only R02+)
**And** no PII is present on the page (L8)

### S-S-2: R02 edits Mumbai outlet GSTIN

**Given** an authenticated Org Admin (R02) navigates to `/settings/outlets/mum`
**When** they click Edit, change the GSTIN field to `27AABCT1332L1ZQ`, and click Save
**Then** `updateOutlet('outlet-mum', { gstin: '27AABCT1332L1ZQ' }, actor)` is called
**And** a success toast "BN Automobiles Mumbai updated" appears
**And** a `SettingsAuditEvent` `{ kind: 'outlet-edit', subject: 'outlet-mum', before: { gstin: '…old…' }, after: { gstin: '27AABCT1332L1ZQ' } }` is written
**And** the audit log at `/settings/audit` shows this entry with before/after diff

### S-S-3: R12 views RBAC matrix, filters to Finance domain

**Given** an authenticated Parts Manager (R12) navigates to `/settings/rbac`
**Then** the note banner "This matrix is read-only in v1" is visible
**And** the table renders 24 role columns and action rows grouped by domain
**When** they select the "Finance & Payments" domain filter chip
**Then** only Finance & Payments action rows remain visible (~12 rows per L17)
**And** the sticky column headers (R01-R24) remain visible during horizontal scroll

### S-S-4: R22 disconnects WhatsApp BSP integration

**Given** an authenticated Auditor (R22) navigates to `/settings/integrations/whatsapp_bsp`
**When** they click "Disconnect"
**Then** an `AlertDialog` appears with copy "Type DISCONNECT to confirm. This will interrupt: Insurance marketing, Service booking confirmations, Sales OTP."
**When** they type `DISCONNECT` and confirm
**Then** `disconnectIntegration('whatsapp_bsp', actor)` is called
**And** the provider `status` updates to `'disconnected'`
**And** a `SettingsAuditEvent` `{ kind: 'integration-disconnected', subject: 'whatsapp_bsp' }` is written
**And** a toast "WhatsApp BSP disconnected" appears

### S-S-5: R10 attempts to access `/settings`

**Given** an authenticated Master Technician (R10, rank 3 in ROLE_RANK < R12 rank 4)
**When** they navigate to `/settings`
**Then** the route redirects to `/dashboard`
**And** the settings entry is absent from the sidebar navigation (L15)
**And** no RBAC data, outlet config, or credential information is disclosed

### S-S-6: R02 toggles `feat_insurance_ai_calling` OFF

**Given** an authenticated Org Admin (R02) navigates to `/settings/feature-flags`
**When** they toggle `feat_insurance_ai_calling` from `true` to `false`
**Then** a confirmation dialog appears: "Disabling feat_insurance_ai_calling will immediately affect SPEC-INSURANCE-001 features for all active users. Continue?"
**When** they confirm
**Then** `toggleFlag('feat_insurance_ai_calling', false, actor)` is called
**And** the in-memory flag value updates to `false`
**And** a toast "feat_insurance_ai_calling toggled OFF — in-memory only until v1.1" appears
**And** a `SettingsAuditEvent` `{ kind: 'feature-flag-toggled', subject: 'feat_insurance_ai_calling', before: { value: true }, after: { value: false } }` is written

### S-S-7: GSTIN format invalid on outlet edit

**Given** an authenticated Org Admin (R02) is editing the Chennai outlet
**When** they enter the GSTIN `33INVALID` (fails regex `^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$`)
**Then** an inline form error appears beneath the GSTIN field: "GSTIN format invalid (e.g. 33AABCT1332L1ZQ)"
**And** the Save button remains disabled
**And** no store action is called
**And** no audit event is written

### S-S-8: Manager assignment to non-eligible staff is rejected

**Given** an Org Admin (R02) editing the BLR outlet
**When** they attempt to select a Technician (R11, rank below R03) as the outlet manager from the manager dropdown
**Then** the Technician does not appear in the dropdown (the dropdown is pre-filtered to staff with R03+ at BLR per L3)
**And** if the invalid `managerId` is submitted via API bypass, `updateOutlet` throws a `ManagerEligibilityError`

### S-S-9: IRP e-invoicing connection test

**Given** an authenticated Auditor (R22) navigates to `/settings/integrations/irp_einvoicing`
**When** they click "Test Connection"
**Then** the button enters a loading state (spinner, disabled) for 800ms (L11)
**After** 800ms
**Then** a success toast appears: "IRP E-invoicing — OK (mocked)"
**And** the "Last test result" chip on the provider card updates to "OK — just now"
**And** a `SettingsAuditEvent` `{ kind: 'integration-test', subject: 'irp_einvoicing' }` is written

### S-S-10: Outlet deactivation requires type-to-confirm

**Given** an Org Admin (R02) on the MUM outlet detail page
**When** they click "Deactivate Outlet"
**Then** an `AlertDialog` opens: "Deactivating MUM will block new service bookings, sales orders, and custom-build jobs for this outlet. Staff remain read-only. Type DEACTIVATE to confirm."
**When** they type `DEACTIVATE` and confirm
**Then** `deactivateOutlet('outlet-mum', actor)` is called
**And** the outlet `active` field becomes `false`
**And** the status chip on the outlet list page updates to "Inactive"
**And** a `SettingsAuditEvent` `{ kind: 'outlet-deactivated', subject: 'outlet-mum' }` is written

### S-S-11: Settings audit log filtered by event kind

**Given** an R12 Parts Manager on `/settings/audit`
**When** they select "outlet-edit" in the event kind filter
**Then** only `SettingsAuditEvent` rows with `kind === 'outlet-edit'` are displayed
**And** each row shows the timestamp, actor name + role, subject (outlet code), and a summary line
**When** they click a row
**Then** an inline diff expands showing the `before` and `after` values in a two-column grid

### S-S-12: RBAC matrix export by R12

**Given** an R12 user on `/settings/rbac`
**When** they click "Export CSV"
**Then** a CSV file download begins containing all 24 roles × all domain actions
**And** a `SettingsAuditEvent` `{ kind: 'rbac-matrix-exported', actorId, at }` is written

### S-S-13: Feature flags page for R12 (read-only)

**Given** an R12 Parts Manager on `/settings/feature-flags`
**Then** all registry flags are listed in the table
**And** the Toggle column is absent (no interactive controls visible)
**And** the Owning Spec column links are rendered but the flag values are non-interactive

### S-S-14: Re-connect stub shows deferred notice

**Given** an R02 or R22 user on `/settings/integrations/dlt_sms` where `status === 'disconnected'`
**When** they click "Re-connect"
**Then** an info toast appears: "Re-connect will be available in v1.5. Contact your system administrator to restore this integration manually."
**And** no store action is called
**And** no audit event is written
**Per** CLAUDE.md §10 DoD item 15 (every deferred action shows an explicit notice)

---

## 9. Acceptance Criteria

All items must pass before status transitions to `in-build`.

### 9.1 Functional

- [ ] `/settings` hub renders 6 cards; integrations card is hidden below R22 with gate fallback copy
- [ ] `/settings/outlets` lists exactly 3 rows (BLR, MUM, CHE); no "Add Outlet" CTA
- [ ] Outlet GSTIN validation uses the regex `^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$`; save is blocked on failure
- [ ] Manager dropdown on outlet edit is filtered to staff with R03+ at the target outlet
- [ ] `/settings/rbac` renders all 24 roles (R01-R24) as columns with action rows grouped by domain; no edit controls
- [ ] RBAC matrix action search filters rows client-side
- [ ] `/settings/integrations` shows 6 integration cards with status badges from `IntegrationCredential.status`
- [ ] "Test Connection" stub resolves in 800ms with "OK — mocked" toast and writes audit event
- [ ] "Disconnect" on any integration requires type-to-confirm `DISCONNECT` dialog (L16)
- [ ] `/settings/feature-flags` reads from `apps/staff-web/src/lib/feature-flags/registry.ts`
- [ ] R02+ sees toggle switch; R12 (non-R02) sees read-only table
- [ ] Feature-flag toggle writes in-memory state change + audit event + confirmation toast
- [ ] `/settings/audit` displays all `SettingsAuditEvent` entries with before/after diff on row expand
- [ ] Audit log filters by event kind and date range

### 9.2 RBAC / Access Control

- [ ] R10 and below: `/settings` redirects to `/dashboard`; sidebar nav entry is absent
- [ ] R12: read access to hub, outlets, rbac, feature-flags (read-only), audit
- [ ] R22: adds read access to integrations section
- [ ] R02: adds edit access to outlets, feature-flag toggles, integration disconnect
- [ ] R01: full access to all sections
- [ ] `Gate` primitive used exclusively — no inline `hasRank` in JSX (CLAUDE.md §17)

### 9.3 UI / UX

- [ ] All layouts use canonical `Card`, `Field`, `Dialog` primitives from SPEC-ARCH-UI-001 §3
- [ ] No `text-[NNpx]` in any new component (CLAUDE.md §10 item 12)
- [ ] No `rounded-lg` / `rounded-xl` unless it is a `Dialog` / `AlertDialog` (CLAUDE.md §10 item 13)
- [ ] Empty, loading, error, success states present on all list and detail routes
- [ ] Confirmation dialog on outlet deactivation (type `DEACTIVATE`) and integration disconnect (type `DISCONNECT`)
- [ ] Every CTA is wired to a real action; no silent no-ops; deferred actions show info toast (CLAUDE.md §10 item 15)
- [ ] "Re-connect" stub shows "Coming in v1.5" info toast

### 9.4 i18n

- [ ] No hardcoded user-facing strings; all keys under `messages/en-IN/settings.json` and `messages/hi-IN/settings.json`

### 9.5 Accessibility

- [ ] Keyboard navigable table (RBAC matrix, audit log)
- [ ] Focus rings visible; color contrast AA minimum
- [ ] Reduced-motion honored on any animation (spinner, skeleton)

### 9.6 Data / Store

- [ ] `SettingsAuditEvent` written on every mutation (outlet edit, deactivate, reactivate, flag toggle, integration test, disconnect, RBAC export)
- [ ] Audit log before/after diff is a deep diff — unchanged keys are excluded from diff output
- [ ] Feature flag registry file exists at canonical path before implementation (L12)
- [ ] `OutletConfig.code` is immutable — edit form renders it as read-only text (L10)

### 9.7 Tests

- [ ] Unit tests for: GSTIN validation, manager eligibility check, feature-flag toggle in-memory, audit event emission per action, `testConnection` 800ms stub
- [ ] Integration test per scenario S-S-1 through S-S-14 (≥ 1 integration test per scenario)
- [ ] Test files at `apps/staff-web/src/lib/settings/__tests__/settings-store.test.ts` (per CLAUDE.md §10 DoD item 9 placement convention)
- [ ] Typecheck clean: `pnpm -F staff-web typecheck` exits 0

---

## 10. Cross-Module Wiring Seams

The following seams must be registered in `specs/architecture/cross-module-wiring.md` before the corresponding import is added to code (CLAUDE.md §6).

### Seam 18: Settings → Staff (outlet manager reference)

**Source:** `/settings/outlets/[id]` edit form — manager dropdown
**Target:** `staff-store` (reads `MOCK_STAFF_PROFILES` filtered by outlet + R03+)
**Contract:** Settings outlet edit form reads `useStaffStore.getState().profiles` and filters to `p.outlet === outletId && hasRank(p.role, 'R03')`. The settings store does not import staff-store directly; the UI-layer provides the filtered list to the form.
**Per L3 of this spec.**

### Seam 19: Settings outlet deactivation → All modules (inactive-outlet enforcement)

**Source:** `settings-store.deactivateOutlet(id)`
**Target:** `service-booking`, `sales-store`, `custom-builds-store` — each must check `outletConfig.active` before allowing new entity creation.
**Contract:** When a module creates a new service booking, sales order, or custom-build job, it must call `useSettingsStore.getState().outlets[outletId].active` and throw or return an error if `false`. The enforcement lives in each consuming module's action; settings-store is the single source of truth.
**Per L9 of this spec.**

### Seam 20: Feature flags registry → All flag-gated features

**Source:** `apps/staff-web/src/lib/feature-flags/registry.ts`
**Target:** All modules that check feature flags (e.g., insurance `ai-call-slice.ts` checks `feat_insurance_ai_calling`)
**Contract:** All flag-gated code must read from the canonical registry at runtime via a `getFlag(key: string): boolean | string` helper exported from the registry module. The `settings-store` overrides runtime values in-memory (v1); the registry provides defaults.
**Per L6 and L12 of this spec.**

### Seam 21: RBAC matrix view → Doc 14 action registry

**Source:** `/settings/rbac` RBAC matrix
**Target:** A runtime action registry derived from Doc 14 §§4-26
**Contract:** The matrix renderer consumes a static `RBAC_MATRIX` constant (co-located in `apps/staff-web/src/lib/settings/rbac-matrix.ts`) that is the TypeScript representation of the Doc 14 table. This constant is the single source of truth for the rendered matrix and must be kept in sync with Doc 14 on every RBAC change.
**Per L4 and L17 of this spec.**

---

## 11. Deferred Items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-SETTINGS-1 | Feature flag persistence (durable config store) | P2 | v1.1; in-memory only in v1 per L6 |
| DEF-SETTINGS-2 | RBAC matrix edit (change-control workflow) | P3 | v2; requires migration of permissions.ts + RLS per Doc 14 §31 |
| DEF-SETTINGS-3 | Integration re-connect (real credential management) | P2 | v1.5; env-var / vault management per Doc 13 |
| DEF-SETTINGS-4 | 4th outlet (v2 migration) | P3 | Requires fixture migration, VIN code updates, staff reassignment per L1 |
| DEF-SETTINGS-5 | RBAC delegation management UI | P3 | v2; Doc 14 §29 delegation grants |
| DEF-SETTINGS-6 | Integration real probes (live connection test) | P2 | v1.5; real health-check endpoints per Doc 13 §15 |

---

## 12. Open Items

| ID | Question | Owner | ETA |
|---|---|---|---|
| OQ-SETTINGS-1 | Does R22 (Auditor read-only) need edit access to any integration credential in v1, or is R02 sufficient for all writes? Doc 14 §24 says "write anything: ⛔" for R22 but the integration credential is operational config, not a financial record. | Product | Before in-build |
| OQ-SETTINGS-2 | Should the feature flag registry be seeded from the spec `flags:` frontmatter at build time (CI check), or manually maintained? CLAUDE.md §6 requires a CI validation. | Engineering | P1 implementation |

---

## 13. Production-Grade Checklist (CLAUDE.md §17)

- [ ] DoD §10 1–15 all pass
- [ ] Every CTA wired (deferred actions render explicit toast or "coming in vN.N" notice)
- [ ] Empty / loading / error / success states present on all routes
- [ ] RBAC gates use `Gate` primitive — no inline `hasRank` in JSX
- [ ] All user-visible strings via `next-intl`; keys in `messages/en-IN/settings.json` AND `messages/hi-IN/settings.json`
- [ ] No `any` without `// reason:` comment
- [ ] No `text-[NNpx]`, no `rounded-lg/xl` outside approved exceptions
- [ ] `Card` / `Field` / `Dialog` / `AlertDialog` reused from SPEC-ARCH-UI-001
- [ ] Hooks called before conditional returns (Rules of Hooks)
- [ ] Zustand selectors return base refs; computation in `useMemo`
- [ ] Confirmation dialog on destructive actions; type-to-confirm for outlet deactivation and integration disconnect
- [ ] PII never in logs / toast / error bodies (L8 — office fields only; no personal PII in settings)
- [ ] Unit tests for store logic; ≥ 1 integration test per scenario
- [ ] Typecheck clean; no new test failures
- [ ] Spec changelog updated on any behavior change

---

## 14. Spec Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-29 | 1.0 | orchestrator | Initial spec. 8 routes, 17 locked decisions, 14 scenarios, 39 acceptance criteria, 4 cross-module seams (18-21), 6 deferred items. Sourced from Doc 14 §§4-26 (RBAC matrix), Doc 13 §§1-15 (integration credentials), Doc 06 §5 (GSTINs), SPEC-ARCH-UI-001, SPEC-STAFF-001. |
