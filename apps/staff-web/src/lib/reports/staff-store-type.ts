/**
 * Minimal StaffStore type for reports selectors.
 *
 * The staff store is defined inline in staff-store.ts with no named export.
 * We define a minimal read-only shape here for reports use.
 * Spec reference: SPEC-REPORTS-001 Seam 25
 */

import type { StaffProfile, AttendancePunch, SalaryStructure } from '@dms/types';

// Minimal shape — reports selectors read staffById and attendancePunches
export interface StaffStore {
  staffById:          Record<string, StaffProfile>;
  staffIds:           string[];
  attendancePunches:  Record<string, AttendancePunch[]>;
  hydrated:           boolean;
}

// Re-export SalaryStructure for use in selectors
export type { SalaryStructure };
