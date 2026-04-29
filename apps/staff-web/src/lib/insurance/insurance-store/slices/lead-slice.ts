/**
 * Insurance lead slice.
 *
 * Handles lead lifecycle: create, advance stage, close.
 * P2: renewal pipeline auto-feed (syncRenewalFeed, createLeadFromRenewal).
 * P4: followup config (updateFollowupConfig, tickFollowups).
 *
 * L12: VIN must exist in vehicles fixture.
 * L15: marketingConsentGiven defaults false.
 * L_P2_1: renewal feed idempotent on (vin, customerId, expiresAt-month).
 *
 * Spec reference: SPEC-INSURANCE-001 §6, §4, §31
 */

import type { InsuranceLead, FollowupConfig, ManualCallRecord } from '@dms/types';
import { vehicles, issuedPolicies as fixturePolicies } from '@dms/mocks/fixtures';
import type {
  InsuranceSlice, LeadActions, CreateLeadParams, CloseLeadMeta,
  StoreActor, RenewalLeadParams, ManualFollowupOutcome,
} from '../types';
import { VINNotFoundError, PermissionError } from '../types';
import { trackInsuranceEvent } from '@/src/lib/insurance/analytics';

// Role rank for stage gate checks
const ROLE_RANK: Record<string, number> = {
  R09: 9, R10: 10, R11: 11, R12: 12, R13: 13,
  R19: 19, R22: 22, R24: 24,
};

function rank(role: string): number {
  const explicit = ROLE_RANK[role];
  if (explicit !== undefined) return explicit;
  return parseInt(role.replace('R', ''), 10) || 0;
}

/** Days between two date strings */
function daysUntil(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Idempotency key: (vin, customerId, YYYY-MM of expiresAt) */
function renewalKey(vin: string, customerId: string, expiresAt: string): string {
  const month = expiresAt.slice(0, 7); // 'YYYY-MM'
  return `${vin}::${customerId}::${month}`;
}

export const createLeadSlice: InsuranceSlice<LeadActions> = (set, get) => ({
  createLead(params: CreateLeadParams): InsuranceLead {
    // L12: VIN must exist in vehicles fixture
    const vinExists = vehicles.some((v) => v.vin === params.vin);
    if (!vinExists) throw new VINNotFoundError(params.vin);

    const leadId = `lead-ins-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const lead: InsuranceLead = {
      leadId,
      vin: params.vin,
      customerId: params.customerId,
      assignedAdvisorId: params.assignedAdvisorId,
      outlet: params.outlet,
      stage: 'due',
      source: 'MANUAL',
      odometer: params.odometer,
      customerAge: params.customerAge,
      customerCity: params.customerCity,
      panLast4: params.panLast4,
      noClaimBonusYears: params.noClaimBonusYears,
      quotes: [],
      followupSequenceState: { currentStepIndex: 0, paused: false },
      // L15: defaults false; explicit opt-in required
      marketingConsentGiven: params.marketingConsentGiven ?? false,
      marketingConsentAt: params.marketingConsentGiven ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => { state.leads.push(lead); });

    // Audit: lead_created
    get().appendAuditEvent({
      kind: 'lead_created',
      entityId: leadId,
      entityType: 'lead',
      actorId: params.assignedAdvisorId,
      actorRole: 'R09',
      description: `Lead created for VIN ${params.vin} (customer: ${params.customerId})`,
    });

    // §11: analytics event
    trackInsuranceEvent('insurance_lead_created', {
      leadId,
      vin: params.vin,
      customerId: params.customerId,
      outlet: params.outlet,
      actorId: params.assignedAdvisorId,
    });

    return lead;
  },

  getLeadById(leadId: string): InsuranceLead | undefined {
    return get().leads.find((l) => l.leadId === leadId);
  },

  /**
   * P2 §31: auto-feed from issuedPolicies fixture.
   * L_P2_1: idempotent on (vin, customerId, expiresAt-month).
   * Scans policies expiring within 60 days; skips VINs with existing open leads.
   */
  syncRenewalFeed(): { created: number; skipped: number } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    let created = 0;
    let skipped = 0;

    // Read policies from fixture directly (no cross-store subscription per spec)
    const policies = fixturePolicies;

    for (const policy of policies) {
      const expiresAt = `${policy.periodEnd}T00:00:00.000Z`;
      const expiry = new Date(policy.periodEnd);

      // Only policies expiring within 60 days
      if (expiry > cutoff || expiry < today) continue;

      const existingOpenLead = get().leads.find(
        (l) =>
          l.vin === policy.vin &&
          l.customerId === policy.customerId &&
          l.stage !== 'closed-won' &&
          l.stage !== 'closed-lost',
      );

      if (existingOpenLead) {
        skipped++;
        continue;
      }

      // Check idempotency key (L_P2_1)
      const key = renewalKey(policy.vin, policy.customerId, expiresAt);
      const alreadyCreated = get().leads.find((l) => {
        if (!l.expiresAt || l.source !== 'AUTO_RENEWAL') return false;
        return renewalKey(l.vin, l.customerId, l.expiresAt) === key;
      });

      if (alreadyCreated) {
        skipped++;
        continue;
      }

      get().createLeadFromRenewal({
        source: 'AUTO_RENEWAL',
        vin: policy.vin,
        customerId: policy.customerId,
        expiresAt,
      });
      created++;
    }

    return { created, skipped };
  },

  /**
   * P2: Create a lead from the renewal auto-feed.
   * Stage = 'due-soon' if >30d, 'due' if <=30d.
   * priority = 'urgent' if <=30d, 'normal' otherwise.
   */
  createLeadFromRenewal(params: RenewalLeadParams): InsuranceLead {
    const days = daysUntil(params.expiresAt);
    const stage = days > 30 ? 'due-soon' : 'due';
    const priority = days <= 30 ? 'urgent' : 'normal';
    const leadId = `lead-renewal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const lead: InsuranceLead = {
      leadId,
      vin: params.vin,
      customerId: params.customerId,
      assignedAdvisorId: 'staff-r09-001', // default advisor; will be re-assigned
      outlet: 'bangalore', // default; will be determined by policy outlet
      stage,
      source: 'AUTO_RENEWAL',
      priority,
      expiresAt: params.expiresAt,
      odometer: 0,
      customerAge: 35,
      customerCity: 'Unknown',
      panLast4: '0000',
      noClaimBonusYears: 0,
      quotes: [],
      followupSequenceState: { currentStepIndex: 0, paused: false },
      marketingConsentGiven: false,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => { state.leads.push(lead); });
    return lead;
  },

  advanceStage(leadId: string, toStage, actor: StoreActor): InsuranceLead {
    const lead = get().leads.find((l) => l.leadId === leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    // Immutable post close-won
    if (lead.stage === 'closed-won') {
      throw new Error('Lead is closed-won and cannot be advanced.');
    }

    // Gate: closed-won / closed-lost require R10+
    if ((toStage === 'closed-won' || toStage === 'closed-lost') && rank(actor.role) < 10) {
      throw new Error(`Stage ${toStage} requires R10+ role. Actor role: ${actor.role}`);
    }

    set((state) => {
      const l = state.leads.find((x) => x.leadId === leadId);
      if (!l) return;
      l.stage = toStage;
      l.updatedAt = new Date().toISOString();
    });

    return get().leads.find((l) => l.leadId === leadId)!;
  },

  closeLead(leadId: string, reason, meta: CloseLeadMeta, actor: StoreActor): InsuranceLead {
    const lead = get().leads.find((l) => l.leadId === leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);
    if (lead.stage === 'closed-won') throw new Error('Lead already closed-won.');

    // R10+ required for close
    if (rank(actor.role) < 10) {
      throw new Error(`Closing a lead requires R10+ role. Actor role: ${actor.role}`);
    }

    const now = new Date().toISOString();
    const stage = reason === 'won' ? 'closed-won' : 'closed-lost';

    set((state) => {
      const l = state.leads.find((x) => x.leadId === leadId);
      if (!l) return;
      l.stage = stage;
      l.closedReason = reason;
      l.closedAt = now;
      l.updatedAt = now;
      if (reason === 'won' && meta.quoteId) {
        const q = l.quotes.find((q) => q.quoteId === meta.quoteId);
        if (q) q.status = 'converted';
      }
    });

    // Audit: lead_closed_won or lead_closed_lost
    get().appendAuditEvent({
      kind: reason === 'won' ? 'lead_closed_won' : 'lead_closed_lost',
      entityId: leadId,
      entityType: 'lead',
      actorId: actor.id,
      actorRole: actor.role,
      description: `Lead ${reason === 'won' ? 'closed-won' : `closed-lost (${reason})`}${meta.policyNumber ? ` — policy ${meta.policyNumber}` : ''}`,
      metadata: { reason, ...meta },
    });

    // §11: analytics events
    if (reason === 'won') {
      trackInsuranceEvent('insurance_lead_closed_won', {
        leadId,
        actorId: actor.id,
        policyNumber: meta.policyNumber,
        quoteId: meta.quoteId,
      });
    } else {
      trackInsuranceEvent('insurance_lead_closed_lost', {
        leadId,
        actorId: actor.id,
        reason,
      });
    }

    return get().leads.find((l) => l.leadId === leadId)!;
  },

  /**
   * P4 L_P4_2: persist followup config on lead.
   */
  updateFollowupConfig(leadId: string, config: FollowupConfig): InsuranceLead {
    set((state) => {
      const l = state.leads.find((x) => x.leadId === leadId);
      if (!l) throw new Error(`Lead not found: ${leadId}`);
      l.followupConfig = config;
      l.updatedAt = new Date().toISOString();
    });
    return get().leads.find((l) => l.leadId === leadId)!;
  },

  /**
   * General-purpose lead update — patches a subset of fields. R09+ enforced
   * upstream by the UI Gate; the slice trusts the actor object for audit.
   * Emits no audit event (general edits aren't tracked individually); only
   * critical state changes (created, won, lost) emit events via createLead/closeLead.
   */
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
    _actor: StoreActor,
  ): InsuranceLead {
    set((state) => {
      const l = state.leads.find((x) => x.leadId === leadId);
      if (!l) throw new Error(`Lead not found: ${leadId}`);
      // L15: marketingConsent → also stamp consent timestamp
      if (patch.marketingConsentGiven === true && !l.marketingConsentAt) {
        l.marketingConsentAt = new Date().toISOString();
      } else if (patch.marketingConsentGiven === false) {
        l.marketingConsentAt = undefined;
      }
      Object.assign(l, patch);
      l.updatedAt = new Date().toISOString();
    });
    return get().leads.find((l) => l.leadId === leadId)!;
  },

  /**
   * Tick followup sequences: find leads where nextDueAt <= now.
   * Skips closed leads (closed-won / closed-lost), paused, and completed sequences.
   * Returns list of overdue leadIds for banner display.
   */
  tickFollowups(now: Date): { overdue: string[] } {
    const overdue: string[] = [];
    const nowIso = now.toISOString();

    for (const lead of get().leads) {
      // Closed leads are not eligible for followup
      if (lead.stage === 'closed-won' || lead.stage === 'closed-lost') continue;

      const seq = lead.followupSequenceState;
      if (seq.paused || seq.completedAt) continue;
      if (!seq.nextDueAt) continue;
      if (seq.nextDueAt <= nowIso) {
        overdue.push(lead.leadId);
      }
    }

    return { overdue };
  },

  /**
   * §5.7: Record a manual outcome for a follow-up step (mark done / skip).
   *
   * Gate: R09+ (enforced by UI Gate; action trusts actor role for audit).
   * - Updates lead.followupSequenceState.currentStepIndex and lastOutcome.
   * - Appends a ManualCallRecord to state.manualCallLog.
   * - Emits InsuranceAuditEvent of kind 'followup_outcome_recorded'.
   *
   * SKIPPED_* outcomes advance the step without marking sequence complete.
   * COMPLETED_FOLLOW_LATER stores nextActionAt on the sequence state.
   */
  recordFollowupOutcome(
    leadId: string,
    stepIndex: number,
    outcome: ManualFollowupOutcome,
    notes: string,
    actor: StoreActor,
    nextActionAt?: string,
  ): ManualCallRecord {
    if (rank(actor.role) < 9) {
      throw new PermissionError('recordFollowupOutcome', 'R09', actor.role);
    }

    const lead = get().leads.find((l) => l.leadId === leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);
    if (notes.length < 10) {
      throw new Error('Notes must be at least 10 characters.');
    }
    if (outcome === 'COMPLETED_FOLLOW_LATER' && !nextActionAt) {
      throw new Error('nextActionAt is required when outcome is COMPLETED_FOLLOW_LATER.');
    }

    const now = new Date().toISOString();
    const callId = `mcr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const record: ManualCallRecord = {
      callId,
      leadId,
      kind: 'MANUAL_OUTCOME',
      stepIndex,
      outcome,
      notes,
      nextActionAt: outcome === 'COMPLETED_FOLLOW_LATER' ? nextActionAt : undefined,
      actorId: actor.id,
      actorRole: actor.role,
      recordedAt: now,
    };

    set((state) => {
      const l = state.leads.find((x) => x.leadId === leadId);
      if (!l) return;

      // Advance step index
      l.followupSequenceState.currentStepIndex = stepIndex + 1;
      l.followupSequenceState.lastOutcome = outcome;

      // For COMPLETED_FOLLOW_LATER, set next due date
      if (outcome === 'COMPLETED_FOLLOW_LATER' && nextActionAt) {
        l.followupSequenceState.nextDueAt = nextActionAt;
      } else {
        // Clear nextDueAt until next step is scheduled
        l.followupSequenceState.nextDueAt = undefined;
      }

      l.updatedAt = now;

      state.manualCallLog.push(record);
    });

    // Audit event
    get().appendAuditEvent({
      kind: 'followup_outcome_recorded',
      entityId: leadId,
      entityType: 'lead',
      actorId: actor.id,
      actorRole: actor.role,
      description: `Follow-up step ${stepIndex} recorded: ${outcome}`,
      metadata: { stepIndex, outcome, nextActionAt },
    });

    return record;
  },

  /**
   * §5.7 Feature 2: Bulk mark overdue leads as not-reached (R10+).
   * Creates a SKIPPED_NO_REACH ManualCallRecord for each lead's current step.
   */
  bulkMarkOverdueNotReached(leadIds: string[], actor: StoreActor): ManualCallRecord[] {
    if (rank(actor.role) < 10) {
      throw new PermissionError('bulkMarkOverdueNotReached', 'R10', actor.role);
    }

    const records: ManualCallRecord[] = [];
    for (const leadId of leadIds) {
      const lead = get().leads.find((l) => l.leadId === leadId);
      if (!lead) continue;

      try {
        const record = get().recordFollowupOutcome(
          leadId,
          lead.followupSequenceState.currentStepIndex,
          'SKIPPED_NO_REACH',
          'Bulk marked as not reached via overdue banner action.',
          actor,
        );
        records.push(record);
      } catch {
        // Skip leads that fail individually; do not abort the whole batch
      }
    }
    return records;
  },
});
