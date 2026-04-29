---
review_id: REVIEW-SPEC-CUSTOMER-PORTAL-002
spec_id: SPEC-CUSTOMER-PORTAL-002
reviewer: orchestrator (security hat + light-finance hat + QA hat)
review_date: 2026-04-28
spec_version: 0.1
verdict: APPROVE WITH FIXES
---

# Review — SPEC-CUSTOMER-PORTAL-002 Customer Service Booking

## Verdict

**APPROVE WITH FIXES** — All blockers are patchable in under 40 lines of spec edits.
The spec is well-structured, correctly cites docs, and the state-machine extension
is sound. Fix the 5 blockers below before status is changed to `approved`.

---

## State-machine extension verdict

**SOUND — approve the design with one clarification needed.**

The `AWAITING_CONFIRMATION` addition (§5.1, §5.3, §6) is non-breaking. Verification:

1. **Existing transitions untouched.** The current `TRANSITIONS` record in
   `state-machine.ts` (line 21–32) has no entry for `AWAITING_CONFIRMATION`.
   The spec adds it as a new key; all existing entries remain unchanged. No existing
   consumer of `allowedNext()` or `canTransition()` can receive `AWAITING_CONFIRMATION`
   as an input today, so adding it is purely additive. TypeScript will surface any
   exhaustive-switch gaps at compile time after the enum patch. ✓

2. **`CANCELLED` is already terminal** (`TRANSITIONS.CANCELLED = []`, line 31). The
   new `AWAITING_CONFIRMATION → CANCELLED` path uses the existing terminal correctly. ✓

3. **`createJobCard` hardcodes `status: 'RECEIVED'`** (service-store.ts line 385).
   The spec correctly proposes a separate `createBookingFromPortal` action (§21 P1
   file list) that sets `status: 'AWAITING_CONFIRMATION'` instead of touching the
   existing action. This is the right call — no regression risk. ✓

4. **Role gate for `AWAITING_CONFIRMATION`.** The spec sets
   `ROLE_GATES['AWAITING_CONFIRMATION'] = []` (§5.3). This means any authenticated
   staff user can execute JC-P2/P3. The existing `ROLE_GATES.CANCELLED = ['R19',
   'R22', 'R24']` (state-machine.ts line 69) means staff-initiated cancellations
   require R19+. The spec's JC-P3 (SA decline) is R09/R03/R01 (§6 guard column),
   which contradicts the role gate. **See Blocker B3.**

5. **Bay Board swim lane.** The spec (§8, S5 AC) says `AWAITING_CONFIRMATION` appears
   in a new "Awaiting Confirmation" swim lane, separate from `RECEIVED`. This is
   correctly additive to the Bay Board — the existing board filters by status per
   swim lane. No existing column breaks. The spec does not address what happens to
   in-flight `AWAITING_CONFIRMATION` JCs when the feature flag is toggled off; §20
   handles this adequately. ✓

---

## Blockers (must fix before `approved`)

### B1 — `pii_sensitivity` is wrong in frontmatter (line 8)

**Hat: Security + Privacy**

The spec sets `pii_sensitivity: low`. Section §13 correctly identifies `pickupAddress`
as PII. Per CLAUDE.md §8, address fields require `pii_sensitivity: medium` at minimum.
The `ServiceBookingRequest` schema (§5.4 line 183–190) includes `line1`, `city`,
`pinCode` — all locatable address data. Low sensitivity is reserved for specs with no
address/phone/email at all.

**Fix:** Change frontmatter `pii_sensitivity: low` → `pii_sensitivity: medium`.

Additionally, §13 states "low sensitivity (no Aadhaar/PAN/phone/email)" as justification
for `low`. This reasoning is flawed — street address is medium PII under DPDP even
without Aadhaar. The §13 text should be updated to acknowledge the correct classification.

---

### B2 — `customerId` in `ServiceBookingRequest` schema is a security hole (lines 178–193)

**Hat: Security**

`ServiceBookingRequestSchema` (§5.4) includes `customerId: z.string()` as a top-level
field on the request body. The spec's §14 NFR-S states "server action validates
`customerId` from session on every mutation — never trust client-supplied `customerId`."
These two requirements directly contradict each other: if the server ignores the
client-supplied `customerId`, it should not be in the request schema at all. Keeping it
creates a surface where:

- A confused implementer wires the client `customerId` to the JC directly.
- MSW handlers use the body field, masking the server-side enforcement gap.

**Fix:** Remove `customerId` from `ServiceBookingRequestSchema`. The server action
derives `customerId` exclusively from `session.customerId`. Document this in §7.1 with
an explicit note: "customerId is NOT accepted in the request body; it is sourced from
the authenticated session."

---

### B3 — Role-gate conflict: JC-P3 decline vs. `ROLE_GATES['CANCELLED']` (lines 163, 204)

**Hat: Security + QA**

The spec sets `ROLE_GATES['AWAITING_CONFIRMATION'] = []` (§5.3) and documents JC-P3
(Decline) as executable by R09/R03/R01 (§6 guard column). However, the existing
`ROLE_GATES.CANCELLED = ['R19', 'R22', 'R24']` (state-machine.ts line 69) gates the
`CANCELLED` destination, not the source. Since `canEnterStatus('CANCELLED', roleCode)`
is checked before any transition into `CANCELLED`, R09 (Service Advisor) would be
blocked from performing the decline.

This creates a spec–code mismatch: the spec says R09 can decline, but the existing role
gate says only R19+ can enter `CANCELLED`. Either:

- Option A: The spec must explicitly note that the `CANCELLED` role gate must be relaxed
  for the portal-decline path (requires a code change to `ROLE_GATES.CANCELLED` or a
  path-specific override in the `createBookingFromPortal` decline action).
- Option B: Only R19+ can decline portal bookings (consistent with existing gate,
  but poor UX for the Service Advisor use case described in S5).

Option A is the correct product intent. The spec must explicitly call out the
`ROLE_GATES.CANCELLED` patch required.

**Fix:** Add to §5.3 or §6: "Note: the existing `ROLE_GATES.CANCELLED` entry must be
updated or overridden for the `AWAITING_CONFIRMATION → CANCELLED` path to permit R09,
R03, and R01. A targeted override in the decline action is preferred over widening the
global gate, to avoid unintended permission expansion on other cancellation paths."

---

### B4 — Status tracker leaks advisor notes without an internal-only filter (lines 99, 235)

**Hat: Security**

§4 S4 AC (line 99): "if the JC is in `DIAGNOSED` or later and has advisor notes, then
each note is shown in the timeline at the correct timestamp."

§7.3 (line 235): the detail API returns `advisorNotes: AdvisorNote[]` with no
qualification on which notes are visible to the customer.

The existing `AdvisorNote` type (service-store.ts line 661–678) stores all notes in a
flat array with no `visibility` or `internal` flag. Advisor notes in practice include
internal cost negotiations, warranty pre-approval amounts, inter-staff escalations, and
parts pricing. Exposing all notes to the customer is a data leak and could expose cost
breakdowns that the spec explicitly places out-of-scope (Non-goals: "estimate comes from
SA after JC is confirmed — v1.5").

**Fix:** One of:
- Option A (preferred for v1): The status tracker renders only timeline events of types
  `received`, `status_changed`, and a new `customer_note` type — never raw `AdvisorNote`
  records. Add an AC to S4 and an explicit exclusion note in §7.3.
- Option B: Add a `visibility: 'INTERNAL' | 'CUSTOMER'` flag to `AdvisorNote` and filter
  on `visibility === 'CUSTOMER'` in the portal API. Requires a type change.

The spec must pick one option and specify it. Currently unspecified = implementer will
guess, and the likely guess exposes all notes.

---

### B5 — Cancellation policy completely absent (spec line 51)

**Hat: QA + Security**

§2 Non-goals (line 51): "Cancellation / reschedule flow (v1.5)." However, the spec
never answers whether a customer can cancel an `AWAITING_CONFIRMATION` booking before
staff acts on it. The scenarios S1–S6 and §15 failure modes both omit this.

This gap creates implementation ambiguity:
- If customers cannot cancel in v1, the booking list card (S3) must show no cancel
  button and should show a "Call us to cancel" affordance. This must be in the AC.
- If customers can cancel, a transition `AWAITING_CONFIRMATION → CANCELLED` by R20 is
  needed — but the current spec only grants that transition to R09/R03/R01 (§6).

**Fix:** Add a one-sentence policy to §2 Non-goals: "Customer-initiated cancellation of
a pending booking is not available in v1; only staff (R09+) can decline/cancel portal
bookings. The booking list card will show a 'Contact workshop to cancel' link." And add
a matching AC to S3.

---

## Concerns (should fix, not blocking)

### C1 — `serviceTypeId` not in `ServiceBookingRequest` / `JobCard` ZodEnum; free-string risk

§5.2 defines `serviceTypeId: string` with no enum constraint or FK guard. The fixture
has exactly 6 IDs. The server action should validate `serviceTypeId` against the known
fixture IDs at submission time (or against `getServiceTypes()` return value). Without
this, a tampered `serviceTypeId` value silently creates a JC with an unresolvable
service type. Add a server-side validation note to §7.1.

### C2 — Duplicate-booking guard (F2) missing from integration-test list

§17 unit tests cover F2's guard logic, but the integration tests (§17 line 409+) do not
include "assert 409 on duplicate VIN+date+slot submission." This is a real user error
path. Add it to the integration test list.

### C3 — i18n compliance gap (CLAUDE.md §10 DoD item 7)

The spec does not mention `next-intl` keys for any user-facing string (wizard step
labels, badge copy, empty-state text, notification messages, error messages). Per CLAUDE
§10 DoD item 7, no hardcoded user-facing strings may ship. The spec should add a
requirement: "all UI strings must use `next-intl` keys under
`messages/en-IN/service-booking.json`." Without this, an implementer is likely to
hardcode English strings throughout a 5-step wizard.

### C4 — Storybook story requirement not called out (CLAUDE.md §10 DoD item 8)

Per CLAUDE §10 DoD, every component requires a Storybook story. §21 P1 estimates 8 new
files but does not list Storybook stories. The spec should include `ServiceBookPage`,
`ServiceBookingsPage`, and `JobCardTimeline` stories in the P1/P2 deliverables.

### C5 — `requestId` idempotency key: no spec for client generation or storage

§7.1 specifies idempotency via client-generated `requestId` UUID with a 10-minute
deduplication window. The spec does not say where the client stores this key between
wizard steps (session storage? React state?) or how the 10-minute window is enforced
in the in-memory mock store. In a mock environment, every page reload loses the key,
making deduplication untestable. Add a note in §7.1 or §17.

---

## Traps (implementation pitfalls to flag to /implement)

**T1 — `createJobCard` must NOT be used for portal bookings.**
The existing `createJobCard` in service-store.ts hardcodes `status: 'RECEIVED'`
(line 385). The new `createBookingFromPortal` action must be a separate function that
sets `status: 'AWAITING_CONFIRMATION'` and the new fields. Reusing `createJobCard`
would silently skip the confirmation gate.

**T2 — Bay Board TypeScript exhaustiveness.**
After the `JobCardStatus` enum patch, any `switch (jc.status)` in the Bay Board
component will get a TypeScript error for the unhandled `AWAITING_CONFIRMATION` case
(strict mode + `noUncheckedIndexedAccess`). The implementer must add a case for the
new swim lane or an explicit `default` branch.

**T3 — `cloneJobCard` propagates new fields.**
`cloneJobCard` (service-store.ts line 1038–1071) uses `structuredClone(src)` and resets
status to `RECEIVED`. If a portal JC is cloned, `source: CUSTOMER_PORTAL`,
`serviceTypeId`, and `pickupAddress` will be copied. The staff operator will then have
a JC with `source: CUSTOMER_PORTAL` that was staff-initiated. Add a note to the spec
that cloning a portal JC should reset `source` to `STAFF` and clear `pickupAddress`.

**T4 — `pickupAddress` in analytics events.**
§11 analytics events include `service_booking_submitted` with `pickupMode` as a
property. Ensure `pickupAddress` fields (line1, city, etc.) are never included in
analytics payloads — only `pickupMode: 'HOME_PICKUP' | 'WORKSHOP_DROP'` as an enum.
Per CLAUDE §12, no PII concatenation into logs.

**T5 — Empty `advisorId` on portal-originated JC.**
The portal booking creates a JC before any SA has confirmed. The `JobCard` type in
service-store.ts (line 848 check-in flow) always expects `advisorId`. The new
`AWAITING_CONFIRMATION` JC has no SA assigned yet. The spec should note that `advisorId`
is optional/empty until JC-P2 (SA confirms) and implementers must guard against
`undefined` in any component that renders `advisorId`.

---

## Missing acceptance criteria

| Gap | Location | Suggested addition |
|-----|----------|--------------------|
| Customer cannot cancel own booking in v1 | S3 | "Given a booking is `AWAITING_CONFIRMATION`, then the card shows a 'Contact workshop to cancel' link; no cancel button is rendered." |
| Advisor notes are filtered on status tracker | S4 | "Given the JC has internal advisor notes, then only customer-visible timeline events are shown; raw advisor notes are not exposed." |
| `serviceTypeId` validates against fixture | §7.1 | "Server action rejects unknown `serviceTypeId` with 422." |
| Feature flag hides routes | §16 | "When `feat_customer_service_booking` is off, both portal routes return 200 with a coming-soon stub; no 404 to avoid route enumeration." |
| F5 (4h SLA) not in any test scenario | §17 | Add an integration test: "given a JC is `AWAITING_CONFIRMATION` for >4h, a staff-web amber badge renders." |

---

## Open questions raised by this review

| # | Question | Urgency |
|---|----------|---------|
| RQ1 | Which note types from `JobCardTimelineEvent` are customer-visible? Need an explicit allowlist. Needed before P2 (status tracker). | High |
| RQ2 | Should `ROLE_GATES.CANCELLED` be widened globally (allow R09) or patched only for the portal-decline path? Architectural decision. | High |
| RQ3 | How does the slot grid interact with the existing `Appointment` entity in service-store? Portal bookings create a JC directly (no Appointment row). Is that intentional, or should `AWAITING_CONFIRMATION` JCs also create an `Appointment` for bay-calendar visibility? | Medium |

---

## Per-hat findings summary

### Security hat

| # | Finding | Severity |
|---|---------|----------|
| B2 | `customerId` in request body — trust client ID risk | Blocker |
| B4 | Advisor notes exposed to customer without visibility filter | Blocker |
| B3 | R09 cannot enter `CANCELLED` per existing role gate | Blocker |
| T4 | PII in analytics events risk | Trap |
| §13 | `pii_sensitivity: low` misclassification | Blocker (B1) |

Auth flow assessment: §14 NFR-S explicitly requires session-sourced `customerId` and VIN
ownership check via `selectVehiclesByCustomer`. This is the correct approach. The only
gap is the schema contradiction (B2). RLS on list/detail (§7.2–7.3) is correctly
specified with explicit 403 on cross-customer access.

DPDP: §13 is well-drafted. Consent check on notification sends is correctly gated on
`SERVICE_COMMS` purpose. `pickupAddress` purpose binding to `SERVICE_LOGISTICS` is
adequate. The `pii_sensitivity` header mismatch (B1) is the only compliance gap.

DLT: All three template IDs are named (§9) — `DLT_SVC_BOOKING_CREATED`,
`DLT_SVC_BOOKING_CONFIRMED`, `DLT_SVC_BOOKING_DECLINED`. This meets the CLAUDE §9
guardrail for v1 log-only mode.

### Light-finance hat

No money flows in this spec (per Non-goals §2). No GST, TCS, Razorpay, or journal
entries. No finance review items.

Observation: §2 Non-goals correctly defers payment collection to v1.5. Spec correctly
notes "estimate comes from SA after JC is confirmed." Price ranges shown in the booking
wizard (§8.2 Step 2) are informational from the fixture and carry no billing obligation.
No finance risk.

### QA hat

| # | Finding | Severity |
|---|---------|----------|
| B5 | Cancellation policy undefined — untestable AC for cancel button presence | Blocker |
| B3 | Role gate gap leads to failing integration test for R09 decline | Blocker |
| C2 | Duplicate booking (F2) missing from integration test list | Concern |
| F5 SLA test | 4h SLA alert not in test plan | Missing AC |

Test plan coverage assessment (§17):
- Unit tests: good. Schema + transition guard + VIN ownership + duplicate booking logic
  all called out.
- Integration tests: good breadth. RLS test (customer A/B isolation) is explicitly
  listed, which is the highest-value test in this spec.
- E2E: P1 happy path + P2 status tracker tracker are appropriately scoped.
- Accessibility: axe scan + keyboard test are listed — meets CLAUDE §10 DoD.
- Missing: duplicate booking 409 integration test (C2); F5 SLA badge render test.

Mobile-first (§8.5): breakpoints are adequately specified. Single-column wizard,
collapsed step indicator on `< sm`, card stack for bookings list — all present. ✓

Empty/loading/error states (§8.3): all 6 states are enumerated with specific treatments.
Meets CLAUDE §4 + §10 DoD. ✓

---

## Suggested L-decisions (leadership choices to lock before build)

| # | Decision | Options | Recommended |
|---|----------|---------|-------------|
| L1 | Customer-visible note types on status tracker | (A) timeline events only; (B) add `visibility` flag to `AdvisorNote` | A for v1 — simpler, no type change |
| L2 | CANCELLED role gate for SA decline | (A) widen global gate to include R09; (B) path-specific override in decline action | B — avoids expanding cancel permissions on other paths |
| L3 | Portal booking creates Appointment row? | (A) JC only (current spec); (B) JC + Appointment for bay-calendar visibility | A for v1 — Appointment entity not needed until live bay-calendar (Doc 05 §2.3 deferred) |
| L4 | Customer cancel in v1 | (A) no cancel, show contact link; (B) allow cancel of AWAITING_CONFIRMATION only | A — consistent with Non-goals §2 deferral; avoids new role grant |
