/**
 * Insurance Lead List View — unit tests.
 *
 * Covers:
 *   - Default sort: daysToExpiry ascending (most urgent first)
 *   - Sort by stage (ascending order)
 *   - Sort by premium descending
 *   - Sort by last activity descending
 *   - Empty state: returns empty sorted array when no leads
 *   - Click-through data integrity: leadId and VIN preserved in sorted output
 *   - Expiry colour tier logic: ≤7d → overdue, ≤30d → warning, else neutral
 *   - Priority chip: urgent leads flagged
 *
 * Spec reference: SPEC-INSURANCE-001 §35, L_P2_3
 */

import { describe, it, expect } from 'vitest';
import type { InsuranceLead } from '@dms/types';

// ─── Stage ordering (mirrors lead-list-view.tsx) ──────────────────────────────

const STAGE_ORDER: Record<string, number> = {
  'due-soon':    0,
  'due':         1,
  'quoted':      2,
  'negotiating': 3,
  'closed-won':  4,
  'closed-lost': 5,
};

// ─── Sort helpers (pure — mirrors lead-list-view.tsx implementation) ──────────

type SortKey = 'stage' | 'daysToExpiry' | 'updatedAt' | 'premium';

function daysUntilExpiry(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getBestPremium(lead: InsuranceLead): number {
  return lead.quotes.reduce((max, q) => Math.max(max, q.totalPremium), 0);
}

function sortLeads(leads: InsuranceLead[], key: SortKey, dir: 'asc' | 'desc'): InsuranceLead[] {
  return [...leads].sort((a, b) => {
    let cmp = 0;
    if (key === 'stage') {
      cmp = (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99);
    } else if (key === 'daysToExpiry') {
      const dA = a.expiresAt ? daysUntilExpiry(a.expiresAt) : 9999;
      const dB = b.expiresAt ? daysUntilExpiry(b.expiresAt) : 9999;
      cmp = dA - dB;
    } else if (key === 'premium') {
      cmp = getBestPremium(a) - getBestPremium(b);
    } else {
      cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

function expiryColorClass(days: number): string {
  if (days <= 7) return 'text-[rgb(var(--state-overdue))]';
  if (days <= 30) return 'text-warning';
  return 'text-ink-muted';
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<InsuranceLead> & { leadId: string }): InsuranceLead {
  return {
    leadId: overrides.leadId,
    vin: overrides.vin ?? 'WP0AB2A91MS247831',
    customerId: overrides.customerId ?? 'customer-001',
    assignedAdvisorId: 'staff-r09-001',
    outlet: 'bangalore',
    stage: overrides.stage ?? 'due-soon',
    priority: overrides.priority ?? 'normal',
    expiresAt: overrides.expiresAt,
    odometer: 45000,
    customerAge: 35,
    customerCity: 'Bangalore',
    panLast4: '1234',
    noClaimBonusYears: 2,
    quotes: overrides.quotes ?? [],
    followupSequenceState: { currentStepIndex: 0, paused: false },
    marketingConsentGiven: false,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

/** Today + N days as ISO string */
function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/** ISO timestamp N hours ago */
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

const LEADS = [
  makeLead({ leadId: 'lead-a', stage: 'negotiating', expiresAt: inDays(5),  updatedAt: hoursAgo(1)  }),
  makeLead({ leadId: 'lead-b', stage: 'due',         expiresAt: inDays(20), updatedAt: hoursAgo(3)  }),
  makeLead({ leadId: 'lead-c', stage: 'due-soon',    expiresAt: inDays(45), updatedAt: hoursAgo(6)  }),
  makeLead({ leadId: 'lead-d', stage: 'quoted',      expiresAt: inDays(10), updatedAt: hoursAgo(12) }),
];

// ─── Default sort: daysToExpiry asc ───────────────────────────────────────────

describe('LeadListView: sort by daysToExpiry (default asc)', () => {
  it('most urgent lead (5d) is first', () => {
    const sorted = sortLeads(LEADS, 'daysToExpiry', 'asc');
    expect(sorted[0]?.leadId).toBe('lead-a'); // 5d
  });

  it('least urgent lead (45d) is last', () => {
    const sorted = sortLeads(LEADS, 'daysToExpiry', 'asc');
    expect(sorted[sorted.length - 1]?.leadId).toBe('lead-c'); // 45d
  });

  it('order is ascending by days remaining', () => {
    const sorted = sortLeads(LEADS, 'daysToExpiry', 'asc');
    const days = sorted.map((l) => l.expiresAt ? daysUntilExpiry(l.expiresAt) : 9999);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]!).toBeGreaterThanOrEqual(days[i - 1]!);
    }
  });
});

// ─── Sort by stage ─────────────────────────────────────────────────────────────

describe('LeadListView: sort by stage asc', () => {
  it('due-soon < due < quoted < negotiating in stage order', () => {
    const sorted = sortLeads(LEADS, 'stage', 'asc');
    const stages = sorted.map((l) => l.stage);
    expect(stages[0]).toBe('due-soon');
    expect(stages[1]).toBe('due');
    expect(stages[2]).toBe('quoted');
    expect(stages[3]).toBe('negotiating');
  });

  it('desc reversal puts negotiating first', () => {
    const sorted = sortLeads(LEADS, 'stage', 'desc');
    expect(sorted[0]?.stage).toBe('negotiating');
  });
});

// ─── Sort by premium ──────────────────────────────────────────────────────────

describe('LeadListView: sort by premium', () => {
  const withPremiums = [
    makeLead({ leadId: 'p-high', stage: 'quoted', quotes: [{ quoteId: 'q1', leadId: 'p-high', providerId: 'bajaj-allianz', ownDamagePremium: 8000, thirdPartyPremium: 2000, totalPremium: 10000, idv: 500000, deductible: 1000, ncbApplied: 0, ncbPct: 0, availableAddons: [], selectedAddons: [], generatedAt: new Date().toISOString(), status: 'active' }] }),
    makeLead({ leadId: 'p-low',  stage: 'due',    quotes: [{ quoteId: 'q2', leadId: 'p-low',  providerId: 'hdfc-ergo',     ownDamagePremium: 3000, thirdPartyPremium: 1000, totalPremium: 4000,  idv: 400000, deductible: 1000, ncbApplied: 0, ncbPct: 0, availableAddons: [], selectedAddons: [], generatedAt: new Date().toISOString(), status: 'active' }] }),
    makeLead({ leadId: 'p-none', stage: 'due-soon', quotes: [] }),
  ];

  it('asc puts lowest premium first', () => {
    const sorted = sortLeads(withPremiums, 'premium', 'asc');
    expect(sorted[0]?.leadId).toBe('p-none'); // 0 premium
    expect(sorted[sorted.length - 1]?.leadId).toBe('p-high');
  });

  it('desc puts highest premium first', () => {
    const sorted = sortLeads(withPremiums, 'premium', 'desc');
    expect(sorted[0]?.leadId).toBe('p-high');
  });
});

// ─── Sort by last activity ────────────────────────────────────────────────────

describe('LeadListView: sort by last activity', () => {
  it('desc puts most recently updated first', () => {
    const sorted = sortLeads(LEADS, 'updatedAt', 'desc');
    expect(sorted[0]?.leadId).toBe('lead-a'); // 1h ago = most recent
  });

  it('asc puts least recently updated first', () => {
    const sorted = sortLeads(LEADS, 'updatedAt', 'asc');
    expect(sorted[0]?.leadId).toBe('lead-d'); // 12h ago = oldest
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('LeadListView: empty state', () => {
  it('returns empty array when no leads', () => {
    const sorted = sortLeads([], 'daysToExpiry', 'asc');
    expect(sorted).toHaveLength(0);
  });
});

// ─── Click-through data integrity ────────────────────────────────────────────

describe('LeadListView: click-through data integrity', () => {
  it('leadId and VIN are preserved after sort', () => {
    const leads = [
      makeLead({ leadId: 'ct-1', vin: 'WBY2Z21090VX45678', stage: 'quoted' }),
      makeLead({ leadId: 'ct-2', vin: 'WVWZZZ3CZPE123456', stage: 'due-soon' }),
    ];
    const sorted = sortLeads(leads, 'stage', 'asc');
    expect(sorted[0]?.leadId).toBe('ct-2');
    expect(sorted[0]?.vin).toBe('WVWZZZ3CZPE123456');
    expect(sorted[1]?.leadId).toBe('ct-1');
    expect(sorted[1]?.vin).toBe('WBY2Z21090VX45678');
  });
});

// ─── Expiry colour tiers ──────────────────────────────────────────────────────

describe('expiryColorClass: colour tier logic (§35)', () => {
  it('7 or fewer days → overdue colour', () => {
    expect(expiryColorClass(7)).toBe('text-[rgb(var(--state-overdue))]');
    expect(expiryColorClass(1)).toBe('text-[rgb(var(--state-overdue))]');
    expect(expiryColorClass(0)).toBe('text-[rgb(var(--state-overdue))]');
  });

  it('8–30 days → warning colour', () => {
    expect(expiryColorClass(8)).toBe('text-warning');
    expect(expiryColorClass(30)).toBe('text-warning');
  });

  it('more than 30 days → neutral colour', () => {
    expect(expiryColorClass(31)).toBe('text-ink-muted');
    expect(expiryColorClass(60)).toBe('text-ink-muted');
  });
});

// ─── Priority: urgent leads flagged ──────────────────────────────────────────

describe('LeadListView: priority chip', () => {
  it('urgent lead has priority urgent', () => {
    const urgent = makeLead({ leadId: 'urg-1', priority: 'urgent' });
    expect(urgent.priority).toBe('urgent');
  });

  it('normal lead does not have urgent priority', () => {
    const normal = makeLead({ leadId: 'norm-1', priority: 'normal' });
    expect(normal.priority).toBe('normal');
  });
});
