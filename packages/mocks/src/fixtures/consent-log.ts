/**
 * Consent-log fixtures — SPEC-CUSTOMERS-001 §3, GAP-3 / GAP-10.
 *
 * 5 named customers × 4 purposes each.
 * Mix of active (no revokedAt) and revoked entries.
 *
 * Customer ids mirror the names in customer.ts.
 */
import type { ConsentEntry } from '@dms/types';

const STAFF_SALES_MANAGER = {
  id: 'staff-r09-001',
  name: 'Priya Sharma',
};

const STAFF_GM = {
  id: 'staff-r19-001',
  name: 'Arjun Bose',
};

// ─── Arjun Mehta (cust-arjun-mehta) ──────────────────────────────────────────

const arjunMehtaConsents: ConsentEntry[] = [
  {
    id: 'consent-am-1',
    customerId: 'cust-arjun-mehta',
    purpose: 'DATA_PROCESSING',
    capturedAt: '2023-04-01T10:30:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'PORTAL_SIGNUP',
  },
  {
    id: 'consent-am-2',
    customerId: 'cust-arjun-mehta',
    purpose: 'WHATSAPP_MARKETING',
    capturedAt: '2023-04-01T10:31:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'PORTAL_SIGNUP',
  },
  {
    id: 'consent-am-3',
    customerId: 'cust-arjun-mehta',
    purpose: 'EMAIL_MARKETING',
    capturedAt: '2023-04-01T10:32:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'PORTAL_SIGNUP',
  },
  {
    id: 'consent-am-4',
    customerId: 'cust-arjun-mehta',
    purpose: 'SERVICE_REMINDER',
    capturedAt: '2023-04-01T10:33:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'PORTAL_SIGNUP',
  },
];

// ─── Vikram Singh (cust-vikram-singh) — partial revocations ──────────────────

const vikramSinghConsents: ConsentEntry[] = [
  {
    id: 'consent-vs-1',
    customerId: 'cust-vikram-singh',
    purpose: 'DATA_PROCESSING',
    capturedAt: '2020-06-01T09:00:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'STAFF_FORM',
  },
  {
    id: 'consent-vs-2',
    customerId: 'cust-vikram-singh',
    purpose: 'WHATSAPP_MARKETING',
    capturedAt: '2020-06-01T09:02:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'STAFF_FORM',
    // Revoked — opted out of WhatsApp marketing
    revokedAt: '2024-01-15T14:00:00.000Z',
    revokedBy: STAFF_GM.id,
    revokedByName: STAFF_GM.name,
    revocationReason: 'Customer requested WhatsApp opt-out via phone call',
  },
  {
    id: 'consent-vs-3',
    customerId: 'cust-vikram-singh',
    purpose: 'EMAIL_MARKETING',
    capturedAt: '2020-06-01T09:03:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'STAFF_FORM',
  },
  {
    id: 'consent-vs-4',
    customerId: 'cust-vikram-singh',
    purpose: 'SERVICE_REMINDER',
    capturedAt: '2020-06-01T09:04:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'STAFF_FORM',
  },
];

// ─── Rohan Desai (cust-rohan-desai) — mostly revoked (erasure candidate) ─────

const rohanDesaiConsents: ConsentEntry[] = [
  {
    id: 'consent-rd-1',
    customerId: 'cust-rohan-desai',
    purpose: 'DATA_PROCESSING',
    capturedAt: '2019-03-01T08:00:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
    revokedAt: '2025-11-01T10:00:00.000Z',
    revokedBy: STAFF_GM.id,
    revokedByName: STAFF_GM.name,
    revocationReason: 'DPDP erasure request submitted by customer',
  },
  {
    id: 'consent-rd-2',
    customerId: 'cust-rohan-desai',
    purpose: 'WHATSAPP_MARKETING',
    capturedAt: '2019-03-01T08:01:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
    revokedAt: '2025-11-01T10:01:00.000Z',
    revokedBy: STAFF_GM.id,
    revokedByName: STAFF_GM.name,
    revocationReason: 'DPDP erasure request submitted by customer',
  },
  {
    id: 'consent-rd-3',
    customerId: 'cust-rohan-desai',
    purpose: 'EMAIL_MARKETING',
    capturedAt: '2019-03-01T08:02:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
  },
  {
    id: 'consent-rd-4',
    customerId: 'cust-rohan-desai',
    purpose: 'SERVICE_REMINDER',
    capturedAt: '2019-03-01T08:03:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
  },
];

// ─── Karan Shah (cust-karan-shah) — ULTRA_HNW, insurance marketing ───────────

const karanShahConsents: ConsentEntry[] = [
  {
    id: 'consent-ks-1',
    customerId: 'cust-karan-shah',
    purpose: 'DATA_PROCESSING',
    capturedAt: '2021-09-01T11:00:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'PORTAL_SIGNUP',
  },
  {
    id: 'consent-ks-2',
    customerId: 'cust-karan-shah',
    purpose: 'INSURANCE_MARKETING',
    capturedAt: '2021-09-01T11:01:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'STAFF_FORM',
  },
  {
    id: 'consent-ks-3',
    customerId: 'cust-karan-shah',
    purpose: 'SERVICE_REMINDER',
    capturedAt: '2021-09-01T11:02:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'PORTAL_SIGNUP',
  },
  {
    id: 'consent-ks-4',
    customerId: 'cust-karan-shah',
    purpose: 'WHATSAPP_MARKETING',
    capturedAt: '2021-09-01T11:03:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'STAFF_FORM',
    // Revoked — ULTRA_HNW opted out
    revokedAt: '2024-06-20T09:30:00.000Z',
    revokedBy: STAFF_GM.id,
    revokedByName: STAFF_GM.name,
    revocationReason: 'Customer requested removal from all WhatsApp campaigns',
  },
];

// ─── Sunita Reddy (cust-sunita-reddy) — DORMANT lifecycle ────────────────────

const sunitaReddyConsents: ConsentEntry[] = [
  {
    id: 'consent-sr-1',
    customerId: 'cust-sunita-reddy',
    purpose: 'DATA_PROCESSING',
    capturedAt: '2019-07-01T07:00:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
  },
  {
    id: 'consent-sr-2',
    customerId: 'cust-sunita-reddy',
    purpose: 'EMAIL_MARKETING',
    capturedAt: '2019-07-01T07:01:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
    revokedAt: '2023-03-10T12:00:00.000Z',
    revokedBy: STAFF_SALES_MANAGER.id,
    revokedByName: STAFF_SALES_MANAGER.name,
    revocationReason: 'Customer unsubscribed via email link',
  },
  {
    id: 'consent-sr-3',
    customerId: 'cust-sunita-reddy',
    purpose: 'SERVICE_REMINDER',
    capturedAt: '2019-07-01T07:02:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
  },
  {
    id: 'consent-sr-4',
    customerId: 'cust-sunita-reddy',
    purpose: 'WHATSAPP_MARKETING',
    capturedAt: '2019-07-01T07:03:00.000Z',
    capturedBy: STAFF_SALES_MANAGER.id,
    capturedByName: STAFF_SALES_MANAGER.name,
    source: 'IMPORT',
    revokedAt: '2023-03-10T12:05:00.000Z',
    revokedBy: STAFF_SALES_MANAGER.id,
    revokedByName: STAFF_SALES_MANAGER.name,
    revocationReason: 'Customer unsubscribed via email link',
  },
];

// ─── Flat export ──────────────────────────────────────────────────────────────

export const consentLogEntries: ConsentEntry[] = [
  ...arjunMehtaConsents,
  ...vikramSinghConsents,
  ...rohanDesaiConsents,
  ...karanShahConsents,
  ...sunitaReddyConsents,
];

/**
 * Look up consents for a single customer by id.
 */
export function getConsentsForCustomer(customerId: string): ConsentEntry[] {
  return consentLogEntries.filter((e) => e.customerId === customerId);
}
