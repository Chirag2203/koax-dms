---
spec_id: SPEC-TEST-DRIVE-001
title: Test-drive booking flow — end-to-end
domain: test-drive
status: approved
version: 1.0
risk_level: medium
pii_sensitivity: medium
flags: [test-drive]
owners: [orchestrator]
created: 2026-04-30
related_specs:
  - SPEC-CUSTOMER-PORTAL-002
  - PLAN-VEHICLES-003
  - SPEC-ARCH-UI-001
depends_on:
  - SPEC-CUSTOMER-PORTAL-002
---

# SPEC-TEST-DRIVE-001 — Test-drive booking flow

## Locked decisions

| Tag | Title | Decision | Source |
|-----|-------|----------|--------|
| L1  | TestDriveStatus is the sole state machine | All status transitions go through `canTransitionTestDrive()`. No component may mutate status without calling this function. | Doc 11 §state-machines |
| L2  | Slot granularity is four fixed periods | Slots are MORNING / AFTERNOON / EVENING / FULL_DAY. No calendar-minute precision in P1. Fine-grained booking via advisor call is the fallback. | Doc 04 §sales |
| L3  | Customer books, staff confirms | Only a customer (R20) may create a booking. Only staff (R03 / R09 / R19 / R22 / R24) may confirm or re-slot it. A customer cannot self-confirm. | Doc 14 §roles |
| L4  | Execution checklist is staff-only | License verification, odometer readings, fuel level, and route notes are recorded by staff on the day. Customer portal shows these as read-only post-drive. | Doc 04 §test-drive |
| L5  | Feedback is staff-entered, not self-report | Interest level (cold / warm / hot), follow-up cadence, and free text are filled by the advisor after the drive. The customer portal shows a "Thank you" summary, not an editable form. | Doc 04 §test-drive |
| L6  | B1 leads-store stub | When B1 (leads module) is not yet present, `transitionStage` is attempted via `useLeadsStore.getState().transitionStage(leadId, 'TEST_DRIVE', actor)`. If the store does not exist, the call is swallowed with a `console.info` and a toast "Lead stage update deferred — B1 not yet built". Never throws. | Doc 04 §sales funnel |
| L7  | Outlet-scoped fixtures | All 8 fixture bookings are spread across three outlets (BLR / MUM / CHE). Selectors default to the current outlet unless `outlet = 'all'`. | Doc 07 §data contracts |
| L8  | One active booking per VIN at a time | A VIN may not have two bookings in PENDING / SCHEDULED / EXECUTING simultaneously. The store enforces this and throws `'duplicate-active-booking'`. | Doc 04 §test-drive |
| L9  | NO_SHOW and CANCELLED are terminal | Once in NO_SHOW or CANCELLED there are no outgoing transitions. | Doc 11 §state-machines |
| L10 | Customer-portal error convention | Customer-web pages use inline empty/error states (not `error.tsx`) since the portal has no `ModuleErrorFallback` equivalent. | SPEC-CUSTOMER-PORTAL-002 §17 |
| L11 | i18n namespace root | Staff-web uses `testDrives.*` at top-level of `messages/en-IN.json`. Customer-web uses `portal.testDrive.*` inside the existing `portal.*` key. | SPEC-ARCH-UI-001 §13a |
| L12 | Pre-drive checklist minimum fields | License number, fuel level before (percentage bucket: 0/25/50/75/100), odometer before are all required before `EXECUTING → COMPLETED`. | Doc 04 §test-drive |

---

## 1. Domain entities

### TestDriveStatus (enum)
```
PENDING        — customer submitted, staff not yet confirmed
SCHEDULED      — staff confirmed slot
EXECUTING      — on-day checklist started (pre-drive fields filled)
COMPLETED      — post-drive feedback recorded
NO_SHOW        — customer did not appear (terminal)
CANCELLED      — booking cancelled (terminal)
```

### TestDriveBooking
```
id              string
customerId      string
customerName    string
vehicleVin      string
vehicleMake     string
vehicleModel    string
vehicleYear     number
outletId        string
requestedDate   string   (ISO date)
requestedSlot   'MORNING' | 'AFTERNOON' | 'EVENING' | 'FULL_DAY'
confirmedDate   string?  (ISO date — set on SCHEDULED)
confirmedSlot   ('MORNING'|'AFTERNOON'|'EVENING'|'FULL_DAY')?
assignedAdvisorId   string?
assignedAdvisorName string?
status          TestDriveStatus
cancellationReason  string?
leadId          string?  (B1 stub — optional link)
notes           string?
createdAt       string
updatedAt       string
```

### TestDriveExecution (embedded in booking post-SCHEDULED)
```
licenseNumber       string
licenseVerifiedAt   string
fuelLevelBefore     0 | 25 | 50 | 75 | 100
odometerBefore      number (km)
fuelLevelAfter      (0|25|50|75|100)?
odometerAfter       number?
routeNotes          string?
driverName          string?   (staff member who accompanied)
startedAt           string?
completedAt         string?
```

### TestDriveFeedback (embedded post-COMPLETED)
```
interestLevel   'cold' | 'warm' | 'hot'
followUpDays    number   (1 / 3 / 7 / 14 / 30)
freeText        string?
recordedAt      string
recordedBy      string   (advisor id)
```

---

## 2. State machine

```
PENDING ──[confirm]──> SCHEDULED
PENDING ──[cancel]──>  CANCELLED
SCHEDULED ──[start-checklist]──> EXECUTING
SCHEDULED ──[cancel]──>          CANCELLED
SCHEDULED ──[reslot]──>          SCHEDULED  (same node — date/slot changes)
EXECUTING ──[complete-feedback]──> COMPLETED
EXECUTING ──[no-show]──>           NO_SHOW
COMPLETED  → (terminal)
NO_SHOW    → (terminal)
CANCELLED  → (terminal)
```

Role gates:
- create:       R20 (Customer Portal)
- confirm/reslot/start-checklist/no-show: R03, R09, R19, R22, R24
- complete-feedback: R03, R09, R19, R22, R24
- cancel: R03, R09, R19, R20 (own booking in PENDING only), R22, R24

---

## 3. Scenarios (GPA format)

### S1 — Happy path: customer books, staff confirms, drive completes
**Given** Arjun Mehta is on the VDP for BMW 540i (VIN WBY2Z21090VX45678)
**When** he taps "Book Test Drive" and selects outlet BLR, date 2026-05-10, slot MORNING
**Then** a new booking appears in PENDING; staff queue shows it under PENDING tab; advisor confirms → SCHEDULED; on-day checklist filled → EXECUTING; post-drive feedback recorded → COMPLETED; customer portal shows COMPLETED badge with interest-level chip.

### S2 — Staff reschedules (reslot)
**Given** a SCHEDULED booking #TD-001
**When** advisor changes the date to 2026-05-12 and slot to AFTERNOON
**Then** status remains SCHEDULED; confirmedDate and confirmedSlot update; audit trail shows reslot event; customer portal reflects new date.

### S3 — Customer cancels own PENDING booking
**Given** customer has a PENDING booking
**When** they tap "Cancel" in portal and confirm
**Then** status → CANCELLED; cancellationReason = 'Cancelled by customer'; staff queue shows under CANCELLED tab.

### S4 — Staff cancels SCHEDULED booking
**Given** a SCHEDULED booking
**When** advisor clicks "Cancel" with reason "Vehicle sold"
**Then** status → CANCELLED; cancellationReason stored; customer portal shows CANCELLED badge.

### S5 — No-show
**Given** a SCHEDULED booking on today's date
**When** advisor marks "No Show"
**Then** status → NO_SHOW; no feedback form shown; staff queue shows under NO_SHOW tab.

### S6 — Duplicate booking prevention
**Given** VIN WBY2Z21090VX45678 has an active SCHEDULED booking
**When** another customer tries to book the same VIN for the same slot
**Then** store throws `'duplicate-active-booking'`; UI shows toast "This vehicle already has an active test drive booking".

### S7 — Execution checklist validation
**Given** booking is in SCHEDULED
**When** advisor tries to start checklist without filling licenseNumber
**Then** form validation rejects submission; checklist stays incomplete; status remains SCHEDULED.

### S8 — Post-drive feedback with B1 stub
**Given** booking moves to COMPLETED with leadId set
**When** feedback is recorded
**Then** `useLeadsStore.getState().transitionStage(leadId, 'TEST_DRIVE', actor)` is called; if B1 store absent, info is logged and toast "Lead stage update deferred — B1 not yet built" fires.

### S9 — RBAC gate on execution checklist
**Given** a staff user with role R07 (Parts Supervisor)
**When** they open a booking detail page
**Then** execution checklist and feedback sections are hidden behind `<Gate role={['R03','R09','R19','R22','R24']} fallback="hide">`.

### S10 — Empty state on staff queue
**Given** no bookings in PENDING for current outlet
**When** staff user lands on /test-drives with filter PENDING
**Then** empty state renders with "No pending test drive requests" and a prompt to "Switch to All Outlets if needed".

### S11 — Customer portal — empty bookings
**Given** a customer with zero test-drive bookings
**When** they visit /test-drive
**Then** empty state renders with illustration copy "No test drives booked yet" and CTA "Book a test drive".

### S12 — Post-drive customer view
**Given** a COMPLETED booking with feedback recorded
**When** customer visits the booking detail in portal
**Then** they see: confirmed date, vehicle, outlet, and a "Thank you" summary with the interest indicator (no raw interest-level label — just a warm message matching interest).

### S13 — Staff queue filter tabs
**Given** staff user is on /test-drives
**When** they click the EXECUTING tab
**Then** only bookings in EXECUTING status are shown; count chip on the tab shows the count.

### S14 — Outlet scoping
**Given** staff user has outlet = 'bangalore'
**When** they view /test-drives
**Then** only BLR bookings are shown; "All Outlets" switcher in sidebar when selected shows all.

### S15 — Booking detail — hydration guard
**Given** staff user navigates to /test-drives/TD-UNKNOWN
**When** the booking id is not found in the store
**Then** Next.js `notFound()` is called and the not-found boundary renders.

---

## 4. Store contract

```ts
interface TestDriveState {
  bookings: Record<string, TestDriveBooking>;
  hydrated: boolean;
}

interface TestDriveActions {
  _seed(bookings: TestDriveBooking[]): void;
  createBooking(input: CreateBookingInput): TestDriveBooking;     // R20
  confirmBooking(id, advisorId, advisorName, date, slot): void;   // R03/R09/R19+
  reslotBooking(id, date, slot): void;                            // R03/R09/R19+
  startChecklist(id, execution: TestDriveExecution): void;        // R03/R09/R19+
  completeDrive(id, feedback: TestDriveFeedback): void;           // R03/R09/R19+
  markNoShow(id): void;                                           // R03/R09/R19+
  cancelBooking(id, reason: string, cancelledBy: string): void;   // R03/R09/R20(own PENDING)/R19+
  selectByCustomer(customerId): TestDriveBooking[];
  selectByOutlet(outletId): TestDriveBooking[];
  selectByStatus(status): TestDriveBooking[];
}
```

---

## 5. Cross-module wiring

| Seam | From | To | Contract |
|------|------|----|---------|
| Seam-TD-1 | test-drive store | leads store (B1 stub) | `useLeadsStore.getState().transitionStage(leadId, 'TEST_DRIVE', actor)` — call swallowed if store absent |
| Seam-TD-2 | customer-web portal | test-drive store | portal reads bookings for `customerId`; cannot confirm/execute |
| Seam-TD-3 | staff sidebar | test-drive route | "Test Drives" entry under Operations with `Car` icon |

---

## 6. Routes

### Staff-web
- `app/(shell)/test-drives/page.tsx` — queue with PENDING / SCHEDULED / EXECUTING / COMPLETED / NO_SHOW / CANCELLED tabs
- `app/(shell)/test-drives/[id]/page.tsx` — detail: booking info + execution checklist + feedback dialog
- `app/(shell)/test-drives/error.tsx` — canonical ModuleErrorFallback

### Customer-web
- `app/(portal)/test-drive/page.tsx` — list of customer's bookings
- `app/(portal)/test-drive/new/page.tsx` — booking wizard (vehicle picker + date/slot/outlet)
- No error.tsx needed — portal uses inline error states (L10)

---

## 7. UI primitives used (SPEC-ARCH-UI-001)

- `Card` + `Field` from `@/src/components/custom-builds/shared/detail-card`
- `Button` from `@/src/components/primitives/button`
- `Gate` from `@/src/components/primitives/gate`
- `StateChip` from `@/src/components/primitives/state-chip` (staff status badges)
- Portal: Editorial Luxury tokens (`--color-brass`, `--color-ink`, `--color-line`, font-display, font-mono)

---

## 8. i18n

- Staff: `testDrives` top-level key in `messages/en-IN.json` + `messages/hi-IN.json`
- Customer: `portal.testDrive` nested key in `apps/customer-web/messages/en-IN.json` + `hi-IN.json`

---

## 9. Fixtures (8 bookings)

| # | Status | Outlet | Customer | VIN |
|---|--------|--------|----------|-----|
| TD-001 | PENDING   | BLR | cust-arjun-mehta | WBY2Z21090VX45678 |
| TD-002 | SCHEDULED | BLR | cust-priya-mehta | WBAFR7C56BC785138 |
| TD-003 | EXECUTING | MUM | cust-vikram-singh | WP0ZZZ99ZTS392124 |
| TD-004 | COMPLETED | MUM | cust-meera-iyer | WBAFR7C56BC785138 |
| TD-005 | NO_SHOW   | CHE | cust-rahul-kumar | WBY2Z21090VX45678 |
| TD-006 | CANCELLED | CHE | cust-rohan-desai | WBSUV00083L123456 |
| TD-007 | SCHEDULED | BLR | cust-neha-kapoor | ZFFXW58A9D0185758 |
| TD-008 | PENDING   | MUM | cust-karan-shah | WBY2Z21090VX45678 |

---

## 10. Deferred items

| ID | Item | Priority |
|----|------|----------|
| DEF-TD-1 | Email/WhatsApp confirmation to customer on SCHEDULED | P2 |
| DEF-TD-2 | Calendar integration for advisor slot management | P2 |
| DEF-TD-3 | Route GPS tracking integration | P3 |
| DEF-TD-4 | Digital waiver signature capture | P3 |

---

## Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | orchestrator | Initial spec — 12 L-tags, 15 scenarios, full state machine |
