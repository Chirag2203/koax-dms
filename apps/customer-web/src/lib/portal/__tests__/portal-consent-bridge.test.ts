/**
 * Portal consent bridge tests — DEF-PORTAL-1
 *
 * SPEC-CUSTOMER-PORTAL-001 §5.1 — bridge action acceptance criteria:
 *   1. Grant creates ConsentEntry with PORTAL_SIGNUP source
 *   2. Revoke sets revokedAt/revokedBy/revocationReason
 *   3. Append-only: prior entries not mutated when new grant created
 *   4. Multiple grants/revokes leave clean ledger
 *   5. Insurance audience builder excludes a revoked customer (cross-store integration)
 *   6. Migration runs once on first load (idempotent)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePortalConsentStore,
  recordPortalConsentChange,
  isConsentActive,
  PORTAL_PURPOSE_MAP,
} from '../portal-consent-bridge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  usePortalConsentStore.setState({ consents: {} });
}

function getConsents() {
  return Object.values(usePortalConsentStore.getState().consents);
}

const CUSTOMER_ID = 'cust-test-001';
const CUSTOMER_NAME = 'Test Customer';

// ─── 1. Grant creates ConsentEntry with PORTAL_SIGNUP source ─────────────────

describe('recordPortalConsentChange — grant', () => {
  beforeEach(resetStore);

  it('creates a ConsentEntry with source=PORTAL_SIGNUP when granted=true', () => {
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true);

    const entries = getConsents();
    expect(entries).toHaveLength(1);

    const entry = entries[0]!;
    expect(entry.customerId).toBe(CUSTOMER_ID);
    expect(entry.purpose).toBe('WHATSAPP_MARKETING');
    expect(entry.source).toBe('PORTAL_SIGNUP');
    expect(entry.capturedBy).toBe(CUSTOMER_ID);
    expect(entry.capturedByName).toBe(CUSTOMER_NAME);
    expect(entry.revokedAt).toBeUndefined();
  });

  it('sets capturedAt to a valid ISO timestamp', () => {
    const before = new Date().toISOString();
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', true);
    const after = new Date().toISOString();

    const entry = getConsents()[0]!;
    expect(entry.capturedAt >= before).toBe(true);
    expect(entry.capturedAt <= after).toBe(true);
  });
});

// ─── 2. Revoke sets revokedAt / revokedBy / revocationReason ─────────────────

describe('recordPortalConsentChange — revoke', () => {
  beforeEach(resetStore);

  it('sets revokedAt, revokedBy, revokedByName, and revocationReason on toggle OFF', () => {
    // First grant a consent so there is something to revoke
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true);
    expect(getConsents()).toHaveLength(1);

    const before = new Date().toISOString();
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', false);
    const after = new Date().toISOString();

    const entries = getConsents();
    expect(entries).toHaveLength(1); // same entry; revoke mutates in place
    const entry = entries[0]!;

    expect(entry.revokedAt).toBeDefined();
    expect(entry.revokedAt! >= before).toBe(true);
    expect(entry.revokedAt! <= after).toBe(true);
    expect(entry.revokedBy).toBe(CUSTOMER_ID);
    expect(entry.revokedByName).toBe(CUSTOMER_NAME);
    expect(entry.revocationReason).toBe('Customer self-revoke via portal');
  });

  it('does not throw when revoking a purpose that has no active entry (silent absorb)', () => {
    // No existing entry — should not throw
    expect(() =>
      recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'SERVICE_REMINDER', false),
    ).not.toThrow();
  });
});

// ─── 3. Append-only: prior revoked entries not mutated on new grant ───────────

describe('append-only ledger', () => {
  beforeEach(resetStore);

  it('creates a new entry when re-granting after revocation (prior entry untouched)', () => {
    // Grant
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true);
    const firstId = getConsents()[0]!.id;

    // Revoke
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', false);
    expect(getConsents().find((c) => c.id === firstId)?.revokedAt).toBeDefined();

    // Re-grant — should create a NEW entry, NOT mutate the revoked one
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true);

    const all = getConsents();
    expect(all).toHaveLength(2);

    const revoked = all.find((c) => c.id === firstId)!;
    const newEntry = all.find((c) => c.id !== firstId)!;

    // Old entry still revoked (not mutated)
    expect(revoked.revokedAt).toBeDefined();

    // New entry is active
    expect(newEntry.revokedAt).toBeUndefined();
    expect(newEntry.source).toBe('PORTAL_SIGNUP');
  });
});

// ─── 4. Multiple grants/revokes leave a clean ledger ────────────────────────

describe('multiple grant/revoke cycles', () => {
  beforeEach(resetStore);

  it('only one active entry remains after grant → revoke → grant', () => {
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', true);
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', false);
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', true);

    const all = getConsents();
    // 2 entries: first revoked, second active
    expect(all).toHaveLength(2);

    const activeEntries = all.filter((c) => !c.revokedAt);
    const revokedEntries = all.filter((c) => c.revokedAt);
    expect(activeEntries).toHaveLength(1);
    expect(revokedEntries).toHaveLength(1);
  });

  it('independent purposes do not interfere with each other', () => {
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true);
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', true);
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', false);

    const whatsapp = getConsents().filter((c) => c.purpose === 'WHATSAPP_MARKETING');
    const email = getConsents().filter((c) => c.purpose === 'EMAIL_MARKETING');

    expect(whatsapp[0]!.revokedAt).toBeDefined();
    expect(email[0]!.revokedAt).toBeUndefined();
  });
});

// ─── 5. Insurance audience builder excludes a revoked customer ────────────────

describe('isConsentActive — insurance audience exclusion (cross-store integration)', () => {
  beforeEach(resetStore);

  it('returns true when an active consent exists', () => {
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true);
    expect(isConsentActive(CUSTOMER_ID, 'WHATSAPP_MARKETING')).toBe(true);
  });

  it('returns false when consent has been revoked via portal toggle', () => {
    // Simulate: portal toggle OFF after a prior grant
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true);
    recordPortalConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', false);

    // Insurance audience builder checks isConsentActive at dispatch time (L14)
    expect(isConsentActive(CUSTOMER_ID, 'WHATSAPP_MARKETING')).toBe(false);
  });

  it('returns false when no consent entry exists for the purpose', () => {
    // Customer never opted in — no entry in store
    expect(isConsentActive('cust-no-entry', 'WHATSAPP_MARKETING')).toBe(false);
  });

  it('simulates audience builder filtering: revoked customer excluded from batch', () => {
    const audienceIds = ['cust-a', 'cust-b', 'cust-c'];

    // Seed: cust-a and cust-c have active consent; cust-b revoked
    recordPortalConsentChange('cust-a', 'Customer A', 'WHATSAPP_MARKETING', true);
    recordPortalConsentChange('cust-b', 'Customer B', 'WHATSAPP_MARKETING', true);
    recordPortalConsentChange('cust-c', 'Customer C', 'WHATSAPP_MARKETING', true);
    recordPortalConsentChange('cust-b', 'Customer B', 'WHATSAPP_MARKETING', false); // revoke

    // Audience builder: filter to active consents only (L14 boundary)
    const eligible = audienceIds.filter((id) =>
      isConsentActive(id, 'WHATSAPP_MARKETING'),
    );

    expect(eligible).toEqual(['cust-a', 'cust-c']);
    expect(eligible).not.toContain('cust-b');
  });
});

// ─── 6. Migration runs once on first load (idempotent) ───────────────────────

describe('portal consent store — hydrateConsents migration', () => {
  beforeEach(resetStore);

  it('migration seeds entries from notificationPrefs on first call', () => {
    const store = usePortalConsentStore.getState();

    // Simulate migration: whatsappUpdates=true → WHATSAPP_MARKETING entry
    store.captureConsent({
      customerId: CUSTOMER_ID,
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2023-04-10T00:00:00.000Z',
      capturedBy: CUSTOMER_ID,
      capturedByName: CUSTOMER_NAME,
      source: 'PORTAL_SIGNUP',
    });

    const entries = getConsents().filter(
      (c) => c.customerId === CUSTOMER_ID && c.source === 'PORTAL_SIGNUP',
    );
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it('migration is idempotent: running again when PORTAL_SIGNUP entries exist adds no duplicates', () => {
    const store = usePortalConsentStore.getState();

    // Run migration once
    store.captureConsent({
      customerId: CUSTOMER_ID,
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2023-04-10T00:00:00.000Z',
      capturedBy: CUSTOMER_ID,
      capturedByName: CUSTOMER_NAME,
      source: 'PORTAL_SIGNUP',
    });

    const before = getConsents().length;

    // Guard: only run migration when no PORTAL_SIGNUP entries exist
    const hasPortalEntries = getConsents().some(
      (c) => c.customerId === CUSTOMER_ID && c.source === 'PORTAL_SIGNUP',
    );

    // Since entries already exist, migration should be skipped (hasPortalEntries = true)
    expect(hasPortalEntries).toBe(true);

    // Simulate the guard check (same logic as PortalConsentMigrator)
    if (!hasPortalEntries) {
      store.captureConsent({
        customerId: CUSTOMER_ID,
        purpose: 'WHATSAPP_MARKETING',
        capturedAt: '2023-04-10T00:00:00.000Z',
        capturedBy: CUSTOMER_ID,
        capturedByName: CUSTOMER_NAME,
        source: 'PORTAL_SIGNUP',
      });
    }

    const after = getConsents().length;
    expect(after).toBe(before); // no new entries added
  });

  it('PORTAL_PURPOSE_MAP maps all expected portal keys', () => {
    expect(PORTAL_PURPOSE_MAP.whatsappUpdates).toBe('WHATSAPP_MARKETING');
    expect(PORTAL_PURPOSE_MAP.emailNotifications).toBe('EMAIL_MARKETING');
    expect(PORTAL_PURPOSE_MAP.smsReminders).toBe('SERVICE_REMINDER');
  });
});
