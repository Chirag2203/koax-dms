---
spec_id: SPEC-CUSTOMER-PORTAL-002
title: Customer Service Booking (book + list + status tracker)
domain: customer-portal
status: approved
risk_level: low
pii_sensitivity: medium
flags: [customer-service-booking]
owners: [orchestrator]
version: 1.1
created: 2026-04-28
last_updated: 2026-04-29
supersedes: null
related_specs:
  - SPEC-SERVICE-001
  - SPEC-CUSTOMER-PORTAL-001
research_refs:
  - Doc 03 §3.3 (Service booking from portal)
  - Doc 05 §2 (Booking intake channels + form data)
  - Doc 05 §2.3 (Slot availability engine)
  - Doc 05 §2.4 (Confirmation and pre-arrival)
  - Doc 09 (Glossary — Job Card, Appointment, RO)
  - Doc 11 §7 (Service Booking state machine)
  - Doc 13 §2 (WhatsApp BSP)
  - Doc 14 §R20 (Customer R20 permissions)
depends_on:
  - SPEC-SERVICE-001
  - SPEC-CUSTOMER-PORTAL-001
---

# SPEC-CUSTOMER-PORTAL-002 — Customer Service Booking

## 0. Locked decisions

Locked decisions are implementation contracts that cannot be changed without a migration. Any future implementer who deviates from a locked decision creates a breaking change. L-tags are referenced throughout this spec to point back to the source of truth.

| Tag | Title | Decision |
|-----|-------|----------|
| L5 | Role override for `AWAITING_CONFIRMATION → CANCELLED` | See §5.3 (inline) |
| L_SVC_BOOK_1 | Self-cancel discriminator | See below |

### L_SVC_BOOK_1 — Self-cancel discriminator (locked 2026-04-29)

When a customer cancels an `AWAITING_CONFIRMATION` booking via the portal (S3), the JobCard's `declineReason` field is set to the literal string **`'Cancelled by customer'`** (case-sensitive, no trailing whitespace).

This exact string is used by both the list page (`ServiceBookingsPage`) and the detail page (`ServiceBookingDetailPage`) to discriminate customer self-cancel from SA-decline in any `CANCELLED` JobCard. The discrimination logic is:

```ts
const isCustomerCancel = jobCard.declineReason === SELF_CANCEL_REASON;
// where SELF_CANCEL_REASON is imported from a shared constant — never inlined
```

**Rules:**

1. The canonical source of the constant is `apps/staff-web/src/lib/service/state-machine.ts` (exported as `SELF_CANCEL_REASON`).
2. `apps/customer-web/src/lib/service/service-booking-store.ts` re-exports it for portal-surface consumers.
3. All UI components import from one of these two paths — **never inline the literal string**.
4. Future API implementations of `POST /api/service/bookings/[id]/cancel` MUST set `declineReason = 'Cancelled by customer'` (exact match) when processing a customer self-cancel request.
5. Any change to this string value is a **breaking change** requiring a migration of all existing JC records carrying the old discriminator value, plus coordinated UI updates across both apps.

Cross-references: §6 (JC-P3 row), §8.1 (detail page note), §15 (failure modes).

---

## 1. Problem statement

Per Doc 03 §3.3, the customer portal's service booking surface is missing. Customers currently must phone or walk in to book a service. In luxury pre-owned, service is the repeat-revenue engine (Doc 05 §1 guiding principle 1: "the sale happens once; service happens for years"). A self-serve, mobile-first booking flow that creates a Job Card on the staff Bay Board closes the CX gap, reduces inbound phone volume for Service Advisors, and provides a timestamped digital record that integrates directly with the existing `SPEC-SERVICE-001` service module.

## 2. Goals and non-goals

### Goals
- Customer can book a service from their portal in under 3 minutes on mobile.
- Booking creates a `JobCard` with `status: AWAITING_CONFIRMATION` that staff must confirm or decline on the Bay Board.
- Customer can see all their service bookings with live status tracking through the JC state machine.
- Service offering catalogue is a single source of truth: shared from `packages/mocks/src/fixtures/service-types.ts`.
- Confirmation stub (WhatsApp + email) fires on booking creation and on staff confirmation.

### Non-goals
- Real Razorpay payment collection during booking (estimate comes from SA after JC is confirmed — v1.5).
- Real slot-availability engine against live bay calendars (mocked slot grid in v1; Doc 05 §2.3 deferred).
- WhatsApp BSP live call (logged only in v1 per Doc 13 §2 — template IDs reserved).
- Real-time push notification when SA updates JC status (polling / page reload in v1; SSE in v1.5).
- Cancellation of a **confirmed** booking (i.e., a JC that has advanced past `AWAITING_CONFIRMATION`) is not available to the customer in v1 — this is a v1.5 feature. Customer self-cancel of an `AWAITING_CONFIRMATION` booking **is** supported in P1 (see S3 AC), since the JC has not yet been confirmed by staff and no workshop work has been scheduled; once staff confirm (JC transitions to `RECEIVED`), the customer can no longer self-cancel.
- Reschedule flow (v1.5).
- Courtesy vehicle booking (Doc 11 §14 — v1.5).
- Pre-purchase inspection bookings for third-party vehicles (Doc 05 §3 — v1.5).

## 3. Users and roles affected

Per Doc 14 §4 (Customer R20 permissions):

| Role | Change |
|------|--------|
| R20 Customer | New: can create a service booking from portal → visible as `AWAITING_CONFIRMATION` JC on Bay Board |
| R09 Service Advisor | New: Bay Board shows AWAITING_CONFIRMATION column; can Confirm → moves JC to `RECEIVED`; or Decline with reason |
| R03 Outlet Manager | Inherits SA visibility; no new permission delta |

Doc 14 §4 explicitly grants R20 "Book service appointment" and "View own service history". No new permissions are required — this spec operationalises those existing grants.

## 4. User stories / jobs-to-be-done

**S1 — Book a service (happy path)**
As a logged-in customer (R20), I want to book a service for one of my registered vehicles, so that I can skip the phone call and have a confirmed workshop slot.

Acceptance criteria:
- Given I am on `/(portal)/service/book`, when I complete all 5 booking steps and submit, then a Job Card row is created in service-store with `status: AWAITING_CONFIRMATION` and `source: CUSTOMER_PORTAL`, and I see a confirmation screen with a booking reference.
- Given I have no vehicles linked to my account, when I land on the booking flow step 1, then I see an empty-state prompt to add a vehicle via `/vehicles/claim`.
- Given I select a service offering, when I proceed to date/slot selection, then I can see a 2-week slot grid (mock data) with morning (09:00–12:00) and afternoon (13:00–17:00) windows.

**S2 — Choose service location**
As a customer, I want to choose between dropping my vehicle at the workshop OR requesting a home pickup, so that I can match the service to my schedule.

Acceptance criteria:
- Given I reach the Location step, when I select "Workshop Drop-off", then I see the outlet address and map pin.
- Given I select "Home Pickup", then an address form (line 1, line 2, city, PIN) is required before I can proceed; the booking note records `pickupMode: HOME` + address.
- Given I enter a non-serviceable PIN code (mock: outside BLR/MUM/CHE), then I see an inline error "Home pickup is not available at this postcode yet."

**S3 — View booking list**
As a customer, I want to see all my service bookings in one place, so that I can track status without calling the workshop.

Acceptance criteria:
- Given I navigate to `/(portal)/service/bookings`, then I see cards for all my bookings sorted by `createdAt` descending.
- Given I have no bookings, then I see an empty state with a CTA to `/service/book`.
- Given a booking is `AWAITING_CONFIRMATION`, then the card shows a "Pending confirmation" badge in amber.
- Given a booking is `AWAITING_CONFIRMATION`, then the card shows a "Cancel booking" button; when I confirm the cancellation, the JC transitions to `CANCELLED` (customer-initiated) and the card shows a "Cancelled by you" badge.
- Given a booking is in any status beyond `AWAITING_CONFIRMATION` (i.e., `RECEIVED` or later), then no cancel button is rendered; the card shows a "Contact workshop to cancel" link instead.
- Given a booking is `CANCELLED` (staff declined), then the card shows a "Declined" badge and the reason note.

**S4 — Track Job Card progress**
As a customer, I want to see the step-by-step progress of my vehicle in the workshop, so that I have visibility without calling the SA.

Acceptance criteria:
- Given I navigate to `/(portal)/service/bookings/[id]`, then I see a vertical timeline of the JC state machine stages with completed stages highlighted.
- Given the JC is in `DIAGNOSED` or later and has advisor notes, then each note is shown in the timeline at the correct timestamp — restricted to `received`, `status_changed`, and `customer_note` event kinds only; raw internal advisor notes are never visible to the customer.
- Given the JC is `READY_FOR_DELIVERY`, then I see a prominent "Your vehicle is ready" banner with outlet address.

**S5 — Staff Confirm/Decline**
As a Service Advisor (R09), I want to see portal-originated bookings in a distinct column on the Bay Board, so that I can confirm or decline them with context.

Acceptance criteria:
- Given a `AWAITING_CONFIRMATION` JC exists, when I open the Bay Board, then it appears in an "Awaiting Confirmation" swim-lane separate from `RECEIVED`.
- Given I click Confirm, then the JC transitions to `RECEIVED` and the `AWAITING_CONFIRMATION` column no longer shows it.
- Given I click Decline and enter a reason, then the JC transitions to `CANCELLED` and the portal booking card shows "Declined — [reason]".

**S6 — Confirmation notifications**
As a customer, I want to receive a WhatsApp/email confirmation when I submit a booking and when staff confirms, so that I have proof-of-booking.

Acceptance criteria:
- Given booking is created, then `notifyBookingCreated(bookingId, customerId)` is called; in v1 this logs to console with DLT template ID `DLT_SVC_BOOKING_CREATED` and recipient phone.
- Given SA confirms the booking, then `notifyBookingConfirmed(bookingId, customerId)` is called; logs DLT template ID `DLT_SVC_BOOKING_CONFIRMED`.

## 5. Domain model changes

Per Doc 09 (Glossary): a **Job Card** is the primary workflow artifact for any service job. This spec extends `JobCard` and `JobCardStatus` to support portal-originated bookings.

### 5.1 `JobCardStatus` extension

New state added before `RECEIVED`:

```
AWAITING_CONFIRMATION  (new — pre-RECEIVED, portal-originated only)
```

Updated enum (patch to `packages/types/src/domain/service.ts`):
```ts
export const JobCardStatusEnum = z.enum([
  'AWAITING_CONFIRMATION', // NEW
  'RECEIVED',
  'DIAGNOSED',
  // ... existing values unchanged
]);
```

### 5.2 `JobCard` new fields

```ts
source?: 'STAFF' | 'CUSTOMER_PORTAL';   // default: 'STAFF'
pickupMode?: 'WORKSHOP_DROP' | 'HOME_PICKUP';
pickupAddress?: {
  line1: string;
  line2?: string;
  city: string;
  pinCode: string;
};
serviceTypeId: string;  // references service-types fixture id
declineReason?: string; // set when staff declines (AWAITING_CONFIRMATION → CANCELLED)
```

> `serviceTypeId` is a reference to the shared fixture — it is **not** duplicated. Consumer code resolves the service type name at render time from `@dms/mocks/fixtures/service-types`.

### 5.3 State machine extension

State machine patch for `apps/staff-web/src/lib/service/state-machine.ts`:

```ts
TRANSITIONS['AWAITING_CONFIRMATION'] = ['RECEIVED', 'CANCELLED'];
ROLE_GATES['AWAITING_CONFIRMATION'] = []; // created by portal (R20); transitions by R09+
```

Full updated flow:

```
AWAITING_CONFIRMATION → RECEIVED (SA confirms)
AWAITING_CONFIRMATION → CANCELLED (SA declines; declineReason required)
RECEIVED → DIAGNOSED → IN_PROGRESS → … (existing transitions per SPEC-SERVICE-001)
```

> **Locked decision L5 — Role override for `AWAITING_CONFIRMATION → CANCELLED`**
>
> The existing `ROLE_GATES.CANCELLED = ['R19', 'R22', 'R24']` (state-machine.ts) gates
> all transitions *into* `CANCELLED`, meaning R09 (Service Advisor) cannot ordinarily
> cancel a Job Card. However, the portal-decline path (JC-P3) requires R09+ to decline a
> customer booking — which is the correct product intent (S5). Rather than widening the
> global `ROLE_GATES.CANCELLED` (which would grant R09 the ability to cancel any JC, not
> just portal-originated ones), the implementation uses a **transition-specific guard** in
> `state-machine.ts` for the `AWAITING_CONFIRMATION → CANCELLED` path only. This guard
> permits R09, R03, and R01 for that specific source-state transition without modifying
> the global gate map. The broader `ROLE_GATES.CANCELLED` entry remains unchanged.
> Implemented as a path-specific override in the `createBookingFromPortal` decline action
> and enforced inside `state-machine.ts` transition resolution, not in the global gate map.

### 5.4 New `ServiceBookingRequest` type (customer-web only)

```ts
// packages/types/src/domain/service-booking.ts (new file)
export const ServiceBookingRequestSchema = z.object({
  // NOTE: customerId is intentionally absent from this schema.
  // It is derived exclusively from the authenticated session on the server.
  // The server MUST reject any client-supplied customerId — never trust it from
  // the request body. See §14 NFR-S and §7.1 for the enforcement contract.
  vin: z.string(),
  serviceTypeId: z.string(),
  scheduledDate: z.string(),         // YYYY-MM-DD
  scheduledSlot: z.enum(['MORNING', 'AFTERNOON']),
  outletId: z.string(),
  pickupMode: z.enum(['WORKSHOP_DROP', 'HOME_PICKUP']),
  pickupAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    pinCode: z.string().regex(/^\d{6}$/),
  }).optional(),
  concerns: z.string().max(500).optional(),
});
export type ServiceBookingRequest = z.infer<typeof ServiceBookingRequestSchema>;
```

## 6. State machine changes

Per Doc 11 §7 (Service Booking SM). The existing machine covers `Requested → Confirmed → CheckedIn → InService → Delivered → Invoiced`. This spec maps portal booking to the pre-`Requested` gate via a new `AWAITING_CONFIRMATION` status on `JobCard`.

| ID | Machine | From | To | Trigger | Guard | Side effects |
|----|---------|------|----|---------|-------|--------------|
| JC-P1 | JobCard | — | AWAITING_CONFIRMATION | Customer submits booking request | Authenticated R20; valid VIN owned by customer | Create JC row; `source: CUSTOMER_PORTAL`; log notification stub |
| JC-P2 | JobCard | AWAITING_CONFIRMATION | RECEIVED | SA clicks Confirm | R09/R03/R01; slot available | Append `received` timeline event; log `DLT_SVC_BOOKING_CONFIRMED` stub |
| JC-P3 | JobCard | AWAITING_CONFIRMATION | CANCELLED | SA clicks Decline + reason | R09/R03/R01; reason non-empty | Append `cancelled` timeline event; set `declineReason`; log decline notification stub. **Customer self-cancel (S3):** same transition, `declineReason` set to `SELF_CANCEL_REASON` constant — see **L_SVC_BOOK_1** (§0). |

Doc 11 §19 rule: every transition is audit-logged. Transitions JC-P1 through JC-P3 append `JobCardTimelineEvent` rows per existing pattern in service-store.

## 7. API contracts

All in v1 are **server actions** calling the in-memory service-store. Route handlers match the pattern established in `apps/customer-web` existing portal pages (TanStack Query + MSW).

### 7.1 `POST /api/service/bookings` (create booking)

| Field | Value |
|-------|-------|
| Auth | R20 session required (`customer-id` from session) |
| Request | `ServiceBookingRequest` (§5.4) |
| Response | `{ jobCardId: string; jobNo: string; scheduledDate: string; serviceTypeName: string }` |
| Errors | 400 invalid body; 422 VIN not owned by customer; 503 store unavailable |
| Idempotency | client generates `requestId` UUID; server deduplicates by `requestId` within 10 min window |

### 7.2 `GET /api/service/bookings` (list customer bookings)

| Field | Value |
|-------|-------|
| Auth | R20 session |
| Response | Array of `JobCard` filtered by `customerId = session.customerId` |
| RLS | `customerId` predicate enforced — customer cannot see others' bookings (Doc 14 §2 Customer-self scope) |

### 7.3 `GET /api/service/bookings/[id]` (booking detail + timeline)

| Field | Value |
|-------|-------|
| Auth | R20 session |
| Response | `{ jobCard: JobCard; timeline: JobCardTimelineEvent[] }` |
| RLS | 403 if `jobCard.customerId !== session.customerId` |

> **Customer-visible event filtering (B4):** The `timeline` array contains **only** the following `JobCardTimelineEvent` kinds — no raw `AdvisorNote` records are ever included in the portal response:
>
> - `received` — booking confirmed by SA (JC-P2)
> - `status_changed` — any downstream status transition (DIAGNOSED, IN_PROGRESS, READY_FOR_DELIVERY, DELIVERED)
> - `customer_note` — notes explicitly flagged by staff for customer visibility (new type; default `visibility: 'INTERNAL'` means the note is suppressed)
>
> Internal advisor notes (cost negotiations, warranty pre-approval amounts, inter-staff escalations, parts pricing) are **never exposed** to R20. The server action filters the full timeline array to these three event kinds before returning. An implementer must not return the full `AdvisorNote[]` array.

### 7.4 `GET /api/service/types` (service catalogue)

| Field | Value |
|-------|-------|
| Auth | None (public within portal; consistent with storefront service page) |
| Response | `ServiceType[]` from shared fixture — never duplicated |

## 8. UI/UX outline

**Surface:** customer-web, light theme, brass accent (`--color-brass`), Playfair Display headings, per `@dms/tokens` (Design 01 §2 Customer tokens).

### 8.1 Routes

| Route | Component | Description | Phase |
|-------|-----------|-------------|-------|
| `/(portal)/service/book` | `ServiceBookPage` | 5-step wizard | P1 (shipped) |
| `/(portal)/service/bookings` | `ServiceBookingsPage` | Booking list (cards, self-cancel for `AWAITING_CONFIRMATION`) | P1 (shipped) |
| `/(portal)/service/bookings/[id]` | `ServiceBookingDetailPage` | Status tracker — vertical JC timeline, "Your vehicle is ready" banner at `READY_FOR_DELIVERY`, customer-visible event filtering (B4) | **P2 (deferred)** — list page currently shows a "coming soon" note on the detail link |

**Implementation note (2026-04-29):** The detail/status-tracker page was originally scoped for P1 but ships in P2. The list page (`ServiceBookingsPage`) discriminates self-cancelled vs. SA-declined bookings using the `SELF_CANCEL_REASON` constant (see **L_SVC_BOOK_1**, §0) — never hardcode the literal string in UI components. Future API implementations of `GET /api/service/bookings/[id]` must preserve this discriminator value.

### 8.2 Booking wizard steps

Step indicator: horizontal pills (mobile) / numbered sidebar (tablet+). Each step validates before advancing.

| # | Step | Key affordance |
|---|------|----------------|
| 1 | Vehicle | Grid of customer's owned vehicles; select one; shows make/model/VIN badge |
| 2 | Service | 6 service offering cards (from shared fixture); price range + duration displayed |
| 3 | Date & Slot | 2-week calendar strip; tap day → morning / afternoon slot selector |
| 4 | Location | Toggle: Workshop Drop-off (outlet address card) / Home Pickup (address form) |
| 5 | Review + Confirm | Summary card; "Confirm Booking" CTA (brass button); terms one-liner |

Post-submit: success screen with JC number, estimated slot, and "View all bookings" link.

### 8.3 Empty / loading / error states

| State | Screen | Treatment |
|-------|--------|-----------|
| No owned vehicles (step 1) | Booking wizard | Illustrated empty state + link to `/vehicles/claim` |
| Slot grid loading | Step 3 | Skeleton grid (7 × 2 cells) |
| Submit in-flight | Step 5 | Button spinner; form disabled |
| Submit error | Step 5 | Toast: "Booking could not be created. Please try again." |
| Empty bookings list | `/bookings` | Illustrated state + "Book your first service" CTA |
| Detail 404 | `/bookings/[id]` | Not-found component (matches existing portal pattern) |

### 8.4 Accessibility

- All wizard steps keyboard-navigable; focus trap within active step.
- Vehicle and service cards: role="radio" with visible focus ring.
- Status badge colours meet WCAG 2.1 AA contrast (not relying on colour alone — icon + label).
- Date picker: `aria-label` on each day cell; selected state announced.
- Reduced-motion: step transitions use `prefers-reduced-motion` CSS query; Framer Motion `reduceMotion` prop.

### 8.5 Mobile-first breakpoints

- Wizard: single-column at all breakpoints; step indicator collapses to "Step N of 5" on < sm.
- Bookings list: card stack (1-col mobile, 2-col md+).
- Status tracker: full-width vertical timeline on mobile.

## 9. Notifications

Per Doc 13 §2 (WhatsApp BSP) and Doc 09 §DLT: all SMS/WhatsApp templates require a DLT-registered template ID before live send. V1 logs only.

| ID | Template key | Trigger | Recipient | Variables | DLT ID (v1 placeholder) | Fallback |
|----|-------------|---------|-----------|-----------|--------------------------|---------|
| N1 | `booking_created` | JC-P1 (customer submits) | R20 customer | `{name}`, `{jobNo}`, `{serviceType}`, `{date}`, `{slot}`, `{outlet}` | `DLT_SVC_BOOKING_CREATED` | Email (same vars) |
| N2 | `booking_confirmed` | JC-P2 (SA confirms) | R20 customer | `{name}`, `{jobNo}`, `{date}`, `{slot}`, `{advisorName}`, `{outletAddress}` | `DLT_SVC_BOOKING_CONFIRMED` | Email |
| N3 | `booking_declined` | JC-P3 (SA declines) | R20 customer | `{name}`, `{jobNo}`, `{declineReason}`, `{bookAgainLink}` | `DLT_SVC_BOOKING_DECLINED` | Email |

Consent check (Doc 13 §2, DPDP): send only if `ConsentEvent.purpose = SERVICE_COMMS` is `Granted` per Doc 11 §10. If revoked, skip send silently and log.

## 10. Integrations

Per Doc 13:

| Integration | Sheet | V1 scope |
|-------------|-------|---------|
| WhatsApp BSP | Doc 13 §2 | Stub only — `console.log` with template ID + variables. No live API call. |
| Email | Doc 13 (email not yet sheeted) | Stub only — same console.log pattern. |

No Razorpay integration in this spec (no payment at booking time in v1).

## 11. Data & analytics

Events to emit (TanStack Query mutation callbacks → analytics module):

| Event | Properties | When |
|-------|-----------|------|
| `service_booking_started` | `customerId`, `source: 'portal'` | User lands on `/service/book` |
| `service_booking_step_completed` | `step` (1–5), `serviceTypeId` (at step 2) | Each wizard step advance |
| `service_booking_submitted` | `jobCardId`, `serviceTypeId`, `pickupMode`, `outletId` | JC-P1 succeeds |
| `service_booking_confirmed_by_staff` | `jobCardId`, `advisorId` | JC-P2 succeeds |
| `service_booking_declined_by_staff` | `jobCardId`, `declineReason` | JC-P3 succeeds |

KPIs affected: portal service booking conversion rate; SA response time (AWAITING_CONFIRMATION → RECEIVED or CANCELLED); most-booked service type.

## 12. Permissions & RBAC

Per Doc 14 §4 (R20), all required permissions are already declared:

| Capability | Role | Scope | Note |
|-----------|------|-------|------|
| Create service booking | R20 | Customer-self | Existing grant operationalised |
| View own bookings | R20 | Customer-self | Existing grant |
| Confirm/Decline AWAITING_CONFIRMATION JC | R09, R03, R01 | Outlet | Existing SA permissions cover |
| View portal-source bookings on Bay Board | R09, R03 | Outlet | Covered by existing Bay Board read permission |

RLS predicate for booking list/detail: `customerId = :authenticated_customer_id`. A customer fetching another customer's booking ID returns 403 (Doc 14 §2 Customer-self scope).

No new permissions require a Doc 14 patch.

## 13. Privacy & compliance

Per Doc 09, Doc 14 §2, DPDP Act 2023 (Doc 07 §DPDP):

- **PII fields introduced:** `pickupAddress` (line1, line2, city, pinCode) — **medium sensitivity**. Although no Aadhaar/PAN/phone/email is collected, a street address is locatable data that directly identifies a person's residence. Per DPDP Act 2023, address fields are classified as medium PII regardless of the absence of national-ID numbers. This is why `pii_sensitivity: medium` is set in the frontmatter. Stored on `JobCard` record.
- **Purpose binding:** `pickupAddress` collected for service logistics only. Purpose label: `SERVICE_LOGISTICS`.
- **Consent:** no new consent purpose needed. `SERVICE_COMMS` purpose (existing) gates notification sends. No consent gate on address collection (logistics necessity under DPDP reasonable-purpose clause).
- **Retention:** `pickupAddress` retained for duration of `JobCard` lifecycle + 7 years (doc retention per Doc 06 §17). Included in data-subject access response.
- **DPDP DSR impact:** `pickupAddress` must be included in access-request export for the customer; eligible for erasure once JC is `DELIVERED` + 7-year window elapsed. No new erasure logic required beyond existing customer data erasure flow.
- **GST/Tax:** no financial transaction at booking creation. No GST impact.
- **DLT:** three new template IDs reserved (`DLT_SVC_BOOKING_CREATED`, `DLT_SVC_BOOKING_CONFIRMED`, `DLT_SVC_BOOKING_DECLINED`) — must be registered before live SMS/WhatsApp send. V1 logs only.
- **Legal/DPO review required:** No (pii_sensitivity: low; no Aadhaar/PAN; no financial data).

## 14. Non-functional requirements

Per Doc 12 baseline. Feature-specific targets:

- **NFR-P (performance):** Booking wizard step transitions < 150 ms (client-side only in v1). Booking list first paint < 800 ms on 4G (LCP target). Status tracker page < 1 s.
- **NFR-A (availability):** Service booking inherits portal availability (99.5% monthly uptime target, Doc 12). MSW fallback ensures no blank states in mock mode.
- **NFR-S (security):** Server action validates `customerId` from session on every mutation — never trust client-supplied `customerId`. VIN ownership verified against `selectVehiclesByCustomer(customerId)` before JC creation.
- **NFR-U (accessibility):** WCAG 2.1 AA minimum on all booking screens (Doc 12 NFR-U-01).

## 15. Failure modes & edge cases

| # | What can go wrong | Detection | Recovery | User-facing message |
|---|-------------------|-----------|----------|---------------------|
| F1 | Customer submits booking but VIN not in their ownership list (tampered request) | Server action validates VIN via `selectVehiclesByCustomer`; logs anomaly | Reject with 422 | "This vehicle is not linked to your account." |
| F2 | Duplicate booking for same VIN + date + slot | Server action checks existing `AWAITING_CONFIRMATION` / `RECEIVED` JC for same VIN | Reject or warn | "You already have a pending booking for this vehicle on [date]. View it here." |
| F3 | Selected slot becomes unavailable between step 3 and step 5 submit | Post-submit: slot re-check on server action | Return 409; front-end returns user to step 3 with toast | "This slot was just taken. Please choose another." |
| F4 | Home pickup PIN code outside serviceable zone | Client-side validation on blur + server-side guard | Inline field error | "Home pickup is not available at this postcode yet." |
| F5 | SA never acts on AWAITING_CONFIRMATION (SLA breach) | Cron or staff-web alert when JC age in AWAITING_CONFIRMATION > 4h | Escalate to R03; amber badge on Bay Board | Customer receives: "We're confirming your booking shortly. Expect a message within 4 hours." |
| F6 | Notification stub throws (DLT log write fails) | Error caught; non-blocking | Log to error monitoring; JC creation still succeeds | Booking confirmed; notification delivery attempted separately |
| F7 | Customer has 0 owned vehicles | Portal renders empty state at wizard step 1 | Prompt to claim a vehicle | "Add a vehicle to your garage to book a service." |
| F8 | `service-types` fixture unreachable (MSW off) | API returns 503 | Service card grid shows error state with retry button | "Could not load service options. Please refresh." |
| F9 | Self-cancel discriminator string drifts (future implementer changes the literal without migration) | Test suite fails — `SELF_CANCEL_REASON` assertion in `analytics-service-booking.test.ts` catches it | Update constant + migrate existing CANCELLED records | N/A (internal data integrity issue). See **L_SVC_BOOK_1** (§0). |

## 16. Migration & rollout

**Schema change:** `JobCardStatus` enum gains `AWAITING_CONFIRMATION`. This is additive and non-breaking for staff-side UI (existing Bay Board renders unknown statuses safely as generic cards).

**Feature flag:** `feat_customer_service_booking` (default: off in prod until P1 ships). Toggle in `apps/customer-web` layout.

**Rollout stages:**
1. P1 shipped + internal QA pass → enable flag for Bangalore outlet staff + 10 test customers.
2. P2 shipped (status tracker) → expand to all 3 outlets.
3. Full launch → flag promoted to always-on; flag removed in next cleanup sprint.

**Staff training:** Service Advisors (R09) need a 10-minute walkthrough on the new "Awaiting Confirmation" swim lane and the Confirm/Decline flow. No changes to existing job card workflow beyond the new pre-state.

**Backfill:** None — new JCs only.

## 17. Test plan

All user stories (S1–S6) map to tests below.

**Unit tests (Vitest)**
- `ServiceBookingRequestSchema` — valid/invalid shapes (covers S1, S2)
- `canTransition('AWAITING_CONFIRMATION', 'RECEIVED')` = true; `canTransition('AWAITING_CONFIRMATION', 'DIAGNOSED')` = false (covers JC-P2, JC-P3)
- `selectVehiclesByCustomer` returns only vehicles matching `customerId` (covers F1)
- Duplicate booking guard logic (covers F2)

**Integration tests (Vitest + MSW)**
- Full booking flow: mock POST → assert JC created with `status: AWAITING_CONFIRMATION`, `source: CUSTOMER_PORTAL` (S1)
- Booking list fetch: assert RLS — customer A cannot see customer B's bookings (S3, §12 RBAC)
- Status tracker: assert timeline events render for each JC status (S4)
- SA confirm flow: assert transition AWAITING_CONFIRMATION → RECEIVED (S5)
- SA decline flow: assert transition AWAITING_CONFIRMATION → CANCELLED + `declineReason` set (S5)
- Notification stubs called on JC-P1, JC-P2, JC-P3 with correct template IDs (S6)

**E2E (Playwright)**
- P1: Happy-path booking from vehicle pick → submit → confirmation screen (S1)
- P2: Status tracker page renders correct state badges for a RECEIVED JC (S4)

**Accessibility tests**
- Axe scan on each wizard step (WCAG 2.1 AA, NFR-U-01)
- Keyboard-only booking completion test

**UAT**
- Service Advisor (R09) confirms a portal booking on Bay Board; customer booking card updates to RECEIVED (S5).
- SA declines a portal booking; customer sees "Declined" badge with reason (S5).

## 18. Open questions

| # | Question | Owner | Due | Default if undecided |
|---|---------|-------|-----|---------------------|
| OQ1 | Should home-pickup address be validated against an outlet's serviceable-PIN list? In v1 we mock 3 cities; the list is hardcoded. Is a PIN-code CSV lookup needed at launch? | Product | 2026-05-05 | Mock validation (BLR/MUM/CHE city PINs only) |
| OQ2 | What is the SLA for staff to Confirm/Decline portal bookings — 4 hours business hours, or 24 hours? This drives the F5 escalation alert threshold. | Operations | 2026-05-05 | 4 business hours |
| OQ3 | Should customers be able to add an optional budget ceiling in the booking form (Doc 05 §2.2 mentions "estimated budget")? Or defer to post-estimate approval flow? | Product | 2026-05-05 | Defer to v1.5; SA will call/WhatsApp to confirm budget |
| OQ4 | WhatsApp vs SMS fallback: if customer has no WhatsApp linked, do notifications fall back to SMS DLT templates? BSP vendor not yet confirmed (Doc 08 risk register). | Operations | 2026-05-12 | Log-only in v1; add real channel after BSP procurement |

Zero open questions required before `status = approved`.

## 19. Dependencies

| Dependency | Type | Required by |
|-----------|------|------------|
| SPEC-SERVICE-001 approved + shipped (Bay Board + JC store) | Spec/Code | P1 of this spec |
| SPEC-CUSTOMER-PORTAL-001 shipped (portal layout, auth mock, vehicle selectors) | Spec/Code | Both phases |
| `packages/types/src/domain/service.ts` enum patch (`AWAITING_CONFIRMATION`) | Code | P1 |
| `apps/staff-web/src/lib/service/state-machine.ts` transition patch | Code | P1 (staff confirm/decline) |
| `packages/types/src/domain/service-booking.ts` new file | Code | P1 |
| WhatsApp BSP vendor selection (Doc 08 risk) | External | P2 notifications live |
| DLT template registration (3 templates) | External/Compliance | Before go-live notification sends |

## 20. Rollback plan

Feature flag `feat_customer_service_booking` is the kill switch.

On toggle-off:
- `/(portal)/service/book` and `/(portal)/service/bookings` routes return a "coming soon" stub page.
- Any `AWAITING_CONFIRMATION` JCs already in the store remain visible to staff; they can be manually cancelled (R09) without customer notification.
- No data cleanup required (enum addition is non-breaking; additive fields are nullable).

Customer-visible impact if rolled back: "Service booking is temporarily unavailable. Please call your outlet."

## 21. Phase plan

### P1 — Booking flow + JC creation (MVP)
Deliverables: `/(portal)/service/book` wizard (S1, S2), `/(portal)/service/bookings` list (S3), service-store AWAITING_CONFIRMATION state + transitions (JC-P1..P3), staff Bay Board "Awaiting Confirmation" swim lane (S5), notification stubs (S6).

Files changed (estimated):
- `packages/types/src/domain/service.ts` — add `AWAITING_CONFIRMATION` to enum + new fields
- `packages/types/src/domain/service-booking.ts` — new file
- `apps/staff-web/src/lib/service/state-machine.ts` — transitions patch
- `apps/staff-web/src/lib/service/service-store.ts` — createBookingFromPortal action
- `apps/staff-web/src/components/service/bay-board.tsx` — new swim lane
- `apps/customer-web/app/(portal)/service/book/page.tsx` — new
- `apps/customer-web/app/(portal)/service/bookings/page.tsx` — new
- `apps/customer-web/src/lib/service/` — booking store + MSW handlers

### P2 — Status tracker + notifications
Deliverables: `/(portal)/service/bookings/[id]` status tracker (S4), timeline with advisor notes, WhatsApp/email notification stubs wired to JC transitions, pre-arrival reminder stub (Doc 05 §2.4).

Files changed (estimated):
- `apps/customer-web/app/(portal)/service/bookings/[id]/page.tsx` — new
- `apps/customer-web/src/components/service/job-card-timeline.tsx` — new customer-surface component
- `apps/staff-web/src/lib/service/service-store.ts` — notification hook points on JC-P2, JC-P3

## 22. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-28 | 0.1 | orchestrator | Initial draft |
| 2026-04-28 | 0.2 | orchestrator | Review fixes applied (B1–B5). Status → approved. B1: pii_sensitivity low→medium + §13 reasoning updated. B2: customerId removed from ServiceBookingRequestSchema + enforcement note added. B3: locked decision L5 added for AWAITING_CONFIRMATION→CANCELLED role override. B4: §7.3 restricted to customer-visible timeline event kinds only; S4 AC updated. B5: cancellation policy clarified in Non-goals; self-cancel of AWAITING_CONFIRMATION added to S3 AC. |
| 2026-04-29 | 1.1 | orchestrator | Two production hardening items. (1) §11 analytics events implemented: 5-event schema wired — `service_booking_started` on wizard mount, `service_booking_step_completed` on each advance, `service_booking_submitted` after JC-P1 succeeds, `service_booking_confirmed_by_staff` / `service_booking_declined_by_staff` in staff service-store actions. Analytics helpers at `apps/customer-web/src/lib/analytics.ts` and `apps/staff-web/src/lib/analytics.ts` (v1: console.debug + window.__bn_analytics push). (2) Self-cancel discriminator promoted to locked decision: §0 L_SVC_BOOK_1 added; `SELF_CANCEL_REASON = 'Cancelled by customer'` constant extracted to `apps/staff-web/src/lib/service/state-machine.ts`, re-exported from `apps/customer-web/src/lib/service/service-booking-store.ts`; all magic-string literals in `service-booking-service-bridge.ts`, `service-store.ts`, and `bookings/page.tsx` replaced with the constant. L_SVC_BOOK_1 cross-referenced from §6 (JC-P3), §8.1 (detail note), §15 (F9 failure mode). 2 new test files: `analytics-service-booking.test.ts` (customer-web, 14 tests) and `analytics-service-booking-staff.test.ts` (staff-web, 6 tests). |
