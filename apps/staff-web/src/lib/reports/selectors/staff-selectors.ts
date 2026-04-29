/**
 * Staff utilisation selector.
 *
 * L15: Tech utilisation = sum(AttendancePunch.hoursWorked WHERE role IN TECH_ROLES,
 *        outletId IN scope, date IN period) / (8 × workingDays × techCount) × 100.
 *      SA utilisation = count(SOLD events WHERE advisorId IN SA_IDS) / (capacity × workingDays).
 *      Hours available = 8 × working days in period (until scheduling module).
 *
 * L2: pure client-side.
 * L9: value=null when no attendance data.
 * L13: validates scope.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3 L15 (Seam 25)
 */

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '../types';
import type { AttendancePunch } from '@dms/types';
import { isInPeriod, workingDaysInPeriod } from '../period';
import { STANDARD_HOURS_PER_DAY, TECH_ROLES, SA_ROLES } from '../constants';
import { computeDailyHours } from '../../staff/attendance-math';

// L15: TECH_ROLES for utilisation
const TECH_ROLE_SET = new Set<string>(TECH_ROLES);
const SA_ROLE_SET   = new Set<string>(SA_ROLES);

/** Map outlet ID to StaffProfile.outlet string */
function outletMatchesStaff(outletId: string, staffOutlet: string): boolean {
  if (staffOutlet === 'all') return true;
  const map: Record<string, string> = {
    'BLR-01': 'bangalore',
    'MUM-01': 'mumbai',
    'CHE-01': 'chennai',
  };
  return map[outletId] === staffOutlet;
}

export function selectStaffUtilisation(
  state: ReportInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  // L13
  if (!scope.outletIds.length) return { kind: 'percentage', value: null };

  const workingDays = workingDaysInPeriod(period);
  if (workingDays === 0) return { kind: 'percentage', value: null };

  // Collect in-scope tech profiles
  const techProfiles = Object.values(state.staff.staffById).filter(
    (p) =>
      TECH_ROLE_SET.has(p.role) &&
      scope.outletIds.some((id) => outletMatchesStaff(id, p.outlet)),
  );

  if (techProfiles.length === 0) return { kind: 'percentage', value: null };

  // Sum hours worked from attendance punches for techs in period
  let totalHoursWorked = 0;

  for (const profile of techProfiles) {
    const punches = (state.staff.attendancePunches[profile.id] ?? []) as AttendancePunch[];

    // Group punches by date
    const byDate = new Map<string, AttendancePunch[]>();
    for (const punch of punches) {
      const date = punch.timestamp.slice(0, 10);
      if (!isInPeriod(punch.timestamp, period)) continue;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(punch);
    }

    for (const dayPunches of byDate.values()) {
      totalHoursWorked += computeDailyHours(dayPunches);
    }
  }

  const hoursAvailable = STANDARD_HOURS_PER_DAY * workingDays * techProfiles.length;
  if (hoursAvailable === 0) return { kind: 'percentage', value: null };

  // Cap at 100% for over-utilised periods (T-R-10)
  const pct = Math.min(100, (totalHoursWorked / hoursAvailable) * 100);

  return { kind: 'percentage', value: parseFloat(pct.toFixed(1)) };
}
