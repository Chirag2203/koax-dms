# SPEC-SALES-001 — Security + DPDP review

**Reviewer:** security-reviewer
**Date:** 2026-05-07
**Spec under review:** `specs/modules/sales/01-staff-sales-module.md` v0.4 (`status: in-build`)
**Lens:** Authentication / authorization, PII handling, DPDP Act 2023 compliance, money-flow security, race conditions, force-override audit completeness, semantic state-machine clarity.

---

## Concerns

### 1. [P0] DPDP consent at lead capture is undocumented in the spec
**§5 (Lead capture)** lists fields (Client Name, Phone, Email, Source, …) but specifies no consent text, no purpose statement, no DPDP grade for the form, and no link to a privacy policy. CLAUDE.md §9 mandates that "every PII collection point shows consent text + purpose"; Doc 06 §DPDP requires §6 explicit consent for §11 data-principal-rights to be enforceable. The audit (AUDIT-SALES-2026-05-07 §4 #7, §5 row 5) flagged this as a P0 *code* gap; the *spec* gap is the upstream cause — code that has no consent UI is honoring the spec exactly.
**Recommendation:** Mint **L_S-DPDP-1** in §12 — "Lead capture form MUST display purpose statement (BN Automobiles will store and process this contact information for sales follow-up) AND a checkbox confirming consent before Submit enables. Consent record (timestamp + actor + form-version) persists on the Deal as `consentBlock`." Add scenario `S-S-CONSENT-1` to §6.

### 2. [P0] PAN + Aadhaar handling completely undocumented
The spec mentions §6 Panel B "Compliance & KYC: Identity Verification (Aadhaar): Verified / Financial Records (PAN): Verified" — but says nothing about (a) where PAN/Aadhaar are captured, (b) whether they are stored at rest, (c) what the masking rule is on display, (d) which roles can ever view unmasked. CLAUDE.md §9 explicitly forbids storing full Aadhaar and mandates last-4-only display. PAN is a high-sensitivity tax-PII used for TCS > ₹10L (§9 — referenced only in §15 TCS note, never specified as captured/displayed).
**Recommendation:** Mint **L_S-PII-1** — "PAN: store full ciphertext, display last-4 by default, full reveal gated R12+ + audit event. Aadhaar: store last-4 only, never full. Sub-KUA verification reference is the source of truth, not the number itself." Add a §16 "PII handling" subsection describing capture flow + masking + audit. Bump `pii_sensitivity: medium → high`.

### 3. [P1] Customer phone masking rule is partial
§6 Panel 0 says "Mask phone for R05 by default (show last 4 only). R10+ can click eye icon to reveal full." However: (a) §4.2 deal cards show `+91 98··· ··341` to all roles unconditionally — no masking gate; (b) the WhatsApp deeplink in §6.3 sends to `wa.me/91{phone}` which means the dialog construction code MUST de-mask before encoding the URL — the spec does not describe whether reveal is logged; (c) the audit (§7 row 3) flagged that `ContactDetailsPanel`'s threshold uses fragile `parseInt(role.replace('R',''))` not `hasRank`.
**Recommendation:** Mint **L_S-PII-2** — "Every full-phone reveal (eye-toggle, WhatsApp/tel deeplink construction) emits a `pii_reveal` audit event with actor + dealId + field='phone'. Reveal threshold is centrally `hasRank('R10')`, never inline string-parsing." Codify deal-card masking in §4.2 explicitly.

### 4. [P1] `forceReserveOverride` audit payload is incomplete
§13 says the audit event captures `reason`, `releasedDealIds`, `actorRole`. Code at `sales-deals-store.ts:478–489` confirms this. **Missing**:
- the **released SA's user-id** (so the displaced SA can be retrospectively identified) — only the `dealId` is captured, requiring a join to figure out who lost their reservation;
- the **timestamp the original reservation was placed** (for "how long was it held before override?" forensics);
- whether the **customer associated with the released reservation has been notified** (an audit trail without a notification channel is half a control — the displaced customer learns by accident);
- whether any **token / signature** existed on the released reservation (if yes, refund obligation is implicit and currently invisible).
**Recommendation:** Mint **L_S-RES-2** — "Override audit event payload MUST include `releasedDealCustomerIds`, `releasedAssignedToEmployeeIds`, `releasedReservationCreatedAt[]`, `releasedHadToken: boolean[]`. Triggering an override schedules a notification to (a) the displaced SA via in-app notification, (b) the displaced customer via DLT-SMS template `RESERVATION_RELEASED`. Notification dispatch failure logs but does not block the override (override is irreversible after audit emission)."

### 5. [P1] Refund flow does not address gateway-token / payment-record retention
§15 covers refund metadata (category, reason, amount, actor) but is silent on (a) Razorpay (or other gateway) reference IDs — are they retained on the deal? encrypted? viewable by whom? (b) bank account / UPI VPA collected for the refund payout — this is high-PII (account number, IFSC), the spec does not say where it lives. The audit event payload `{category, refundedAmount, reasonLength, priorStage}` (verified in `sales-deals-store.ts:594–599`) is privacy-clean for the *reason* text but says nothing about payout-channel data.
**Recommendation:** Mint **L_S-REFUND-2** — "Refund payout-channel block is a separate aggregate (`refundPayout: { method, last4OfAccountOrUpiHandle, gatewayRef, capturedByEmployeeId, capturedAt }`). Display masked. Full reveal R12+ + `pii_reveal` audit. Gateway tokens never appear in audit payloads or logs."

### 6. [P1] Lost-reason free-text DPDP grading missing
§14 captures `lostReason.freeText`. The audit event correctly emits only `freeTextLength` (verified `sales-deals-store.ts:537`) — good. But the *stored* `freeText` on the Deal is unbounded text that frequently contains third-party PII (competitor name, customer's family situation, job-loss disclosure leading to finance fall-through). The spec does not (a) cap the field length, (b) grade it for DPDP, (c) describe retention when the customer requests erasure under DPDP §11, (d) describe role-based visibility.
**Recommendation:** Mint **L_S-LOST-2** — "lostReason.freeText: cap 500 chars, `pii_sensitivity: medium` field-level, default visible to deal-owner + R10+. R05 viewing another SA's deal sees only the category. On §11 erasure request the freeText is anonymized to the literal string `[redacted-on-request]` while the category and the audit event survive (CPA-2019 retention carve-out)."

### 7. [P1] DPDP §11 data-principal rights — no spec coverage
The spec does not describe (a) how a DSAR ("give me all my deals") is answered — `selectDealsByCustomerId` does not exist in §7 store contract; (b) how erasure requests propagate — Sales records likely have CPA-2019 + IT Act + GST 7-year retention overrides, but the *carve-out* is undocumented; (c) how the `cust-store` consent record is cited from a Deal (the spec re-asks for PII at lead capture instead of lifting from an existing customer record). Without these the module cannot answer a §11 request.
**Recommendation:** Mint **L_S-DSAR-1** — "Every Deal carries `customerId` keyed to cust-store. Sales never originates new customer PII; lead capture either (a) selects an existing customer or (b) creates one in cust-store and references it. DSAR answered via `selectDealsByCustomerId` (add to §7). Erasure request: PII fields are anonymized in-place; numeric/categorical financial data + audit events retained for 7 years per CPA-2019/GST/IT-Act, with an `anonymizedAt` marker." Add §17 "Data-principal rights".

### 8. [P1] Cross-outlet RLS rule absent for Sales
CLAUDE.md §8 mandates "every list query is city-scoped by default; cross-city access requires R19+, R22+, R24". §4.1 Kanban filter has an "outlet filter" *control* but the spec never says the **default scope** for R05 / R09 is own-outlet, nor that the dropdown's options are limited by role. A BLR Sales Associate must not see MUM deals.
**Recommendation:** Mint **L_S-RLS-1** — "Default `selectDealsForUser(actor)` returns only deals where `outlet === actor.outlet`. R19+ may pass `crossOutlet: true`. Outlet filter dropdown options scoped by role. Reject any list query that omits outlet scope at the store layer."

### 9. [P1] Server-action / route-handler hardening unspecified
§9 declares MSW handlers — fine for mock phase. But the spec is silent on: (a) which routes will become server actions (quote PDF, invoice PDF, IRN generation, gateway webhook handling); (b) the auth/authorization model on those routes (cookie-session? JWT? signed-server-action token?); (c) whether stage-transition mutations will be server-validated (currently the Zustand store enforces R12+ for refund, but client-side enforcement is advisory at best — the real gate must be server-side).
**Recommendation:** Mint **L_S-SRV-1** — "Every mutation in §9 is mirrored by a server route handler that re-validates actor role + outlet scope + stage guard server-side. Client-side checks are UX hints, not security boundaries. Backend-phase task: harden similarly to L12 (intake)."

### 10. [P2] Reservation-guard TOCTOU
§13 and code (`sales-deals-store.ts:343–369`) implement check-then-write atop Zustand. Mock-phase is single-threaded so safe. Backend-phase needs a DB unique-partial-index on `(vehicle_vin) WHERE stage='reserved' AND (reservation_expires_at IS NULL OR reservation_expires_at > now())` plus row-lock during stage transition.
**Recommendation:** Add a §13 footnote: "v1.5 backend: enforce uniqueness via DB partial index; the application-level guard remains a fast-path UX check."

### 11. [P2] Invoice / Quote PDF tamper-evidence
The audit (§4 #6) noted that the `QUOTED` state and Quote PDF generation are absent. The spec also has no equivalent of intake L16's "historical-snapshot rule" — once a deal reaches DELIVERED the printed invoice should be immutable + hash-pinned (same-day mutation must be detectable). Without this, an SA could regenerate an invoice with a different price after sale.
**Recommendation:** Mint **L_S-DOC-1 (P3-deferrable)** — "Invoice PDFs at DELIVERED are SHA-256 pinned, hash stored on Deal. Re-generation produces a new artifact with a `supersedes` reference; the original is never overwritten. Mirror intake L16."

### 12. [P2] Inline `hasRank` inside JSX in `so-complete-dialog.tsx`
The audit (§7 row 2) flagged a `{canWaiveTcs && (...)}` in JSX driven by `hasRank`, which violates SPEC-ARCH-UI-001 L49 / CLAUDE.md §17 "no inline hasRank in JSX". The spec under review does not mention TCS waiver gating at all (TCS note at §15 covers refund-side only) — so the implementation is undocumented. Either gate via `<Gate>` and document, or document why this case is exempt.
**Recommendation:** Add to §15 — "TCS-waiver CTA in `SoCompleteDialog` is gated R12+ via `<Gate role={['R12','R19','R22','R24']}>`; reason capture (≥10 chars) required; emits `tcs_waived` audit event with `reasonLength` only."

### 13. [P2] Semantic clarity on `lost` vs `refunded` vs `cancelled` vs "void"
§14 is for pre-sale-order lost; §15 is for post-sale-order refund. Neither covers (a) customer cancels the *reservation* before SO (token returned, no refund-flow yet — currently `markReservationExpired` only handles auto-expiry); (b) SA voids a typo'd deal that never had a real customer (data hygiene). Without a clean enumeration, SAs will misuse `markDealLost` for non-loss purposes, polluting win-rate analytics.
**Recommendation:** Add §14.1 "Reservation cancellation (manual)" — `cancelReservation(dealId, { reason, refundTokenAmount })` — distinct from `markDealLost`. Add §14.2 "Void (admin only, R19+)" — strikes the deal from analytics but retains audit row.

### 14. [P3] "Custom Message" path in WhatsApp dialog (§6.3) bypasses DLT discipline
CLAUDE.md §9: "every SMS template must have a DLT template ID. No free-text SMS sends." WhatsApp via wa.me deeplink is technically client-side and not a templated send — but logging it as `whatsapp-sent` interaction with arbitrary body may legally count as marketing once persisted. Worth flagging in spec.
**Recommendation:** Add to §6.3 — "Custom Message path emits an interaction with `templateId: 'CUSTOM_FREEFORM'` and a P3 deferred item to confirm regulatory grade with counsel."

### 15. [P3] AI Call dialog (§6.4) consent text shown only in info banner
The banner reads "AI calls are recorded and summarized. The customer will be informed at the start of the call." This places the consent obligation on the AI agent at call-time — fine for the *customer* side, but says nothing about (a) how the AI's TTS opening line is approved, (b) whether the customer's express opt-in is captured before recording starts (Indian Telegraph Rules + DPDP), (c) where the recording itself is stored and for how long.
**Recommendation:** Add §6.4 footnote "Recording retention + consent capture script will be specified in SPEC-AI-CALL-001 (P3)."

---

## Blockers

These prevent `status: in-build → approved`:

1. **Concern #1 (P0) — DPDP consent at lead capture undocumented.** No L-tag, no scenario, no AC. Module cannot pass §17 production checklist or DoD §10.
2. **Concern #2 (P0) — PAN + Aadhaar handling undocumented.** Spec is silent on a regulated PII surface that the §6 sidebar visibly displays. The `pii_sensitivity` frontmatter value of `medium` is incorrect — should be `high` once PAN is in scope.
3. **Concern #4 (P1) — `forceReserveOverride` audit incomplete.** Audit-trail-without-notification is not a sufficient control for displacing another SA's customer reservation; minimum bar before promotion is the L_S-RES-2 fields + a notification scheduling row.
4. **Concern #7 (P1) — DPDP §11 data-principal rights uncovered.** A spec at `pii_sensitivity ≥ medium` that does not describe DSAR / erasure cannot be approved.
5. **Concern #8 (P1) — Cross-outlet RLS rule absent.** Without an L-tag, the implementation will drift; CLAUDE.md §8 is non-negotiable.

---

## Open questions

1. Is there an existing customer-level consent record (`cust-store.consentBlock`) that the lead-capture form can reference instead of re-collecting? (Resolves Concern #1's storage strategy.)
2. Does Sub-KUA Aadhaar verification return a verification reference token we can store *instead of* any form of Aadhaar number? (Resolves Concern #2's storage shape.)
3. What is the agreed retention period for `lostReason.freeText` after a §11 erasure request — anonymize-in-place or delete-and-keep-category? (Concern #6.)
4. Are reservation tokens (₹1L+ deposits) held by BN or by a payment gateway escrow? Determines whether `forceReserveOverride` triggers an automatic refund obligation. (Concern #4 + #5.)
5. Is `customerId` already a first-class field on `Deal` in `cust-store`, or do we need a migration? (Concern #7.)
6. Should `cancelReservation` (proposed §14.1) be a separate state-machine transition or a parameterized variant of `markDealLost`? (Concern #13.)

---

## Signoff

signed-off: no
acknowledged-by-integrator: yes

**Integrator note (2026-05-07, v0.5):** All 5 P0/P1 security blockers acknowledged. Resolutions: blocker #1 → L_S-DPDP-1 + DEF-SALES-DPDP-1 (P1; consent block on Deal, hard-block on no-consent, cust-store reuse). Blocker #2 → L_S-PII-1 + frontmatter `pii_sensitivity: high` + new §16 PII handling + DEF-SALES-PII-1. Blocker #3 → L_S-RES-2 + DEF-SALES-RES-2 (extended audit payload, in-app + DLT-SMS notifications, token-refund task on `releasedHadToken`). Blocker #4 → L_S-DSAR-1 + new §17 Data-principal rights + DEF-SALES-DSAR-1 (`selectDealsByCustomerId`, R23 gate, anonymize-in-place). Blocker #5 → L_S-RLS-1 + DEF-SALES-RLS-1 (outlet-scoped default, store-layer reject on omitted scope). Concerns #3, #6, #9, #12 also closed via L_S-PII-2, L_S-LOST-2, L_S-SRV-1, §15.1 TCS-waiver Gate. Concerns #11, #13, #14, #15 captured as DEF-SALES-DOC-1, §14.1+§14.2, DEF-SALES-DLT-CUSTOM-1, DEF-SALES-AI-CALL-1. Status held at `in-review` pending P1 implementation; not promoted to `approved`.

**Promotion gate:** 5 blockers (2× P0 + 3× P1) must be resolved via L-tags or scenarios before `in-build → approved`. Recommend the integrator mints **L_S-DPDP-1, L_S-PII-1, L_S-PII-2, L_S-RES-2, L_S-REFUND-2, L_S-LOST-2, L_S-DSAR-1, L_S-RLS-1, L_S-SRV-1** (9 new locked decisions) and adds §16 "PII handling" + §17 "Data-principal rights" before re-requesting signoff. Frontmatter `pii_sensitivity` should bump `medium → high`.
