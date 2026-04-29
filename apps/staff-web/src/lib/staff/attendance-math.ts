/**
 * Attendance math helpers — SPEC-STAFF-001 §P3
 *
 * L30: Daily punch classification:
 *   - late: first punch-in > 09:30 AM local time
 *   - half-day: total hours worked < 4
 *   - present: all other days with punches
 *   - absent: working day with no valid punch-in
 *
 * L31: Both thresholds (09:30 + 4h) will be configurable via outlet settings (v1.5).
 *      Hardcoded here as constants for v1.
 *
 * L17: Webhook HMAC validation is in the route handler (apps/staff-web/app/api/webhooks/fingerprint/route.ts).
 */

import type { AttendancePunch, AttendanceMonthlySummary } from '@dms/types';

// ─── Constants (configurable in v1.5 per L31) ─────────────────────────────────

const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 30;
const HALF_DAY_THRESHOLD_HOURS = 4;
const STANDARD_WORKING_HOURS = 9;  // standard shift hours for OT calculation

// ─── Daily hours from punch records ──────────────────────────────────────────

/**
 * Given an array of AttendancePunch records for a single day, compute total
 * hours worked. Pairs punch-in + punch-out in order. Unpaired punches are ignored.
 */
export function computeDailyHours(punches: AttendancePunch[]): number {
  const ins = punches
    .filter((p) => p.eventType === 'punch-in')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const outs = punches
    .filter((p) => p.eventType === 'punch-out')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let totalMs = 0;
  const pairs = Math.min(ins.length, outs.length);
  for (let i = 0; i < pairs; i++) {
    const inTime = new Date(ins[i]!.timestamp).getTime();
    const outTime = new Date(outs[i]!.timestamp).getTime();
    if (outTime > inTime) {
      totalMs += outTime - inTime;
    }
  }
  return totalMs / (1000 * 60 * 60);
}

// ─── Day classification ───────────────────────────────────────────────────────

/**
 * Classify a single day based on punches.
 * L30: late = first punch-in after 09:30 AM; half-day = total hours < 4.
 * Returns 'absent' when no punch-in exists.
 */
export function classifyDay(
  punches: AttendancePunch[],
): 'present' | 'absent' | 'half-day' | 'late' {
  const inPunches = punches.filter((p) => p.eventType === 'punch-in');
  if (inPunches.length === 0) return 'absent';

  const sortedIns = inPunches.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const firstIn = new Date(sortedIns[0]!.timestamp);
  // Use UTC hours/minutes — timestamps are stored as ISO 8601 UTC (device clocks are UTC).
  // This ensures tests and the production route handler agree on the same wall-clock comparison.
  const hours = firstIn.getUTCHours();
  const minutes = firstIn.getUTCMinutes();
  const isLate =
    hours > LATE_THRESHOLD_HOUR ||
    (hours === LATE_THRESHOLD_HOUR && minutes > LATE_THRESHOLD_MINUTE);

  const totalHours = computeDailyHours(punches);
  if (totalHours < HALF_DAY_THRESHOLD_HOURS) return 'half-day';
  if (isLate) return 'late';
  return 'present';
}

// ─── Monthly summary ──────────────────────────────────────────────────────────

/**
 * Compute monthly attendance summary for a single staff member.
 * workingDays = Mon–Fri count for the month (simplified; no holiday calendar in v1).
 * OT hours = sum of (dailyHours - 9) for days where totalHours > 9.
 */
export function computeMonthlySummary(
  staffId: string,
  year: number,
  month: number,  // 1–12
  punches: AttendancePunch[],
): AttendanceMonthlySummary {
  // Build a map: dateKey (YYYY-MM-DD UTC) → punches
  // Use UTC date slicing — timestamps are stored as ISO 8601 UTC.
  const byDay = new Map<string, AttendancePunch[]>();
  for (const p of punches) {
    const d = p.timestamp.slice(0, 10);  // YYYY-MM-DD (UTC portion of ISO 8601)
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(p);
  }

  // Count Mon–Fri days in the month.
  // Use Date.UTC to get a consistent UTC-based day-of-week regardless of server timezone.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();  // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) workingDays++;
  }

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let lateMarks = 0;
  let overtimeHours = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (dow === 0 || dow === 6) continue;  // skip weekends

    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateKey = `${year}-${mm}-${dd}`;
    const dayPunches = byDay.get(dateKey) ?? [];

    const status = classifyDay(dayPunches);
    if (status === 'present' || status === 'late') {
      presentDays++;
      if (status === 'late') lateMarks++;
      const h = computeDailyHours(dayPunches);
      if (h > STANDARD_WORKING_HOURS) {
        overtimeHours += h - STANDARD_WORKING_HOURS;
      }
    } else if (status === 'half-day') {
      halfDays++;
    } else {
      absentDays++;
    }
  }

  return {
    staffId,
    year,
    month,
    workingDays,
    presentDays,
    absentDays,
    halfDays,
    lateMarks,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
  };
}
