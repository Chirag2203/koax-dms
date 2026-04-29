---
spec_id: SPEC-INSURANCE-001
domain: insurance
status: approved
risk_level: medium
pii_sensitivity: medium
flags: [insurance-module, whatsapp-marketing, ai-calling, feat_insurance_ai_calling]
owners: [orchestrator]
depends_on: [SPEC-VEHICLES-001, PLAN-VEHICLES-003, SPEC-CUSTOMERS-001]
---

# Insurance — Full-cycle insurance module (staff-web)

BN Automobiles is an IRDAI-registered motor insurance aggregator. This module
covers the full lifecycle: multi-provider catalog → comparison quote → quote
share → close → policy issuance → renewal pipeline → WhatsApp marketing →
AI-assisted calling → auto-followup sequences → policy history per VIN + customer.

---

## 0. Locked decisions

| # | Decision | Rationale / Source |
|---|---|---|
| L1 | **BN is aggregator, not insurer.** No direct policy issuance. Every policy is issued by the provider; BN captures the policy number + document. IRDAI aggregator rules. | IRDAI Web Aggregator Guidelines 2017 |
| L2 | **IRDAI reg no + CSR shown on every quote card.** Mandatory disclosure per IRDAI guidelines; non-negotiable UI constraint. | IRDAI Web Aggregator Guidelines §8 |
| L3 | **Commission disclosure is required.** Commission % shown in the commission ledger (R22 view). Per-quote commission not shown to customer. | Doc 06 L25, IRDAI aggregator disclosure norms |
| L4 | **Commission GST is additive (18%).** `commissionGst = round(commissionEarned × 18/100)`. Matches PLAN-VEHICLES-003 L25 for service-fee GST treatment. | Doc 06 §GST — service fees |
| L5 | **IDV formula per provider.** Each provider has an `idvMultiplier` applied to ex-showroom value. No single DMS formula — IDV is provider-computed and stored as a quote field. | IRDAI Motor Insurance guidelines |
| L6 | **Quote token expiry = 7 days.** Server-side check; expired tokens render a static "This quote has expired" page. Token is a ULID stored in the quote record. | Security best practice; DPDP purpose limitation |
| L7 | **Renewal feed auto-populated from Documents module.** Any VIN with an active `insurance` document where `expiresAt < 60 days from today` is automatically entered in the renewal Kanban at `due-soon` stage. | PLAN-VEHICLES-003 L10 (insurance is a doc category) |
| L8 | **Kanban drag-drop is staff-web only (R09+).** Customer cannot move stages. Moving to `closed-won` triggers a new policy document write back to docs-slice. | Doc 14 RBAC |
| L9 | **WhatsApp sends use DLT template IDs only.** Free-text WhatsApp is banned. Each template stores `dltTemplateId`. Template status ∈ {`DRAFT`, `PENDING_DLT`, `APPROVED`, `REJECTED`}. | Doc 09 §DLT, CLAUDE.md §9 |
| L10 | **DPDP explicit consent before marketing.** Insurance marketing adds a purpose `INSURANCE_MARKETING` to the consent log. Opt-out is honored immediately; opted-out customers are excluded from audience builder queries. | DPDP Act 2023; Doc 03 §10 |
| L11 | **AI calling is stubbed in v1.** Voice-AI integration contract defined (Doc 13 §voice-ai); v1 shows mocked transcripts with real UI. Production wiring is P4 follow-up. | Doc 13 integration contract |
| L12 | **Insurance leads reference VINs from `vehicles.ts` only.** No orphan VINs. Follows PLAN-VEHICLES-003 L45 single-source-of-truth rule. | PLAN-VEHICLES-003 L45 |
| L13 | **DLT enforcement is slice-level fail-closed.** `sendTemplateMessage` validates `template.status === 'APPROVED'` at dispatch time, NOT at campaign-builder time. Throws `TemplateNotApprovedError` on mismatch. Invariant: every `sendTemplateMessage` call MUST resolve a `WhatsAppTemplate` whose `status === 'APPROVED'` AND `dltTemplateId` is non-null inside the BSP wrapper before any message is enqueued. | CLAUDE.md §9; Doc 09 §DLT; B1 review fix |
| L14 | **Opt-out check is re-evaluated at `sendTemplateMessage` boundary.** The audience snapshot from build-time is filtered against the live opt-out registry before each batch send. Customers in `insuranceOptOuts` at send time are skipped and counted in `stats.optedOut`, not `stats.failed`. DPDP withdrawal honored within minutes. | DPDP Act 2023; Doc 03 §10; B2 review fix |
| L15 | **Marketing consent defaults false; lead creation succeeds without it but lead is excluded from all marketing audiences.** Consent capture is explicit opt-in per DPDP §6. On lead creation, `marketingConsentGiven` defaults to `false`. A separate explicit consent step (checkbox + ISO timestamp + purpose `INSURANCE_MARKETING` written to consent-log) is required before the customer enters any audience. Consent UI text is owned by i18n key `insurance.consent.marketingPurpose` and reviewed by legal before P3 ships. | DPDP Act 2023 §6; Doc 03 §10; B3 review fix |
| L16 | **IRDAI disclosure is fail-closed at the component level.** `QuoteCard` returns null + `console.error` if `irdaiRegNo` or `claimSettlementRatio` are missing. Compile-time enforced via `QuoteCardPropsSchema` (Zod). PDF export carries IRDAI disclaimer in footer; rendering without the disclaimer is forbidden. | IRDAI Web Aggregator Guidelines 2017 §8; B4 review fix |
| L17 | **AI calling is display-only in P3 (no business-state mutation).** P3 renders mock transcripts as static cards with no state mutation and no auto-close. P4 dispatch is behind feature flag `feat_insurance_ai_calling` that is OFF until OQ4 (DPDP `INSURANCE_CALLING` consent) and OQ5 (TRAI auto-dialler registration) are both resolved. OQ4 and OQ5 are P4 hard-prerequisites. | Doc 13 §voice-ai; DPDP Act 2023; TRAI regulations; B5 review fix |
| L18 | **Discount > 10% requires R12+ approval.** Slice-level guard: `applyDiscount(quoteId, pct, actor)` throws `R12RequiredError` if `pct > 10` and `actor.role` is below R12. Schema: `Quote.discountPct: z.number().optional()`. Fixture-tested. | Doc 14 §R12; B6 review fix |
| L19 | **Comparison engine runs client-side in v1.** Input = vehicle + customer params. Output = sorted quote array derived from provider catalog fixture. No third-party API call in v1. | MVP philosophy (CLAUDE.md §4) |
| L20 | **Premium addons are a per-provider catalog, not a DMS enum.** Each provider's `addonCatalog` lists available addons with codes + labels. Quote carries `selectedAddons: AddonCode[]`. | Provider-specific availability varies |
| L21 | **Commission ledger is R22 (CFO) + R19 (GM) gated only.** R09/R10 see commission % on their own closed deals only. | Doc 14 §R22 |
| L22 | **`InsuranceLead` is the aggregate root.** Each lead has a VIN (→ vehicles-store), a customerId (→ customers-store), a quote history, a call log, a followup sequence state, and a Kanban stage. | Domain modelling |
| L23 | **Policy document write-back uses docs-slice.** Closing a lead as `closed-won` calls `docs-slice.addDocument({ category: 'insurance', ... })`. Avoids duplication of document state. | PLAN-VEHICLES-003 L9/L10 |
| L24 | **No 3D or heavy canvas libs.** All charts/visuals use SVG or CSS. Matches monorepo constraint (CLAUDE.md §12). | CLAUDE.md §12 |
| L25 | **Comparison sort default = total premium ascending.** User can re-sort by CSR or network garage count. Sort is pure client-side on quote array. | UX best practice |
| L26 | **Auto-followup sequence state is per-lead.** Each `InsuranceLead` carries a `followupSequenceState` object with step index + nextDueAt + lastOutcome. Sequence template is per-Kanban-stage. | Domain modelling |

---

## 1. Summary

This module replaces manual insurance tracking with a structured pipeline for BN's motor insurance aggregation business. It connects the vehicle and customer domains (SPEC-VEHICLES-001, SPEC-CUSTOMERS-001) to a new `insurance` domain and adds three cross-cutting capabilities: a WhatsApp marketing engine (Doc 13 §WhatsApp BSP), AI-assisted calling (Doc 13 §voice-ai), and auto-followup sequences.

Phase plan:

| Phase | Scope | Estimated complexity |
|---|---|---|
| **P1** | Provider catalog + comparison engine + quote share | Medium |
| **P2** | Renewal pipeline (Kanban) + auto-feed from Documents | Medium |
| **P3** | WhatsApp marketing — templates, audience builder, campaign launcher + AI calling **display-only** (static mock transcripts, no state mutation, no auto-close) | High |
| **P4** | AI auto-calling real dispatch behind feature flag `feat_insurance_ai_calling` (OFF by default; **hard prerequisites**: OQ4 DPDP `INSURANCE_CALLING` consent resolved + OQ5 TRAI auto-dialler registration resolved) + auto-followup sequences | High |
| **P5** | Quote/policy history views + commission ledger | Medium |

---

## 2. Route surface

| Route | Purpose | Gate |
|---|---|---|
| `/insurance` | Insurance hub — overview tiles, pipeline summary | R09+ |
| `/insurance/leads` | Lead index (table + Kanban toggle) | R09+ city, R19+ cross-city |
| `/insurance/leads/[leadId]` | Lead detail — quote history, call log, followup state | R09+ same city |
| `/insurance/leads/import` | Bulk lead intake — CSV/XLSX upload, column mapping, dedupe preview, batch create | R10+ |
| `/insurance/quote/new` | Comparison engine — input form (customer + vehicle pickers, extended fields) + results grid. Shipped name; spec originally referred to this as `/insurance/compare`. | R09+ |
| `/insurance/quote/[id]` | Quote preview / shareable page. v1 lives under `(shell)`; public read-only at non-auth route is P5 follow-up. | R09+ (P5: public via token) |
| `/insurance/policies` | Issued policy index per outlet (P5 — currently surfaced as VIN documents) | R09+ |
| `/insurance/policies/[policyId]` | Policy detail — renewal trail, claims, addons (P5) | R09+ |
| `/insurance/renewal-pipeline` | Kanban for renewal leads | R09+ city, R10+ can close |
| `/insurance/marketing/whatsapp` | WhatsApp template mgmt + campaign launcher | R10+ |
| `/insurance/marketing/whatsapp/[campaignId]` | Campaign detail + delivery tracking | R10+ |
| `/insurance/marketing/ai-calls` | AI call feed (transcripts, outcomes) | R10+ |
| `/insurance/marketing/ai-calls/new` | AI call dispatch — audience selection + script preview (feature-flag-gated by `feat_insurance_ai_calling` per L17) | R10+ |
| `/insurance/audit` | Append-only audit log of insurance state mutations (lead transitions, quote shares, campaign sends, policy issuance). Backed by `InsuranceAuditEvent` (kinds: see §3.x). | R12+ read |
| `/insurance/commissions` | Commission ledger (shipped path; spec originally said `/insurance/commission`) | R22+, R19 read |

Sidebar entry: insert "Insurance" **after Service** in `staff-sidebar.tsx`. Icon: `ShieldCheck` (lucide-react). Visible to R09+.

All routes are `'use client'` client components. Store reads happen in the client layer. Consistent with vehicles + service module patterns.

---

## 3. Entities

File: `packages/types/src/domain/insurance.ts` (≤ 250 LoC net add).

### 3.1 `InsuranceProvider`

```ts
export const InsuranceProviderSchema = z.object({
  id: z.string(),                        // slug e.g. 'bajaj-allianz'
  name: z.string(),
  logoUrl: z.string().url(),
  irdaiRegNo: z.string(),                // IRDAI registration number — displayed on every quote
  claimSettlementRatio: z.number().min(0).max(100), // % CSR (last FY)
  networkGaragesCount: z.number().int(),
  idvMultiplier: z.number(),             // multiplied against ex-showroom to compute IDV
  ncbSlabs: z.array(z.object({           // No Claim Bonus slabs (0yr, 1yr, 2yr, 3yr, 4yr, 5yr+)
    yearsNoClaim: z.number().int(),
    discountPct: z.number(),
  })),
  addonCatalog: z.array(AddonDefinitionSchema),
  commissionPct: z.number(),             // BN commission % — R22/R19 only
  active: z.boolean(),
});

export const AddonDefinitionSchema = z.object({
  code: z.string(),    // 'zero-dep' | 'engine-protect' | 'rsa' | 'rti' | 'key-replacement'
                       // | 'consumables' | 'ncb-protect' | 'tyre-cover'
  label: z.string(),
  premiumBasis: z.enum(['flat', 'idv-pct', 'vehicle-age-slab']),
  available: z.boolean(),
});
```

### 3.2 `InsuranceQuote`

```ts
export const InsuranceQuoteSchema = z.object({
  quoteId: z.string().ulid(),
  leadId: z.string().ulid(),
  providerId: z.string(),
  ownDamagePremium: z.number(),
  thirdPartyPremium: z.number(),
  totalPremium: z.number(),              // OD + TP + addon premiums + taxes
  idv: z.number(),
  deductible: z.number(),
  ncbApplied: z.number(),               // ₹ value of NCB discount applied
  ncbPct: z.number(),                   // % NCB applied
  availableAddons: z.array(z.string()), // addon codes available for this provider+vehicle
  selectedAddons: z.array(z.string()),  // addon codes selected for this quote
  generatedAt: z.string().datetime(),
  shareToken: z.string().ulid().optional(), // set when quote is shared
  shareTokenExpiresAt: z.string().datetime().optional(),
  status: z.enum(['active', 'shared', 'expired', 'converted']),
  // Discount (B6 / L18): > 10% requires R12+ approval
  discountPct: z.number().min(0).max(100).optional(),
  discountApprovalRefId: z.string().optional(), // FK → R12 approver reference; required when discountPct > 10
});
```

#### `QuoteCardPropsSchema` — IRDAI fail-closed contract (L16 / B4)

```ts
// Zod schema enforced at the QuoteCard component boundary.
// Component returns null + console.error if either field is missing.
export const QuoteCardPropsSchema = z.object({
  provider: z.object({
    irdaiRegNo: z.string().min(1),              // REQUIRED — fail-closed (L16)
    claimSettlementRatio: z.number().min(0).max(100), // REQUIRED — fail-closed (L16)
    name: z.string(),
    logoUrl: z.string().url(),
    networkGaragesCount: z.number().int(),
  }),
  quote: InsuranceQuoteSchema,
  onAddonChange: z.function().optional(),
});
```

### 3.3 `InsuranceLead`

```ts
export const InsuranceLeadSchema = z.object({
  leadId: z.string().ulid(),
  vin: z.string(),                      // FK → vehicles.ts (L12: no orphan VINs)
  customerId: z.string(),               // FK → customers-store
  assignedAdvisorId: z.string(),        // FK → staff (R09)
  outlet: z.enum(['bangalore', 'mumbai', 'chennai']),

  // Kanban stage (§4 pipeline)
  stage: InsuranceLeadStageEnum,

  // Comparison inputs
  odometer: z.number(),
  customerAge: z.number().int(),
  customerCity: z.string(),
  panLast4: z.string().length(4),       // PII: masked render by default
  noClaimBonusYears: z.number().int().min(0).max(5),

  // History
  quotes: z.array(InsuranceQuoteSchema),
  issuedPolicyId: z.string().optional(),

  // Auto-followup
  followupSequenceState: FollowupSequenceStateSchema,

  // Consent (DPDP L10 / L15): defaults false; explicit opt-in required before audience inclusion
  marketingConsentGiven: z.boolean().default(false),
  marketingConsentAt: z.string().datetime().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().optional(),
  closedReason: z.enum(['won', 'lost', 'duplicate', 'do-not-contact']).optional(),
});

export const InsuranceLeadStageEnum = z.enum([
  'due-soon',       // 60–31 days to expiry (renewal feed entry point)
  'due',            // ≤30 days to expiry
  'quoted',         // at least one quote generated + shared
  'negotiating',    // customer engaged
  'closed-won',     // policy issued
  'closed-lost',    // did not convert
]);
```

### 3.4 `IssuedPolicy`

```ts
export const IssuedPolicySchema = z.object({
  policyId: z.string().ulid(),
  leadId: z.string().ulid(),
  vin: z.string(),
  customerId: z.string(),
  providerId: z.string(),
  policyNumber: z.string(),             // Provider-issued policy number
  policyType: z.enum(['comprehensive', 'third-party', 'standalone-od']),
  totalPremium: z.number(),
  idv: z.number(),
  selectedAddons: z.array(z.string()),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  docId: z.string(),                    // FK → docs-slice document (category: 'insurance')
  commissionEarned: z.number(),
  commissionGst: z.number(),            // commissionEarned × 18/100 (L4)
  advisorId: z.string(),
  issuedAt: z.string().datetime(),
  renewedFromPolicyId: z.string().optional(),
  claimHistory: z.array(ClaimRecordSchema),
});

export const ClaimRecordSchema = z.object({
  claimId: z.string(),
  claimDate: z.string().date(),
  claimAmount: z.number(),
  settledAmount: z.number().optional(),
  status: z.enum(['filed', 'under-review', 'settled', 'rejected']),
  description: z.string().optional(),
});
```

### 3.5 `WhatsAppTemplate`

```ts
export const WhatsAppTemplateSchema = z.object({
  templateId: z.string().ulid(),
  name: z.string(),
  dltTemplateId: z.string().optional(),  // mandatory for APPROVED status (L9)
  category: z.enum(['renewal-reminder', 'quote-share', 'follow-up', 'promotion', 'welcome']),
  bodyText: z.string(),                  // with {{variable}} placeholders
  variables: z.array(z.string()),
  status: z.enum(['DRAFT', 'PENDING_DLT', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

### 3.6 `WhatsAppCampaign`

```ts
export const WhatsAppCampaignSchema = z.object({
  campaignId: z.string().ulid(),
  name: z.string(),
  templateId: z.string(),               // FK → WhatsAppTemplate (status: APPROVED only)
  audienceFilter: AudienceFilterSchema,
  scheduledAt: z.string().datetime().optional(), // null = send now
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'cancelled']),
  stats: z.object({
    targeted: z.number().int(),
    sent: z.number().int(),
    delivered: z.number().int(),
    read: z.number().int(),
    replied: z.number().int(),
    optedOut: z.number().int(),
    failed: z.number().int(),
  }),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});

export const AudienceFilterSchema = z.object({
  cities: z.array(z.enum(['bangalore', 'mumbai', 'chennai'])).optional(),
  vehicleMakes: z.array(z.string()).optional(),
  expiryWindowDays: z.number().int().optional(),  // leads with expiry within N days
  lastPurchaseDaysAgo: z.number().int().optional(),
  hasMarketingConsent: z.literal(true),           // always true — DPDP L10
  excludeOptedOut: z.literal(true),              // always true — DPDP L10
});
```

### 3.7 `AICallLog`

```ts
export const AICallLogSchema = z.object({
  callId: z.string().ulid(),
  leadId: z.string().ulid(),
  stage: InsuranceLeadStageEnum,
  calledAt: z.string().datetime(),
  durationSeconds: z.number().int().optional(),
  transcript: z.string().optional(),             // mocked in v1 (L11)
  outcome: z.enum(['interested', 'callback', 'not-interested', 'wrong-number', 'do-not-call']),
  callbackScheduledAt: z.string().datetime().optional(),
  actorId: z.string(),                           // system or advisor who triggered
  isMocked: z.boolean().default(true),           // v1 always true
});
```

### 3.8 `FollowupSequenceState`

```ts
export const FollowupSequenceStateSchema = z.object({
  currentStepIndex: z.number().int().default(0),
  nextDueAt: z.string().datetime().optional(),
  lastOutcome: z.string().optional(),
  paused: z.boolean().default(false),
  completedAt: z.string().datetime().optional(),
});

// Sequence step template (per Kanban stage, stored in provider catalog fixture)
export const FollowupStepSchema = z.object({
  stepIndex: z.number().int(),
  channel: z.enum(['whatsapp', 'ai-call', 'manual-call']),
  delayDays: z.number().int(),           // +1d, +3d, +7d etc.
  templateId: z.string().optional(),     // for WhatsApp steps
  scriptId: z.string().optional(),       // for AI-call steps
  slaHours: z.number().int(),
  skipConditions: z.array(z.string()),   // e.g. ['already-replied', 'do-not-call']
});
```

---

## 4. Pipeline state machine

```
[renewal-feed auto-entry]
       │
       ▼
   due-soon  ─────────────────────┐
   (60–31d)                       │
       │ staff drags / time ticks  │
       ▼                           │
     due                           │
   (≤30d)                          │
       │ quote generated + shared  │  manual close-lost at any stage
       ▼                           │
    quoted ────────────────────────►  closed-lost
       │ customer responds         │
       ▼                           │
  negotiating ───────────────────► │
       │ deal agreed                │
       ▼                           │
  closed-won ──── writes new IssuedPolicy + docs-slice.addDocument('insurance')
                                        └── resets renewal timer
```

Stage transitions allowed:

| From | To | Actor | Gate |
|---|---|---|---|
| `due-soon` | `due` | system (auto, time-based) | — |
| `due-soon` / `due` | `quoted` | advisor | R09+ |
| `quoted` | `negotiating` | advisor | R09+ |
| `negotiating` | `closed-won` | sales manager | R10+ |
| `negotiating` | `closed-lost` | sales manager | R10+ |
| Any | `closed-lost` | advisor | R09+ |
| `closed-won` | — | immutable after win | — |
| Any | `quoted` | advisor | R09+ (re-quote allowed) |

Discount > 10% on premium requires R12+ approval (finance gate, Doc 14 §R12).

---

## 5. Key flows

### 5.1 Comparison engine flow

1. Staff navigates to `/insurance/compare`.
2. Inputs: VIN (auto-populates make/model/year/km from vehicles-store), customer age, city, PAN last-4 (masked field), NCB years.
3. Comparison engine (pure client fn `buildQuotes(vehicle, customer, providers)`) generates one `InsuranceQuote` per active provider.
4. Results grid sorted by `totalPremium` ascending (L19). User can re-sort by CSR or network garages.
5. Each quote card shows: provider logo, IRDAI reg no, CSR%, network garages, OD + TP + total, IDV, addons available. Commission not shown (L3).
6. Addon selection: checkboxes per provider. Recalculates totals client-side immediately.
7. "Create Lead" CTA: prompts for customer selection (combobox → customers-store). Before saving, shows explicit consent step: checkbox labelled "I agree to receive marketing communications about insurance products" + DPDP purpose text (`insurance.consent.marketingPurpose` i18n key). Consent is optional — lead is created regardless. `marketingConsentGiven` defaults to `false` (L15); if checked, `marketingConsentAt` is stamped and purpose `INSURANCE_MARKETING` written to consent-log. Lead created at stage `quoted`, attaches selected quote.
8. "Share Quote" CTA: generates `shareToken` (ULID) + `shareTokenExpiresAt` (+7d). Returns `/insurance/quote/[token]` URL.

### 5.2 Shareable quote page (`/insurance/quote/[token]`)

- Public route (no auth required).
- Server reads quote by token. If expired or not found → static error page "This quote has expired. Please contact BN Automobiles."
- Renders read-only comparison grid: all providers compared side-by-side, BN branding header.
- No purchase CTA (L1). Shows "Call us" + WhatsApp deeplink to BN advisor.
- Token expiry is 7 days from generation (L6).
- Branded PDF export button: uses existing PDF export pattern (`@dms/ui/PdfExportButton`).

### 5.3 Renewal pipeline auto-feed

- On mount of `/insurance/renewal-pipeline`, `insuranceStore.syncRenewalFeed()` is called.
- It reads all `insurance` documents from docs-slice where `expiresAt < today + 60 days` AND no existing `InsuranceLead` with matching VIN + `stage ∉ { closed-won, closed-lost }`.
- For each match, calls `insuranceStore.createLeadFromRenewal(vin, customerId, expiresAt)` which creates a lead at `due-soon` (if >30d) or `due` (if ≤30d).
- Idempotent: duplicate detection by `vin + open-lead` check.

### 5.4 Policy issuance (close-won)

1. R10+ drags lead to `closed-won` (or clicks "Close as Won" in lead detail).
2. `ClosePolicyDialog` opens: confirm provider, confirm selected quote, enter policy number (provider-issued).
3. On confirm:
   - `insuranceStore.closeLead(leadId, 'won', { policyNumber, quoteId })` called.
   - Creates `IssuedPolicy` record with `commissionEarned = totalPremium × provider.commissionPct / 100`, `commissionGst = round(commissionEarned × 18/100)` (L4).
   - Calls `docs-slice.addDocument({ vin, category: 'insurance', expiresAt: policy.periodEnd, ... })` (L17).
   - Lead stage → `closed-won`, immutable.

### 5.5 WhatsApp campaign flow

1. Staff navigates to `/insurance/marketing/whatsapp`.
2. **Template tab**: list of all templates with status badges. "New Template" → `CreateTemplateDialog` (name, category, body text with variable placeholders). Saved as `DRAFT`. "Submit for DLT" sets status → `PENDING_DLT`; staff manually enters `dltTemplateId` when received from BSP. R10+ can approve (mark `APPROVED`) once DLT ID entered. Only `APPROVED` templates can be used in campaigns (L9).
3. **Campaigns tab**: list of all campaigns. "New Campaign" → `CreateCampaignDialog`:
   - Select `APPROVED` template.
   - Audience builder: city multi-select, vehicle make multi-select, expiry window (days), last purchase (days ago). `hasMarketingConsent: true` and `excludeOptedOut: true` are hardcoded filters (L10). Audience preview count shown.
   - Schedule: "Send now" or date-time picker.
4. Campaign launched → status `sending` → each message dispatched via WhatsApp BSP integration (Doc 13 §WhatsApp BSP). At dispatch time, `sendTemplateMessage` MUST: (a) call `getTemplate(templateId)` and throw `TemplateNotApprovedError` if `template.status !== 'APPROVED'` (L13 / B1 slice-level guard); (b) re-check the live opt-out registry and skip + count any customer in `insuranceOptOuts` as `stats.optedOut` (L14 / B2 send-time check). In v1 (mocked), stats incremented from fixture.
5. **Delivery tracking**: `CampaignDetailView` shows per-campaign stats: sent/delivered/read/replied/opted-out/failed as SVG bar chart. Row-level feed shows per-recipient status.
6. **Opt-out**: clicking "Stop messages" in any WhatsApp message from BN calls `insuranceStore.recordOptOut(customerId)`. Opt-out is stored in `insuranceOptOuts` fixture and filters all subsequent audience queries (L10). Because opt-outs are re-checked at send time (L14), scheduled campaigns also honor opt-outs recorded after audience build.

### 5.6 AI auto-calling flow (P3 display-only; P4 real dispatch)

**P3 — display-only (L17 / B5):**

1. Lead detail page shows "Call Feed" section.
2. "Trigger AI Call" button (R09+): opens `AICallTriggerDialog` with stage-specific script preview.
3. On confirm: `insuranceStore.triggerAICall(leadId)` creates an `AICallLog` with `isMocked: true`, sets `outcome` from seeded fixture transcripts after a simulated 3-second delay. This is **display-only** — no lead stage mutation, no auto-close-lost, no followup state changes.
4. Call log renders in feed: timestamp, duration, outcome badge, transcript accordion (static cards).
5. Outcome `do-not-call` in P3: renders outcome badge only. Advisor sees the outcome and must **manually** close the lead via the standard close-lost dialog. No automatic state mutation (L17).

**P4 — real dispatch (behind feature flag `feat_insurance_ai_calling`):**

- Feature flag OFF by default. Turned ON only when both P4 hard-prerequisites are met: OQ4 (DPDP `INSURANCE_CALLING` consent purpose approved by legal) AND OQ5 (TRAI auto-dialler registration confirmed).
- When flag is ON: `triggerAICall` routes to Doc 13 §voice-ai API. `isMocked` = `false`.
- Auto-close-lost on `do-not-call` outcome enabled only when `isMocked === false` and feature flag is ON.

### 5.7 Auto-followup sequence

- Each `InsuranceLead` carries a `followupSequenceState` (§3.8).
- On lead creation, sequence is initialized from the stage-specific template (3 steps: WhatsApp +1d, AI call +3d, manual call +7d).
- `insuranceStore.tickFollowups(now)` is called on mount of `/insurance/leads` and `/insurance/renewal-pipeline`. It scans leads where `nextDueAt <= now` and `paused === false`.
- Due steps are surfaced as "Overdue Followups" banner at top of lead index.
- Staff can skip a step (with reason) or mark it done (manual-call outcome captured in a `ManualCallOutcomeDialog`).

---

## 6. Store contract

New store: `packages/mocks/src/fixtures/insurance.ts` (fixtures) + UI-layer store at `apps/staff-web/src/stores/insurance-store.ts`.

No new cross-store reads needed beyond what vehicles-store and customers-store already expose.

**Actions:**

```ts
// Lead management
createLead(params: CreateLeadParams): InsuranceLead
createLeadFromRenewal(vin, customerId, expiresAt): InsuranceLead
advanceStage(leadId, toStage, actor, meta?): InsuranceLead
closeLead(leadId, reason, closeMeta): InsuranceLead

// Quote
generateQuotes(vin, customerParams): InsuranceQuote[]
shareQuote(quoteId): { token: string; expiresAt: string }
getQuoteByToken(token): InsuranceQuote | 'expired' | 'not-found'
applyDiscount(quoteId: string, pct: number, actor: StoreActor): InsuranceQuote
  // Throws R12RequiredError if pct > 10 and !hasRank(actor.role, 'R12') (L18 / B6)

// Policy
issuePolicyOnClose(leadId, policyMeta): IssuedPolicy

// WhatsApp
createTemplate(params): WhatsAppTemplate
updateTemplate(id, patch): WhatsAppTemplate
submitForDlt(templateId): WhatsAppTemplate
markTemplateApproved(templateId, dltId): WhatsAppTemplate
launchCampaign(params): WhatsAppCampaign
recordOptOut(customerId): void
sendTemplateMessage(templateId: string, recipientId: string, variables: Record<string, string>): Promise<{ messageId: string }>
  // Invariant (L13 / B1): calls getTemplate(templateId) first; throws TemplateNotApprovedError if template.status !== 'APPROVED'
  // Invariant (L14 / B2): re-checks insuranceOptOuts registry at dispatch; skips + counts opted-out recipients in stats.optedOut

// AI call
triggerAICall(leadId): AICallLog
tickFollowups(now: Date): void

// Sync
syncRenewalFeed(): void
```

---

## 7. RBAC gates

Per Doc 14. Gate at both store action layer (throws) and UI layer (hides/disables).

| Action | Minimum role |
|---|---|
| View insurance hub + leads index | R09 (Sales Associate) |
| Build comparison + share quote | R09 |
| Create / edit lead | R09 |
| Advance stage to `quoted` / `negotiating` | R09 |
| Advance stage to `closed-won` / `closed-lost` | R10 (Sales Manager) |
| Approve discount > 10% | R12 (Finance) |
| Launch WhatsApp campaigns | R10 |
| Create/edit WhatsApp templates | R10 |
| View commission ledger | R22 (CFO), R19 (GM — read only) |
| Override any gate | R19 (GM) |
| Cross-city lead access | R19+ |
| Trigger AI call | R09 |
| View AI call transcripts | R09+ |

---

## 8. IRDAI compliance requirements

All quote-display surfaces (comparison grid, shareable page, lead detail):

1. Show `provider.irdaiRegNo` labelled "IRDAI Reg No." in every provider card.
2. Show `provider.claimSettlementRatio` as "Claim Settlement: {N}%" with tooltip "Source: IRDAI Annual Report FY24."
3. Show disclaimer: "BN Automobiles is a registered motor insurance web aggregator. Insurance is the subject matter of solicitation."
4. Commission disclosure on commission ledger only (R22+): per-policy commission amount + GST.
5. No direct policy issuance (L1): every close-won requires entry of provider-issued policy number.

---

## 9. DPDP / DLT compliance

Per CLAUDE.md §9 and Doc 03 §10:

1. **Consent gate (L15 / B3)**: `marketingConsentGiven` defaults to `false` on lead creation. A separate explicit consent step (checkbox + DPDP purpose text via i18n key `insurance.consent.marketingPurpose` + ISO timestamp) is required before the customer enters any marketing audience. Audience builder `hasMarketingConsent: true` filter is hardcoded (cannot be removed — L10). Lead created without consent is valid but excluded from all audience queries.
2. **Opt-out registry (L14 / B2)**: `insuranceOptOuts: Set<customerId>` in the insurance store. Any opt-out is permanent until customer re-consents. Excluded from all audience queries at build time AND re-checked at `sendTemplateMessage` dispatch time (L14). Customers who opt out between audience build and scheduled send are skipped and counted in `stats.optedOut`, never `stats.failed`.
3. **Purpose field on consent log**: `INSURANCE_MARKETING` added as a consent purpose. Uses existing `consent-log` fixture from SPEC-CUSTOMERS-001.
4. **DLT template IDs (L13 / B1)**: every `WhatsAppTemplate` in `APPROVED` status must have a non-null `dltTemplateId`. `sendTemplateMessage` resolves the template and throws `TemplateNotApprovedError` if `template.status !== 'APPROVED'` at dispatch time — this is a slice-level fail-closed guard, not a UI-only check (L13). No free-text WhatsApp sends (L9, CLAUDE.md §9).
5. **PAN last-4**: rendered via masked field component (`<MaskedPiiField />`). Never logged or concatenated.

---

## 10. Commission & GST accounting

Per Doc 06 L25 and PLAN-VEHICLES-003 L25:

```
commissionEarned = totalPremium × provider.commissionPct / 100
commissionGst    = round(commissionEarned × 18 / 100)    // additive, tax-exclusive
commissionNet    = commissionEarned                        // before GST
commissionInvoiceTotal = commissionEarned + commissionGst
```

Ledger visible at `/insurance/commission` (R22+, R19 read). Per row: `policyId`, `providerId`, `advisorId`, `commissionEarned`, `commissionGst`, `commissionInvoiceTotal`, `issuedAt`.

No TCS applies to commission receipts (TCS is on vehicle sale value per §206C(1F), not insurance commission income).

---

## 11. Integration contracts

Per Doc 13:

### 11.1 WhatsApp BSP (v1 mocked)

```ts
// Doc 13 §WhatsApp BSP
interface WhatsAppBSPContract {
  // L13 (B1): Caller MUST have verified template.status === 'APPROVED' before this call.
  // L14 (B2): Caller MUST have re-checked opt-out registry before this call.
  sendTemplateMessage(params: {
    to: string;           // phone number with country code
    dltTemplateId: string; // non-null; validated at slice layer before reaching BSP
    variables: Record<string, string>;
  }): Promise<{ messageId: string; status: 'queued' | 'failed' }>;

  getDeliveryStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  }>;
}
```

v1: MSW handler returns mocked status progression. Production: replace handler with real BSP endpoint.

### 11.2 Voice-AI (v1 mocked)

```ts
// Doc 13 §voice-ai
interface VoiceAIContract {
  initiateCall(params: {
    leadId: string;
    phoneNumber: string;
    scriptId: string;
  }): Promise<{ callId: string; status: 'initiated' | 'failed' }>;

  getCallOutcome(callId: string): Promise<{
    outcome: AICallLog['outcome'];
    transcript: string;
    durationSeconds: number;
  }>;
}
```

v1: `triggerAICall` in insurance-store picks a random mocked transcript from the 10 fixture transcripts. No real API call.

---

## 12. Demo fixtures

File: `packages/mocks/src/fixtures/insurance.ts`

**Single source of truth rule (L12):** All leads must reference VINs from `packages/mocks/src/fixtures/vehicles.ts`. No new VINs introduced.

### 12.1 Providers (6 active)

| id | Name | IRDAI Reg | CSR% | Garages | Commission% |
|---|---|---|---|---|---|
| `bajaj-allianz` | Bajaj Allianz General Insurance | IRDAI/HLT/059 | 98.5 | 6500 | 14 |
| `hdfc-ergo` | HDFC ERGO General Insurance | IRDAI/HLT/146 | 99.2 | 10000 | 13 |
| `icici-lombard` | ICICI Lombard General Insurance | IRDAI/NLM/005 | 87.0 | 15000 | 12 |
| `reliance-general` | Reliance General Insurance | IRDAI/NLM/006 | 97.8 | 8200 | 11 |
| `digit` | Digit General Insurance | IRDAI/NLM/158 | 96.0 | 6600 | 15 |
| `cholamandalam` | Cholamandalam MS General Insurance | IRDAI/NLM/022 | 95.0 | 7500 | 12 |

### 12.2 Leads (30 total across 3 cities)

Distribution:

| Stage | Count | VINs sourced from |
|---|---|---|
| `due-soon` | 7 | vehicles.ts (bangalore subset) |
| `due` | 6 | vehicles.ts (mumbai subset) |
| `quoted` | 6 | vehicles.ts (chennai + bangalore) |
| `negotiating` | 5 | vehicles.ts |
| `closed-won` | 4 | vehicles.ts |
| `closed-lost` | 2 | vehicles.ts |

Each lead has: 1–3 quotes attached, a followup sequence state, assigned advisor id from `staff.ts` fixture.

### 12.3 Issued policies (25 historical)

25 `IssuedPolicy` records referencing leads in `closed-won`. Each has: provider, policy number, period start/end, IDV, selected addons (2–4 per policy), commission earned + GST. Period ends distributed across next 18 months so renewal-feed auto-populates.

### 12.4 WhatsApp templates (8 total)

| Status | Count | Categories |
|---|---|---|
| `APPROVED` | 3 | renewal-reminder, quote-share, follow-up |
| `PENDING_DLT` | 2 | renewal-reminder, promotion |
| `DRAFT` | 3 | welcome, promotion, follow-up |

Each APPROVED template has a real-looking `dltTemplateId` (format: `DLTXXXXXXXXXXXXXXXX`).

### 12.5 AI call transcripts (10 mocked)

10 `AICallLog` records seeded across `interested` (4), `callback` (3), `not-interested` (2), `wrong-number` (1). Each has a 3–8 sentence transcript. Distributed across leads in `quoted` / `negotiating` stages. All `AICallLog` records have `isMocked: true` and do NOT mutate lead stage (P3 display-only per L17).

### 12.6 Discount fixture (B6 / L18)

One `InsuranceQuote` in `negotiating` stage with `discountPct: 12` and a valid `discountApprovalRefId` referencing a fixture R12 staff member (e.g. `staff.ts` id `r12-finance-01`). This fixture validates the R12 approval path for `applyDiscount`. A second quote in the same lead has `discountPct: 8` with no `discountApprovalRefId` (below the 10% threshold, no approval needed).

---

## 13. UI component plan

All components under `apps/staff-web/src/app/(staff)/insurance/`.

| Component | Route | Description |
|---|---|---|
| `InsuranceHubView` | `/insurance` | 4 summary tiles (active leads, renewals due, policies issued, commission MTD) + quick-actions |
| `LeadsIndexView` | `/insurance/leads` | Table view + Kanban toggle; stage filter chips; assign/search |
| `LeadKanbanBoard` | `/insurance/leads` | Drag-drop Kanban (7 columns = 7 stages). Uses `@dnd-kit/core` (already a dep if present; else CSS drag with HTML5 API — no new heavy lib) |
| `LeadDetailView` | `/insurance/leads/[leadId]` | Header + 4 sections: quotes, call log, followup state, policy info |
| `CompareView` | `/insurance/compare` | Input form (left panel) + quote results grid (right panel) |
| `QuoteCard` | `/insurance/compare` | Per-provider card: logo, IRDAI, CSR, premium breakdown, addon checkboxes |
| `ShareableQuotePage` | `/insurance/quote/[token]` | Public; BN header, comparison table, disclaimer, PDF export |
| `RenewalPipelineView` | `/insurance/renewal-pipeline` | Kanban restricted to `due-soon` → `closed-won`. Auto-sync banner. |
| `WhatsAppHubView` | `/insurance/marketing/whatsapp` | Tabs: Templates / Campaigns / Opt-outs |
| `TemplateEditorDialog` | — | Create/edit template with variable insertion helper |
| `CampaignCreatorDialog` | — | Step 1: template select → Step 2: audience builder → Step 3: schedule |
| `CampaignDetailView` | `/insurance/marketing/whatsapp/[campaignId]` | SVG stats chart + delivery feed table |
| `CommissionLedgerView` | `/insurance/commission` | Table: policy, provider, advisor, commission, GST, total. CSV export. |
| `AICallFeed` | Lead detail sub-section | Call log cards with outcome badge + transcript accordion |
| `FollowupSequencePanel` | Lead detail sub-section | Step timeline: done/pending/overdue; skip + trigger actions |

---

## 14. Empty / loading / error states

Every list and detail view implements all four states (per CLAUDE.md §10 DoD):

| View | Empty | Loading | Error |
|---|---|---|---|
| Leads index | "No leads yet. Run a comparison to create the first lead." | Skeleton table rows | "Could not load leads." + retry |
| Kanban | Empty column placeholders per stage | Skeleton cards | "Pipeline unavailable." |
| Compare results | "Adjust inputs above to generate quotes." | Skeleton quote cards | "Could not generate quotes." |
| Policy history | "No policies issued yet." | Skeleton rows | Error toast |
| Campaign list | "No campaigns yet. Create a template first." | Skeleton | Error toast |

---

## 15. i18n

All user-facing strings via `next-intl`. Keys under:

```
messages/en-IN/insurance.json
```

Key namespaces:

- `insurance.hub.*` — hub tiles + quick actions
- `insurance.leads.*` — lead index + lead detail
- `insurance.compare.*` — comparison engine + quote cards
- `insurance.renewal.*` — renewal pipeline
- `insurance.marketing.whatsapp.*` — template mgmt + campaigns
- `insurance.commission.*` — commission ledger
- `insurance.policy.*` — policy detail + history
- `insurance.aiCall.*` — call log + outcomes
- `insurance.followup.*` — followup sequence steps

---

## 16. Accessibility

Per CLAUDE.md §10 DoD §3:

- Keyboard navigation on Kanban: arrow keys move card focus across columns; `Enter` opens lead detail.
- All modals trap focus; Escape closes.
- Color contrast: status badges (stage colors) meet AA minimum on dark staff theme.
- Reduced motion: Kanban drag animation respects `prefers-reduced-motion`.
- `aria-label` on all icon-only buttons.
- Quote comparison table: `<table>` with proper `<thead>` / `<th scope>` for screen reader navigation.

---

## 17. Performance

Per Doc 12 §Performance:

- Comparison engine (`buildQuotes`) is a pure synchronous function. Runs in <10ms for 10 providers (no async, no external calls in v1).
- Lead index: virtualized list (TanStack Virtual) if leads > 100.
- Kanban: only visible column cards rendered; off-screen columns use placeholder height.
- Shareable quote page: static-like render (no auth, no store init). LCP target < 2.5s.
- Commission ledger: paginated (50 rows/page).

---

## 18. Security

- Shareable quote tokens are ULIDs (unpredictable enough for short-lived public links). 7-day TTL enforced server-side (L6).
- PAN last-4 never logged; rendered only via `<MaskedPiiField />` component.
- Commission data gated at store layer (not just UI) — `insuranceStore.getCommissionLedger` throws if caller role < R22 and role ≠ R19.
- WhatsApp sends route through server action / route handler per CLAUDE.md §12 ("Do not call external services from the frontend").
- Voice-AI call trigger also routes through server action.
- Opt-out list is never cleared by staff actions — only customer re-consent can remove an opt-out.

---

## 19. Test scenarios (GPA format)

**S1 — Comparison engine generates quotes**
- Given: staff logged in as R09, vehicle `WP0AB2A91MS247831` (Porsche 911, 2021), NCB 2 years
- When: staff submits comparison form
- Then: 6 quote cards rendered; each shows IRDAI reg no + CSR; sorted by total premium ascending; addons checkboxes present

**S2 — Share quote generates valid token**
- Given: quote generated for S1
- When: staff clicks "Share Quote"
- Then: shareable URL returned with 7-day expiry; public page renders without auth; branded PDF export available

**S3 — Expired token shows error page**
- Given: `shareTokenExpiresAt` = 8 days ago
- When: public user navigates to `/insurance/quote/[token]`
- Then: static "This quote has expired" page rendered; no quote data shown

**S4 — Renewal feed auto-populates leads**
- Given: policy document for VIN `WP0ZZZ97ZNS112045` has `expiresAt` = today + 25 days; no existing open lead for this VIN
- When: staff opens `/insurance/renewal-pipeline`
- Then: new lead created at stage `due`; displayed in `due` column of Kanban

**S5 — Close-won triggers policy document write-back**
- Given: lead in `negotiating` stage; R10 role
- When: R10 advances lead to `closed-won` with policy number + selected quote
- Then: `IssuedPolicy` created; `docs-slice` receives new document with `category: 'insurance'`; lead stage immutable post-close

**S6 — Discount > 10% blocked without R12**
- Given: advisor (R09) attempts to apply 15% discount on premium
- Then: action throws; discount approval dialog shown; requires R12 confirmation

**S7 — WhatsApp campaign blocked without approved template**
- Given: only DRAFT and PENDING_DLT templates exist
- When: R10 attempts to launch campaign
- Then: template selector shows no APPROVED templates; CTA disabled; tooltip "Approve a DLT template first"

**S8 — Opt-out excludes customer from audience**
- Given: customer C1 has `marketingConsentGiven: true` but opt-out recorded
- When: audience builder runs for a renewal-reminder campaign
- Then: C1 excluded from targeted count; never appears in delivery feed

**S9 — AI call outcome `do-not-call` renders display-only in P3**
- Given: lead in `quoted` stage; AI call triggered (P3, `isMocked: true`)
- When: mocked outcome = `do-not-call`
- Then: outcome badge rendered in call feed as a static card; lead stage is NOT mutated; no auto-close-lost; advisor sees outcome and must manually close lead via standard close-lost dialog (L17 / B5)

**S10 — Commission ledger blocked for R09**
- Given: staff logged in as R09 (Sales Associate)
- When: navigates to `/insurance/commission`
- Then: 403 / redirect to hub; no commission data visible

**S11 — Followup step triggers on due date**
- Given: lead with `followupSequenceState.nextDueAt` = yesterday; step is WhatsApp
- When: `/insurance/leads` mounts and `tickFollowups(now)` runs
- Then: "Overdue Followups" banner shows 1 item; WhatsApp step highlighted in sequence panel

**S12 — Orphan VIN rejected on lead creation**
- Given: staff attempts `createLead` with VIN not present in `vehicles.ts`
- Then: store throws `VINNotFoundError`; form validation error shown

**S13 — DLT slice-level guard rejects reverted template (B1 / L13)**
- Given: template `T1` status = `APPROVED` at campaign launch; template status is subsequently reverted to `DRAFT` (e.g. via admin action) before the queued messages dispatch
- When: `sendTemplateMessage('T1', ...)` is called for a recipient in the queue
- Then: store throws `TemplateNotApprovedError`; message NOT sent; `stats.failed` incremented; no WhatsApp message delivered

**S14 — Send-time opt-out honored for scheduled campaign (B2 / L14)**
- Given: customer C2 in audience snapshot with `marketingConsentGiven: true`; campaign scheduled for T+2 hours; C2 opts out at T+1 hour (before dispatch)
- When: campaign dispatches at T+2 hours and processes C2's recipient entry
- Then: C2 is skipped (not contacted); `stats.optedOut` incremented by 1; `stats.sent` does NOT include C2

**S15 — Lead without consent excluded from audience (B3 / L15)**
- Given: lead created without consent step (`marketingConsentGiven: false`); expiry window matches campaign audience filter
- When: audience builder runs with `hasMarketingConsent: true` filter
- Then: lead excluded from targeted count; never appears in delivery feed

**S16 — QuoteCard refuses render with missing IRDAI fields (B4 / L16)**
- Given: `InsuranceProvider` fixture entry with `irdaiRegNo: ''` (empty) or `claimSettlementRatio: undefined`
- When: `QuoteCard` renders with this provider
- Then: component returns null; `console.error` emitted with IRDAI disclosure failure message; no quote card displayed; Vitest test asserts render output is null

**S17 — Discount > 10% requires R12 approval (B6 / L18)**
- Given: advisor logged in as R09 attempts `applyDiscount(quoteId, 15, actorR09)`
- When: `applyDiscount` is called at the store layer
- Then: store throws `R12RequiredError`; discount NOT applied; discount approval dialog shown to advisor; R12 actor can call `applyDiscount(quoteId, 15, actorR12)` successfully; `discountPct: 15` + `discountApprovalRefId` written to quote

---

## 20. Open questions (v2 review — do NOT block v1)

| # | Question | Owner | Impact |
|---|---|---|---|
| OQ1 | Does IRDAI require BN to file a Form 6 (Web Aggregator Return) for aggregation business? If yes, what data fields need tracking in DMS? | Legal / IRDAI review | Low — data already captured, just export format |
| OQ2 | GST invoicing on commission earned: does BN raise a tax invoice on each policy issuance to the insurer, or on a monthly consolidated basis? Monthly basis changes commission ledger batching. | Finance / Doc 06 | Medium — affects commission ledger grouping |
| OQ3 | IRDAI Web Aggregator Guidelines 2017 §8 — is "claim settlement ratio" required to be from the most recent FY only, or is a 3-year average acceptable? | Legal | Low — affects provider catalog data freshness |
| OQ4 | **P4 hard-prerequisite.** DPDP consent for AI auto-calling: does calling a customer's number for insurance solicitation require a separate consent purpose `INSURANCE_CALLING`, distinct from `INSURANCE_MARKETING`? P4 feature flag `feat_insurance_ai_calling` remains OFF until legal confirms this and consent UI is updated. | Legal / DPDP review | **HIGH — P4 blocker per L17** |
| OQ5 | **P4 hard-prerequisite.** Voice-AI integration (Doc 13 §voice-ai): is the voice-AI vendor TRAI-registered for outbound auto-dialling? Unregistered auto-diallers violate TRAI Telecom Commercial Communications regulations. P4 feature flag remains OFF until registration confirmed. | Tech / Legal | **HIGH — P4 blocker per L17** |
| OQ6 | Commission percentage per provider: are these fixed contractual rates, or do they vary per policy type (comprehensive vs TP only)? Currently modelled as a single `commissionPct` per provider (L15). | Business / BN management | Medium — may need per-policy-type commission slabs |
| OQ7 | WhatsApp BSP selection (Doc 13): which BSP is contracted — is there a preferred vendor? BSP choice affects template approval timeline and delivery rate. | Business / Tech | Low for spec, high for P3 implementation |

### 20.1 Deferred items (tracked, not blockers)

These were flagged after the 2026-04-29 spec-enhancement pass but deferred to v1.1 because they are UX polish, not behavioural gaps. Tracked here so they don't get lost.

| # | Item | Priority | Notes |
|---|---|---|---|
| DEF-INS-1 | **`/insurance/audit` view canonical-pattern polish.** The audit page (`InsuranceAuditView`) shipped functional in P5 but predates the canonical UI pattern (SPEC-ARCH-UI-001). Apply the polish the way `lead-detail-view.tsx` and `provider-catalog-view.tsx` were polished in commit 8 of the 2026-04-29 batch: replace ad-hoc `rounded-lg` boxes with `Card` primitive, switch `text-[NNpx]` to `text-xs/sm`, normalise `rounded-lg` → `rounded-md`, wrap audit-event groups in proper Cards with `dl/dt/dd` field grids. Preserve all behaviour (R12+ read gate, store reads, filtering). Acceptance: audit view passes `grep -RE "text-\[[0-9]" src/components/insurance/insurance-audit-view.tsx` with zero matches. | P2 (UX polish) | Reference: SPEC-ARCH-UI-001 §4 (Card/Field), §6 (typography rules), §7 (radius rules). |
| DEF-INS-2 | **`InsuranceAuditEvent` kind label completeness.** The audit-view's `KIND_LABEL` map should be moved to a single source of truth in `apps/staff-web/src/lib/insurance/audit-event-labels.ts` (currently inline). New audit kinds added in subsequent PRs (e.g. `followup_outcome_recorded` from the 2026-04-29 pass) must update this single map. Acceptance: 100% of `InsuranceAuditEventKind` enum members have entries in the label map; a unit test verifies the map covers the enum exhaustively. | P3 (housekeeping) | Test pattern: iterate enum, assert each key is in label map. |

---

## 21. Acceptance criteria

The following must hold for this spec to be marked `approved` and P1 to begin:

- [x] All entities in §3 have Zod schemas with zero `z.any()` usage.
- [x] All 26 locked decisions (§0) have a cited rationale.
- [ ] RBAC table (§7) has been cross-checked against Doc 14 by a security reviewer.
- [ ] IRDAI compliance requirements (§8) reviewed and signed off.
- [ ] DPDP/DLT compliance (§9) reviewed and signed off.
- [ ] Commission formula (§10) reviewed by finance reviewer.
- [x] Demo fixtures (§12) reference only VINs present in `vehicles.ts`.
- [x] Phase plan (§1) reviewed and sequencing approved (P3 = display-only AI; P4 behind feature flag).
- [ ] All 17 test scenarios (§19) reviewed by QA.
- [ ] Open questions (§20) logged; OQ4 + OQ5 confirmed as P4 hard-prerequisites; none of OQ1–OQ7 block v1.
- [x] `sendTemplateMessage` has slice-level `TemplateNotApprovedError` guard (L13 / B1).
- [x] Send-time opt-out re-check implemented at `sendTemplateMessage` boundary (L14 / B2).
- [x] `marketingConsentGiven` defaults `false`; explicit consent UI added to lead creation (L15 / B3).
- [x] `QuoteCardPropsSchema` Zod validator added; `QuoteCard` fail-closed on missing IRDAI fields (L16 / B4).
- [x] AI calling P3 display-only; P4 behind `feat_insurance_ai_calling` flag with OQ4 + OQ5 as hard-prerequisites (L17 / B5).
- [x] `applyDiscount` store action added; `discountPct` + `discountApprovalRefId` on `InsuranceQuote`; R12 gate fixture present (L18 / B6).
- [ ] Vitest test: "QuoteCard refuses render with missing IRDAI fields" (S16).
- [ ] Vitest test: `sendTemplateMessage` throws `TemplateNotApprovedError` when template status reverted (S13).

---

## 31. P2 — Renewal Pipeline (implementation specifics)

### Auto-feed mechanism

`insuranceStore.syncRenewalFeed()` is called on mount of `/insurance/renewal-pipeline`. It reads `insuranceLeads` fixture directly (no subscription) and scans for leads with expiry-derived stage. For cross-module wiring, the hydrator reads `issuedPolicies` directly from `@dms/mocks/fixtures` to find `periodEnd` dates where expiry is within 60 days of today AND no open lead exists for the same `(vin, customerId)` triplet. It calls `createLeadFromRenewal({ source: 'AUTO_RENEWAL', vin, customerId, expiresAt })`.

- New lead source value: `'AUTO_RENEWAL'` added to `LeadSourceEnum` (extended on `InsuranceLead.source` optional field).
- **Idempotency**: duplicate detection key = `(vin, customerId, expiresAt-month)`. Second auto-feed call for same triplet in the same expiry window is a no-op — returns the existing open lead.
- **Stage assignment**: `daysToExpiry > 30` → `due-soon`; `daysToExpiry <= 30` → `due`.
- **Priority field**: `Lead.priority: 'urgent' | 'normal'` derived from days-to-expiry (`<= 30` → `urgent`, `31-60` → `normal`).

### Closing won (renewal)

1. R10+ drags lead to `closed-won` (or clicks "Close as Won").
2. `ClosePolicyDialog` confirms policy number + quote.
3. `insuranceStore.closeLead(...)` creates `IssuedPolicy` + calls `useVehiclesStore.getState().addDocument(...)` with `category: 'insurance'`, `expiresAt: policy.periodEnd`.
4. Old policy document gets `supersededBy` set to new `docId` via `updateDocumentMeta`.
5. Lead stage → `closed-won`, immutable.

### L_P2_1

> Renewal pipeline auto-feeds from `issuedPolicies` fixture on mount. Idempotent on `(vin, customerId, expiresAt-month)`. Closing won creates new insurance `Document` via vehicles-store `addDocument`; old Document gets `supersededBy` set to new `docId`. Second call for same triplet within 60-day window is a no-op.

---

## 32. P3 — WhatsApp Marketing (implementation specifics)

### Routes

| Route | Purpose |
|---|---|
| `/insurance/marketing/whatsapp` | Template management + campaign list + opt-out registry (tabbed) |
| `/insurance/marketing/whatsapp/templates/new` | Create new template |
| `/insurance/marketing/whatsapp/templates/[id]` | Edit existing template |
| `/insurance/marketing/whatsapp/campaigns/new` | Create new campaign (3-step wizard) |
| `/insurance/marketing/whatsapp/campaigns/[id]` | Campaign detail + delivery tracking |

### Template management

- List with status badges (`DRAFT` / `PENDING_DLT` / `APPROVED` / `REJECTED`).
- Edit copy + variable placeholders. "Submit for DLT" sets status → `PENDING_DLT`.
- Staff enters `dltTemplateId` when received from BSP. R10+ marks `APPROVED`.
- Only `APPROVED` templates selectable in campaign builder (L13 enforced).
- `REJECTED` templates show `rejectionReason` + option to re-draft.

### Audience builder

Filters: city multi-select, vehicle make multi-select, expiry window (`60d / 30d / 15d / 7d`), last-purchase-window (days-ago), opt-in status. `hasMarketingConsent: true` and `excludeOptedOut: true` hardcoded (L10 — cannot be toggled off). Audience snapshot saved with timestamp; shows count + 3 sample customers.

### Campaign launcher

Select `APPROVED` template → build audience → schedule (now / at-time) → preview before send. L13 slice-level guard re-validated at send time (not just at campaign-builder time). L14 opt-out re-check at dispatch time.

### Delivery tracking

Per-campaign stats (`sent / delivered / read / replied / optedOut / failed`). Polling stub (`setInterval`) updates stats every 10s in mock mode. Per-recipient log table.

### Opt-out registry

List of opted-out customers with reason + timestamp. Manual opt-out addition. CSV export. **L14 enforced**: send-time re-check before each batch dispatch.

### L_P3_1

> WhatsApp campaigns SCHEDULED for future time get re-evaluated against opt-out registry at dispatch time, NOT at audience-build time. New opt-outs in the gap window are honored. `stats.optedOut` incremented for skipped recipients; `stats.failed` is NOT incremented for opt-out skips.

---

## 33. P4 — AI Calling (implementation specifics)

### Feature flag

`feat_insurance_ai_calling` — OFF by default. Turning ON requires OQ4 (DPDP `INSURANCE_CALLING` consent) AND OQ5 (TRAI auto-dialler registration) both resolved. When flag is OFF, UI shows: "AI calling disabled — TRAI registration pending" banner; "Trigger AI Call" button is disabled with tooltip.

### Routes

| Route | Purpose |
|---|---|
| `/insurance/leads/[id]?tab=ai-calls` | Lead detail AI calls tab (already exists in P1) |
| `/insurance/marketing/ai-calls` | Campaign-style multi-call dispatch history |
| `/insurance/marketing/ai-calls/new` | Trigger bulk AI call campaign |

### Per-stage scripts

4 hardcoded scripts: `NEW_LEAD_INTRO` | `FOLLOWUP_NO_RESPONSE` | `NEGOTIATION_DISCOUNT_OFFER` | `EXPIRY_REMINDER`. Each script has an `id`, `name`, `stage`, and `previewText`.

### Voice AI mock dispatch

`triggerAiCall(leadId, scriptId, actor)`:
1. Creates `AICallLog` with `status: 'IN_PROGRESS'` (add status field to `AICallLog`).
2. After 3–7s simulated delay, transitions to `COMPLETED` with mocked transcript + outcome.
3. `isMocked: true` always in P4 (real wiring in P5+ behind same flag).
4. When `isMocked === false` and flag is ON: auto-close-lost on `do-not-call` outcome enabled.

### Outcomes (extended enum)

`interested` | `callback_later` | `not_interested` | `wrong_number` | `do_not_call` | `voicemail` (extends existing outcome enum).

### Auto-followup sequence builder

Per-lead sequence: Step1 WhatsApp +1d, Step2 AI Call +3d, Step3 Manual Call +7d. UI to enable/disable per lead. Persists `followupConfig` on lead.

`Lead.followupConfig: { enabled: boolean; steps: FollowupConfigStep[]; pausedReason?: string }`

`FollowupConfigStep: { kind: 'whatsapp' | 'ai_call' | 'manual_call'; delayDays: number; templateId?: string; scriptId?: string }`

### L_P4_1

> AI call dispatch is feature-flag-gated (`feat_insurance_ai_calling`). Mock dispatch ships in P4; real dispatch in P5+ behind same flag once TRAI auto-dialler registration is confirmed (OQ5).

### L_P4_2

> Auto-followup sequences stored as `Lead.followupConfig: { enabled: boolean; steps: Step[]; pausedReason?: string }`. Each Step has `kind: 'whatsapp' | 'ai_call' | 'manual_call'`, `delayDays: number`, `templateId?` (for whatsapp), `scriptId?` (for ai_call).

---

## 34. P5 — Commission Ledger (implementation specifics)

### Routes

| Route | Purpose | Gate |
|---|---|---|
| `/insurance/commissions` | Monthly ledger summary | R22+, R19 read |
| `/insurance/commissions/[period]` | Period drill-down (policy list) | R22+, R19 read |

### Commission computation

Per closed-won policy: `commissionEarned = round(policy.totalPremium × provider.commissionPct / 100)`.

`commissionGst = round(commissionEarned × 18/100)` — additive, not deducted (L4).

`commissionInvoiceTotal = commissionEarned + commissionGst`.

TDS u/s 194D: 5% on commission > ₹15k/yr per agent. **Informational only** — not deducted from ledger net. Shown as an info line when threshold is crossed.

`commissionNet = commissionEarned` (before GST).

### Provider commission rates (hardcoded)

| Provider | `commissionPct` |
|---|---|
| bajaj-allianz | 14% |
| hdfc-ergo | 13% |
| icici-lombard | 12% |
| reliance-general | 11% |
| digit | 15% |
| cholamandalam | 12% |

### Ledger view

Monthly summary table: period, total premium, commission earned, GST, net receivable. Provider breakdown sidebar. Policy drill-down per period. Paginated (50 rows/page). CSV export (R22+).

### Reconciliation

Status per period: `pending` | `received` | `disputed`. Marking `received` requires R22+ + amount + receipt-doc-ref. R19 is read-only (cannot mark received). R09/R10 cannot access commission ledger at all (store-layer throw).

### L_P5_1

> `commissionEarned = round(totalPremium × commissionPct / 100)`. Provider catalog has hardcoded `commissionPct` field. GST 18% additive (`commissionGst = round(commissionEarned × 18/100)`). TDS u/s 194D 5% on commission > ₹15k/agent/year — informational only, not deducted from ledger.

### L_P5_2

> Commission reconciliation status (`pending` / `received` / `disputed`) is R22+ gated mutation. Receipt doc ref required to mark `received`. R19 has read-only access. R09/R10 receive a store-layer `PermissionError` on any commission ledger read.

---

---

## 35. Renewal Pipeline UX deep-dive

### Drag-drop transition table (L_P2_2)

| From stage | Allowed target stages |
|---|---|
| `due-soon` | `due`, `quoted` |
| `due` | `quoted` |
| `quoted` | `negotiating`, `closed-won`, `closed-lost` |
| `negotiating` | `closed-won`, `closed-lost` |
| `closed-won` | — (immutable) |
| `closed-lost` | — (no re-open in v0; PENDING: appeal flow) |

Invalid drops (backward transitions, same-stage drops, immutable stage) produce a toast error and no state mutation.

### Card content rules

| Field | Display | Internal / customer-facing |
|---|---|---|
| Customer name | Bold, truncated | Internal only (not on share token) |
| Phone (masked) | `+9198···10` mono format | Internal only |
| Vehicle name | `YYYY Make Model` | Internal |
| VIN badge | Full 17-char VIN, copyable | Internal |
| Premium | Best quote `totalPremium`, mono large | Internal (not on public quote share) |
| Expiry chip | Days to expiry (see tier below) | Internal |
| Stage micro-status | Stage-derived label | Internal |

### Expiry chip colour tiers (§35)

| Days to expiry | Chip colour | Semantic |
|---|---|---|
| 31–60 days | Amber (`--state-pending` token) | Due soon — normal priority |
| 8–30 days | Red (`text-warning`) | Due — approaching urgent |
| ≤7 days | Urgent-red (`--state-overdue` token) | Urgent — priority dot shown |

Priority dot (top-right of card) appears only when `lead.priority === 'urgent'` (≤30 days).

### Closing-won workflow detail

1. R10+ drags lead to `closed-won` column OR clicks "Close as Won" action.
2. `ClosePolicyDialog` (modal) prompts: policy number (required), selected quote (dropdown), provider confirmation.
3. On confirm: `insuranceStore.closeLead(leadId, 'won', { policyNumber, quoteId, providerId }, actor)`.
4. Slice calls `useDocsStore.getState().addDocument({ category: 'insurance', ... })` — creates the new `IssuedPolicy` document (L23).
5. Previous insurance document for the same VIN has `supersededBy` set to the new `docId` via `updateDocumentMeta`.
6. Lead stage → `closed-won` — immutable. Card shows green "Policy issued" chip.
7. Audit event `lead_closed_won` appended with policy number in metadata.

### Auto-feed timing (L_INT_1)

- Hydrator calls `syncRenewalFeed()` once on mount of `/insurance/renewal-pipeline`.
- Deferred refresh: "Refresh Expiry Feed" button re-runs `syncRenewalFeed()` manually (not on a timer in v0 to avoid hidden mutations).
- `useNowTick` hook (1-minute interval) updates displayed "days to expiry" labels without re-running the full sync.

### L_P2_2 (new locked decision)

> Renewal Kanban stages map to `Lead.stage` directly. Drag-drop validates forward-only transitions per the table above. `due-soon` and `due` are derived from the `priority` field at auto-feed time, not a runtime computed state.

---

## 36. WhatsApp Marketing UX deep-dive

### Template lifecycle state machine

```
DRAFT ──► PENDING_DLT ──► APPROVED
                │               │
                └──► REJECTED   └──► ARCHIVED
```

- `DRAFT`: editable copy + variables; "Submit for DLT" transitions to `PENDING_DLT`.
- `PENDING_DLT`: read-only pending BSP approval; staff enters `dltTemplateId` when received.
- `APPROVED`: immutable body; can be used in campaigns; can be `ARCHIVED`.
- `REJECTED`: shows `rejectionReason`; option to re-draft (creates new DRAFT copy).
- `ARCHIVED`: no longer selectable in campaign builder; audit trail preserved.

Every state transition is logged to `TemplateAuditEvent` (append-only, stored in audit slice).

### L_P3_2 (new locked decision)

> WhatsApp templates have a 5-state machine: `DRAFT → PENDING_DLT → APPROVED → REJECTED → ARCHIVED`. State transitions logged to `TemplateAuditEvent` (append-only). Re-drafting from REJECTED creates a new DRAFT template (does not mutate the REJECTED one).

### Audience builder

- Filter combinators: city (multi-select: Bangalore / Mumbai / Chennai), vehicle make (multi-select from vehicles fixture), expiry window (60d / 30d / 15d / 7d / any), last purchase window (days-ago slider).
- `hasMarketingConsent: true` and `excludeOptedOut: true` hardcoded on every filter (L10, L14 — cannot be toggled off, not rendered as controls).
- Saved segments: staff can name + save a filter set as a "Segment" (e.g. "BMW owners expiring 30d"). Segments stored in store; reloadable in future campaigns.
- Live count: audience count re-computed on filter change (debounced 500ms).

### Campaign launch flow

1. Select `APPROVED` template.
2. Build audience (filter combinators or saved segment).
3. **Schedule preview**: shows send time (now / future picker) + sample 5 recipients (name + masked phone) before final send. "Send now" confirmation dialog.
4. **Sample display rule**: up to 5 recipients sampled from audience; PII masked per L8; showing phone last-2 only.
5. L13 slice re-validates template is still `APPROVED` at dispatch time.
6. L14 opt-out re-check at dispatch time — new opt-outs since audience snapshot are skipped.

### Delivery tracking

- Per-campaign real-time stats bar: targeted / sent / delivered / read / replied / optedOut / failed.
- Mock polling: `setInterval(10_000)` updates stats with simulated delivery progression. Polling starts on campaign detail page mount; stops on unmount.
- Per-recipient log table: recipient masked, status per message, timestamp. PENDING: paginated (>50 rows).

### Opt-out CSV import

Format spec:
```
customerId,reason,optedOutAt
customer-001,customer_request,2026-04-20T10:00:00Z
```
- Columns: `customerId` (required), `reason` (optional), `optedOutAt` (optional, defaults to import time).
- Validation: `customerId` must exist in customers fixture (v0); unknown IDs shown as warning (not error) — import continues.
- Duplicate entries (same customerId already in opt-out list) are silently skipped.
- Import result shows: added count + skipped count + warning count.

---

## 37. AI Calling UX deep-dive

### Script playground

- Scripts stored as `AiCallScript` entities: `{ scriptId, name, stage, bodyText, variables: string[] }`.
- Variables injected via `{variableName}` syntax: available placeholders: `{customerName}`, `{vehicleMakeModel}`, `{expiryDate}`, `{quotedPremium}`, `{advisorName}`.
- Per-stage scripts: one script per `InsuranceLeadStage` (configurable; default scripts provided).
- Variable substitution in v0 is **client-side preview only** (filled from lead fixture). Real substitution happens server-side at dispatch in v0.2 per Doc 13 integration contract.
- Script editor: raw body text + variable highlight overlay + preview panel (shows rendered example with sample values).

### L_P4_3 (new locked decision)

> AI calling scripts stored as `AiCallScript` entities with variable placeholders (`{customerName}`, `{vehicleMakeModel}`, `{expiryDate}`, `{quotedPremium}`, `{advisorName}`). Variable substitution happens server-side at dispatch (mocked in v0 — fills from lead fixture).

### Outcome capture flow

6 outcomes (extended enum per §33):

| Outcome | Follow-up action |
|---|---|
| `interested` | Prompt to advance stage to `negotiating` |
| `callback_later` | Schedule callback (date-time picker) |
| `not_interested` | Option to close-lost with `lost` reason |
| `wrong_number` | Flag lead for manual review |
| `do_not_call` | Close-lost + add to opt-out list (L14 |
| `voicemail` | Auto-schedule next follow-up step |

Transcript displayed in expandable card below outcome selector. Outcome selection required before closing the call modal.

### Compliance banner

A permanent top banner on all `/insurance/marketing/ai-calls/*` routes:

> "⚠ AI calling is disabled — TRAI auto-dialler registration pending (OQ5). Contact compliance@bnautomobiles.com to complete registration."

Banner is non-dismissible in v0. Rendered regardless of `feat_insurance_ai_calling` flag state.

### Future: real dispatch (v0.2)

Integration contract per Doc 13 §voice-ai. API call structure:
```
POST /api/voice-ai/dispatch
{ leadId, scriptId, recipientPhone, variables: Record<string, string> }
```
Response: `{ callId, status: 'QUEUED' }`. Status polling via WebSocket or long-poll (Doc 13 specifies). In v0 this is fully mocked; the interface contract is frozen.

---

## 38. Commission Ledger UX deep-dive

### Period selector

- Toggle: Month / Quarter / FY (financial year April–March).
- Default: current month.
- Month view: shows individual monthly periods.
- Quarter view: groups months (Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar).
- FY view: aggregates all 12 months into a single FY row.

### Per-policy drill-down

- Click on a period → policy list for that period with per-policy details: VIN, customer, provider, premium, commission earned, GST, status.
- Reconciliation actions per period (not per-policy):
  - `pending` → "Mark Received" (R22+ only): modal asking for received amount + receipt doc ref (PENDING: doc picker).
  - `received` → "Dispute" (R22+ only): opens dispute reason textarea.
  - `disputed` → "Resolve" (R22+ only): resets to `received` with note.

### Provider breakdown

- Sidebar (or expandable section) in period drill-down: which provider contributed most commission in the period.
- Sorted by `commissionEarned` desc.
- Shows: provider name, policy count, total premium, commission earned, effective rate %.

### Export (R22+ only)

CSV format with all fields:
```
policyNumber,vin,customerId,providerId,totalPremium,commissionEarned,commissionGst,commissionInvoiceTotal,tdsPct,tdsNote,periodStart,periodEnd,reconciliationStatus
```
- GST split: `commissionEarned` + `commissionGst` as separate columns.
- TDS column: shows 5% of `commissionEarned` for informational display; shows note "Above threshold" or "Below threshold" per agent per FY.
- Export button gated: R22+ only; R19 sees the table but not the export button.

### Finance reviewer sign-off

Per CLAUDE.md §6: Finance reviewer sign-off **REQUIRED** before P5 deploys to production. Finance reviewer must review:
1. Commission calculation formula (L_P5_1).
2. GST 18% additive treatment (L4).
3. TDS 194D informational display.
4. Reconciliation audit trail.
5. CSV export field completeness.

### L_P5_3 (new locked decision)

> Commission reconciliation status changes are audited in `CommissionReconciliationEvent` (append-only). R22+ to mark received; receipt doc ref required. Status transitions: `pending → received → disputed → received`. No direct `pending → disputed` allowed.

---

## 39. Cross-module integration polish

### Cross-store read seams

All cross-module reads use `useStore.getState()` (one-shot read, no subscription per L_INT_1):

| Field | Source | Consumer |
|---|---|---|
| `InsuranceLead.vin` | `useVehiclesStore.getState().vehicles[vin]` | Kanban card vehicle name |
| `InsuranceLead.customerId` | `useCustomersStore.getState().customers[customerId]` | Card customer name + phone |
| Closing-won: new IssuedPolicy | `useDocsStore.getState().addDocument(...)` | Policy document write-back |
| Auto-feed: expiring policies | `useDocsStore.getState().documents.filter(d => d.category === 'insurance')` | Renewal hydrator reads expiry dates |

### L_INT_1 (new locked decision)

> Insurance store cross-module reads use `useStore.getState()` only — no subscriptions. Hydrator (`syncRenewalFeed`) runs auto-feed once on mount; UI re-runs auto-feed only when user clicks "Refresh Expiry Feed" button. No background polling in v0.

### Closing-won document write-back (detailed)

```ts
// Step 1: create new IssuedPolicy doc via docs-store
const newDocId = `doc-ins-${leadId}-${Date.now()}`;
useDocsStore.getState().addDocument({
  docId: newDocId,
  category: 'insurance',
  vin: lead.vin,
  policyNumber: meta.policyNumber,
  issuedAt: now,
  expiresAt: /* policy.periodEnd */,
  providerId: meta.providerId,
});

// Step 2: supersede old insurance document for same VIN
const oldDoc = useDocsStore.getState().documents.find(
  d => d.category === 'insurance' && d.vin === lead.vin && !d.supersededBy
);
if (oldDoc) {
  useDocsStore.getState().updateDocumentMeta(oldDoc.docId, { supersededBy: newDocId });
}
```

### New locked decisions (§39)

| # | Decision |
|---|---|
| L_P2_2 | Renewal Kanban stages map to `Lead.stage` directly. Drag-drop validates forward-only transitions. `due-soon` and `due` are derived stages from `priority` field set at auto-feed time, not a computed runtime state. |
| L_P3_2 | WhatsApp templates have a 5-state machine: `DRAFT → PENDING_DLT → APPROVED → REJECTED → ARCHIVED`. State transitions logged to `TemplateAuditEvent` (append-only). |
| L_P4_3 | AI calling scripts stored as `AiCallScript` entities with variable placeholders. Variable substitution happens server-side at dispatch (mock for v0). |
| L_P5_3 | Commission reconciliation status changes audited in `CommissionReconciliationEvent`. R22+ to mark received; receipt doc ref required. |
| L_INT_1 | Insurance store cross-module reads use `useStore.getState()` only — no subscriptions. Hydrator runs auto-feed once on mount; UI re-runs auto-feed only when explicit user action "Refresh Expiry Feed" clicked. |
| L_P3_3 | Bulk lead import accepts CSV + XLSX. SheetJS (`xlsx` package, `^0.18.5`) used for XLSX parsing. `XLSX.read(buffer, { type: 'array' })` → first sheet → `sheet_to_json({ raw: false })` → same `RowSchema` Zod validation as CSV. Sample templates (CSV data-URI + XLSX generated client-side via `XLSX.utils.book_new()` + `XLSX.writeFile()`) are downloadable from the import page header. Dependency justified: SheetJS is the de-facto standard for client-side Excel parsing; no server round-trip required. |
| L_P5_4 | Close-policy modal (`ClosePolicyDialog`) is R10+ gated (store action re-validates). Won path: `policyNumber` (16-digit IRDAI format, regex `/^\d{16}$/`) + `selectedQuoteId` are required; period-end auto-fills to +1 year from period-start. Lost path: `reason` enum (`'better-quote-elsewhere' \| 'do-not-contact' \| 'duplicate' \| 'price-too-high' \| 'other'`) is required; notes are optional. Both paths emit audit events (`lead_closed_won` / `lead_closed_lost`). Dropping a Kanban card on the `closed-won` column opens this modal as a confirmation step with best-quote pre-filled. |
| L_INT_2 | Renewal Kanban DnD uses live `useStaffAuth()` actor — never hardcoded. Sub-R09 sees toast "Insufficient role for stage transitions". Unauthenticated (null `user`) sees toast "Sign in required to move leads". Dropping to `closed-won` opens `ClosePolicyDialog` as confirmation; dropping to `closed-lost` requires R10+. |

---

## 41. UX items shipped (2026-04-29)

### Close-policy dialog (L_P5_4)

`apps/staff-web/src/components/insurance/dialogs/close-policy-dialog.tsx`

Triggered from:
- Lead detail view top-right "Close Lead" button (visible when stage is `quoted` or `negotiating`; hidden otherwise).
- Renewal Kanban: dropping a card on `closed-won` column.

Won form fields: selectedQuoteId (radio), policyNumber (required, 16-digit IRDAI), periodStart (date), periodEnd (date, auto +1yr from start), totalPremium (auto from quote, editable), selectedAddons (checkboxes from quote's `availableAddons`), policyDocFilename (stub — filename only).

Lost form fields: reason enum dropdown (required), notes textarea (optional).

Submit calls `closeLead(leadId, reason, meta, actor)` from insurance store. Both paths emit audit events. Toast confirms on success.

### DnD actor resolution (L_INT_2)

`apps/staff-web/src/components/insurance/renewal-pipeline-view.tsx`

`handleDrop` now reads `user` from `useStaffAuth()`:
- `user === null` → toast "Sign in required to move leads." and return.
- `rankRole(user.role) < 9` → toast "Insufficient role for stage transitions." and return.
- `targetStage === 'closed-won'` → open `ClosePolicyDialog` (not direct `advanceStage`).
- `targetStage === 'closed-lost' && rankRole < 10` → toast "Insufficient role for stage transitions." and return.
- Otherwise → `advanceStage(leadId, targetStage, { id: user.id, name: user.name, role: user.role })`.

### XLSX bulk import (L_P3_3)

`apps/staff-web/src/components/insurance/lead-bulk-import-view.tsx`

`xlsx` package added to `@dms/staff-web` dependencies (`^0.18.5`). File input now accepts `.csv,.xlsx,.xls`. Type detected by extension. XLSX path uses `XLSX.read(buffer, { type: 'array' })` → `sheet_to_json({ raw: false })` → same `RowSchema` Zod validation. Parse errors surface as inline error banner. XLSX Template button calls `downloadXLSXTemplate()` which builds a workbook client-side with column headers + sample row.

---

## 40. Insurance provider names (canonical)

Correct IRDAI-registered general insurance provider names used in this module:

| ID | Correct name | Notes |
|---|---|---|
| `bajaj-allianz` | Bajaj Allianz General Insurance | General insurance (not life) |
| `hdfc-ergo` | HDFC ERGO General Insurance | General insurance; NOT HDFC Life |
| `icici-lombard` | ICICI Lombard General Insurance | General insurance |
| `reliance-general` | Reliance General Insurance | |
| `digit` / `go-digit` | Go Digit General Insurance (Digit) | Digit is the brand; full name is Go Digit |
| `cholamandalam` | Cholamandalam MS General Insurance | |
| `tata-aig` | TATA AIG General Insurance | NOTE: TATA AIG (general) — NOT TATA AIA (life insurance) |
| `royal-sundaram` | Royal Sundaram General Insurance | Subsidiary of Sundaram Finance |
| `acko` | Acko General Insurance | |

**TATA AIA is a life insurance company — it is NOT used in this module.** Always use TATA AIG for motor/general insurance.

---

## 42. Compare flow enhancements (2026-04-29)

The `/insurance/quote/new` Compare view evolved from a flat input form to a structured customer→vehicle→underwriting picker matching the custom-builds wizard pattern.

### §42.1 Customer picker

- **Existing customer mode** (default): typeahead search across `useCustomersStore.customers` (filtered to non-dealer customers). Match against name / email / phone. Select populates `customerInput.panLast4`, `customerInput.city` (from `Customer.preferredCity`).
- **New customer mode**: inline form (name, phone, age, email). On "Save as new lead", customer record is created via `useCustomersStore.createCustomer` (P3.3.4 `customerCreatedDuringWizard` flag carries forward to lead audit).
- Toggle UI: pill buttons at top of customer section.

### §42.2 Vehicle picker

When an existing customer is selected, two sub-modes:

- **Linked mode** (default): shows vehicles from `useVehiclesStore.selectVehiclesByCustomer(customerId)` filtered to `state === 'ACTIVE'`. Selecting one auto-populates VIN / make / model / variant / year / color / odometer.
- **Manual mode**: free-form fields (used for new customers automatically).

For new customers, only Manual mode is available.

### §42.3 Extended underwriting fields (always visible)

Beyond the original (VIN, make, year, exShowroom, NCB, age):

| New field | Type | Source |
|---|---|---|
| Variant | string (optional) | Manual or linked vehicle |
| Color | string (optional) | Manual or linked vehicle |
| Fuel type | enum: petrol \| diesel \| cng \| electric \| hybrid | Manual |
| Registration state | 2-char code (e.g. KA, MH, TN) | Manual |
| Odometer (km) | integer | Manual or linked vehicle |
| Prior claims count | integer (0+) | Manual underwriting input |
| Customer city | enum: bangalore \| mumbai \| chennai | From `Customer.preferredCity` or manual |
| PAN last-4 | 4-char string | From `Customer.pan` or manual |

### §42.4 Compare result actions (existing, recap)

After quotes generate, three CTAs sit above the results grid:

- **Attach to existing lead** — opens `AttachToLeadDialog` with searchable lead picker (filtered to `stage !== 'closed-*'`). Selecting saves all current quotes to that lead via `saveQuote(leadId, quote)` and routes to `/insurance/leads/[id]`.
- **Send via WhatsApp** — opens `WhatsAppShareDialog` with editable message preview (top-3 quotes by total premium, provider name + total + CSR%). Optional phone field. Opens `wa.me/{phone}?text=...` in new tab. **Note**: this is a one-off share, not a DLT-approved campaign — bulk marketing must use the templates flow (L13).
- **Save as new lead** — stashes the current comparison in `sessionStorage['bn-insurance-comparison-handoff']` and routes to `/insurance/leads/new?from=compare`. The new-lead form picks up the stash and creates the lead with quotes pre-attached.

### §42.5 Locked decisions

| # | Decision | Rationale |
|---|---|---|
| L_P1_5 | **Compare flow uses customer→vehicle→underwriting structured input.** Existing customer search via `useCustomersStore`; linked vehicle picker via `selectVehiclesByCustomer`; manual entry as fallback. Mirrors custom-builds new-flow wizard pattern. | Reduces data-entry error; enables auto-fill from existing records; matches DPDP requirement to never re-enter PII unnecessarily. |
| L_P1_6 | **Extended underwriting fields**: fuel type, registration state, odometer, prior claims count, PAN last-4. Comparison engine accepts these without mandating them; missing optional fields fall through to provider default rates. | Closer match to real IRDAI motor insurance underwriting; future plug-in to actual provider APIs is straightforward. |
| L_P1_7 | **Compare → Lead handoff via sessionStorage** key `bn-insurance-comparison-handoff` (JSON `{ vehicleInput, customerInput, quotes }`). New-lead form reads + clears on mount. | Avoids URL-bloat from JSON in query string; sessionStorage cleared on tab close so handoff doesn't leak across sessions. |

---

## 43. Module status — feature inventory

Single source of truth for what's shipped vs planned. Update this section every release.

### Shipped

| Phase / area | Status | Notes |
|---|---|---|
| P1 Catalog + comparison | ✅ shipped | 6 providers, 30 leads, 25 historical policies fixture |
| P1 Quote sharing (single quote token) | ✅ shipped | 14-day TTL, public preview at `/quote-preview/[token]` |
| P1.5 Compare flow customer/vehicle picker | ✅ shipped | Existing customer search + linked vehicle dropdown + manual fallback (§42) |
| P1.5 Compare → WhatsApp share | ✅ shipped | One-off `wa.me` link with editable message preview |
| P1.5 Compare → Attach to existing lead | ✅ shipped | Lead picker dialog → `saveQuote` per quote |
| P1.5 Compare → Save as new lead | ✅ shipped | sessionStorage handoff to `/insurance/leads/new` |
| P2 Renewal pipeline (auto-feed from docs) | ✅ shipped | Kanban + List toggle (L_P2_3), drag-drop, expiry tier colors |
| P3 WhatsApp marketing (templates + campaigns) | ✅ shipped | DLT enforcement L13, send-time opt-out re-check L14, audience builder, delivery stats polling |
| P4 AI calling | ✅ shipped behind `feat_insurance_ai_calling` flag | Mock dispatch; real dispatch blocked on TRAI registration (OQ5) |
| P5 Commission ledger | ✅ shipped | R22+ reconciliation, GST 18% additive, TDS info-only |
| Provider detail page | ✅ shipped | `/insurance/providers/[id]` |
| Lead detail page (Owner / Vehicle / Source cards) | ✅ shipped | WhatsApp + AI Call buttons, Edit Lead modal, `updateLead` action |
| Audit log view | ✅ shipped | `/insurance/audit` R12+ |
| Lead bulk import | ✅ shipped | CSV + XLSX (SheetJS) per L_P3_3 |
| Close-policy dialog | ✅ shipped | Won + Lost paths, R10+ gate, audit emission |

### Planned / pending

| Item | Reason / blocker | Target |
|---|---|---|
| Real WhatsApp BSP integration | Currently `wa.me` deep-link only; production needs Gupshup/Twilio BSP | v0.2 |
| Real voice-AI dispatch | Blocked on TRAI auto-dialler registration (OQ5) | v0.2 once TRAI clears |
| Email sharing for comparison | Currently WhatsApp-only | v0.2 (low priority) |
| Public comparison preview page | Currently each quote can be shared individually; no combined comparison link | v0.2 |
| Renewal-pipeline Kanban DnD across stages | Forward-only currently; backwards transitions require role gate review | v0.2 |
| Multi-quote bundle e-sign | No e-sign integration | v1.0 |
| Real DLT template approval flow | Currently mocked status transitions | v1.0 — needs DLT BSP wiring |

---

## 22. Changelog

| Date | Change |
|---|---|
| 2026-04-28 | Spec version 1.0 created. Status: draft. |
| 2026-04-28 | Review fixes applied (B1–B6). L13–L18 added (existing L13–L20 renumbered to L19–L26). AI calling deferred to display-only in P3 + feature-flagged P4. OQ4 + OQ5 lifted to P4 hard-prerequisites. S9 updated (no auto-mutation). S13–S17 added. `QuoteCardPropsSchema` added to §3.2. `discountPct` + `discountApprovalRefId` added to `InsuranceQuote`. `applyDiscount` + `sendTemplateMessage` added to store contract. Discount fixture (§12.6) added. `marketingConsentGiven` defaults `false`. Status → approved. |
| 2026-04-29 | v2.0 — §31–§34 added: P2 renewal pipeline, P3 WhatsApp marketing, P4 AI calling, P5 commission ledger. New locked decisions L_P2_1, L_P3_1, L_P4_1, L_P4_2, L_P5_1, L_P5_2 added. `LeadSourceEnum` introduced. `AICallLog.status` field added. `followupConfig` shape on `InsuranceLead` formalized. Commission reconciliation status + R22+ gate documented. |
| 2026-04-29 | v2.1 — §35–§40 added: Renewal Pipeline UX deep-dive, WhatsApp Marketing UX deep-dive, AI Calling UX deep-dive, Commission Ledger UX deep-dive, Cross-module integration polish, Canonical provider names. New locked decisions L_P2_2, L_P3_2, L_P4_3, L_P5_3, L_INT_1. `InsuranceAuditEvent` type added to `@dms/types`. `auditEvents` state + `appendAuditEvent`/`getAuditEvents` actions added to insurance store. Kanban rebuilt to match sales/custom-builds canonical pattern. Provider detail page, Lead bulk import, and Audit log views shipped. |
| 2026-04-29 | v2.2 — Close-policy modal (`ClosePolicyDialog`) implemented. DnD actor resolved from `useStaffAuth()` (L_INT_2). XLSX bulk import via SheetJS (L_P3_3). New locked decisions: L_P3_3, L_P5_4, L_INT_2. §41 added. Spec version: 2.2. |
| 2026-04-29 | v2.3 — L_P2_3 added: Renewal pipeline Kanban + List view toggle via `?view=kanban\|list` URL state. `LeadListView` component shipped (`lead-list-view.tsx`). List view sortable by stage / days-to-expiry (default) / last-activity / premium. Mirrors sales + custom-builds canonical pattern. |

---

### New locked decision (v2.3)

| # | Decision |
|---|---|
| L_P2_3 | Renewal pipeline supports Kanban + List view via `?view=kanban\|list` URL state. Default is `kanban` (no param). List view sortable by stage / expiry / activity / premium. Mirror sales + custom-builds canonical pattern (`CustomBuildsBoard` + `BuildJobListView`). |

---

---

## Changelog — v2.4 (2026-04-29)

### Features implemented

**Feature 1 — ManualCallOutcomeDialog (§5.7)**
- New component: `apps/staff-web/src/components/insurance/dialogs/manual-call-outcome-dialog.tsx`
- New type: `ManualFollowupOutcomeEnum` + `ManualCallRecordSchema` added to `packages/types/src/domain/insurance.ts`
- New store action: `recordFollowupOutcome(leadId, stepIndex, outcome, notes, actor, nextActionAt?)` in `lead-slice.ts`
  - Updates `lead.followupSequenceState.currentStepIndex` and `lastOutcome`
  - Appends `ManualCallRecord` to store `manualCallLog`
  - Emits new audit event kind `followup_outcome_recorded`
  - Validates: notes ≥ 10 chars; `nextActionAt` required for `COMPLETED_FOLLOW_LATER`; R09+ gate
- New audit event kind `followup_outcome_recorded` added to `InsuranceAuditEventKindEnum`
- `LeadDetailView` updated: `FollowupSequencePanel` inline component added showing current step + "Mark done" / "Skip" buttons (R09+ gated); both open `ManualCallOutcomeDialog`
- Destructive SKIPPED_* outcomes show a secondary `AlertDialog` confirmation before submitting

**Feature 2 — Overdue Followups banner on `/insurance/leads` (§5.7)**
- `LeadListView` updated:
  - `OverdueBanner` component: renders count of leads with `nextDueAt < now` (not closed, not paused). Hidden when count = 0.
  - Clickable banner → sets `?overdue=1` URL param to filter table to overdue-only
  - "Mark all as not-reached" bulk action (R10+ gated) → `AlertDialog` confirmation → `bulkMarkOverdueNotReached`
- New store action: `bulkMarkOverdueNotReached(leadIds, actor)` — R10+ gated; batch calls `recordFollowupOutcome` with `SKIPPED_NO_REACH` for each lead
- `tickFollowups` fixed to skip `closed-won` / `closed-lost` leads
- `InsuranceState.manualCallLog: ManualCallRecord[]` added to store state

**Feature 3 — 5 analytics events (§11)**
- New helper: `apps/staff-web/src/lib/insurance/analytics.ts`
  - `trackInsuranceEvent` typed wrapper over existing `src/lib/analytics.ts` `track()`
  - Five events: `insurance_lead_created`, `insurance_quote_generated`, `insurance_quote_shared`, `insurance_lead_closed_won`, `insurance_lead_closed_lost`
- Wired in `lead-slice.ts`: `createLead` → `insurance_lead_created`; `closeLead(won)` → `insurance_lead_closed_won`; `closeLead(lost)` → `insurance_lead_closed_lost`
- Wired in `quote-slice.ts`: `saveQuote` → `insurance_quote_generated`; `generateShareToken` → `insurance_quote_shared`
- New test file: `apps/staff-web/src/tests/insurance-analytics.test.ts` — 155 total tests passing (9 test files)

*Spec version: 2.4 — 2026-04-29. Status: approved.*
