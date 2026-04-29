/**
 * Insurance store — shared type definitions.
 *
 * LEAF file: must NOT import from ./slices/* to avoid circular deps.
 *
 * Spec reference: SPEC-INSURANCE-001 §6
 */

import type { StateCreator } from 'zustand';
import type {
  InsuranceLead,
  InsuranceProvider,
  InsuranceQuote,
  IssuedPolicy,
  WhatsAppTemplate,
  WhatsAppCampaign,
  AICallLog,
  InsuranceLeadStage,
  CommissionPeriod,
  FollowupConfig,
  AudienceFilter,
  InsuranceAuditEvent,
  InsuranceAuditEventKind,
} from '@dms/types';

export type { InsuranceAuditEvent, InsuranceAuditEventKind };

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface StoreActor {
  id: string;
  name: string;
  role: string;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class VINNotFoundError extends Error {
  constructor(vin: string) {
    super(`VIN not found: ${vin}. Insurance leads must reference VINs in the vehicles fixture (L12).`);
    this.name = 'VINNotFoundError';
  }
}

export class R12RequiredError extends Error {
  constructor(pct: number) {
    super(`Discount of ${pct}% requires R12+ approval (L18). Actor role is below R12.`);
    this.name = 'R12RequiredError';
  }
}

export class TemplateNotApprovedError extends Error {
  constructor(templateId: string) {
    super(`Template ${templateId} is not APPROVED. sendTemplateMessage requires APPROVED status (L13).`);
    this.name = 'TemplateNotApprovedError';
  }
}

export class PermissionError extends Error {
  constructor(action: string, requiredRole: string, actorRole: string) {
    super(`Action '${action}' requires ${requiredRole}. Actor role: ${actorRole}.`);
    this.name = 'PermissionError';
  }
}

export class AICallingDisabledError extends Error {
  constructor() {
    super('AI calling is disabled. feat_insurance_ai_calling flag is OFF. OQ4 + OQ5 prerequisites not met (L_P4_1).');
    this.name = 'AICallingDisabledError';
  }
}

// ─── State shape ──────────────────────────────────────────────────────────────

export interface InsuranceState {
  leads: InsuranceLead[];
  providers: InsuranceProvider[];
  policies: IssuedPolicy[];
  templates: WhatsAppTemplate[];
  campaigns: WhatsAppCampaign[];
  callLogs: AICallLog[];
  optOuts: Set<string>;
  // P4: feature flag — OFF by default (OQ4 + OQ5 prerequisites not met)
  featAiCallingEnabled: boolean;
  // Audit log (append-only, R12+ readable)
  auditEvents: InsuranceAuditEvent[];
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface LeadActions {
  createLead(params: CreateLeadParams): InsuranceLead;
  getLeadById(leadId: string): InsuranceLead | undefined;
  advanceStage(leadId: string, toStage: InsuranceLeadStage, actor: StoreActor): InsuranceLead;
  closeLead(leadId: string, reason: 'won' | 'lost' | 'duplicate' | 'do-not-contact', meta: CloseLeadMeta, actor: StoreActor): InsuranceLead;
  // P2: renewal pipeline
  syncRenewalFeed(): { created: number; skipped: number };
  createLeadFromRenewal(params: RenewalLeadParams): InsuranceLead;
  // P4: followup config
  updateFollowupConfig(leadId: string, config: FollowupConfig): InsuranceLead;
  tickFollowups(now: Date): { overdue: string[] };
  // General lead-field update (priority, advisor, marketing consent, odometer, NCB, source)
  updateLead(
    leadId: string,
    patch: Partial<
      Pick<
        InsuranceLead,
        | 'priority'
        | 'assignedAdvisorId'
        | 'marketingConsentGiven'
        | 'marketingConsentAt'
        | 'odometer'
        | 'noClaimBonusYears'
        | 'source'
        | 'customerCity'
      >
    >,
    actor: StoreActor,
  ): InsuranceLead;
}

export interface QuoteActions {
  computeComparison(vehicleInput: VehicleInput, customerInput: CustomerInput): InsuranceQuote[];
  saveQuote(leadId: string, quote: InsuranceQuote): InsuranceQuote;
  applyDiscount(quoteId: string, pct: number, actor: StoreActor): InsuranceQuote;
  generateShareToken(quoteId: string): { token: string; expiresAt: string };
  getQuoteByToken(token: string): InsuranceQuote | 'expired' | 'not-found';
}

export interface ProviderActions {
  getProviders(): InsuranceProvider[];
}

export interface WhatsAppActions {
  sendTemplateMessage(templateId: string, recipientId: string, variables: Record<string, string>): Promise<{ messageId: string }>;
  recordOptOut(customerId: string): void;
  // P3: campaign + template management
  createTemplate(params: CreateTemplateParams): WhatsAppTemplate;
  updateTemplate(templateId: string, patch: Partial<Pick<WhatsAppTemplate, 'name' | 'bodyText' | 'variables' | 'category'>>): WhatsAppTemplate;
  submitForDlt(templateId: string): WhatsAppTemplate;
  markTemplateApproved(templateId: string, dltId: string): WhatsAppTemplate;
  launchCampaign(params: LaunchCampaignParams): WhatsAppCampaign;
  getOptOuts(): string[];
}

export interface AIActions {
  triggerAICall(leadId: string, actor: StoreActor): AICallLog;
  // P4: dispatch with feature flag + followup
  dispatchAiCall(leadId: string, scriptId: string, actor: StoreActor): AICallLog;
}

// Audit actions
export interface AuditActions {
  appendAuditEvent(event: Omit<InsuranceAuditEvent, 'auditId' | 'occurredAt'>): void;
  getAuditEvents(entityId?: string): InsuranceAuditEvent[];
}

// P5: commission ledger actions
export interface CommissionActions {
  getCommissionPeriods(actor: StoreActor): CommissionPeriod[];
  getCommissionByPeriod(periodId: string, actor: StoreActor): { period: CommissionPeriod; policies: IssuedPolicy[] };
  markReconciled(periodId: string, status: 'received' | 'disputed', meta: ReconcileMeta, actor: StoreActor): CommissionPeriod;
}

// ─── Param types ──────────────────────────────────────────────────────────────

export interface CreateLeadParams {
  vin: string;
  customerId: string;
  assignedAdvisorId: string;
  outlet: 'bangalore' | 'mumbai' | 'chennai';
  odometer: number;
  customerAge: number;
  customerCity: string;
  panLast4: string;
  noClaimBonusYears: number;
  marketingConsentGiven?: boolean;
}

export interface CloseLeadMeta {
  policyNumber?: string;
  quoteId?: string;
  providerId?: string;
}

export interface RenewalLeadParams {
  source: 'AUTO_RENEWAL';
  vin: string;
  customerId: string;
  expiresAt: string;  // ISO datetime
}

export interface CreateTemplateParams {
  name: string;
  category: WhatsAppTemplate['category'];
  bodyText: string;
  variables: string[];
}

export interface LaunchCampaignParams {
  name: string;
  templateId: string;
  audienceFilter: AudienceFilter;
  scheduledAt?: string;
  createdBy: string;
}

export interface ReconcileMeta {
  receivedAmount?: number;
  receiptDocRef?: string;
}

export interface VehicleInput {
  vin: string;
  make: string;
  model: string;
  year: number;
  exShowroomValue: number;
}

export interface CustomerInput {
  noClaimBonusYears: number;
  customerAge: number;
  selectedAddons?: string[];
}

// ─── Combined store ───────────────────────────────────────────────────────────

export type InsuranceActions = LeadActions & QuoteActions & ProviderActions & WhatsAppActions & AIActions & CommissionActions & AuditActions;
export type InsuranceStore = InsuranceState & InsuranceActions;

export type InsuranceSlice<T> = StateCreator<
  InsuranceStore,
  [['zustand/immer', never]],
  [],
  T
>;
