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
// Leads module — SPEC-LEADS-001
// LeadSource/LeadSourceEnum conflict with insurance's identically-named exports.
// Export leads types with explicit aliases; consumers use the Lead-prefixed names.
export {
  LeadStageEnum,
  LeadSourceEnum as LeadsSourceEnum,
  LeadScoreEnum,
  LeadActivityKindEnum,
  LeadActivitySchema,
  LeadSchema,
  CreateLeadParamsSchema,
  InvalidLeadStageTransitionError,
  LeadAssignmentPermissionError,
  LeadBulkImportNotImplementedError,
  LEAD_STAGE_ORDER,
  LEAD_TERMINAL_STAGES,
  isValidLeadTransition,
  LEAD_ASSIGN_ROLES,
} from './lead';
export type {
  LeadStage,
  LeadSource,
  LeadScore,
  LeadActivityKind,
  LeadActivity,
  Lead,
  CreateLeadParams,
} from './lead';

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
