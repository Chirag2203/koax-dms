/**
 * Insurance P3 — WhatsApp marketing tests.
 *
 * Covers §32:
 *   - DLT not-approved throws TemplateNotApprovedError on launchCampaign (L13)
 *   - markTemplateApproved requires non-empty dltId
 *   - submitForDlt transitions DRAFT → PENDING_DLT
 *   - audience filter: consent + opt-out exclusion
 *   - send-time opt-out re-check (L14 / L_P3_1)
 *   - createTemplate creates DRAFT template
 *   - updateTemplate edits DRAFT body text
 *   - updateTemplate throws on APPROVED template
 *   - launchCampaign computes audience size correctly
 *   - recordOptOut + getOptOuts
 *
 * Spec reference: SPEC-INSURANCE-001 §32, L9, L13, L14, L_P3_1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInsuranceStore, TemplateNotApprovedError } from '../lib/insurance/insurance-store';
import { insuranceProviders, insuranceLeads } from '@dms/mocks/fixtures';
import type { WhatsAppTemplate } from '@dms/types';

const ACTOR_R10 = { id: 'staff-r10-001', name: 'Arjun Kapoor', role: 'R10' };

const APPROVED_TEMPLATE: WhatsAppTemplate = {
  templateId: 'tmpl-approved-p3',
  name: 'Renewal 30d',
  dltTemplateId: 'DLT9876543210987654',
  category: 'renewal-reminder',
  bodyText: 'Dear {{name}}, renew by {{date}}.',
  variables: ['name', 'date'],
  status: 'APPROVED',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const DRAFT_TEMPLATE: WhatsAppTemplate = {
  templateId: 'tmpl-draft-p3',
  name: 'Draft Template',
  dltTemplateId: undefined,
  category: 'follow-up',
  bodyText: 'Hello {{name}}.',
  variables: ['name'],
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function resetStore() {
  useInsuranceStore.setState({
    leads: structuredClone(insuranceLeads),
    providers: insuranceProviders,
    policies: [],
    templates: [APPROVED_TEMPLATE, DRAFT_TEMPLATE],
    campaigns: [],
    callLogs: [],
    optOuts: new Set(),
    featAiCallingEnabled: false,
  });
}

// ── Template management ───────────────────────────────────────────────────────

describe('createTemplate', () => {
  beforeEach(resetStore);

  it('creates a DRAFT template', () => {
    const tmpl = useInsuranceStore.getState().createTemplate({
      name: 'My Template',
      category: 'promotion',
      bodyText: 'Promo for {{customer}}.',
      variables: ['customer'],
    });
    expect(tmpl.status).toBe('DRAFT');
    expect(tmpl.templateId).toBeTruthy();
    expect(tmpl.dltTemplateId).toBeUndefined();
  });

  it('submitForDlt transitions DRAFT → PENDING_DLT', () => {
    const updated = useInsuranceStore.getState().submitForDlt('tmpl-draft-p3');
    expect(updated.status).toBe('PENDING_DLT');
  });

  it('markTemplateApproved requires non-empty dltId', () => {
    useInsuranceStore.getState().submitForDlt('tmpl-draft-p3');
    expect(() =>
      useInsuranceStore.getState().markTemplateApproved('tmpl-draft-p3', '')
    ).toThrow();
  });

  it('markTemplateApproved sets APPROVED + dltTemplateId', () => {
    useInsuranceStore.getState().submitForDlt('tmpl-draft-p3');
    const approved = useInsuranceStore.getState().markTemplateApproved('tmpl-draft-p3', 'DLT111222333444555');
    expect(approved.status).toBe('APPROVED');
    expect(approved.dltTemplateId).toBe('DLT111222333444555');
  });

  it('updateTemplate edits DRAFT body text', () => {
    const updated = useInsuranceStore.getState().updateTemplate('tmpl-draft-p3', {
      bodyText: 'Updated: Hello {{name}} — new offer!',
    });
    expect(updated.bodyText).toBe('Updated: Hello {{name}} — new offer!');
  });

  it('updateTemplate throws on APPROVED template', () => {
    expect(() =>
      useInsuranceStore.getState().updateTemplate('tmpl-approved-p3', { bodyText: 'hack attempt' })
    ).toThrow();
  });
});

// ── Campaign launcher — DLT guard (L13) ──────────────────────────────────────

describe('launchCampaign — DLT guard (L13)', () => {
  beforeEach(resetStore);

  it('throws TemplateNotApprovedError when templateId references DRAFT template', () => {
    expect(() =>
      useInsuranceStore.getState().launchCampaign({
        name: 'Test Campaign',
        templateId: 'tmpl-draft-p3',
        audienceFilter: { hasMarketingConsent: true, excludeOptedOut: true },
        createdBy: ACTOR_R10.id,
      })
    ).toThrow(TemplateNotApprovedError);
  });

  it('launches successfully with APPROVED template', () => {
    const campaign = useInsuranceStore.getState().launchCampaign({
      name: 'Valid Campaign',
      templateId: 'tmpl-approved-p3',
      audienceFilter: { hasMarketingConsent: true, excludeOptedOut: true },
      createdBy: ACTOR_R10.id,
    });
    expect(campaign.campaignId).toBeTruthy();
    expect(campaign.status).toBe('sending');
  });

  it('scheduled campaign gets status=scheduled', () => {
    const campaign = useInsuranceStore.getState().launchCampaign({
      name: 'Scheduled Campaign',
      templateId: 'tmpl-approved-p3',
      audienceFilter: { hasMarketingConsent: true, excludeOptedOut: true },
      scheduledAt: '2026-05-01T10:00:00.000Z',
      createdBy: ACTOR_R10.id,
    });
    expect(campaign.status).toBe('scheduled');
    expect(campaign.scheduledAt).toBe('2026-05-01T10:00:00.000Z');
  });
});

// ── Audience filter — consent + opt-out ──────────────────────────────────────

describe('launchCampaign — audience filter correctness', () => {
  beforeEach(resetStore);

  it('audience count excludes leads without consent', () => {
    const allLeads = useInsuranceStore.getState().leads;
    const consentLeads = allLeads.filter((l) => l.marketingConsentGiven);

    const campaign = useInsuranceStore.getState().launchCampaign({
      name: 'Consent Filter Test',
      templateId: 'tmpl-approved-p3',
      audienceFilter: { hasMarketingConsent: true, excludeOptedOut: true },
      createdBy: ACTOR_R10.id,
    });

    expect(campaign.stats.targeted).toBe(consentLeads.length);
  });

  it('audience count excludes opted-out customers (send-time L14 / L_P3_1)', async () => {
    // Opt out a customer who has consent
    const consentLeads = useInsuranceStore.getState().leads.filter((l) => l.marketingConsentGiven);
    const targetCustomer = consentLeads[0]?.customerId;
    if (!targetCustomer) return;

    useInsuranceStore.getState().recordOptOut(targetCustomer);

    const campaign = useInsuranceStore.getState().launchCampaign({
      name: 'Opt-out Test',
      templateId: 'tmpl-approved-p3',
      audienceFilter: { hasMarketingConsent: true, excludeOptedOut: true },
      createdBy: ACTOR_R10.id,
    });

    expect(campaign.stats.targeted).toBe(consentLeads.length - 1);
  });
});

// ── Send-time opt-out re-check (L14 / B2 / L_P3_1) ──────────────────────────

describe('sendTemplateMessage — send-time opt-out re-check', () => {
  beforeEach(resetStore);

  it('skips opted-out customer at send time even if in audience snapshot (L14)', async () => {
    // Customer was in audience at build time, opts out before dispatch
    useInsuranceStore.getState().recordOptOut('late-optout-customer');

    const result = await useInsuranceStore.getState().sendTemplateMessage(
      'tmpl-approved-p3',
      'late-optout-customer',
      { name: 'Test' },
    );
    expect(result.messageId).toContain('skipped-optout');
  });

  it('returns messageId for non-opted-out customer with APPROVED template', async () => {
    const result = await useInsuranceStore.getState().sendTemplateMessage(
      'tmpl-approved-p3',
      'customer-with-consent',
      { name: 'Test' },
    );
    expect(result.messageId).toBeTruthy();
    expect(result.messageId).not.toContain('skipped-optout');
  });
});

// ── Opt-out registry ──────────────────────────────────────────────────────────

describe('recordOptOut + getOptOuts', () => {
  beforeEach(resetStore);

  it('adds customer to opt-out registry', () => {
    useInsuranceStore.getState().recordOptOut('customer-new-optout');
    expect(useInsuranceStore.getState().getOptOuts()).toContain('customer-new-optout');
  });

  it('getOptOuts returns array of opted-out customerIds', () => {
    useInsuranceStore.getState().recordOptOut('customer-a');
    useInsuranceStore.getState().recordOptOut('customer-b');
    const optOuts = useInsuranceStore.getState().getOptOuts();
    expect(optOuts).toContain('customer-a');
    expect(optOuts).toContain('customer-b');
  });
});
