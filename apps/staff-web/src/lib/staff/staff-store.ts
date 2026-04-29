/**
 * Staff store — Zustand + immer.
 * SPEC-STAFF-001 P1: directory, role transitions, audit trail.
 *
 * P2+ fields (salary/payslip/attendance) are intentionally absent.
 * The selectStaffForViewer selector strips those fields for sub-R12
 * callers even now, so the security contract (L18) is in place for P2.
 *
 * L25: Profile audit trail is its own event log on StaffStore
 *      (append-only, R09+ readable, anonymization at 7yr post-exit per Doc 06).
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  StaffProfile,
  StaffRoleCode,
  RoleAuditEvent,
  SalaryStructure,
  AttendancePunch,
  LeaveApplication,
  LeaveBalance,
  LeaveType,
} from '@dms/types';
import { hasRank } from '@dms/types';
import {
  MOCK_STAFF_PROFILES,
  MOCK_ATTENDANCE_PUNCHES,
  MOCK_SALARY_STRUCTURES,
  MOCK_LEAVE_BALANCES,
  MOCK_LEAVE_APPLICATIONS,
} from '@dms/mocks/fixtures';
import { computePayslip, type PayslipData } from './payroll-math';

// ─── FIXME: OQ-ROLE-1 — pending Doc 14 verification ─────────────────────────
// Role transition approver rules are best-guess per SPEC-STAFF-001 §6.2.
// Do NOT rely on these for production role governance until Doc 14 §X.Y is confirmed.
// See open question OQ-ROLE-1 in spec §18.

/** Returns the minimum actor role required for a role transition. */
function requiredActorRole(toRole: StaffRoleCode): StaffRoleCode {
  // FIXME: OQ-ROLE-1 — pending Doc 14 verification
  const managerTier: StaffRoleCode[] = ['R03', 'R04', 'R08', 'R10', 'R12', 'R14', 'R16'];
  const adminTier: StaffRoleCode[] = ['R01', 'R02'];
  const complianceTier: StaffRoleCode[] = ['R23'];
  if (complianceTier.includes(toRole) || adminTier.includes(toRole)) return 'R01';
  if (managerTier.includes(toRole)) return 'R02';
  return 'R03';
}

// ─── StaffProfileAuditEvent (SPEC-STAFF-001 §17 — L25) ───────────────────────
// Append-only event log on StaffStore.
// Readable by R09+ (per L25). Anonymized at 7yr post-exit per Doc 06 §17.

export type StaffProfileAuditEventKind =
  | 'role-transition'
  | 'salary-change'
  | 'leave-applied'
  | 'leave-approved'
  | 'leave-rejected'
  | 'leave-cancelled'
  | 'profile-updated'
  | 'dpdp-consent-given'
  | 'exit-initiated'
  | 'exit-cancelled'
  | 'fnf-finalized'
  | 'onboarded'
  /** L12 / L23 — 7-year post-exit PII anonymization (Doc 06 §17, DPDP) */
  | 'staff-anonymized';

// ─── Exit state (SPEC-STAFF-001 S8, L11, L19, L23) ───────────────────────────

export type ExitReason = 'resignation' | 'termination' | 'retirement' | 'other';
export type ExitStatus = 'INITIATED' | 'FNF_FINALIZED';

export interface FnFPayload {
  /** Pro-rated salary for days worked in exit month (L23) */
  proRatedSalary: number;
  /** EL encashment on exit (L19) */
  elEncashment: number;
  /** Gratuity (L11) */
  gratuity: number;
  /** Whether gratuity was capped at ₹20L per PoG Amendment 2018 */
  gratuityCapped: boolean;
  /** Total deductions */
  deductionsTotal: number;
  /** Advance recovery */
  advanceDeduction: number;
  /** Notice period shortfall in days × daily rate */
  noticeShortfall: number;
  /** Asset loss / damage recovery */
  assetLoss: number;
  /** Other deductions */
  otherDeduction: number;
  /** Net payable after deductions */
  netPayable: number;
}

export interface StaffExitState {
  status: ExitStatus;
  initiatedAt: string;       // ISO datetime
  initiatedBy: string;       // actor staffId
  lastWorkingDay: string;    // ISO date
  reason: ExitReason;
  noticePeriodDays: number;  // computed at initiation
  noticePeriodWaived: boolean;
  waiverReason?: string;
  /** Set when status transitions to FNF_FINALIZED */
  fnfFinalizedAt?: string;
  fnfFinalizedBy?: string;
  fnf?: FnFPayload;
  /** 7 years from lastWorkingDay per Doc 06 §17, DPDP */
  anonymizationScheduledFor: string;
  /** Set by anonymization sweep when PII has been replaced (L12, L23) */
  anonymizedAt?: string;
  /** Actor who ran the anonymization sweep */
  anonymizedBy?: string;
}

export interface StaffProfileAuditEvent {
  id: string;
  staffId: string;
  kind: StaffProfileAuditEventKind;
  actorId: string;
  at: string;              // ISO 8601 datetime
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason?: string;
  schemaVersion: 'v1';
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface StaffState {
  /** Profiles indexed by staffId */
  staffById: Record<string, StaffProfile>;
  /** Ordered list of IDs for display */
  staffIds: string[];
  /** Audit trail for role changes (RoleAuditEvent — roles tab) */
  roleAuditLog: RoleAuditEvent[];
  /**
   * Profile audit trail — L25.
   * Append-only log of all profile changes.
   * Readable by R09+; anonymized at 7yr post-exit (Doc 06 §17).
   */
  profileAuditLog: StaffProfileAuditEvent[];
  /** Whether the store has been seeded from fixtures */
  hydrated: boolean;
  /**
   * P3: Attendance punch records indexed by staffId.
   * Populated by fingerprint webhook (L17) and manual overrides (R12+ gate).
   */
  attendancePunches: Record<string, AttendancePunch[]>;
  /**
   * P3: Per-device HMAC secrets for webhook auth (L17).
   * Keyed by deviceId. Stored as { current: string; previous?: string; rotatedAt?: string }
   * to support 24-hour grace period during secret rotation.
   */
  deviceSecrets: Record<string, { current: string; previous?: string; rotatedAt?: string }>;
  /**
   * P4: Leave applications indexed by leaveId.
   */
  leaveApplications: Record<string, LeaveApplication>;
  /** Ordered array of leaveIds for iteration */
  leaveIds: string[];
  /**
   * P4: Leave balances indexed by staffId.
   * One balance record per staff member per financial year.
   */
  leaveBalances: Record<string, LeaveBalance>;
  /**
   * S8: Exit states indexed by staffId.
   * Keyed by staffId; null means no exit initiated.
   */
  exitStates: Record<string, StaffExitState>;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface StaffActions {
  /** Load profiles from fixture (called by hydrator) */
  hydrate: (profiles: StaffProfile[]) => void;
  /** Select all staff (unfiltered) */
  selectStaff: () => StaffProfile[];
  /** Select a single staff by ID */
  selectStaffById: (id: string) => StaffProfile | undefined;
  /**
   * Select staff visible to the given viewer role (L18 RLS).
   * Strips salary / payslip / bankDetails / salaryHistory / bankAccountMasked
   * for callers with role below R12. Even in P1 (no salary data), the contract
   * must hold so P2 doesn't regress.
   */
  selectStaffForViewer: (viewerRole: StaffRoleCode) => StaffProfile[];
  /**
   * Select profile audit log for a specific staff member.
   * Readable by R09+ (L25). Returns empty array for unauthorized callers.
   */
  selectProfileAuditLog: (
    staffId: string,
    viewerRole: StaffRoleCode,
    viewerIsSelf: boolean,
  ) => StaffProfileAuditEvent[];
  /**
   * Transition a staff member's role.
   * Enforces hasRank guard per spec §6.2 (best-guess, OQ-ROLE-1).
   * Emits a RoleAuditEvent into roleAuditLog.
   * Also emits a StaffProfileAuditEvent into profileAuditLog (L25).
   */
  transitionRole: (
    staffId: string,
    newRole: StaffRoleCode,
    reason: string,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string; event?: RoleAuditEvent };
  /** Add a staff profile (onboarding wizard). Emits 'onboarded' to profileAuditLog. */
  addStaff: (profile: StaffProfile) => void;
  /**
   * Update a staff profile field (edit-in-place from profile tab).
   * Emits 'profile-updated' to profileAuditLog (L25).
   * PII field changes (phone, email) require R12+ viewer (per spec §8.2 R12+).
   */
  updateStaffProfile: (
    staffId: string,
    patch: Partial<Pick<StaffProfile, 'name' | 'phone' | 'email'>>,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };
  /**
   * Update reportsTo field for org chart re-org.
   * R02+ only (L13). Emits REPORTS_TO_CHANGED to roleAuditLog + profileAuditLog.
   */
  updateReportsTo: (
    staffId: string,
    newManagerId: string | null,
    reason: string,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };
  /**
   * P2: Update salary structure for a staff member.
   * R22+ gate (L29). Appends to salaryHistory. Updates currentSalary.
   * Emits 'salary-change' to profileAuditLog (L25).
   */
  updateSalary: (
    staffId: string,
    newStructure: SalaryStructure,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };
  /**
   * P2: Compute a payslip for a staff member for a given month/year.
   * Pure — returns PayslipData without mutating store state.
   * Returns null if no current salary is set.
   */
  selectPayslip: (staffId: string, month: number, year: number) => PayslipData | null;
  /**
   * P3: Add an attendance punch (from webhook handler or manual override).
   * Manual overrides require R12+ gate.
   */
  addAttendancePunch: (
    punch: AttendancePunch,
    actor?: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };
  /**
   * P3: Select attendance punches for a staff member, optionally filtered by year/month.
   */
  selectAttendancePunches: (
    staffId: string,
    year?: number,
    month?: number,
  ) => AttendancePunch[];
  /**
   * P4 Leaves: apply for a leave (creates a pending application).
   * Emits 'leave-applied' to profileAuditLog.
   */
  applyLeave: (
    staffId: string,
    type: LeaveApplication['type'],
    fromDate: string,
    toDate: string,
    reason: string,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string; leave?: LeaveApplication };
  /**
   * P4 Leaves: approve a pending leave (R10+ for own team, R12+ cross-outlet).
   * Deducts from balance + emits 'leave-approved'.
   */
  approveLeave: (
    leaveId: string,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };
  /**
   * P4 Leaves: reject a pending leave (R10+).
   */
  rejectLeave: (
    leaveId: string,
    rejectionReason: string,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };
  /**
   * P4 Leaves: cancel own pending leave.
   */
  cancelLeave: (
    leaveId: string,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };
  /** Select all leaves for a staff member (sorted desc by appliedAt). */
  selectLeavesForStaff: (staffId: string) => LeaveApplication[];
  /** Select leave balance for a staff member (creates default if missing). */
  selectLeaveBalance: (staffId: string) => LeaveBalance;
  /** Select pending leaves where the actor is the approver (for own team). */
  selectPendingLeavesForApprover: (approverId: string) => LeaveApplication[];

  // ─── S8: Exit workflow ──────────────────────────────────────────────────────

  /**
   * Initiate an exit workflow for a staff member.
   * R12+ gate. Throws if exit already initiated.
   * Computes notice period, schedules anonymization (L23: 7yr from LWD).
   * Emits 'exit-initiated' to profileAuditLog.
   */
  initiateExit: (
    staffId: string,
    payload: {
      lastWorkingDay: string;
      reason: ExitReason;
      noticePeriodWaived?: boolean;
      waiverReason?: string;
    },
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };

  /**
   * Cancel an in-progress exit (status must be INITIATED).
   * R12+ gate. Emits 'exit-cancelled' to profileAuditLog.
   */
  cancelExit: (
    staffId: string,
    reason: string,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };

  /**
   * Finalize the F&F sheet. Sets status to FNF_FINALIZED.
   * R16+ gate. Emits 'fnf-finalized' to profileAuditLog.
   */
  finalizeFnF: (
    staffId: string,
    fnfPayload: FnFPayload,
    actor: { id: string; role: StaffRoleCode },
  ) => { success: boolean; error?: string };

  /**
   * Pure selector — returns exit state for a staff member, or null.
   */
  selectExitState: (staffId: string) => StaffExitState | null;
}

export type StaffStore = StaffState & StaffActions;

// ─── Salary RLS helper (L18) ──────────────────────────────────────────────────
// Strips salary-related fields for sub-R12 callers.
// IMPORTANT: even though P1 profiles have no salary data, the selector must
// strip any future P2 fields for sub-R12. Vitest test required (SPEC §17).

function stripSalaryFields(profile: StaffProfile): StaffProfile {
  const stripped = { ...profile };
  delete stripped.salary;
  delete stripped.payslips;
  delete stripped.salaryHistory;
  delete stripped.bankDetails;
  delete stripped.bankAccountMasked;
  return stripped;
}

// ─── Audit event builder ──────────────────────────────────────────────────────

function makeProfileAuditEvent(
  staffId: string,
  kind: StaffProfileAuditEventKind,
  actorId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  reason?: string,
): StaffProfileAuditEvent {
  return {
    id: `pae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    staffId,
    kind,
    actorId,
    at: new Date().toISOString(),
    before,
    after,
    reason,
    schemaVersion: 'v1',
  };
}

// ─── Org chart cycle detection (L26) ─────────────────────────────────────────
// DFS to detect if setting staffId.reportsTo = newManagerId would create a cycle.

function wouldCreateCycle(
  staffId: string,
  newManagerId: string,
  staffById: Record<string, StaffProfile>,
): boolean {
  if (staffId === newManagerId) return true;
  let current: string | null = newManagerId;
  const visited = new Set<string>();
  while (current !== null) {
    if (visited.has(current)) return true; // pre-existing cycle
    if (current === staffId) return true;  // would form a cycle
    visited.add(current);
    const p: StaffProfile | undefined = staffById[current];
    current = p?.reportsTo ?? null;
  }
  return false;
}

// ─── Store ────────────────────────────────────────────────────────────────────

function buildInitialState(): StaffState {
  return {
    staffById: {},
    staffIds: [],
    roleAuditLog: [],
    profileAuditLog: [],
    hydrated: false,
    attendancePunches: {},
    deviceSecrets: {
      // Default demo device secret for mock fingerprint device
      'device-blr-001': { current: 'demo-secret-blr-001' },
      'device-mum-001': { current: 'demo-secret-mum-001' },
      'device-che-001': { current: 'demo-secret-che-001' },
    },
    leaveApplications: {},
    leaveIds: [],
    leaveBalances: {},
    exitStates: {},
  };
}

export const useStaffStore = create<StaffStore>()(
  immer((set, get) => ({
    ...buildInitialState(),

    hydrate(profiles) {
      set((state) => {
        state.staffById = {};
        state.staffIds = [];
        for (const p of profiles) {
          // Attach mock salary if available (P2 demo data)
          const salaryStructure = MOCK_SALARY_STRUCTURES[p.id];
          const profileWithSalary = salaryStructure
            ? {
                ...p,
                currentSalary: salaryStructure,
                salaryHistory: [salaryStructure],
              }
            : p;
          state.staffById[p.id] = profileWithSalary;
          state.staffIds.push(p.id);
        }
        state.hydrated = true;

        // Seed attendance punch data (P3 demo data)
        state.attendancePunches = {};
        for (const punch of MOCK_ATTENDANCE_PUNCHES) {
          if (!state.attendancePunches[punch.staffId]) {
            state.attendancePunches[punch.staffId] = [];
          }
          state.attendancePunches[punch.staffId]!.push(punch);
        }

        // Seed leave balances + applications (demo data)
        state.leaveBalances = {};
        for (const [staffId, balance] of Object.entries(MOCK_LEAVE_BALANCES)) {
          state.leaveBalances[staffId] = balance as LeaveBalance;
        }
        state.leaveApplications = {};
        state.leaveIds = [];
        for (const leave of MOCK_LEAVE_APPLICATIONS) {
          state.leaveApplications[leave.leaveId] = leave;
          state.leaveIds.push(leave.leaveId);
        }
      });
    },

    selectStaff() {
      const { staffById, staffIds } = get();
      return staffIds.map((id) => staffById[id]).filter(Boolean) as StaffProfile[];
    },

    selectStaffById(id) {
      return get().staffById[id];
    },

    selectStaffForViewer(viewerRole) {
      const { staffById, staffIds } = get();
      const all = staffIds.map((id) => staffById[id]).filter(Boolean) as StaffProfile[];
      // R12+ can see salary fields; below R12 — strip them (L18)
      if (hasRank(viewerRole, 'R12')) {
        return all;
      }
      return all.map(stripSalaryFields);
    },

    selectProfileAuditLog(staffId, viewerRole, viewerIsSelf) {
      // L25: R09+ readable; self always can see own
      if (!viewerIsSelf && !hasRank(viewerRole, 'R09')) return [];
      return get().profileAuditLog.filter((e) => e.staffId === staffId);
    },

    transitionRole(staffId, newRole, reason, actor) {
      const staff = get().staffById[staffId];
      if (!staff) {
        return { success: false, error: 'Staff member not found.' };
      }
      if (reason.trim().length < 5) {
        return { success: false, error: 'Reason must be at least 5 characters.' };
      }

      // FIXME: OQ-ROLE-1 — pending Doc 14 verification
      const minActorRole = requiredActorRole(newRole);
      if (!hasRank(actor.role, minActorRole)) {
        return {
          success: false,
          error: `Role ${minActorRole} or higher required to assign ${newRole}.`,
        };
      }

      const event: RoleAuditEvent = {
        id: `rae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        staffId,
        at: new Date().toISOString(),
        kind: 'ROLE_CHANGED',
        actorId: actor.id,
        actorRole: actor.role,
        payload: { fromRole: staff.role, toRole: newRole },
        reason: reason.trim(),
        schemaVersion: 'v1',
      };

      const profileEvent = makeProfileAuditEvent(
        staffId,
        'role-transition',
        actor.id,
        { role: staff.role },
        { role: newRole },
        reason.trim(),
      );

      set((state) => {
        const target = state.staffById[staffId];
        if (target) {
          target.role = newRole;
          target.updatedAt = event.at;
        }
        state.roleAuditLog.push(event);
        state.profileAuditLog.push(profileEvent);
      });

      return { success: true, event };
    },

    addStaff(profile) {
      const profileEvent = makeProfileAuditEvent(
        profile.id,
        'onboarded',
        profile.id, // self-actor for onboarding
        {},
        { status: 'ONBOARDING', role: profile.role, outlet: profile.outlet },
      );
      set((state) => {
        state.staffById[profile.id] = profile;
        state.staffIds.push(profile.id);
        state.profileAuditLog.push(profileEvent);
      });
    },

    updateStaffProfile(staffId, patch, actor) {
      const staff = get().staffById[staffId];
      if (!staff) return { success: false, error: 'Staff member not found.' };

      // PII fields (phone, email) require R12+ or self (spec §8.2 R12+)
      const isSelf = actor.id === staffId;
      if ((patch.phone !== undefined || patch.email !== undefined) && !isSelf && !hasRank(actor.role, 'R12')) {
        return { success: false, error: 'R12+ authority required to edit phone or email fields.' };
      }

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(patch)) {
        before[key] = (staff as Record<string, unknown>)[key];
        after[key] = val;
      }

      const profileEvent = makeProfileAuditEvent(
        staffId,
        'profile-updated',
        actor.id,
        before,
        after,
      );

      set((state) => {
        const target = state.staffById[staffId];
        if (target) {
          Object.assign(target, patch);
          target.updatedAt = profileEvent.at;
        }
        state.profileAuditLog.push(profileEvent);
      });

      return { success: true };
    },

    updateReportsTo(staffId, newManagerId, reason, actor) {
      if (!hasRank(actor.role, 'R02')) {
        return { success: false, error: 'Org Admin (R02) authority required to re-org.' };
      }
      if (reason.trim().length < 5) {
        return { success: false, error: 'Reason must be at least 5 characters.' };
      }

      const staff = get().staffById[staffId];
      if (!staff) return { success: false, error: 'Staff member not found.' };

      // L26: Cycle detection
      if (newManagerId && wouldCreateCycle(staffId, newManagerId, get().staffById)) {
        return {
          success: false,
          error: 'Cannot set this manager — would create a reporting cycle.',
        };
      }

      const oldManagerId = staff.reportsTo;
      const now = new Date().toISOString();

      const roleEvent: RoleAuditEvent = {
        id: `rae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        staffId,
        at: now,
        kind: 'REPORTS_TO_CHANGED',
        actorId: actor.id,
        actorRole: actor.role,
        payload: { oldManagerId, newManagerId },
        reason: reason.trim(),
        schemaVersion: 'v1',
      };

      const profileEvent = makeProfileAuditEvent(
        staffId,
        'profile-updated',
        actor.id,
        { reportsTo: oldManagerId },
        { reportsTo: newManagerId },
        reason.trim(),
      );

      set((state) => {
        const target = state.staffById[staffId];
        if (target) {
          target.reportsTo = newManagerId;
          target.updatedAt = now;
        }
        state.roleAuditLog.push(roleEvent);
        state.profileAuditLog.push(profileEvent);
      });

      return { success: true };
    },

    // ─── P2: Salary actions ─────────────────────────────────────────────────

    updateSalary(staffId, newStructure, actor) {
      // L29: R22+ gate for salary edits
      if (!hasRank(actor.role, 'R22')) {
        return { success: false, error: 'CFO (R22) authority required to update salary structures.' };
      }

      const staff = get().staffById[staffId];
      if (!staff) return { success: false, error: 'Staff member not found.' };

      const previousSalary = (staff as { currentSalary?: SalaryStructure }).currentSalary;

      const profileEvent = makeProfileAuditEvent(
        staffId,
        'salary-change',
        actor.id,
        previousSalary ? { basic: previousSalary.basic, gross: 'previous' } : {},
        { basic: newStructure.basic, effectiveFrom: newStructure.effectiveFrom },
        newStructure.reason,
      );

      set((state) => {
        const target = state.staffById[staffId] as Record<string, unknown> & StaffProfile;
        if (target) {
          // Append to salaryHistory (append-only, L29)
          const existingHistory = (target.salaryHistory as SalaryStructure[] | undefined) ?? [];
          target.salaryHistory = [...existingHistory, newStructure];
          // Update currentSalary to latest entry
          (target as Record<string, unknown>).currentSalary = newStructure;
          target.updatedAt = profileEvent.at;
        }
        state.profileAuditLog.push(profileEvent);
      });

      return { success: true };
    },

    selectPayslip(staffId, month, year) {
      const staff = get().staffById[staffId] as (StaffProfile & { currentSalary?: SalaryStructure }) | undefined;
      if (!staff) return null;
      const salary = staff.currentSalary;
      if (!salary) return null;
      return computePayslip(staffId, salary, staff.stateOfPosting, month, year);
    },

    // ─── P3: Attendance actions ─────────────────────────────────────────────

    addAttendancePunch(punch, actor) {
      // Manual overrides require R12+
      if (punch.isOverride && actor && !hasRank(actor.role, 'R12')) {
        return { success: false, error: 'Parts Manager (R12) authority required for manual punch override.' };
      }

      set((state) => {
        if (!state.attendancePunches[punch.staffId]) {
          state.attendancePunches[punch.staffId] = [];
        }
        state.attendancePunches[punch.staffId]!.push(punch);
      });

      return { success: true };
    },

    selectAttendancePunches(staffId, year, month) {
      const all = get().attendancePunches[staffId] ?? [];
      if (year === undefined && month === undefined) return all;
      return all.filter((p) => {
        const d = new Date(p.timestamp);
        if (year !== undefined && d.getFullYear() !== year) return false;
        if (month !== undefined && d.getMonth() + 1 !== month) return false;
        return true;
      });
    },

    // ─── P4 Leaves ─────────────────────────────────────────────────────────

    applyLeave(staffId, type, fromDate, toDate, reason, actor) {
      const reqDays = countWorkingDays(fromDate, toDate);
      if (reqDays < 1) return { success: false, error: 'Date range invalid' };

      // Self-only or R09+ for own team
      const isSelf = actor.id === staffId;
      if (!isSelf && !hasRank(actor.role, 'R09')) {
        return { success: false, error: 'Only the staff member or R09+ can apply leave' };
      }

      // Balance check (LWP/Maternity/Paternity skip the deduct)
      if (type === 'CL' || type === 'SL' || type === 'EL' || type === 'CompOff') {
        const bal = get().selectLeaveBalance(staffId);
        let available = 0;
        if (type === 'CL') available = bal.CL.entitled - bal.CL.used;
        else if (type === 'SL') available = bal.SL.entitled - bal.SL.used;
        else if (type === 'EL')
          available = bal.EL.entitled + bal.EL.carriedForward - bal.EL.used;
        else if (type === 'CompOff') available = bal.CompOff.accrued - bal.CompOff.used;
        if (reqDays > available) {
          return {
            success: false,
            error: `Insufficient ${type} balance — ${available} day(s) available, ${reqDays} requested`,
          };
        }
      }

      const leaveId = `leave-${staffId}-${Date.now()}`;
      const leave: LeaveApplication = {
        leaveId,
        staffId,
        type,
        fromDate,
        toDate,
        reason,
        status: 'pending',
        appliedAt: new Date().toISOString(),
      };

      set((state) => {
        state.leaveApplications[leaveId] = leave;
        state.leaveIds.unshift(leaveId);
        state.profileAuditLog.push(
          makeProfileAuditEvent(
            staffId,
            'leave-applied',
            actor.id,
            {},
            { type, fromDate, toDate, reqDays },
            reason,
          ),
        );
      });

      return { success: true, leave };
    },

    approveLeave(leaveId, actor) {
      const leave = get().leaveApplications[leaveId];
      if (!leave) return { success: false, error: 'Leave not found' };
      if (leave.status !== 'pending') {
        return { success: false, error: `Leave is already ${leave.status}` };
      }
      const subject = get().staffById[leave.staffId];
      if (!subject) return { success: false, error: 'Staff not found' };

      // Approver must be the reportsTo (R10+) OR R12+ for cross-team
      const isManager = subject.reportsTo === actor.id && hasRank(actor.role, 'R10');
      const isCrossTeam = hasRank(actor.role, 'R12');
      if (!isManager && !isCrossTeam) {
        return {
          success: false,
          error: 'Only direct manager (R10+) or R12+ can approve',
        };
      }

      const days = countWorkingDays(leave.fromDate, leave.toDate);
      const at = new Date().toISOString();

      set((state) => {
        const l = state.leaveApplications[leaveId];
        if (!l) return;
        l.status = 'approved';
        l.approvedBy = actor.id;
        l.approvedAt = at;

        // Deduct from balance
        const bal = state.leaveBalances[leave.staffId];
        if (bal && (leave.type === 'CL' || leave.type === 'SL' || leave.type === 'EL' || leave.type === 'CompOff')) {
          if (leave.type === 'CompOff') {
            bal.CompOff.used += days;
          } else {
            bal[leave.type as 'CL' | 'SL' | 'EL'].used += days;
          }
        }

        state.profileAuditLog.push(
          makeProfileAuditEvent(
            leave.staffId,
            'leave-approved',
            actor.id,
            { status: 'pending' },
            { status: 'approved', days },
          ),
        );
      });

      return { success: true };
    },

    rejectLeave(leaveId, rejectionReason, actor) {
      const leave = get().leaveApplications[leaveId];
      if (!leave) return { success: false, error: 'Leave not found' };
      if (leave.status !== 'pending') {
        return { success: false, error: `Leave is already ${leave.status}` };
      }
      const subject = get().staffById[leave.staffId];
      const isManager = subject?.reportsTo === actor.id && hasRank(actor.role, 'R10');
      const isCrossTeam = hasRank(actor.role, 'R12');
      if (!isManager && !isCrossTeam) {
        return { success: false, error: 'Only direct manager (R10+) or R12+ can reject' };
      }

      set((state) => {
        const l = state.leaveApplications[leaveId];
        if (!l) return;
        l.status = 'rejected';
        l.rejectionReason = rejectionReason;
        l.approvedBy = actor.id;
        l.approvedAt = new Date().toISOString();

        state.profileAuditLog.push(
          makeProfileAuditEvent(
            leave.staffId,
            'leave-rejected',
            actor.id,
            { status: 'pending' },
            { status: 'rejected' },
            rejectionReason,
          ),
        );
      });

      return { success: true };
    },

    cancelLeave(leaveId, actor) {
      const leave = get().leaveApplications[leaveId];
      if (!leave) return { success: false, error: 'Leave not found' };
      if (leave.status !== 'pending') {
        return { success: false, error: `Cannot cancel a ${leave.status} leave` };
      }
      if (leave.staffId !== actor.id) {
        return { success: false, error: 'Can only cancel your own pending leaves' };
      }

      set((state) => {
        const l = state.leaveApplications[leaveId];
        if (l) l.status = 'cancelled';
      });

      return { success: true };
    },

    selectLeavesForStaff(staffId) {
      return Object.values(get().leaveApplications)
        .filter((l) => l.staffId === staffId)
        .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
    },

    selectLeaveBalance(staffId) {
      const existing = get().leaveBalances[staffId];
      if (existing) return existing;
      // Return default balance (Apr 1 — Mar 31 FY)
      const now = new Date();
      const fyStart =
        now.getMonth() >= 3
          ? `${now.getFullYear()}-04-01`
          : `${now.getFullYear() - 1}-04-01`;
      return {
        staffId,
        fyStart,
        CL: { entitled: 12, used: 0 },
        SL: { entitled: 12, used: 0 },
        EL: { entitled: 21, used: 0, carriedForward: 0 },
        CompOff: { accrued: 0, used: 0 },
      };
    },

    selectPendingLeavesForApprover(approverId) {
      const allLeaves = Object.values(get().leaveApplications).filter(
        (l) => l.status === 'pending',
      );
      const allStaff = get().staffById;
      return allLeaves
        .filter((l) => allStaff[l.staffId]?.reportsTo === approverId)
        .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
    },

    // ─── S8: Exit workflow ──────────────────────────────────────────────

    initiateExit(staffId, payload, actor) {
      if (!hasRank(actor.role, 'R12')) {
        return { success: false, error: 'Parts Manager (R12) authority required to initiate exit.' };
      }
      const staff = get().staffById[staffId];
      if (!staff) return { success: false, error: 'Staff member not found.' };

      const existing = get().exitStates[staffId];
      if (existing) {
        return { success: false, error: 'Exit workflow already initiated for this staff member.' };
      }

      const today = new Date().toISOString().split('T')[0]!;
      if (payload.lastWorkingDay < today) {
        return { success: false, error: 'Last working day must be today or a future date.' };
      }

      // Compute notice period: days between today and LWD
      const lwdDate = new Date(payload.lastWorkingDay);
      const todayDate = new Date(today);
      const msPerDay = 24 * 60 * 60 * 1000;
      const noticePeriodDays = Math.max(0, Math.round((lwdDate.getTime() - todayDate.getTime()) / msPerDay));

      // 7-year anonymization timer per Doc 06 §17, L23
      const anonDate = new Date(payload.lastWorkingDay);
      anonDate.setFullYear(anonDate.getFullYear() + 7);

      const now = new Date().toISOString();
      const exitState: StaffExitState = {
        status: 'INITIATED',
        initiatedAt: now,
        initiatedBy: actor.id,
        lastWorkingDay: payload.lastWorkingDay,
        reason: payload.reason,
        noticePeriodDays,
        noticePeriodWaived: payload.noticePeriodWaived ?? false,
        waiverReason: payload.waiverReason,
        anonymizationScheduledFor: anonDate.toISOString().split('T')[0]!,
      };

      const profileEvent = makeProfileAuditEvent(
        staffId,
        'exit-initiated',
        actor.id,
        { status: staff.status },
        {
          exitStatus: 'INITIATED',
          lastWorkingDay: payload.lastWorkingDay,
          reason: payload.reason,
          noticePeriodDays,
        },
        `Exit initiated — LWD: ${payload.lastWorkingDay}`,
      );

      set((state) => {
        state.exitStates[staffId] = exitState;
        state.profileAuditLog.push(profileEvent);
      });

      return { success: true };
    },

    cancelExit(staffId, reason, actor) {
      if (!hasRank(actor.role, 'R12')) {
        return { success: false, error: 'Parts Manager (R12) authority required to cancel exit.' };
      }
      const exitState = get().exitStates[staffId];
      if (!exitState) {
        return { success: false, error: 'No active exit workflow found for this staff member.' };
      }
      if (exitState.status !== 'INITIATED') {
        return { success: false, error: `Cannot cancel exit — current status is ${exitState.status}.` };
      }
      if (reason.trim().length < 5) {
        return { success: false, error: 'Cancellation reason must be at least 5 characters.' };
      }

      const profileEvent = makeProfileAuditEvent(
        staffId,
        'exit-cancelled',
        actor.id,
        { exitStatus: 'INITIATED', lastWorkingDay: exitState.lastWorkingDay },
        { exitStatus: null },
        reason.trim(),
      );

      set((state) => {
        delete state.exitStates[staffId];
        state.profileAuditLog.push(profileEvent);
      });

      return { success: true };
    },

    finalizeFnF(staffId, fnfPayload, actor) {
      if (!hasRank(actor.role, 'R16')) {
        return { success: false, error: 'Finance Controller (R16) authority required to finalize F&F.' };
      }
      const exitState = get().exitStates[staffId];
      if (!exitState) {
        return { success: false, error: 'No active exit workflow found for this staff member.' };
      }
      if (exitState.status === 'FNF_FINALIZED') {
        return { success: false, error: 'F&F has already been finalized.' };
      }

      const now = new Date().toISOString();

      const profileEvent = makeProfileAuditEvent(
        staffId,
        'fnf-finalized',
        actor.id,
        { exitStatus: exitState.status },
        {
          exitStatus: 'FNF_FINALIZED',
          netPayable: fnfPayload.netPayable,
          fnfFinalizedAt: now,
        },
        `F&F finalized — net payable: ₹${fnfPayload.netPayable.toLocaleString('en-IN')}`,
      );

      set((state) => {
        const es = state.exitStates[staffId];
        if (es) {
          es.status = 'FNF_FINALIZED';
          es.fnfFinalizedAt = now;
          es.fnfFinalizedBy = actor.id;
          es.fnf = fnfPayload;
        }
        state.profileAuditLog.push(profileEvent);
      });

      return { success: true };
    },

    selectExitState(staffId) {
      return get().exitStates[staffId] ?? null;
    },
  })),
);

// Helper: count working days between fromDate and toDate (inclusive, Mon-Fri)
function countWorkingDays(fromDate: string, toDate: string): number {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ─── Hydrator — call this once at app shell ───────────────────────────────────
// Seeded from the canonical fixture. Client components call useStaffStore() directly.

export function hydrateStaffStore() {
  useStaffStore.getState().hydrate(MOCK_STAFF_PROFILES);
}
