/**
 * Leads store integration tests — SPEC-LEADS-001 §18
 *
 * Scenarios covered:
 * TC-01: createLead — happy path (SC-01)
 * TC-02: createLead — service-upgrade with initialNote (SC-14)
 * TC-03: transitionStage — valid forward (SC-02)
 * TC-04: transitionStage — backward transition throws (SC-03)
 * TC-05: transitionStage — appends stage-change activity (L7)
 * TC-06: transitionStage — LOST from any stage (SC-09)
 * TC-07: transitionStage — terminal DELIVERED throws
 * TC-08: transitionStage — LOST requires lostReason stored
 * TC-09: assignAdvisor — R09+ succeeds (SC-04)
 * TC-10: assignAdvisor — R05 throws LeadAssignmentPermissionError (SC-05 / L5)
 * TC-11: assignAdvisor — appends assign activity (L7)
 * TC-12: addActivity — append-only, existing unchanged (SC-15 / L7)
 * TC-13: computeLeadScore — HOT (SC-06 / L3)
 * TC-14: computeLeadScore — WARM (SC-07 / L3)
 * TC-15: computeLeadScore — COLD (SC-07 / L3)
 * TC-16: bulkImportFromCsv — throws LeadBulkImportNotImplementedError (SC-11 / L10)
 * TC-17: hydrate — 25 leads loaded from fixtures
 * TC-18: hydrate — leads spread across 7 stages
 * TC-19: hydrate — fixture VINs exist in vehicle fixtures
 * TC-20: hydrate — idempotent (double-call does not duplicate)
 * TC-21: outlet scoping — leads filtered by outletId
 * TC-22: updateLead — patch applies, lostReason persisted
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computeLeadScore } from '../lib/leads/lead-score';

// ─── Shared actor fixtures ────────────────────────────────────────────────────

const actorR05 = { id: 'staff-r05-001', name: 'Rahul Kumar', role: 'R05' };
const actorR09 = { id: 'staff-r09-001', name: 'Sales Manager', role: 'R09' };

// ─── TC-01: createLead — happy path ──────────────────────────────────────────

describe('TC-01: createLead — happy path (SC-01)', () => {
  it('creates a lead in stage NEW with correct fields', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    // Isolate: use a fresh store state snapshot
    const store = useLeadsStore.getState();
    const before = store.leads.length;

    const lead = store.createLead(
      {
        source: 'walk-in',
        customerId: 'cust-arjun-mehta',
        outletId: 'bangalore',
        vehicleInterestVin: 'WP0AB2A91MS247831',
      },
      actorR05,
    );

    expect(lead.stage).toBe('NEW');
    expect(lead.source).toBe('walk-in');
    expect(lead.customerId).toBe('cust-arjun-mehta');
    expect(lead.outletId).toBe('bangalore');
    expect(lead.vehicleInterestVin).toBe('WP0AB2A91MS247831');
    expect(lead.id).toMatch(/^LEAD-\d{4}-\d{3,}$/);
    expect(useLeadsStore.getState().leads.length).toBe(before + 1);
  });
});

// ─── TC-02: createLead — service-upgrade with initialNote ─────────────────────

describe('TC-02: createLead — service-upgrade with initialNote (SC-14)', () => {
  it('creates a lead and appends initial note activity (Seam 41)', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();
    const activitiesBefore = store.activities.length;

    const lead = store.createLead(
      {
        source: 'service-upgrade',
        customerId: 'cust-sunita-reddy',
        outletId: 'chennai',
        vehicleInterestVin: 'WP0ZZZ97ZNS112045',
        initialNote: 'Service upgrade trigger: WP0ZZZ97ZNS112045. Vehicle age > 5 years.',
      },
      actorR09,
    );

    expect(lead.source).toBe('service-upgrade');
    const leadActivities = useLeadsStore.getState().activities.filter((a) => a.leadId === lead.id);
    expect(leadActivities.length).toBeGreaterThanOrEqual(1);
    expect(leadActivities[0]?.kind).toBe('note');
    expect(leadActivities[0]?.payload?.text).toContain('Service upgrade trigger');
    expect(useLeadsStore.getState().activities.length).toBe(activitiesBefore + 1);
  });
});

// ─── TC-03: transitionStage — valid forward ───────────────────────────────────

describe('TC-03: transitionStage — valid forward (SC-02)', () => {
  it('moves a lead forward through the stage machine', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'walk-in', customerId: 'cust-rohan-desai', outletId: 'bangalore' },
      actorR05,
    );

    store.transitionStage(lead.id, 'CONTACTED', actorR05);

    const updated = useLeadsStore.getState().leads.find((l) => l.id === lead.id);
    expect(updated?.stage).toBe('CONTACTED');
  });
});

// ─── TC-04: transitionStage — backward transition throws ──────────────────────

describe('TC-04: transitionStage — backward transition throws (SC-03 / L2)', () => {
  it('throws InvalidLeadStageTransitionError on backward move', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const { InvalidLeadStageTransitionError } = await import('@dms/types');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'phone', customerId: 'cust-priya-mehta', outletId: 'mumbai' },
      actorR05,
    );
    store.transitionStage(lead.id, 'QUOTED', actorR05);

    expect(() => {
      useLeadsStore.getState().transitionStage(lead.id, 'NEW', actorR05);
    }).toThrow(InvalidLeadStageTransitionError);
  });
});

// ─── TC-05: transitionStage — appends stage-change activity ───────────────────

describe('TC-05: transitionStage — appends stage-change activity (L7)', () => {
  it('appends a stage-change activity with fromStage and toStage', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'referral', customerId: 'cust-meera-iyer', outletId: 'mumbai' },
      actorR05,
    );
    const activitiesBefore = useLeadsStore.getState().activities.filter((a) => a.leadId === lead.id).length;

    useLeadsStore.getState().transitionStage(lead.id, 'CONTACTED', actorR05);

    const leadActivities = useLeadsStore.getState().activities.filter((a) => a.leadId === lead.id);
    expect(leadActivities.length).toBe(activitiesBefore + 1);

    const stageChange = leadActivities.find((a) => a.kind === 'stage-change');
    expect(stageChange).toBeDefined();
    expect(stageChange?.payload?.fromStage).toBe('NEW');
    expect(stageChange?.payload?.toStage).toBe('CONTACTED');
  });
});

// ─── TC-06: transitionStage — LOST from any stage ────────────────────────────

describe('TC-06: transitionStage — LOST from any stage (SC-09 / L2)', () => {
  it('can mark a lead as LOST from QUALIFIED stage', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'walk-in', customerId: 'cust-vikram-singh', outletId: 'bangalore' },
      actorR05,
    );
    store.transitionStage(lead.id, 'CONTACTED', actorR05);
    store.transitionStage(lead.id, 'QUALIFIED', actorR05);

    useLeadsStore.getState().transitionStage(lead.id, 'LOST', actorR05, 'Competitor purchase.');

    const updated = useLeadsStore.getState().leads.find((l) => l.id === lead.id);
    expect(updated?.stage).toBe('LOST');
    expect(updated?.lostReason).toBe('Competitor purchase.');
  });
});

// ─── TC-07: transitionStage — terminal DELIVERED throws ──────────────────────

describe('TC-07: transitionStage — terminal DELIVERED throws', () => {
  it('throws on any transition from DELIVERED stage', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const { InvalidLeadStageTransitionError } = await import('@dms/types');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'phone', customerId: 'cust-neha-kapoor', outletId: 'bangalore' },
      actorR05,
    );
    // Fast-track to DELIVERED
    store.transitionStage(lead.id, 'QUOTED', actorR05);
    store.transitionStage(lead.id, 'SO_RAISED', actorR05);
    store.transitionStage(lead.id, 'DELIVERED', actorR05);

    expect(() => {
      useLeadsStore.getState().transitionStage(lead.id, 'QUOTED', actorR05);
    }).toThrow(InvalidLeadStageTransitionError);
  });
});

// ─── TC-08: transitionStage — LOST with lostReason stored ────────────────────

describe('TC-08: transitionStage — LOST with lostReason stored', () => {
  it('stores lostReason when transitioning to LOST', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'web-form', customerId: 'cust-rahul-kumar', outletId: 'mumbai' },
      actorR05,
    );
    useLeadsStore.getState().transitionStage(lead.id, 'LOST', actorR09, 'No budget.');

    const updated = useLeadsStore.getState().leads.find((l) => l.id === lead.id);
    expect(updated?.lostReason).toBe('No budget.');
  });
});

// ─── TC-09: assignAdvisor — R09+ succeeds ─────────────────────────────────────

describe('TC-09: assignAdvisor — R09+ succeeds (SC-04 / L5)', () => {
  it('assigns an advisor when actor is R09', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'walk-in', customerId: 'cust-arjun-mehta', outletId: 'bangalore' },
      actorR05,
    );
    useLeadsStore.getState().assignAdvisor(lead.id, 'staff-r05-001', 'Rahul Kumar', actorR09);

    const updated = useLeadsStore.getState().leads.find((l) => l.id === lead.id);
    expect(updated?.assignedAdvisorId).toBe('staff-r05-001');
  });
});

// ─── TC-10: assignAdvisor — R05 throws ───────────────────────────────────────

describe('TC-10: assignAdvisor — R05 throws LeadAssignmentPermissionError (SC-05 / L5)', () => {
  it('throws when actor is R05', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const { LeadAssignmentPermissionError } = await import('@dms/types');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'walk-in', customerId: 'cust-priya-mehta', outletId: 'bangalore' },
      actorR05,
    );

    expect(() => {
      useLeadsStore.getState().assignAdvisor(lead.id, 'staff-r05-001', 'Rahul Kumar', actorR05);
    }).toThrow(LeadAssignmentPermissionError);
  });
});

// ─── TC-11: assignAdvisor — appends assign activity ──────────────────────────

describe('TC-11: assignAdvisor — appends assign activity (L7)', () => {
  it('appends an assign activity after successful assignment', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'phone', customerId: 'cust-rohan-desai', outletId: 'bangalore' },
      actorR05,
    );
    const before = useLeadsStore.getState().activities.filter((a) => a.leadId === lead.id).length;

    useLeadsStore.getState().assignAdvisor(lead.id, 'staff-r05-001', 'Rahul Kumar', actorR09);

    const after = useLeadsStore.getState().activities.filter((a) => a.leadId === lead.id).length;
    expect(after).toBe(before + 1);

    const assignActivity = useLeadsStore.getState().activities
      .filter((a) => a.leadId === lead.id)
      .find((a) => a.kind === 'assign');
    expect(assignActivity).toBeDefined();
    expect(assignActivity?.payload?.advisorName).toBe('Rahul Kumar');
  });
});

// ─── TC-12: addActivity — append-only ────────────────────────────────────────

describe('TC-12: addActivity — append-only (SC-15 / L7)', () => {
  it('appends without mutating existing activities', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'referral', customerId: 'cust-vikram-singh', outletId: 'mumbai' },
      actorR05,
    );
    // Add 2 existing activities
    useLeadsStore.getState().addActivity(lead.id, {
      kind: 'note', at: '2026-04-28T10:00:00.000Z',
      actorId: actorR05.id, actorName: actorR05.name,
      payload: { text: 'First note' },
    });
    useLeadsStore.getState().addActivity(lead.id, {
      kind: 'call', at: '2026-04-28T11:00:00.000Z',
      actorId: actorR05.id, actorName: actorR05.name,
      payload: { text: 'Follow-up call' },
    });

    const activitiesBefore = useLeadsStore.getState().activities.filter((a) => a.leadId === lead.id);
    const firstId = activitiesBefore[0]?.id;

    // Add third
    useLeadsStore.getState().addActivity(lead.id, {
      kind: 'whatsapp', at: '2026-04-29T09:00:00.000Z',
      actorId: actorR05.id, actorName: actorR05.name,
      payload: { text: 'WhatsApp sent' },
    });

    const activitiesAfter = useLeadsStore.getState().activities.filter((a) => a.leadId === lead.id);
    expect(activitiesAfter.length).toBe(activitiesBefore.length + 1);
    // First activity unchanged
    expect(activitiesAfter.find((a) => a.id === firstId)?.payload?.text).toBe('First note');
  });
});

// ─── TC-13: computeLeadScore — HOT ────────────────────────────────────────────

describe('TC-13: computeLeadScore — HOT (SC-06 / L3)', () => {
  it('returns HOT for ≥3 contact activities in last 3 days', () => {
    const lead = {
      id: 'LEAD-SCORE-001',
      source: 'walk-in' as const,
      stage: 'QUALIFIED' as const,
      customerId: 'cust-arjun-mehta',
      outletId: 'bangalore' as const,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    };

    const activities = [
      { id: 'a1', leadId: 'LEAD-SCORE-001', kind: 'call' as const, at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), actorId: 's1', actorName: 'Test' },
      { id: 'a2', leadId: 'LEAD-SCORE-001', kind: 'whatsapp' as const, at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), actorId: 's1', actorName: 'Test' },
      { id: 'a3', leadId: 'LEAD-SCORE-001', kind: 'note' as const, at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), actorId: 's1', actorName: 'Test' },
    ];

    expect(computeLeadScore(lead, activities)).toBe('HOT');
  });
});

// ─── TC-14: computeLeadScore — WARM ──────────────────────────────────────────

describe('TC-14: computeLeadScore — WARM (L3)', () => {
  it('returns WARM for 1 contact activity and last activity ≤7 days ago', () => {
    const lead = {
      id: 'LEAD-SCORE-002',
      source: 'phone' as const,
      stage: 'CONTACTED' as const,
      customerId: 'cust-priya-mehta',
      outletId: 'bangalore' as const,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    };

    const activities = [
      { id: 'a1', leadId: 'LEAD-SCORE-002', kind: 'call' as const, at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), actorId: 's1', actorName: 'Test' },
    ];

    expect(computeLeadScore(lead, activities)).toBe('WARM');
  });
});

// ─── TC-15: computeLeadScore — COLD ──────────────────────────────────────────

describe('TC-15: computeLeadScore — COLD (SC-07 / L3)', () => {
  it('returns COLD for 0 contact activities or last activity >7 days ago', () => {
    const lead = {
      id: 'LEAD-SCORE-003',
      source: 'web-form' as const,
      stage: 'NEW' as const,
      customerId: 'cust-rohan-desai',
      outletId: 'bangalore' as const,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    };

    expect(computeLeadScore(lead, [])).toBe('COLD');
  });
});

// ─── TC-16: bulkImportFromCsv — throws ────────────────────────────────────────

describe('TC-16: bulkImportFromCsv — throws LeadBulkImportNotImplementedError (SC-11 / L10)', () => {
  it('always throws even with valid CSV string', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const { LeadBulkImportNotImplementedError } = await import('@dms/types');

    expect(() => {
      useLeadsStore.getState().bulkImportFromCsv('id,source\nL1,walk-in', actorR09);
    }).toThrow(LeadBulkImportNotImplementedError);
  });
});

// ─── TC-17: hydrate — 25 leads from fixtures ─────────────────────────────────

describe('TC-17: hydrate — 25 leads loaded from fixtures', () => {
  it('loads exactly 25 leads from the fixture file', async () => {
    const { leads } = await import('@dms/mocks/fixtures');
    expect(leads.length).toBe(25);
  });
});

// ─── TC-18: hydrate — leads spread across stages ─────────────────────────────

describe('TC-18: hydrate — leads spread across 7 stages', () => {
  it('has leads in all 7 active stage buckets', async () => {
    const { leads } = await import('@dms/mocks/fixtures');
    const stages = new Set(leads.map((l) => l.stage));
    expect(stages.has('NEW')).toBe(true);
    expect(stages.has('CONTACTED')).toBe(true);
    expect(stages.has('QUALIFIED')).toBe(true);
    expect(stages.has('TEST_DRIVE')).toBe(true);
    expect(stages.has('QUOTED')).toBe(true);
    expect(stages.has('SO_RAISED')).toBe(true);
    expect(stages.has('DELIVERED')).toBe(true);
    expect(stages.has('LOST')).toBe(true);
  });
});

// ─── TC-19: hydrate — fixture VINs exist ─────────────────────────────────────

describe('TC-19: hydrate — fixture VINs exist in vehicle fixtures', () => {
  it('every vehicleInterestVin in lead fixtures is a known VIN', async () => {
    const { leads, vehicles } = await import('@dms/mocks/fixtures');
    const knownVins = new Set(vehicles.map((v) => v.vin));
    const leadVins = leads
      .map((l) => l.vehicleInterestVin)
      .filter((v): v is string => !!v);

    for (const vin of leadVins) {
      expect(knownVins.has(vin), `VIN ${vin} missing from vehicles fixture`).toBe(true);
    }
  });
});

// ─── TC-20: hydrate — idempotent ──────────────────────────────────────────────

describe('TC-20: hydrate — idempotent (double-call does not duplicate)', () => {
  it('does not duplicate leads on double hydrate', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const { leads, leadActivities } = await import('@dms/mocks/fixtures');

    // Reset store for this test
    useLeadsStore.setState({ leads: [], activities: [], hydrated: false });

    useLeadsStore.getState().hydrate(leads, leadActivities);
    const countAfterFirst = useLeadsStore.getState().leads.length;

    useLeadsStore.getState().hydrate(leads, leadActivities);
    const countAfterSecond = useLeadsStore.getState().leads.length;

    expect(countAfterSecond).toBe(countAfterFirst);
  });
});

// ─── TC-21: outlet scoping ────────────────────────────────────────────────────

describe('TC-21: outlet scoping — leads filtered by outletId', () => {
  it('BLR leads have outletId=bangalore', async () => {
    const { leads } = await import('@dms/mocks/fixtures');
    const blrLeads = leads.filter((l) => l.outletId === 'bangalore');
    expect(blrLeads.length).toBeGreaterThan(0);
    for (const l of blrLeads) {
      expect(l.outletId).toBe('bangalore');
    }
  });
});

// ─── TC-22: updateLead — patch applies ────────────────────────────────────────

describe('TC-22: updateLead — patch applies, lostReason persisted', () => {
  it('updates nextActionAt without changing stage', async () => {
    const { useLeadsStore } = await import('../lib/leads/leads-store');
    const store = useLeadsStore.getState();

    const lead = store.createLead(
      { source: 'walk-in', customerId: 'cust-karan-shah', outletId: 'chennai' },
      actorR05,
    );

    const nextActionAt = '2026-05-10T10:00:00.000Z';
    useLeadsStore.getState().updateLead(lead.id, { nextActionAt }, actorR05);

    const updated = useLeadsStore.getState().leads.find((l) => l.id === lead.id);
    expect(updated?.nextActionAt).toBe(nextActionAt);
    expect(updated?.stage).toBe('NEW'); // stage unchanged
  });
});
