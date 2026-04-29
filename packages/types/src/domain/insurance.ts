/**
 * Insurance domain types.
 *
 * Spec reference: SPEC-INSURANCE-001 §3
 * Locked decisions: L2 (IRDAI disclosure), L6 (token expiry), L9 (DLT),
 *   L13 (slice-level DLT guard), L15 (consent default false), L16 (fail-closed),
 *   L18 (discount >10% R12+)
 */

import { z } from 'zod';

// ─── Addon definition ─────────────────────────────────────────────────────────

export const AddonDefinitionSchema = z.object({
  code: z.string(), // 'zero-dep' | 'engine-protect' | 'rsa' | 'rti' | 'key-replacement'
  // | 'consumables' | 'ncb-protect' | 'tyre-cover'
  label: z.string(),
  premiumBasis: z.enum(['flat', 'idv-pct', 'vehicle-age-slab']),
  available: z.boolean(),
});
export type AddonDefinition = z.infer<typeof AddonDefinitionSchema>;

// ─── Insurance Provider ───────────────────────────────────────────────────────

export const InsuranceProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().url(),
  irdaiRegNo: z.string(),
  claimSettlementRatio: z.number().min(0).max(100),
  networkGaragesCount: z.number().int(),
  idvMultiplier: z.number(),
  ncbSlabs: z.array(
    z.object({
      yearsNoClaim: z.number().int(),
      discountPct: z.number(),
    }),
  ),
  addonCatalog: z.array(AddonDefinitionSchema),
  commissionPct: z.number(),
  active: z.boolean(),
});
export type InsuranceProvider = z.infer<typeof InsuranceProviderSchema>;

// ─── Insurance Quote ──────────────────────────────────────────────────────────

export const InsuranceQuoteSchema = z.object({
  quoteId: z.string(),
  leadId: z.string(),
  providerId: z.string(),
  ownDamagePremium: z.number(),
  thirdPartyPremium: z.number(),
  totalPremium: z.number(),
  idv: z.number(),
  deductible: z.number(),
  ncbApplied: z.number(),
  ncbPct: z.number(),
  availableAddons: z.array(z.string()),
  selectedAddons: z.array(z.string()),
  generatedAt: z.string().datetime(),
  shareToken: z.string().optional(),
  shareTokenExpiresAt: z.string().datetime().optional(),
  status: z.enum(['active', 'shared', 'expired', 'converted']),
  // L18 / B6: discount > 10% requires R12+ approval
  discountPct: z.number().min(0).max(100).optional(),
  discountApprovalRefId: z.string().optional(),
});
export type InsuranceQuote = z.infer<typeof InsuranceQuoteSchema>;

// ─── QuoteCard props schema — IRDAI fail-closed (L16 / B4) ───────────────────

export const QuoteCardPropsSchema = z.object({
  provider: z.object({
    irdaiRegNo: z.string().min(1),
    claimSettlementRatio: z.number().min(0).max(100),
    name: z.string(),
    logoUrl: z.string().url(),
    networkGaragesCount: z.number().int(),
  }),
  quote: InsuranceQuoteSchema,
  onAddonChange: z.function().optional(),
});
export type QuoteCardProps = z.infer<typeof QuoteCardPropsSchema>;

// ─── Lead stage ───────────────────────────────────────────────────────────────

export const InsuranceLeadStageEnum = z.enum([
  'due-soon',
  'due',
  'quoted',
  'negotiating',
  'closed-won',
  'closed-lost',
]);
export type InsuranceLeadStage = z.infer<typeof InsuranceLeadStageEnum>;

// ─── Manual followup outcome (§5.7) ──────────────────────────────────────────

export const ManualFollowupOutcomeEnum = z.enum([
  'COMPLETED_QUOTE_SHARED',
  'COMPLETED_NOT_INTERESTED',
  'COMPLETED_FOLLOW_LATER',
  'SKIPPED_NO_REACH',
  'SKIPPED_OTHER',
]);
export type ManualFollowupOutcome = z.infer<typeof ManualFollowupOutcomeEnum>;

/** Appended to lead.callLog when a follow-up step is manually completed or skipped */
export const ManualCallRecordSchema = z.object({
  callId: z.string(),
  leadId: z.string(),
  kind: z.literal('MANUAL_OUTCOME'),
  stepIndex: z.number().int(),
  outcome: ManualFollowupOutcomeEnum,
  notes: z.string().min(10),                     // required, min 10 chars
  nextActionAt: z.string().datetime().optional(), // only for COMPLETED_FOLLOW_LATER
  actorId: z.string(),
  actorRole: z.string(),
  recordedAt: z.string().datetime(),
});
export type ManualCallRecord = z.infer<typeof ManualCallRecordSchema>;

// ─── Followup sequence ────────────────────────────────────────────────────────

export const FollowupSequenceStateSchema = z.object({
  currentStepIndex: z.number().int().default(0),
  nextDueAt: z.string().datetime().optional(),
  lastOutcome: z.string().optional(),
  paused: z.boolean().default(false),
  completedAt: z.string().datetime().optional(),
});
export type FollowupSequenceState = z.infer<typeof FollowupSequenceStateSchema>;

export const FollowupStepSchema = z.object({
  stepIndex: z.number().int(),
  channel: z.enum(['whatsapp', 'ai-call', 'manual-call']),
  delayDays: z.number().int(),
  templateId: z.string().optional(),
  scriptId: z.string().optional(),
  slaHours: z.number().int(),
  skipConditions: z.array(z.string()),
});
export type FollowupStep = z.infer<typeof FollowupStepSchema>;

// ─── Lead source (P2) ────────────────────────────────────────────────────────

export const LeadSourceEnum = z.enum([
  'MANUAL',        // created directly by staff
  'AUTO_RENEWAL',  // auto-fed from docs-slice expiry scan (§31 L_P2_1)
  'COMPARE',       // created from comparison engine flow
]);
export type LeadSource = z.infer<typeof LeadSourceEnum>;

// ─── Followup config (P4 L_P4_2) ─────────────────────────────────────────────

export const FollowupConfigStepSchema = z.object({
  kind: z.enum(['whatsapp', 'ai_call', 'manual_call']),
  delayDays: z.number().int(),
  templateId: z.string().optional(),  // for whatsapp steps
  scriptId: z.string().optional(),    // for ai_call steps
});
export type FollowupConfigStep = z.infer<typeof FollowupConfigStepSchema>;

export const FollowupConfigSchema = z.object({
  enabled: z.boolean().default(false),
  steps: z.array(FollowupConfigStepSchema),
  pausedReason: z.string().optional(),
});
export type FollowupConfig = z.infer<typeof FollowupConfigSchema>;

// ─── Insurance Lead ───────────────────────────────────────────────────────────

export const InsuranceLeadSchema = z.object({
  leadId: z.string(),
  vin: z.string(),
  customerId: z.string(),
  assignedAdvisorId: z.string(),
  outlet: z.enum(['bangalore', 'mumbai', 'chennai']),
  stage: InsuranceLeadStageEnum,
  // P2: source + priority
  source: LeadSourceEnum.optional(),
  priority: z.enum(['urgent', 'normal']).optional(),
  expiresAt: z.string().datetime().optional(),  // policy expiry date driving renewal
  odometer: z.number(),
  customerAge: z.number().int(),
  customerCity: z.string(),
  panLast4: z.string().length(4),
  noClaimBonusYears: z.number().int().min(0).max(5),
  quotes: z.array(InsuranceQuoteSchema),
  issuedPolicyId: z.string().optional(),
  followupSequenceState: FollowupSequenceStateSchema,
  // P4 L_P4_2: auto-followup config
  followupConfig: FollowupConfigSchema.optional(),
  // L15 / B3: defaults false; explicit opt-in required before audience inclusion
  marketingConsentGiven: z.boolean().default(false),
  marketingConsentAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().optional(),
  closedReason: z.enum(['won', 'lost', 'duplicate', 'do-not-contact']).optional(),
});
export type InsuranceLead = z.infer<typeof InsuranceLeadSchema>;

// ─── Claim record ─────────────────────────────────────────────────────────────

export const ClaimRecordSchema = z.object({
  claimId: z.string(),
  claimDate: z.string().date(),
  claimAmount: z.number(),
  settledAmount: z.number().optional(),
  status: z.enum(['filed', 'under-review', 'settled', 'rejected']),
  description: z.string().optional(),
});
export type ClaimRecord = z.infer<typeof ClaimRecordSchema>;

// ─── Issued Policy ────────────────────────────────────────────────────────────

export const IssuedPolicySchema = z.object({
  policyId: z.string(),
  leadId: z.string(),
  vin: z.string(),
  customerId: z.string(),
  providerId: z.string(),
  policyNumber: z.string(),
  policyType: z.enum(['comprehensive', 'third-party', 'standalone-od']),
  totalPremium: z.number(),
  idv: z.number(),
  selectedAddons: z.array(z.string()),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  docId: z.string(),
  commissionEarned: z.number(),
  commissionGst: z.number(),
  advisorId: z.string(),
  issuedAt: z.string().datetime(),
  renewedFromPolicyId: z.string().optional(),
  claimHistory: z.array(ClaimRecordSchema),
});
export type IssuedPolicy = z.infer<typeof IssuedPolicySchema>;

// ─── WhatsApp template ────────────────────────────────────────────────────────

export const WhatsAppTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string(),
  dltTemplateId: z.string().optional(),
  category: z.enum(['renewal-reminder', 'quote-share', 'follow-up', 'promotion', 'welcome']),
  bodyText: z.string(),
  variables: z.array(z.string()),
  status: z.enum(['DRAFT', 'PENDING_DLT', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type WhatsAppTemplate = z.infer<typeof WhatsAppTemplateSchema>;

// ─── WhatsApp campaign ────────────────────────────────────────────────────────

export const AudienceFilterSchema = z.object({
  cities: z.array(z.enum(['bangalore', 'mumbai', 'chennai'])).optional(),
  vehicleMakes: z.array(z.string()).optional(),
  expiryWindowDays: z.number().int().optional(),
  lastPurchaseDaysAgo: z.number().int().optional(),
  hasMarketingConsent: z.literal(true),
  excludeOptedOut: z.literal(true),
});
export type AudienceFilter = z.infer<typeof AudienceFilterSchema>;

export const WhatsAppCampaignSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  templateId: z.string(),
  audienceFilter: AudienceFilterSchema,
  scheduledAt: z.string().datetime().optional(),
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
export type WhatsAppCampaign = z.infer<typeof WhatsAppCampaignSchema>;

// ─── Commission reconciliation (P5 L_P5_2) ───────────────────────────────────

export const CommissionReconciliationStatusEnum = z.enum(['pending', 'received', 'disputed']);
export type CommissionReconciliationStatus = z.infer<typeof CommissionReconciliationStatusEnum>;

export const CommissionPeriodSchema = z.object({
  periodId: z.string(),           // e.g. '2026-04' for April 2026
  periodLabel: z.string(),        // e.g. 'April 2026'
  totalPremium: z.number(),
  commissionEarned: z.number(),
  commissionGst: z.number(),
  commissionInvoiceTotal: z.number(),
  policyCount: z.number().int(),
  reconciliationStatus: CommissionReconciliationStatusEnum,
  receivedAmount: z.number().optional(),
  receiptDocRef: z.string().optional(),
  reconciledBy: z.string().optional(),
  reconciledAt: z.string().datetime().optional(),
});
export type CommissionPeriod = z.infer<typeof CommissionPeriodSchema>;

// ─── AI call log ──────────────────────────────────────────────────────────────

export const AICallStatusEnum = z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED']);
export type AICallStatus = z.infer<typeof AICallStatusEnum>;

export const AICallOutcomeEnum = z.enum([
  'interested',
  'callback',
  'callback_later',
  'not-interested',
  'not_interested',
  'wrong-number',
  'wrong_number',
  'do-not-call',
  'do_not_call',
  'voicemail',
]);
export type AICallOutcome = z.infer<typeof AICallOutcomeEnum>;

export const AICallLogSchema = z.object({
  callId: z.string(),
  leadId: z.string(),
  stage: InsuranceLeadStageEnum,
  scriptId: z.string().optional(),       // P4: which script was used
  status: AICallStatusEnum.default('COMPLETED'),  // P4: dispatch state
  calledAt: z.string().datetime(),
  durationSeconds: z.number().int().optional(),
  transcript: z.string().optional(),
  outcome: z.enum(['interested', 'callback', 'not-interested', 'wrong-number', 'do-not-call']),
  callbackScheduledAt: z.string().datetime().optional(),
  actorId: z.string(),
  isMocked: z.boolean().default(true),
});
export type AICallLog = z.infer<typeof AICallLogSchema>;

// ─── Insurance Audit Event (append-only) ─────────────────────────────────────
// R12+ readable via /insurance/audit (Task 3). Covers lead create/close,
// quote save, campaign send, AI call dispatch.

export const InsuranceAuditEventKindEnum = z.enum([
  'lead_created',
  'lead_closed_won',
  'lead_closed_lost',
  'lead_stage_advanced',
  'quote_saved',
  'quote_shared',
  'campaign_sent',
  'ai_call_dispatched',
  'template_submitted_dlt',
  'template_approved',
  'commission_reconciled',
  // §5.7 — manual followup outcome recorded by staff (R09+)
  'followup_outcome_recorded',
]);
export type InsuranceAuditEventKind = z.infer<typeof InsuranceAuditEventKindEnum>;

export const InsuranceAuditEventSchema = z.object({
  auditId: z.string(),
  kind: InsuranceAuditEventKindEnum,
  entityId: z.string(),           // leadId / quoteId / campaignId / etc.
  entityType: z.enum(['lead', 'quote', 'campaign', 'ai_call', 'template', 'commission_period']),
  actorId: z.string(),
  actorRole: z.string(),
  description: z.string(),        // human-readable summary
  metadata: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});
export type InsuranceAuditEvent = z.infer<typeof InsuranceAuditEventSchema>;
