/**
 * Reports — module-level constants.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3
 * L19: INSURANCE_ATTACH_WINDOW_DAYS = 7 (configurable)
 */

// L19: Insurance attach window — days after SOLD event to count insurance lead
export const INSURANCE_ATTACH_WINDOW_DAYS = 7;

// Seam 22 / §6.3: Service SLA target — median days for Job Card turnaround
export const SERVICE_SLA_TARGET_DAYS = 5;

// Staff utilisation — L15: 8h × working days × headcount
export const STANDARD_HOURS_PER_DAY = 8;

// Outlet IDs used in RBAC scope resolution (Doc 14 §RBAC)
export const OUTLET_IDS_ALL = ['BLR-01', 'MUM-01', 'CHE-01'] as const;

// Tech role codes for staff utilisation (L15)
export const TECH_ROLES = ['R11', 'R13'] as const;

// SA role codes for staff utilisation (L15)
export const SA_ROLES = ['R09', 'R10'] as const;
