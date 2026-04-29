---
spec_id: SPEC-NOTIFICATIONS-001
domain: notifications
status: approved
version: "1.0"
risk_level: medium
pii_sensitivity: medium
flags: [notifications-module]
owners: [orchestrator]
depends_on:
  - SPEC-INSURANCE-001
  - SPEC-CUSTOMER-PORTAL-002
  - SPEC-CUSTOM-BUILDS-001
  - SPEC-CUSTOMERS-001
  - SPEC-ARCH-UI-001
created: 2026-04-29
---

# Notifications — central comms log + DLT template registry (staff-web)

## §1 — Goal and scope

### 1.1 The problem

Every module in BN Automobiles DMS dispatches outbound communications via its own isolated slice:

- Insurance module: `insurance-store/slices/whatsapp-slice.ts` owns WhatsApp template management, DLT enforcement (L13), and opt-out re-checks (L14) per `SPEC-INSURANCE-001 §9`.
- Service Booking module: `service-store.ts` stubs `DLT_SVC_BOOKING_CREATED`, `DLT_SVC_BOOKING_CONFIRMED`, `DLT_SVC_BOOKING_DECLINED` (logged to console; wire to notifications before go-live).
- Custom Builds module: `job-slice.ts` logs activity events including customer-facing communications in `BuildActivityEventType`.
- Customer 360 module: `customer-comms-tab.tsx` reads a `comms-store` that exists per module, with no central view.

The result is four separate opt-out registries, four separate template approval flows, and no single surface for the DPO (R23) to satisfy a Data Subject Request (DSR) under DPDP Act 2023 §11 (right of access) or audit a consent-blocked dispatch.

### 1.2 v1 goal

Provide a **read-only audit log and DLT template registry** that consolidates all outbound communications into a single `notifications-store`. In v1, each module continues to dispatch via its own logic. Every dispatch ALSO calls `notifications-store.recordSent(...)` to write into the central registry. This is a **write-through audit** model — the notifications store is the single source of truth for *evidence* of sends, but not yet the single *source of sends*.

### 1.3 v1.1 goal (deferred — see §22)

Introduce `notifications-store.dispatch(...)` as the canonical send path. Modules migrate off their own dispatch logic and delegate entirely to the notifications store. Template management also migrates here.

### 1.4 Scope boundary

**In scope for v1:**

- Central dispatch log at `/notifications` — queryable across all modules, channels, statuses, and date ranges
- Single dispatch detail at `/notifications/[id]`
- DLT template registry at `/notifications/templates` — list, create, view, and status-workflow management
- Template detail at `/notifications/templates/[id]` — edit, version, submit, approve
- DPO audit view at `/notifications/audit` — PII-redacted export surface for DSR fulfilment
- `notifications-store` with `recordSent`, `recordStatusUpdate`, `cancelDispatch`, `createTemplate`, `submitForDlt`, `markApproved`, `markRejected`, `editTemplate` actions
- Cross-module wiring: Insurance, Service Booking, Custom Builds, Customers each call `recordSent` on every send

**Out of scope for v1 (deferred — see §22):**

- Real BSP/SMS provider wire-up (mocked throughout)
- Push notification channel (scaffold the enum value; no dispatch logic)
- Template proof-of-approval document upload (placeholder field only)
- `notifications-store.dispatch(...)` canonical send path (v1.1)
- In-app notification bell / unread badge (separate surface — v2)
- Per-outlet DLT sender ID management (v2)

---

## §2 — Route surface

| Route | Purpose | Gate |
|---|---|---|
| `/notifications` | Central log — filterable table of all dispatches across all modules | R10+ same city; R02+ all cities |
| `/notifications/[id]` | Single dispatch detail — template body, variable substitution, delivery status, recipient (masked), source entity link | same as parent |
| `/notifications/templates` | DLT template registry — all templates across modules with approval-status chip | R10+ read; R12+ edit |
| `/notifications/templates/[id]` | Template detail, edit, version history, status workflow | R12+ |
| `/notifications/templates/new` | Create new DLT template | R12+ |
| `/notifications/audit` | DPO view — all dispatches with PII redacted; exportable as DSR evidence; R23 sees full PII | R23 only |

Breadcrumb: `Staff › Notifications`. Sub-pages append `› [Template name]` or `› Dispatch #{id}`.

---

## §3 — Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L1 | **No free-text WhatsApp or SMS sends** | Every dispatch through `notifications-store.recordSent` (v1) or `notifications-store.dispatch` (v1.1) MUST resolve a `NotificationTemplate` whose `status === 'APPROVED'` AND `dltTemplateId` is non-null. This check is enforced at the `recordSent` boundary — not at the UI layer. If the template is not approved, the function throws `TemplateNotApprovedError` and no dispatch record is created with status `sent`. This mirrors and extends `SPEC-INSURANCE-001 L13`. Email templates are exempt from the DLT ID requirement (L2). | Doc 09 §DLT; CLAUDE.md §9; SPEC-INSURANCE-001 L13 |
| L2 | **DLT template ID is mandatory for SMS and WhatsApp** | Per Doc 09 §DLT, every SMS and WhatsApp message body must be pre-registered with the Telecom Regulatory Authority of India (TRAI) DLT platform and assigned a numeric `dltTemplateId` before commercial use. The `dltTemplateId` field on a `NotificationTemplate` MUST be non-null when `status === 'APPROVED'` and `channel ∈ {SMS, WHATSAPP}`. Attempting to approve an SMS or WhatsApp template without a `dltTemplateId` throws `DltIdRequiredError`. Email and Push templates do not require a DLT ID. | Doc 09 §DLT; Doc 13 §DLT SMS; CLAUDE.md §9 |
| L3 | **PII redaction in audit view** | The `/notifications/audit` route renders phone numbers as `+91 XX XXX XX{last4}`, customer names as first name only, and email addresses as `{first}@***.***`. This redaction applies to all viewers whose `role !== 'R23'` (DPO). R23 sees full PII in the audit view only. This is consistent with DPDP Act 2023 §12 (purpose limitation — staff below DPO rank do not have a lawful basis to view raw comms PII in an audit context). The central log at `/notifications` always shows masked phone and truncated name regardless of role. | DPDP Act 2023 §12; Doc 14 (R23 scope) |
| L4 | **Opt-out re-check at `recordSent` boundary** | Before creating a dispatch record with status `sent`, `recordSent` re-checks the `ConsentEntry` log for the recipient customer. If the customer's consent for the relevant purpose (e.g. `WHATSAPP_MARKETING`, `SERVICE_REMINDER`) is `revokedAt !== null` at the moment of the call, the dispatch record is created with `status: 'opted-out'` and the actual send is suppressed. This mirrors `SPEC-INSURANCE-001 L14` and extends it to all modules. The purpose mapping is: `channel=WHATSAPP + module=INSURANCE → WHATSAPP_MARKETING`, `channel=WHATSAPP/SMS + module=SERVICE_BOOKING → SERVICE_REMINDER`, `channel=WHATSAPP/SMS + module=CUSTOM_BUILDS → DATA_PROCESSING`, `channel=WHATSAPP/SMS + module=CUSTOMERS → DATA_PROCESSING`. | DPDP Act 2023; Doc 03 §10; SPEC-CUSTOMERS-001 §4.1; SPEC-INSURANCE-001 L14 |
| L5 | **v1 is write-through audit — modules retain dispatch ownership** | In v1, each module (Insurance, Service Booking, Custom Builds, Customers) continues to dispatch via its own slice logic. The notifications module is a passive log. Each module is responsible for calling `notifications-store.recordSent(payload)` after its own dispatch succeeds. The notifications store does not orchestrate the send. v1.1 introduces `notifications-store.dispatch()` as the single send path; at that point modules delegate dispatch entirely. This phased approach avoids a risky big-bang migration and keeps v1 scope tractable. | PLAN-ROADMAP-001 §Theme A3 |
| L6 | **Template versioning — editing an APPROVED template requires re-approval** | When R12+ edits a template with `status === 'APPROVED'`, the status MUST drop to `PENDING_DLT` and the `dltTemplateId` MUST be cleared (nulled). The previous version is retained as a new immutable record with `supersededBy: newTemplateId` and `status: 'DEPRECATED'`. This ensures the template registry is an append-only audit trail and no APPROVED template body can be silently changed. Per Doc 09 §DLT, any body change requires fresh TRAI DLT re-registration. | Doc 09 §DLT; Doc 13 §2 (BSP integration contract) |
| L7 | **DPO export for DSR §11 (right of access)** | R23 (DPO) can export a `.csv` of all `NotificationDispatch` records for any `customerId` from the `/notifications/audit` view. The export includes: `id`, `channel`, `templateId`, `templateName`, `sentAt`, `status`, `module`, `sourceEntityId`, `consent.purpose`, `consent.capturedAt`. It excludes `variables` containing PII (phone, name rendered as `[redacted]` in export). This satisfies DPDP Act 2023 §11 (the data principal's right to a summary of their personal data processed). | DPDP Act 2023 §11; Doc 06 §retention |
| L8 | **Cancellation window — queued dispatches only** | R12+ may cancel a dispatch whose `status === 'queued'` before it moves to `sent`. Once a dispatch is `sent`, `delivered`, `read`, or `failed`, it is immutable — the record persists for 7 years (L10). Cancellation sets `status: 'cancelled'` and appends a `NotificationAuditEvent { kind: 'cancelled', actorId, at }`. This is consistent with the constraint that `notifications-store` is an audit record, not a message-recall service. | Doc 06 §retention; Doc 09 §DLT (sent messages are BSP-side immutable) |
| L9 | **URL-driven filter taxonomy** | The `/notifications` index renders filter state exclusively from URL search params: `?module=`, `?channel=`, `?status=`, `?from=`, `?to=`, `?recipient=` (customerId — never raw phone). Bookmark-safe, share-safe, browser-back-safe. No `?phone=` or `?name=` query params — PII must never appear in the URL bar. The recipient filter uses a typeahead that resolves customerId server-side. | CLAUDE.md §9 (no PII in URL); CLAUDE.md §10 DoD item 15; L15 |
| L10 | **Audit retention 7 years** | `NotificationDispatch` records are retained for 7 years per Doc 06 §retention. After the retention window, an anonymisation scheduler (following the pattern established in Staff Management S8) tombstones the `recipient.raw`, `recipient.customerId`, and `variables` fields — the shell record (id, channel, templateId, status, sentAt, module) is preserved for statistical integrity. The scheduler is scaffolded in v1 (store action `scheduleAnonymisation`) and activated in v1.1 backend phase. | Doc 06 §retention; DPDP Act 2023 §8 (storage limitation) |
| L11 | **Template variables are typed and validated at dispatch** | `NotificationTemplate.variables` is an array of `{ name: string, type: 'string' \| 'number' \| 'date' \| 'currency' \| 'phone', required: boolean }`. At `recordSent` boundary, if any variable with `required: true` is absent from the provided `variables` map, the function throws `MissingVariableError(templateId, missingVarNames[])`. This prevents partial-variable dispatches reaching the BSP, which would result in malformed message bodies. | Doc 13 §2 (BSP contract — variable placeholders must be filled); Doc 09 §DLT |
| L12 | **Dispatch log display order and pagination** | `/notifications` renders dispatches ordered by `sentAt DESC`. Page size is 50 rows. Pagination is URL-driven via `?page=N` (1-indexed). Loading a page beyond the last page renders the empty state rather than an error. The server action / mock handler must support cursor-based pagination in the backend phase (v1.1); the v1 mock uses array-slice pagination. | CLAUDE.md §10 DoD item 2 (empty state) |
| L13 | **Empty state on central log** | When no dispatches match the active filter combination, render: heading "No notifications dispatched in this period", body "Widen the date range or remove some filters to see more results", CTA "Clear all filters" — resets URL to `/notifications` with no params. Per `SPEC-ARCH-UI-001` empty-state pattern. | SPEC-ARCH-UI-001 §empty-state |
| L14 | **Failed dispatch retry with exponential backoff** | When the BSP/SMS provider returns an error for a `sent` dispatch, the retry policy is: 1 minute, 5 minutes, 30 minutes. After 3 failures the dispatch transitions to `status: 'failed'` (terminal). A `NotificationAuditEvent { kind: 'failed', at, errorReason }` is appended. A warning badge appears on `/notifications/audit` for the DPO. In v1 (mock) the retry is simulated by a store action `retryDispatch(id)` that increments `retryCount` and re-sets status to `queued`. The exponential backoff scheduler is a v1.1 server-side concern. | Doc 13 §2 (BSP retry policy); Doc 09 §DLT |
| L15 | **No PII in URL parameters** | `?recipient=` accepts only `customerId` (e.g. `cust-arjun-mehta`). Raw phone numbers, email addresses, and names MUST NOT appear in any URL query string. The recipient typeahead in the filter bar resolves `customerId` via a `useCustomersStore` lookup. Deep-linking to a recipient's dispatches: `/notifications?recipient=cust-arjun-mehta`. | CLAUDE.md §9; DPDP Act 2023 §8 |
| L16 | **Template approval workflow — external DLT registrar step** | The workflow is: `DRAFT → PENDING_DLT` (on "Submit for DLT" by R12+) → `APPROVED` or `REJECTED` (manually set by R12+ after receiving confirmation from the DLT registrar, per Doc 13 §DLT SMS). In v1 the registrar response is mocked — R12+ can directly call `markApproved(templateId, dltId)` or `markRejected(templateId, rejectionReason)` from the UI without uploading a proof document. A "proof doc" field is scaffolded (optional upload) but not required for approval in v1. Per Doc 09 §DLT, real approval requires the DLT registrar to return a numeric template ID. | Doc 09 §DLT; Doc 13 §DLT SMS; Doc 13 §2 |
| L17 | **Cross-module wiring — write-through pattern** | Insurance, Service Booking, Custom Builds, and Customers each call `notifications-store.recordSent(payload)` after a successful dispatch. This call is a best-effort write (try/catch at the call site) — a failure to write to the notifications log MUST NOT block the module's own dispatch flow or surface an error to the end user. A missed `recordSent` is a log gap, not a functional failure. Each `payload` MUST carry the `module` field so the dispatch is filterable by source. | PLAN-ROADMAP-001 §Theme A3; CLAUDE.md §2 (cross-module-wiring.md) |
| L18 | **DPDP consent snapshot per dispatch** | Every `NotificationDispatch` record carries a `consentSnapshot: { purpose, capturedAt, capturedBy, source }` field capturing the state of the customer's consent at the moment of the `recordSent` call. This snapshot is immutable once written. It is the primary evidence artefact for DPDP DSR fulfillment (§11 — the data principal's right to know what processing occurred and under what consent basis). | DPDP Act 2023 §11; Doc 03 §10 |

---

## §4 — Domain model

All types live in `packages/types/src/domain/notifications.ts`.

### 4.1 Enumerations

```ts
// L1, L2: channels with DLT scope
NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH'

// Terminal statuses: failed, opted-out, cancelled, delivered, read
NotificationStatus =
  | 'queued'       // created, not yet sent to BSP
  | 'sent'         // accepted by BSP / provider
  | 'delivered'    // confirmed delivered to handset
  | 'read'         // confirmed read (WhatsApp only)
  | 'failed'       // BSP rejected after 3 retries (L14)
  | 'opted-out'    // consent revoked at recordSent boundary (L4)
  | 'cancelled'    // cancelled by R12+ before send (L8)

// Mirrors WhatsAppTemplate.status from SPEC-INSURANCE-001; extended to all channels
DltTemplateStatus = 'DRAFT' | 'PENDING_DLT' | 'APPROVED' | 'REJECTED' | 'DEPRECATED'

// Source module for filtering (L9)
NotificationModule =
  | 'INSURANCE'
  | 'SERVICE_BOOKING'
  | 'CUSTOM_BUILDS'
  | 'CUSTOMERS'
  | 'STAFF'
  | 'SALES'
```

### 4.2 Core entities

**`NotificationTemplateVariable`**
```ts
{
  name: string                          // e.g. 'customer_name', 'booking_date'
  type: 'string' | 'number' | 'date' | 'currency' | 'phone'
  required: boolean                     // L11: missing required → MissingVariableError
  example?: string                      // shown in template preview
}
```

**`NotificationTemplate`**
```ts
{
  id: string                            // 'tmpl-{nanoid}'
  channel: NotificationChannel
  module: NotificationModule            // owning module
  name: string                          // human label; unique within module+channel
  subject?: string                      // EMAIL only
  bodyMarkdown: string                  // with {{variable}} placeholders
  variables: NotificationTemplateVariable[]
  status: DltTemplateStatus

  // L2: mandatory for SMS + WhatsApp APPROVED templates
  dltTemplateId?: string                // TRAI DLT numeric ID; null until APPROVED

  // L6: version chain
  supersedes?: string                   // id of the template this one replaces
  supersededBy?: string                 // id of the newer template (set when DEPRECATED)

  lastUpdatedAt: string                 // ISO
  lastUpdatedBy: string                 // staffId
  approvedAt?: string
  approvedBy?: string                   // staffId (R12+ who entered the DLT ID)
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  proofDocRef?: string                  // v1: optional placeholder; mandatory in v1.1
}
```

**`NotificationRecipient`**
```ts
{
  customerId?: string                   // preferred — links to Customer 360
  staffId?: string                      // for staff-targeted notifications
  raw?: string                          // fallback when no customerId; masked in UI (L3)
}
```

**`NotificationConsentSnapshot`** (L18)
```ts
{
  purpose: ConsentPurpose               // from SPEC-CUSTOMERS-001 §4.1
  capturedAt: string                    // ISO — when consent was given
  capturedBy: string                    // staffId or 'PORTAL_SIGNUP'
  source: ConsentSource                 // 'PORTAL_SIGNUP' | 'STAFF_FORM' | 'IMPORT'
}
```

**`NotificationDispatch`**
```ts
{
  id: string                            // 'notif-{nanoid}'
  templateId: string
  templateName: string                  // denormalised for display after template edits
  channel: NotificationChannel
  module: NotificationModule
  recipient: NotificationRecipient
  variables: Record<string, string>     // key:val; PII values are masked in audit view (L3)
  sentAt: string                        // ISO; time recordSent was called
  status: NotificationStatus
  retryCount: number                    // 0..3; see L14
  providerMessageId?: string            // returned by BSP; null until sent
  errorReason?: string                  // last BSP error; populated on failed/retried
  consentSnapshot: NotificationConsentSnapshot  // L18: frozen at recordSent time
  sourceEntityId?: string               // leadId / jobCardId / buildJobId that triggered send
  sourceEntityType?: 'INSURANCE_LEAD' | 'JOB_CARD' | 'BUILD_JOB' | 'CUSTOMER' | 'SALES_ORDER'
}
```

**`NotificationAuditEvent`**
```ts
{
  id: string
  dispatchId: string
  kind: 'sent' | 'delivered' | 'read' | 'failed' | 'consent-blocked' | 'template-rejected' | 'cancelled' | 'retry-queued'
  at: string                            // ISO
  actorId?: string                      // staffId when action is manual
  errorReason?: string                  // populated on failed + template-rejected
}
```

### 4.3 Error classes

```ts
class TemplateNotApprovedError extends Error {
  constructor(templateId: string)       // "Template {id} is not APPROVED or missing dltTemplateId"
}

class DltIdRequiredError extends Error {
  constructor(templateId: string, channel: NotificationChannel)
}

class MissingVariableError extends Error {
  constructor(templateId: string, missingVars: string[])
}

class DispatchNotCancellableError extends Error {
  constructor(dispatchId: string, currentStatus: NotificationStatus)
}
```

---

## §5 — Store contract

Store location: `apps/staff-web/src/lib/notifications/notifications-store.ts`

All actions use Zustand + Immer following the pattern established in `SPEC-INSURANCE-001 §7`.

### 5.1 State shape

```ts
NotificationsState = {
  dispatches: NotificationDispatch[]
  templates: NotificationTemplate[]
  auditEvents: NotificationAuditEvent[]
}
```

### 5.2 Actions

**`recordSent(payload: RecordSentPayload): NotificationDispatch`**
- Validates: template exists and `status === 'APPROVED'` — throws `TemplateNotApprovedError` (L1)
- Validates: for SMS/WhatsApp, `template.dltTemplateId` is non-null — throws `DltIdRequiredError` (L2)
- Validates: all `required` variables present in `payload.variables` — throws `MissingVariableError` (L11)
- Re-checks consent via `payload.consentSnapshot`; if revoked, sets `status: 'opted-out'` and does NOT dispatch (L4)
- Creates `NotificationDispatch` record with `status: 'queued'` (immediately advances to `'sent'` in v1 mock)
- Appends `NotificationAuditEvent { kind: 'sent' }`
- Returns the created record

**`recordStatusUpdate(dispatchId: string, status: NotificationStatus, providerMessageId?: string, errorReason?: string): void`**
- Updates dispatch status + providerMessageId (called by BSP webhook handler in v1.1; called by mock in v1)
- Appends corresponding `NotificationAuditEvent`
- If `status === 'failed'` and `retryCount < 3`: transitions to `queued` + increments `retryCount` + appends `retry-queued` event (L14)
- If `status === 'failed'` and `retryCount === 3`: remains `failed` (terminal)

**`cancelDispatch(dispatchId: string, actor: Actor): void`**
- Validates: `dispatch.status === 'queued'` — throws `DispatchNotCancellableError` otherwise (L8)
- Sets `status: 'cancelled'`
- Appends `NotificationAuditEvent { kind: 'cancelled', actorId: actor.id }`

**`createTemplate(params: CreateTemplateParams): NotificationTemplate`**
- Creates template with `status: 'DRAFT'`
- `dltTemplateId` starts null

**`submitForDlt(templateId: string, actor: Actor): NotificationTemplate`**
- Validates: current status is `DRAFT` or `REJECTED`
- Sets `status: 'PENDING_DLT'`

**`markApproved(templateId: string, dltId: string, actor: Actor): NotificationTemplate`**
- Validates: `dltId` is non-null and non-empty for SMS/WhatsApp templates (L2)
- Sets `status: 'APPROVED'`, `dltTemplateId: dltId`, `approvedAt`, `approvedBy: actor.id`

**`markRejected(templateId: string, rejectionReason: string, actor: Actor): NotificationTemplate`**
- Sets `status: 'REJECTED'`, `rejectionReason`, `rejectedAt`, `rejectedBy: actor.id`
- Appends `NotificationAuditEvent { kind: 'template-rejected' }`

**`editTemplate(templateId: string, patch: EditTemplateParams, actor: Actor): NotificationTemplate`**
- If current `status === 'APPROVED'` (L6):
  - Creates a new template record (clone + apply patch) with `status: 'DRAFT'`
  - Sets old record `status: 'DEPRECATED'`, `supersededBy: newId`
  - Sets new record `supersedes: templateId`
  - Returns new record
- If `status === 'DRAFT'` or `status === 'REJECTED'`: mutates in place, updates `lastUpdatedAt`, `lastUpdatedBy`
- `PENDING_DLT` templates cannot be edited — throws `Error('Template is under DLT review')`
- `DEPRECATED` templates cannot be edited

**`scheduleAnonymisation(dispatchId: string): void`** (L10 — scaffold only in v1)
- Marks the dispatch record with `anonymisationScheduledAt: retentionEnd`
- Does not actually anonymise in v1; backend scheduler handles in v1.1

### 5.3 Selectors

```ts
selectDispatchesByModule(state, module: NotificationModule): NotificationDispatch[]
selectDispatchesByRecipient(state, customerId: string): NotificationDispatch[]
selectTemplatesByModule(state, module: NotificationModule): NotificationTemplate[]
selectApprovedTemplates(state, channel?: NotificationChannel): NotificationTemplate[]
selectFailedDispatches(state): NotificationDispatch[]    // DPO alert feed
selectDispatchPage(state, page: number, filters: DispatchFilters): PaginatedResult<NotificationDispatch>
```

---

## §6 — UI/UX outline

All primitives follow `SPEC-ARCH-UI-001`. Use `Card`, `Field`, `StatTile`, `Badge/chip`, `Dialog`, `Gate`. No local redefinitions.

### 6.1 `/notifications` — central log hub

**KPI strip (StatTile row):**
- Sent today (count)
- Delivery rate (delivered / (sent + delivered + read) as %)
- Opted-out (count, last 7 days)
- Failed (count, last 7 days, amber chip if > 0)

**Filter bar (URL-driven, L9):**
- Module select: ALL / INSURANCE / SERVICE_BOOKING / CUSTOM_BUILDS / CUSTOMERS / STAFF / SALES
- Channel select: ALL / WHATSAPP / SMS / EMAIL / PUSH
- Status select: ALL / queued / sent / delivered / read / failed / opted-out / cancelled
- Date range: `from` / `to` (calendar pickers; default last 30 days)
- Recipient: typeahead resolving to customerId (L9, L15 — never raw phone in URL)
- Active filter chips with individual clear + "Clear all" (L13 empty state CTA)

**Dispatch table columns:**
| Column | Notes |
|---|---|
| Timestamp | `sentAt` formatted as `DD MMM YYYY, HH:mm IST` |
| Channel | chip: WhatsApp (green), SMS (blue), Email (indigo), Push (purple) |
| Template | template name; click → `/notifications/templates/[id]` |
| Recipient | masked: `+91 XXXXX X{last4}` or customer first name |
| Status | chip: colour-coded per status (sent=ink-muted, delivered=success, failed=danger, opted-out=warning) |
| Module | badge: insurance / service / builds / customers |
| Source | link to `sourceEntityId` if present (e.g. "JC-2026-00045") |
| Action | "View" → `/notifications/[id]` |

Page size 50, URL-driven pagination (L12). Empty state per L13.

### 6.2 `/notifications/[id]` — dispatch detail

Single-column layout:

- **Header card**: status chip · channel chip · module badge · sent timestamp · retry count (if > 0)
- **Template card**: template name · DLT ID (if present) · body rendered with variable substitution (actual values filled in, PII masked per L3)
- **Recipient card**: masked phone · first name · link to `/customers/[id]` if `customerId` present
- **Consent card** (L18): purpose · capturedAt · capturedBy · source
- **Delivery timeline**: `NotificationAuditEvent` list, newest first — status transitions, retry attempts, failures
- **Source link card** (if `sourceEntityId`): "Triggered by [JC-2026-00045]" with link

Role gate: same as parent route.

### 6.3 `/notifications/templates` — registry

**Filter bar:** module, channel, status, search by name.

**Template table columns:** name · module · channel · DLT ID (truncated or "—") · status chip · variables count · last updated · action (view/edit).

**"New Template" CTA** — gated R12+.

### 6.4 `/notifications/templates/[id]` — template detail

- **Header**: template name · status chip · channel chip · module badge
- **DLT section**: DLT ID field (editable by R12+ when APPROVED/editing) · proof doc reference (scaffold placeholder) · status workflow buttons:
  - DRAFT/REJECTED: "Submit for DLT review" (R12+)
  - PENDING_DLT: "Mark Approved" (enter DLT ID) · "Mark Rejected" (enter reason)
  - APPROVED: "Edit Template" CTA → triggers L6 version fork
- **Body preview**: rendered with example variable values filled in from `variables[].example`
- **Variable table**: name · type · required indicator · example
- **Version history**: predecessor chain (if `supersedes` or `supersededBy` set); link to deprecated version
- **Send history sparkline**: dispatches per day (last 30 days) using a minimal SVG bar chart

### 6.5 `/notifications/templates/new` — create template

Form fields: module, channel, name, subject (EMAIL only), body (textarea with `{{variable}}` syntax highlighted), variable builder (add/remove variables with name + type + required toggle), proof doc upload (optional in v1).

On submit: `createTemplate(params)` → redirect to `/notifications/templates/[id]` with success toast.

### 6.6 `/notifications/audit` — DPO view

Gated R23 only (hard Gate; no fallback render for lower roles — 403 redirect to `/notifications`).

**Export CTA**: "Export DSR bundle for customer" — opens `ExportDsrDialog` with customer typeahead. On confirm: calls `selectDispatchesByRecipient`, serialises to CSV per L7, triggers browser download.

**Table**: same columns as central log but with full PII visible (R23 exception to L3). Additional column: consent snapshot (purpose · capturedAt).

**Failed dispatches alert section**: any dispatches with `status: 'failed'` (terminal) listed at top with amber banner. "Acknowledge" button marks a `NotificationAuditEvent { kind: 'acknowledged-by-dpo' }`.

---

## §7 — RBAC matrix

| Action | Minimum Role | Notes |
|---|---|---|
| View `/notifications` (own city) | R10 | City-scoped by default |
| View `/notifications` (all cities) | R02 | GM / CFO / CEO |
| View `/notifications/[id]` | R10 | Same gate as index |
| View `/notifications/templates` | R10 | Read-only for R10/R11 |
| Create / edit templates | R12 | Marketing Manager+ |
| Submit template for DLT | R12 | |
| Mark template approved / rejected | R12 | With DLT ID entry |
| Cancel a queued dispatch | R12 | L8 |
| View `/notifications/audit` | R23 | DPO only; others → 403 |
| Export DSR bundle | R23 | L7 |

Gate usage: `<Gate role={['R12', 'R13', 'R19', 'R22', 'R24']} fallback="hide">` for edit CTAs. `<Gate role={['R23']} fallback={<Redirect to="/notifications" />}>` for audit route.

---

## §8 — Cross-module wiring

This module introduces four new seams (26–29). Each is registered in `specs/architecture/cross-module-wiring.md`.

### Seam 26 — Insurance → Notifications

**When:** `sendTemplateMessage` in `insurance-store/slices/whatsapp-slice.ts` succeeds (after the BSP call returns a `messageId`).

**Call:**
```ts
// After BSP returns messageId (existing logic), add:
try {
  useNotificationsStore.getState().recordSent({
    templateId,          // insurance WhatsApp template id → map to notifications template
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: recipientId },
    variables,
    consentSnapshot,     // read from customers-store.getConsentSnapshot(recipientId, 'WHATSAPP_MARKETING')
    sourceEntityId: leadId,
    sourceEntityType: 'INSURANCE_LEAD',
  });
} catch { /* L17: best-effort; log gap does not block insurance dispatch */ }
```

**Note:** In v1.1, the DLT/approval guard in `whatsapp-slice.ts` is removed; it migrates to `notifications-store.recordSent`. In v1 both checks run (belt and braces).

### Seam 27 — Service Booking → Notifications

**When:** `confirmPortalBooking`, `createPortalBooking`, and `declinePortalBooking` in `service-store.ts` replace their `console.log('[DLT STUB] ...')` calls with:
```ts
try {
  useNotificationsStore.getState().recordSent({
    templateId: 'DLT_SVC_BOOKING_CREATED' | 'DLT_SVC_BOOKING_CONFIRMED' | 'DLT_SVC_BOOKING_DECLINED',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: jc.customerId },
    variables: { job_no: jc.jobNo, outlet: jc.outlet, date: jc.scheduledDate ?? '' },
    consentSnapshot,
    sourceEntityId: jc.id,
    sourceEntityType: 'JOB_CARD',
  });
} catch { /* L17 */ }
```

**Pre-condition:** The three service booking DLT template fixtures (`DLT_SVC_BOOKING_*`) must be seeded in the notifications store with `status: 'APPROVED'` and mock `dltTemplateId` values.

### Seam 28 — Custom Builds → Notifications

**When:** Stage transitions that trigger customer-facing communication (e.g. `APPROVED → PARTS_ORDERING` — "your build has been approved", `READY_FOR_DELIVERY` — "your build is ready") in `job-slice.ts`.
```ts
try {
  useNotificationsStore.getState().recordSent({
    templateId: 'DLT_CB_STAGE_UPDATE',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: job.customerId },
    variables: { job_title: job.title, stage: next, estimated_date: '' },
    consentSnapshot,
    sourceEntityId: job.id,
    sourceEntityType: 'BUILD_JOB',
  });
} catch { /* L17 */ }
```

### Seam 29 — Customers → Notifications

**When:** `customers-store` dispatches consent-confirmation or data-processing notifications (e.g. after `createCustomer` with DPDP consent captured, or after `withdrawConsent` — sending a withdrawal acknowledgement per Doc 03 §10).
```ts
try {
  useNotificationsStore.getState().recordSent({
    templateId: 'DLT_CUST_CONSENT_CONFIRMED' | 'DLT_CUST_CONSENT_WITHDRAWN',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: id },
    variables: { customer_name: name },
    consentSnapshot,
    sourceEntityId: id,
    sourceEntityType: 'CUSTOMER',
  });
} catch { /* L17 */ }
```

---

## §9 — Scenarios

**S-N-1 — Central log default view (happy path)**
- Given: R10 at BLR-01 navigates to `/notifications`
- Then: KPI strip shows today's sent count, delivery rate %, opted-out count, failed count
- And: dispatch table renders 50 rows ordered `sentAt DESC`, phone numbers masked, module badge visible
- And: URL is `/notifications` (no params — defaults to last 30 days, all modules, all channels)

**S-N-2 — Module filter narrows correctly**
- Given: R10 applies `?module=INSURANCE&channel=WHATSAPP`
- Then: only insurance WhatsApp dispatches render
- And: URL reflects the filter params
- And: removing the module chip resets to all modules

**S-N-3 — Customer revokes WhatsApp consent → next send logs opted-out**
- Given: `cust-arjun-mehta` revokes `WHATSAPP_MARKETING` consent (per SPEC-CUSTOMERS-001 S-C-10)
- When: `recordSent` is called with `module: 'INSURANCE'` and `recipient.customerId: 'cust-arjun-mehta'`
- Then: the `consentSnapshot` check detects `revokedAt !== null` (L4)
- And: a `NotificationDispatch` record is created with `status: 'opted-out'`
- And: no WhatsApp message is delivered to the customer
- And: the dispatch appears in the central log with status chip "Opted-out"

**S-N-4 — Free-text send attempt blocked at boundary (L1)**
- Given: a module attempts to call `recordSent` with a `templateId` that has `status: 'DRAFT'`
- Then: `recordSent` throws `TemplateNotApprovedError`
- And: no `NotificationDispatch` record is created
- And: the error is surfaced as an error toast in the calling module's UI

**S-N-5 — R12 edits an APPROVED template → version fork (L6)**
- Given: template `tmpl-svc-booking-confirmed` has `status: 'APPROVED'`, `dltTemplateId: 'DLT0001234567890'`
- When: R12 opens the template and edits the body text
- Then: `editTemplate(id, patch, actor)` creates a new template record with `status: 'DRAFT'`
- And: the original record is set to `status: 'DEPRECATED'`, `supersededBy: newId`
- And: the template registry shows the new DRAFT version with a "Supersedes v1" link
- And: the old APPROVED version is still viewable (read-only) with "Deprecated" chip

**S-N-6 — R23 (DPO) exports DSR bundle for a customer (L7)**
- Given: R23 navigates to `/notifications/audit`
- When: R23 clicks "Export DSR bundle", searches for "Arjun Mehta", selects `cust-arjun-mehta`
- Then: `selectDispatchesByRecipient('cust-arjun-mehta')` runs
- And: a `.csv` file is downloaded containing all dispatch records for that customer
- And: the CSV contains `consentSnapshot.purpose`, `consentSnapshot.capturedAt`, and redacted PII (`[redacted]` for variable values that are phone/name)
- And: R23 sees full phone and name in the audit table (L3 DPO exception)
- And: a `NotificationAuditEvent { kind: 'dsr-export', actorId: r23.id }` is appended

**S-N-7 — Failed dispatch retries 3 times then terminates (L14)**
- Given: a dispatch has `status: 'sent'` and the BSP returns an error
- When: `recordStatusUpdate(id, 'failed', undefined, 'BSP_TIMEOUT')` is called for the first time
- Then: `retryCount` increments to 1, status becomes `queued`, `retry-queued` audit event appended
- When: two more failures follow (retryCount 2, then 3)
- Then: on the third failure, status transitions to terminal `failed` (no more retry)
- And: the dispatch appears in the DPO audit view's "Failed dispatches" section with amber banner
- And: a toast is shown on `/notifications` for R12+ alerting of the terminal failure

**S-N-8 — Missing required variable blocked at dispatch (L11)**
- Given: template `DLT_SVC_BOOKING_CONFIRMED` has variable `{ name: 'job_no', required: true }`
- When: `recordSent` is called with `variables: {}` (missing `job_no`)
- Then: `MissingVariableError('DLT_SVC_BOOKING_CONFIRMED', ['job_no'])` is thrown
- And: no dispatch record is created
- And: the error is logged with `NotificationAuditEvent { kind: 'failed', errorReason: 'MissingVariableError: job_no' }`

**S-N-9 — Attempting to approve SMS template without DLT ID (L2)**
- Given: template `DLT_SVC_BOOKING_CREATED` has `channel: 'SMS'` and `status: 'PENDING_DLT'`
- When: R12 calls `markApproved(templateId, '')` (empty DLT ID)
- Then: `DltIdRequiredError` is thrown
- And: the template remains in `PENDING_DLT` status
- And: an inline form error renders on the approval dialog: "DLT template ID is required for SMS templates (Doc 09 §DLT)"

**S-N-10 — Cancel a queued dispatch (L8)**
- Given: dispatch `notif-xyz` has `status: 'queued'`
- When: R12 clicks "Cancel dispatch" and confirms the `AlertDialog`
- Then: `cancelDispatch('notif-xyz', actor)` sets `status: 'cancelled'`
- And: a `NotificationAuditEvent { kind: 'cancelled', actorId: r12.id }` is appended
- And: the dispatch table shows "Cancelled" status chip

**S-N-11 — Attempting to cancel a sent dispatch (L8)**
- Given: dispatch `notif-abc` has `status: 'sent'`
- When: R12 attempts to cancel
- Then: `DispatchNotCancellableError` is thrown
- And: the "Cancel" CTA is hidden (not merely disabled) for non-queued dispatches in the UI

**S-N-12 — Non-R23 role cannot access `/notifications/audit`**
- Given: viewer has role R10 (City Operations)
- When: R10 navigates to `/notifications/audit`
- Then: `<Gate role={['R23']} fallback={<Redirect>}>` redirects to `/notifications`
- And: no audit data is exposed to R10

**S-N-13 — Recipient filter by customerId (L9, L15)**
- Given: R10 types "Arjun" in the recipient typeahead
- Then: typeahead resolves to `cust-arjun-mehta` and writes `?recipient=cust-arjun-mehta` to the URL
- And: the URL bar contains `customerId` only — no phone number, no raw name
- And: the table filters to only that customer's dispatches

**S-N-14 — PII redaction in central log for non-DPO role (L3)**
- Given: R10 views the `/notifications` table
- Then: phone numbers render as `+91 XX XXX XX{last4}`
- And: customer names render as first name only (e.g. "Arjun" not "Arjun Mehta")
- And: email addresses in variable values render as `a***@***.com`

**S-N-15 — Template approval workflow end-to-end (L16)**
- Given: R12 creates a new WhatsApp template with body "Dear {{customer_name}}, your booking is confirmed." and submits for DLT review
- Then: status transitions DRAFT → PENDING_DLT
- When: R12 enters `dltTemplateId: 'DLT1234567890123'` and clicks "Mark Approved"
- Then: `markApproved(id, 'DLT1234567890123', actor)` runs; status → APPROVED
- And: the template is now selectable in any module that calls `recordSent`

---

## §10 — Acceptance criteria

All criteria must be verifiable by re-running the scenarios in §9 against the implementation.

1. **AC-N-1**: `recordSent` throws `TemplateNotApprovedError` for any template with `status !== 'APPROVED'` — no dispatch record is created (S-N-4, L1)
2. **AC-N-2**: `recordSent` for an opted-out customer creates a dispatch record with `status: 'opted-out'` and does not invoke the BSP (S-N-3, L4)
3. **AC-N-3**: Editing an APPROVED template via `editTemplate` produces a new DRAFT record; the original is DEPRECATED with `supersededBy` set (S-N-5, L6)
4. **AC-N-4**: `/notifications/audit` renders a 403 redirect (via Gate) for any role below R23 (S-N-12)
5. **AC-N-5**: DSR export CSV for a customerId contains `consentSnapshot` fields and PII variables rendered as `[redacted]` (S-N-6, L7)
6. **AC-N-6**: Terminal `failed` dispatch (after 3 retries) appears in the DPO alert section; a toast renders on `/notifications` for R12+ (S-N-7, L14)
7. **AC-N-7**: `markApproved` with empty `dltTemplateId` on SMS/WhatsApp template throws `DltIdRequiredError` (S-N-9, L2)
8. **AC-N-8**: Dispatch with `status !== 'queued'` cannot be cancelled — `DispatchNotCancellableError` thrown; "Cancel" CTA not rendered in the UI (S-N-11, L8)
9. **AC-N-9**: URL never contains raw phone numbers; `?recipient=` contains only customerId (S-N-13, L9, L15)
10. **AC-N-10**: Non-R23 viewers see masked phone `+91 XX XXX XX{last4}` and first-name-only in all dispatch rows (S-N-14, L3)
11. **AC-N-11**: `pnpm -F staff-web typecheck` exits 0 with notifications module in place
12. **AC-N-12**: All four cross-module seams (26–29) registered in `cross-module-wiring.md` before any store import is added
13. **AC-N-13**: Every user-visible string passes through `next-intl`; keys present in both `en-IN.json` and `hi-IN.json`
14. **AC-N-14**: No `text-[NNpx]` or `rounded-lg`/`rounded-xl` in new components (CLAUDE.md §10 items 12–13)
15. **AC-N-15**: Every CTA is wired — no silent no-ops; deferred actions show an explicit `info` toast or "coming in v1.1" notice

---

## §11 — Component tree (LoC caps)

```
apps/staff-web/src/components/notifications/
  notifications-hub-view.tsx              ≤200   (KPI strip + filter bar + dispatch table)
  notifications-filter-bar.tsx            ≤160   (URL-driven filters; L9 typeahead)
  notifications-table.tsx                 ≤200   (50-row table + pagination)
  notifications-dispatch-row.tsx          ≤100   (single row; masked PII; status chip)
  dispatch-detail-view.tsx                ≤220   (template card + recipient + consent + timeline)
  dispatch-delivery-timeline.tsx          ≤120   (audit events list; newest first)
  templates/
    template-registry-view.tsx            ≤180   (filter + table of all templates)
    template-detail-view.tsx              ≤240   (header + DLT section + body preview + variables + history)
    template-create-form.tsx              ≤200   (new template wizard)
    template-status-workflow.tsx          ≤140   (submit/approve/reject buttons + DLT ID input)
    template-variable-builder.tsx         ≤120   (add/remove variable rows)
    template-send-sparkline.tsx           ≤80    (SVG bar chart; last 30 days)
    template-version-chain.tsx            ≤100   (predecessor / successor links)
  audit/
    audit-view.tsx                        ≤200   (R23-gated; full PII table; failed alerts)
    export-dsr-dialog.tsx                 ≤140   (customer typeahead + export CTA)
    failed-dispatches-alert.tsx           ≤100   (amber banner + list + acknowledge button)
  dialogs/
    cancel-dispatch-dialog.tsx            ≤100   (AlertDialog + confirm button)
    mark-approved-dialog.tsx              ≤120   (DLT ID input + proof doc placeholder)
    mark-rejected-dialog.tsx             ≤100   (rejection reason textarea)
```

All files ≤350 LoC; most are tightly sized per Doc 15 conventions.

---

## §12 — Fixtures

Location: `packages/mocks/src/fixtures/notifications.ts`

Seed data must cover:

- 40 `NotificationDispatch` records across all 4 modules, 3 channels (WHATSAPP/SMS/EMAIL), all 7 statuses — including at least 2 `opted-out`, 2 `failed` (terminal), 1 `cancelled`, 1 `queued`
- `consentSnapshot` populated on every dispatch; 3 records with `purpose: 'WHATSAPP_MARKETING'` and a matching revocation in the consent log
- 12 `NotificationTemplate` fixtures:
  - 3 APPROVED WhatsApp (INSURANCE module): renewal-reminder, policy-quote, campaign-promo
  - 3 APPROVED SMS (SERVICE_BOOKING): booking-created, booking-confirmed, booking-declined
  - 2 APPROVED WhatsApp (CUSTOM_BUILDS): stage-update, delivery-ready
  - 2 APPROVED SMS (CUSTOMERS): consent-confirmed, consent-withdrawn
  - 1 PENDING_DLT (INSURANCE): new WhatsApp template awaiting DLT ID
  - 1 DEPRECATED (SERVICE_BOOKING): superseded by booking-confirmed v2 (version chain demo)
- 3 customers linked to dispatches: `cust-arjun-mehta` (WHATSAPP_MARKETING revoked), `cust-meera-iyer` (active consent), `cust-rohan-desai` (opted-out via portal)
- Mock DLT IDs follow the format `DLT{16 digits}` per Doc 09 §DLT naming convention

---

## §13 — Phase plan

### P1 — Central log + template registry (this spec)

- `notifications-store.ts` with all actions + selectors
- `/notifications` hub + filter bar + dispatch table
- `/notifications/[id]` dispatch detail
- `/notifications/templates` registry
- `/notifications/templates/[id]` template detail + status workflow
- `/notifications/templates/new` create form
- Cross-module wiring stubs (seams 23–26 — each module's `recordSent` call)
- Fixtures (§12)
- Unit tests (§14)

### P2 — DPO audit view + DSR export

- `/notifications/audit` with Gate(R23)
- `ExportDsrDialog` + CSV generation
- Failed-dispatch alert section
- Anonymisation scheduler scaffold (L10)
- Integration tests for seams 23–26

### P3 — v1.1 canonical dispatch path (deferred)

See DEF-NOTIF-1 in §22.

---

## §14 — Test plan

Test locations per `CLAUDE.md §10 item 9` convention:

**Store / pure-logic tests** → `apps/staff-web/src/lib/notifications/__tests__/`

| Test file | What it covers |
|---|---|
| `notifications-store.test.ts` | `recordSent` happy path; `TemplateNotApprovedError`; `DltIdRequiredError`; `MissingVariableError`; opt-out suppression (L4); consent snapshot frozen (L18) |
| `template-actions.test.ts` | `editTemplate` APPROVED → version fork (L6); `markApproved` DLT ID validation (L2); `submitForDlt` state guards; `markRejected` |
| `dispatch-lifecycle.test.ts` | `cancelDispatch` queued vs sent (L8); `recordStatusUpdate` retry backoff (L14); terminal `failed` after 3 retries |
| `selectors.test.ts` | `selectDispatchesByRecipient`; `selectApprovedTemplates`; `selectFailedDispatches`; `selectDispatchPage` pagination |

**Cross-module integration tests** → `apps/staff-web/src/tests/`

| Test file | What it covers |
|---|---|
| `notifications-insurance-seam.test.ts` | Seam 23: insurance dispatch → `recordSent` called; opted-out suppression end-to-end |
| `notifications-service-seam.test.ts` | Seam 24: `confirmPortalBooking` → `recordSent` with correct module/template |
| `notifications-custom-builds-seam.test.ts` | Seam 25: stage transition → `recordSent` |
| `notifications-customers-seam.test.ts` | Seam 26: `createCustomer` + consent notification → `recordSent` |

Minimum: 1 integration test per scenario in §9 (S-N-1 through S-N-15). Target: ≥ 40 unit tests + 8 integration tests.

---

## §15 — i18n keys

All user-visible strings via `next-intl`. Key namespace: `notifications.*`.

Representative keys (non-exhaustive):
```json
{
  "notifications.hub.kpi.sentToday": "Sent today",
  "notifications.hub.kpi.deliveryRate": "Delivery rate",
  "notifications.hub.kpi.optedOut": "Opted-out (7d)",
  "notifications.hub.kpi.failed": "Failed (7d)",
  "notifications.hub.empty.heading": "No notifications dispatched in this period",
  "notifications.hub.empty.body": "Widen the date range or remove some filters to see more results",
  "notifications.hub.empty.cta": "Clear all filters",
  "notifications.templates.dlt.required": "DLT template ID is required for {{channel}} templates (Doc 09 §DLT)",
  "notifications.templates.status.pendingDlt": "Pending DLT",
  "notifications.templates.status.deprecated": "Deprecated",
  "notifications.dispatch.status.optedOut": "Opted-out",
  "notifications.dispatch.status.cancelled": "Cancelled",
  "notifications.audit.exportCta": "Export DSR bundle",
  "notifications.audit.failedAlert.heading": "Failed dispatches require DPO review",
  "notifications.dispatch.cancel.confirm": "Cancel this dispatch?",
  "notifications.dispatch.cancel.success": "Dispatch cancelled"
}
```

Both `messages/en-IN.json` and `messages/hi-IN.json` must contain all keys (English fallback acceptable for hi-IN until translator pass).

---

## §16 — Non-functional considerations

Per Doc 12 NFR targets:

- **Latency:** `/notifications` with 50 rows must render in < 200 ms on a mid-range device (data from Zustand in-memory store; no network in v1). Pagination via array-slice.
- **Accessibility:** keyboard nav on all tables + filter bar; focus rings; color contrast AA minimum; reduced-motion respected on status chip transitions.
- **Mobile-first:** staff surface is desktop-first per CLAUDE.md §10 item 4 — `/notifications` is designed for 1280px+ but must not break at 768px (tablet).
- **Security:** PII never concatenated into toast messages or error logs (CLAUDE.md §12). `MissingVariableError` message includes variable names only — no variable values.

---

## §17 — Doc citations

| Requirement | Doc reference |
|---|---|
| DLT template pre-registration mandate | Doc 09 §DLT |
| No free-text SMS/WhatsApp | Doc 09 §DLT; CLAUDE.md §9 |
| WhatsApp BSP integration contract | Doc 13 §2 |
| DLT SMS provider integration | Doc 13 §DLT SMS |
| DPDP consent + purpose limitation | Doc 03 §10; DPDP Act 2023 |
| DSR §11 right of access | DPDP Act 2023 §11 |
| DSR §13 right to erasure | DPDP Act 2023 §13 |
| Audit retention period | Doc 06 §retention |
| Role / permission matrix | Doc 14 |
| Canonical UI patterns | SPEC-ARCH-UI-001 |
| BSP retry policy | Doc 13 §2 |
| Insurance DLT enforcement (L13, L14) | SPEC-INSURANCE-001 L13, L14 |
| Consent entry shape | SPEC-CUSTOMERS-001 §4.1 |
| Cross-store wiring rule | CLAUDE.md §5; cross-module-wiring.md |
| Spec template + lifecycle | Doc 15; CLAUDE.md §6 |

---

## §18 — Deferred items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-NOTIF-1 | **v1.1 canonical dispatch path** — `notifications-store.dispatch()` replaces per-module dispatch logic; modules delegate entirely | P3 | Requires backend job queue (BSP calls must be server-side). Each module's slice dispatch logic migrates here. Template management also centralises. |
| DEF-NOTIF-2 | **Push notification channel** — PUSH enum value is scaffolded; no dispatch logic in v1 | P3 | Depends on FCM/APNs integration (Doc 13 §Push — deferred). |
| DEF-NOTIF-3 | **Proof-of-approval document upload** — `proofDocRef` field is placeholder only | P2 | Requires file upload infrastructure (S3 presigned URLs). Becomes mandatory in v1.1 per DLT compliance hardening. |
| DEF-NOTIF-4 | **Per-outlet DLT sender ID management** — BLR/MUM/CHE may have distinct registered sender IDs | P2 | Current model uses a single sender ID per channel. Multi-outlet sender ID routing is a v1.1 concern. |
| DEF-NOTIF-5 | **Real BSP/SMS provider wire-up** — mock handlers throughout v1 | P3 | Wire-up is per-outlet rollout work (see next-themes.md §Out-of-scope). |
| DEF-NOTIF-6 | **Anonymisation scheduler activation** — scaffolded in `scheduleAnonymisation`; backend cron activates in v1.1 | P2 (regulatory) | 7-year retention window means first scheduled runs are far out, but the scheduler must be present before go-live. |
| DEF-NOTIF-7 | **In-app notification bell + unread badge** — separate surface (not a comms log feature) | P2 | Different product surface — in-app real-time alerts. Scoped out from this spec. |
| DEF-NOTIF-8 | **SMS channel in `/notifications` filter for service booking** — currently three console.log stubs | P1 | Wire seam 24 as part of P1 implementation; the stubs already exist in `service-store.ts`. |

---

## §19 — Open questions

| # | Question | Default if unresolved | Who must decide |
|---|---|---|---|
| OQ-1 | Should the notifications store use a separate Zustand instance or be a slice on an existing store? | Separate store (`notifications-store.ts`) — follows pattern of other domain stores | Architect |
| OQ-2 | For the template `module` field — should templates be shared across modules (e.g. a generic "welcome" template reused by Customers + Custom Builds) or strictly module-scoped? | Module-scoped in v1; sharing deferred to v1.1 via a `modules: NotificationModule[]` field | Product owner |
| OQ-3 | When `editTemplate` forks an APPROVED template, should the DLT ID from the original template pre-fill the new DRAFT's proof doc field? | No pre-fill — the DLT ID is specific to the registered body text; any body change requires fresh registration | Regulatory / DLT BSP contract |
| OQ-4 | What is the exact `ConsentPurpose` mapping for Custom Builds customer-facing notifications? Per SPEC-CUSTOMERS-001 §4.1, the available purposes are `WHATSAPP_MARKETING`, `EMAIL_MARKETING`, `SERVICE_REMINDER`, `DATA_PROCESSING`, `INSURANCE_MARKETING`. None is labelled `CUSTOM_BUILD_UPDATE`. | Use `DATA_PROCESSING` for build-stage notifications (broadest lawful basis) until a dedicated purpose is added | Legal / DPO |

---

## §20 — Spec drift detection

Run a drift audit before any P2 work begins:

```
You are doing a SPEC DRIFT AUDIT for module notifications. Research only — DO NOT modify any files.

Spec: specs/modules/notifications/01-notifications-module.md
Code surface: apps/staff-web/src/lib/notifications/, apps/staff-web/src/components/notifications/, apps/staff-web/app/(shell)/notifications/

For each L-tag in the spec (L1–L18), grep the code for evidence the decision is honored or contradicted.
For each scenario in §9 (S-N-1 through S-N-15), find the matching implementation.
For each store action in §5.2, verify it exists with the documented signature.

Output three sections:
1. Documented but NOT implemented
2. Implemented but NOT documented
3. Divergences (spec says X, code does Y; cite file:line)

End with: "Recommended doc updates" — top 5 items to fix, prioritised.
```

---

## §21 — Production-grade checklist

Per CLAUDE.md §17:

- [ ] DoD §10 items 1–15 all pass
- [ ] `recordSent` boundary validates L1 (template APPROVED), L2 (DLT ID for SMS/WA), L4 (consent re-check), L11 (required variables) — all four guards active
- [ ] Every CTA wired — no silent no-ops; DEF-NOTIF-3 (proof doc) shows explicit "coming in v1.1" notice
- [ ] Empty / loading / error / success states present on all routes
- [ ] RBAC gates use `Gate` primitive — no inline `hasRank` in JSX
- [ ] All user-visible strings via `next-intl`
- [ ] No `any` without `// reason:` comment
- [ ] No `text-[NNpx]`, no `rounded-lg/xl` outside approved exceptions
- [ ] Card / Field / Dialog / StatTile from `SPEC-ARCH-UI-001` — no local redefinitions
- [ ] PII never concatenated into logs / toasts / error messages
- [ ] Unit tests: ≥ 40; integration tests: ≥ 8; no new test suite failures
- [ ] `pnpm -F staff-web typecheck` exits 0
- [ ] Cross-module seams 23–26 registered in `cross-module-wiring.md`
- [ ] Spec changelog updated if behavior changes during implementation

---

## §22 — Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-29 | 1.0 | orchestrator | Initial spec — SPEC-NOTIFICATIONS-001. Covers central log, DLT template registry, DPO audit view, notifications-store contract, 4 cross-module wiring seams (23–26), 15 scenarios, 15 acceptance criteria, 8 deferred items. Status: approved. |
