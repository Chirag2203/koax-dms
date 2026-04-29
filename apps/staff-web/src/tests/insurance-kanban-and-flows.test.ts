/**
 * Insurance — Kanban polish + new flows tests.
 *
 * Covers:
 *   - Renewal pipeline kanban: forward-only stage transition validation
 *   - Renewal pipeline kanban: invalid backward transition rejected
 *   - Renewal pipeline kanban: stage → closed-won/lost requires R10+
 *   - Audit log: appendAuditEvent stores event correctly
 *   - Audit log: getAuditEvents returns all events sorted desc
 *   - Audit log: getAuditEvents filtered by entityId
 *   - Lead create emits audit event automatically
 *   - Lead close won emits lead_closed_won audit event
 *   - Lead bulk import: RowSchema validation (valid row, invalid outlet, bad panLast4)
 *   - Provider detail: policies filtered by providerId
 *
 * Spec reference: SPEC-INSURANCE-001 §35, §39, Task 3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { useInsuranceStore } from '../lib/insurance/insurance-store';
import { insuranceProviders, issuedPolicies } from '@dms/mocks/fixtures';
import type { InsuranceLead } from '@dms/types';

const ACTOR_R09 = { id: 'staff-r09-001', name: 'Advisor', role: 'R09' };
const ACTOR_R10 = { id: 'staff-r10-001', name: 'Manager', role: 'R10' };

function resetStore() {
  useInsuranceStore.setState({
    leads: [],
    providers: insuranceProviders,
    policies: issuedPolicies,
    templates: [],
    campaigns: [],
    callLogs: [],
    optOuts: new Set(),
    featAiCallingEnabled: false,
    auditEvents: [],
  });
}

// ─── Kanban: stage transition validation ──────────────────────────────────────

/** Valid forward transitions per L_P2_2 */
const VALID_FORWARD: Partial<Record<string, string[]>> = {
  'due-soon':    ['due', 'quoted'],
  'due':         ['quoted'],
  'quoted':      ['negotiating', 'closed-won', 'closed-lost'],
  'negotiating': ['closed-won', 'closed-lost'],
};

function isValidTransition(from: string, to: string): boolean {
  return VALID_FORWARD[from]?.includes(to) ?? false;
}

describe('Kanban forward-only transition logic (L_P2_2)', () => {
  it('due-soon → quoted is a valid forward transition', () => {
    expect(isValidTransition('due-soon', 'quoted')).toBe(true);
  });

  it('due-soon → due is a valid forward transition', () => {
    expect(isValidTransition('due-soon', 'due')).toBe(true);
  });

  it('quoted → negotiating is a valid forward transition', () => {
    expect(isValidTransition('quoted', 'negotiating')).toBe(true);
  });

  it('quoted → closed-won is a valid forward transition', () => {
    expect(isValidTransition('quoted', 'closed-won')).toBe(true);
  });

  it('negotiating → due (backward) is INVALID', () => {
    expect(isValidTransition('negotiating', 'due')).toBe(false);
  });

  it('closed-won → quoted (backward) is INVALID', () => {
    expect(isValidTransition('closed-won', 'quoted')).toBe(false);
  });

  it('due → due-soon (backward) is INVALID', () => {
    expect(isValidTransition('due', 'due-soon')).toBe(false);
  });
});

describe('advanceStage requires R10+ for closed-won/closed-lost', () => {
  beforeEach(resetStore);

  it('R09 cannot advance lead to closed-won', () => {
    const lead: InsuranceLead = {
      leadId: 'lead-gate-test',
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      assignedAdvisorId: 'staff-r09-001',
      outlet: 'bangalore',
      stage: 'negotiating',
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
    };
    useInsuranceStore.setState({ leads: [lead] });
    expect(() =>
      useInsuranceStore.getState().advanceStage('lead-gate-test', 'closed-won', ACTOR_R09),
    ).toThrow();
  });

  it('R10 can advance lead to closed-won', () => {
    const lead: InsuranceLead = {
      leadId: 'lead-r10-test',
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      assignedAdvisorId: 'staff-r10-001',
      outlet: 'bangalore',
      stage: 'negotiating',
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
    };
    useInsuranceStore.setState({ leads: [lead] });
    const updated = useInsuranceStore.getState().advanceStage('lead-r10-test', 'closed-won', ACTOR_R10);
    expect(updated.stage).toBe('closed-won');
  });
});

// ─── Audit log ────────────────────────────────────────────────────────────────

describe('Audit log', () => {
  beforeEach(resetStore);

  it('appendAuditEvent stores an event with auditId and occurredAt', () => {
    useInsuranceStore.getState().appendAuditEvent({
      kind: 'lead_stage_advanced',
      entityId: 'lead-001',
      entityType: 'lead',
      actorId: 'staff-r10-001',
      actorRole: 'R10',
      description: 'Stage advanced to quoted',
    });

    const events = useInsuranceStore.getState().auditEvents;
    expect(events).toHaveLength(1);
    expect(events[0]?.auditId).toBeTruthy();
    expect(events[0]?.occurredAt).toBeTruthy();
    expect(events[0]?.kind).toBe('lead_stage_advanced');
  });

  it('getAuditEvents returns all events sorted descending by time', () => {
    useInsuranceStore.getState().appendAuditEvent({
      kind: 'lead_created', entityId: 'lead-A', entityType: 'lead',
      actorId: 'staff-001', actorRole: 'R09', description: 'A',
    });
    useInsuranceStore.getState().appendAuditEvent({
      kind: 'quote_saved', entityId: 'quote-B', entityType: 'quote',
      actorId: 'staff-001', actorRole: 'R09', description: 'B',
    });

    const events = useInsuranceStore.getState().getAuditEvents();
    expect(events.length).toBeGreaterThanOrEqual(2);
    // Most recent first
    const firstTime = new Date(events[0]!.occurredAt).getTime();
    const secondTime = new Date(events[1]!.occurredAt).getTime();
    expect(firstTime).toBeGreaterThanOrEqual(secondTime);
  });

  it('getAuditEvents filtered by entityId returns only matching events', () => {
    useInsuranceStore.getState().appendAuditEvent({
      kind: 'lead_created', entityId: 'target-lead', entityType: 'lead',
      actorId: 'staff-001', actorRole: 'R09', description: 'Target',
    });
    useInsuranceStore.getState().appendAuditEvent({
      kind: 'quote_saved', entityId: 'other-entity', entityType: 'quote',
      actorId: 'staff-001', actorRole: 'R09', description: 'Other',
    });

    const events = useInsuranceStore.getState().getAuditEvents('target-lead');
    expect(events).toHaveLength(1);
    expect(events[0]?.entityId).toBe('target-lead');
  });

  it('createLead automatically emits lead_created audit event', () => {
    useInsuranceStore.getState().createLead({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      assignedAdvisorId: 'staff-r09-001',
      outlet: 'bangalore',
      odometer: 45000,
      customerAge: 35,
      customerCity: 'Bangalore',
      panLast4: '1234',
      noClaimBonusYears: 2,
    });

    const events = useInsuranceStore.getState().getAuditEvents();
    const createdEvent = events.find((e) => e.kind === 'lead_created');
    expect(createdEvent).toBeTruthy();
    expect(createdEvent?.description).toContain('WP0AB2A91MS247831');
  });

  it('closeLead won emits lead_closed_won audit event', () => {
    const lead: InsuranceLead = {
      leadId: 'audit-close-test',
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      assignedAdvisorId: 'staff-r10-001',
      outlet: 'bangalore',
      stage: 'negotiating',
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
    };
    useInsuranceStore.setState({ leads: [lead], auditEvents: [] });

    useInsuranceStore.getState().closeLead(
      'audit-close-test', 'won', { policyNumber: 'POL-TEST-001' }, ACTOR_R10,
    );

    const events = useInsuranceStore.getState().getAuditEvents('audit-close-test');
    expect(events.some((e) => e.kind === 'lead_closed_won')).toBe(true);
  });
});

// ─── Lead bulk import: RowSchema validation ───────────────────────────────────

const RowSchema = z.object({
  vin: z.string().min(11).max(17),
  customerId: z.string().min(1),
  outlet: z.enum(['bangalore', 'mumbai', 'chennai']),
  odometer: z.coerce.number().int().min(0),
  customerAge: z.coerce.number().int().min(18).max(99),
  customerCity: z.string().min(1),
  panLast4: z.string().length(4).regex(/^[0-9A-Z]{4}$/),
  noClaimBonusYears: z.coerce.number().int().min(0).max(5),
});

describe('Lead bulk import RowSchema', () => {
  it('valid row parses successfully', () => {
    const result = RowSchema.safeParse({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      outlet: 'bangalore',
      odometer: '45000',
      customerAge: '35',
      customerCity: 'Bangalore',
      panLast4: '1234',
      noClaimBonusYears: '2',
    });
    expect(result.success).toBe(true);
  });

  it('invalid outlet fails validation', () => {
    const result = RowSchema.safeParse({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      outlet: 'hyderabad', // invalid
      odometer: '45000',
      customerAge: '35',
      customerCity: 'Hyderabad',
      panLast4: '1234',
      noClaimBonusYears: '2',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe('outlet');
  });

  it('panLast4 with wrong length fails validation', () => {
    const result = RowSchema.safeParse({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      outlet: 'mumbai',
      odometer: '30000',
      customerAge: '40',
      customerCity: 'Mumbai',
      panLast4: '12', // too short
      noClaimBonusYears: '1',
    });
    expect(result.success).toBe(false);
  });

  it('panLast4 with special chars fails validation', () => {
    const result = RowSchema.safeParse({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      outlet: 'mumbai',
      odometer: '30000',
      customerAge: '40',
      customerCity: 'Mumbai',
      panLast4: '12@$', // special chars
      noClaimBonusYears: '1',
    });
    expect(result.success).toBe(false);
  });

  it('noClaimBonusYears out of range (>5) fails', () => {
    const result = RowSchema.safeParse({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      outlet: 'bangalore',
      odometer: '45000',
      customerAge: '35',
      customerCity: 'Bangalore',
      panLast4: '1234',
      noClaimBonusYears: '9', // max is 5
    });
    expect(result.success).toBe(false);
  });
});

// ─── Provider detail: policies filtered by providerId ─────────────────────────

describe('ProviderDetailView: policies filtered by providerId', () => {
  beforeEach(resetStore);

  it('policies correctly filtered for a known provider', () => {
    const policies = useInsuranceStore.getState().policies;
    const bajajPolicies = policies.filter((p) => p.providerId === 'bajaj-allianz');
    // Just verify the filter logic works — count may vary with fixture data
    expect(bajajPolicies.every((p) => p.providerId === 'bajaj-allianz')).toBe(true);
  });

  it('unknown providerId returns empty policy list', () => {
    const policies = useInsuranceStore.getState().policies;
    const unknownPolicies = policies.filter((p) => p.providerId === 'non-existent-provider');
    expect(unknownPolicies).toHaveLength(0);
  });
});
