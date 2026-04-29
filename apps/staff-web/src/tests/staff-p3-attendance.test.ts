/**
 * Staff P3 Attendance — Vitest tests
 * SPEC-STAFF-001 §P3, L17, L30, L31
 *
 * Covers:
 * 1. HMAC signature validation (L17)
 * 2. Dedup within ±60s (L17)
 * 3. Monthly summary computation
 * 4. classifyDay — late at 9:31 AM (L30)
 * 5. classifyDay — not late at 9:29 AM (L30)
 * 6. classifyDay — half-day at exactly 4h (boundary — actually returns present per ≥ threshold)
 * 7. classifyDay — half-day for 3.9h (< 4h threshold, L30)
 * 8. classifyDay — present for 4.01h (> 4h, L30)
 * 9. classifyDay — absent when no punches
 * 10. Manual override R12+ gate
 * 11. Manual override rejected for sub-R12 actor
 * 12. addAttendancePunch succeeds for device punch
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import {
  computeDailyHours,
  classifyDay,
  computeMonthlySummary,
} from '../lib/staff/attendance-math';
import { computeHmac, verifyHmac, dedupKey } from '../../app/api/webhooks/fingerprint/route';
import { useStaffStore } from '../lib/staff/staff-store';
import { MOCK_STAFF_PROFILES } from '@dms/mocks/fixtures';
import type { AttendancePunch } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshStore() {
  useStaffStore.getState().hydrate(MOCK_STAFF_PROFILES);
}

function makeTimestamp(hour: number, minute: number, date = '2026-04-07'): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${date}T${hh}:${mm}:00.000Z`;
}

function makePunch(
  eventType: 'punch-in' | 'punch-out',
  timestamp: string,
  override = false,
): AttendancePunch {
  return {
    punchId: `test-${Date.now()}-${Math.random()}`,
    staffId: 'staff-test-001',
    deviceId: 'device-blr-001',
    eventType,
    timestamp,
    isOverride: override,
  };
}

// ─── HMAC tests ───────────────────────────────────────────────────────────────

describe('Fingerprint webhook HMAC validation (L17)', () => {
  const secret = 'demo-secret-blr-001';
  const body = JSON.stringify({
    deviceId: 'device-blr-001',
    staffId: 'staff-r05-001',
    eventType: 'punch-in',
    timestamp: new Date().toISOString(),
  });

  it('verifyHmac returns true when signature matches (sha256= prefix)', () => {
    const sig = `sha256=${computeHmac(body, secret)}`;
    expect(verifyHmac(body, sig, secret)).toBe(true);
  });

  it('verifyHmac returns true without sha256= prefix', () => {
    const sig = computeHmac(body, secret);
    expect(verifyHmac(body, sig, secret)).toBe(true);
  });

  it('verifyHmac returns false for wrong secret', () => {
    const sig = `sha256=${computeHmac(body, 'wrong-secret')}`;
    expect(verifyHmac(body, sig, secret)).toBe(false);
  });

  it('verifyHmac returns false for tampered body', () => {
    const sig = `sha256=${computeHmac(body, secret)}`;
    const tamperedBody = body.replace('punch-in', 'punch-out');
    expect(verifyHmac(tamperedBody, sig, secret)).toBe(false);
  });

  it('verifyHmac returns false for empty signature', () => {
    expect(verifyHmac(body, '', secret)).toBe(false);
  });
});

// ─── Dedup tests ──────────────────────────────────────────────────────────────

describe('Dedup key computation (L17 ±60s)', () => {
  it('same staffId+eventType+timestamp produce same key', () => {
    const ts = '2026-04-07T09:00:00.000Z';
    expect(dedupKey('staff-r05-001', 'punch-in', ts)).toBe(
      dedupKey('staff-r05-001', 'punch-in', ts),
    );
  });

  it('timestamps within same 60s bucket produce same key', () => {
    const ts1 = '2026-04-07T09:00:00.000Z';
    const ts2 = '2026-04-07T09:00:30.000Z';  // 30s later, same minute bucket
    expect(dedupKey('staff-r05-001', 'punch-in', ts1)).toBe(
      dedupKey('staff-r05-001', 'punch-in', ts2),
    );
  });

  it('timestamps in different 60s buckets produce different keys', () => {
    const ts1 = '2026-04-07T09:00:00.000Z';
    const ts2 = '2026-04-07T09:01:30.000Z';  // >60s apart — different bucket
    expect(dedupKey('staff-r05-001', 'punch-in', ts1)).not.toBe(
      dedupKey('staff-r05-001', 'punch-in', ts2),
    );
  });

  it('different eventTypes produce different keys for same timestamp', () => {
    const ts = '2026-04-07T09:00:00.000Z';
    expect(dedupKey('staff-r05-001', 'punch-in', ts)).not.toBe(
      dedupKey('staff-r05-001', 'punch-out', ts),
    );
  });
});

// ─── classifyDay tests ────────────────────────────────────────────────────────

describe('classifyDay (L30)', () => {
  it('returns absent when no punches', () => {
    expect(classifyDay([])).toBe('absent');
  });

  it('returns late when first punch-in is at 9:31 AM (L30)', () => {
    const punches = [
      makePunch('punch-in', makeTimestamp(9, 31)),
      makePunch('punch-out', makeTimestamp(18, 0)),
    ];
    expect(classifyDay(punches)).toBe('late');
  });

  it('returns present (not late) when first punch-in is at 9:29 AM (L30)', () => {
    const punches = [
      makePunch('punch-in', makeTimestamp(9, 29)),
      makePunch('punch-out', makeTimestamp(18, 0)),
    ];
    expect(classifyDay(punches)).toBe('present');
  });

  it('returns present when first punch-in is exactly at 9:30 AM (boundary)', () => {
    const punches = [
      makePunch('punch-in', makeTimestamp(9, 30)),
      makePunch('punch-out', makeTimestamp(18, 0)),
    ];
    expect(classifyDay(punches)).toBe('present');
  });

  it('returns half-day when total hours < 4 (L30)', () => {
    // 9:00 AM in, 12:50 PM out = 3h50m = 3.83h < 4
    const punches = [
      makePunch('punch-in', makeTimestamp(9, 0)),
      makePunch('punch-out', makeTimestamp(12, 50)),
    ];
    expect(classifyDay(punches)).toBe('half-day');
  });

  it('returns present when total hours ≥ 4 (boundary: 4.01h, L30)', () => {
    // 9:00 AM in, 1:01 PM out = 4h1m > 4h
    const punches = [
      makePunch('punch-in', makeTimestamp(9, 0)),
      makePunch('punch-out', makeTimestamp(13, 1)),
    ];
    expect(classifyDay(punches)).toBe('present');
  });

  it('returns half-day when 3:59h (< 4h threshold)', () => {
    // 9:00 AM in, 12:59 PM out = 3h59m
    const punches = [
      makePunch('punch-in', makeTimestamp(9, 0)),
      makePunch('punch-out', makeTimestamp(12, 59)),
    ];
    expect(classifyDay(punches)).toBe('half-day');
  });

  it('half-day takes priority over late (< 4h regardless of punch-in time)', () => {
    // Late punch-in but still only 3h total
    const punches = [
      makePunch('punch-in', makeTimestamp(10, 0)),  // late
      makePunch('punch-out', makeTimestamp(13, 0)),  // 3h only
    ];
    expect(classifyDay(punches)).toBe('half-day');
  });
});

// ─── computeDailyHours tests ──────────────────────────────────────────────────

describe('computeDailyHours', () => {
  it('returns 0 for empty punch list', () => {
    expect(computeDailyHours([])).toBe(0);
  });

  it('computes correct hours for a 9h shift', () => {
    const punches = [
      makePunch('punch-in', makeTimestamp(9, 0)),
      makePunch('punch-out', makeTimestamp(18, 0)),
    ];
    expect(computeDailyHours(punches)).toBeCloseTo(9, 5);
  });

  it('ignores unpaired punch-in (no matching punch-out)', () => {
    const punches = [makePunch('punch-in', makeTimestamp(9, 0))];
    expect(computeDailyHours(punches)).toBe(0);
  });
});

// ─── computeMonthlySummary tests ──────────────────────────────────────────────

describe('computeMonthlySummary', () => {
  it('produces correct working days for April 2026 (22 weekdays)', () => {
    const summary = computeMonthlySummary('staff-test', 2026, 4, []);
    // April 2026: 30 days, check manually — should be 22 weekdays
    expect(summary.workingDays).toBe(22);
  });

  it('counts absents for all working days when no punches', () => {
    const summary = computeMonthlySummary('staff-test', 2026, 4, []);
    expect(summary.absentDays).toBe(summary.workingDays);
    expect(summary.presentDays).toBe(0);
  });

  it('counts present days correctly for 5 days of normal punches', () => {
    // Mon-Fri of second full week of April 2026: Apr 13 (Mon) – Apr 17 (Fri)
    const punches: AttendancePunch[] = [];
    for (const d of [13, 14, 15, 16, 17]) {
      const date = `2026-04-${String(d).padStart(2, '0')}`;
      punches.push(makePunch('punch-in', `${date}T09:00:00.000Z`));
      punches.push(makePunch('punch-out', `${date}T18:00:00.000Z`));
    }
    // Fix staffId on all punches
    const staffId = 'staff-test';
    const staffPunches = punches.map((p) => ({ ...p, staffId }));
    const summary = computeMonthlySummary(staffId, 2026, 4, staffPunches);
    expect(summary.presentDays).toBe(5);
  });

  it('overtime hours accumulate correctly', () => {
    const staffId = 'staff-test-ot';
    // 2 days with 10h shifts (1h OT each)
    const punches: AttendancePunch[] = [
      { ...makePunch('punch-in', '2026-04-07T09:00:00.000Z'), staffId },
      { ...makePunch('punch-out', '2026-04-07T19:00:00.000Z'), staffId },
      { ...makePunch('punch-in', '2026-04-08T09:00:00.000Z'), staffId },
      { ...makePunch('punch-out', '2026-04-08T19:00:00.000Z'), staffId },
    ];
    const summary = computeMonthlySummary(staffId, 2026, 4, punches);
    expect(summary.overtimeHours).toBeCloseTo(2, 1);
  });
});

// ─── Manual override RBAC tests ───────────────────────────────────────────────

describe('addAttendancePunch — manual override RBAC (L17)', () => {
  beforeEach(() => freshStore());

  it('R12 actor can submit manual override', () => {
    const punch: AttendancePunch = {
      punchId: 'test-override-r12',
      staffId: 'staff-r05-001',
      deviceId: 'manual-override',
      eventType: 'punch-in',
      timestamp: new Date().toISOString(),
      isOverride: true,
      overrideBy: 'staff-r12-001',
      overrideReason: 'Device offline — supervisor confirmed',
    };
    const result = useStaffStore.getState().addAttendancePunch(punch, { id: 'staff-r12-001', role: 'R12' });
    expect(result.success).toBe(true);
  });

  it('sub-R12 actor (R09) is rejected for override (L17)', () => {
    const punch: AttendancePunch = {
      punchId: 'test-override-r09',
      staffId: 'staff-r05-001',
      deviceId: 'manual-override',
      eventType: 'punch-in',
      timestamp: new Date().toISOString(),
      isOverride: true,
      overrideBy: 'staff-r09-001',
      overrideReason: 'R09 attempted override',
    };
    const result = useStaffStore.getState().addAttendancePunch(punch, { id: 'staff-r09-001', role: 'R09' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('R12');
  });

  it('regular (non-override) punch succeeds without actor', () => {
    const punch: AttendancePunch = {
      punchId: 'test-regular-punch',
      staffId: 'staff-r05-001',
      deviceId: 'device-blr-001',
      eventType: 'punch-in',
      timestamp: new Date().toISOString(),
      isOverride: false,
    };
    const result = useStaffStore.getState().addAttendancePunch(punch);
    expect(result.success).toBe(true);
  });

  it('punch is retrievable after addAttendancePunch', () => {
    const punch: AttendancePunch = {
      punchId: 'test-retrieve-punch',
      staffId: 'staff-r05-001',
      deviceId: 'device-blr-001',
      eventType: 'punch-out',
      timestamp: '2026-04-07T18:00:00.000Z',
      isOverride: false,
    };
    useStaffStore.getState().addAttendancePunch(punch);
    const punches = useStaffStore.getState().selectAttendancePunches('staff-r05-001', 2026, 4);
    const found = punches.find((p) => p.punchId === 'test-retrieve-punch');
    expect(found).toBeDefined();
    expect(found?.eventType).toBe('punch-out');
  });
});
