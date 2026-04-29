export * from './vehicle';
export * from './outlet';
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
// Insurance has its own LeadSource/LeadSourceEnum that conflicts with sales' identically-named exports.
// Re-export everything except the conflicting names; insurance consumers should import from '@dms/types/domain/insurance' if they need them.
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
