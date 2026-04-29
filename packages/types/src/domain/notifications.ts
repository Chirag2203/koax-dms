/**
 * Notifications domain types — SPEC-NOTIFICATIONS-001
 *
 * L1 + L2: DLT mandate per Doc 09 §DLT — every SMS/WhatsApp dispatch MUST
 *   resolve a template with status APPROVED and a non-null dltTemplateId.
 * L3: PII redaction — phone masked in UI; R23 (DPO) sees full PII only in audit view.
 * L4: Opt-out re-check at recordSent boundary.
 * L6: Template versioning — editing APPROVED forks a new DRAFT; original → DEPRECATED.
 * L7: DPO export for DSR §11 right of access.
 * L8: Cancel queued dispatches only.
 * L10: Audit retention 7 years.
 * L11: Variable type validation at dispatch.
 * L14: Retry with exponential backoff 1m/5m/30m; terminal after 3 failures.
 * L15: No PII in URL params.
 * L18: Frozen consent snapshot per dispatch.
 */

import { z } from 'zod';
import { ConsentPurposeEnum, ConsentSourceEnum } from './customer';

// ─── Enumerations ─────────────────────────────────────────────────────────────

// L1, L2: channels with DLT scope
export const NotificationChannelEnum = z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'PUSH']);
export type NotificationChannel = z.infer<typeof NotificationChannelEnum>;

// Terminal statuses: failed, opted-out, cancelled, delivered, read
export const NotificationStatusEnum = z.enum([
  'queued',      // created, not yet sent to BSP
  'sent',        // accepted by BSP / provider
  'delivered',   // confirmed delivered to handset
  'read',        // confirmed read (WhatsApp only)
  'failed',      // BSP rejected after 3 retries (L14)
  'opted-out',   // consent revoked at recordSent boundary (L4)
  'cancelled',   // cancelled by R12+ before send (L8)
]);
export type NotificationStatus = z.infer<typeof NotificationStatusEnum>;

// Mirrors WhatsAppTemplate.status from SPEC-INSURANCE-001; extended to all channels
export const DltTemplateStatusEnum = z.enum([
  'DRAFT',
  'PENDING_DLT',
  'APPROVED',
  'REJECTED',
  'DEPRECATED',
]);
export type DltTemplateStatus = z.infer<typeof DltTemplateStatusEnum>;

// Source module for filtering (L9)
export const NotificationModuleEnum = z.enum([
  'INSURANCE',
  'SERVICE_BOOKING',
  'CUSTOM_BUILDS',
  'CUSTOMERS',
  'STAFF',
  'SALES',
]);
export type NotificationModule = z.infer<typeof NotificationModuleEnum>;

// ─── Sub-types ────────────────────────────────────────────────────────────────

export const NotificationTemplateVariableSchema = z.object({
  name: z.string(),       // e.g. 'customer_name', 'booking_date'
  type: z.enum(['string', 'number', 'date', 'currency', 'phone']),
  required: z.boolean(),  // L11: missing required → MissingVariableError
  example: z.string().optional(), // shown in template preview
});
export type NotificationTemplateVariable = z.infer<typeof NotificationTemplateVariableSchema>;

export const NotificationRecipientSchema = z.object({
  customerId: z.string().optional(),  // preferred — links to Customer 360
  staffId: z.string().optional(),     // for staff-targeted notifications
  raw: z.string().optional(),         // fallback when no customerId; masked in UI (L3)
});
export type NotificationRecipient = z.infer<typeof NotificationRecipientSchema>;

// L18: frozen consent snapshot per dispatch
export const NotificationConsentSnapshotSchema = z.object({
  purpose: ConsentPurposeEnum,     // from SPEC-CUSTOMERS-001 §4.1
  capturedAt: z.string(),          // ISO — when consent was given
  capturedBy: z.string(),          // staffId or 'PORTAL_SIGNUP'
  source: ConsentSourceEnum,       // 'PORTAL_SIGNUP' | 'STAFF_FORM' | 'IMPORT'
});
export type NotificationConsentSnapshot = z.infer<typeof NotificationConsentSnapshotSchema>;

// ─── Core entities ────────────────────────────────────────────────────────────

export const NotificationTemplateSchema = z.object({
  id: z.string(),                  // 'tmpl-{nanoid}'
  channel: NotificationChannelEnum,
  module: NotificationModuleEnum,  // owning module
  name: z.string(),                // human label; unique within module+channel
  subject: z.string().optional(),  // EMAIL only
  bodyMarkdown: z.string(),        // with {{variable}} placeholders
  variables: z.array(NotificationTemplateVariableSchema),
  status: DltTemplateStatusEnum,

  // L2: mandatory for SMS + WhatsApp APPROVED templates
  dltTemplateId: z.string().optional(), // TRAI DLT numeric ID; null until APPROVED

  // L6: version chain
  supersedes: z.string().optional(),    // id of the template this one replaces
  supersededBy: z.string().optional(),  // id of the newer template (set when DEPRECATED)

  lastUpdatedAt: z.string(),            // ISO
  lastUpdatedBy: z.string(),            // staffId
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),    // staffId (R12+ who entered the DLT ID)
  rejectedAt: z.string().optional(),
  rejectedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
  proofDocRef: z.string().optional(),   // v1: optional placeholder; mandatory in v1.1
});
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

export const NotificationDispatchSchema = z.object({
  id: z.string(),                        // 'notif-{nanoid}'
  templateId: z.string(),
  templateName: z.string(),             // denormalised for display after template edits
  channel: NotificationChannelEnum,
  module: NotificationModuleEnum,
  recipient: NotificationRecipientSchema,
  variables: z.record(z.string(), z.string()), // key:val; PII values masked in audit (L3)
  sentAt: z.string(),                    // ISO; time recordSent was called
  status: NotificationStatusEnum,
  retryCount: z.number(),               // 0..3; see L14
  providerMessageId: z.string().optional(), // returned by BSP; null until sent
  errorReason: z.string().optional(),   // last BSP error; populated on failed/retried
  consentSnapshot: NotificationConsentSnapshotSchema, // L18: frozen at recordSent time
  sourceEntityId: z.string().optional(),
  sourceEntityType: z.enum([
    'INSURANCE_LEAD',
    'JOB_CARD',
    'BUILD_JOB',
    'CUSTOMER',
    'SALES_ORDER',
  ]).optional(),
  // L10: anonymisation scheduler
  anonymisationScheduledAt: z.string().optional(),
});
export type NotificationDispatch = z.infer<typeof NotificationDispatchSchema>;

export const NotificationAuditEventSchema = z.object({
  id: z.string(),
  dispatchId: z.string(),
  kind: z.enum([
    'sent',
    'delivered',
    'read',
    'failed',
    'consent-blocked',
    'template-rejected',
    'cancelled',
    'retry-queued',
    'dsr-export',
    'acknowledged-by-dpo',
  ]),
  at: z.string(),                  // ISO
  actorId: z.string().optional(),  // staffId when action is manual
  errorReason: z.string().optional(), // populated on failed + template-rejected
});
export type NotificationAuditEvent = z.infer<typeof NotificationAuditEventSchema>;

// ─── Action parameter types ───────────────────────────────────────────────────

export interface RecordSentPayload {
  templateId: string;
  channel: NotificationChannel;
  module: NotificationModule;
  recipient: NotificationRecipient;
  variables: Record<string, string>;
  consentSnapshot: NotificationConsentSnapshot;
  sourceEntityId?: string;
  sourceEntityType?: NotificationDispatch['sourceEntityType'];
}

export interface CreateTemplateParams {
  channel: NotificationChannel;
  module: NotificationModule;
  name: string;
  subject?: string;
  bodyMarkdown: string;
  variables: NotificationTemplateVariable[];
  createdBy: string;
}

export interface EditTemplateParams {
  name?: string;
  subject?: string;
  bodyMarkdown?: string;
  variables?: NotificationTemplateVariable[];
}

export interface DispatchFilters {
  module?: NotificationModule;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  from?: string;   // ISO date
  to?: string;     // ISO date
  recipient?: string; // customerId — L9, L15: never raw phone
  page?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Actor {
  id: string;
  name: string;
  role: string;
}

// ─── Error classes ────────────────────────────────────────────────────────────

export class TemplateNotApprovedError extends Error {
  constructor(templateId: string) {
    super(`Template ${templateId} is not APPROVED or missing dltTemplateId`);
    this.name = 'TemplateNotApprovedError';
  }
}

export class DltIdRequiredError extends Error {
  constructor(templateId: string, channel: NotificationChannel) {
    super(
      `DLT template ID is required for ${channel} templates (Doc 09 §DLT). Template: ${templateId}`,
    );
    this.name = 'DltIdRequiredError';
  }
}

export class MissingVariableError extends Error {
  constructor(templateId: string, missingVars: string[]) {
    super(
      `Missing required variables for template ${templateId}: ${missingVars.join(', ')}`,
    );
    this.name = 'MissingVariableError';
  }
}

export class DispatchNotCancellableError extends Error {
  constructor(dispatchId: string, currentStatus: NotificationStatus) {
    super(
      `Dispatch ${dispatchId} cannot be cancelled in status '${currentStatus}'. Only 'queued' dispatches can be cancelled (L8).`,
    );
    this.name = 'DispatchNotCancellableError';
  }
}
