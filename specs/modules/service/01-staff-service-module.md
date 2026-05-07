---
spec_id: SPEC-SERVICE-001
domain: service
title: Staff Service Module (bay board + job cards + inspections + warranty)
status: draft
risk_level: high
pii_sensitivity: medium
flags: [staff.service.v1]
owners: [planner, ux-writer, qa-planner, integrator]
depends_on:
  - SPEC-PLATFORM-001 (app shell + primitives)
  - SPEC-INVENTORY-002 (vehicles fixture reuse)
  - SPEC-SALES-001 (customer fixture reuse)
docs_consulted:
  - Doc 02 §Service (v1 feature list)
  - Doc 05 §Service Advisor Console, §Job Card, §VHC, §Parts, §Warranty
  - Doc 06 §GST (service invoice margin vs full-value)
  - Doc 09 (Glossary — RO, Job Card, VHC, Bay)
  - Doc 11 §JobCardStateMachine
  - Doc 14 §R09 Service Advisor, §R11 Workshop Technician, §R13 Parts Manager, §R19 GM
  - Design 03 Screen 6 (Service bay board + Job card detail)
  - Design 04 Component patterns (authoritative for cards, tabs, kanban)
  - Stitch screens (15): service_job_card_board_dark/_light, service_job_card_detail_in_progress_dark/_light, service_job_card_detail_inspection_tab_dark/_light, service_job_card_detail_parts_tab_dark/_light, service_job_card_detail_timeline_tab_dark/_light, service_job_card_detail_invoice_preview_dark/_light, service_job_card_ready_for_delivery, service_new_appointment, service_warranty_claim
effective_date: 2026-04-17
---

# SPEC-SERVICE-001 — Staff Service Module

## 1. Summary

Service advisor and workshop console. Covers bay scheduling, job card lifecycle (Received → Diagnosed → In Progress → QC → Ready for Delivery), 210-point vehicle health check (VHC) inspection, parts requisitions, service invoice with margin-scheme GST, and warranty claim workflow.

14 Stitch screens map to 4 main routes + 6 tabs on the job card detail + 2 standalone flows.

## 2. Routes

| Route | Description |
|-------|-------------|
| `/service` | Service landing with 4 tabs: Bay Board (default) / Appointments / Job Cards / Warranty Claims |
| `/service/jobcards/[id]` | Job card detail with 6 tabs (Overview, Labour, Parts, Inspection, Timeline, Invoice Preview) |
| `/service/appointments/new` | New appointment / "Initialize Protocol" form |
| `/service/warranty/new` | New warranty claim form |
| `/service/jobcards/[id]/ready-for-delivery` | Special state view (alternate render, not a different route in v1) |

Default route `/service` renders Bay Board tab. Tab switching via URL search param `?view=appointments|jobcards|warranty`.

## 3. Job card state machine (per Doc 11)

```
RECEIVED → DIAGNOSED → IN_PROGRESS → QC → READY_FOR_DELIVERY → DELIVERED
                                  ↓                                ↓
                           WAITING_PARTS                    REOPENED (rework)
                                  ↓                                ↓
                          ADDITIONAL_WORK_APPROVAL           → IN_PROGRESS
```

Any non-DELIVERED state → **CANCELLED** (R19+).

- **RECEIVED** — vehicle arrived, job card created
- **DIAGNOSED** — advisor inspected, scope finalized
- **IN_PROGRESS** — active work by technician
- **WAITING_PARTS** — blocked on parts arrival (side state)
- **ADDITIONAL_WORK_APPROVAL** — discovered additional work, awaiting customer approval (side state)
- **QC** — quality check before handover
- **READY_FOR_DELIVERY** — passed QC, awaiting customer pickup
- **DELIVERED** — vehicle handed over, closed
- **CANCELLED** — terminal. Reachable from any non-DELIVERED state via "Cancel Job Card" action (R19+ only). Requires type-to-confirm and reason.
- **REOPENED** — warranty-rework side state. Reachable from DELIVERED via "Reopen for Rework" (R19+). Auto-advances to IN_PROGRESS after a `reopened` timeline event is emitted, preserving the original job card history.

### Transition table (authoritative — implemented in `apps/staff-web/src/lib/service/state-machine.ts`)

| From | Allowed next | Role gate |
|---|---|---|
| RECEIVED | DIAGNOSED, CANCELLED | R09+ / R19+ for cancel |
| DIAGNOSED | IN_PROGRESS, WAITING_PARTS, CANCELLED | R09+ / R19+ |
| IN_PROGRESS | WAITING_PARTS, ADDITIONAL_WORK_APPROVAL, QC, CANCELLED | R09+ |
| WAITING_PARTS | IN_PROGRESS, CANCELLED | R09+ |
| ADDITIONAL_WORK_APPROVAL | IN_PROGRESS, DIAGNOSED, CANCELLED | R09+ |
| QC | IN_PROGRESS (rework), READY_FOR_DELIVERY | R09+ |
| READY_FOR_DELIVERY | DELIVERED, IN_PROGRESS (rework), CANCELLED | R19+ for deliver |
| DELIVERED | REOPENED | R19+ only |
| REOPENED | IN_PROGRESS | automatic |
| CANCELLED | — | terminal |

### Bay side-effects on transition

The job card and the bay it occupies are kept in sync automatically. The store's `setJobCardStatus` / `cancelJobCard` actions handle these side-effects:

| Transition target | Bay behaviour |
|---|---|
| DELIVERED | **Auto-free.** `bay.status = 'FREE'`, `bay.currentJobCardId = undefined`, `jc.bayId = undefined`. Emits a `bay_freed` timeline event (`metadata.reason = 'delivered'`). |
| CANCELLED | **Auto-free.** Same as DELIVERED. Reason recorded in the cancellation event. |
| READY_FOR_DELIVERY | Bay stays OCCUPIED — the vehicle is parked awaiting customer pickup. |
| REOPENED → IN_PROGRESS | Bay is NOT re-grabbed automatically. Must be re-assigned via More Actions → Move Bay. |
| All other transitions | No bay side-effect. |

## 4. Bay board (`/service` default)

Reference: Stitch `service_job_card_board_dark`

**Layout:**
- Page header: "Service" Inter 28/600 left, "New Job Card" primary button right
- Tab row: Bay Board (default) · Appointments · Job Cards · Warranty Claims (canonical tab pattern from design doc §2)
- Filter bar: filter button + "New Appointment" secondary button right
- Bay grid: 4 columns × 2 rows = 8 bays
- Below grid: "Upcoming Appointments" table

**Bay card (per spec):**
- Container: `rounded-md border border-line bg-bg-surface p-4` (standard card per design doc §1)
- If OCCUPIED:
  - Top border colored by state: in-progress=accent-blue, waiting-parts=warning-amber, qc=blue, diagnosed=stale-grey
  - "BAY N" mono 12px top-left + status chip top-right
  - Vehicle name Inter 14/500
  - Mono VIN masked
  - Technician row: initials avatar + name + "Started HH:MM · ETA HH:MM"
  - Thin progress bar below showing % complete
- If EMPTY:
  - Dashed border instead of solid: `border-dashed border-line-strong`
  - Centered "Available" text + "+ Assign Job" ghost button

**Upcoming Appointments table** (below grid, canonical DataTable):
- Columns: Time | Customer | Service & VIN | Service Type | Advisor | Status
- Time column bolded mono
- Service Type uses StateChip

## 5. Job card detail (`/service/jobcards/[id]`)

Reference: Stitch `service_job_card_detail_in_progress_dark` + all 6 tab variants

### 5.1 Page header (sticky)

- Breadcrumb: Service / Job Cards / JC-2026-0341
- Left: Job card number mono 16/500 "JC-2026-0341" + Status chip "In Progress" (blue) + Bay badge "BAY 3"
- Right: Primary action based on state:
  - `received` → "Start Diagnosis" (primary)
  - `diagnosed` → "Begin Work" (primary)
  - `in-progress` → "Start QC" (primary)
  - `qc` → "Mark Ready" (primary)
  - `ready-for-delivery` → "Mark Delivered" (primary)
- Secondary: "Print Job Card" (ghost) + "More actions" dropdown (Put On Hold, Cancel, Transfer Bay)

### 5.2 Vehicle + customer summary row (below header)

Per Stitch: horizontal card showing:
- Left: vehicle photo 80×60 + vehicle name Inter 16/600 + mono VIN (masked) + outlet pill
- Right: customer name Inter 16/500 + phone masked + last-service date

### 5.3 Progress stepper (horizontal, below summary)

Use existing `ProgressStepper` primitive. Steps:
1. Received (always complete)
2. Diagnosed
3. In Progress
4. QC
5. Ready for Delivery

Current step: filled accent. Past steps: success green check. Future: outline muted.

### 5.4 Tabs (canonical pattern per design doc §2)

6 tabs, default = Overview:
- Overview
- Labour
- Parts
- Inspection
- Timeline
- Invoice Preview

### 5.5 Tab contents

**Overview tab** (Stitch `service_job_card_detail_in_progress_dark`):
- Labour Requirements table: Description | Type | Est Hrs | Act Hrs | Rate | Amount
  - Each row: labour item (3C model — complaint-cause-correction). Actual hours mono green if ≤ estimate, red if over.
  - Add Row button at bottom (R09+)
- Parts Required table: Part # | Description | Qty | Price | Status | Amount
  - Status column: StateChip (In Stock / On Order / Shortage)
  - Add Part button at bottom
- Estimated total card (bottom-right 320px sticky):
  - Labour subtotal + Parts subtotal + margin-scheme GST breakdown (CGST/SGST or IGST) + Grand total mono 18/600

**Labour tab** — same labour table, full-width, with full editing capabilities. Each row can be marked complete (checkbox), time logged (mono inputs), technician assigned.

**Parts tab** (Stitch `service_job_card_detail_parts_tab_dark`):
- Full-width table of parts
- Each row: Part # mono + Description + Qty + Unit Price + Availability chip + Line total
- Right sidebar: Parts requisition status, order placed dates, pending receipts

**Inspection tab** (Stitch `service_job_card_detail_inspection_tab_dark`) — 210-point VHC:
- Header card: "210-Point Technical Inspection" + technician name + inspection date + GRADE badge (large, A/B/C colored)
- Collapsible groups (standard accordion pattern):
  - Engine & Powertrain (pass/fail summary chip on right)
  - Braking System (can show "NEEDS ATTENTION" if any item red)
  - Electricals
  - Interior/Exterior
- Within each group (expanded): item rows with colored dot (red/amber/green) + name + status text + action chip (REPLACE / PASS / NEEDS ATTENTION)
- Right sidebar: "Advisor Notes Feed" — chat-like timeline with notes from advisor + system events. Text input at bottom to add note.

**Timeline tab** (Stitch `service_job_card_detail_timeline_tab_dark`):
- Vertical timeline of all events (state transitions, notes, part arrivals, approvals)
- Each event: avatar + actor name + action + timestamp mono + optional note body
- Reuses the inventory timeline pattern

**Invoice Preview tab** (Stitch `service_job_card_detail_invoice_preview_dark`):
- Two-column: left = invoice form, right = e-invoice panel
- Left: customer (read-only), line items (labour + parts separated), GST breakdown, grand total
- Right: IRN status placeholder (not applicable until invoiced), payment status
- Primary action at bottom: "Generate Invoice" (creates finance invoice and transitions state)

### 5.6 Advisor notes sidebar (right rail, persistent across tabs)

Per Stitch inspection screen — chat-like panel on the right with advisor + system notes. Add note input at bottom. Sticky across all tabs.

Width: 320px. Hidden on screens < lg.

### 5.7 Ready for Delivery state (Stitch `service_job_card_ready_for_delivery`)

When state = `ready-for-delivery`, the detail page shows:
- Status chip turns to "READY FOR DELIVERY" in blue
- Progress stepper fills to Ready step
- New top-right tabs: Overview & Totals / Line Items / QC Report / Communications
- "Delivery Protocol" card: 3 checkboxes:
  - Final Wash & Detailing Complete
  - Paid in Documents Prepared
  - Customer Informed
- "Final Notes" card: textarea for handover notes
- Primary action: "Mark Delivered" (big button)
- Print Invoice button

## 6. New appointment flow (`/service/appointments/new`)

Reference: Stitch `service_new_appointment`

Full-page form. Title: "Initialize Protocol" (staff-ish copy, consistent with Stitch).

### 6.1 Sections

**Customer & Asset Details** (card p-6):
- Asset Identification row: VIN (mono, lookup) + Client Profile (combobox — existing customers from sales fixtures)
- On VIN select: auto-fills vehicle name, brand, model (pulled from inventory fixtures)
- On Client select: auto-fills name, phone

**Service Protocol** (card p-6):
- 4 quick-select cards in a horizontal row: Annual / Repair / Body Shop / PDI
  - Each card: icon + title + subtitle (estimated duration)
  - Click to select (single selection, accent border on selected)
- Advisor assignment: dropdown of staff with R09 role
- SLA (service window): dropdown — Same day / Next day / 3 days / Custom

**Scheduling Matrix** (card p-6):
- Left: calendar (Oct 2023 header per Stitch, uses current month in code)
- Right: time slots available for selected date — 2-column grid of time pills (10:00, 11:00, 12:30, etc.)
  - Unavailable slots muted / strikethrough
  - Selected slot accent-filled

**Right sidebar panels** (per Stitch):
- Session Summary: asset, client, protocol, schedule, advisor (placeholder-to-filled as user progresses)
- "Save Draft" + "Cancel Session" + "Confirm Appointment" (primary)

### 6.2 Check-In → Job Card dialog (post-ship addition U18)

When a confirmed appointment is checked in from the Appointments tab row action (or from its detail route), the `AppointmentCheckinDialog` (`size=lg`) captures the full job card scope in one step — no post-create edit required.

Three sections:

1. **Arrival** — Odometer at arrival (required, mono).
2. **Assignment** — Bay (FREE bays only), Service Advisor (R09/R12), Technicians (multi-select pill group, R11).
3. **Job Card Scope** — Priority (LOW / NORMAL / HIGH / VIP), Promised By (datetime-local), Customer Complaint (required, min 5 chars, pre-fills from appointment notes), Initial Estimate (₹).

Plus an optional Internal Note.

On submit, the store's `checkInAppointment(appointmentId, opts, actor)` action:
- Sets appointment.status = CHECKED_IN.
- Creates a new JobCard (RECEIVED) with all the fields populated from the dialog.
- Occupies the selected bay if any.
- Emits an `appointment_checkin` timeline event with full metadata (priority, advisorId, technicianIds).
- Returns the created JobCard so the caller can navigate to its detail route.

**Footer info block** (below scheduling):
- "Ensure asset valuation is updated prior to confirming duty-dhop protocols..." info text

### 6.2 Submission
- POST `/api/staff/service/appointments` → creates appointment + placeholder job card in RECEIVED state
- Redirects to `/service/jobcards/[id]`

### 6.3 New job-card flow (`/service/jobcards/new`) — direct creation

The advisor can create a JC without an appointment (e.g. a walk-in, a
late-night drop-off, or a courtesy appointment that wasn't booked
ahead). This route is the canonical surface for that path.

**Customer section (Walk-in vs Existing).**

| Mode | Fields | Notes |
|------|--------|-------|
| **Walk-in** | Name (req, ≥2), Phone (req, /^\d{10}$/), Email (optional, valid) | New customer captured in-line; downstream `openOwnership({source:'SERVICE_ONLY_WALKIN'})` runs after intake. |
| **Existing** | Customer dropdown — alphabetised list pulled from `useCustomersStore` (NOT a hardcoded fixture list). Each option shows `{name} · {phone}`. | Replaces the v1 hardcoded 4-name dropdown. **L_S5: customer dropdown is data-driven from customers-store.** |

**Vehicle section (data-driven for existing customers).**

When `customerType === 'existing'` AND `customerId` is set AND that customer has at least one ACTIVE ownership row in the vehicles-store, the **VIN field is rendered as a `<select>` dropdown listing only that customer's vehicles** (resolved via `ownershipIdByCustomer[customerId] → ownerships → vehicles` join, ACTIVE-state only). Picking a vehicle auto-fills year/make/model — the advisor doesn't re-type data already on file.

For walk-in mode (or for an existing customer with no vehicles on file yet), the VIN field is the standard free-text `<input>` with VIN validation (`@dms/vehicles-core normalizeVin`). Helper text under the field clarifies the active mode ("Pick a car already on file…" vs "No vehicles on file for this customer — enter VIN manually below.").

**L_S6: data-driven existing-customer vehicle dropdown.** The VIN selector for existing customers is sourced from the live ownership index. No silent free-text fallback when ownerships exist; the advisor MUST pick from the dropdown to avoid VIN-typo regressions.

**Service-Type section.**

Chip-style multi-select rendered from `serviceTypes` fixture. The catalogue is:

1. Annual Service · 2. Master Inspection · 3. Aesthetic Detailing · 4. Mechanical Repair · 5. Pre-Purchase Inspection · 6. Accessory Installation · **7. Other** *(catch-all, P-S6.3 addition)*.

When the advisor selects **Other**, a required free-text *"Describe the issue"* textarea (≥10 chars) surfaces immediately below the chip group. On submit, the description is composed into the JC's `diagnosticNotes` field with the prefix `Other — customer concern:` so the workshop sees the original wording.

**L_S7: "Other" service type with mandatory free-text description.** The description is folded into `diagnosticNotes` audit-trail. UI never silently drops the input — if the advisor toggles "Other" off, the textarea hides but the text is preserved in form state until submit (so accidental toggle doesn't lose typing).

**Cross-store wiring (read-only seams).**

- **Seam 48 — Service JC creation → Customers (READ).** Customer dropdown.
- **Seam 49 — Service JC creation → Vehicles ownership (READ).** Vehicle dropdown for existing customers; auto-fill year/make/model on selection.

Both seams are read-only; this surface never mutates customers-store or the vehicles ownership graph (open-ownership for walk-ins is the existing path through `vehiclesStore.openOwnership(...)` after intake-dialog confirm — that's not new wiring).

## 7. Warranty claim flow (`/service/warranty/new`)

Reference: Stitch `service_warranty_claim`

Full-page form.

### 7.1 Header
- Title: "New Warranty Claim" left, "Draft Mode" text indicator right
- Close X button top-left (to /service?view=warranty)

### 7.2 Vehicle identification card
- Vehicle VIN mono (large) — auto-fills from lookup or passed via query string
- Claim # mono (auto-generated: CLM-2026-NNNN)
- "Coverage Active" pill (green shield icon) right side

### 7.3 Incident Details (card)
- Date of Failure (date input)
- Odometer reading (number + km)
- Fault Description (textarea, required, placeholder: "Describe the symptoms, conditions when fault occurs, and initial assessment...")

### 7.4 Diagnostic Report (sidebar card on right, 320px)
- File dropzone: "Upload Telemetry / Drag logs or scans here · Max 50MB"
- Below: uploaded files list with icons + name + size + delete icon
- Example uploaded files:
  - "FASTA_Log_Oct24.pdf · 2.4 MB · Complete"
  - "Component_Photo_1.jpg · 11 MB · Complete"

### 7.5 Parts required (card)
- Section heading with wrench icon
- Search parts: "Search catalog by Part ID or Name..."
- Parts table: Part ID | Description | Qty | Est. Cost
- Total row at bottom: "2 items selected · TOTAL EST · ₹ 97,600"

### 7.6 Footer
- Save Draft (ghost) + Submit for Approval (primary with → arrow)
- On submit: POST `/api/staff/service/warranty-claims`, redirect to claim detail or warranty list

## 8. Data model

```typescript
// packages/types/src/domain/service.ts

export const JobCardStatusEnum = z.enum([
  'received','diagnosed','in-progress','waiting-parts','additional-work-approval',
  'qc','ready-for-delivery','delivered','cancelled',
]);

export const BayStatusEnum = z.enum([
  'available','occupied-in-progress','occupied-waiting-parts','occupied-qc','occupied-diagnosed',
]);

export const JobCardSchema = z.object({
  id: z.string(),
  jobNumber: z.string(), // JC-2026-0341
  vin: z.string(),
  vehicleName: z.string(),
  vehicleImage: z.string().optional(),
  customerName: z.string(),
  customerPhone: z.string(),
  outlet: z.string(),
  bayNumber: z.number().nullable(),
  status: JobCardStatusEnum,
  advisorId: z.string(),
  advisorName: z.string(),
  technicianIds: z.array(z.string()),
  receivedAt: z.string(),
  startedAt: z.string().nullable(),
  etaAt: z.string().nullable(),
  progress: z.number().min(0).max(100),
  labourTotal: z.number(),
  partsTotal: z.number(),
  gstTotal: z.number(),
  grandTotal: z.number(),
  isWarranty: z.boolean().default(false),
});

export const LabourLineSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  description: z.string(),
  type: z.enum(['scheduled','customer-requested','discovery']),
  estimatedHours: z.number(),
  actualHours: z.number().nullable(),
  ratePerHour: z.number(),
  amount: z.number(),
  technicianId: z.string().nullable(),
  completed: z.boolean(),
});

export const PartsLineSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  partNumber: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  availability: z.enum(['in-stock','on-order','shortage']),
  amount: z.number(),
});

export const InspectionItemSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  group: z.enum(['engine-powertrain','braking','electricals','interior-exterior','undercarriage','fluids']),
  name: z.string(),
  status: z.enum(['pass','needs-attention','fail']),
  statusText: z.string().optional(), // "1.2mm left"
  action: z.enum(['pass','replace','monitor']).optional(),
});

export const InspectionSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  grade: z.enum(['A','B','C']),
  technicianName: z.string(),
  inspectionDate: z.string(),
  totalItems: z.number(), // 210
  passed: z.number(),
  needsAttention: z.number(),
  failed: z.number(),
});

export const AdvisorNoteSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  isSystem: z.boolean(),
  body: z.string(),
  timestamp: z.string(),
});

export const JobCardTimelineEventSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  type: z.enum(['created','diagnosis','work-started','parts-ordered','parts-received','qc-started','qc-passed','qc-failed','ready','delivered','note','approval-requested','approval-granted','approval-rejected']),
  actorName: z.string(),
  timestamp: z.string(),
  body: z.string().optional(),
});

export const WarrantyClaimStatusEnum = z.enum(['draft','submitted','approved','rejected','paid']);

export const WarrantyClaimSchema = z.object({
  id: z.string(),
  claimNumber: z.string(), // CLM-2026-NNNN
  vin: z.string(),
  vehicleName: z.string(),
  customerName: z.string(),
  dateOfFailure: z.string(),
  odometerReading: z.number(),
  faultDescription: z.string(),
  coverageActive: z.boolean(),
  partsRequired: z.array(z.object({
    partNumber: z.string(),
    description: z.string(),
    quantity: z.number(),
    estimatedCost: z.number(),
  })),
  estimatedTotal: z.number(),
  diagnosticFiles: z.array(z.object({
    name: z.string(),
    size: z.string(),
    url: z.string(),
  })),
  status: WarrantyClaimStatusEnum,
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const AppointmentSchema = z.object({
  id: z.string(),
  appointmentNumber: z.string(), // APT-2026-NNNN
  customerName: z.string(),
  customerPhone: z.string(),
  vin: z.string(),
  vehicleName: z.string(),
  serviceType: z.enum(['annual','repair','body-shop','pdi','warranty']),
  scheduledAt: z.string(),
  advisorName: z.string(),
  status: z.enum(['pending','confirmed','arrived','converted-to-job-card','cancelled','no-show']),
  outlet: z.string(),
  notes: z.string().optional(),
});
```

## 9. Fixtures

Generate:
- **8 bay records** (one per bay) with occupied/empty states, 5 occupied (matching screen pattern)
- **8-10 job cards** across various states (3 in-progress, 2 waiting-parts, 1 qc, 1 ready-for-delivery, 1 received, 1 delivered)
- Per job card: 3-5 labour lines, 4-8 parts lines, 1 inspection, ~10 inspection items, 4-6 timeline events, 3-5 advisor notes
- **10 upcoming appointments** across today + tomorrow
- **5 warranty claims** (mix of statuses: 2 submitted, 1 approved, 1 draft, 1 paid)

Realistic data:
- Indian technician names (Sarah J., M. Chen, K. Kumar, R. Patel, A. Sharma, S. Verma)
- Advisor names (Rajesh Kumar, Priya Sharma)
- Parts from common BMW/Porsche/Mercedes catalog
- Labour items: Annual Service (Major), Brake Pad Replacement, Oil Change, Electrical Diagnostic, Wheel Alignment

## 10. MSW handlers

```
GET /api/staff/service/bays — bay grid status
GET /api/staff/service/job-cards (filters: status, advisor, bay, customer search)
GET /api/staff/service/job-cards/:id
POST /api/staff/service/job-cards — create (from appointment)
PATCH /api/staff/service/job-cards/:id — update
POST /api/staff/service/job-cards/:id/transitions — state change
POST /api/staff/service/job-cards/:id/labour — add labour line
POST /api/staff/service/job-cards/:id/parts — add parts line
POST /api/staff/service/job-cards/:id/notes — add advisor note
GET /api/staff/service/job-cards/:id/inspection — VHC
PATCH /api/staff/service/job-cards/:id/inspection — update inspection
GET /api/staff/service/appointments (filters: date range, status, outlet)
POST /api/staff/service/appointments — create
PATCH /api/staff/service/appointments/:id/convert — converts to job card
GET /api/staff/service/warranty-claims (filters: status)
POST /api/staff/service/warranty-claims
GET /api/staff/service/warranty-claims/:id
```

## 11. Build phases (parallel agents)

- **S4a**: Types + fixtures + MSW handlers
- **S4b**: Bay board landing page + Appointments tab + Job Cards list tab + Warranty Claims tab
- **S4c**: Job card detail page with all 6 tabs
- **S4d**: New Appointment form + New Warranty Claim form
- **S4e** (if needed): Ready for Delivery state + state transition modals

## 12. Design doc enforcement

All components strictly follow `D:/dms/dms/design/04_staff_component_patterns.md`:
- §1 Card: `rounded-md border border-line bg-bg-surface p-{3|4|6}`
- §2 Tabs: underline indicator + full ARIA (same pattern as Inventory/Sales)
- §5 Buttons: canonical primary/secondary/icon patterns
- §8 Typography: follow Inter scale

## 13. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-17 | 0.1 | Claude (integrator) | Initial spec for Phase S4 Service — 4 routes + 6 tabs + 2 standalone flows |
| 2026-05-07 | 0.2 | Claude (integrator) | Added child spec SPEC-SERVICE-INTAKE-001 (intake inspection sheet — sibling under `specs/modules/service/03-intake-inspection.md`). |
| 2026-05-07 | 0.3 | Claude (orchestrator) | §6.3 new — JC creation flow data-driven from customers-store + vehicles ownership index. L_S5 customer dropdown sourced from store; L_S6 existing-customer VIN dropdown filtered to that customer's ACTIVE ownerships with auto-fill of year/make/model; L_S7 "Other" service type with mandatory ≥10-char description folded into `diagnosticNotes`. Seams 48 (customers READ) + 49 (vehicles ownership READ) registered. Replaces v1 hardcoded 4-name customer fixture list and free-text-only VIN input. |
