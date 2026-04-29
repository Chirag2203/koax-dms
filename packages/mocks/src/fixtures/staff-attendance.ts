/**
 * Mock attendance punch data — SPEC-STAFF-001 §P3, L15
 *
 * 3 months of attendance data (Feb, Mar, Apr 2026) for all 24 staff.
 * Mon–Fri ~9 AM punch-in / ~6 PM punch-out with realistic variation.
 * Occasional absences (~8% rate), late punches (~5%), and overtime (~10%).
 *
 * Device mapping:
 *   BLR staff → device-blr-001
 *   MUM staff → device-mum-001
 *   CHE staff → device-che-001
 *   all-outlet staff (R24 CEO, R02 Org Admin) → device-blr-001 (home base)
 */

import type { AttendancePunch } from '@dms/types';
import { MOCK_STAFF_PROFILES } from './staff-profiles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let punchSeq = 1;
function nextPunchId(): string {
  return `punch-${String(punchSeq++).padStart(6, '0')}`;
}

function toISO(year: number, month: number, day: number, hour: number, minute: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${year}-${mm}-${dd}T${hh}:${min}:00.000Z`;
}

function deviceForOutlet(outlet: string): string {
  if (outlet === 'mumbai') return 'device-mum-001';
  if (outlet === 'chennai') return 'device-che-001';
  return 'device-blr-001';  // bangalore + all
}

// Deterministic pseudo-random based on seed (to keep fixture stable)
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ─── Generate punches for a single staff member ───────────────────────────────

function generatePunchesForStaff(
  staffId: string,
  outlet: string,
  months: Array<{ year: number; month: number }>,
): AttendancePunch[] {
  const deviceId = deviceForOutlet(outlet);
  const punches: AttendancePunch[] = [];
  // Use staffId hash as seed base
  const seedBase = staffId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  for (const { year, month } of months) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let dayIdx = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();  // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) continue;  // skip weekends

      dayIdx++;
      const seed = seedBase + year * 1000 + month * 100 + dayIdx;
      const rand = seededRand(seed);

      // ~8% absence rate
      if (rand < 0.08) continue;

      // ~5% late days (punch-in 9:35–10:15)
      const isLate = rand > 0.93;
      // ~10% overtime (stay until 7–8 PM)
      const isOT = rand > 0.875 && rand <= 0.93;

      // Punch-in time: 8:45–9:25 (normal) or 9:35–10:15 (late)
      const seed2 = seededRand(seed + 1);
      let inHour: number;
      let inMin: number;
      if (isLate) {
        inHour = 9;
        inMin = 35 + Math.floor(seed2 * 40);  // 9:35–10:15
        if (inMin >= 60) { inHour = 10; inMin = inMin - 60; }
      } else {
        inHour = 8;
        inMin = 45 + Math.floor(seed2 * 40);  // 8:45–9:25
        if (inMin >= 60) { inHour = 9; inMin = inMin - 60; }
      }

      // Punch-out: 17:45–18:15 (normal) or 19:00–20:00 (OT)
      const seed3 = seededRand(seed + 2);
      let outHour: number;
      let outMin: number;
      if (isOT) {
        outHour = 19;
        outMin = Math.floor(seed3 * 60);
      } else {
        outHour = 17;
        outMin = 45 + Math.floor(seed3 * 30);
        if (outMin >= 60) { outHour = 18; outMin = outMin - 60; }
      }

      punches.push({
        punchId: nextPunchId(),
        staffId,
        deviceId,
        eventType: 'punch-in',
        timestamp: toISO(year, month, d, inHour, inMin),
        isOverride: false,
      });

      punches.push({
        punchId: nextPunchId(),
        staffId,
        deviceId,
        eventType: 'punch-out',
        timestamp: toISO(year, month, d, outHour, outMin),
        isOverride: false,
      });
    }
  }

  return punches;
}

// ─── Generate for all 24 staff, 3 months ─────────────────────────────────────

const ATTENDANCE_MONTHS = [
  { year: 2026, month: 2 },
  { year: 2026, month: 3 },
  { year: 2026, month: 4 },
];

export const MOCK_ATTENDANCE_PUNCHES: AttendancePunch[] = MOCK_STAFF_PROFILES.flatMap((staff) =>
  generatePunchesForStaff(staff.id, staff.outlet, ATTENDANCE_MONTHS),
);

/** Quick lookup: punches for a specific staffId */
export function getAttendancePunches(staffId: string): AttendancePunch[] {
  return MOCK_ATTENDANCE_PUNCHES.filter((p) => p.staffId === staffId);
}
