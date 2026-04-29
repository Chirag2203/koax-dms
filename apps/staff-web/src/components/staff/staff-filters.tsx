'use client';

/**
 * StaffFilters — inline filter bar for staff directory.
 * SPEC-STAFF-001 §8.1
 *
 * Styling matches sales/inventory filter rhythm:
 *   h-8, rounded-md border border-line bg-bg-canvas px-2.5 text-xs text-ink-primary
 *   gap-3 between filters; w-40 for each dropdown; search flex-grow max-w-sm
 * Mobile: stacks vertically below md breakpoint.
 */
import type { Department, StaffStatus, StaffRoleCode } from '@dms/types';
import { cn } from '@dms/ui';

export interface StaffFilterValues {
  outlet: string;
  role: string;
  department: string;
  status: string;
  search: string;
}

interface StaffFiltersProps {
  values: StaffFilterValues;
  onChange: (v: StaffFilterValues) => void;
  showOutletFilter: boolean;
}

const OUTLETS = [
  { value: 'bangalore', label: 'Bangalore (BLR)' },
  { value: 'mumbai', label: 'Mumbai (MUM)' },
  { value: 'chennai', label: 'Chennai (CHE)' },
];

const DEPARTMENTS: Department[] = [
  'SALES', 'SERVICE', 'PARTS', 'FINANCE', 'MARKETING', 'HR', 'OPERATIONS', 'MANAGEMENT',
];

const STATUSES: { value: StaffStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'EXITED', label: 'Exited' },
  { value: 'ONBOARDING', label: 'Onboarding' },
];

const ROLES: StaffRoleCode[] = [
  'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20',
  'R21', 'R22', 'R23', 'R24',
];

const ROLE_NAMES: Record<StaffRoleCode, string> = {
  R01: 'Super Admin', R02: 'Org Admin', R03: 'Outlet Manager', R04: 'Sales Manager',
  R05: 'Sales Executive', R06: 'Marketing Exec', R07: 'Marketing Manager',
  R08: 'Workshop Manager', R09: 'Service Advisor', R10: 'Master Technician',
  R11: 'Technician', R12: 'Parts Manager', R13: 'Parts Counter',
  R14: 'Body Shop Manager', R15: 'Finance Executive', R16: 'Finance Head',
  R17: 'HR Executive', R18: 'Accountant', R19: 'General Manager',
  R20: 'IT Admin', R21: 'Receptionist', R22: 'CFO', R23: 'DPO', R24: 'CEO',
};

// Select styling matches sales page: h-8 rounded-md border-line bg-bg-canvas text-xs
const selectClass = cn(
  'h-8 w-40 rounded-md border border-line bg-bg-canvas px-2.5',
  'text-xs text-ink-primary',
  'focus:outline-none focus:ring-2 focus:ring-accent/50',
  'shrink-0',
);

export function StaffFilters({ values, onChange, showOutletFilter }: StaffFiltersProps) {
  function update(key: keyof StaffFilterValues, val: string) {
    onChange({ ...values, [key]: val });
  }

  return (
    /* gap-3 between filters; flex-wrap so it stacks on mobile below md */
    <div className="flex flex-wrap items-center gap-3">
      {showOutletFilter && (
        <select
          value={values.outlet}
          onChange={(e) => update('outlet', e.target.value)}
          aria-label="Filter by outlet"
          className={selectClass}
        >
          <option value="">All Outlets</option>
          {OUTLETS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      <select
        value={values.role}
        onChange={(e) => update('role', e.target.value)}
        aria-label="Filter by role"
        className={selectClass}
      >
        <option value="">All Roles</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>{r} — {ROLE_NAMES[r]}</option>
        ))}
      </select>

      <select
        value={values.department}
        onChange={(e) => update('department', e.target.value)}
        aria-label="Filter by department"
        className={selectClass}
      >
        <option value="">All Departments</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
        ))}
      </select>

      <select
        value={values.status}
        onChange={(e) => update('status', e.target.value)}
        aria-label="Filter by status"
        className={selectClass}
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
