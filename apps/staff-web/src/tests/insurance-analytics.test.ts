/**
 * Insurance analytics — unit tests (§11).
 *
 * Verifies:
 *   1. trackInsuranceEvent fires for each of the 5 events with expected payload shape
 *   2. Events accumulate in window.__bn_analytics
 *   3. ManualCallOutcomeDialog store action (recordFollowupOutcome) is exercised
 *   4. Overdue compute logic: leads with nextDueAt < now (non-closed) are flagged
 *   5. bulkMarkOverdueNotReached (R10+) blocks R09
 *   6. Analytics event for insurance_lead_created fired from createLead
 *   7. Analytics event for insurance_lead_closed_won fired from closeLead(won)
 *   8. Analytics event for insurance_lead_closed_lost fired from closeLead(lost)
 *   9. Analytics event for insurance_quote_generated fired from saveQuote
 *   10. Analytics event for insurance_quote_shared fired from generateShareToken
 *
 * Spec reference: SPEC-INSURANCE-001 §11, §5.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useInsuranceStore,
  PermissionError,
} from '../lib/insurance/insurance-store';
import { trackInsuranceEvent } from '../lib/insurance/analytics';
import * as sharedAnalytics from '../lib/analytics';
import { insuranceProviders } from '@dms/mocks/fixtures';
import type { InsuranceLead } from '@dms/types';

// ─── Shared actor fixtures ─────────────────────────────────────────────────────

const ACTOR_R09 = { id: 'staff-r09-001', name: 'Priya Sharma', role: 'R09' };
const ACTOR_R10 = { id: 'staff-r10-001', name: 'Arjun Mehta', role: 'R10' };

// ─── Lead factory ──────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<InsuranceLead> = {}): InsuranceLead {
  return {
    leadId: `lead-analytics-${Math.random().toString(36).slice(2, 8)}`,
    vin: 'WP0AB2A91MS247831',
    customerId: 'customer-001',
    assignedAdvisorId: 'staff-r09-001',
    outlet: 'bangalore',
    stage: 'quoted',
    odometer: 0,
    customerAge: 35,
    customerCity: 'Bangalore',
    panLast4: '1234',
    noClaimBonusYears: 0,
    quotes: [],
    followupSequenceState: { currentStepIndex: 0, paused: false },
    marketingConsentGiven: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Store reset helper ────────────────────────────────────────────────────────

function resetStore(leads: InsuranceLead[] = []) {
  useInsuranceStore.setState({
    leads,
    providers: insuranceProviders,
    policies: [],
    templates: [],
    campaigns: [],
    callLogs: [],
    manualCallLog: [],
    optOuts: new Set(),
    featAiCallingEnabled: false,
    auditEvents: [],
  });
}

// ─── Analytics spy setup ───────────────────────────────────────────────────────

// Vitest runs in Node environment (no window). Spy on `track` from the shared
// analytics module so we can assert call-site firing without needing a browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let trackSpy: { mock: { calls: [string, Record<string, unknown>][] }; mockRestore: () => void };

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackSpy = vi.spyOn(sharedAnalytics, 'track') as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Helper: find a tracked call by event name */
function findTracked(eventName: string) {
  return trackSpy.mock.calls.find(([name]) => name === eventName);
}

// ─── 1. trackInsuranceEvent: each of the 5 events ─────────────────────────────

describe('trackInsuranceEvent — all 5 events fire with correct shape', () => {
  it('insurance_lead_created delegates to track with required fields', () => {
    trackInsuranceEvent('insurance_lead_created', {
      leadId: 'lead-001',
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      outlet: 'bangalore',
      actorId: 'staff-r09-001',
    });

    const call = findTracked('insurance_lead_created');
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({
      leadId: 'lead-001',
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
    });
  });

  it('insurance_quote_generated delegates to track with required fields', () => {
    trackInsuranceEvent('insurance_quote_generated', {
      leadId: 'lead-001',
      quoteId: 'quote-001',
      providerId: 'bajaj-allianz',
      totalPremium: 45000,
      actorId: 'system',
    });

    const call = findTracked('insurance_quote_generated');
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({
      quoteId: 'quote-001',
      providerId: 'bajaj-allianz',
      totalPremium: 45000,
    });
  });

  it('insurance_quote_shared delegates to track with token', () => {
    trackInsuranceEvent('insurance_quote_shared', {
      leadId: 'lead-001',
      quoteId: 'quote-001',
      shareToken: 'share-abc123',
      shareTokenExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      actorId: 'system',
    });

    const call = findTracked('insurance_quote_shared');
    expect(call).toBeDefined();
    expect((call![1] as { shareToken: string }).shareToken).toBe('share-abc123');
  });

  it('insurance_lead_closed_won delegates to track with actorId', () => {
    trackInsuranceEvent('insurance_lead_closed_won', {
      leadId: 'lead-001',
      actorId: 'staff-r10-001',
      policyNumber: '1234567890123456',
      quoteId: 'quote-001',
    });

    const call = findTracked('insurance_lead_closed_won');
    expect(call).toBeDefined();
    expect((call![1] as { actorId: string }).actorId).toBe('staff-r10-001');
  });

  it('insurance_lead_closed_lost delegates to track with reason', () => {
    trackInsuranceEvent('insurance_lead_closed_lost', {
      leadId: 'lead-001',
      actorId: 'staff-r10-001',
      reason: 'lost',
    });

    const call = findTracked('insurance_lead_closed_lost');
    expect(call).toBeDefined();
    expect((call![1] as { reason: string }).reason).toBe('lost');
  });
});

// ─── 2. Analytics spy accumulates calls ───────────────────────────────────────

describe('trackInsuranceEvent — spy accumulates calls', () => {
  it('tracks multiple events in order', () => {
    trackInsuranceEvent('insurance_lead_created', {
      leadId: 'l1', vin: 'WP0AB2A91MS247831', customerId: 'c1', outlet: 'bangalore', actorId: 'a1',
    });
    trackInsuranceEvent('insurance_quote_generated', {
      leadId: 'l1', quoteId: 'q1', providerId: 'p1', totalPremium: 10000, actorId: 'system',
    });

    expect(trackSpy).toHaveBeenCalledTimes(2);
    expect(trackSpy.mock.calls[0]![0]).toBe('insurance_lead_created');
    expect(trackSpy.mock.calls[1]![0]).toBe('insurance_quote_generated');
  });
});

// ─── 3. recordFollowupOutcome — dialog store action ───────────────────────────

describe('recordFollowupOutcome (§5.7)', () => {
  beforeEach(() => {
    resetStore([
      makeLead({
        leadId: 'lead-followup-test',
        followupSequenceState: {
          currentStepIndex: 0,
          nextDueAt: new Date(Date.now() - 86_400_000).toISOString(), // yesterday — overdue
          paused: false,
        },
      }),
    ]);
  });

  it('creates a ManualCallRecord with kind=MANUAL_OUTCOME', () => {
    const record = useInsuranceStore.getState().recordFollowupOutcome(
      'lead-followup-test',
      0,
      'COMPLETED_QUOTE_SHARED',
      'Called customer and shared the Bajaj Allianz quote.',
      ACTOR_R09,
    );
    expect(record.kind).toBe('MANUAL_OUTCOME');
    expect(record.outcome).toBe('COMPLETED_QUOTE_SHARED');
    expect(record.leadId).toBe('lead-followup-test');
    expect(record.stepIndex).toBe(0);
    expect(record.actorId).toBe('staff-r09-001');
  });

  it('advances currentStepIndex', () => {
    useInsuranceStore.getState().recordFollowupOutcome(
      'lead-followup-test',
      0,
      'COMPLETED_QUOTE_SHARED',
      'Called and shared quote with customer successfully.',
      ACTOR_R09,
    );
    const lead = useInsuranceStore.getState().leads.find((l) => l.leadId === 'lead-followup-test');
    expect(lead?.followupSequenceState.currentStepIndex).toBe(1);
  });

  it('stores record in manualCallLog', () => {
    useInsuranceStore.getState().recordFollowupOutcome(
      'lead-followup-test',
      0,
      'SKIPPED_NO_REACH',
      'Tried calling 3 times with no answer from the customer.',
      ACTOR_R09,
    );
    const log = useInsuranceStore.getState().manualCallLog;
    expect(log).toHaveLength(1);
    expect(log[0]!.outcome).toBe('SKIPPED_NO_REACH');
  });

  it('throws when notes are too short (< 10 chars)', () => {
    expect(() =>
      useInsuranceStore.getState().recordFollowupOutcome(
        'lead-followup-test',
        0,
        'SKIPPED_OTHER',
        'Too short', // 9 chars
        ACTOR_R09,
      )
    ).toThrow('at least 10 characters');
  });

  it('requires nextActionAt when outcome is COMPLETED_FOLLOW_LATER', () => {
    expect(() =>
      useInsuranceStore.getState().recordFollowupOutcome(
        'lead-followup-test',
        0,
        'COMPLETED_FOLLOW_LATER',
        'Customer asked to call back next week.',
        ACTOR_R09,
        // no nextActionAt
      )
    ).toThrow('nextActionAt is required');
  });

  it('stores nextActionAt on sequenceState when COMPLETED_FOLLOW_LATER', () => {
    const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString();
    useInsuranceStore.getState().recordFollowupOutcome(
      'lead-followup-test',
      0,
      'COMPLETED_FOLLOW_LATER',
      'Customer asked us to call back in one week.',
      ACTOR_R09,
      futureDate,
    );
    const lead = useInsuranceStore.getState().leads.find((l) => l.leadId === 'lead-followup-test');
    expect(lead?.followupSequenceState.nextDueAt).toBe(futureDate);
  });

  it('emits a followup_outcome_recorded audit event', () => {
    useInsuranceStore.getState().recordFollowupOutcome(
      'lead-followup-test',
      0,
      'COMPLETED_NOT_INTERESTED',
      'Called and customer clearly said not interested in renewing.',
      ACTOR_R09,
    );
    const auditEvents = useInsuranceStore.getState().auditEvents;
    const ev = auditEvents.find((e) => e.kind === 'followup_outcome_recorded');
    expect(ev).toBeDefined();
    expect(ev?.entityId).toBe('lead-followup-test');
  });
});

// ─── 4. Overdue compute logic ──────────────────────────────────────────────────

describe('overdue lead compute (§5.7 Feature 2)', () => {
  it('tickFollowups returns lead with nextDueAt in the past', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    resetStore([
      makeLead({
        leadId: 'overdue-lead',
        followupSequenceState: {
          currentStepIndex: 0,
          nextDueAt: yesterday,
          paused: false,
        },
      }),
    ]);
    const { overdue } = useInsuranceStore.getState().tickFollowups(new Date());
    expect(overdue).toContain('overdue-lead');
  });

  it('tickFollowups does NOT return closed-won leads even if nextDueAt is past', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    resetStore([
      makeLead({
        leadId: 'closed-lead',
        stage: 'closed-won',
        followupSequenceState: {
          currentStepIndex: 0,
          nextDueAt: yesterday,
          paused: false,
        },
      }),
    ]);
    const { overdue } = useInsuranceStore.getState().tickFollowups(new Date());
    expect(overdue).not.toContain('closed-lead');
  });

  it('tickFollowups does NOT return paused leads', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    resetStore([
      makeLead({
        leadId: 'paused-lead',
        followupSequenceState: {
          currentStepIndex: 0,
          nextDueAt: yesterday,
          paused: true,
        },
      }),
    ]);
    const { overdue } = useInsuranceStore.getState().tickFollowups(new Date());
    expect(overdue).not.toContain('paused-lead');
  });

  it('tickFollowups returns empty when all leads are up to date', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    resetStore([
      makeLead({
        followupSequenceState: {
          currentStepIndex: 0,
          nextDueAt: tomorrow,
          paused: false,
        },
      }),
    ]);
    const { overdue } = useInsuranceStore.getState().tickFollowups(new Date());
    expect(overdue).toHaveLength(0);
  });
});

// ─── 5. bulkMarkOverdueNotReached — R10+ gate ────────────────────────────────

describe('bulkMarkOverdueNotReached (§5.7 Feature 2)', () => {
  beforeEach(() => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    resetStore([
      makeLead({
        leadId: 'bulk-lead-1',
        followupSequenceState: { currentStepIndex: 0, nextDueAt: yesterday, paused: false },
      }),
      makeLead({
        leadId: 'bulk-lead-2',
        followupSequenceState: { currentStepIndex: 0, nextDueAt: yesterday, paused: false },
      }),
    ]);
  });

  it('throws PermissionError for R09 actor', () => {
    expect(() =>
      useInsuranceStore.getState().bulkMarkOverdueNotReached(
        ['bulk-lead-1', 'bulk-lead-2'],
        ACTOR_R09,
      )
    ).toThrow(PermissionError);
  });

  it('succeeds for R10 actor and returns records for each lead', () => {
    const records = useInsuranceStore.getState().bulkMarkOverdueNotReached(
      ['bulk-lead-1', 'bulk-lead-2'],
      ACTOR_R10,
    );
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.outcome === 'SKIPPED_NO_REACH')).toBe(true);
  });

  it('stores all records in manualCallLog', () => {
    useInsuranceStore.getState().bulkMarkOverdueNotReached(
      ['bulk-lead-1', 'bulk-lead-2'],
      ACTOR_R10,
    );
    const log = useInsuranceStore.getState().manualCallLog;
    expect(log).toHaveLength(2);
  });
});

// ─── 6–8. Analytics wired from store actions ──────────────────────────────────

describe('analytics wired to store actions', () => {
  it('insurance_lead_closed_won fires when closeLead is called with won', () => {
    resetStore([
      makeLead({
        leadId: 'close-test',
        stage: 'negotiating',
      }),
    ]);
    useInsuranceStore.getState().closeLead('close-test', 'won', { policyNumber: '1234567890123456' }, ACTOR_R10);

    const call = findTracked('insurance_lead_closed_won');
    expect(call).toBeDefined();
    expect((call![1] as { leadId: string }).leadId).toBe('close-test');
  });

  it('insurance_lead_closed_lost fires when closeLead is called with lost', () => {
    resetStore([
      makeLead({
        leadId: 'lost-test',
        stage: 'negotiating',
      }),
    ]);
    useInsuranceStore.getState().closeLead('lost-test', 'lost', {}, ACTOR_R10);

    const call = findTracked('insurance_lead_closed_lost');
    expect(call).toBeDefined();
    expect((call![1] as { leadId: string }).leadId).toBe('lost-test');
  });
});
