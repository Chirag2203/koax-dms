export * from './vehicle';
export * from './outlet';
export * from './finance';
export * from './article';
export * from './service-type';
export * from './customer';
export * from './portal';
export * from './consignor';
export * from './staff';
export * from './inventory';
export * from './sales';
export * from './service';
export * from './parts';
export * from './vehicles-aggregate';
export * from './documents';
export * from './service-booking';
export * from './custom-builds';
export * from './notifications';
// Leads module REMOVED 2026-04-30 — folded into the sales module per user
// direction. Lead lifecycle is now modelled by `Deal` (sales.ts) with stages
// 'new-lead' / 'contacted' / 'test-drive' / etc. Source enum + service-upgrade
// flow live in `sales-deals-store`.

// Insurance has its own LeadSource/LeadSourceEnum that conflicts with sales' identically-named exports.
// Re-export everything except the conflicting names; insurance consumers should import from '@dms/types/domain/insurance' if they need them.
export * from './settings';
export * from './test-drive';
export {
  InsuranceProviderSchema,
  InsuranceQuoteSchema,
  InsuranceLeadSchema,
  InsuranceLeadStageEnum,
  IssuedPolicySchema,
  ClaimRecordSchema,
  WhatsAppTemplateSchema,
  WhatsAppCampaignSchema,
  FollowupSequenceStateSchema,
  FollowupStepSchema,
  FollowupConfigSchema,
  FollowupConfigStepSchema,
  CommissionReconciliationStatusEnum,
  CommissionPeriodSchema,
  QuoteCardPropsSchema,
  AudienceFilterSchema,
  AICallLogSchema,
  ManualFollowupOutcomeEnum,
  ManualCallRecordSchema,
  LeadSourceEnum as InsuranceLeadSourceEnum,
  InsuranceAuditEventKindEnum,
} from './insurance';
export type {
  InsuranceProvider,
  InsuranceQuote,
  InsuranceLead,
  InsuranceLeadStage,
  IssuedPolicy,
  ClaimRecord,
  WhatsAppTemplate,
  WhatsAppCampaign,
  FollowupSequenceState,
  FollowupStep,
  FollowupConfig,
  FollowupConfigStep,
  CommissionReconciliationStatus,
  CommissionPeriod,
  QuoteCardProps,
  AudienceFilter,
  AICallLog,
  ManualFollowupOutcome,
  ManualCallRecord,
  LeadSource as InsuranceLeadSource,
  InsuranceAuditEvent,
  InsuranceAuditEventKind,
} from './insurance';

export * from './shoot';

export * from './review';
export * from './test-drive';
