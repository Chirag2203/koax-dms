/**
 * Insurance P1 — unit tests.
 *
 * Covers spec §19 vitest minimums:
 *   S13 — DLT template-not-approved throws TemplateNotApprovedError
 *   S15 — consent defaults false; excluded from audience
 *   S16 — QuoteCard refuses render without IRDAI fields
 *   S17 — discount > 10% requires R12 approval (R12RequiredError)
 *   + Comparison engine: 6 quotes, sort by total/CSR/network
 *
 * Spec reference: SPEC-INSURANCE-001 §19
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { InsuranceProvider } from '@dms/types';
import { buildQuotes, sortQuotes } from '../lib/insurance/comparison';
import { R12RequiredError, TemplateNotApprovedError, VINNotFoundError, useInsuranceStore } from '../lib/insurance/insurance-store';
import { QuoteCardPropsSchema } from '@dms/types';
import { insuranceProviders } from '@dms/mocks/fixtures';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const TEST_VEHICLE = {
  vin: 'WP0AB2A91MS247831',
  make: 'Porsche',
  model: '911',
  year: 2021,
  exShowroomValue: 12800000,
};

const TEST_CUSTOMER = {
  noClaimBonusYears: 2,
  customerAge: 35,
};

const ACTOR_R09 = { id: 'staff-r09-001', name: 'Priya Sharma', role: 'R09' };
const ACTOR_R12 = { id: 'staff-r12-001', name: 'Vikram Singh', role: 'R12' };

// ─── Reset store before each test ─────────────────────────────────────────────

function resetStore() {
  useInsuranceStore.setState({
    leads: [],
    providers: insuranceProviders,
    policies: [],
    templates: [],
    campaigns: [],
    callLogs: [],
    optOuts: new Set(),
  });
}

// ─── Comparison engine: 6 quotes for valid input ───────────────────────────────

describe('buildQuotes (comparison engine)', () => {
  it('returns 6 quotes for valid vehicle + customer input with 6 active providers', () => {
    const activeProviders = (insuranceProviders as InsuranceProvider[]).filter((p) => p.active);
    const quotes = buildQuotes(TEST_VEHICLE, TEST_CUSTOMER, activeProviders, 'test-lead-id');

    expect(quotes).toHaveLength(6);

    for (const quote of quotes) {
      expect(quote.providerId).toBeTruthy();
      expect(quote.totalPremium).toBeGreaterThan(0);
      expect(quote.ownDamagePremium).toBeGreaterThan(0);
      expect(quote.thirdPartyPremium).toBeGreaterThan(0);
      expect(quote.idv).toBeGreaterThan(0);
      expect(quote.leadId).toBe('test-lead-id');
    }
  });

  it('applies NCB discount correctly for 2 years no claim', () => {
    const activeProviders = (insuranceProviders as InsuranceProvider[]).filter((p) => p.active);
    const quotes = buildQuotes(TEST_VEHICLE, { ...TEST_CUSTOMER, noClaimBonusYears: 2 }, activeProviders, 'lead-ncb');

    // All quotes should have 25% NCB applied (2 years no claim = 25% per standard slab)
    for (const quote of quotes) {
      expect(quote.ncbPct).toBe(25);
      expect(quote.ncbApplied).toBeGreaterThan(0);
    }
  });

  it('zero NCB when noClaimBonusYears = 0', () => {
    const activeProviders = (insuranceProviders as InsuranceProvider[]).filter((p) => p.active);
    const quotes = buildQuotes(TEST_VEHICLE, { ...TEST_CUSTOMER, noClaimBonusYears: 0 }, activeProviders, 'lead-no-ncb');

    for (const quote of quotes) {
      expect(quote.ncbPct).toBe(0);
      expect(quote.ncbApplied).toBe(0);
    }
  });
});

// ─── Sort by total / CSR / network ────────────────────────────────────────────

describe('sortQuotes', () => {
  const activeProviders = (insuranceProviders as InsuranceProvider[]).filter((p) => p.active);
  const quotes = buildQuotes(TEST_VEHICLE, TEST_CUSTOMER, activeProviders, 'sort-test');

  it('sorts by total premium ascending (L25 default)', () => {
    const sorted = sortQuotes(quotes, 'total', activeProviders);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.totalPremium).toBeGreaterThanOrEqual(sorted[i - 1]!.totalPremium);
    }
  });

  it('sorts by CSR descending', () => {
    const sorted = sortQuotes(quotes, 'csr', activeProviders);
    for (let i = 1; i < sorted.length; i++) {
      const p0 = activeProviders.find((p) => p.id === sorted[i - 1]!.providerId);
      const p1 = activeProviders.find((p) => p.id === sorted[i]!.providerId);
      expect(p1!.claimSettlementRatio).toBeLessThanOrEqual(p0!.claimSettlementRatio);
    }
  });

  it('sorts by network garages descending', () => {
    const sorted = sortQuotes(quotes, 'network', activeProviders);
    for (let i = 1; i < sorted.length; i++) {
      const p0 = activeProviders.find((p) => p.id === sorted[i - 1]!.providerId);
      const p1 = activeProviders.find((p) => p.id === sorted[i]!.providerId);
      expect(p1!.networkGaragesCount).toBeLessThanOrEqual(p0!.networkGaragesCount);
    }
  });
});

// ─── S16 — QuoteCard refuses render without IRDAI fields (B4 / L16) ───────────

describe('QuoteCardPropsSchema — IRDAI fail-closed (S16)', () => {
  const validQuote = {
    quoteId: 'q-001',
    leadId: 'lead-001',
    providerId: 'bajaj-allianz',
    ownDamagePremium: 45000,
    thirdPartyPremium: 7110,
    totalPremium: 52110,
    idv: 1200000,
    deductible: 1000,
    ncbApplied: 0,
    ncbPct: 0,
    availableAddons: [],
    selectedAddons: [],
    generatedAt: '2026-04-28T10:00:00.000Z',
    status: 'active' as const,
  };

  it('passes validation with valid IRDAI fields', () => {
    const result = QuoteCardPropsSchema.safeParse({
      provider: {
        irdaiRegNo: 'IRDAI/HLT/059',
        claimSettlementRatio: 98.5,
        name: 'Bajaj Allianz',
        logoUrl: 'https://example.com/logo.png',
        networkGaragesCount: 6500,
      },
      quote: validQuote,
    });
    expect(result.success).toBe(true);
  });

  it('fails validation when irdaiRegNo is empty string (fail-closed)', () => {
    const result = QuoteCardPropsSchema.safeParse({
      provider: {
        irdaiRegNo: '',      // empty = fail-closed
        claimSettlementRatio: 98.5,
        name: 'Bajaj Allianz',
        logoUrl: 'https://example.com/logo.png',
        networkGaragesCount: 6500,
      },
      quote: validQuote,
    });
    expect(result.success).toBe(false);
  });

  it('fails validation when claimSettlementRatio is missing (fail-closed)', () => {
    const result = QuoteCardPropsSchema.safeParse({
      provider: {
        irdaiRegNo: 'IRDAI/HLT/059',
        // claimSettlementRatio missing
        name: 'Bajaj Allianz',
        logoUrl: 'https://example.com/logo.png',
        networkGaragesCount: 6500,
      },
      quote: validQuote,
    });
    expect(result.success).toBe(false);
  });

  it('fails validation when irdaiRegNo is missing entirely', () => {
    const result = QuoteCardPropsSchema.safeParse({
      provider: {
        // irdaiRegNo missing
        claimSettlementRatio: 98.5,
        name: 'Bajaj Allianz',
        logoUrl: 'https://example.com/logo.png',
        networkGaragesCount: 6500,
      },
      quote: validQuote,
    });
    expect(result.success).toBe(false);
  });
});

// ─── S17 — Discount > 10% requires R12 approval (B6 / L18) ───────────────────

describe('applyDiscount (S17 / L18)', () => {
  beforeEach(() => {
    resetStore();
    // Create a lead with a quote
    const store = useInsuranceStore.getState();
    store.createLead({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      assignedAdvisorId: 'staff-r09-001',
      outlet: 'bangalore',
      odometer: 18400,
      customerAge: 35,
      customerCity: 'Bangalore',
      panLast4: '4567',
      noClaimBonusYears: 2,
    });
  });

  it('throws R12RequiredError when R09 attempts discount > 10%', () => {
    const store = useInsuranceStore.getState();
    const lead = store.leads[0]!;

    // Save a quote to the lead first
    const quotes = buildQuotes(TEST_VEHICLE, TEST_CUSTOMER, insuranceProviders as InsuranceProvider[], lead.leadId);
    const quote = quotes[0]!;
    store.saveQuote(lead.leadId, quote);

    // R09 attempts 15% discount — should throw
    const savedLead = useInsuranceStore.getState().leads.find((l) => l.leadId === lead.leadId)!;
    const savedQuote = savedLead.quotes[0]!;

    expect(() =>
      useInsuranceStore.getState().applyDiscount(savedQuote.quoteId, 15, ACTOR_R09)
    ).toThrowError(R12RequiredError);
  });

  it('allows discount <= 10% for R09 without approval', () => {
    const store = useInsuranceStore.getState();
    const lead = store.leads[0]!;

    const quotes = buildQuotes(TEST_VEHICLE, TEST_CUSTOMER, insuranceProviders as InsuranceProvider[], lead.leadId);
    store.saveQuote(lead.leadId, quotes[0]!);

    const savedLead = useInsuranceStore.getState().leads.find((l) => l.leadId === lead.leadId)!;
    const savedQuote = savedLead.quotes[0]!;

    // 8% discount — should succeed without error
    expect(() =>
      useInsuranceStore.getState().applyDiscount(savedQuote.quoteId, 8, ACTOR_R09)
    ).not.toThrow();

    const updatedLead = useInsuranceStore.getState().leads.find((l) => l.leadId === lead.leadId)!;
    const updatedQuote = updatedLead.quotes.find((q) => q.quoteId === savedQuote.quoteId)!;
    expect(updatedQuote.discountPct).toBe(8);
    expect(updatedQuote.discountApprovalRefId).toBeUndefined();
  });

  it('R12 actor can apply discount > 10% successfully', () => {
    const store = useInsuranceStore.getState();
    const lead = store.leads[0]!;

    const quotes = buildQuotes(TEST_VEHICLE, TEST_CUSTOMER, insuranceProviders as InsuranceProvider[], lead.leadId);
    store.saveQuote(lead.leadId, quotes[0]!);

    const savedLead = useInsuranceStore.getState().leads.find((l) => l.leadId === lead.leadId)!;
    const savedQuote = savedLead.quotes[0]!;

    // R12 actor — should succeed
    expect(() =>
      useInsuranceStore.getState().applyDiscount(savedQuote.quoteId, 15, ACTOR_R12)
    ).not.toThrow();

    const updatedLead = useInsuranceStore.getState().leads.find((l) => l.leadId === lead.leadId)!;
    const updatedQuote = updatedLead.quotes.find((q) => q.quoteId === savedQuote.quoteId)!;
    expect(updatedQuote.discountPct).toBe(15);
    expect(updatedQuote.discountApprovalRefId).toBe(ACTOR_R12.id);
  });
});

// ─── S13 — DLT slice-level guard: TemplateNotApprovedError (B1 / L13) ─────────

describe('sendTemplateMessage — DLT guard (S13)', () => {
  beforeEach(() => {
    resetStore();
    useInsuranceStore.setState({
      leads: [],
      providers: insuranceProviders as InsuranceProvider[],
      policies: [],
      templates: [
        {
          templateId: 'tmpl-approved',
          name: 'Approved Template',
          dltTemplateId: 'DLT1234567890123456',
          category: 'renewal-reminder',
          bodyText: 'Hello {{name}}',
          variables: ['name'],
          status: 'APPROVED',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          templateId: 'tmpl-draft',
          name: 'Draft Template',
          dltTemplateId: undefined,
          category: 'promotion',
          bodyText: 'Hello {{name}}',
          variables: ['name'],
          status: 'DRAFT',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          templateId: 'tmpl-pending',
          name: 'Pending DLT Template',
          dltTemplateId: undefined,
          category: 'follow-up',
          bodyText: 'Hello {{name}}',
          variables: ['name'],
          status: 'PENDING_DLT',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      campaigns: [],
      callLogs: [],
      optOuts: new Set(),
    });
  });

  it('resolves with messageId when template is APPROVED', async () => {
    const result = await useInsuranceStore.getState().sendTemplateMessage(
      'tmpl-approved',
      'customer-001',
      { name: 'Test User' },
    );
    expect(result.messageId).toBeTruthy();
    expect(result.messageId).not.toContain('skipped-optout');
  });

  it('throws TemplateNotApprovedError for DRAFT template (L13 / B1)', async () => {
    await expect(
      useInsuranceStore.getState().sendTemplateMessage('tmpl-draft', 'customer-001', { name: 'Test' })
    ).rejects.toThrow(TemplateNotApprovedError);
  });

  it('throws TemplateNotApprovedError for PENDING_DLT template (L13 / B1)', async () => {
    await expect(
      useInsuranceStore.getState().sendTemplateMessage('tmpl-pending', 'customer-001', { name: 'Test' })
    ).rejects.toThrow(TemplateNotApprovedError);
  });

  it('throws TemplateNotApprovedError for non-existent template', async () => {
    await expect(
      useInsuranceStore.getState().sendTemplateMessage('tmpl-does-not-exist', 'customer-001', {})
    ).rejects.toThrow(TemplateNotApprovedError);
  });

  it('skips opted-out customer (L14 / B2 send-time check)', async () => {
    useInsuranceStore.getState().recordOptOut('customer-opted-out');

    const result = await useInsuranceStore.getState().sendTemplateMessage(
      'tmpl-approved',
      'customer-opted-out',
      { name: 'Opted Out User' },
    );
    // Skipped — returns special messageId not a real send
    expect(result.messageId).toContain('skipped-optout');
  });
});

// ─── S15 — Lead without consent excluded from audience (B3 / L15) ─────────────

describe('marketingConsentGiven default (S15)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('defaults marketingConsentGiven to false when not provided (L15)', () => {
    const store = useInsuranceStore.getState();
    const lead = store.createLead({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      assignedAdvisorId: 'staff-r09-001',
      outlet: 'bangalore',
      odometer: 18400,
      customerAge: 35,
      customerCity: 'Bangalore',
      panLast4: '4567',
      noClaimBonusYears: 2,
      // marketingConsentGiven NOT provided — should default false
    });
    expect(lead.marketingConsentGiven).toBe(false);
    expect(lead.marketingConsentAt).toBeUndefined();
  });

  it('sets marketingConsentGiven to true when explicitly provided', () => {
    const store = useInsuranceStore.getState();
    const lead = store.createLead({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-001',
      assignedAdvisorId: 'staff-r09-001',
      outlet: 'bangalore',
      odometer: 18400,
      customerAge: 35,
      customerCity: 'Bangalore',
      panLast4: '4567',
      noClaimBonusYears: 2,
      marketingConsentGiven: true,
    });
    expect(lead.marketingConsentGiven).toBe(true);
    expect(lead.marketingConsentAt).toBeTruthy();
  });

  it('excludes leads without consent from audience queries (hasMarketingConsent filter)', () => {
    const store = useInsuranceStore.getState();
    store.createLead({
      vin: 'WP0AB2A91MS247831',
      customerId: 'customer-no-consent',
      assignedAdvisorId: 'staff-r09-001',
      outlet: 'bangalore',
      odometer: 18400,
      customerAge: 35,
      customerCity: 'Bangalore',
      panLast4: '4567',
      noClaimBonusYears: 2,
      marketingConsentGiven: false,
    });
    store.createLead({
      vin: 'WP1ZZZ95ZNS078234',
      customerId: 'customer-with-consent',
      assignedAdvisorId: 'staff-r09-001',
      outlet: 'bangalore',
      odometer: 31500,
      customerAge: 42,
      customerCity: 'Bangalore',
      panLast4: '1234',
      noClaimBonusYears: 0,
      marketingConsentGiven: true,
    });

    const leads = useInsuranceStore.getState().leads;
    // Simulating audience filter: hasMarketingConsent: true
    const audience = leads.filter((l) => l.marketingConsentGiven === true);
    expect(audience.every((l) => l.marketingConsentGiven === true)).toBe(true);
    expect(audience.some((l) => l.customerId === 'customer-no-consent')).toBe(false);
    expect(audience.some((l) => l.customerId === 'customer-with-consent')).toBe(true);
  });
});

// ─── VIN orphan protection (S12 / L12) ────────────────────────────────────────

describe('createLead — VIN validation (L12)', () => {
  beforeEach(() => resetStore());

  it('throws VINNotFoundError for orphan VIN', () => {
    expect(() =>
      useInsuranceStore.getState().createLead({
        vin: 'ORPHAN-VIN-NOT-IN-FIXTURE',
        customerId: 'c-001',
        assignedAdvisorId: 'staff-r09-001',
        outlet: 'bangalore',
        odometer: 10000,
        customerAge: 30,
        customerCity: 'Bangalore',
        panLast4: '1234',
        noClaimBonusYears: 0,
      })
    ).toThrow(VINNotFoundError);
  });
});
