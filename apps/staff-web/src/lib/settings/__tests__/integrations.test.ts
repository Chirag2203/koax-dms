/**
 * Integrations slice tests — SPEC-SETTINGS-001 §4
 *
 * Covers:
 *   - L11: connection test stub timing (800ms) and response format
 *   - L16: disconnect role guard (R02+ or R22+)
 *   - buildInitialCredentials — all 6 providers seeded
 *   - INTEGRATION_DISPLAY coverage
 *   - IntegrationAccessDeniedError shape
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildInitialCredentials,
  runConnectionTestStub,
  validateDisconnect,
  INTEGRATION_DISPLAY,
  IntegrationAccessDeniedError,
} from '../slices/integrations-slice';
import type { StoreActor } from '../slices/outlets-slice';

// ── Actors ───────────────────────────────────────────────────────────────────

const ORG_ADMIN: StoreActor = { id: 'staff-r02-001', role: 'R02' };
const CFO: StoreActor = { id: 'staff-r22-001', role: 'R22' };
const SALES_EXEC: StoreActor = { id: 'staff-r09-001', role: 'R09' };
const SERVICE_ADVISOR: StoreActor = { id: 'staff-r07-001', role: 'R07' };

// ── buildInitialCredentials ───────────────────────────────────────────────────

describe('buildInitialCredentials', () => {
  it('seeds all 6 integration providers from fixture', () => {
    const creds = buildInitialCredentials();
    const providers = Object.keys(creds);
    expect(providers).toHaveLength(6);
  });

  it('contains all expected provider keys', () => {
    const creds = buildInitialCredentials();
    expect(creds).toHaveProperty('razorpay');
    expect(creds).toHaveProperty('whatsapp_bsp');
    expect(creds).toHaveProperty('irp_einvoicing');
    expect(creds).toHaveProperty('aadhaar_sub_kua');
    expect(creds).toHaveProperty('dlt_sms');
    expect(creds).toHaveProperty('tally_prime');
  });

  it('dlt_sms is seeded as disconnected per fixture', () => {
    const creds = buildInitialCredentials();
    expect(creds.dlt_sms.status).toBe('disconnected');
  });

  it('razorpay is seeded as connected per fixture', () => {
    const creds = buildInitialCredentials();
    expect(creds.razorpay.status).toBe('connected');
  });
});

// ── runConnectionTestStub — L11 ───────────────────────────────────────────────

describe('runConnectionTestStub — L11', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with ok: true after the 800ms stub delay', async () => {
    const promise = runConnectionTestStub('razorpay', ORG_ADMIN);
    vi.advanceTimersByTime(800);
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('response message includes the provider name', async () => {
    const promise = runConnectionTestStub('tally_prime', ORG_ADMIN);
    vi.advanceTimersByTime(800);
    const result = await promise;
    expect(result.message).toContain('tally_prime');
  });

  it('testedAt is a valid ISO date string', async () => {
    const promise = runConnectionTestStub('razorpay', ORG_ADMIN);
    vi.advanceTimersByTime(800);
    const result = await promise;
    expect(new Date(result.testedAt).getTime()).not.toBeNaN();
  });

  it('throws IntegrationAccessDeniedError for R09 (below R02 and R22)', async () => {
    await expect(
      runConnectionTestStub('razorpay', SALES_EXEC),
    ).rejects.toBeInstanceOf(IntegrationAccessDeniedError);
  });

  it('R22 (CFO) is allowed to test connection', async () => {
    const promise = runConnectionTestStub('irp_einvoicing', CFO);
    vi.advanceTimersByTime(800);
    await expect(promise).resolves.not.toThrow();
  });

  it('does NOT resolve before 800ms have elapsed', async () => {
    let resolved = false;
    const promise = runConnectionTestStub('razorpay', ORG_ADMIN).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(799);
    // flush micro-tasks without advancing further timers
    await Promise.resolve();
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });
});

// ── validateDisconnect — L16 ─────────────────────────────────────────────────

describe('validateDisconnect — L16', () => {
  it('throws IntegrationAccessDeniedError for R07 (Service Advisor)', () => {
    expect(() =>
      validateDisconnect('whatsapp_bsp', SERVICE_ADVISOR),
    ).toThrow(IntegrationAccessDeniedError);
  });

  it('throws IntegrationAccessDeniedError for R09 (Sales Executive)', () => {
    expect(() =>
      validateDisconnect('razorpay', SALES_EXEC),
    ).toThrow(IntegrationAccessDeniedError);
  });

  it('R02 (Org Admin) can disconnect', () => {
    expect(() => validateDisconnect('razorpay', ORG_ADMIN)).not.toThrow();
  });

  it('R22 (CFO) can disconnect', () => {
    expect(() => validateDisconnect('irp_einvoicing', CFO)).not.toThrow();
  });

  it('error message names the role that was denied', () => {
    try {
      validateDisconnect('razorpay', SALES_EXEC);
    } catch (e) {
      expect(e).toBeInstanceOf(IntegrationAccessDeniedError);
      expect((e as Error).message).toContain('R09');
    }
  });
});

// ── INTEGRATION_DISPLAY ───────────────────────────────────────────────────────

describe('INTEGRATION_DISPLAY', () => {
  it('has an entry for every integration provider', () => {
    const providers = [
      'razorpay',
      'whatsapp_bsp',
      'irp_einvoicing',
      'aadhaar_sub_kua',
      'dlt_sms',
      'tally_prime',
    ] as const;
    for (const p of providers) {
      expect(INTEGRATION_DISPLAY[p]).toBeDefined();
    }
  });

  it('every entry has a name, doc13Ref, and non-empty dependencies', () => {
    for (const [, display] of Object.entries(INTEGRATION_DISPLAY)) {
      expect(display.name).toBeTruthy();
      expect(display.doc13Ref).toContain('Doc 13');
      expect(display.dependencies.length).toBeGreaterThan(0);
    }
  });
});
