/**
 * Customer 360 — unit tests for new features.
 *
 * Covers:
 *   T1 — consent withdrawal (GAP-10): sets revokedAt/revokedBy/reason + emits CONSENT_WITHDRAWN
 *   T2 — withdraw already-revoked consent throws
 *   T3 — createCustomer with DPDP consent capture (GAP-7 Feature 2)
 *   T4 — referral chain: customer.referredBy is a customer-id, renders as link target
 *   T5 — PDF audit log: logAuditExport emits PDF_EXPORT event with target C360_PDF
 *   T6 — captureConsent creates a new ConsentEntry with CONSENT_CAPTURED audit event
 *   T7 — hydrateConsents seeds consents by id
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCustomersStore } from '../customers-store';
import type { ConsentEntry } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTOR = { id: 'staff-r09-001', name: 'Priya Sharma', role: 'R09' };

const SAMPLE_CONSENT: ConsentEntry = {
  id: 'test-consent-001',
  customerId: 'cust-arjun-mehta',
  purpose: 'WHATSAPP_MARKETING',
  capturedAt: '2024-01-01T10:00:00.000Z',
  capturedBy: 'staff-r09-001',
  capturedByName: 'Priya Sharma',
  source: 'STAFF_FORM',
};

function resetStore() {
  useCustomersStore.setState({
    customers: {},
    auditEvents: [],
    consents: {},
    hydrated: false,
  });
}

// ─── T1: consent withdrawal ────────────────────────────────────────────────────

describe('withdrawConsent (GAP-10)', () => {
  beforeEach(resetStore);

  it('T1: marks consent as revoked and emits CONSENT_WITHDRAWN audit event', () => {
    useCustomersStore.setState({ consents: { [SAMPLE_CONSENT.id]: { ...SAMPLE_CONSENT } } });
    const store = useCustomersStore.getState();

    store.withdrawConsent(SAMPLE_CONSENT.id, 'Customer requested opt-out', ACTOR);

    const updated = useCustomersStore.getState();
    const entry = updated.consents[SAMPLE_CONSENT.id];

    expect(entry).toBeDefined();
    expect(entry!.revokedAt).toBeTruthy();
    expect(entry!.revokedBy).toBe(ACTOR.id);
    expect(entry!.revokedByName).toBe(ACTOR.name);
    expect(entry!.revocationReason).toBe('Customer requested opt-out');

    const auditEvent = updated.auditEvents.find((e) => e.kind === 'CONSENT_WITHDRAWN');
    expect(auditEvent).toBeDefined();
    expect(auditEvent!.customerId).toBe(SAMPLE_CONSENT.customerId);
    expect(auditEvent!.actorId).toBe(ACTOR.id);
    expect(auditEvent!.target).toContain(SAMPLE_CONSENT.id);
  });

  it('T2: throws when trying to withdraw an already-revoked consent', () => {
    const revokedConsent: ConsentEntry = {
      ...SAMPLE_CONSENT,
      id: 'test-consent-revoked',
      revokedAt: '2024-02-01T00:00:00.000Z',
      revokedBy: 'staff-001',
      revokedByName: 'Someone',
      revocationReason: 'Previous reason',
    };
    useCustomersStore.setState({ consents: { [revokedConsent.id]: revokedConsent } });

    expect(() => {
      useCustomersStore.getState().withdrawConsent(revokedConsent.id, 'New reason', ACTOR);
    }).toThrow(/already revoked/i);
  });

  it('throws when consent id is not found', () => {
    expect(() => {
      useCustomersStore.getState().withdrawConsent('nonexistent-id', 'reason', ACTOR);
    }).toThrow(/not found/i);
  });
});

// ─── T3: createCustomer + DPDP consent capture ────────────────────────────────

describe('createCustomer with DPDP consent capture (GAP-7)', () => {
  beforeEach(resetStore);

  it('T3: creates customer and then captures DATA_PROCESSING consent in one flow', () => {
    const store = useCustomersStore.getState();
    const now = new Date().toISOString();

    // Create customer
    const customer = store.createCustomer(
      {
        name: 'Pooja Verma',
        phone: '+919876543210',
        email: 'pooja.verma@example.com',
        preferredCity: 'bangalore',
        dpdpConsentGivenAt: now,
      },
      ACTOR,
    );

    expect(customer.id).toBeTruthy();
    expect(customer.name).toBe('Pooja Verma');
    expect(customer.dpdpConsentGivenAt).toBe(now);

    // Capture consent (as done by NewCustomerDialog)
    const consentEntry = store.captureConsent(
      {
        customerId: customer.id,
        purpose: 'DATA_PROCESSING',
        capturedAt: now,
        capturedBy: ACTOR.id,
        capturedByName: ACTOR.name,
        source: 'STAFF_FORM',
      },
      ACTOR,
    );

    expect(consentEntry.id).toBeTruthy();
    expect(consentEntry.purpose).toBe('DATA_PROCESSING');
    expect(consentEntry.customerId).toBe(customer.id);
    expect(consentEntry.source).toBe('STAFF_FORM');

    // Check audit trail
    const state = useCustomersStore.getState();
    const createEvent = state.auditEvents.find((e) => e.kind === 'CREATE' && e.customerId === customer.id);
    const consentEvent = state.auditEvents.find((e) => e.kind === 'CONSENT_CAPTURED' && e.customerId === customer.id);

    expect(createEvent).toBeDefined();
    expect(consentEvent).toBeDefined();
  });

  it('createCustomer idempotency: returns existing customer on duplicate phone+email', () => {
    const store = useCustomersStore.getState();

    const first = store.createCustomer(
      { name: 'Ravi Kumar', phone: '+919876543220', email: 'ravi@example.com' },
      ACTOR,
    );
    const second = store.createCustomer(
      { name: 'Ravi Kumar (dupe)', phone: '+919876543220', email: 'ravi@example.com' },
      ACTOR,
    );

    expect(second.id).toBe(first.id);
    // Only one CREATE event
    const state = useCustomersStore.getState();
    const creates = state.auditEvents.filter((e) => e.kind === 'CREATE' && e.customerId === first.id);
    expect(creates).toHaveLength(1);
  });
});

// ─── T4: referral chain fixture integrity ─────────────────────────────────────

// Direct fixture imports (within the same monorepo — test helper usage only)
import {
  custArjunMehta,
  custVikramSingh,
  custPriyaMehta,
  custPoojaDesai,
} from '@dms/mocks/fixtures';

describe('referral chain (GAP-8)', () => {
  it('T4: customer fixture has correct referredBy customer-id format', () => {
    expect(custArjunMehta.referredBy).toBe('cust-vikram-singh');
    expect(custArjunMehta.referredByName).toBe(custVikramSingh.name);
  });

  it('customer with event referral has referredBy = "event"', () => {
    expect(custPriyaMehta.referredBy).toBe('event');
    expect(custPriyaMehta.referredByName).toBeUndefined();
  });

  it('customer with walk-in referral has referredBy = "walk-in"', () => {
    expect(custPoojaDesai.referredBy).toBe('walk-in');
  });
});

// ─── T5: PDF audit log emission ───────────────────────────────────────────────

describe('logAuditExport (PDF audit, B-6)', () => {
  beforeEach(resetStore);

  it('T5: emits PDF_EXPORT audit event with correct customerId, actorId, and target', () => {
    const store = useCustomersStore.getState();
    store.logAuditExport('cust-arjun-mehta', { target: 'C360_PDF' }, ACTOR);

    const state = useCustomersStore.getState();
    const event = state.auditEvents.find((e) => e.kind === 'PDF_EXPORT');

    expect(event).toBeDefined();
    expect(event!.customerId).toBe('cust-arjun-mehta');
    expect(event!.actorId).toBe(ACTOR.id);
    expect(event!.target).toBe('C360_PDF');
  });
});

// ─── T6: captureConsent ───────────────────────────────────────────────────────

describe('captureConsent (GAP-3)', () => {
  beforeEach(resetStore);

  it('T6: creates a ConsentEntry in the store and emits CONSENT_CAPTURED event', () => {
    const store = useCustomersStore.getState();
    const now = '2026-01-01T12:00:00.000Z';

    const entry = store.captureConsent(
      {
        customerId: 'cust-test-001',
        purpose: 'EMAIL_MARKETING',
        capturedAt: now,
        capturedBy: ACTOR.id,
        capturedByName: ACTOR.name,
        source: 'PORTAL_SIGNUP',
      },
      ACTOR,
    );

    expect(entry.id).toBeTruthy();
    expect(entry.purpose).toBe('EMAIL_MARKETING');

    const state = useCustomersStore.getState();
    expect(state.consents[entry.id]).toBeDefined();
    expect(state.consents[entry.id]!.source).toBe('PORTAL_SIGNUP');

    const event = state.auditEvents.find((e) => e.kind === 'CONSENT_CAPTURED');
    expect(event).toBeDefined();
    expect(event!.target).toBe('EMAIL_MARKETING');
  });
});

// ─── T7: hydrateConsents ──────────────────────────────────────────────────────

describe('hydrateConsents', () => {
  beforeEach(resetStore);

  it('T7: seeds consents map by id from fixture array', () => {
    const store = useCustomersStore.getState();
    const entries: ConsentEntry[] = [
      { ...SAMPLE_CONSENT, id: 'seed-1' },
      { ...SAMPLE_CONSENT, id: 'seed-2', purpose: 'EMAIL_MARKETING' },
    ];

    store.hydrateConsents(entries);

    const state = useCustomersStore.getState();
    expect(state.consents['seed-1']).toBeDefined();
    expect(state.consents['seed-2']).toBeDefined();
    expect(state.consents['seed-2']!.purpose).toBe('EMAIL_MARKETING');
  });
});
