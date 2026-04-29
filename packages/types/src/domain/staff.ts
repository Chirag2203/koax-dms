import { z } from 'zod';
import { CityEnum } from './vehicle';

// ─── Role Codes (Doc 14 — 24 roles R01–R24) ───────────────────────────────────

export const StaffRoleCodeEnum = z.enum([
  'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20',
  'R21', 'R22', 'R23', 'R24',
]);
export type StaffRoleCode = z.infer<typeof StaffRoleCodeEnum>;

/**
 * Canonical role-id enum alias used by event schemas (L40).
 * `RoleIdEnum` === `StaffRoleCodeEnum`; exported separately so event schemas
 * can import a semantically-clear name without depending on the full Staff domain.
 */
export const RoleIdEnum = StaffRoleCodeEnum;
export type RoleId = StaffRoleCode;

// ─── Role rank helper (L4 / PLAN-VEHICLES-003 L7) ─────────────────────────────
// Mirrors vehicles state-machine.ts meetsMinRole pattern exactly.
// HIGHER number = MORE senior.  R24 CEO = rank 24 (most senior).
// R01 Super Admin is treated as equally senior to R24 (both are org-level admin).
// For simplicity: R01 = 24 (super admin has max rank), all others map by number.
// Used for all role-transition guards to avoid inline string comparisons.

const ROLE_RANK: Record<StaffRoleCode, number> = {
  R01: 24, // Super Admin — treated as maximum authority (co-equal to CEO)
  R02: 22, // Org Admin — near-top
  R03: 18, // Outlet Manager
  R04: 16, // Sales Manager
  R05: 5,  // Sales Executive
  R06: 6,  // Marketing Executive
  R07: 8,  // Marketing Manager
  R08: 16, // Workshop Manager
  R09: 7,  // Service Advisor
  R10: 12, // Master Technician
  R11: 4,  // Technician
  R12: 15, // Parts Manager
  R13: 6,  // Parts Counter
  R14: 16, // Body Shop Manager
  R15: 10, // Finance Executive
  R16: 18, // Finance Head
  R17: 8,  // HR Executive
  R18: 8,  // Accountant
  R19: 20, // General Manager
  R20: 10, // IT Admin
  R21: 4,  // Receptionist
  R22: 23, // CFO
  R23: 14, // DPO
  R24: 24, // CEO
};

/** Returns true when `role` meets or exceeds the authority of `minRole`.
 *  Mirrors vehicles module meetsMinRole: higher rank number = more authority.
 *  R24 CEO (rank 24) and R01 Super Admin (rank 24) are top authority. */
export function hasRank(role: StaffRoleCode, minRole: StaffRoleCode): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

// ─── Outlet (city-scoped or cross-outlet) ─────────────────────────────────────

export const StaffOutletEnum = z.union([CityEnum, z.literal('all')]);
export type StaffOutlet = z.infer<typeof StaffOutletEnum>;

// ─── Staff User (minimal shape — kept for auth provider compat) ───────────────

export const StaffUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  /** 2-letter initials for avatar display */
  avatar: z.string(),
  role: StaffRoleCodeEnum,
  /** Human-readable role name e.g. "Sales Manager" */
  roleName: z.string(),
  outlet: StaffOutletEnum,
  permissions: z.array(z.string()),
});
export type StaffUser = z.infer<typeof StaffUserSchema>;

// ─── Extended enums for StaffProfile ─────────────────────────────────────────

export const StaffStatusEnum = z.enum(['ACTIVE', 'ON_LEAVE', 'EXITED', 'ONBOARDING']);
export type StaffStatus = z.infer<typeof StaffStatusEnum>;

export const DepartmentEnum = z.enum([
  'SALES', 'SERVICE', 'PARTS', 'FINANCE', 'MARKETING', 'HR', 'OPERATIONS', 'MANAGEMENT',
]);
export type Department = z.infer<typeof DepartmentEnum>;

// ─── StaffProfile (SPEC-STAFF-001 §5.1) ──────────────────────────────────────
// StaffProfile is a superset of StaffUser. StaffUser is preserved for
// backwards-compat with staff-auth-provider (which re-exports it).

export const StaffProfileSchema = z.object({
  // Identity (superset of StaffUser)
  id: z.string(),               // staff-<role>-<seq>
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(), // masked at render unless R02+
  avatar: z.string(),           // 2-letter initials
  role: StaffRoleCodeEnum,
  roleName: z.string(),
  department: DepartmentEnum,
  outlet: StaffOutletEnum,
  status: StaffStatusEnum,
  reportsTo: z.string().nullable(),
  startDate: z.string().date(),
  exitDate: z.string().date().optional(),
  permissions: z.array(z.string()),
  // HR / PII — DPDP sensitive (Doc 06 §19, Doc 14 §28)
  aadhaarLast4: z.string().length(4).optional(),
  panMasked: z.string().optional(),
  bankAccountMasked: z.string().optional(),
  stateOfPosting: z.enum(['KA', 'MH', 'TN']),
  // Salary fields — P2; defined here so L18 selector contract is in place.
  // Visibility: self | R12+ (outlet) | R16+ (org) — selectStaffForViewer strips
  // these for sub-R12 callers (security contract, L18).
  salary: z.unknown().optional(),
  payslips: z.unknown().optional(),
  salaryHistory: z.unknown().optional(),
  bankDetails: z.unknown().optional(),
  // Onboarding
  dpdpConsentGiven: z.boolean().default(false),
  dpdpConsentAt: z.string().datetime().optional(),
  hrConsentGivenAt: z.string().datetime().optional(),
  fingerprintEnrolled: z.boolean().default(false),
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  schemaVersion: z.literal('v1').default('v1'),
});
export type StaffProfile = z.infer<typeof StaffProfileSchema>;

// ─── RoleAuditEvent (SPEC-STAFF-001 §5.6) ────────────────────────────────────

export const RoleAuditEventKindEnum = z.enum([
  'ROLE_CHANGED', 'PERMISSION_ADDED', 'PERMISSION_REMOVED', 'REPORTS_TO_CHANGED',
]);
export type RoleAuditEventKind = z.infer<typeof RoleAuditEventKindEnum>;

export const RoleAuditEventSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  at: z.string().datetime(),
  kind: RoleAuditEventKindEnum,
  actorId: z.string(),
  actorRole: StaffRoleCodeEnum,
  payload: z.record(z.unknown()),
  reason: z.string().min(5),
  schemaVersion: z.literal('v1').default('v1'),
});
export type RoleAuditEvent = z.infer<typeof RoleAuditEventSchema>;

// ─── StaffRoleTransition ──────────────────────────────────────────────────────

export const StaffRoleTransitionSchema = z.object({
  staffId: z.string(),
  fromRole: StaffRoleCodeEnum,
  toRole: StaffRoleCodeEnum,
  reason: z.string().min(5),
  actorId: z.string(),
  actorRole: StaffRoleCodeEnum,
  at: z.string().datetime(),
});
export type StaffRoleTransition = z.infer<typeof StaffRoleTransitionSchema>;

// ─── Command Palette ──────────────────────────────────────────────────────────

export const CommandPaletteItemSchema = z.object({
  id: z.string(),
  type: z.enum(['vehicle', 'customer', 'job-card', 'invoice', 'deal', 'action']),
  label: z.string(),
  hint: z.string().optional(),
  category: z.string(),
  shortcut: z.string().optional(),
  href: z.string().optional(),
});
export type CommandPaletteItem = z.infer<typeof CommandPaletteItemSchema>;

// ─── Staff Notifications ──────────────────────────────────────────────────────

export const StaffNotificationTypeEnum = z.enum([
  'inventory', 'sales', 'service', 'finance', 'parts', 'system',
]);
export type StaffNotificationType = z.infer<typeof StaffNotificationTypeEnum>;

export const StaffNotificationSchema = z.object({
  id: z.string(),
  type: StaffNotificationTypeEnum,
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
  href: z.string().optional(),
});
export type StaffNotification = z.infer<typeof StaffNotificationSchema>;

// ─── Vehicle Listing Status (Staff-specific extended set) ─────────────────────

export const VehicleListingStatusEnum = z.enum([
  'draft', 'in-review', 'published', 'reserved', 'sold', 'unpublished', 'archived',
]);
export type VehicleListingStatus = z.infer<typeof VehicleListingStatusEnum>;

// ─── Leaves (SPEC-STAFF-001 §P4) ─────────────────────────────────────────────
// L32: Leave types per Doc 06: CL 12, SL 12, EL 21. Maternity 26wk per MBA 2017.
// L33: Approval: R10+ own team (reportsTo === approver.id); R12+ cross-outlet.

export const LeaveTypeEnum = z.enum([
  'CL',        // Casual leave (12/yr)
  'SL',        // Sick leave (12/yr)
  'EL',        // Earned leave (21/yr)
  'CompOff',   // Comp off (accrual)
  'Maternity', // 26 weeks (Maternity Benefit Act 2017)
  'Paternity', // 15 days
  'LWP',       // Leave without pay
]);
export type LeaveType = z.infer<typeof LeaveTypeEnum>;

export const LeaveStatusEnum = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export type LeaveStatus = z.infer<typeof LeaveStatusEnum>;

export const LeaveApplicationSchema = z.object({
  leaveId: z.string(),
  staffId: z.string(),
  type: LeaveTypeEnum,
  fromDate: z.string().date(),
  toDate: z.string().date(),
  reason: z.string().min(1),
  status: LeaveStatusEnum,
  appliedAt: z.string().datetime(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
  /** CompOff — the date that earned the comp-off */
  compOffEarnedFromDate: z.string().date().optional(),
});
export type LeaveApplication = z.infer<typeof LeaveApplicationSchema>;

export const LeaveBalanceSchema = z.object({
  staffId: z.string(),
  fyStart: z.string().date(), // e.g. 2026-04-01
  CL: z.object({ entitled: z.number(), used: z.number() }),
  SL: z.object({ entitled: z.number(), used: z.number() }),
  EL: z.object({ entitled: z.number(), used: z.number(), carriedForward: z.number() }),
  CompOff: z.object({ accrued: z.number(), used: z.number() }),
});
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const DashboardStatSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  deltaType: z.enum(['up', 'down', 'neutral']).optional(),
  subtitle: z.string().optional(),
});
export type DashboardStat = z.infer<typeof DashboardStatSchema>;

// ─── P2: SalaryStructure (SPEC-STAFF-001 §P2) ────────────────────────────────
// Append-only; `salaryHistory` on StaffProfile holds the log.
// L22: DA is a first-class field (required for gratuity + EL encashment).
// L29: R22+ gate at store level; append-only history; emits 'salary-change' to profileAuditLog.

export const SalaryStructureSchema = z.object({
  basic: z.number().nonnegative(),
  hra: z.number().nonnegative(),
  specialAllowance: z.number().nonnegative(),
  conveyance: z.number().nonnegative().default(0),
  medical: z.number().nonnegative().default(0),
  performanceBonus: z.number().nonnegative().default(0),
  /** DA — first-class field per L22. Required for gratuity formula (L11/L20). */
  da: z.number().nonnegative().default(0),
  effectiveFrom: z.string().date(),
  approvedBy: z.string(),   // staff id of approver (R22+)
  approvedAt: z.string().datetime(),
  reason: z.string().optional(),
});
export type SalaryStructure = z.infer<typeof SalaryStructureSchema>;

export const BankDetailsSchema = z.object({
  accountHolderName: z.string(),
  accountNumberMasked: z.string(),  // last-4 only displayed (L6)
  ifsc: z.string(),
  bankName: z.string(),
  branch: z.string().optional(),
});
export type BankDetails = z.infer<typeof BankDetailsSchema>;

// ─── P3: Attendance (SPEC-STAFF-001 §P3, L17) ────────────────────────────────
// L17: Fingerprint webhook uses HMAC-SHA256 + ±5min replay + ±60s dedup.
// L30: daily classification — late if punch-in > 9:30 AM; half-day if hours < 4.

export const AttendancePunchSchema = z.object({
  punchId: z.string(),
  staffId: z.string(),
  deviceId: z.string(),
  eventType: z.enum(['punch-in', 'punch-out']),
  timestamp: z.string().datetime(),
  isOverride: z.boolean().default(false),
  overrideBy: z.string().optional(),   // staff id of approver (R12+)
  overrideReason: z.string().optional(),
});
export type AttendancePunch = z.infer<typeof AttendancePunchSchema>;

export const AttendanceMonthlySummarySchema = z.object({
  staffId: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  workingDays: z.number().int(),
  presentDays: z.number().int(),
  absentDays: z.number().int(),
  halfDays: z.number().int(),
  lateMarks: z.number().int(),
  overtimeHours: z.number().nonnegative(),
});
export type AttendanceMonthlySummary = z.infer<typeof AttendanceMonthlySummarySchema>;
