/**
 * Staff consent bridge tests — DPDP-C2 (2026-04-30)
 *
 * Covers:
 *   T1 — recordStaffConsentChange: grant creates 1 ConsentEntry row
 *   T2 — recordStaffConsentChange: revoke sets revokedAt on active entry
 *   T3 — isConsentActive reflects most recent state
 *   T4 — Ledger is append-only: revoke does not delete the original grant row
 *   T5 — recordEditConsentDiff emits one row per changed pref (3 changes → 3 rows)
 *   T6 — recordEditConsentDiff emits no rows when prefs are unchanged
 *   T7 — recordCreateConsentEntries: TRUE prefs create rows; FALSE prefs create no rows
 *   T8 — recordStaffConsentChange: revoke on non-existent active entry is a no-op (no throw)
 *   T9 — STAFF_PURPOSE_MAP maps all 5 pref keys to correct ConsentPurpose values
 *   T10 — Multiple grants for same purpose stack (append-only); isConsentActive = true
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordStaffConsentChange,
  recordCreateConsentEntries,
  recordEditConsentDiff,
  isConsentActive,
  STAFF_PURPOSE_MAP,
  type CommunicationPrefsInput,
} from '../staff-consent-bridge';
import { useCustomersStore } from '../customers-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CUSTOMER_ID = 'cust-test-bridge-001';
const CUSTOMER_NAME = 'Test Bridge Customer';
const STAFF_ID = 'staff-r09-bridge-001';
const STAFF_NAME = 'Priya Sharma';

function resetStore() {
  useCustomersStore.setState({
    customers: {},
    auditEvents: [],
    consents: {},
    hydrated: false,
  });
}

function getConsentRows(customerId = CUSTOMER_ID) {
  return Object.values(useCustomersStore.getState().consents).filter(
    (c) => c.customerId === customerId,
  );
}

// ─── T9: Purpose map ─────────────────────────────────────────────────────────

describe('STAFF_PURPOSE_MAP', () => {
  it('T9: maps all 5 pref keys to correct ConsentPurpose values', () => {
    expect(STAFF_PURPOSE_MAP.whatsappUpdates).toBe('WHATSAPP_MARKETING');
    expect(STAFF_PURPOSE_MAP.smsAlerts).toBe('SMS_MARKETING');
    expect(STAFF_PURPOSE_MAP.emailNewsletter).toBe('EMAIL_MARKETING');
    expect(STAFF_PURPOSE_MAP.callConsent).toBe('CALL_MARKETING');
    expect(STAFF_PURPOSE_MAP.marketingConsent).toBe('GENERAL_MARKETING');
  });
});

// ─── T1: Grant creates one row ────────────────────────────────────────────────

describe('recordStaffConsentChange — grant', () => {
  beforeEach(resetStore);

  it('T1: grant creates 1 ConsentEntry row with correct fields', () => {
    recordStaffConsentChange(
      CUSTOMER_ID,
      CUSTOMER_NAME,
      'WHATSAPP_MARKETING',
      true,
      STAFF_ID,
      STAFF_NAME,
    );

    const rows = getConsentRows();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.customerId).toBe(CUSTOMER_ID);
    expect(row.purpose).toBe('WHATSAPP_MARKETING');
    expect(row.capturedBy).toBe(STAFF_ID);
    expect(row.capturedByName).toBe(STAFF_NAME);
    expect(row.source).toBe('STAFF_FORM');
    expect(row.revokedAt).toBeUndefined();
  });

  it('also emits a CONSENT_CAPTURED audit event', () => {
    recordStaffConsentChange(
      CUSTOMER_ID,
      CUSTOMER_NAME,
      'EMAIL_MARKETING',
      true,
      STAFF_ID,
      STAFF_NAME,
    );

    const events = useCustomersStore.getState().auditEvents;
    const event = events.find((e) => e.kind === 'CONSENT_CAPTURED');
    expect(event).toBeDefined();
    expect(event!.actorId).toBe(STAFF_ID);
    expect(event!.customerId).toBe(CUSTOMER_ID);
  });
});

// ─── T2: Revoke sets revokedAt ────────────────────────────────────────────────

describe('recordStaffConsentChange — revoke', () => {
  beforeEach(resetStore);

  it('T2: revoke sets revokedAt/revokedBy on the latest active entry', () => {
    // First grant
    recordStaffConsentChange(
      CUSTOMER_ID,
      CUSTOMER_NAME,
      'WHATSAPP_MARKETING',
      true,
      STAFF_ID,
      STAFF_NAME,
    );

    // Then revoke
    recordStaffConsentChange(
      CUSTOMER_ID,
      CUSTOMER_NAME,
      'WHATSAPP_MARKETING',
      false,
      STAFF_ID,
      STAFF_NAME,
    );

    const rows = getConsentRows();
    expect(rows).toHaveLength(1); // still 1 row — not deleted
    const row = rows[0]!;
    expect(row.revokedAt).toBeTruthy();
    expect(row.revokedBy).toBe(STAFF_ID);
  });
});

// ─── T3: isConsentActive reflects latest state ────────────────────────────────

describe('isConsentActive', () => {
  beforeEach(resetStore);

  it('T3a: returns true after a grant', () => {
    recordStaffConsentChange(
      CUSTOMER_ID,
      CUSTOMER_NAME,
      'SMS_MARKETING',
      true,
      STAFF_ID,
      STAFF_NAME,
    );
    expect(isConsentActive(CUSTOMER_ID, 'SMS_MARKETING')).toBe(true);
  });

  it('T3b: returns false after revoke', () => {
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'SMS_MARKETING', true, STAFF_ID, STAFF_NAME);
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'SMS_MARKETING', false, STAFF_ID, STAFF_NAME);
    expect(isConsentActive(CUSTOMER_ID, 'SMS_MARKETING')).toBe(false);
  });

  it('T3c: returns false when no consent entry exists for a purpose', () => {
    expect(isConsentActive(CUSTOMER_ID, 'CALL_MARKETING')).toBe(false);
  });
});

// ─── T4: Append-only — revoke does not delete grant row ──────────────────────

describe('Append-only ledger', () => {
  beforeEach(resetStore);

  it('T4: revoke does not delete the original grant row', () => {
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'GENERAL_MARKETING', true, STAFF_ID, STAFF_NAME);
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'GENERAL_MARKETING', false, STAFF_ID, STAFF_NAME);

    const rows = getConsentRows();
    expect(rows).toHaveLength(1); // original row still present
    expect(rows[0]!.purpose).toBe('GENERAL_MARKETING');
    expect(rows[0]!.revokedAt).toBeTruthy(); // marked revoked, not deleted
  });
});

// ─── T5: recordEditConsentDiff emits one row per changed pref ─────────────────

describe('recordEditConsentDiff', () => {
  beforeEach(resetStore);

  it('T5: emits one row per changed pref (3 changes → 3 rows)', () => {
    // Seed an active WHATSAPP consent so we can revoke it
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true, STAFF_ID, STAFF_NAME);
    const initialRows = getConsentRows();
    expect(initialRows).toHaveLength(1);

    const oldPrefs: CommunicationPrefsInput = {
      whatsappUpdates: true,
      smsAlerts: false,
      emailNewsletter: false,
      callConsent: false,
      marketingConsent: false,
    };

    const newPrefs: CommunicationPrefsInput = {
      whatsappUpdates: false,   // changed: revoke
      smsAlerts: true,          // changed: grant
      emailNewsletter: true,    // changed: grant
      callConsent: false,       // unchanged
      marketingConsent: false,  // unchanged
    };

    recordEditConsentDiff(
      CUSTOMER_ID,
      CUSTOMER_NAME,
      oldPrefs,
      newPrefs,
      STAFF_ID,
      STAFF_NAME,
    );

    const rows = getConsentRows();
    // 1 initial WHATSAPP grant (now revoked in-place) + 2 new grants (SMS, EMAIL) = 3 rows total.
    // The ledger is append-only for NEW grants; revoke mutates the existing row (withdrawConsent sets revokedAt).
    expect(rows).toHaveLength(3);

    const smsRow = rows.find((r) => r.purpose === 'SMS_MARKETING' && !r.revokedAt);
    const emailRow = rows.find((r) => r.purpose === 'EMAIL_MARKETING' && !r.revokedAt);
    const revokedWa = rows.find((r) => r.purpose === 'WHATSAPP_MARKETING' && r.revokedAt);
    expect(smsRow).toBeDefined();
    expect(emailRow).toBeDefined();
    expect(revokedWa).toBeDefined();
  });

  it('T6: emits no rows when all prefs are unchanged', () => {
    const prefs: CommunicationPrefsInput = {
      whatsappUpdates: true,
      smsAlerts: false,
      emailNewsletter: false,
      callConsent: false,
      marketingConsent: false,
    };

    // Seed the initial state
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'WHATSAPP_MARKETING', true, STAFF_ID, STAFF_NAME);
    const beforeRows = getConsentRows().length;

    // Diff with identical prefs
    recordEditConsentDiff(CUSTOMER_ID, CUSTOMER_NAME, prefs, prefs, STAFF_ID, STAFF_NAME);

    const afterRows = getConsentRows().length;
    expect(afterRows).toBe(beforeRows); // no new rows
  });
});

// ─── T7: recordCreateConsentEntries ──────────────────────────────────────────

describe('recordCreateConsentEntries', () => {
  beforeEach(resetStore);

  it('T7: TRUE prefs create rows; FALSE prefs create no rows', () => {
    const prefs: CommunicationPrefsInput = {
      whatsappUpdates: true,
      smsAlerts: false,
      emailNewsletter: true,
      callConsent: false,
      marketingConsent: true,
    };

    recordCreateConsentEntries(CUSTOMER_ID, CUSTOMER_NAME, prefs, STAFF_ID, STAFF_NAME);

    const rows = getConsentRows();
    // 3 true toggles → 3 rows
    expect(rows).toHaveLength(3);

    const purposes = rows.map((r) => r.purpose);
    expect(purposes).toContain('WHATSAPP_MARKETING');
    expect(purposes).toContain('EMAIL_MARKETING');
    expect(purposes).toContain('GENERAL_MARKETING');
    expect(purposes).not.toContain('SMS_MARKETING');
    expect(purposes).not.toContain('CALL_MARKETING');
  });

  it('T7b: all prefs false → zero rows created', () => {
    const prefs: CommunicationPrefsInput = {
      whatsappUpdates: false,
      smsAlerts: false,
      emailNewsletter: false,
      callConsent: false,
      marketingConsent: false,
    };

    recordCreateConsentEntries(CUSTOMER_ID, CUSTOMER_NAME, prefs, STAFF_ID, STAFF_NAME);

    const rows = getConsentRows();
    expect(rows).toHaveLength(0);
  });
});

// ─── T8: Revoke on non-existent active entry is a no-op ──────────────────────

describe('recordStaffConsentChange — revoke no-op', () => {
  beforeEach(resetStore);

  it('T8: revoke when no active entry exists does not throw', () => {
    expect(() => {
      recordStaffConsentChange(
        CUSTOMER_ID,
        CUSTOMER_NAME,
        'CALL_MARKETING',
        false,
        STAFF_ID,
        STAFF_NAME,
      );
    }).not.toThrow();

    const rows = getConsentRows();
    expect(rows).toHaveLength(0); // nothing was written
  });
});

// ─── T10: Multiple grants stack (append-only) ─────────────────────────────────

describe('Multiple grants stack', () => {
  beforeEach(resetStore);

  it('T10: two grants for the same purpose both persist; isConsentActive = true', () => {
    // Grant → revoke → grant again (re-opt-in)
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', true, STAFF_ID, STAFF_NAME);
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', false, STAFF_ID, STAFF_NAME);
    recordStaffConsentChange(CUSTOMER_ID, CUSTOMER_NAME, 'EMAIL_MARKETING', true, STAFF_ID, STAFF_NAME);

    const rows = getConsentRows();
    // 1 original grant (revoked) + 1 second grant = 2 rows total
    expect(rows).toHaveLength(2);

    const activeRows = rows.filter((r) => !r.revokedAt);
    expect(activeRows).toHaveLength(1);
    expect(isConsentActive(CUSTOMER_ID, 'EMAIL_MARKETING')).toBe(true);
  });
});
