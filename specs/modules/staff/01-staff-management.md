---
spec_id: SPEC-STAFF-001
title: Staff Management — HR, Payroll, Attendance, Leaves, Efficiency
domain: staff
status: draft
risk_level: medium
pii_sensitivity: high
flags: [staff-management, hr-payroll, attendance-fingerprint]
owners: [orchestrator]
depends_on: []
version: 0.4
created: 2026-04-28
last_updated: 2026-04-29
supersedes: null
related_specs: [PLAN-VEHICLES-003, SPEC-CUSTOMERS-001]
research_refs: [Doc 06 §15, Doc 06 §16, Doc 06 §17, Doc 06 §19, Doc 14 §1, Doc 14 §28, Doc 03 §10]
---

# Staff Management Module

Replaces the ad-hoc 8-profile `MOCK_STAFF_PROFILES` fixture with a full HR + operations
layer covering directory, profile, role governance, payroll computation, attendance
(fingerprint-backed), leave management, efficiency KPIs, org chart, onboarding, and exit.

**Single source of truth:** `MOCK_STAFF_PROFILES` in
`apps/staff-web/src/providers/staff-auth-provider.tsx` is extended to be the **canonical**
staff list. Every other module (service, parts, sales, cost ledger `addedBy: staff-...`)
imports from this fixture. The `StaffProfile` Zod schema in `@dms/types` is the contract;
`staff-auth-provider` exports both the type and the seeded array.

---

## 0. Locked decisions

| # | Decision | Source |
|---|---|---|
| L1 | **Payroll computation lives inside the DMS** for display/preview purposes (salary tab, payslip PDF). Export to greytHR/Keka CSV for statutory filing per Doc 06 §15.2. DMS never submits PF/ESI/PT returns directly. | Doc 06 §15.2, user brief |
| L2 | **Fingerprint device integration is a webhook mock.** A MSW handler at `POST /api/webhooks/fingerprint` accepts `{ deviceId, staffId, eventType: 'PUNCH_IN'\|'PUNCH_OUT', timestamp }`. Real Suprema/Mantra device connects to same contract in prod. | User brief, Doc 07 |
| L3 | **`MOCK_STAFF_PROFILES` is extended to 24 profiles (8/outlet)** and remains the authoritative seed; `staff-auth-provider.tsx` exports the full array. Other mock files import from it — no duplication. | User brief, DRY principle |
| L4 | **Role transition approvals use `hasRank(user.role, minRole)`** numeric comparator from `@dms/types` (pattern from L7 in PLAN-VEHICLES-003). Inline string comparisons are banned. | PLAN-VEHICLES-003 L7 |
| L5 | **PF cap is ₹1800/month** (12% of ₹15,000 basic ceiling per EPF Act). ESIC is 0.75% of gross if monthly gross ≤ ₹21,000. **PT slabs — NOT FOR PRODUCTION — TAX-COUNSEL CONFIRMATION REQUIRED** (see L16 and OQ-PT-1). Placeholder values in use for mock/preview only. | Doc 06 §15.2, India payroll law; see L16 |
| L6 | **Aadhaar: last-4 digits only.** Full number never stored. PAN stored masked at rest (column-level KMS) and visible only to R02+/R22+/R23. Bank details visible to R16+ payroll run. Per Doc 06 §19 + Doc 14 §28. | Doc 06 §19.1, DPDP |
| L7 | **DPDP consent is captured once at onboarding** with purpose = `STAFF_HR_PROCESSING`. Separate consent event `STAFF_DOCUMENT_ACCESS` required for any non-HR access to staff PII by roles outside R02/R16/R23. | Doc 06 §19, Doc 03 §10 |
| L8 | **Salary visible to R12+ (outlet scope) / R16+ (org scope) / R22 / R23.** Self-view always allowed. R19+ (Org Admin per Doc 14) can edit salary structures; R22 can view but not edit. | Doc 14 §18, user brief |
| L9 | **Leave approval chain**: self applies → direct manager (R04/R03/R08/R10/R12/R14/R16) approves/rejects. Cross-outlet leave needs R02+. LWP auto-approved after balance exhaustion. Maternity/Paternity escalates to R02. | Doc 06 §15.1 |
| L10 | **Efficiency KPIs are read from existing module stores** (service JCs from service slice, sales deals from sales slice, parts GRNs from parts slice). No new data capture — staff module aggregates. | User brief, no new source |
| L11 | **Gratuity formula**: (last drawn basic + DA) × 15/26 × completed years. Payable on exit after 5 years of service (Payment of Gratuity Act 1972). Computed and shown in F&F; exported to greytHR. | Doc 06 §15, Gratuity Act |
| L12 | **Anonymization after 7 years** per Doc 06 §17 (Income Tax 7yr retention): name/PAN/Aadhaar/bank replaced with `[REDACTED]`; staff ID retained as a ghost key for FK integrity in audit logs. | Doc 06 §17, DPDP |
| L13 | **Org chart re-org** (R02 only) triggers a `REPORTS_TO_CHANGED` audit event with `{ staffId, oldManagerId, newManagerId, actor, reason }`. All changes are reversible via event replay. | Doc 14 §22, Doc 06 §17 |
| L14 | **Payslip PDF** rendered client-side via `@react-pdf/renderer`; no server PDF job needed in v1. Signed URL download logged as `DOCUMENT_ACCESS` event for DPDP. | User brief |
| L15 | **Demo data: 24 staff, 6 months attendance, leave mix** — seeded as static fixture files in `packages/mocks/src/staff/`. Auth provider imports canonical profiles; attendance/leave/salary mock files are separate MSW-served fixtures. | User brief |
| L16 | **PT slabs are placeholders pending tax-counsel sign-off (OQ-PT-1). NOT FOR PRODUCTION.** Current placeholder values used in mock/preview UI only (flagged `unverified: true` in computation): KA — ₹200/mo if monthly gross > ₹25k, else ₹0; MH — ₹200/mo (non-Feb) / ₹300 (Feb) if gross > ₹10k, else ₹0; TN — half-yearly slab, ~₹208/mo equivalent for half-year gross > ₹75k. UI shows the PT line item; computation carries `unverified: true` flag until tax counsel confirms. **P2 (salary/payslip) is gated on OQ-PT-1 resolution.** | Review B1; OQ-PT-1 |
| L17 | **Fingerprint webhook auth: HMAC-SHA256 mandatory.** `X-Fingerprint-Signature: sha256=<hex>` header computed over the raw request body with a per-device shared secret. Reject events whose `timestamp` is > 5 minutes from server time (replay window). Dedup window: ±60s on `(staffId, timestamp)` (unchanged). Per-device secrets stored in `staff-store.deviceSecrets` keyed by `deviceId`. Secret rotation via R12+ admin action with 24-hour grace period (both old and new secret accepted during grace). | Review B2; Security S1 |
| L18 | **Salary RLS enforced at slice/API serialization boundary, not just UI.** `selectStaffForViewer(state, viewerRole)` selector strips `salary`, `payslips`, `salaryHistory`, `bankDetails`, `bankAccountMasked` fields when `!hasRank(viewerRole, 'R12')`. All API endpoints returning `StaffProfile` data use this selector. Vitest test required asserting stripped payload for sub-R12 callers. | Review B3; Security S2; Doc 14 §28 |
| L19 | **EL encashment on exit formula:** `elEncashAmount = round((eligibleELDays / 30) × monthlyBasic)` where `eligibleELDays = min(currentELBalance, 300)`. The 300-day cap is per Income Tax Act §10(10AA). Applied at exit in F&F computation. | Review B4; Finance F/EL encashment |
| L20 | **Gratuity is capped at ₹20,00,000** per Payment of Gratuity (Amendment) Act 2018 §4(3). Formula: `gratuity = min(20_00_000, round((basic + da) × 15 / 26 × completedYears))`. | Review B5; PoG Amendment 2018 |
| L21 | **ESIC has both employee and employer shares.** Employee: `gross × 0.0075` if gross ≤ ₹21,000. Employer: `gross × 0.0325` if gross ≤ ₹21,000. Total: 4% of gross. Both lines appear on the payslip and greytHR CSV export (`esic_employee`, `esic_employer` columns). | Review payroll audit C |
| L22 | **DA is a first-class field on `SalaryStructure`**: `da: z.number().nonnegative().default(0)`. Not folded into `specialAllowance`. Required for correct gratuity (L20) and EL encashment (L19) computation. | Review F3 |
| L23 | **F&F pro-rated salary formula:** `proRatedSalary = round((monthlyBasic / 30) × daysWorkedInExitMonth)`. `daysWorkedInExitMonth` is computed as `lastWorkingDay.date - firstDayOfExitMonth + 1`. | Review F2/G |
| L24 | **Onboarding is a 5-step wizard.** Step 1: Basic info (name, email, phone, DOB, emergency contact). Step 2: Role & Outlet (role scoped by actor authority, outlet, department, reports-to). Step 3: Documents (Aadhaar last-4 text entry, PAN, offer letter filename, bank last-4 — filenames only; no actual upload in v1). Step 4: DPDP consent + salary scaffold gate (consent mandatory, blocks submission; salary structure configured post-onboarding in P2). Step 5: Review & fingerprint enrollment stub. | SPEC-STAFF-001 §8.3, S7 AC |
| L25 | **Profile audit trail is its own event log on StaffStore** (append-only). `StaffProfileAuditEvent` with `kind: 'role-transition' \| 'salary-change' \| 'leave-applied' \| 'profile-updated' \| 'dpdp-consent-given' \| 'exit-initiated' \| 'onboarded'`, `actorId`, `at`, `before`, `after`, `reason?`. R09+ readable via `selectProfileAuditLog`; self always readable. Anonymized at 7yr post-exit per Doc 06 §17. | Doc 06 §17, DPDP |
| L26 | **Org chart is data-driven from `StaffProfile.reportsTo` field.** Renders as CSS tree (recursive nested divs + border-l connectors — no external graph lib). Cycle detection: DFS before `updateReportsTo` mutation; broken chain (reportsTo points to nonexistent ID, or cycle detected) → treated as root. Click node → detail slide-over. R02+ can re-org via `updateReportsTo` action. | Doc 14 §22, L13 |
| L27 | **Salary tab UI ships with PT slab `unverified: true` flag + compliance banner.** Math correct for PF/ESIC/Gratuity/TDS-informational. PT slabs (KA/MH/TN) are placeholder values pending tax-counsel sign-off (OQ-PT-1). Every PT display carries `unverified: true` chip + tooltip "PT slab pending tax counsel review per OQ-PT-1". Production statutory filing via greytHR/Keka per Doc 06 §15.2. | OQ-PT-1, L1, L16; shipped 2026-04-29 |
| L28 | **Payslip generator uses browser print-to-PDF** (matches L31 in custom-builds spec). Renders via React component dialog. "Download PDF" button triggers `window.print()`. No server PDF job required in v1. `DOCUMENT_ACCESS` audit event on download (DPDP). | User brief, custom-builds L31; shipped 2026-04-29 |
| L29 | **Salary updates: R22+ gate at slice level.** `updateSalary(staffId, newStructure, actor)` requires `hasRank(actor.role, 'R22')`. Append-only `salaryHistory` on StaffProfile. Emits `salary-change` to `profileAuditLog` (L25). `selectPayslip(staffId, month, year)` is a pure selector — no store mutation. | Doc 14, L8; shipped 2026-04-29 |
| L30 | **Attendance webhook auth: HMAC-SHA256 + ±5min replay window + ±60s dedup + per-device secrets + 24h rotation grace.** Route handler at `apps/staff-web/app/api/webhooks/fingerprint/route.ts`. Mock device secrets seeded in store `deviceSecrets`. (L17 reaffirmed for production wiring.) | L17, Security S1; shipped 2026-04-29 |
| L31 | **Daily punch classification: late if first punch-in > 9:30 AM; half-day if total hours < 4.** Half-day takes priority over late (< 4h regardless of punch-in time). Both thresholds hardcoded for v1; configurable via outlet settings in v1.5. `classifyDay` in `attendance-math.ts`. | L30; shipped 2026-04-29 |
| L_S7 | **Onboarding gate: page-level R03+, with submit-time hire-tier check.** `/staff/new` is reachable by any viewer with `hasRank(viewer.role, 'R03')` (Outlet Manager and above). At submit time, the onboarding action re-validates that the SELECTED target role's hire-tier ≤ viewer rank: any viewer can onboard R05–R11; only R02+ can onboard R12+ roles (Manager-tier). The role select dropdown filters available options per viewer rank as a UX hint, but the submit-side guard is authoritative. Resolves the 2026-04-29 audit divergence where code was over-gating to R12+ at the page level. | Doc 14 §R03; S7 AC; shipped 2026-04-29 |
| L_S8_ANON | **Anonymization sweep is a manual admin action in v1, server-side cron in production.** `/staff` shows R02+ "Run anonymization sweep" button → `runAnonymizationSweepDryRun()` previews the affected count → confirmation dialog with type-to-confirm `ANONYMIZE` → `runAnonymizationSweep(actor)` mutates due records (status FNF_FINALIZED + anonymizationScheduledFor ≤ now + anonymizedAt null). PII fields replaced with `'ANONYMIZED_USER'`/`'anon@example.invalid'`/`'0000000000'`/`'0000'`. Emits `staff-anonymized` profile-audit event. v1 ships UI trigger; v1.5 wires a server cron (Doc 12 §observability). | DPDP §13, Doc 06 §retention; L23; shipped 2026-04-29 |

---

## 1. Problem statement

BN Automobiles operates 24+ staff across three outlets (BLR/MUM/CHE) with no unified HR
view. Role changes, salary adjustments, and attendance records are managed in spreadsheets
outside the DMS. This creates RBAC drift (staff-auth-provider holds 8 hard-coded profiles),
payroll inconsistency, and compliance gaps under the DPDP Act 2023 (Doc 06 §19) and Indian
labour law. The Staff Management module provides a single source of truth for every person,
role, and HR event — enabling governed onboarding, payroll preview, fingerprint-backed
attendance, leave governance, and per-role efficiency scoring.

---

## 2. Goals and non-goals

### Goals
- Replace `MOCK_STAFF_PROFILES` (8 entries) with a 24-staff canonical fixture and extensible
  `StaffProfile` type that all modules consume.
- Staff directory with filter/search across outlets, roles, departments, and status.
- Staff detail with 6 tabs: Profile · Roles & Permissions · Salary · Attendance · Leaves ·
  Efficiency.
- RBAC-governed role promotion/demotion with audit trail.
- India-compliant payroll preview: PF/ESIC/PT/TDS computed, payslip PDF generated.
- Fingerprint-webhook mock for daily punch records; manual override gated.
- Leave lifecycle: apply → approve/reject → balance → encashment.
- Efficiency KPIs per role aggregated from existing module stores.
- Org chart with visual hierarchy; R02 can re-org.
- Onboarding flow with DPDP consent + document upload; exit flow with F&F and anonymization.

### Non-goals
- Statutory PF/ESIC/PT return filing (greytHR/Keka per Doc 06 §15.2).
- Biometric hardware provisioning or vendor SDK integration (webhook contract only).
- Full recruitment ATS (Doc 06 §15.4).
- Payroll bank file disbursement (exported CSV to greytHR/Keka; actual NEFT via payroll provider).
- Performance review cycle with goal-setting (Doc 06 §15.3 v1.5).
- Shift scheduling UI (v1.5).

---

## 3. Users and roles affected

Reference Doc 14. All 24 roles are represented as staff profiles. Key actors per feature:

| Role | Capability change |
|---|---|
| Any staff (R01–R19, R22–R24) | Self-service: view own profile, apply leave, download own payslip |
| R03 Outlet Manager | View outlet staff directory; approve outlet-scope leaves |
| R04 Sales Manager | Approve team leaves; view team efficiency |
| R02 Org Admin | Manage users + roles org-wide; approve Maternity/Paternity; re-org |
| R08 Refurb Workshop Manager | Approve workshop team leaves; view bay efficiency |
| R10 Master Technician | Approve technician leaves; countersign role certifications |
| R12 Parts Manager | Approve parts team leaves |
| R14 Body Shop Manager | Approve body shop team leaves |
| R15 Finance Executive | View salary (outlet); generate payslip |
| R16 Finance Head | Edit salary structures; approve raises (org-wide) |
| R22 Auditor | Read-only salary + HR audit logs |
| R23 DPO | Consent ledger; process DSRs; approve anonymization |

---

## 4. User stories / jobs-to-be-done

**S1 — Staff directory navigation**
As an Outlet Manager (R03), I want to see all staff in my outlet filtered by role and status,
so that I can quickly locate and act on a specific person.
- Given I am logged in as R03 BLR, when I open `/staff`, then I see only BLR staff.
- Given I filter by `status=on-leave`, then only on-leave staff cards appear.
- Given I click a staff card, then I navigate to `/staff/[id]` with the Profile tab active.

**S2 — Role promotion**
As an Org Admin (R02), I want to promote a Sales Executive to Sales Manager, so that RBAC
permissions update atomically.
- Given I am on `/staff/[id]` Roles tab, when I select a new role and submit, then a
  `ROLE_CHANGED` audit event is written and the staff member's permission set updates.
- Given the target role is R12+, then the action requires `hasRank(actor, 'R02')` guard.
- Given I attempt a demotion without a reason, then the form rejects with a validation error.

**S3 — Payslip generation**
As a Finance Executive (R15), I want to generate a payslip PDF for any outlet staff member
for a given month, so that I can handle ad-hoc payroll queries without leaving the DMS.
- Given I open the Salary tab for a staff member with a salary structure defined, when I
  select month and click "Generate Payslip", then a PDF renders with all statutory components.
- Given the staff's state is Karnataka and basic > ₹20,000, then PT = ₹200 is shown.
- Given I am R05, then the Salary tab is hidden (RBAC gate, 403 state rendered).

**S4 — Attendance calendar**
As a Workshop Manager (R08), I want to see a monthly calendar of attendance per technician,
so that I can spot absenteeism patterns before the pay cycle.
- Given fingerprint punches exist for the month, when I open the Attendance tab, then each
  day shows status (Present / Absent / Half-day / Late / OT).
- Given a day has no punch records and is a working day, it shows as Absent (red).
- Given I have R12+ authority, when I click a day and choose "Manual Override", then a reason
  dialog appears and the change is audit-logged.

**S5 — Leave application**
As any staff member, I want to apply for Casual Leave for a date range, so that my manager
is automatically notified for approval.
- Given I apply for 2 days CL with a reason, when submitted, then my CL balance decrements
  by 2 (pending), and my direct manager receives an in-app notification.
- Given my CL balance is 0, then the form shows an error and defaults to LWP.
- Given my manager approves, then balance is confirmed deducted and I receive a notification.

**S6 — Efficiency scorecard**
As a General Manager (R19/mapped to R02 Org Admin scope), I want to view a 12-month KPI
trend for a Sales Manager, so that I can make objective performance decisions.
- Given I open the Efficiency tab for R04 Arjun Mehta, then I see deals closed, conversion%,
  avg deal size, and lead-to-close days — last 12 months as a trend chart.
- Given the staff has no linked deals, then each KPI shows "No data" with a helper text.

**S7 — Onboarding new staff**
As an Outlet Manager (R03), I want to onboard a new Sales Executive, so that they can
access the DMS within the same day.
- Given I complete the onboarding form at `/staff/new` with basic info, role, outlet, salary
  structure, and DPDP consent, when I submit, then a `StaffProfile` is created, added to the
  canonical fixture, and the new staff can sign in.
- Given I skip the DPDP consent checkbox, then submission is blocked.
- Given I try to onboard a role R12+, then `hasRank(actor, 'R02')` is required.

**S8 — Exit and F&F**
As an Org Admin (R02), I want to initiate an exit workflow for a departing employee, so that
F&F is computed, assets are returned, and their PII is scheduled for anonymization.
- Given I initiate exit with a last working day, then notice period days remaining are
  computed and displayed.
- Given the employee has 6+ years tenure, then gratuity is computed and shown on the F&F
  sheet per L11.
- Given F&F is approved and exit documents are generated, then a 7-year anonymization timer
  is scheduled per L12.

**S9 — Org chart re-org**
As R02, I want to drag a node in the org chart and drop it under a new manager, so that
the `reportsTo` field updates and RBAC delegation chains reflect the change.
- Given I am R02, when I change `reportsTo` for a staff node, then a `REPORTS_TO_CHANGED`
  event is emitted (L13).
- Given I am R05, then the re-org drag handle is hidden.

**S10 — Self-service payslip**
As any staff member, I want to download my own payslip for any past month, so that I can
file personal income tax without depending on HR.
- Given I open my own Salary tab, then I can see all past payslips.
- Given I click download, then a PDF is generated and a `DOCUMENT_ACCESS` event is logged
  with `purpose=SELF_TAX`.

---

## 5. Domain model changes

New entities in `packages/types/src/domain/staff.ts`.

### 5.1 `StaffProfile` (extends existing `StaffUser`)

```ts
export const StaffProfileSchema = z.object({
  // Identity (extends StaffUser from staff-auth-provider)
  id: z.string(),               // staff-<role>-<seq>, e.g. staff-r05-003
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(), // masked at render unless R02+
  avatar: z.string(),           // 2-letter initials
  role: RoleIdEnum,             // R01–R24
  roleName: z.string(),
  department: DepartmentEnum,
  outlet: OutletIdEnum,         // 'bangalore'|'mumbai'|'chennai'|'all'
  status: StaffStatusEnum,      // ACTIVE | ON_LEAVE | EXITED | ONBOARDING
  reportsTo: z.string().nullable(), // staffId of direct manager
  startDate: z.string().date(),
  exitDate: z.string().date().optional(),
  permissions: z.array(z.string()),
  // HR
  aadhaarLast4: z.string().length(4).optional(), // DPDP: last-4 only
  panMasked: z.string().optional(),              // e.g. ABCPX1234X → ABCPX***4X
  bankAccountMasked: z.string().optional(),      // last-4 only
  stateOfPosting: z.enum(['KA','MH','TN']),
  // Onboarding
  dpdpConsentGiven: z.boolean().default(false),
  dpdpConsentAt: z.string().datetime().optional(),
  fingerprintEnrolled: z.boolean().default(false),
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type StaffProfile = z.infer<typeof StaffProfileSchema>;

export const StaffStatusEnum = z.enum(['ACTIVE','ON_LEAVE','EXITED','ONBOARDING']);
export const DepartmentEnum = z.enum([
  'SALES','SERVICE','PARTS','FINANCE','MARKETING','HR','OPERATIONS','MANAGEMENT',
]);
```

### 5.2 `SalaryStructure`

```ts
export const SalaryStructureSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().optional(),
  // Earnings (INR/month)
  basic: z.number().nonnegative(),
  da: z.number().nonnegative().default(0),     // Dearness Allowance — required for gratuity (L20) + EL encashment (L19); see L22
  hra: z.number().nonnegative(),
  specialAllowance: z.number().nonnegative().default(0),
  conveyance: z.number().nonnegative().default(0),
  medicalAllowance: z.number().nonnegative().default(0),
  performanceBonus: z.number().nonnegative().default(0),
  // Computed deductions (read-only, derived at payslip render)
  // pf: min(basic * 0.12, 1800)
  // esic_employee: gross <= 21000 ? gross * 0.0075 : 0  (L21)
  // esic_employer: gross <= 21000 ? gross * 0.0325 : 0  (L21)
  // pt: per stateOfPosting slab — NOT FOR PRODUCTION (L5, L16, OQ-PT-1)
  // tds: per IT Act slab (estimated monthly; informational only per L1/OQ2)
  approvedBy: z.string().optional(), // staffId of R16+
  createdBy: z.string(),
  schemaVersion: z.literal('v1').default('v1'),
});
```

### 5.3 `AttendanceRecord`

```ts
export const AttendanceRecordSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  date: z.string().date(),                 // YYYY-MM-DD
  punchIn: z.string().datetime().optional(),
  punchOut: z.string().datetime().optional(),
  totalHours: z.number().nonnegative().optional(),
  status: AttendanceDayStatusEnum,
  source: z.enum(['FINGERPRINT','MANUAL','SYSTEM']),
  overrideBy: z.string().optional(),       // staffId if MANUAL
  overrideReason: z.string().optional(),
  deviceId: z.string().optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
export const AttendanceDayStatusEnum = z.enum([
  'PRESENT','ABSENT','HALF_DAY','LATE','OVERTIME','HOLIDAY','LEAVE','WEEK_OFF',
]);
```

### 5.4 `LeaveRequest`

```ts
export const LeaveTypeEnum = z.enum([
  'CL','SL','EL','COMP_OFF','MATERNITY','PATERNITY','LWP',
]);
export const LeaveStatusEnum = z.enum([
  'PENDING','APPROVED','REJECTED','CANCELLED','WITHDRAWN',
]);
export const LeaveRequestSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  type: LeaveTypeEnum,
  fromDate: z.string().date(),
  toDate: z.string().date(),
  days: z.number().positive(),
  reason: z.string().min(5),
  status: LeaveStatusEnum,
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
  encashed: z.boolean().default(false),  // EL encashment on exit
  createdAt: z.string().datetime(),
  schemaVersion: z.literal('v1').default('v1'),
});
```

### 5.5 `LeaveBalance`

```ts
export const LeaveBalanceSchema = z.object({
  staffId: z.string(),
  year: z.number().int(),
  CL: z.object({ allocated: z.literal(12), used: z.number(), pending: z.number() }),
  SL: z.object({ allocated: z.literal(12), used: z.number(), pending: z.number() }),
  EL: z.object({ allocated: z.literal(21), used: z.number(), pending: z.number(), accrued: z.number() }),
  COMP_OFF: z.object({ accrued: z.number(), used: z.number() }),
  LWP: z.object({ used: z.number() }),
});
```

### 5.6 `RoleAuditEvent`

```ts
export const RoleAuditEventSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  at: z.string().datetime(),
  kind: z.enum(['ROLE_CHANGED','PERMISSION_ADDED','PERMISSION_REMOVED','REPORTS_TO_CHANGED']),
  actorId: z.string(),
  actorRole: RoleIdEnum,
  payload: z.record(z.unknown()),
  reason: z.string().min(5),
  schemaVersion: z.literal('v1').default('v1'),
});
```

### 5.7 `ExitRecord`

```ts
export const ExitRecordSchema = z.object({
  staffId: z.string(),
  initiatedBy: z.string(),
  initiatedAt: z.string().datetime(),
  lastWorkingDay: z.string().date(),
  noticePeriodDays: z.number().int().nonnegative(),
  noticePeriodServed: z.number().int().nonnegative(),
  assetsReturned: z.boolean().default(false),
  assetChecklist: z.array(z.object({ item: z.string(), returned: z.boolean() })),
  ffSummary: z.object({
    // proRatedSalary = round((monthlyBasic / 30) × daysWorkedInExitMonth)  — L23
    lastSalaryProrated: z.number(),
    // elEncashAmount = round((min(currentELBalance, 300) / 30) × monthlyBasic)  — L19
    elEncashment: z.number(),
    // gratuity = min(20_00_000, round((basic + da) × 15 / 26 × completedYears))  — L20
    gratuity: z.number(),
    gratuityCapped: z.boolean(),  // true when formula > ₹20L cap was applied
    // deductions bag: enumerated below
    deductions: z.object({
      advanceRecovery: z.number().nonnegative().default(0),
      noticePeriodShortfall: z.number().nonnegative().default(0), // days short × daily salary
      assetLossRecovery: z.number().nonnegative().default(0),
      otherDeductions: z.number().nonnegative().default(0),
      total: z.number().nonnegative(),  // sum of above
    }),
    netPayable: z.number(),
  }).optional(),
  separationDocUrl: z.string().optional(),
  anonymizationScheduledAt: z.string().datetime().optional(),
  schemaVersion: z.literal('v1').default('v1'),
});
```

---

## 6. State machine changes

### 6.1 `StaffStatus` machine

| State | Transitions | Guard | Actor | Side Effect |
|---|---|---|---|---|
| `ONBOARDING` | → `ACTIVE` | DPDP consent given; fingerprint enrolled | R03+ | `STAFF_ACTIVATED` event |
| `ACTIVE` | → `ON_LEAVE` | Approved leave request covering today | System | `STATUS_CHANGED` event |
| `ON_LEAVE` | → `ACTIVE` | Leave return date reached or early return approved | System/Manager | `STATUS_CHANGED` event |
| `ACTIVE` | → `EXITED` | Exit workflow completed, LWD reached | R02 | `STAFF_EXITED` event; 7yr timer scheduled |
| `ON_LEAVE` | → `EXITED` | Same as above | R02 | Same |

### 6.2 Role transition approval rules

Transitions use `hasRank(actor.role, minRole)` (L4).

> **NOTE (OQ-ROLE-1):** The approver chain below is best-guess pending Doc 14 verification.
> See OQ-ROLE-1 in §18. Do not implement until Doc 14 §X.Y is confirmed.

| From role tier | To role tier | Required approver |
|---|---|---|
| Any individual contributor (R05–R13, R15, R17–R19) | Same tier / lateral | R03 (Outlet Manager) |
| Any contributor → Manager tier (R03/R04/R08/R10/R12/R14/R16) | + | R02 (Org Admin) |
| Any → R02/R01 | Super admin tier | R01 (Super Admin) |
| Any → R23 (DPO) | Compliance role | R01 + Legal sign-off |

Every role change emits a `ROLE_CHANGED` `RoleAuditEvent` with `reason` (mandatory).

### 6.3 `LeaveRequest` state machine

```
PENDING → APPROVED  (manager hasRank >= direct-manager-role)
PENDING → REJECTED  (manager + rejectionReason required)
PENDING → WITHDRAWN (applicant self, before approval)
APPROVED → CANCELLED (R02+ only, reason required)
```

---

## 7. API contracts (MSW mock handlers)

All endpoints under `GET|POST /api/staff/...` served by MSW handlers in
`packages/mocks/src/handlers/staff.ts`.

### 7.1 Staff list
```
GET /api/staff
Query: outlet?, role?, department?, status?, search?, page, pageSize
Auth: R03+ (outlet-scoped); R02+ (cross-outlet)
Response: { data: StaffProfile[], total, page, pageSize }
```

### 7.2 Staff detail
```
GET /api/staff/:id
Auth: self | R03+ outlet-scoped | R02+
Response: StaffProfile (phone/PAN masked unless R02+/R23)
```

### 7.3 Salary structure
```
GET  /api/staff/:id/salary          Auth: self | R12+ outlet | R16+
POST /api/staff/:id/salary          Auth: R16+ (create/update); R02+ approval
Body: SalaryStructure (omit computed fields)
```

### 7.4 Payslip
```
GET /api/staff/:id/payslip?month=YYYY-MM
Auth: self | R15+ outlet | R16+
Response: { payslip: ComputedPayslip, pdf?: base64 }
```

### 7.5 Attendance
```
GET  /api/staff/:id/attendance?month=YYYY-MM
Auth: self | R03+ outlet | R02+
POST /api/staff/:id/attendance/override
Auth: R12+ (outlet-scoped manual override)
Body: { date, status, reason }
```

### 7.6 Fingerprint webhook (mock)
```
POST /api/webhooks/fingerprint
Auth: HMAC-SHA256 signature (L17)
  Header: X-Fingerprint-Signature: sha256=<hex>
  Signature computed over raw request body using per-device shared secret.
  Per-device secrets stored in staff-store.deviceSecrets keyed by deviceId.
  Rotation: R12+ admin action; 24-hour grace period (old + new both accepted).
Body: {
  deviceId: string,         // identifies the physical device + its secret
  staffId: string,
  eventType: 'PUNCH_IN' | 'PUNCH_OUT',
  timestamp: string,        // ISO 8601; server rejects if |now - timestamp| > 300s
  eventId: string,          // UUID per device per event; used for idempotency
}
Reject conditions (all return 401):
  - Missing or invalid X-Fingerprint-Signature header
  - |server_time - timestamp| > 300 seconds (replay window)
  - Unknown deviceId (no secret found)
Dedup: (staffId, timestamp) within ±60s → silently discard (200, recorded: false)
Idempotency: eventId already seen in last 24h → 200, recorded: false (not 4xx)
Response: { recorded: boolean }
```

### 7.7 Leave
```
GET  /api/staff/:id/leaves?year=YYYY          Auth: self | manager | R03+
POST /api/staff/:id/leaves                    Auth: self
Body: LeaveRequest (omit status/approver fields)
PATCH /api/staff/leaves/:leaveId/decision    Auth: direct manager | R02+
Body: { decision: 'APPROVED'|'REJECTED', reason? }
GET  /api/staff/:id/leave-balance?year=YYYY   Auth: self | manager | R03+
```

### 7.8 Onboarding
```
POST /api/staff                    Auth: R03+ (up to R03-tier roles); R02+ (R12+)
Body: OnboardingPayload (StaffProfile fields + salary + dpdpConsent)
```

### 7.9 Exit
```
POST   /api/staff/:id/exit          Auth: R02+
PATCH  /api/staff/:id/exit          Auth: R02+ (update checklist / approve F&F)
GET    /api/staff/:id/exit          Auth: R02+ | self
```

### 7.10 Role change
```
POST /api/staff/:id/role-change
Auth: R03+ (lateral) | R02+ (to manager tier) | R01 (to admin tier)
Body: { newRole: RoleIdEnum, reason: string }
Response: { updated: StaffProfile, event: RoleAuditEvent }
```

### 7.11 Org chart
```
GET  /api/staff/org-chart           Auth: R03+ (outlet) | R02+ (cross-outlet)
PATCH /api/staff/:id/reports-to    Auth: R02+
Body: { newManagerId: string, reason: string }
```

---

## 8. UI / UX outline

**Design direction**: Staff surface — 03 Modern Product Interface (dark + blue accent, Inter).
Tokens: `@dms/tokens` staff semantic tokens (`data-surface="staff"`).

### 8.0 Route surface

| Route | Purpose | Gate |
|---|---|---|
| `/staff` | Directory (cards + table toggle) | R09+ (R03+ to onboard) |
| `/staff/new` | Onboarding wizard | R12+ (shipped gate; spec S7 says R03+ — divergence flagged 2026-04-29) |
| `/staff/[id]` | 6-tab staff detail (Profile / Roles / Salary / Attendance / Leaves / Efficiency) | R09+ for self/team; PII gates per §6 |
| `/staff/leaves` | Global leaves admin — scope toggle (mine / outlet / all-outlets), inline approve / reject, filter by type + status, search. Per-employee leaves are surfaced under `/staff/[id]?tab=leaves`. | R09+ to view; R10+ for outlet scope; R02+ for all-outlets |
| `/staff/org-chart` | Reporting hierarchy graph (S9, L26) | R09+ |

### 8.1 `/staff` — Directory

- **Header**: "Staff" title, count badge, "Onboard Staff" CTA (R03+, hidden for R05–).
- **Filters** (inline bar): Outlet selector (multi), Role multi-select (R01–R24 labels),
  Department, Status (Active / On Leave / Exited / Onboarding), free-text search.
- **View toggle**: Card grid (default) ↔ Table (dense).
- **Card**: Avatar initials, name, role badge, outlet chip, status dot, department tag,
  click → detail. On-leave cards show leave-type label.
- **Empty state**: "No staff match your filters" with clear-filters link.
- **Loading**: 8 skeleton cards.
- **Cross-outlet note**: R03 sees own outlet only; R02+ sees "All outlets" tab.

### 8.2 `/staff/[id]` — Detail

6-tab layout (sticky tab bar). Breadcrumb: Staff → [name].

**Profile tab**
- Avatar (large), name, role badge, outlet, department, status, start date, reports-to link.
- Contact section: email visible to R03+; phone visible to R02+/self; Aadhaar last-4 visible
  to R02+/R23; PAN masked visible to R02+/R22/R23.
- DPDP consent status chip.
- Fingerprint enrollment status.

**Roles & Permissions tab**
- Current role card with role code (R01–R24), role name, scope.
- Permissions matrix: grouped by domain (inventory, sales, service, parts, finance, staff,
  reports). Checkmarks show granted permissions. Grayed = not granted.
- Role history timeline: `RoleAuditEvent` list — date, from→to, actor, reason.
- "Change Role" CTA: R03+ for lateral, R02+ for manager tier. Opens dialog with new role
  selector, reason textarea (min 10 chars), confirm.

**Salary tab** (hidden for roles < R12 viewing others; self always sees own)
- Salary structure card: effective date, components table (basic, HRA, special allowance,
  conveyance, medical, bonus).
- Deductions card: PF (computed), ESIC (computed), PT (computed from state + slab), TDS
  (estimated). Net pay = Gross − total deductions.
- "Edit Structure" CTA: R16+ only.
- Salary history accordion: past structures with effective-date ranges.
- Payslip section: month picker, "Generate Payslip" button → PDF preview + download.
  Self can access own payslips; R15+ can access outlet staff payslips.

**Attendance tab**
- Monthly calendar view: each day cell shows status chip (color-coded per
  `AttendanceDayStatusEnum`). Month navigator (prev/next).
- Summary row: Working Days / Present / Absent / Half-day / Late / OT / Leaves.
- Punch record panel: click a day → punch-in / punch-out times, device ID, source badge
  (FINGERPRINT / MANUAL / SYSTEM).
- "Manual Override" button on day cell: R12+ only. Reason dialog + audit logged.
- Sync status badge: last fingerprint device sync timestamp.

**Leaves tab**
- Leave balance cards (row): CL / SL / EL / CompOff — allocated, used, pending, available.
- "Apply Leave" CTA: any staff for own record.
- Leave request form (slide-over): type, date range (date-picker), days auto-computed,
  reason textarea. CL/SL immediate; EL requires 7-day notice (warn, not block in v1).
- Requests list: status-filtered table — date range, type, days, status chip, approver.
- Team calendar (R03+ view): overlay all team leave on a monthly grid.
- Leave history: past approved/rejected leaves with reasons.

**Efficiency tab**
- Role-specific KPI scorecard (see §11 for KPI definitions).
- Trend chart: 12-month sparklines per KPI (Recharts/Framer Motion).
- Universal KPIs section: attendance %, leave usage %, training credits.
- "No data" empty state if module data unavailable.

### 8.3 `/staff/new` — Onboarding flow

Stepper (5 steps):
1. **Basic info** — name, email, phone, DOB, emergency contact.
2. **Role & Outlet** — role selector (scoped per actor's authority), outlet, department,
   reports-to (staff search).
3. **Salary structure** — components entry; deductions auto-preview.
4. **Documents** — upload: Aadhaar last-4 entry (text, not doc), PAN, offer letter, bank
   account details. DPDP consent checkbox (mandatory, blocks step 5).
5. **Fingerprint enrollment** — trigger webhook stub; shows enrollment status.

Submit creates `StaffProfile`, adds to canonical fixture, emits `STAFF_ONBOARDED` event.

### 8.4 Org chart — `/staff/org-chart`

- Tree layout (react-d3-tree or similar). Root = R01/R02.
- Nodes: avatar chip, name, role badge.
- Click node → detail panel slide-over.
- R02+: drag-and-drop to re-org; confirmation dialog + reason; emits `REPORTS_TO_CHANGED`.
- Collapsed subtrees for outlets; expand on click.
- Export PNG (R02+).

### 8.5 Accessibility
- WCAG 2.1 AA minimum (AAA for body copy).
- Calendar cells keyboard-navigable (arrow keys).
- Status chips have aria-labels; color is never the sole differentiator.
- Reduced-motion: chart animations suppressed via `prefers-reduced-motion`.
- Focus rings per `@dms/tokens` focus token.

### 8.6 `/staff/leaves` — Global leaves admin (shipped 2026-04-29)

**Audience:** R09+ (own team), R10+ (outlet), R02+ (cross-outlet).

**Purpose:** Single admin surface for approving / rejecting / filtering leave applications across the org. Per-employee leaves remain on `/staff/[id]?tab=leaves`; this is the cross-employee aggregation view.

**Header bar**
- Title "Leaves admin" + total-pending badge
- Scope toggle (segmented control): **Mine** (default for R09 viewing own team) · **Outlet** (R10+) · **All outlets** (R02+). Disabled options are hidden — never rendered greyed.
- Search input (debounced 200ms): name / leave-id

**Stats strip** (4 tiles, filterable when clicked)
1. **Pending** — count of `status === 'pending'` in current scope
2. **Approved this month** — `status === 'approved' AND approvedAt within current calendar month`
3. **Rejected this month** — same window, status rejected
4. **Overdue** — `status === 'pending' AND age > 3 days`. Tile color shifts to amber when count > 0; click filters to overdue-only.

**Filter chips row**
- Type: `CL` / `SL` / `EL` / `CompOff` (multi-select)
- Status: `pending` / `approved` / `rejected` / `cancelled` (multi-select)
- Date range: from / to (applies to `appliedAt`)
- Outlet (R02+ only): BLR / MUM / CHE / All

**Table columns** (sortable per column)
| Col | Sort key | Notes |
|---|---|---|
| Staff | name | Avatar + name + role badge; link to `/staff/[id]?tab=leaves` |
| Outlet | outletId | Hidden when scope === 'mine' or scope === 'outlet' |
| Type | type | CL / SL / EL / CompOff chip |
| Dates | fromDate | "12 May" or "12–14 May" range; days count next to it |
| Reason | — | Truncated to 60 chars; full text on hover via title attr |
| Applied | appliedAt | Relative time ("2d ago"); raw ISO on hover |
| Status | status | Chip — pending = amber pulse, approved = green, rejected = red, cancelled = grey |
| Actions | — | Approve + Reject buttons inline (R-rank + scope gated); Cancel button for own pending only |

**Actions**
- **Approve** (`R09+` for own team / `R10+` for outlet / `R02+` cross-outlet): one-click; toast on success. For Comp-Off type, the action also debits the staff's `compOffBalance`.
- **Reject**: opens `RejectLeaveDialog` with reason textarea (min **10 chars** validated client + store). Toast on success.
- **Cancel** (own pending only): one-click; AlertDialog confirmation; reverts `compOffBalance` if Comp-Off.

**Empty states**
- No pending in scope: "All caught up — no pending leave applications."
- Filter returns no rows: "No leaves match these filters." + "Clear filters" link.
- Loading: 6 skeleton rows.

**RBAC summary**
- View own team: R09+ (scope=mine, automatic)
- View outlet: R10+ (scope=outlet)
- View all-outlets: R02+ (scope=all)
- Approve/reject across team boundary: requires the matching scope
- Reject reason: enforced min 10 chars at both UI form and `rejectLeave` store guard (defence in depth)
- Comp-Off balance cascade: deducted on approve, restored on cancel — never on reject (rejected leaves never debit balance)

**Cross-references:** §4 S5 (leave application story), §6.3 (LeaveRequest state machine), §11 audit-trail kinds (`leave-applied` / `leave-approved` / `leave-rejected` / `leave-cancelled`).

---

## 9. Notifications

| Event | Channel | Recipient | Template | Consent |
|---|---|---|---|---|
| Leave request submitted | In-app | Direct manager | `staff.leave.requested` | Staff HR Processing consent |
| Leave approved | In-app + email | Applicant | `staff.leave.approved` | Same |
| Leave rejected | In-app + email | Applicant | `staff.leave.rejected` | Same |
| Role changed | In-app | Affected staff | `staff.role.changed` | Same |
| Payslip ready | In-app | Staff member | `staff.payslip.ready` | Same |
| Onboarding complete | In-app + email | Staff + R02 | `staff.onboarded` | Captured at step 4 |
| Exit initiated | In-app | Staff + R02 | `staff.exit.initiated` | Same |

SMS/WhatsApp not required for staff notifications in v1 (internal channel sufficient).
All in-app notification strings are i18n-keyed under `messages/en-IN/staff.json`.

---

## 10. Integrations

| Integration | Purpose | Handler |
|---|---|---|
| Fingerprint device webhook (mock) | Daily punch-in/out via `POST /api/webhooks/fingerprint` | MSW mock; real Suprema/Mantra in prod |
| greytHR/Keka export | Monthly CSV: staffId, name, grossPay, basic, hra, da, pf, esic_employee, esic_employer, pt, tds, netPay, commission (L21 — esic split into two columns) | Manual download in v1; API push in v1.5 |
| DMS cost ledger | `addedBy: staff-<id>` FK — resolved from canonical `MOCK_STAFF_PROFILES` | Read-only consumer; no write-back |
| Service module (JC store) | Efficiency KPIs for R09/R10/R11 | Read-only aggregation |
| Sales module (deal store) | Efficiency KPIs for R04/R05 | Read-only aggregation |
| Parts module (GRN/stock store) | Efficiency KPIs for R12/R13 | Read-only aggregation |

---

## 11. Data & analytics

### KPIs per role

| Role | KPI | Source |
|---|---|---|
| R09 Service Advisor | JCs closed/month, avg turnaround hrs, CSAT score, repeat-customer % | Service slice |
| R04 Sales Manager / R05 Sales Exec | Deals closed/month, conversion %, avg deal size ₹, lead-to-close days | Sales slice |
| R10/R11 Technician | JCs assigned, on-time completion %, rework rate % | Service slice |
| R08 Refurb Workshop Mgr | Bay utilization %, parts wastage %, JC backlog count | Service + Parts slices |
| R12 Parts Manager | GRN avg turnaround hrs, stockout incidents/month, supplier rating | Parts slice |
| All roles | Attendance % (present days / working days), leave usage %, training credits | Attendance + Leave slices |

Analytics events to emit:
- `staff.directory.viewed` — `{ actorRole, outletFilter, roleFilter }`
- `staff.profile.viewed` — `{ targetStaffId, tab, actorRole }`
- `staff.payslip.downloaded` — `{ staffId, month, actorRole }` (also DPDP access event)
- `staff.leave.applied` — `{ staffId, type, days }`
- `staff.role.changed` — `{ staffId, fromRole, toRole, actorRole }`

---

## 12. Permissions & RBAC

Reference Doc 14.

| Permission ID | Description | Allowed roles |
|---|---|---|
| `staff.directory.read` | View staff list (outlet-scoped by default) | R03+ |
| `staff.directory.read.cross-outlet` | View all outlets | R02+ |
| `staff.profile.read.self` | View own profile | All staff |
| `staff.profile.read.outlet` | View any profile in own outlet | R03+ |
| `staff.profile.pii.unmask` | See phone, PAN, bank account unmasked | R02+, R22, R23 |
| `staff.salary.read.self` | View own salary + payslips | All staff |
| `staff.salary.read.outlet` | View outlet staff salaries | R12+ (outlet-scoped) |
| `staff.salary.read.org` | View org-wide salaries | R16+, R22, R23 |
| `staff.salary.write` | Create/edit salary structure | R16+ |
| `staff.salary.approve` | Approve salary raises | R02+ |
| `staff.attendance.read.self` | View own attendance | All staff |
| `staff.attendance.read.outlet` | View outlet attendance | R03+ |
| `staff.attendance.override` | Manual attendance override | R12+ (outlet) |
| `staff.leave.apply` | Apply leave for self | All staff |
| `staff.leave.approve.team` | Approve team leaves | Direct manager role (R03/R04/R08/R10/R12/R14/R16) |
| `staff.leave.approve.org` | Approve cross-outlet / Maternity / Paternity | R02+ |
| `staff.role.change.lateral` | Lateral role changes | R03+ |
| `staff.role.change.manager` | Promote to manager tier | R02+ |
| `staff.onboard` | Onboard staff up to same tier | R03+ |
| `staff.onboard.manager` | Onboard R12+ roles | R02+ |
| `staff.exit.initiate` | Initiate exit workflow | R02+ |
| `staff.orgchart.reorg` | Re-org reports-to | R02+ |
| `staff.orgchart.read` | View org chart | R03+ |

**RLS predicates**: Default outlet-scoped. R02+ bypasses outlet filter. R22/R23 read-only
org-wide. `staff.profile.pii.unmask` actions logged with actor + purpose in audit trail
(per Doc 14 §28 sensitive-action inventory).

---

## 13. Privacy & compliance

### PII fields introduced

| Field | Entity | Sensitivity | Render default |
|---|---|---|---|
| `phone` | StaffProfile | Medium | Masked `+91 ####-###XXX` for R03+; full for R02+ |
| `aadhaarLast4` | StaffProfile | High | Shown as `XXXX-XXXX-1234` for R02+/R23 only |
| `panMasked` | StaffProfile | High | `ABCPX***4X` for R02+/R22/R23 |
| `bankAccountMasked` | StaffProfile | High | Last-4 for R16+ only |
| `salaryComponents` | SalaryStructure | High | Self + R12+ outlet + R16+ |
| `payslipPDF` | Generated artifact | High | Self + R15+ outlet + R16+ |

**Purpose binding** (Doc 06 §19, Doc 03 §10):
- `STAFF_HR_PROCESSING` — all HR operations (salary, leave, attendance).
- `STAFF_DOCUMENT_ACCESS` — any non-routine access to staff PII by roles outside R02/R16/R23.
- `STAFF_PAYROLL_EXPORT` — greytHR/Keka CSV export.

**Consent**: Captured at onboarding step 4. `ConsentEvent` with purpose = `STAFF_HR_PROCESSING`,
scope = `self`, duration = `employment + 7yr`. DPDP consent checkbox mandatory; blocks form
submission if unchecked (S7 AC).

**Retention**: 7 years from exit date per Doc 06 §17 and Income Tax Act §44AA.
After 7 years: name, PAN, Aadhaar, bank details anonymized (L12). Staff ID retained as ghost
key. Anonymization scheduled automatically on exit completion.

**DSR impact**: Staff subject to DPDP Act as data principals. DSR (access / correction /
deletion) routed to R23 DPO. Deletion replaced by anonymization after retention period to
preserve financial audit trail.

**GST/Tax impact**: None directly; payslip statutory deductions are preview-only (greytHR
does statutory filing per Doc 06 §15.2). TDS estimation on salary is informational only.

**DLT impact**: None (no external SMS for staff notifications in v1).

**Legal/DPO review required**: Yes — `pii_sensitivity: high`, staff PII + DPDP consent flow.
DPO sign-off required before `status = approved`.

---

## 14. Non-functional requirements

Reference Doc 12.

- **NFR-P-04** (list response < 500ms at p95): Staff directory with 24 profiles must load
  within 300ms from MSW; target < 500ms with real API.
- **NFR-S-10** (hash-chain audit log): All `RoleAuditEvent`, `STAFF_EXITED`, `REPORTS_TO_CHANGED`,
  and payslip download events appended to the tamper-evident audit log.
- **NFR-A-01** (99.5% availability): Staff directory is read-heavy; acceptable to serve
  from cached fixture on fingerprint-webhook unavailability.
- **Feature-specific**:
  - Payslip PDF render < 3s on a 2-core device (Lighthouse budget).
  - Attendance calendar renders 31 days in a single paint; no per-day API calls.
  - Org chart with 24 nodes renders within 2s on desktop.

---

## 15. Failure modes & edge cases

| Scenario | Detection | Recovery | User-facing message |
|---|---|---|---|
| Fingerprint webhook delivers duplicate punch (same staffId + timestamp ± 60s) | Dedup check on `(staffId, timestamp)` in attendance slice | Silently discard duplicate; log warning | None (silent) |
| Fingerprint device offline for >24h | Sync-status badge turns red; last-sync timestamp stale | Manual override available (R12+); daily catch-up batch when device reconnects | "Device offline — last sync [timestamp]. Manual override available." |
| Leave application exceeds balance | Client-side balance check before submit | Form shows error; suggests LWP as fallback | "Insufficient CL balance (0 days). Apply as LWP?" |
| PF cap edge: basic exactly ₹15,000 | Unit test at boundary | `min(15000 × 0.12, 1800)` = ₹1800 — correct | N/A |
| ESIC boundary: gross exactly ₹21,000 | Unit test at boundary | ₹21,000 × 0.0075 = ₹157.50 — correct; above threshold → ₹0 | N/A |
| Role change race: two admins simultaneously promote same staff | Optimistic lock on `StaffProfile.updatedAt`; second write rejects with 409 | R02 who arrives second sees conflict toast | "Role was updated by [actor] moments ago. Refresh and retry." |
| Exit initiated while staff has approved leave in future | Warn on exit initiation; leave not auto-cancelled | R02 shown warning; manual decision to cancel leave or adjust LWD | "Staff has approved leave [date range]. Cancel leave or adjust Last Working Day." |
| Payslip PDF fails to render (missing salary structure) | Catch in PDF renderer; log error | Show "Salary structure not defined for this month" empty state | "No salary structure found for [month]. Set up salary structure first." |
| Gratuity computation: tenure exactly 4 years 364 days | Unit test; < 5 years → ₹0 gratuity | Correct — Payment of Gratuity Act requires ≥ 5 completed years | F&F sheet shows ₹0 gratuity with note "< 5 years tenure" |
| Gratuity computation: high-tenure CXO (e.g., 30 yrs, basic+DA = ₹3L/mo) | Unit test; formula yields > ₹20L | `min(20_00_000, formula)` applied; `gratuityCapped: true` set on ffSummary | F&F sheet shows ₹20,00,000 with note "Statutory cap applied (PoG Amendment 2018)" |
| EL encashment: EL balance > 300 days | Unit test; cap at 300 days | `eligibleELDays = min(balance, 300)` — L19 | F&F sheet shows encashment on 300 days with note "Balance capped at 300 days (IT Act §10(10AA))" |
| Org chart cycle (A reports to B, B to A) | Cycle detection (DFS) before PATCH /reports-to | Server rejects with 422; toast shown | "Cannot set this manager — would create a reporting cycle." |

---

## 16. Migration & rollout

### 16.1 Fixture migration

`MOCK_STAFF_PROFILES` in `staff-auth-provider.tsx` expanded from 8 → 24 profiles (8 per
outlet). Shape migrated from `StaffUser` → `StaffProfile` (superset; `StaffUser` becomes
a `Pick<StaffProfile, ...>` view). All imports of `StaffUser` from `staff-auth-provider`
updated to import `StaffProfile` from `@dms/types`; provider re-exports both.

### 16.2 Feature flag

Flag: `feat_spec_staff_001_management`
- Stage 1: internal dev / preview.
- Stage 2: BLR outlet (8 profiles, 2 months attendance).
- Stage 3: all outlets.

### 16.3 Phase plan

| Phase | Scope | Key deliverables |
|---|---|---|
| P1 | Directory + Profile + Roles & Permissions tab | `/staff` list, `/staff/[id]` Profile + Roles tabs, role-change flow, 24-staff fixture, `RoleAuditEvent`, org chart read-only |
| P2 | Salary + Payslip | Salary tab, payslip PDF (`@react-pdf/renderer`), greytHR CSV export, statutory deduction helpers (PF/ESIC/PT/TDS) |
| P3 | Attendance + Fingerprint webhook | Attendance tab, calendar view, MSW fingerprint handler, manual override, 6-month mock attendance fixture |
| P4 | Leaves | Leaves tab, leave balance, apply/approve/reject flow, team calendar, EL encashment on exit |
| P5 | Efficiency KPIs | Efficiency tab, role-specific KPI aggregations from service/sales/parts stores, 12-month trend chart |
| P6 | Org chart (interactive) + Onboarding/Exit flows | Drag-and-drop re-org, `/staff/new` stepper, exit workflow, F&F calculation, anonymization scheduler |

---

## 17. Test plan

### Unit tests (Vitest)
- `staffPayroll.test.ts` — PF/ESIC/PT/TDS computation at boundary values (L5, L16, L21):
  - PF: basic = ₹15,000 → PF = ₹1,800; basic = ₹20,000 → PF = ₹1,800 (capped).
  - ESIC employee: gross = ₹21,000 → ₹157.50; gross = ₹21,001 → ₹0 (L21).
  - ESIC employer: gross = ₹21,000 → ₹682.50 (3.25%); gross = ₹21,001 → ₹0 (L21).
  - PT tests are placeholder / mock only — **must be re-derived after OQ-PT-1 resolved** (L16).
    Current placeholder asserts: KA gross > ₹25k → PT computation has `unverified: true`; no
    statutory amount asserted until counsel sign-off.
  - TDS: estimated slab computation (informational; not statutory per L1/OQ2).
- `staffLeaveBalance.test.ts` — balance decrement, LWP auto-approve, EL accrual.
- `gratuity.test.ts` — tenure < 5yr → ₹0; exactly 5yr → formula; edge 4yr 364d → ₹0;
  high-tenure CXO → capped at ₹20,00,000 with `gratuityCapped: true` (L20).
- `elEncashment.test.ts` — balance ≤ 300 days → correct formula; balance > 300 days →
  capped at 300 days per IT Act §10(10AA) (L19).
- `ffProRatedSalary.test.ts` — exit on day 15 of a 30-day month → 50% of monthlyBasic (L23).
- `salaryRLS.test.ts` — `selectStaffForViewer` with R05 role strips salary/payslip/bankDetails
  fields; R12 role retains outlet-scoped salary fields; R16 retains all (L18). Vitest required.
- `roleTransition.test.ts` — `hasRank` comparator; guard enforcement per §6.2.
- `orgChartCycle.test.ts` — DFS cycle detection; valid and cycle cases.
- `attendanceDedup.test.ts` — same staffId + timestamp within ±60s → single record.
- `fingerprintWebhookAuth.test.ts` — valid HMAC → 200; invalid HMAC → 401; stale timestamp
  > 5min → 401; replayed eventId within 24h → 200 recorded:false; unknown deviceId → 401 (L17).
- `i18n key test` — all `messages/en-IN/staff.json` keys resolve (pattern from PLAN-003 L30).

### Integration tests
- MSW fingerprint webhook handler — POST with valid/invalid body.
- Leave approval flow — apply → approve → balance confirmed.
- Role change flow — R03 lateral; R02 manager tier; R01 admin tier; insufficient actor →
  401.

### End-to-end (Playwright) — maps to stories
- S1: Directory filter + navigation.
- S3: Payslip generation as R15; blocked as R05.
- S5: Leave apply + manager approval.
- S7: Full onboarding stepper; blocked without DPDP consent.
- S8: Exit initiation + F&F with gratuity.

### Accessibility
- Axe-core scan on `/staff`, `/staff/[id]` (all 6 tabs), `/staff/new`.
- Keyboard nav through calendar cells (Attendance tab).

### Security / RBAC
- R05 requesting another staff's salary → 403.
- R03 requesting cross-outlet staff → 403.
- Sub-R12 caller on `GET /api/staff` or `GET /api/staff/:id` — response payload must NOT
  contain salary/payslip/bankDetails fields (slice-level RLS via `selectStaffForViewer`, L18).
- PII fields masked in API response for sub-R02 callers.
- Audit log entry asserted after every `RoleAuditEvent`.
- Fingerprint replay: replayed eventId → 200 recorded:false; stale timestamp > 5min → 401;
  wrong HMAC → 401 (L17).

### UAT
- Finance Head (R16) — validates payslip deductions against manual calculation.
- Outlet Manager (R03) — validates directory filter scope.
- DPO (R23) — validates DPDP consent capture + PII masking.

---

## 18. Open questions

| # | Question | Owner | Due | Default if undecided |
|---|---|---|---|---|
| OQ-PT-1 | **[REGULATORY BLOCKER]** Tax counsel sign-off on KA/MH/TN PT slabs. Current placeholder values (KA ₹200/mo if gross > ₹25k; MH ₹200/mo non-Feb + ₹300 Feb if gross > ₹10k; TN ₹208/mo equivalent for half-year > ₹75k) are dated 2024 — verify for FY2026. P2 (salary/payslip) is gated on this. | Tax counsel | 2026-05-05 | Placeholder values with `unverified: true` flag; no production payslip until resolved |
| OQ-ROLE-1 | **[IMPLEMENTATION BLOCKER]** Confirm role-transition approver chain against Doc 14 §X.Y. Current spec §6.2 values are best-guess. User-stated thresholds (R09→R10 needs R12+, R10→R12 needs R19+, R12→R19 needs R22+/R24) differ from spec. Doc 14 is the arbiter. | PM + Doc 14 owner | 2026-05-05 | Do not implement role-change guards until Doc 14 confirmed |
| OQ1 | PT slab for TN: half-yearly cadence confirmed? Is BN's TN entity registered for half-yearly PT remittance (changes UI to show half-yearly accrual, not monthly deduction)? | Finance Head / Tax counsel | 2026-05-05 | Half-yearly per placeholder L16; pending OQ-PT-1 resolution |
| OQ2 | Does BN Automobiles want TDS withheld in DMS (deducted from net pay preview) or purely informational? | CFO / Finance Head | 2026-05-05 | Informational only per Doc 06 §15.2 (greytHR computes TDS) |
| OQ3 | Which fingerprint device vendor? (Suprema / Mantra / ZKTeco) — affects real prod webhook format. | CTO / Operations | 2026-05-12 | Suprema BioStation A2 (most common in Indian auto dealerships) |
| OQ4 | Shift patterns for service workshop — single shift vs rotating? Needed for OT computation. | Workshop Manager | 2026-05-12 | Single shift 09:00–18:30 for v1; OT = hours > 9.5/day |

---

### 18.1 Deferred items (tracked, not blockers)

These were flagged after the 2026-04-29 spec-enhancement pass but deferred to v1.1 because they are UX polish, not behavioural gaps. Tracked here so they don't get lost.

| # | Item | Module | Priority | Notes |
|---|---|---|---|---|
| DEF-S7-1 | **Onboarding wizard role-select dropdown filtering.** L_S7 establishes the page-level R03+ gate and submit-time hire-tier check (both shipped). The wizard's role `<select>` should ALSO filter visible options per viewer rank as a UX hint — viewer R03 sees only R05–R11; R12+ sees R05–R11 + R12+; R02+ sees all. Currently the dropdown shows all roles to anyone reaching the wizard; the submit-side guard catches violations but the UX leads users into a dead end. **Implementation note:** add a `viewerRank` prop to `wizard-step-role.tsx` that derives from `useStaffAuth().user.role`; filter the options array via `availableRolesForViewer(viewerRank)` helper in `apps/staff-web/src/lib/staff/role-rank.ts`. | staff | P2 (UX polish) | Submit-side guard is the source of truth — this is purely a usability gate to avoid silent rejections at submit time. |

---

## 19. Dependencies

- `@dms/types` — `StaffProfile`, `SalaryStructure`, `AttendanceRecord`, `LeaveRequest`,
  `LeaveBalance`, `RoleAuditEvent`, `ExitRecord` schemas exported.
- `@dms/mocks` — staff fixture files (`staff-profiles.ts`, `attendance.ts`, `leaves.ts`,
  `salary-structures.ts`) in `packages/mocks/src/staff/`.
- `@react-pdf/renderer` — new dependency (P2); justify: payslip PDF rendered client-side
  avoiding a server PDF job in v1 (L14).
- `react-d3-tree` or equivalent — new dependency (P6); justify: org chart tree layout.
- Service module slice (P5) — must expose `getJCsByAdvisor(staffId, dateRange)` selector.
- Sales module slice (P5) — must expose `getDealsByStaff(staffId, dateRange)` selector.
- Parts module slice (P5) — must expose `getGRNsByStaff(staffId, dateRange)` selector.
- DPO sign-off — required before P1 merge (pii_sensitivity: high; Doc 15 §7).
- Finance Head sign-off — required before P2 merge (payroll computation).

---

## 20. Rollback plan

Feature flag `feat_spec_staff_001_management` is a kill switch. If disabled:
- `/staff` and `/staff/[id]` routes return 404 (gated in layout).
- `/staff/new` route inaccessible.
- `MOCK_STAFF_PROFILES` in `staff-auth-provider` falls back to the 8-profile array
  (backward-compatible: `StaffProfile` is a superset of `StaffUser`; existing role-switcher
  sidebar reads the same export).
- No data cleanup required — all data is MSW-mock only in v1; no persistent writes.

---

## 23. Onboarding flow — detailed step-by-step UX

*Added in v0.3. Maps to L24.*

**Route:** `/staff/new`  
**RBAC:** R12+ to access; R02+ for R12+ roles (S7 AC).  
**Pattern:** 5-step wizard with stepper progress bar.

### Step 1 — Basic Info
Fields: Full Name*, Work Email*, Phone, Date of Birth, Emergency Contact (Name + Phone).  
Validation: name required; valid email format required.  
PII: phone captured here (masked in later display per L6).

### Step 2 — Role & Outlet
Fields: Role selector (filtered by actor authority — R02+ sees R12+ roles), Outlet, Department, Reports-To (staff ID, optional).  
Guard: `hasRank(actorRole, 'R02')` required for R12+ role selection.  
Note: Reports-To can be updated from org chart later.

### Step 3 — Documents
Fields (filenames only — no actual upload in v1):
- Aadhaar last-4 digits (text input, numeric, max 4 chars — L6, full number never stored)
- PAN (masked format, e.g. `ABCPX1234X` — L6, visible to R02+/R22/R23)
- Offer letter filename (e.g. `offer-letter-ramesh-kumar.pdf`)
- Bank account last-4 digits + bank name (visible to R16+ only — L6)

### Step 4 — DPDP Consent
Consent checkbox: mandatory. Blocks step 5 and final submit if unchecked (S7 AC, L7).  
Purpose text: `STAFF_HR_PROCESSING`, duration: employment + 7 years, per Doc 06 §19 + Doc 03 §10.  
Salary scaffold note: salary structure is configured post-onboarding in P2 (FIXME: OQ-PT-1).

### Step 5 — Review & Submit
Summary card: all entered fields displayed for review.  
Fingerprint enrollment stub: instructions for device admin to register new staff ID (webhook fires on enrollment, updates `fingerprintEnrolled` flag).  
Submit button: disabled until DPDP consent is given.  
On submit: `addStaff` action, `STAFF_ONBOARDED` audit event, redirect to `/staff`.

---

## 24. Profile audit trail schema

*Added in v0.3. Maps to L25.*

**Type:** `StaffProfileAuditEvent` (in `staff-store.ts`)

```ts
interface StaffProfileAuditEvent {
  id: string;
  staffId: string;
  kind: StaffProfileAuditEventKind;  // see below
  actorId: string;
  at: string;              // ISO 8601 datetime
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason?: string;
  schemaVersion: 'v1';
}

type StaffProfileAuditEventKind =
  | 'role-transition'
  | 'salary-change'
  | 'leave-applied'
  | 'profile-updated'
  | 'dpdp-consent-given'
  | 'exit-initiated'
  | 'onboarded';
```

**Store placement:** `StaffState.profileAuditLog: StaffProfileAuditEvent[]`

**Access control (L25):**
- `selectProfileAuditLog(staffId, viewerRole, viewerIsSelf)` — returns empty array if sub-R09 and not self.
- Self always reads own audit log.
- R09+ can read any staff member's audit log (outlet-scoped in full API; not enforced in store/P1).

**Anonymization:** 7 years post-exit, name/PAN/Aadhaar in events replaced with `[REDACTED]` per L12/Doc 06 §17.

**Events emitted by store actions:**
| Action | Kind emitted |
|---|---|
| `addStaff` | `onboarded` |
| `transitionRole` | `role-transition` |
| `updateStaffProfile` | `profile-updated` |
| `updateReportsTo` | `profile-updated` (reportsTo field change) |

---

## 25. Org chart layout spec

*Added in v0.3. Maps to L26.*

### Data shape
Source: `StaffProfile.reportsTo: string | null` on each profile.  
Root nodes: profiles where `reportsTo === null` or `reportsTo` points to a non-existent profile or is part of a detected cycle.

### Render strategy
- **Algorithm:** Build adjacency list (children of each manager), then recursively render.
- **Layout:** Recursive nested `<div>` elements with `border-l border-line ml-8 pl-3` connectors — no external graph library.
- **Cycle detection (DFS):** Before rendering, `wouldCreateCycle(staffId, newManagerId, staffById)` is called for every `reportsTo` resolution. If a cycle is found, the problematic node is treated as a root (broken chain = root per L26).
- **Re-org cycle guard:** `updateReportsTo` in store calls cycle detection before mutation; returns `{ success: false, error: 'Cannot set this manager — would create a reporting cycle.' }` if cycle detected.
- **Collapsible subtrees:** Each node has expand/collapse toggle. Collapsed by default only if subtree has > 5 children (not enforced in v1 — all expanded by default).
- **Node anatomy:** Avatar initials + name + role badge + status dot + direct-report count.

### Click → detail behavior
Clicking a node sets `selectedId` state → renders a detail slide-over panel on the right.  
Panel shows: avatar, name, role, department, outlet, status, reports-to, DPDP consent chip, "View Full Profile" link.  
Close: click the chevron or select a different node.

### Re-org (R02+ only)
"Change Manager" button in detail panel → opens `ReOrgDialog`.  
Dialog: new manager select (all non-exited staff except self), reason textarea (min 5 chars).  
On confirm: calls `updateReportsTo` → cycle detection → `REPORTS_TO_CHANGED` event in `roleAuditLog` + `profileAuditLog`.

---

## 21. Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-28 | 0.1 | orchestrator | Initial draft — all 21 sections, 6-phase plan, 24-staff fixture design |
| 2026-04-28 | 0.2 | orchestrator | Review fixes applied (B1–B5 + payroll audit items). L16–L23 added. Status REMAINS draft pending tax-counsel sign-off on PT slabs (OQ-PT-1) and Doc 14 verification of role-transition chain (OQ-ROLE-1). |
| 2026-04-29 | 0.3 | orchestrator | L24–L26 added. §22 (implementation status), §23 (onboarding wizard UX), §24 (profile audit trail schema), §25 (org chart layout spec) added. Filter bar polish shipped. Onboarding wizard (5-step) shipped. Profile audit trail on StaffStore shipped. Org chart with cycle detection shipped. Status remains draft pending OQ-PT-1 + OQ-ROLE-1. |
| 2026-04-29 | 0.4 | orchestrator | L27–L31 added. §26 (Salary tab UX) and §27 (Attendance tab UX) added. P2 (Salary tab) and P3 (Attendance tab) shipped with PT unverified banner. SalaryStructure + AttendancePunch schemas in `@dms/types`. `payroll-math.ts` + `attendance-math.ts` helpers. `updateSalary` (R22+ gate) + `addAttendancePunch` (R12+ override gate) store actions. Fingerprint webhook stub (`/api/webhooks/fingerprint/route.ts`) with HMAC-SHA256 + ±5min replay + ±60s dedup. Mock salary fixtures (MOCK_SALARY_STRUCTURES) + 3-month attendance fixtures (MOCK_ATTENDANCE_PUNCHES). 14+ new tests added. §22 implementation status updated. |
| 2026-04-29 | 0.5 | orchestrator | **S7/S8 polish + leaves admin spec.** L_S7 added: onboarding gate is **R03+** at the page level, with a per-role hire-tier check at submit time (R12+ roles require R02+ to onboard). Resolves the prior R12-vs-R03 divergence — code now matches spec. New §8.6 documents `/staff/leaves` global admin route fully (scope toggle mine/outlet/all, filter chips by type+status+date-range, inline approve/reject with min-10-char reason on reject, Comp-Off balance cascade, stats strip with overdue tile for pending > 3 days, R02+ cross-outlet sortable column). S8 anonymization scheduler shipped: `runAnonymizationSweep(actor)` + `runAnonymizationSweepDryRun()` in `apps/staff-web/src/lib/staff/anonymization-scheduler.ts`. PII fields anonymized: name/email/phone/panLast4/aadhaarLast4/addressLine1/2 → `'ANONYMIZED_USER'` etc. New audit event kind `staff-anonymized`. R02+ admin "Run anonymization sweep" button on `/staff` with type-to-confirm `ANONYMIZE`. 20 new tests under `apps/staff-web/src/tests/staff-s7-s8-items.test.ts`. |

---

## 26. Salary tab — UX specification

*Added in v0.4. Maps to L27–L29.*

### Access control
- Self-view: always allowed (any staff sees own salary).
- R12+: can view any outlet staff salary (outlet-scoped).
- R16+, R22, R23: can view org-wide salary.
- Sub-R12 viewing another staff → renders `403 Restricted` state (Lock icon + explanation).
- R22+: "Edit Salary" button visible but shows disabled stub in v1 (form in v1.1).

### Sections (top to bottom)

**Compliance banner (sticky top)**  
Always visible while on Salary tab. Text: _"Payroll preview only. PT slabs flagged for tax counsel verification (OQ-PT-1). Statutory filing via greytHR/Keka per Doc 06 §15.2."_  
Background: `warning/10`, border `warning/30`. `AlertTriangle` icon.

**Salary Structure card**  
Shows all components: Basic, HRA, DA (if > 0), Special Allowance, Conveyance, Medical, Performance Bonus.  
Row: Gross Monthly and Gross Annual (= gross × 12).  
"Edit Salary" button (R22+ only) — disabled stub in v1.

**Statutory Deductions card**  
- PF: `computePF(basic)` — caption: "12% of Basic, capped ₹1,800".
- ESIC: `computeESIC(gross).employee` — caption "0.75% of gross" if ≤ ₹21k; "Not applicable (gross > ₹21,000)" if above.
- PT: `computePT(state, gross, month)` — displays slab value. **Always shows `UNVERIFIED` chip with tooltip**: "PT slab pending tax counsel review per OQ-PT-1. Preview value only."
- TDS: `computeTDS(annualGross)` — label has `(informational avg)` + `Info` icon.
- Total Deductions row (bold).

**Net Pay widget**  
Prominent card: `accent/8` background, large bold mono font. Label: "Net Monthly Pay".

**Salary History table**  
Sorted descending (most recent first). Columns: Effective Date · Basic · Gross · Reason · Approved By.  
If empty: "No salary history recorded." text state.  
Footer note: "Salary raise approvals require CFO (R22) authority (L29)." (visible to sub-R22 viewers).

**Payslip Generator panel**  
Month dropdown: last 6 months (hard-coded; dynamic from store in v1.1).  
"Generate Payslip" button → opens `PayslipDialog` (modal overlay).  
`PayslipDialog` contains: full payslip layout (employer info, earnings table, deductions table, net pay), "Download PDF" (`window.print()`), compliance notice at top.  
Footer note: "Preview-only. Download via browser print-to-PDF (L28)."

### Formulas
See `apps/staff-web/src/lib/staff/payroll-math.ts` for canonical implementations.

---

## 27. Attendance tab — UX specification

*Added in v0.4. Maps to L30–L31.*

### Access control
- Self: can view own attendance (all roles).
- R03+: can view outlet staff attendance.
- R12+: can perform manual punch override.

### Sections (top to bottom)

**Period selector + Sync status bar**  
Left: month dropdown (last 3 months with data: Apr/Mar/Feb 2026).  
Right: sync status indicator — green dot + "Last device sync: 2 mins ago" + `RefreshCw` button (stub in v1; polls device sync endpoint in v1.1).

**Monthly Summary card**  
6 stats in a row: Working Days · Present · Absent · Half Days · Late Marks · OT Hours.  
Color coding: Present = `text-success`, Absent = `text-danger`, Half Days + Late = `text-warning`.

**Calendar legend row**  
4 chips: green = Present, red = Absent, yellow = Half Day, yellow/60 = Late.

**Calendar grid (7-col CSS grid)**  
Header row: Sun Mon Tue Wed Thu Fri Sat.  
Day cells: Each weekday cell shows day number + status dot. Color-coded per `STATUS_COLOR`.  
Weekend cells: muted background, day number only.  
"Today" cell: `ring-2 ring-accent`.  
Click a day cell → inline detail row expands (col-span-7): date, status, hours, punch-in/out times, override note if any. "Manual Override" button (R12+) → opens `OverrideDialog`.

**`OverrideDialog`**  
Fields: Punch In (time picker), Punch Out (time picker), Reason (textarea, min 5 chars).  
On submit: calls `addAttendancePunch` twice (in + out punch) with `isOverride: true, overrideBy: actorId`.  
R12+ gate enforced at store action level.  
Success state: "Override saved successfully." before auto-close.

**Daily Punch Records table**  
Weekday rows only. Columns: Date · Punch In · Punch Out · Hours · Status · Override (R12+ column).  
"(override)" chip in Status if any punch for that day is `isOverride: true`.  
Footer: "Click a calendar day to open the manual override dialog. R12+ authority required (L17)."

### Punch classification (L31)
`classifyDay(punches)` in `attendance-math.ts`:
- No punch-in → `absent`
- Total hours < 4 → `half-day` (takes priority over `late`)
- First punch-in > 09:30 AM → `late`
- Otherwise → `present`

`computeDailyHours(punches)`: pairs punch-in + punch-out in chronological order.  
`computeMonthlySummary(staffId, year, month, punches)`: working days = Mon–Fri count (no holiday calendar in v1).

### Webhook handler (L30)
Route: `POST /api/webhooks/fingerprint`  
File: `apps/staff-web/app/api/webhooks/fingerprint/route.ts`  
Validation: HMAC-SHA256 body signature, ±5min replay window, ±60s dedup bucket, device secret lookup, 24h rotation grace.  
Returns: `{ punchId, staffId, deviceId, eventType, timestamp, accepted: true }` on success.  
Note: mock route returns accepted punch data; client updates store optimistically in v1 (server-side store write in production).

### Mock data
`MOCK_ATTENDANCE_PUNCHES` in `packages/mocks/src/fixtures/staff-attendance.ts`:  
3 months (Feb/Mar/Apr 2026) × 24 staff. Mon–Fri, ~9 AM in / ~6 PM out.  
~8% absence rate, ~5% late, ~10% overtime per seeded deterministic pseudo-random.  
3 device IDs: `device-blr-001`, `device-mum-001`, `device-che-001`.

---

## 22. Implementation status

*Updated in v0.4.*

| Phase | Status | Shipped | Pending / Blocked |
|---|---|---|---|
| P1 | Shipped | Directory `/staff`, detail `/staff/[id]` (Profile + Roles tabs), 24-staff fixture, `RoleAuditEvent`, org chart read-only (`/staff/org-chart`), 5-step onboarding wizard (`/staff/new`), profile audit trail (L25), `updateReportsTo` with cycle detection (L26), filter bar polish | — |
| P2 | **Shipped (v0.4)** | Salary tab (`salary-tab.tsx`), `SalaryStructure` schema, `payroll-math.ts` (PF/ESIC/PT/TDS/Gratuity/EL/ProRate/FF), `updateSalary` store action (R22+ gate, L29), `selectPayslip` pure selector, `MOCK_SALARY_STRUCTURES` fixture, payslip preview dialog (browser print-to-PDF, L28), PT unverified banner + chip (L16, L27), 14+ tests | Edit salary form (v1.1). greytHR CSV export (v1.1). OQ-PT-1 still open — PT slabs unverified until tax counsel confirms. |
| P3 | **Shipped (v0.4)** | Attendance tab (`attendance-tab.tsx`), `AttendancePunch` + `AttendanceMonthlySummary` schemas, `attendance-math.ts` (classifyDay L30/L31, computeMonthlySummary, computeDailyHours), `addAttendancePunch` + `selectAttendancePunches` store actions, fingerprint webhook stub (`/api/webhooks/fingerprint/route.ts`, HMAC-SHA256 + replay + dedup, L17/L30), `MOCK_ATTENDANCE_PUNCHES` 3-month fixture (24 staff), calendar UI + override dialog (R12+) | OQ3 (device vendor) + OQ4 (shift pattern) still open. Sync-status button is a stub. |
| P4 | Not started | — | Leaves tab, leave balance, apply/approve/reject flow, team calendar, EL encashment on exit. |
| P5 | Not started | — | Efficiency tab, role-specific KPI aggregations (service/sales/parts stores), 12-month trend charts. |
| P6 | Partially done | Org chart read-only + re-org dialog | Drag-and-drop re-org (CSS only, no DnD lib), exit flow, F&F calculation, anonymization scheduler. |
