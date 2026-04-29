/**
 * Notifications store — SPEC-NOTIFICATIONS-001 §5
 *
 * Central audit log + DLT template registry for all outbound communications.
 * v1: write-through audit model (L5). Modules retain dispatch ownership;
 *     this store is the single source of truth for EVIDENCE of sends.
 *
 * Guards active at the recordSent boundary:
 *   L1 + L2: DLT mandate per Doc 09 §DLT — APPROVED template + dltTemplateId
 *   L4:      Opt-out re-check (extends SPEC-INSURANCE-001 L14 to all modules)
 *   L11:     Required variable validation
 *   L18:     Frozen consent snapshot per dispatch
 *
 * Additional actions:
 *   L6:  editTemplate — APPROVED → forks new DRAFT, original → DEPRECATED
 *   L8:  cancelDispatch — queued only; sent dispatches are immutable
 *   L10: scheduleAnonymisation — scaffold; backend scheduler activates in v1.1
 *   L14: recordStatusUpdate — retry backoff 1m/5m/30m; terminal after 3 failures
 *   L16: template approval workflow (DRAFT → PENDING_DLT → APPROVED/REJECTED)
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  NotificationDispatch,
  NotificationTemplate,
  NotificationAuditEvent,
  NotificationStatus,
  NotificationChannel,
  NotificationModule,
  RecordSentPayload,
  CreateTemplateParams,
  EditTemplateParams,
  DispatchFilters,
  PaginatedResult,
  Actor,
} from '@dms/types';
import {
  TemplateNotApprovedError,
  DltIdRequiredError,
  MissingVariableError,
  DispatchNotCancellableError,
} from '@dms/types';
import { checkConsentAtDispatch } from './consent-bridge';
import { isTerminalFailure, MAX_RETRY_COUNT } from './retry';

// ─── State shape ──────────────────────────────────────────────────────────────

export interface NotificationsState {
  dispatches: NotificationDispatch[];
  templates: NotificationTemplate[];
  auditEvents: NotificationAuditEvent[];
}

// ─── Actions shape ────────────────────────────────────────────────────────────

export interface NotificationsActions {
  /**
   * Record a sent dispatch.
   * L1 + L2: DLT mandate — template APPROVED + dltTemplateId for SMS/WA
   * L4: Opt-out re-check at boundary
   * L11: Required variable validation
   * L18: Frozen consent snapshot
   */
  recordSent(payload: RecordSentPayload): NotificationDispatch;

  /**
   * Update dispatch status (called by BSP webhook in v1.1; mock in v1).
   * L14: Retry backoff — failed + retryCount < 3 → queued + retry-queued event
   */
  recordStatusUpdate(
    dispatchId: string,
    status: NotificationStatus,
    providerMessageId?: string,
    errorReason?: string,
  ): void;

  /**
   * Cancel a queued dispatch.
   * L8: Only status === 'queued' can be cancelled.
   */
  cancelDispatch(dispatchId: string, actor: Actor): void;

  /** Create a new template in DRAFT status. */
  createTemplate(params: CreateTemplateParams): NotificationTemplate;

  /** Advance template from DRAFT/REJECTED → PENDING_DLT. L16 */
  submitForDlt(templateId: string, actor: Actor): NotificationTemplate;

  /**
   * Mark a template APPROVED and record the DLT ID.
   * L2: dltId required for SMS/WhatsApp channels.
   * L16: externally-confirmed DLT registration.
   */
  markApproved(templateId: string, dltId: string, actor: Actor): NotificationTemplate;

  /**
   * Mark a template REJECTED with reason.
   * L16: DLT registrar returned rejection.
   */
  markRejected(
    templateId: string,
    rejectionReason: string,
    actor: Actor,
  ): NotificationTemplate;

  /**
   * Edit a template.
   * L6: If current status === 'APPROVED', forks a new DRAFT; original → DEPRECATED.
   * DRAFT / REJECTED: mutates in place.
   * PENDING_DLT: throws (under review).
   * DEPRECATED: throws (read-only).
   */
  editTemplate(
    templateId: string,
    patch: EditTemplateParams,
    actor: Actor,
  ): NotificationTemplate;

  /**
   * Scaffold anonymisation scheduler.
   * L10: 7-year retention; real deletion is a v1.1 backend concern.
   */
  scheduleAnonymisation(dispatchId: string): void;

  // ── Selectors ────────────────────────────────────────────────────────────────

  selectDispatchesByModule(module: NotificationModule): NotificationDispatch[];
  selectDispatchesByRecipient(customerId: string): NotificationDispatch[];
  selectTemplatesByModule(module: NotificationModule): NotificationTemplate[];
  selectApprovedTemplates(channel?: NotificationChannel): NotificationTemplate[];
  selectFailedDispatches(): NotificationDispatch[];
  selectDispatchPage(
    page: number,
    filters: DispatchFilters,
  ): PaginatedResult<NotificationDispatch>;

  /** Seed initial state (called by hydrator). */
  _seed(
    templates: NotificationTemplate[],
    dispatches: NotificationDispatch[],
    auditEvents: NotificationAuditEvent[],
  ): void;
}

export type NotificationsStore = NotificationsState & NotificationsActions;

// ─── ID helpers ───────────────────────────────────────────────────────────────

function makeNotifId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeTmplId(): string {
  return `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeAuditId(): string {
  return `nae-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

const PAGE_SIZE = 50;

// ─── Store implementation ─────────────────────────────────────────────────────

export const useNotificationsStore = create<NotificationsStore>()(
  immer((set, get) => ({
    dispatches: [],
    templates: [],
    auditEvents: [],

    // ── recordSent ────────────────────────────────────────────────────────────

    recordSent(payload) {
      const {
        templateId,
        channel,
        module,
        recipient,
        variables,
        consentSnapshot,
        sourceEntityId,
        sourceEntityType,
      } = payload;

      // L1 + L2: DLT mandate per Doc 09 §DLT
      const template = get().templates.find((t) => t.id === templateId);
      if (!template || template.status !== 'APPROVED') {
        throw new TemplateNotApprovedError(templateId);
      }
      // L2: dltTemplateId is mandatory for SMS + WhatsApp APPROVED templates
      if (
        (channel === 'SMS' || channel === 'WHATSAPP') &&
        !template.dltTemplateId
      ) {
        throw new DltIdRequiredError(templateId, channel);
      }

      // L11: Required variable validation
      const missingVars = template.variables
        .filter((v) => v.required && !variables[v.name])
        .map((v) => v.name);
      if (missingVars.length > 0) {
        throw new MissingVariableError(templateId, missingVars);
      }

      // L4: Opt-out re-check at boundary + L18: frozen consent snapshot
      const consentResult = checkConsentAtDispatch(recipient.customerId, consentSnapshot);
      const frozenSnapshot = consentResult.snapshot;

      const now = nowIso();
      const id = makeNotifId();

      // L4: If consent revoked → create 'opted-out' dispatch; do NOT send
      const dispatchStatus: NotificationStatus = consentResult.allowed ? 'sent' : 'opted-out';

      let created!: NotificationDispatch;

      set((state) => {
        const dispatch: NotificationDispatch = {
          id,
          templateId,
          templateName: template.name,
          channel,
          module,
          recipient,
          variables,
          sentAt: now,
          status: dispatchStatus,
          retryCount: 0,
          consentSnapshot: frozenSnapshot, // L18: frozen at call time
          sourceEntityId,
          sourceEntityType,
        };
        if (consentResult.allowed) {
          // v1 mock: immediately set providerMessageId
          dispatch.providerMessageId = `mock-${id}`;
        }
        state.dispatches.push(dispatch);

        // Audit event
        state.auditEvents.push({
          id: makeAuditId(),
          dispatchId: id,
          kind: consentResult.allowed ? 'sent' : 'consent-blocked',
          at: now,
        });

        created = dispatch;
      });

      return created;
    },

    // ── recordStatusUpdate ────────────────────────────────────────────────────

    recordStatusUpdate(dispatchId, status, providerMessageId, errorReason) {
      set((state) => {
        const dispatch = state.dispatches.find((d) => d.id === dispatchId);
        if (!dispatch) return;

        const now = nowIso();

        // L14: Retry backoff logic
        // Terminal when the INCREMENTED count reaches MAX_RETRY_COUNT (3 failures → terminal)
        if (status === 'failed') {
          const nextRetryCount = dispatch.retryCount + 1;
          if (!isTerminalFailure(nextRetryCount)) {
            // Increment retry and re-queue
            dispatch.retryCount = nextRetryCount;
            dispatch.status = 'queued';
            dispatch.errorReason = errorReason;
            state.auditEvents.push({
              id: makeAuditId(),
              dispatchId,
              kind: 'failed',
              at: now,
              errorReason,
            });
            state.auditEvents.push({
              id: makeAuditId(),
              dispatchId,
              kind: 'retry-queued',
              at: now,
            });
          } else {
            // L14: terminal failed after MAX_RETRY_COUNT attempts
            dispatch.retryCount = nextRetryCount;
            dispatch.status = 'failed';
            dispatch.errorReason = errorReason;
            state.auditEvents.push({
              id: makeAuditId(),
              dispatchId,
              kind: 'failed',
              at: now,
              errorReason,
            });
          }
          return;
        }

        dispatch.status = status;
        if (providerMessageId) dispatch.providerMessageId = providerMessageId;
        if (errorReason) dispatch.errorReason = errorReason;

        const auditKind = status as NotificationAuditEvent['kind'];
        if (['delivered', 'read'].includes(status)) {
          state.auditEvents.push({
            id: makeAuditId(),
            dispatchId,
            kind: auditKind,
            at: now,
          });
        }
      });
    },

    // ── cancelDispatch ────────────────────────────────────────────────────────

    cancelDispatch(dispatchId, actor) {
      const dispatch = get().dispatches.find((d) => d.id === dispatchId);
      if (!dispatch) throw new Error(`Dispatch ${dispatchId} not found`);

      // L8: Only queued dispatches can be cancelled
      if (dispatch.status !== 'queued') {
        throw new DispatchNotCancellableError(dispatchId, dispatch.status);
      }

      const now = nowIso();

      set((state) => {
        const d = state.dispatches.find((x) => x.id === dispatchId);
        if (!d) return;
        d.status = 'cancelled';
        state.auditEvents.push({
          id: makeAuditId(),
          dispatchId,
          kind: 'cancelled',
          at: now,
          actorId: actor.id,
        });
      });
    },

    // ── createTemplate ────────────────────────────────────────────────────────

    createTemplate(params) {
      const now = nowIso();
      const id = makeTmplId();
      let created!: NotificationTemplate;

      set((state) => {
        const template: NotificationTemplate = {
          id,
          channel: params.channel,
          module: params.module,
          name: params.name,
          subject: params.subject,
          bodyMarkdown: params.bodyMarkdown,
          variables: params.variables,
          status: 'DRAFT',
          dltTemplateId: undefined,
          lastUpdatedAt: now,
          lastUpdatedBy: params.createdBy,
        };
        state.templates.push(template);
        created = template;
      });

      return created;
    },

    // ── submitForDlt ──────────────────────────────────────────────────────────

    submitForDlt(templateId, actor) {
      const template = get().templates.find((t) => t.id === templateId);
      if (!template) throw new Error(`Template ${templateId} not found`);
      if (template.status !== 'DRAFT' && template.status !== 'REJECTED') {
        throw new Error(
          `Only DRAFT or REJECTED templates can be submitted for DLT review. Current: ${template.status}`,
        );
      }

      const now = nowIso();
      set((state) => {
        const t = state.templates.find((x) => x.id === templateId);
        if (!t) return;
        t.status = 'PENDING_DLT';
        t.lastUpdatedAt = now;
        t.lastUpdatedBy = actor.id;
      });

      return get().templates.find((t) => t.id === templateId)!;
    },

    // ── markApproved ──────────────────────────────────────────────────────────

    markApproved(templateId, dltId, actor) {
      const template = get().templates.find((t) => t.id === templateId);
      if (!template) throw new Error(`Template ${templateId} not found`);
      if (template.status !== 'PENDING_DLT') {
        throw new Error(`Only PENDING_DLT templates can be approved. Current: ${template.status}`);
      }

      // L2: dltId required for SMS + WhatsApp
      if (
        (template.channel === 'SMS' || template.channel === 'WHATSAPP') &&
        (!dltId || dltId.trim() === '')
      ) {
        throw new DltIdRequiredError(templateId, template.channel);
      }

      const now = nowIso();
      set((state) => {
        const t = state.templates.find((x) => x.id === templateId);
        if (!t) return;
        t.status = 'APPROVED';
        t.dltTemplateId = dltId || undefined;
        t.approvedAt = now;
        t.approvedBy = actor.id;
        t.lastUpdatedAt = now;
        t.lastUpdatedBy = actor.id;
      });

      return get().templates.find((t) => t.id === templateId)!;
    },

    // ── markRejected ──────────────────────────────────────────────────────────

    markRejected(templateId, rejectionReason, actor) {
      const template = get().templates.find((t) => t.id === templateId);
      if (!template) throw new Error(`Template ${templateId} not found`);
      if (template.status !== 'PENDING_DLT') {
        throw new Error(`Only PENDING_DLT templates can be rejected. Current: ${template.status}`);
      }

      const now = nowIso();
      set((state) => {
        const t = state.templates.find((x) => x.id === templateId);
        if (!t) return;
        t.status = 'REJECTED';
        t.rejectionReason = rejectionReason;
        t.rejectedAt = now;
        t.rejectedBy = actor.id;
        t.lastUpdatedAt = now;
        t.lastUpdatedBy = actor.id;
      });

      // Append audit event for template rejection
      set((state) => {
        state.auditEvents.push({
          id: makeAuditId(),
          dispatchId: `tmpl-${templateId}`, // synthetic dispatchId for template events
          kind: 'template-rejected',
          at: now,
          actorId: actor.id,
          errorReason: rejectionReason,
        });
      });

      return get().templates.find((t) => t.id === templateId)!;
    },

    // ── editTemplate ──────────────────────────────────────────────────────────

    editTemplate(templateId, patch, actor) {
      const template = get().templates.find((t) => t.id === templateId);
      if (!template) throw new Error(`Template ${templateId} not found`);

      if (template.status === 'PENDING_DLT') {
        throw new Error('Template is under DLT review and cannot be edited.');
      }
      if (template.status === 'DEPRECATED') {
        throw new Error('Deprecated templates cannot be edited.');
      }

      const now = nowIso();

      // L6: APPROVED → fork new DRAFT; original → DEPRECATED
      if (template.status === 'APPROVED') {
        const newId = makeTmplId();
        set((state) => {
          // Fork new DRAFT version
          const newTemplate: NotificationTemplate = {
            ...template,
            id: newId,
            status: 'DRAFT',
            dltTemplateId: undefined, // L6: DLT ID cleared — body changed requires re-registration
            supersedes: templateId,
            supersededBy: undefined,
            approvedAt: undefined,
            approvedBy: undefined,
            rejectedAt: undefined,
            rejectedBy: undefined,
            rejectionReason: undefined,
            lastUpdatedAt: now,
            lastUpdatedBy: actor.id,
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.subject !== undefined && { subject: patch.subject }),
            ...(patch.bodyMarkdown !== undefined && { bodyMarkdown: patch.bodyMarkdown }),
            ...(patch.variables !== undefined && { variables: patch.variables }),
          };
          state.templates.push(newTemplate);

          // Mark original as DEPRECATED
          const original = state.templates.find((t) => t.id === templateId);
          if (original) {
            original.status = 'DEPRECATED';
            original.supersededBy = newId;
            original.lastUpdatedAt = now;
          }
        });
        return get().templates.find((t) => t.id === newId)!;
      }

      // DRAFT / REJECTED: mutate in place
      set((state) => {
        const t = state.templates.find((x) => x.id === templateId);
        if (!t) return;
        if (patch.name !== undefined) t.name = patch.name;
        if (patch.subject !== undefined) t.subject = patch.subject;
        if (patch.bodyMarkdown !== undefined) t.bodyMarkdown = patch.bodyMarkdown;
        if (patch.variables !== undefined) t.variables = patch.variables;
        t.lastUpdatedAt = now;
        t.lastUpdatedBy = actor.id;
      });

      return get().templates.find((t) => t.id === templateId)!;
    },

    // ── scheduleAnonymisation ─────────────────────────────────────────────────

    scheduleAnonymisation(dispatchId) {
      // L10: scaffold — 7 years retention; backend scheduler activates in v1.1
      const retentionYears = 7;
      set((state) => {
        const d = state.dispatches.find((x) => x.id === dispatchId);
        if (!d) return;
        const sentAt = new Date(d.sentAt);
        sentAt.setFullYear(sentAt.getFullYear() + retentionYears);
        d.anonymisationScheduledAt = sentAt.toISOString();
      });
    },

    // ── Selectors ─────────────────────────────────────────────────────────────

    selectDispatchesByModule(module) {
      return get().dispatches.filter((d) => d.module === module);
    },

    selectDispatchesByRecipient(customerId) {
      return get().dispatches.filter((d) => d.recipient.customerId === customerId);
    },

    selectTemplatesByModule(module) {
      return get().templates.filter((t) => t.module === module);
    },

    selectApprovedTemplates(channel) {
      return get().templates.filter(
        (t) => t.status === 'APPROVED' && (!channel || t.channel === channel),
      );
    },

    selectFailedDispatches() {
      return get().dispatches.filter(
        (d) => d.status === 'failed' && d.retryCount >= MAX_RETRY_COUNT,
      );
    },

    selectDispatchPage(page, filters) {
      const { module, channel, status, from, to, recipient } = filters;

      let items = get().dispatches;

      if (module) items = items.filter((d) => d.module === module);
      if (channel) items = items.filter((d) => d.channel === channel);
      if (status) items = items.filter((d) => d.status === status);
      if (recipient) items = items.filter((d) => d.recipient.customerId === recipient);
      if (from) items = items.filter((d) => d.sentAt >= from);
      if (to) items = items.filter((d) => d.sentAt <= to);

      // L12: ordered by sentAt DESC
      items = [...items].sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      );

      const total = items.length;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      const currentPage = Math.max(1, page);
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = items.slice(start, start + PAGE_SIZE);

      return {
        items: pageItems,
        total,
        page: currentPage,
        pageSize: PAGE_SIZE,
        totalPages,
      };
    },

    // ── _seed ─────────────────────────────────────────────────────────────────

    _seed(templates, dispatches, auditEvents) {
      set((state) => {
        state.templates = structuredClone(templates);
        state.dispatches = structuredClone(dispatches);
        state.auditEvents = structuredClone(auditEvents);
      });
    },
  })),
);
