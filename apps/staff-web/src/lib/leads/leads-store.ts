/**
 * Leads store — SPEC-LEADS-001 §5
 *
 * Pure Zustand + Immer store for the Lead → Sale conversion funnel.
 *
 * L7: Activity log is append-only. No delete/update actions exist.
 * L2: Stage machine enforced — backward transitions throw InvalidLeadStageTransitionError.
 * L5: assignAdvisor requires R09+ — throws LeadAssignmentPermissionError for lower roles.
 * L10: bulkImportFromCsv is a P2 stub — throws LeadBulkImportNotImplementedError.
 *
 * Spec reference: SPEC-LEADS-001
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Lead, LeadActivity, CreateLeadParams } from '@dms/types';
import {
  LeadStageEnum,
  type LeadStage,
  InvalidLeadStageTransitionError,
  LeadAssignmentPermissionError,
  LeadBulkImportNotImplementedError,
  isValidLeadTransition,
  LEAD_ASSIGN_ROLES,
  LEAD_TERMINAL_STAGES,
} from '@dms/types';

// ─── Actor type (matches other stores) ───────────────────────────────────────

export interface Actor {
  id: string;
  name: string;
  role: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface LeadsState {
  leads: Lead[];
  activities: LeadActivity[];
  hydrated: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface LeadsActions {
  /**
   * Create a new lead in stage NEW.
   * Prepends an initial 'note' activity if initialNote is provided (SC-14 / Seam 41).
   */
  createLead(params: CreateLeadParams, actor: Actor): Lead;

  /**
   * Patch fields on an existing lead.
   * Cannot change stage (use transitionStage) or outletId (L9).
   */
  updateLead(leadId: string, patch: Partial<Omit<Lead, 'id' | 'outletId' | 'stage' | 'createdAt'>>, actor: Actor): void;

  /**
   * Transition a lead to a new stage.
   * L2: Backward transitions throw InvalidLeadStageTransitionError.
   * L7: Appends a 'stage-change' LeadActivity automatically.
   * @throws {InvalidLeadStageTransitionError} on backward/invalid transition
   */
  transitionStage(leadId: string, toStage: LeadStage, actor: Actor, lostReason?: string): void;

  /**
   * Assign (or re-assign) an advisor to a lead.
   * L5: Requires R09+ role — throws LeadAssignmentPermissionError otherwise.
   * L7: Appends an 'assign' LeadActivity.
   * @throws {LeadAssignmentPermissionError} if actor.role is below R09
   */
  assignAdvisor(leadId: string, advisorId: string, advisorName: string, actor: Actor): void;

  /**
   * Append an activity to a lead.
   * L7: Append-only — no delete/update.
   */
  addActivity(leadId: string, activity: Omit<LeadActivity, 'id' | 'leadId'>): void;

  /**
   * P2 stub — throws LeadBulkImportNotImplementedError.
   * L10: Stub must throw, not silently no-op.
   * @throws {LeadBulkImportNotImplementedError} always
   */
  bulkImportFromCsv(csvString: string, actor: Actor): never;

  /** Seed from fixtures — idempotent. */
  hydrate(leads: Lead[], activities: LeadActivity[]): void;
}

export type LeadsStore = LeadsState & LeadsActions;

// ─── ID helpers ───────────────────────────────────────────────────────────────

let _leadCounter = 1000;
function nextLeadId(): string {
  _leadCounter += 1;
  return `LEAD-${new Date().getFullYear()}-${String(_leadCounter).padStart(3, '0')}`;
}

let _activityCounter = 9000;
function nextActivityId(): string {
  _activityCounter += 1;
  return `lact-dyn-${_activityCounter}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLeadsStore = create<LeadsStore>()(
  immer((set, get) => ({
    leads: [],
    activities: [],
    hydrated: false,

    createLead(params, actor) {
      const now = new Date().toISOString();
      const lead: Lead = {
        id: nextLeadId(),
        source: params.source,
        stage: 'NEW',
        customerId: params.customerId,
        vehicleInterestVin: params.vehicleInterestVin,
        assignedAdvisorId: params.assignedAdvisorId,
        createdAt: now,
        lastActivityAt: now,
        nextActionAt: params.nextActionAt,
        outletId: params.outletId,
        leadOriginUrl: params.leadOriginUrl,
      };

      const activities: LeadActivity[] = [];

      // Initial note activity for service-upgrade source (SC-14 / Seam 41)
      if (params.initialNote) {
        activities.push({
          id: nextActivityId(),
          leadId: lead.id,
          kind: 'note',
          at: now,
          actorId: actor.id,
          actorName: actor.name,
          payload: { text: params.initialNote },
        });
      }

      set((state) => {
        state.leads.push(lead);
        for (const a of activities) {
          state.activities.push(a);
        }
      });

      return lead;
    },

    updateLead(leadId, patch, _actor) {
      set((state) => {
        const lead = state.leads.find((l) => l.id === leadId);
        if (!lead) return;
        const now = new Date().toISOString();
        Object.assign(lead, patch);
        lead.lastActivityAt = now;
      });
    },

    transitionStage(leadId, toStage, actor, lostReason) {
      const lead = get().leads.find((l) => l.id === leadId);
      if (!lead) return;

      // L2: validate transition
      if (!isValidLeadTransition(lead.stage, toStage)) {
        throw new InvalidLeadStageTransitionError(lead.stage, toStage);
      }

      const now = new Date().toISOString();

      set((state) => {
        const l = state.leads.find((x) => x.id === leadId);
        if (!l) return;

        const prevStage = l.stage;
        l.stage = toStage;
        l.lastActivityAt = now;

        if (toStage === 'LOST' && lostReason) {
          l.lostReason = lostReason;
        }

        // L7: append stage-change activity
        const activity: LeadActivity = {
          id: nextActivityId(),
          leadId,
          kind: 'stage-change',
          at: now,
          actorId: actor.id,
          actorName: actor.name,
          payload: { fromStage: prevStage, toStage },
        };
        state.activities.push(activity);
      });
    },

    assignAdvisor(leadId, advisorId, advisorName, actor) {
      // L5: R09+ only
      if (!LEAD_ASSIGN_ROLES.includes(actor.role as (typeof LEAD_ASSIGN_ROLES)[number])) {
        throw new LeadAssignmentPermissionError(actor.role);
      }

      const now = new Date().toISOString();

      set((state) => {
        const lead = state.leads.find((l) => l.id === leadId);
        if (!lead) return;

        lead.assignedAdvisorId = advisorId;
        lead.lastActivityAt = now;

        // L7: append assign activity
        const activity: LeadActivity = {
          id: nextActivityId(),
          leadId,
          kind: 'assign',
          at: now,
          actorId: actor.id,
          actorName: actor.name,
          payload: { advisorId, advisorName },
        };
        state.activities.push(activity);
      });
    },

    addActivity(leadId, activityData) {
      const now = new Date().toISOString();

      set((state) => {
        const lead = state.leads.find((l) => l.id === leadId);
        if (!lead) return;

        // L7: append-only
        const activity: LeadActivity = {
          id: nextActivityId(),
          leadId,
          ...activityData,
        };
        state.activities.push(activity);
        lead.lastActivityAt = now;
      });
    },

    bulkImportFromCsv(_csvString, _actor) {
      // L10: P2 stub — must throw, not silently no-op (CLAUDE.md DoD item 15)
      throw new LeadBulkImportNotImplementedError();
    },

    hydrate(leadsData, activitiesData) {
      set((state) => {
        if (state.hydrated) return; // idempotent
        state.leads = leadsData;
        state.activities = activitiesData;
        state.hydrated = true;
      });
    },
  })),
);
