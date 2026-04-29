---
review_of: SPEC-STAFF-001
review_version: 0.1
reviewers: [security, finance-reviewer, qa-planner]
reviewed_on: 2026-04-28
spec_version_reviewed: 0.1
verdict: needs-revision
---

# Reviewer Report — SPEC-STAFF-001 (Staff Management)

## Verdict

**NEEDS REVISION.** Spec is structurally strong (clean entities, good RLS framing,
sensible phase plan, gratuity rule correct), but four hard blockers force a
revision rather than approve-with-fixes:

1. PT slabs in L5 are factually wrong for all three states (KA threshold stale,
   MH Feb/non-Feb inverted, TN flat-rate misstated and missing semi-annual
   nature). This is statutory math — cannot ship unverified.
2. Fingerprint webhook auth is hand-wavy (`service token`) with no HMAC, no
   replay window, no rotation policy. Endpoint forges attendance which feeds
   payroll → high-impact attack surface.
3. Salary RBAC enforcement is described at the API auth tag level only; no
   field-level / row-level filter on the response payload is specified, so the
   "Salary visible R12+ only" boundary is UI-only by default. Fails Doc 14 §28.
4. EL encashment formula is referenced in `ExitRecord.ffSummary.elEncashment`
   and S8/F&F flow but the formula itself is never defined anywhere in the
   spec. Cannot pass /implement → /test gate.

The fixes for (2)–(4) are well under 80 lines combined. (1) requires a tax
counsel sanity check on current 2026 PT slabs per state — that's the gating
item. Recommend: route to Finance Head + tax counsel for L5 correction, and
land the other three fixes inline.

---

## Top 5 Blockers / Concerns (ranked)

1. **[BLOCKER] PT slab table in L5 is wrong** (lines 41, 800–801, 136). All
   three states off — see Payroll Audit §A below. Tax counsel review required.
2. **[BLOCKER] Fingerprint webhook has no real authentication contract**
   (lines 38, 456–460). "service token" with no HMAC, no replay window beyond
   the ±60s dedup (which is dedup, not auth-replay protection), no rotation.
3. **[BLOCKER] Salary slice-level RLS not specified** (lines 432–435, 685–687).
   API tag says "Auth: self | R12+ outlet | R16+" but no statement that
   `GET /api/staff` and `GET /api/staff/:id` strip salary fields out of the
   payload for sub-R12 callers. Today the spec implies the fields are simply
   "hidden in UI". Fails Doc 14 §28.
4. **[BLOCKER] EL encashment formula not defined** (lines 312, 360–366,
   §17 test plan). Field exists, F&F uses it, no formula. Standard is
   `(basic + DA)/26 × balance_EL_days` — must be locked.
5. **[CONCERN] Gratuity cap of ₹20 lakh missing** (L11, line 47). Payment of
   Gratuity (Amendment) Act 2018 caps tax-free gratuity at ₹20,00,000. Spec
   formula is correct but uncapped — high-tenure CXO exits will display wrong
   F&F totals.

---

## Payroll Formula Audit (Finance Reviewer Hat)

### A. Professional Tax slabs (L5, line 41) — WRONG, all three states

| State | Spec says | Current statute (2026) | Verdict |
|---|---|---|---|
| KA | ≤₹15k = ₹0; ₹15k–₹20k = ₹150; >₹20k = ₹200 | ≤₹25k = ₹0; >₹25k = ₹200 (KA Tax on Professions Act amendment effective Apr 2023) | **Stale threshold.** Spec will collect PT from staff who are statutorily exempt. |
| MH | ≤₹7.5k = ₹0; >₹7.5k = ₹175 in **Feb** / ₹200 other months | ≤₹7.5k = ₹0; ₹7.5k–₹10k = ₹175 (men only; women exempt to ₹25k); >₹10k = ₹200 jan–jan, **₹300 in Feb** | **Inverted.** Spec has Feb at ₹175 — actual is ₹300 (annual cap ₹2,500 = 11×₹200 + ₹300). Also missing women-exemption band. |
| TN | ≤₹21k = ₹135; >₹21k = ₹135 (flat) | TN is **half-yearly slab**, not monthly. ₹0 < ₹21k; scales to ₹1,250 per half-year (~₹208/mo) for >₹75k half-yearly income. | **Wrong rate, wrong cadence.** TN cannot be modelled as a flat monthly. |

**Required fix:** Replace L5 PT block with state-specific slab tables, sourced
from each state's current Tax on Professions / Trades / Callings & Employments
Act (cite section + amendment year). Add OQ to confirm BN's TN entity is
registered for half-yearly PT remittance — that changes the UI for the Salary
tab (shows half-yearly accrual, not monthly deduction).

### B. PF — CORRECT (L5, line 41; boundary test line 755)

`min(basic × 0.12, 1800)` per EPF Act ₹15,000 ceiling. Boundary at basic=₹15k
→ ₹1,800 verified. Note for clarity: spec should state employer share (12%
split into 8.33% EPS + 3.67% EPF, EPS capped at ₹1,250) is **not** computed in
DMS — implicit today, should be explicit.

### C. ESIC — INCOMPLETE (L5, line 41; boundary test line 756)

Employee `gross × 0.0075` if gross ≤ ₹21,000 — CORRECT. Boundary at
₹21,000 → ₹157.50, ₹21,001 → ₹0 — CORRECT.

**Missing:** Employer share **3.25% of gross** (total 4% wage cost). Not in
spec. greytHR CSV export at line 625 lists `esic` as one column — must
disambiguate `esic_employee` vs `esic_employer` or the export will be
malformed at the statutory filing layer. Also missing: ₹25,000 threshold for
Persons with Disabilities (PwD). Add field `disabilityStatus` to
`StaffProfile` or document non-support.

### D. TDS u/s 192 — ACCEPTABLE (L1, OQ2)

Spec marks TDS as informational/preview only (Doc 06 §15.2 keeps statutory at
greytHR). Correct boundary. Recommend OQ2 default ("informational only") be
locked into L5 explicitly so /implement doesn't accidentally net-deduct TDS.

### E. Gratuity — MOSTLY CORRECT (L11, line 47)

`(last_drawn_basic + DA) × 15/26 × completed_years` — CORRECT.
≥ 5 years rule — CORRECT (Payment of Gratuity Act 1972 §4(1)).
4y 364d edge → ₹0 — CORRECT (line 760).

**Missing:** ₹20,00,000 statutory cap (PoG Amendment Act 2018). Add to F&F
computation: `min(formula, 2_000_000)`.

**Subtle:** "completed years" rule needs a tie-breaker for 4y 240+ days = 5y
under the "continuous service" definition (Madras HC, Mettur Beardsell). For
v1, sticking with strict ≥ 5y is defensible but should be called out.

### F. EL Encashment — MISSING FORMULA (line 312, 363; S8 line 178)

Field `LeaveRequest.encashed: boolean`, `ExitRecord.elEncashment: number`,
no formula anywhere. Standard:

```
elEncashment = ((basic + DA) / 26) × balance_EL_days
```

`26` is the statutory "monthly working days" divisor (factories/shops act
convention). Spec needs this formula in §5.5 or new §5.8.

### G. F&F Calculation — UNDER-SPECIFIED (line 360–366)

`ffSummary` lists 5 numbers but no formula for `lastSalaryProrated` or
`deductions`. Pro-rated salary should be:

```
lastSalaryProrated = (gross_monthly / working_days_in_month) × days_worked_in_exit_month
```

`deductions` bag is opaque — needs enumeration (recovery of advance, notice
shortfall, asset-loss recovery). Without this, reviewer cannot validate F&F.

---

## Security Reviewer Hat — Findings

### S1 [BLOCKER] Fingerprint webhook auth (lines 38, 456–460)

Issues:
- **No HMAC**: "service token" implies a static bearer token. Anyone who
  obtains it can forge attendance for any staffId → forge presence → forge
  payroll. This is an integrity attack on money.
- **No timestamp signature window**: ±60s dedup at line 752 protects against
  duplicate device deliveries, NOT against an attacker replaying captured
  payloads hours later.
- **No rotation policy**: token rotation cadence, revocation on device theft,
  per-device key isolation — none specified.
- **No idempotency key**: replays + at-least-once delivery semantics aren't
  modelled. The `(staffId, timestamp)` dedup is implicit; should be explicit
  idempotency on `eventId`.

**Required fix (≤ 30 lines):**
- Add `Authorization: HMAC <signature>` header, signed over
  `deviceId|staffId|eventType|timestamp` with per-device shared secret.
- Reject any payload with `|now - timestamp| > 300s` (clock-skew window).
- `eventId` (UUID per device) for idempotency, separate from dedup.
- Rotation: per-device secret rotated quarterly; document procedure.
- Replay log: store last 1000 `eventId` per device for 24h.

### S2 [BLOCKER] Salary slice-level enforcement (lines 432–435, 538, 667, 700)

Spec line 538 says "Salary tab (hidden for roles < R12 viewing others; self
always sees own)" — **UI-only language**. Line 667 lists permission
`staff.salary.read.outlet` for R12+ but doesn't specify that
`GET /api/staff` and `GET /api/staff/:id` MUST strip salary-bearing fields
from the response for sub-R12 callers.

This is the L45 carryover concern. Today the spec implies a sub-R12 client
that crafts its own request (or inspects React Query cache) sees salary data.

**Required fix (≤ 20 lines):**
- §7.2 explicit: response schema is `StaffProfilePublic` (no
  bankAccountMasked, no salary fields, no Aadhaar/PAN) for sub-R12 callers.
- Add a `StaffProfilePrivate` schema with the unmasked superset.
- `GET /api/staff/:id/salary` is the **only** route that returns salary;
  inline embedding banned. Make this explicit in §5.

### S3 [CONCERN] Aadhaar last-4 enforcement (line 222)

Schema says `aadhaarLast4: z.string().length(4)` — CORRECT. But the
onboarding step 4 (line 580) says "Aadhaar last-4 entry (text, not doc)".

**Question:** Where does the doc upload of the *full* Aadhaar live? If the
doc is uploaded for KYC, the spec must state that:
- The doc is processed via sub-KUA (Doc 13) on the server,
- last-4 extracted,
- full PDF/image **purged within N seconds** post-processing,
- Never stored or logged.

Today the spec is silent. Add to §13 (Privacy & compliance) and the
onboarding stepper UI must reflect "Aadhaar number not stored".

### S4 [CONCERN] PAN encryption (line 223, 699)

Spec line 699 says PAN is "masked at rest (column-level KMS)". Good
intent but column-level KMS in a Postgres-via-Supabase deployment is
non-trivial and not described in §10 integrations. Either:
- Reference Doc 07 §X for the actual column-encryption pattern, or
- Drop to "masked at render" + DB-level full-disk encryption + access
  logging on PAN column reads.

For v1 (MSW mock), this is fine. For v1.1 (real backend), this is a Doc 07
follow-up.

### S5 [CONCERN] Role transition state machine (§6.2, line 387–397)

Approver chain doesn't match the user's stated chain:
- User said: R09→R10 needs R12+; R10→R12 needs R19+; R12→R19 needs R22+/R24.
- Spec L9/§6.2 said: "contributor→manager tier" needs R02 (Org Admin).

Conflict: Spec collapses everything to "R02 or R01". User wants graduated
rank thresholds. Either spec is wrong OR user instruction is wrong; the
Role/Permission Matrix (Doc 14) must arbitrate. **Open question to PM.**

Also `hasRank` comparator (L4) referenced but not defined in this spec —
must be cross-referenced to its definition site (PLAN-VEHICLES-003 L7) with
exact import path: `import { hasRank } from '@dms/types'`.

### S6 [CONCERN] Audit trail tamper-evidence (line 737)

NFR-S-10 referenced but no detail on:
- Hash chain seed,
- Verification cadence,
- What happens when chain breaks (alert? halt?).

Acceptable for v1 spec but flag as Doc 12 cross-reference.

### S7 [CONCERN] Race condition on role change (line 757) — half-fixed

Optimistic lock on `updatedAt` is fine, but: two parallel role changes
where actor A approves at the same moment as actor B promotes — both think
they have authority. Need: serialize role-change writes per `staffId` via
DB-level row lock or queue. Optimistic lock alone allows a stale read on
the *role* itself.

---

## Finance Reviewer Hat — Findings (beyond Payroll Audit)

### F1 [CONCERN] greytHR/Keka export schema (line 625)

Spec lists CSV columns as `staffId, name, grossPay, pf, esic, pt, tds,
netPay, commission`. Issues:
- `esic` ambiguous (employee vs employer). Greytip's CSV format wants
  **separate** columns. Verify with greytHR's standard import template.
- Missing: `basic`, `hra`, `da`, `lop_days` (loss-of-pay), `ot_hours`,
  `bank_account`, `ifsc`, `pan`, `uan` (PF universal account number),
  `esi_number`. Without these, statutory filing breaks.
- Missing: separate columns for PF employer share & EPS contribution.
- Missing: signed flag for whether greytHR has authoritative statutory
  computation (Doc 06 §15.2 says yes). Re-state in §10.

**Required fix:** Pull greytHR's actual import CSV spec (vendor doc) and
append column list to §10 or a new appendix.

### F2 [CONCERN] Pro-rated salary on month-mid joiners/leavers

Not addressed. Onboarding step 3 (line 578) captures full monthly salary
structure; payslip computation in §5.2 doesn't have a `daysWorked` field.
First payslip and exit payslip will both be wrong.

**Fix:** Add `lopDays` and `daysWorked` to a `PayslipComputation` view-model
in §5.2 or a new §5.8.

### F3 [CONCERN] DA component missing from salary structure (§5.2)

Gratuity formula (L11) uses `(basic + DA)`. SalaryStructureSchema has
`basic, hra, specialAllowance, conveyance, medicalAllowance,
performanceBonus`. **No DA field.** Either:
- DA is rolled into `specialAllowance` — document this or
- Add explicit `da` field — required for clean gratuity computation.

EL encashment formula will hit the same problem.

### F4 [CONCERN] Bonus / variable pay treatment

`performanceBonus` in salary structure is monthly. Real automotive comp
plans pay bonus quarterly/annually with TDS impact. Spec assumes monthly
bonus is added to gross → inflates PF/ESIC base each month. Tax counsel
should confirm whether `performanceBonus` is part of gross for PF
computation (it usually is **not** if it's truly variable/discretionary).

### F5 [PASS] Margin scheme / TCS / e-invoicing

Out of scope for staff module. No findings.

### F6 [CONCERN] LWP impact on PF/ESIC

Loss-of-pay reduces gross but PF is computed on `basic` (potentially full
basic if "wages for LOP days" interpretation differs). Provident Fund Act
nuance: LWP days reduce PF wages proportionally. Spec is silent.

---

## QA Reviewer Hat — Findings

### Q1 [BLOCKER] EL encashment formula missing → no test cases

Already cited (Concern #4 above). Without a formula, line 803 test
"EL accrual" can't be written.

### Q2 [GAP] Test plan misses negative authorization paths (§17, line 828)

Listed RBAC tests: R05 → 403 on salary, R03 → 403 cross-outlet.
Missing:
- R10 (Master Tech) attempting to approve a leave for a peer in another
  team → 403.
- Self attempting to *approve* own leave → 403.
- Self attempting to write own salary → 403.
- R22 (Auditor) attempting to write anything → 403.
- R23 (DPO) attempting to write salary → 403.
- Sub-R12 reading salary embedded in `GET /api/staff` listing → response
  must NOT contain the field at all (per S2 fix).

### Q3 [GAP] Boundary tests for PT (line 800) anchored to wrong slabs

Currently asserts KA basic=₹15k → PT=₹150 (per stale L5). Once L5 is
corrected, these tests break. Re-derive after slab fix.

### Q4 [GAP] No test for fingerprint replay attack (S1 fix)

Once HMAC + timestamp window land, add:
- Replayed payload (same eventId) → 409 / silent dedup.
- Stale timestamp (> 5min skew) → 401.
- Wrong HMAC → 401.

### Q5 [GAP] Org chart cycle test exists; missing depth test

Line 806 covers cycle. Doesn't cover:
- Deeply nested chains > 10 levels (perf budget).
- Removing a manager who has direct reports → reassignment policy?
- A staff with `reportsTo: null` other than R01 root → org chart renders
  multiple roots / orphans?

### Q6 [GAP] DPDP scenarios under-tested

§17 has UAT for DPO (R23) "validates DPDP consent capture + PII masking".
Missing automated tests for:
- DSR (Data Subject Request) flow from §13 line 718 — no test, no AC.
- Anonymization sweep at 7yr — `anonymizationScheduledAt` field exists
  (line 368) but no test verifies the timer fires and replaces fields.
- Consent revocation — what happens if a staff revokes
  `STAFF_HR_PROCESSING` consent? Spec is silent.

### Q7 [GAP] Self-service RLS proof tests

Line 670 says "All staff: staff.salary.read.self". Need a test that
asserts the RLS predicate: a staff signed in as themselves can only read
their own `/api/staff/:id/salary`, not anyone else's, even if they brute-
force the URL.

### Q8 [PASS] Phase ordering

P1–P6 dependency-correct. P5 (efficiency) reading from existing slices
is sound — selectors required (line 860–862).

### Q9 [GAP] Migration tests for fixture expansion 8 → 24 (§16.1)

No test that `MOCK_STAFF_PROFILES` extension preserves existing 8 IDs.
Other modules reference these IDs (cost ledger `addedBy: staff-...`).
Migration must guarantee no existing ID changes shape, only superset.
Add a snapshot test of the 8 original IDs.

### Q10 [GAP] Acceptance criteria for S4 (Attendance)

S4 says "Given fingerprint punches exist, calendar shows status". No AC for:
- Punches exist but punch-out missing → status?
- Punch-in after 11:00 → "Late" threshold? Where defined? OQ4 hints at
  09:00–18:30 single shift but doesn't lock the late threshold.
- Multiple punch pairs in a day (lunch out/in) — status?

---

## Traps for /implement

1. **L5 PT slabs**: don't implement what's currently written. Wait for fix.
2. **Salary embedding**: if you use `StaffProfile` as both list and detail
   payload, you'll leak salary to sub-R12. Split schemas (S2 fix).
3. **`hasRank`**: import from `@dms/types`, not redefine. Verify
   `RoleIdEnum` ordering matches Doc 14 (R01 highest, R24 lowest? or
   reverse?). The current numeric `hasRank` interpretation must match.
4. **`@react-pdf/renderer` size**: bundle adds ~600KB gz. Lazy-load only
   on Salary tab. Will fail Lighthouse budget if eager-imported.
5. **DPDP consent at step 4**: must persist to a `ConsentEvent` ledger
   (see Doc 06 §19), not just a boolean on `StaffProfile`. The boolean is
   a denormalized cache.
6. **Aadhaar last-4 length=4**: numeric string only — add `.regex(/^\d{4}$/)`.
   Today `length(4)` allows "abcd".
7. **PAN masked field**: format `ABCPX***4X` shown in line 223 — verify
   masking pattern matches Doc 14 §28 standard. PAN is 10 chars
   `[A-Z]{5}[0-9]{4}[A-Z]{1}`; masking middle 5 (chars 4–8) is more
   common than spec's example. Confirm with DPO.
8. **Date types**: `z.string().date()` is Zod v3.23+ only. Verify package
   version. Otherwise add `.regex(/^\d{4}-\d{2}-\d{2}$/)`.

---

## Missing Acceptance Criteria

| Story | Missing AC |
|---|---|
| S2 | Demotion AC missing — what entry conditions, what audit fields, what notification? |
| S3 | "R05 → 403" tested but no AC for what UI renders for self-view of own payslip. |
| S5 | No AC for overlapping leave (already on approved leave when applying for new range). |
| S6 | No AC for staff with cross-role tenure (was R05, now R04 — KPI window splits?). |
| S7 | No AC for onboarding a staff in `state=KA` vs `MH` vs `TN` — PT computed correctly per state at preview time? |
| S8 | No AC for gratuity cap of ₹20L. No AC for EL encashment formula application. |
| S9 | No AC for "what happens to direct reports of a re-org'd manager?". |
| S10 | No AC for "self downloading payslip from a month before salary structure existed." |

---

## Open Questions (route to PM / DPO / Tax counsel)

| # | Question | Owner |
|---|---|---|
| RQ1 | What are the current 2026 PT slabs for KA / MH / TN per BN's registered entity? Provide statute citation. | Tax counsel |
| RQ2 | Confirm role-transition rank chain: spec §6.2 vs user-stated chain (R09→R10 R12+, etc.). Doc 14 wins — which is it? | PM + Doc 14 owner |
| RQ3 | Is BN's full Aadhaar number ever stored, or is sub-KUA verification ephemeral? | DPO + Doc 13 |
| RQ4 | greytHR vs Keka — which is canonical? CSV columns differ. | Finance Head |
| RQ5 | Gratuity cap of ₹20L — apply at display time or at compute time? Tax-treatment difference. | Finance Head |
| RQ6 | DPDP consent revocation flow — what does staff continue to access after revocation? Self-payslip presumably yes; everything else? | DPO |
| RQ7 | Is `performanceBonus` in salary structure part of "wages" for PF (i.e., subject to 12%)? | Finance Head |
| RQ8 | Late-arrival threshold for attendance "Late" status — single global rule or per-shift? | Workshop Manager (links to OQ4) |
| RQ9 | Webhook secret rotation cadence and procedure — owner? | CTO |
| RQ10 | Multi-shift support — even minimal — needed for v1, or strictly single shift? OT computation depends. | Workshop Manager |

---

## Suggested Locked-Decision Additions

If/when the user responds to RQs above, add to §0:

- **L16** — PT slabs: per-state slab tables versioned by statute year; spec
  references slab table file `packages/types/src/domain/payroll/pt-slabs-2026.ts`.
- **L17** — Webhook auth: HMAC-SHA256 over `deviceId|staffId|eventType|timestamp`,
  per-device 32-byte secret, ±300s skew window, eventId UUID idempotency,
  quarterly rotation.
- **L18** — Salary fields are NEVER inlined in `StaffProfile`. Separate
  `StaffProfilePublic` (default response) vs `StaffProfilePrivate` (R02+,
  explicit endpoint).
- **L19** — EL encashment formula: `((basic + DA) / 26) × balance_EL_days`,
  applied at exit only, capped at allocated EL annual quota × tenure years.
- **L20** — Gratuity capped at ₹20,00,000 statutory limit (PoG Amendment 2018).
- **L21** — DA is a first-class field on `SalaryStructure` (not folded into
  specialAllowance) to support gratuity + EL encashment formulas.
- **L22** — TDS in DMS is **strictly preview/estimated**; net pay shown
  excludes TDS until greytHR confirms statutory amount. (Lock OQ2 default.)
- **L23** — Anonymization timer at 7yr post-exit triggers a scheduled job
  that overwrites `name`, `email`, `phone`, `aadhaarLast4`, `panMasked`,
  `bankAccountMasked` to literal `[REDACTED]`; emits
  `STAFF_PII_ANONYMIZED` audit event; staffId retained.

---

## Suggested Spec Patches (concrete, ≤ 80 lines combined excluding L5)

1. **§5.2 SalaryStructure**: add `da: z.number().nonnegative().default(0)`,
   add `lopDays`, `daysWorked` virtuals to a new `PayslipComputation` type.
   (~10 lines)
2. **§5.5 LeaveBalance / new §5.8**: add EL encashment formula + boundary
   tests. (~10 lines)
3. **§5.7 ExitRecord**: enumerate `deductions` bag fields; add
   `gratuityCapped: boolean`. (~5 lines)
4. **§7.6 fingerprint webhook**: rewrite auth contract per L17 above.
   (~20 lines)
5. **§7.1/7.2 staff list + detail**: split `StaffProfilePublic` /
   `StaffProfilePrivate`; explicit response schema per route. (~15 lines)
6. **§13**: add Aadhaar full-number purge clause; consent revocation flow;
   anonymization scheduled-job pattern. (~15 lines)
7. **§17**: add negative-RBAC test list per Q2; replay-attack tests per
   Q4; DSR + anonymization tests per Q6. (~15 lines)
8. **L5 (PT slabs)**: replace block — *requires tax counsel input*, not
   estimated lines.

Total non-L5 patch surface: ~90 lines (slightly over 80; close to budget).

---

## Sign-offs

- **security-reviewer**: BLOCK on S1, S2; CONCERN on S3, S5, S7. Sign-off
  pending S1+S2 fixes.
- **finance-reviewer**: BLOCK on L5 (PT) and EL encashment formula;
  CONCERN on F1, F2, F3, F6. Sign-off pending tax-counsel review.
- **qa-planner**: BLOCK on Q1; GAP on Q2, Q3, Q4, Q6, Q7, Q9, Q10.
  Sign-off pending blockers from sec/finance + Q2/Q4/Q6 test additions.

**Spec status recommendation:** `draft` → `in-review` (after RQ batch
returned) → `approved` after the three reviewers re-sign on v0.2.
