# SPEC-INSURANCE-001 — Review Report
status: needs-revision
date: 2026-04-28
reviewer: combined (security + finance + QA)

## Verdict

The spec is well-structured, cites the right docs, and gets most regulatory framing
correct (additive commission GST per L4/§10; aggregator-only per L1; DLT-only per L9;
single-source-of-truth VIN per L12). However it has **six blocker-class issues** that
prevent approval — chiefly: IRDAI disclosure is described as a UI-layer requirement
without a slice-level enforcement guarantee; DLT template-id enforcement is weak at
the slice boundary (only "campaign launch validates" — no per-message guard); DPDP
opt-out is checked at audience-build time but not at send time (race window if a
customer opts out between build and send); the §10 commission formula contradicts
the §3.4 schema field ordering and lacks the round-half-up specification needed for
finance reproducibility; the AI-call DPDP/TRAI gating leaks into v1 even though the
spec claims "stub only" (the mocked path still records dispositions used for
business decisions like auto-close-lost in S9); and the discount > 10% R12 gate
(L353) is asserted in prose but has no entity field, no store action, and no
fixture coverage. All blockers fit in <50 lines of edits, but the scope of what
needs new wording — particularly the DPDP send-time check and the slice-level
DLT guard — is large enough that a re-review is warranted. **Status: needs-revision.**

## Blockers (must fix before approve)

- **B1: DLT template-id enforcement is UI-only, not slice-level.**
  Evidence: L399 says "Only `APPROVED` templates can be used in campaigns." L509
  says "Campaign launch validates this." But the actual store action `launchCampaign`
  (L455) has no documented invariant, and per-message dispatch (`sendTemplateMessage`,
  L540–544) takes a `dltTemplateId` parameter without any precondition that the
  template's status is APPROVED at send time. CLAUDE.md §9 explicitly bans
  "free-text WhatsApp" — the contract must enforce this **at the dispatch boundary**,
  not at the campaign builder.
  Required action: Add an L-decision: "Every `sendTemplateMessage` call MUST resolve
  a `WhatsAppTemplate` whose `status === 'APPROVED'` AND `dltTemplateId` is non-null,
  asserted inside the BSP wrapper. Sending a template that has since been REJECTED or
  reverted to DRAFT throws `DltTemplateNotApprovedError` and increments
  `stats.failed`." Add a test scenario: template approved at campaign launch, then
  reverted to DRAFT before the queued message dispatches → message MUST fail, not send.

- **B2: DPDP opt-out is not honored at send time.**
  Evidence: §9.2 (L507) says opt-out is "Excluded from all audience queries" — i.e.
  filtered at audience-build. But scheduled campaigns (L249 `scheduledAt`) can launch
  hours/days after the audience snapshot. If a customer opts out between build and
  send, the spec as written sends to them. This violates DPDP Act 2023 purpose
  limitation + immediate withdrawal-of-consent obligations.
  Required action: Add an L-decision: "Opt-out is checked **twice**: at audience
  build (snapshot) AND immediately before each `sendTemplateMessage` call. Customers
  in `insuranceOptOuts` at send time MUST be skipped and counted in
  `stats.optedOut`, not `stats.failed`." Add a test scenario: customer in audience
  snapshot, opts out before scheduled send → not contacted, recorded in
  `stats.optedOut`.

- **B3: DPDP consent capture before marketing write is not explicit opt-in.**
  Evidence: L34 (L10) says "explicit consent before marketing", §3.3 (L170) has
  `marketingConsentGiven: z.boolean()` and `marketingConsentAt`. But the spec does
  not require a UI capture surface, the consent text is undefined, and the lead
  creation flow (§5.1 step 7, L367) creates a lead at stage `quoted` with no
  consent step. The audience filter (L269) hardcodes `hasMarketingConsent: true`,
  but if every lead defaults to `false`, the audience is empty; if leads default
  to `true`, that's an implicit opt-in (DPDP-illegal).
  Required action: Add an L-decision: "On lead creation, `marketingConsentGiven`
  defaults to `false`. A separate explicit consent step (checkbox + ISO timestamp +
  purpose `INSURANCE_MARKETING` written to consent-log) is required before the
  customer enters any audience. Consent UI text is owned by the i18n key
  `insurance.consent.marketingPurpose` and reviewed by legal before P3 ships."
  Add a test scenario: lead created without consent step → audience builder skips
  this lead even when `expiryWindowDays` matches.

- **B4: IRDAI disclosure is asserted as a UI requirement but is not gated at the
  component contract layer.**
  Evidence: L26 (L2) says CSR + reg no on every quote card "non-negotiable UI
  constraint." §8 (L494) lists three required disclosure items. But §3.1
  `InsuranceProvider` does not mark `irdaiRegNo` and `claimSettlementRatio` as
  required-at-display-time. There is no `<QuoteCard>` invariant ("renders only if
  provider has both fields"), no test that a quote with missing CSR fails closed.
  Per IRDAI Web Aggregator Guidelines 2017 §8 a quote without these disclosures is
  non-compliant; the spec should fail-closed, not silently render.
  Required action: Add an L-decision: "QuoteCard / ShareableQuotePage MUST throw
  (or render an explicit 'Missing IRDAI disclosure' state) if
  `provider.irdaiRegNo` or `provider.claimSettlementRatio` is null/empty. The
  shareable-quote PDF export carries the IRDAI disclaimer string in the footer;
  rendering without the disclaimer is forbidden." Add a test scenario:
  provider with empty `irdaiRegNo` → QuoteCard renders fail-closed and the
  campaign launcher / quote share blocks generation.

- **B5: AI-call gating leaks into v1 despite "stub only."**
  Evidence: L35 (L11) says AI calling is "stubbed" and "Production wiring is P4
  follow-up." But §5.6 (L408–415) describes flows that are business-mutating: S9
  (L766) auto-closes a lead as `closed-lost` based on a **mocked** outcome
  (`do-not-call`). This means v1 demos can show a customer being closed-lost from
  a fake call, which (a) muddies the demo narrative, (b) bakes in a behavior that
  in production requires DPDP `INSURANCE_CALLING` consent (OQ4) and TRAI auto-
  dialler registration (OQ5). The spec needs to either gate the auto-mutating side
  effects behind the production wiring, OR mark v1 transcripts as non-mutating.
  Required action: Add an L-decision: "In v1 (`isMocked: true`), AI-call outcomes
  are display-only; they do NOT auto-mutate lead stage. Auto-close-lost on
  `do-not-call` is gated on `isMocked === false`, which requires OQ4 (DPDP
  `INSURANCE_CALLING` purpose) AND OQ5 (TRAI auto-dialler registration) resolved.
  S9 is rewritten as: outcome rendered + manual confirmation dialog shown to
  advisor; advisor must explicitly close-lost." OQ5 is correctly flagged as a P4
  blocker; lift it from "Open question" status to a hard prerequisite for P4
  kick-off.

- **B6: Discount > 10% gate (L353, S6) has no schema, action, or fixture.**
  Evidence: L353 says "Discount > 10% on premium requires R12+ approval." S6 (L752)
  says "advisor (R09) attempts to apply 15% discount … action throws; discount
  approval dialog shown; requires R12 confirmation." But there is no `discount`
  field on `InsuranceQuote` or `InsuranceLead`, no `applyDiscount` store action,
  no R12 gate in §7 RBAC table beyond a single line, no fixture data showing a
  discounted-quote scenario, and no entity for the approval record.
  Required action: Add a `discountPct: z.number().min(0).max(100).default(0)` and
  `discountApprovalRefId: z.string().optional()` to `InsuranceQuote`. Add an
  `applyDiscount(quoteId, pct, approverId?)` store action that throws
  `DiscountApprovalRequiredError` if `pct > 10` and no `approverId` of role R12+
  is supplied. Add at least one fixture quote with an approved 12% discount.

## Concerns (should fix)

- **C1: Commission GST formula has a rounding ambiguity that breaks finance
  reconciliation.**
  Evidence: §3.4 line 207, §10 line 520, L4. All say `round(commissionEarned ×
  18/100)` — but JS `Math.round` is round-half-to-even on negative numbers and
  round-half-up on positive (engine-dependent corner cases). Vehicles-spec L25 +
  §2.1 do not specify rounding mode either. For commission ledger reproducibility
  and Tally Prime sync, this needs to be locked.
  Suggested fix: Add to L4: "Rounding is half-up to nearest rupee (paisa truncated).
  Implementation: `Math.round(x * 100) / 100` is forbidden; use a shared
  `roundRupeeHalfUp(n)` helper in `@dms/finance-core`."

- **C2: Quote-token security is weak.**
  Evidence: L30 (L6) + §18 line 716 say tokens are ULIDs and "unpredictable enough
  for short-lived public links." ULIDs are NOT cryptographically random — the first
  48 bits are timestamp, the last 80 bits are random. An attacker who sees one
  token can narrow guesses for tokens issued in the same millisecond window.
  Suggested fix: Add to L6: "Token = ULID prefix (for ordering) + 128-bit
  cryptographic random suffix (`crypto.randomBytes(16).toString('base64url')`).
  Stored on the quote record. Public route `/insurance/quote/[token]` does
  constant-time comparison." Or simpler: just use `crypto.randomUUID()` or 256-bit
  random.

- **C3: PAN last-4 is captured but the spec says "PII: masked render" without
  specifying storage.**
  Evidence: §3.3 line 161: `panLast4: z.string().length(4)`. §9.5 (L510): "Never
  logged or concatenated." But this is the last 4 of a PAN number; collecting it
  is a PII collection event under DPDP and requires consent purpose +
  retention policy.
  Suggested fix: Add to §9: "`panLast4` collection is logged in `consent-log` with
  purpose `INSURANCE_QUOTE_GENERATION` and retention 7 years (matching IRDAI
  policy retention requirement). Last-4 is stored, not full PAN; never display in
  full anywhere."

- **C4: Cross-city access is asserted at the route level only.**
  Evidence: §7 line 484 "Cross-city lead access | R19+". But store actions like
  `advanceStage`, `closeLead`, `getCommissionLedger` do not in §6 specify
  city-scope enforcement. Per CLAUDE.md §8 every list query is city-scoped by
  default (RLS).
  Suggested fix: Add to §7: "All store actions enforce city-scope at the action
  layer; passing a `leadId` from a different city throws
  `CrossCityAccessDeniedError` unless caller is R19+."

- **C5: §6 store actions list lacks return-type contracts and error contracts.**
  Evidence: §6 (L433–464) lists action signatures but doesn't say which throw,
  which return null, what errors are typed.
  Suggested fix: Add an "Error contract" mini-table mapping each action to its
  specific error class (`VINNotFoundError`, `DiscountApprovalRequiredError`,
  `DltTemplateNotApprovedError`, `CrossCityAccessDeniedError`, etc.).

- **C6: Renewal feed sync has no rate-limit / batching guard.**
  Evidence: §5.3 (L380) calls `syncRenewalFeed()` on every mount of
  `/insurance/renewal-pipeline`. Over 18 months, with 25 historical policies +
  ongoing issuance, this can be hundreds of leads. No memoization or
  staleness-window mentioned.
  Suggested fix: Add to L7: "Sync runs at most once per 5-minute window per user
  session; subsequent mounts read cached state."

- **C7: `commissionPct` per-policy-type variation is flagged as OQ6 but
  blocks accurate ledger reporting now.**
  Evidence: OQ6 (L796) acknowledges this. But §3.4 stores `commissionEarned` as
  a single computed number per policy without recording the rate at which it was
  computed. If the rate later changes, history is lost.
  Suggested fix: Add `commissionPctApplied: z.number()` to `IssuedPolicy` so
  historical commission can always be re-derived.

## Traps (subtle issues that will bite later)

- **T1: `closed-won` immutability conflicts with claim history.**
  L394 says "Lead stage → `closed-won`, immutable." But §3.4 line 211 has
  `claimHistory: z.array(ClaimRecordSchema)` on `IssuedPolicy`. Claims happen
  AFTER policy issuance — so the policy entity is NOT immutable, even though the
  lead stage is. The spec should clarify: lead stage is immutable; policy
  `claimHistory` is append-only.

- **T2: Re-quote allowed at "Any → quoted" (L351) means a closed-lost lead can
  be reopened by re-quoting.** Either intended (good UX) or unintended (audit
  trail breaks). Either way, the state-machine table contradicts the prose at
  L350 ("`closed-won` — immutable after win") because L351 says "Any" — does
  "Any" include `closed-won`? Spec is ambiguous.

- **T3: `IssuedPolicy.docId` (L205) is a forward FK into docs-slice, but
  policy creation (§5.4) calls `docs-slice.addDocument(...)` and then references
  the returned docId.** This is a two-write transaction with no rollback path
  if the docs-slice write fails after the IssuedPolicy is created. Add a
  compensating-action note or wrap in a single store transaction.

- **T4: ShareableQuotePage is public (no auth) but renders customer PII via
  the lead chain.** §5.2 says "read-only comparison grid" — but if the quote
  embeds customer name, PAN last-4, or city, anyone with the token URL has
  access. Spec should explicitly enumerate what fields the public page renders
  and confirm zero PII (provider data + premium only).

- **T5: Audience builder `lastPurchaseDaysAgo` (L268) implies a join to vehicle
  sales history, but no contract is given for how that join works against
  vehicles-store / sales events.** Could trivially leak customers from other
  outlets if not city-scoped.

- **T6: Followup tick (`tickFollowups`) on every mount of `/insurance/leads`
  (L421) means concurrent tabs trigger duplicate followup actions.** Add a
  per-step idempotency key (e.g., `lastDispatchedStepIndex`) to prevent
  double-sends.

- **T7: Premium > ₹10L TCS question is NOT addressed.** §10 line 527 says "No
  TCS applies to commission receipts." This is correct for §206C(1H) on
  commission income. But §206C(1F) on motor vehicle SALE doesn't apply to
  insurance either. The relevant question is whether **insurance premium > ₹10L
  collected by BN as agent** triggers any TCS — and for an aggregator who only
  collects commission (not the premium itself, which goes provider→BN→customer
  via provider account), the answer is correctly no. Spec should say so
  explicitly to close the question. Premium for high-end vehicles can exceed
  ₹10L (annual premium on a ₹3 cr Porsche) so the demo will hit this case.

## Missing acceptance criteria

- **AC1**: Slice-level DLT enforcement test (B1) — every `sendTemplateMessage`
  path validated.
- **AC2**: Send-time opt-out check test (B2).
- **AC3**: Explicit consent capture flow test (B3) — lead created without
  consent is excluded from audiences.
- **AC4**: IRDAI fail-closed rendering test (B4) — provider with missing
  `irdaiRegNo` blocks share + render.
- **AC5**: AI-call mocked outcomes do NOT mutate lead stage in v1 (B5).
- **AC6**: Discount > 10% requires R12 — schema, action, dialog, fixture (B6).
- **AC7**: Commission rounding helper unit test (`roundRupeeHalfUp`) — fixed
  test vectors covering 0.5, 1.5, 2.5, negatives.
- **AC8**: Quote-token cryptographic randomness test (C2) — token entropy ≥
  128 bits, no timestamp leakage attack vector.
- **AC9**: City-scope test on every store action (C4).
- **AC10**: Public quote page renders zero customer PII (T4).
- **AC11**: Followup idempotency test — concurrent ticks do not double-send (T6).

## Open questions

- **Q1**: Is `discountPct` applied to `totalPremium` or to OD premium only?
  IRDAI restricts discounting on TP (statutory). Spec is silent.
- **Q2**: Does the public shareable-quote page need to render the IRDAI
  disclaimer in **English + the regional language** of the customer city
  (kn/mr/ta)? Doc 03 §10 may require it.
- **Q3**: Who is the "BN advisor" on the WhatsApp deeplink in §5.2? Per-outlet
  routing? Per-lead `assignedAdvisorId`? The spec just says "BN advisor."
- **Q4**: Is consent for `INSURANCE_MARKETING` separate from
  `INSURANCE_CALLING` (per OQ4)? If so, audience filter needs both flags.
- **Q5**: Does an opt-out from `INSURANCE_MARKETING` also opt out of
  renewal-reminder messages, or only promotional? Renewal reminders may qualify
  as transactional under DPDP, exempt from marketing-opt-out.
- **Q6**: Does BN need to file the IRDAI Web Aggregator Form 6 quarterly?
  (Re-raised from OQ1 — this affects the commission ledger schema if
  reportable fields like `policyHolderPan`, `policyHolderName` need
  separate retention.)
- **Q7**: For renewals where the previous policy was issued by a different
  insurer, is BN compensated at "new business" commission rate or "renewal"
  rate? Affects `commissionPctApplied` (C7).

## Per-hat findings

### Security (DPDP, RBAC, PII boundaries)

- **DPDP**: B2 (send-time opt-out), B3 (explicit consent capture), C3 (PAN
  last-4 retention) are all DPDP-blocking. Per Doc 03 §10 + DPDP Act 2023
  consent withdrawal must be honored "without undue delay" — that means
  send-time, not snapshot-time.
- **RBAC**: §7 RBAC table covers most actions. C4 (city-scope at store layer)
  is the gap. R12 discount gate is asserted but not implemented (B6). R22/R19
  commission-ledger gate is correctly noted at store layer (§18 L718) — good.
- **PII**:
  - `panLast4` on `InsuranceLead` is rendered masked (good, §9.5) but storage
    classification is missing (C3).
  - `customerCity` on `InsuranceLead` (L158) is collected but no consent
    purpose mapping.
  - Public quote page PII risk (T4) needs explicit exclusion list.
  - `transcript` on `AICallLog` (§3.7) is unredacted free text. In production
    this contains customer name, financial details, possibly Aadhaar. Add
    redaction policy + storage classification.
- **Token security**: C2 (ULIDs not cryptographic).
- **CSRF / server-action boundary**: §18 L719 says WhatsApp + Voice-AI route
  through server actions — good. But no CSRF token requirement is mentioned
  for the public `/insurance/quote/[token]` POST endpoints (PDF export
  generation). Probably fine since it's GET-only, but worth a one-liner.

### Finance (IRDAI commission, GST per L25, TCS, GL)

- **Commission GST formula**: The spec uses additive `× 18/100` consistently
  (L4, §3.4 line 207, §10 line 520) which matches PLAN-VEHICLES-003 L25 ("**additive**,
  tax-exclusive"). **CORRECT.** Note that vehicles spec test S-V3-16 (line 738)
  appears to use `× 18/118` for `commissionGst` — that's a vehicles-spec bug
  contradicting its own L25, but insurance spec is internally consistent and
  correct on the formula.
- **TCS stance**: §10 line 527 says no TCS on commission receipts (correct per
  §206C(1H) — TCS on goods sales, not service income). But T7: spec doesn't
  address whether premium > ₹10L collected through BN triggers TCS — the answer
  is no (BN doesn't sell the policy, the insurer does), but should be
  explicit.
- **Rounding**: C1. Round-half-up must be locked with a shared helper.
- **GL mapping**: §10 commission ledger is presented but no GL account mapping
  is given. Per CLAUDE.md §1, BN runs thin GL in DMS + Tally Prime statutory.
  At minimum, the ledger row should map to a GL account code (e.g.,
  `Commission Income — Insurance` and `GST Output Tax — Services`). This is
  the kind of thing that bites at month-end. Not a blocker but should land
  before P5 ships.
- **Margin scheme not relevant**: Insurance commission is service income, NOT
  a margin-scheme transaction. Spec correctly does not invoke margin scheme.
- **E-invoicing**: Commission invoices to insurers are B2B and likely above
  threshold. Spec is silent on IRN/QR generation per Doc 13 §3. P5
  acceptance criteria should include "commission invoice generates IRN +
  QR via IRP integration."
- **Finance reviewer sign-off requirement (CLAUDE.md §6) is acknowledged in
  §21 line 810** ("Commission formula reviewed by finance reviewer") — good.

### QA (test plan minimums, scenarios, edge cases)

- **§19 has 12 GPA scenarios.** Strong coverage of happy paths. Missing:
  - Phase-by-phase test minimums table (vehicles-spec §758 has a per-phase
    table — insurance has none). Add: P1 = X unit + Y integration; P2 = …;
    etc.
  - Idempotency tests: S4 (renewal feed) doesn't test what happens on a second
    sync — should not create duplicate leads.
  - Boundary tests:
    - Token expiry at exactly 7 days (vs 7 days + 1 second).
    - NCB at 0 years and 5+ years (slab boundaries).
    - `commissionPct: 0` (does the schema allow it? Vehicles trap #2).
  - Negative-path tests: invalid VIN, unknown providerId, expired DLT
    template, opt-out customer, partial fixture data.
  - Cross-module test: Insurance lead `closed-won` writes to docs-slice
    (S5 covers half — also test that the docs-slice document `expiresAt`
    correctly populates the renewal feed 60 days before).
  - Visual tests: Storybook for QuoteCard with missing IRDAI fields (renders
    fail-closed per B4).
  - Performance: §17 says <10ms for 10 providers but no test harness for it.
  - Accessibility: §16 lists requirements but no test scenario verifies
    keyboard nav on Kanban or screen-reader announcement of stage changes.
- **Mocked-data edge cases (CLAUDE.md §10 DoD §5)**: spec satisfies happy
  path + 2 edge cases nominally (closed-lost, opt-out) but should explicitly
  call out: provider-with-missing-CSR (B4 fixture), opted-out customer in
  audience snapshot (B2), 0-NCB lead, 5+ year NCB lead.
- **Specs S1–S12 don't cite line numbers in the spec** — minor — makes
  traceability harder. Add a "covers L#" note per scenario.

## Suggested L-decisions to add

- **L21**: `sendTemplateMessage` enforces `template.status === 'APPROVED'` AND
  non-null `dltTemplateId` at the dispatch boundary; throws
  `DltTemplateNotApprovedError` otherwise. (B1)
- **L22**: Opt-out checked at audience-build AND at send-time. Customers in
  `insuranceOptOuts` at send time are skipped and counted in `stats.optedOut`.
  (B2)
- **L23**: `marketingConsentGiven` defaults to `false` on lead creation. An
  explicit consent step (UI + consent-log purpose `INSURANCE_MARKETING` + ISO
  timestamp) is required before audience inclusion. (B3)
- **L24**: QuoteCard / ShareableQuotePage fail-closed if `provider.irdaiRegNo`
  or `provider.claimSettlementRatio` is missing/empty. PDF export carries
  IRDAI disclaimer in footer; renderer throws if disclaimer string is empty.
  (B4)
- **L25**: In v1 (`isMocked: true`), AI-call outcomes are display-only and do
  NOT auto-mutate lead stage. Auto-close-lost on `do-not-call` is gated on
  production wiring (`isMocked === false`) which requires OQ4 (DPDP
  `INSURANCE_CALLING` purpose) AND OQ5 (TRAI auto-dialler registration)
  resolved. (B5)
- **L26**: Discount > 10% requires R12+ approval. Schema:
  `quote.discountPct`, `quote.discountApprovalRefId`. Action: `applyDiscount`
  throws `DiscountApprovalRequiredError` for `pct > 10` without R12 approver.
  (B6)
- **L27**: All commission rounding is half-up to nearest rupee via shared
  `roundRupeeHalfUp` helper in `@dms/finance-core`. (C1)
- **L28**: Quote tokens use 128-bit cryptographic random (not just ULID
  randomness); constant-time comparison on lookup. (C2)
- **L29**: All store actions enforce city-scope at the action layer; cross-
  city `leadId` throws `CrossCityAccessDeniedError` unless caller is R19+. (C4)
- **L30**: `IssuedPolicy.commissionPctApplied` stored at issuance to preserve
  historical rate for audit re-derivation. (C7)
- **L31**: `insuranceStore.syncRenewalFeed()` debounced — runs at most once
  per 5-minute window per user session. (C6)
- **L32**: Followup ticks are idempotent via `lastDispatchedStepIndex` per
  lead; concurrent ticks do not double-send. (T6)
- **L33**: Public `/insurance/quote/[token]` page renders provider data +
  premiums + IDV only; ZERO customer PII. Customer name, PAN, phone, address
  are explicitly excluded. (T4)
- **L34**: Premium > ₹10L does NOT trigger TCS — BN is an aggregator
  collecting commission (service income), not selling the policy. §206C(1F)
  applies only to motor-vehicle sale value, not insurance premium. (T7)

---

*Review version: 1.0 — 2026-04-28. Review status: needs-revision. 6 blockers,
7 concerns, 7 traps, 11 missing ACs, 7 open questions, 14 new L-decisions
suggested. Re-review required after blocker fixes land.*
