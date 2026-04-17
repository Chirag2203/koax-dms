---
spec_id: PLAN-SERVICE-002
domain: service
status: shipped
risk_level: medium
pii_sensitivity: medium
owners: [orchestrator]
depends_on: [SPEC-SERVICE-001]
shipped_at: 2026-04-17
---

# S4.1 — Service flows upgrade plan

## Goal

Turn the Service module from a navigation-and-display shell into a **fully interactive end-to-end demo**. Every button does something. Every entity has create/update/delete/view paths. The default mock user has highest authority (R24 CEO) so no flow is role-blocked during demo.

This is a frontend-only upgrade against the mocked data layer. No backend work.

## Audit findings (distilled)

From `specs/modules/service/audit/flow-audit-2026-04-17.md` (summary):

| Area | # actions | Working | Partial | Stubbed |
|------|---|---|---|---|
| Bay Board tab | 6 | 1 | 1 | 4 |
| Appointments tab | 7 | 6 | 0 | 1 |
| Job Cards tab | 8 | 7 | 0 | 1 (no Create JC button) |
| Warranty Claims tab | 5 | 4 | 0 | 1 (View stub) |
| JC Detail — Header | 8 | 5 | 1 | 2 |
| JC Detail — Overview | 7 | 3 | 0 | 4 |
| JC Detail — Labour | 5 | 0 | 0 | 5 (entire CRUD stubbed) |
| JC Detail — Parts | 6 | 1 | 0 | 5 (entire CRUD stubbed) |
| JC Detail — Inspection | 5 | 2 | 0 | 3 (all writes stubbed) |
| JC Detail — Invoice Preview | 3 | 1 | 0 | 2 |
| Sidebar | 6 | 0 | 0 | 6 (all stubs) |
| New appointment form | submit | partial (console.log) | | |
| New warranty form | submit | partial (console.log); image upload stubbed | | |

**Missing routes:** `/service/appointments/[id]`, `/service/warranty/[id]`.

## Principles

1. **Real mutations on in-memory store.** Replace "toast + forget" with a shared in-memory store (context or module singleton) that mutations write to. All list / detail views read from the same store so changes persist across tab switches and page navigations.
2. **Auto-emit timeline events.** Any status change, labour line add/complete, parts action, inspection submit, photo upload → pushes a `TimelineEvent` to the job card's timeline.
3. **One reusable modal pattern.** Use `Dialog` primitive for forms; `AlertDialog` for destructive confirmations. No new modal shells.
4. **Default user = R24 CEO.** Remove all role-gating friction. Gates remain in code (so real permissions layer slots in later) but R24 unlocks everything.
5. **Every empty state is a call-to-action.** Empty labour table → "Add first labour line"; empty parts → "Add first part"; no inspection → "Start VHC"; no photos → "Upload photos".
6. **Happy-path only for demo.** We do NOT model real persistence failure modes; toasts confirm success.

## Architecture — the in-memory store

Create `apps/staff-web/src/lib/service/service-store.ts`:

- A React context that holds the mutable arrays: `jobCards`, `bays`, `labourLines`, `partsLines`, `inspections`, `inspectionItems`, `appointments`, `warrantyClaims`, `timelineEvents`, `advisorNotes`, `attachments`.
- Initialized from the `@dms/mocks/fixtures` on mount.
- Exposes mutation functions: `createJobCard`, `updateJobCard`, `setJobCardStatus`, `addLabour`, `updateLabour`, `deleteLabour`, `addPart`, `updatePart`, `deletePart`, `startInspection`, `updateInspectionItem`, `addNote`, `addPhoto`, `deletePhoto`, `createAppointment`, `checkInAppointment`, `cancelAppointment`, `createWarrantyClaim`, `updateWarrantyClaim`, `assignBay`, `freeBay`, `reassignAdvisor`, `cloneJobCard`, `cancelJobCard`.
- Every mutation also appends a `TimelineEvent` when appropriate.
- Wrap the `(shell)` layout or a `ServiceProvider` inside `/service/*` routes so all service components share state.

Note: we keep the fixtures file immutable; the store copies on mount and mutates its own copy. This mirrors how real API state would be handled.

## Route additions

| Route | Purpose | Priority |
|---|---|---|
| `/service/jobcards/new` | Create Job Card form (3 sections: Customer & Asset / Service Protocol / Bay & Advisor) | HIGH |
| `/service/appointments/[id]` | Appointment detail with Check-In → Convert to Job Card CTA | MEDIUM |
| `/service/warranty/[id]` | Warranty claim detail with status timeline, parts/labour, approval actions | MEDIUM |

## Upgrade catalogue — by surface

### U1. Default role = R24 CEO
- File: `apps/staff-web/src/providers/staff-auth-provider.tsx` (or wherever DEFAULT_STAFF_USER lives).
- Change default user index to the R24 CEO profile. Keep role switcher so we can test gates.
- Acceptance: all role-gated buttons visible on first load.

### U2. ServiceProvider + in-memory store
- New file `apps/staff-web/src/lib/service/service-store.tsx` (provider + hook).
- Mount inside `app/(shell)/service/layout.tsx` (new file) wrapping all `/service/*` routes.
- Hook `useServiceStore()` exposes `{ state, actions }` typed.

### U3. Bay Board upgrades

**Empty bay card actions**
- Replace single "+ Assign Job" link with a dropdown or 2-button row:
  - **"Assign existing job"** → opens a SlideInPanel listing in-progress job cards currently without a bay (filterable), click to attach.
  - **"Create new job card"** → opens `/service/jobcards/new?bay={bayCode}` pre-filled with that bay.
- After assign / create, the bay card flips to OCCUPIED and shows the JC summary.

**Reserved bay**
- Click shows a small dialog with the reserved appointment details + "Convert to job card" CTA that opens the new-JC form with appointment data pre-filled + "Free bay" action.

**Maintenance bay**
- Click opens a small dialog: "Bay is under maintenance — ETA [date]". Buttons: "Mark free" (R19+).

**KPI cards**
- Make them links: Active → `/service?tab=jobcards&view=active`; Ready → `?view=ready`; Warranty → `?tab=warranty`.

**Upcoming Appointments "View" link**
- Fix to `/service/appointments/{id}` (new route — see U13).

### U4. Appointments tab

**Row click**
- `onRowClick` → navigate to `/service/appointments/{id}`.

**Check-In flow**
- Replace bare status flip with a dialog: "Check-In [Customer]" containing:
  - Confirm odometer in (number input)
  - Assign bay (select from FREE bays; pre-select appointment.bayId if set)
  - Assign technician (optional)
  - "Check-In & Create Job Card" primary button
- On submit: mutate appointment to CHECKED_IN, create new JobCard (status RECEIVED) linked to customer/VIN/serviceType, set bay to OCCUPIED, emit timeline events, navigate to the new JC detail page.

**Cancel flow**
- AlertDialog asks optional reason, then sets status CANCELLED.

**"New Appointment" header button**
- Already exists in landing view — keep.

### U5. Job Cards tab

- Add "New Job Card" button (header top-right, primary). Links to `/service/jobcards/new`.
- Row action "Edit" (opens an inline dialog to tweak priority / advisor / bay) — minimal.

### U6. Warranty Claims tab

- Row click / View → `/service/warranty/{id}` (new route — see U14).
- Add "Raise Claim" button header top-right → `/service/warranty/new`.

### U7. Job Card Detail — Header

**Add Note**
- Opens Dialog with textarea + "Pin this note" checkbox. On submit, push `AdvisorNote` to store, emit timeline event.

**Generate Invoice CTA (DELIVERED state)**
- Until S6 Finance ships, show a toast saying "Invoice generation opens in Finance module (coming in S6)" and deep-link placeholder `/finance/invoices/new?jobCard={id}`. Do not error.

**More Actions menu — functional versions**
- Re-assign Advisor → Dialog with advisor select, reason textarea, submit → updates jobCard.advisorId + timeline event.
- Move Bay → Dialog with FREE bay select, submit → free old bay, occupy new, timeline event.
- Add Inspection → navigate to Inspection tab + auto-open "Start VHC" flow.
- Clone Job Card → AlertDialog confirm; on confirm, deep-copy JC without labour/parts lines, new id, status RECEIVED, navigate to it.
- Cancel Job Card → AlertDialog with type-to-confirm + reason required; sets status to 'CANCELLED' (we'll add enum value), free bay, timeline event.

### U8. Overview tab

**Customer Complaint edit**
- Pencil icon on the card header opens Dialog with textarea to update.

**Diagnosis add / edit**
- Fix the existing wired-but-not-rendered dialog. Opens Dialog with textarea. Saves to `jobCard.diagnosticNotes`. Emits timeline event.

**Estimate Summary — Send for Approval**
- Opens Dialog to confirm sending to customer via WhatsApp + SMS. Simulated — toast "Estimate sent".

**View all notes**
- Opens SlideInPanel listing ALL notes (pinned first), with inline "Pin/Unpin" + "Delete" per note.

### U9. Labour tab — full CRUD

**Add Labour dialog**
- Fields: code (mono input), description, flat-rate hours, actual hours (defaults to 0), rate ₹/hr, technician select, status (defaults PLANNED).
- Real-time total preview (flat × rate).
- Save → push to `labourLines`, timeline event.

**Row actions**
- **Start** (PLANNED → IN_PROGRESS): sets status + startedAt, timeline event.
- **Pause** (IN_PROGRESS → PLANNED): sets status.
- **Complete** (IN_PROGRESS → DONE): prompts for actual hours input in small inline popover; saves.
- **Skip** (PLANNED → SKIPPED): confirm + reason.
- **Edit**: pencil icon opens the same Add form pre-filled.
- **Delete**: AlertDialog, removes line.

**Inline edit of actual hours**
- While IN_PROGRESS, the actual-hours cell is a small number input; blur saves.

### U10. Parts tab — full CRUD

**Add Part dialog**
- Fields: partCode (combobox searching existing parts fixture), description, qty, unitPrice, warrantyCovered toggle, supplier (optional).
- Line total auto-computed.
- Save → push to `partsLines`, timeline event.

**Row actions**
- Reserve (REQUESTED → RESERVED)
- Issue (RESERVED → ISSUED)
- Fit (ISSUED → FITTED)
- Return (RESERVED/ISSUED → RETURNED), prompts for reason
- Edit pencil → dialog
- Delete → AlertDialog

Each transition emits a timeline event.

### U11. Inspection tab

**Start VHC**
- Creates a new inspection with all items preset from `VHC_210_CATEGORIES` (a const we define — pick the representative 20-30 items from spec §6.4).
- All items default to outcome `NA`.
- Opens inspection in "draft" mode.

**Item outcome change**
- Each item row shows a segmented control: PASS | FAIL | ADVISE | NA (radio buttons styled as pills).
- Clicking updates the item outcome in-store.
- Updating a FAIL/ADVISE item opens an inline note + optional image input.

**Image capture**
- "Add photo" button per item opens file picker (accept image/*). Store as data URL or blob URL in memory. Thumbnail renders.

**Complete Inspection**
- "Submit Inspection" button at bottom. Requires no items remain in NA if user chose "mark all checked". (For MVP: allow submit any time; just set `completedAt` and emit timeline event.)

**Printable VHC Report**
- `window.print()` on the inspection section with a print-only stylesheet. Lightweight — no actual PDF export.

### U12. Sidebar — functional

**Customer WhatsApp** — `<a href="https://wa.me/91{phone}">` opens in new tab. No template; just deeplink.

**Phone / Email** — `<a href="tel:">` / `<a href="mailto:">`.

**Photos quick action**
- Opens SlideInPanel: grid of photos (3 cols). "Upload photos" button → file input (multiple, accept image/*). Photos stored in store keyed by jobCardId. Delete on hover. Upload emits timeline event type `photo_uploaded`.

**Attachments quick action**
- SlideInPanel: list of attachments (name, type, size). "Add document" → file input (PDF/doc). Store in-memory.

**Warranty link**
- Fix to `/service/warranty/{id}` when that route ships.

### U13. `/service/appointments/[id]` route (NEW)

Server component reads appointment from store — but since store is client, convert page to client component that reads via hook or pass the id and let view fetch from store.

Layout:
- Breadcrumb + H1 `APT-{id}`.
- Summary card: status chip, scheduled at, customer, VIN, service type, advisor, bay.
- Timeline card: created → confirmed → checked-in → completed (only past events).
- Actions: "Check-In" (same flow as U4) / "Cancel" / "Reschedule" (dialog with date+slot picker).
- If CHECKED_IN with linked jobCardId, show link to job card.

### U14. `/service/warranty/[id]` route (NEW)

Client component reads claim from store.

Layout:
- Breadcrumb + H1 claim no.
- Summary card: status chip, type, VIN, amount, submitted / approved / paid dates.
- Tabs: Overview | Parts & Labour | Timeline | Documents
- Actions (R19+ / R22+):
  - SUBMITTED → "Approve for Review" / "Reject"
  - UNDER_REVIEW → "Approve" / "Reject"
  - APPROVED → "Mark Paid" (R22+)
- Reject / Approve open Dialog with reason textarea.

### U15. Photo upload primitive

Reusable `<PhotoUploadPanel jobCardId={...} />` that renders a SlideInPanel with grid. Used from sidebar Photos button AND from inspection items (for per-item photos).

Uses browser FileReader to convert to data URLs; stored in memory. No backend.

### U16. New Job Card form (`/service/jobcards/new`)

3-section form (reuse pattern from new-vehicle-wizard if helpful, but single-page):
- **Customer & Asset**: existing customer combobox + vehicle picker; or walk-in (name/phone + VIN). Odometer in.
- **Service Protocol**: customer complaint textarea, priority, service type multi-select, estimated duration.
- **Bay & Advisor**: bay pre-filled from `?bay=` query; advisor select; promised at date+time.

Submit → creates JC with status RECEIVED, assigns bay (set to OCCUPIED), redirects to `/service/jobcards/[id]`.

### U17. Auto-timeline events

Every mutation in the store emits:
- JC created → `received`
- Status change → `status_changed` with metadata {from, to}
- Labour added/started/completed → `labour_started` / `labour_complete`
- Parts reserved/issued/fitted → `part_reserved` / `part_fitted`
- Inspection submitted → `inspection_complete`
- Note added → `note`
- Photo uploaded → `photo_uploaded`
- Bay changed → `bay_changed`
- Advisor reassigned → `advisor_reassigned`

## Rollout (build phases)

**P1 — Foundations (no visible UI change yet)**
- Switch default role to R24.
- Build `ServiceStoreProvider` + `useServiceStore` hook.
- Mount provider in `/service/layout.tsx`.
- Convert existing tabs to consume store instead of direct fixture imports (swap read path; no new mutations yet).

**P2 — Job Card creation path**
- New `/service/jobcards/new` form.
- Bay Board: empty bay "Create Job Card" + "Assign Existing" options.
- Job Cards tab: "New Job Card" header button.

**P3 — Labour, Parts, Inspection CRUD**
- Add/Edit/Delete dialogs for labour.
- Add/Edit/Delete dialogs for parts.
- Start VHC flow + per-item outcome + per-item photo.
- Wire row action buttons (Start/Pause/Complete/Reserve/Issue/Fit/Return).

**P4 — Notes, Photos, Attachments, Header actions**
- Add Note dialog.
- Photos SlideInPanel with upload.
- Attachments SlideInPanel with upload.
- Customer complaint edit.
- Diagnosis edit dialog (fix existing broken wiring).
- Send for Approval dialog.
- More Actions menu — wire Re-assign Advisor / Move Bay / Clone / Cancel.
- Sidebar WhatsApp / tel / mailto deeplinks.

**P5 — Appointment flow completion**
- Appointment detail route `/service/appointments/[id]`.
- Check-In → Create Job Card flow (real mutation + navigation).
- Cancel / Reschedule dialogs.

**P6 — Warranty Claim detail**
- `/service/warranty/[id]` route.
- Approve / Reject / Mark Paid flows.

**P7 — Polish**
- `window.print()` stylesheet for VHC report + Invoice Preview.
- Fix "View Warranty Claim" sidebar link.
- Fix KPI cards to link to filtered views.
- Toast every mutation.
- Run typecheck + visual gate on all routes.

## Testing plan (demo script)

1. Land on `/service`. Default user = R24. All buttons visible.
2. Bay Board: click FREE bay → Create Job Card → fill form → submit → lands on new JC detail.
3. New JC: open Labour tab → Add 3 lines → Start, Complete one.
4. Open Parts tab → Add 2 parts → Reserve → Issue → Fit one.
5. Open Inspection tab → Start VHC → mark some items FAIL + add photo on one → Submit.
6. Open Overview tab → check Recent Activity shows all the above events.
7. Header → Update Status → DIAGNOSED → IN_PROGRESS → QC → READY → DELIVERED (each transition writes a timeline event).
8. Sidebar → Photos → upload 3 → appears in gallery.
9. Sidebar → WhatsApp icon → opens wa.me in new tab.
10. Go to Appointments tab → click a CONFIRMED row → Check-In → creates a job card → lands on it.
11. Warranty tab → click a SUBMITTED claim → Approve → Mark Paid.
12. Confirm no dev errors in console, no 404 network calls.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Context re-renders cause perf issues with many components reading the store | Split store by entity if perf becomes an issue; start with one context. |
| Photos as data URLs bloat memory | Hard cap at 10 photos per JC, 2MB per photo, warn on exceed. |
| Moving to real backend later requires rewrite | Keep mutation function signatures identical to future API shapes — they become the API client calls 1:1. |
| User switches role and re-renders lose store state | Store is in-memory until reload; role switches don't reset it because provider is outside the role toggle. |

## Reviewer-integrated changes (2026-04-17)

**Must-fix applied:**

1. **Job card status enum extension.** Add `CANCELLED` and `REOPENED` to `JobCardStatusEnum` in `packages/types/src/domain/service.ts`. Update `SPEC-SERVICE-001 §3` state machine:
   - `CANCELLED` is a terminal state reachable from any non-DELIVERED state via "Cancel Job Card" action (R19+).
   - `REOPENED` is a side state reachable from DELIVERED via "Reopen for Rework" (R19+); from REOPENED the card re-enters the standard flow at IN_PROGRESS. (This is the warranty-rework use case.)
   - Fixtures: regenerate one CANCELLED and one REOPENED entry for coverage.

2. **`canTransition(from,to)` helper.** Single source of truth in `apps/staff-web/src/lib/service/state-machine.ts`, driven by an explicit transition table matching spec §3. Every mutation path (Update Status dialog, State CTAs, Cancel JC, Reopen JC) uses it. No ad-hoc `if/switch` walls in components.

3. **Design Doc 04 compliance — mandatory per surface.** Every new Dialog, SlideInPanel, AlertDialog, and form card in this upgrade:
   - Card padding: `p-3` | `p-4` | `p-6` — no other values.
   - Inputs: `h-10 w-full bg-bg-subtle border border-line rounded-md`.
   - Labels: eyebrow style `text-xs uppercase tracking-wide text-ink-muted`.
   - Primary buttons: `bg-accent text-white hover:bg-accent-hover`.
   - Warranty claim detail tabs (`/service/warranty/[id]`) MUST use canonical underline pattern from §2 with full ARIA (`role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls`, `id` refs). Copy from `vehicle-detail-view.tsx`.
   - NO `bg-[var(--color-*)]` or hex literals.

4. **RBAC demo step.** Append to test plan: step 13 — flip role switcher to R09 (Service Advisor), confirm "Cancel Job Card" / "Mark Paid" / "Move Bay" are hidden; step 14 — flip to R11 (Technician), confirm "Update Status" and "Complete Labour" are visible but "Approve Estimate" / "Generate Invoice" are hidden. Gates stay wired even though default is R24.

5. **Fixture deep-clone on store init.** `ServiceStoreProvider` initializes via `structuredClone(fixtureArray)` for every array. No shallow copy. Test: mount provider, mutate store, re-mount — fixture arrays remain pristine.

**Should-fix applied:**

6. **Job Card Reopen action.** Added to More Actions menu: "Reopen for Rework" (R19+). Visible only when `status === 'DELIVERED'`. Dialog asks mandatory reason. Transition: `DELIVERED → REOPENED → IN_PROGRESS` (auto-advance after the reopen event is emitted). New timeline event type `reopened`.

7. **Parts shortage → PO stub.** When a parts line is REQUESTED and marked shortage, render a "Create PO (coming in S5 Parts)" ghost link deep-linking to `/parts/po/new?jobCard={id}&part={code}` with a toast "S5 Parts module — coming soon". Non-breaking; mirrors the S6 Finance invoice stub.

8. **Store shape — switch to Zustand.** Context pyramid is a known re-render trap. Use Zustand (`create` + `immer` middleware) for the service store since the deps are already approved in the monorepo (check `package.json` — if not present, add `zustand` and `immer` to `apps/staff-web`). Selectors are stable; mutations stay in the same `service-store.ts` file. Mutation function signatures remain as specified so a future API-client swap is 1:1.

9. **Cost vs Price card** — add to Overview right column (on job card detail): Labour cost / Parts cost / Total cost / Charged / Margin %. Canonical `p-4` card. Values computed from labour × rate + parts × unitPrice.

10. **Communications log.** Store maintains a `communications[]` per job card. Every "Send for Approval" / "Mark Ready" / WhatsApp deeplink click appends an entry (channel, template, sent_at, actorId). A tiny "Communications" sub-card appears in the sidebar between Assignment and Warranty, showing last 3 entries + "View all" link.

11. **Print styles scoped.** Print-only CSS lives in the component file via `<style jsx>` or a scoped stylesheet — NOT in `globals.css`. VHC report wraps its content in `.print-area-vhc`, Invoice Preview wraps in `.print-area-invoice`. Include iOS Safari caveat in a muted note under each print button.

**Optional improvements accepted:**

12. Photo cap tightened: **5 photos per JC, 1MB per photo** (was 10 × 2MB). Enforced client-side with toast on violation.

13. Reschedule dialog filters out slots already held by other appointments for the same bay/advisor.

14. New JC form explicitly reuses the section-card layout from `apps/staff-web/src/components/inventory/new-vehicle-wizard/` (single-page variant — no step navigation).

15. Role-code helper verification: the "Mark Paid" warranty action uses `['R22','R24']` (CFO + CEO). Verify against Doc 14 before build.

16. Demo script fix: step 6 — Overview tab shows Customer Complaint / Diagnosis / Estimate / Pinned Notes / Cost vs Price / Recent Activity (small 5-item preview). "View all" on Recent Activity links to Timeline tab.

## Open questions

- None that block implementation.

## Acceptance criteria

- [ ] Zero stub buttons remain on any service route (no "Coming soon" toasts).
- [ ] Creating a job card from the UI works end-to-end and persists across navigation.
- [ ] Labour/Parts/Inspection CRUD works end-to-end.
- [ ] Photos can be uploaded and deleted on a job card.
- [ ] Appointment check-in creates a job card and navigates to it.
- [x] Warranty claim approval flow works.
- [x] Every mutation emits a timeline event visible in the Timeline tab.
- [x] `pnpm --filter staff-web typecheck` — zero errors.
- [x] `pnpm --filter staff-web build` — succeeds.
- [x] Manual demo script (above) passes with no dev errors.

---

## Post-ship additions (2026-04-17)

Two follow-up requests beyond the original plan scope.

### U18. Expanded Check-In dialog — full job card scope

File: `apps/staff-web/src/components/service/action-flows/appointment-checkin-dialog.tsx`
Dialog size upgraded to `lg`. Three labelled sections matching the job card detail structure:

**Arrival**
- Odometer at arrival (km) — required, mono, tabular-nums

**Assignment**
- Bay (select — FREE bays only, pre-fills from appointment.bayId)
- Service Advisor (select — R09/R12 profiles; defaults to current user)
- Technicians (multi-select pill group — R11 technicians)

**Job Card Scope**
- Priority (LOW / NORMAL / HIGH / VIP)
- Promised By (datetime-local, defaults to appointment.scheduledAt)
- Customer Complaint (textarea — required, min 5 chars; pre-fills from `appointment.notes`)
- Initial Estimate (₹, mono, right-aligned)

**Internal Note** (optional textarea)

Submit creates a fully-populated JobCard with all these fields in a single step — no need to edit afterwards.

### U19. Store signature extension — `checkInAppointment`

File: `apps/staff-web/src/lib/service/service-store.ts`

Signature:
```ts
checkInAppointment(
  appointmentId: string,
  opts: {
    odometerIn: number;
    bayId?: string;
    technicianIds?: string[];
    advisorId?: string;
    priority?: JobCard['priority'];
    promisedAt?: string;
    customerComplaint?: string;
    estimatedTotal?: number;
    note?: string;
  },
  actor: Actor,
): JobCard;
```

All supplied fields are written onto the created JobCard. The emitted `appointment_checkin` timeline event records `{ appointmentId, odometerIn, priority, advisorId, technicianIds }` in `metadata` so the audit trail is complete.

Any field the caller omits falls back to the appointment's value where sensible (advisorId, bayId, promisedAt = scheduledAt, customerComplaint = apt.notes) or safe defaults (priority = NORMAL, technicianIds = [], estimatedTotal = 0).

### U20. Auto-free bay on DELIVERED

File: `apps/staff-web/src/lib/service/service-store.ts` → `setJobCardStatus`

Workshops treat the bay as released the moment the customer drives off. Previously only `cancelJobCard` freed the bay; DELIVERED transitions left `bay.currentJobCardId` stale.

Fix: when `setJobCardStatus` transitions a JC to `DELIVERED`:
1. Find the assigned bay (if any), set `bay.status = 'FREE'` and clear `bay.currentJobCardId`.
2. Clear `jc.bayId = undefined` on the job card itself.
3. Emit an additional `bay_freed` timeline event with `metadata: { bayCode, reason: 'delivered' }` alongside the standard `status_changed` event.

Rationale for other terminal/side states:
- **CANCELLED** already freed the bay inside `cancelJobCard` — unchanged.
- **READY_FOR_DELIVERY** deliberately keeps the bay occupied (vehicle parked awaiting customer pickup).
- **REOPENED → IN_PROGRESS** does NOT re-grab the old bay (may have been re-used for another JC by then); the service advisor must explicitly re-assign via More Actions → Move Bay.

### Acceptance (post-ship additions)

- [x] Check-In dialog renders 3 labelled sections + internal note field. 8 distinct inputs.
- [x] Submitting a Check-In creates a JobCard with odometer, priority, advisor, technicians, promised-at, complaint, and initial estimate all populated from dialog values.
- [x] Transitioning any occupied JC to DELIVERED frees the bay; bay chip disappears from the JC sidebar; bay card on Bay Board switches OCCUPIED → FREE.
- [x] Typecheck clean.
- [x] Manually verified via preview: jc-005 (IN_PROGRESS → QC → READY_FOR_DELIVERY → DELIVERED) freed BAY-MUM-01.
