/**
 * AI call slice — display-only in P3 (L17 / B5); feature-flagged dispatch in P4.
 *
 * P3: triggerAICall creates an AICallLog with isMocked: true. No lead stage mutation.
 * P4: dispatchAiCall checks feat_insurance_ai_calling flag (L_P4_1).
 *     When flag is OFF → throws AICallingDisabledError.
 *     When flag is ON  → same mocked dispatch (real wiring P5+).
 *
 * Spec reference: SPEC-INSURANCE-001 §5.6, §33, L17, L_P4_1
 */

import type { AICallLog } from '@dms/types';
import type { InsuranceSlice, AIActions, StoreActor } from '../types';
import { AICallingDisabledError } from '../types';

// ── Stage-specific scripts (P4 §33) ──────────────────────────────────────────

export const AI_CALL_SCRIPTS = [
  {
    id: 'script-new-lead-intro',
    name: 'New Lead Intro',
    stage: 'due',
    previewText: 'Hello, I\'m calling from BN Automobiles about motor insurance for your vehicle. We have some great options for you.',
  },
  {
    id: 'script-followup-no-response',
    name: 'Follow-Up (No Response)',
    stage: 'quoted',
    previewText: 'Hi, this is a follow-up call from BN Automobiles. We sent you an insurance comparison quote. Did you get a chance to review it?',
  },
  {
    id: 'script-negotiation-discount',
    name: 'Negotiation — Discount Offer',
    stage: 'negotiating',
    previewText: 'Hello, I\'m calling from BN Automobiles. We have a special discount offer on your insurance renewal. Our advisor can help you save significantly.',
  },
  {
    id: 'script-expiry-reminder',
    name: 'Expiry Reminder',
    stage: 'due-soon',
    previewText: 'Hi, your vehicle insurance is expiring soon. BN Automobiles can help you compare and renew with the best provider. Don\'t let your policy lapse.',
  },
] as const;

// ── Mocked transcripts pool ───────────────────────────────────────────────────

const TRANSCRIPT_POOL: string[] = [
  "Agent: Good morning, calling about your motor insurance renewal from BN Automobiles. Customer: Yes, speaking. Agent: Shall I connect you to our advisor for details? Customer: Sure, call me tomorrow.",
  "Agent: Hello, calling regarding your insurance renewal. Customer: That sounds interesting. Tell me more. Agent: Our comparison found a great rate. Customer: I'd like to proceed.",
  "Agent: Good afternoon, calling about insurance. Customer: I've already bought insurance elsewhere. Agent: Understood. Would you like help at next renewal? Customer: Maybe.",
  "Agent: Hello, insurance renewal call from BN Automobiles. Customer: Not a good time. Agent: When would be better? Customer: Call me Thursday.",
  "Agent: Calling about your vehicle insurance. Customer: Interested, what's the best offer? Agent: HDFC ERGO has excellent CSR. Customer: Send the details.",
  "Agent: Good morning, insurance renewal. Customer: I was expecting your call. Agent: Great, shall we proceed? Customer: Yes.",
  "Agent: Calling about insurance. Customer: The quote looks good. Agent: Engine protection included. Customer: Let's proceed.",
  "Agent: Good afternoon, insurance for your vehicle. Customer: Must be wrong number. Agent: Apologies.",
  "Agent: Calling about renewal. Customer: Stop calling! Agent: Apologies, marking as do-not-contact. Customer: Thank you.",
  "Agent: Insurance renewal call. Customer: Interested. Agent: Bajaj Allianz has competitive rates. Customer: Let's proceed.",
];

const OUTCOME_POOL: AICallLog['outcome'][] = [
  'interested', 'interested', 'callback', 'callback', 'callback',
  'not-interested', 'not-interested', 'wrong-number', 'do-not-call', 'interested',
];

function makeCallLog(
  leadId: string,
  stage: AICallLog['stage'],
  actorId: string,
  scriptId?: string,
): AICallLog {
  const idx = Math.floor(Math.random() * OUTCOME_POOL.length);
  const outcome = OUTCOME_POOL[idx]!;
  const transcript = TRANSCRIPT_POOL[idx % TRANSCRIPT_POOL.length];
  const now = new Date().toISOString();
  const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    callId,
    leadId,
    stage,
    scriptId,
    status: 'COMPLETED',
    calledAt: now,
    durationSeconds: 120 + Math.floor(Math.random() * 180),
    transcript: transcript ?? 'Transcript not available.',
    outcome,
    actorId,
    isMocked: true,
    ...(outcome === 'callback'
      ? { callbackScheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() }
      : {}),
  };
}

export const createAICallSlice: InsuranceSlice<AIActions> = (set, get) => ({
  /**
   * P3: display-only. Creates a mocked AICallLog.
   * Does NOT mutate lead stage — L17 / B5.
   */
  triggerAICall(leadId: string, actor: StoreActor): AICallLog {
    const lead = get().leads.find((l) => l.leadId === leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    const log = makeCallLog(leadId, lead.stage, actor.id);

    set((state) => {
      state.callLogs.push(log);
      // NOTE: L17 — do NOT mutate lead.stage here (P3 display-only)
    });

    return log;
  },

  /**
   * P4: feature-flag-gated dispatch.
   * L_P4_1: throws AICallingDisabledError when flag is OFF.
   * Auto-close-lost on 'do-not-call' only when flag is ON and isMocked === false.
   * In P4 mock mode: isMocked = true but dispatch path is used.
   */
  dispatchAiCall(leadId: string, scriptId: string, actor: StoreActor): AICallLog {
    if (!get().featAiCallingEnabled) {
      throw new AICallingDisabledError();
    }

    const lead = get().leads.find((l) => l.leadId === leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    const log = makeCallLog(leadId, lead.stage, actor.id, scriptId);

    set((state) => {
      state.callLogs.push(log);
      // Auto-close-lost on do-not-call only when real (isMocked === false)
      // In P4, isMocked is always true so no auto-mutation
      if (!log.isMocked && log.outcome === 'do-not-call') {
        const l = state.leads.find((x) => x.leadId === leadId);
        if (l && l.stage !== 'closed-won' && l.stage !== 'closed-lost') {
          l.stage = 'closed-lost';
          l.closedReason = 'do-not-contact';
          l.closedAt = new Date().toISOString();
          l.updatedAt = new Date().toISOString();
        }
      }
    });

    return log;
  },
});
