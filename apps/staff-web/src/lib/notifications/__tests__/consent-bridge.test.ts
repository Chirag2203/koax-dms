/**
 * Consent bridge tests — SPEC-NOTIFICATIONS-001 L4, L18
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkConsentAtDispatch, getPurposeForDispatch } from '../consent-bridge';
import type { NotificationConsentSnapshot } from '@dms/types';

// ── Mock customers store ───────────────────────────────────────────────────────

vi.mock('../../customers/customers-store', () => ({
  useCustomersStore: {
    getState: vi.fn(() => ({
      consents: {},
    })),
  },
}));

import { useCustomersStore } from '../../customers/customers-store';

const ACTIVE_SNAPSHOT: NotificationConsentSnapshot = {
  purpose: 'WHATSAPP_MARKETING',
  capturedAt: '2025-11-01T10:00:00.000Z',
  capturedBy: 'staff-r09',
  source: 'STAFF_FORM',
};

// ─── getPurposeForDispatch ─────────────────────────────────────────────────────

describe('getPurposeForDispatch', () => {
  it('WHATSAPP + INSURANCE → WHATSAPP_MARKETING', () => {
    expect(getPurposeForDispatch('WHATSAPP', 'INSURANCE')).toBe('WHATSAPP_MARKETING');
  });

  it('SMS + SERVICE_BOOKING → SERVICE_REMINDER', () => {
    expect(getPurposeForDispatch('SMS', 'SERVICE_BOOKING')).toBe('SERVICE_REMINDER');
  });

  it('WHATSAPP + SERVICE_BOOKING → SERVICE_REMINDER', () => {
    expect(getPurposeForDispatch('WHATSAPP', 'SERVICE_BOOKING')).toBe('SERVICE_REMINDER');
  });

  it('SMS + CUSTOM_BUILDS → DATA_PROCESSING', () => {
    expect(getPurposeForDispatch('SMS', 'CUSTOM_BUILDS')).toBe('DATA_PROCESSING');
  });

  it('SMS + CUSTOMERS → DATA_PROCESSING', () => {
    expect(getPurposeForDispatch('SMS', 'CUSTOMERS')).toBe('DATA_PROCESSING');
  });
});

// ─── checkConsentAtDispatch ────────────────────────────────────────────────────

describe('checkConsentAtDispatch', () => {
  beforeEach(() => {
    vi.mocked(useCustomersStore.getState).mockReturnValue({
      consents: {},
    } as unknown as ReturnType<typeof useCustomersStore.getState>);
  });

  it('allows dispatch when no customerId (raw recipient)', () => {
    const result = checkConsentAtDispatch(undefined, ACTIVE_SNAPSHOT);
    expect(result.allowed).toBe(true);
    expect(result.snapshot).toEqual(ACTIVE_SNAPSHOT);
  });

  it('L4: allows dispatch when consent is active (revokedAt null)', () => {
    vi.mocked(useCustomersStore.getState).mockReturnValue({
      consents: {
        'consent-001': {
          id: 'consent-001',
          customerId: 'cust-arjun',
          purpose: 'WHATSAPP_MARKETING' as const,
          capturedAt: '2025-11-01T10:00:00.000Z',
          capturedBy: 'staff-r09',
          capturedByName: 'Raj Kumar',
          source: 'STAFF_FORM' as const,
          revokedAt: undefined,
        },
      },
    } as unknown as ReturnType<typeof useCustomersStore.getState>);

    const result = checkConsentAtDispatch('cust-arjun', ACTIVE_SNAPSHOT);
    expect(result.allowed).toBe(true);
  });

  it('L4: blocks dispatch when consent is revoked (S-N-3)', () => {
    vi.mocked(useCustomersStore.getState).mockReturnValue({
      consents: {
        'consent-001': {
          id: 'consent-001',
          customerId: 'cust-arjun',
          purpose: 'WHATSAPP_MARKETING' as const,
          capturedAt: '2025-11-01T10:00:00.000Z',
          capturedBy: 'staff-r09',
          capturedByName: 'Raj Kumar',
          source: 'STAFF_FORM' as const,
          revokedAt: '2026-04-19T14:00:00.000Z',
        },
      },
    } as unknown as ReturnType<typeof useCustomersStore.getState>);

    const result = checkConsentAtDispatch('cust-arjun', ACTIVE_SNAPSHOT);
    expect(result.allowed).toBe(false);
  });

  it('L18: snapshot is frozen from live consent entry when found', () => {
    const liveConsent = {
      id: 'consent-001',
      customerId: 'cust-arjun',
      purpose: 'WHATSAPP_MARKETING' as const,
      capturedAt: '2025-11-01T10:00:00.000Z',
      capturedBy: 'staff-r09',
      capturedByName: 'Raj Kumar',
      source: 'STAFF_FORM' as const,
    };

    vi.mocked(useCustomersStore.getState).mockReturnValue({
      consents: { 'consent-001': liveConsent },
    } as unknown as ReturnType<typeof useCustomersStore.getState>);

    const result = checkConsentAtDispatch('cust-arjun', ACTIVE_SNAPSHOT);
    expect(result.snapshot.capturedAt).toBe(liveConsent.capturedAt);
    expect(result.snapshot.capturedBy).toBe(liveConsent.capturedBy);
    expect(result.snapshot.source).toBe(liveConsent.source);
  });

  it('L18: snapshot persists even when consent is later revoked (frozen at call time)', () => {
    // First call — consent active
    vi.mocked(useCustomersStore.getState).mockReturnValueOnce({
      consents: {
        'consent-001': {
          id: 'consent-001',
          customerId: 'cust-meera',
          purpose: 'WHATSAPP_MARKETING' as const,
          capturedAt: '2025-10-01T10:00:00.000Z',
          capturedBy: 'staff-r09',
          capturedByName: 'Raj Kumar',
          source: 'STAFF_FORM' as const,
        },
      },
    } as unknown as ReturnType<typeof useCustomersStore.getState>);

    const result1 = checkConsentAtDispatch('cust-meera', ACTIVE_SNAPSHOT);
    expect(result1.allowed).toBe(true);
    const frozenSnapshot = result1.snapshot;

    // Later — consent revoked; frozen snapshot should still show original capturedAt
    vi.mocked(useCustomersStore.getState).mockReturnValueOnce({
      consents: {
        'consent-001': {
          id: 'consent-001',
          customerId: 'cust-meera',
          purpose: 'WHATSAPP_MARKETING' as const,
          capturedAt: '2025-10-01T10:00:00.000Z',
          capturedBy: 'staff-r09',
          capturedByName: 'Raj Kumar',
          source: 'STAFF_FORM' as const,
          revokedAt: '2026-04-20T10:00:00.000Z',
        },
      },
    } as unknown as ReturnType<typeof useCustomersStore.getState>);

    const result2 = checkConsentAtDispatch('cust-meera', ACTIVE_SNAPSHOT);
    expect(result2.allowed).toBe(false);
    // The snapshot returned for the revoked call still captures the original consent data
    expect(frozenSnapshot.capturedAt).toBe('2025-10-01T10:00:00.000Z');
  });

  it('allows dispatch when customerId has no consent entry (no PII lookup possible)', () => {
    // No matching consent found — should default to allowing (provided snapshot used)
    vi.mocked(useCustomersStore.getState).mockReturnValue({
      consents: {},
    } as unknown as ReturnType<typeof useCustomersStore.getState>);

    const result = checkConsentAtDispatch('cust-unknown', ACTIVE_SNAPSHOT);
    expect(result.allowed).toBe(true);
    expect(result.snapshot).toEqual(ACTIVE_SNAPSHOT);
  });
});
