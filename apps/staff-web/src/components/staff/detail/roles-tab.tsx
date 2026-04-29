'use client';

/**
 * Roles & Permissions tab — SPEC-STAFF-001 §8.2 Roles tab
 * Shows current role, permissions matrix, role history, and change-role dialog.
 *
 * Role transition state machine per spec §6.2.
 * FIXME: OQ-ROLE-1 — approver chain is best-guess pending Doc 14 verification.
 */
import { useState } from 'react';
import type { StaffProfile, StaffRoleCode, RoleAuditEvent } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';

interface RolesTabProps {
  staff: StaffProfile;
  viewer: { role: string; id: string; name?: string };
  staffId: string;
}

const ROLE_NAMES: Record<StaffRoleCode, string> = {
  R01: 'Super Admin', R02: 'Org Admin', R03: 'Outlet Manager', R04: 'Sales Manager',
  R05: 'Sales Executive', R06: 'Marketing Exec', R07: 'Marketing Manager',
  R08: 'Workshop Manager', R09: 'Service Advisor', R10: 'Master Technician',
  R11: 'Technician', R12: 'Parts Manager', R13: 'Parts Counter',
  R14: 'Body Shop Manager', R15: 'Finance Executive', R16: 'Finance Head',
  R17: 'HR Executive', R18: 'Accountant', R19: 'General Manager',
  R20: 'IT Admin', R21: 'Receptionist', R22: 'CFO', R23: 'DPO', R24: 'CEO',
};

const ALL_ROLES: StaffRoleCode[] = [
  'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20',
  'R21', 'R22', 'R23', 'R24',
];

// Permission domain groups for the matrix display
const PERMISSION_DOMAINS = [
  { domain: 'inventory', label: 'Inventory' },
  { domain: 'sales', label: 'Sales' },
  { domain: 'service', label: 'Service' },
  { domain: 'parts', label: 'Parts' },
  { domain: 'finance', label: 'Finance' },
  { domain: 'reports', label: 'Reports' },
  { domain: 'customers', label: 'Customers' },
  { domain: 'staff', label: 'Staff' },
];

export function RolesTab({ staff, viewer, staffId }: RolesTabProps) {
  const viewerRole = viewer.role as StaffRoleCode;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRoleCode>(staff.role);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const transitionRole = useStaffStore((s) => s.transitionRole);
  const roleAuditLog = useStaffStore((s) => s.roleAuditLog);

  // Filter audit events for this staff member
  const staffAuditHistory = roleAuditLog.filter((e) => e.staffId === staffId);

  // Can the viewer change roles? R03+ for lateral, R02+ for manager tier
  // FIXME: OQ-ROLE-1 — pending Doc 14 verification
  const canChangeRole = hasRank(viewerRole, 'R03');

  const currentStaff = useStaffStore((s) => s.selectStaffById(staffId));
  const displayStaff = currentStaff ?? staff;

  function handleSubmit() {
    setError(null);
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }
    const result = transitionRole(staffId, selectedRole, reason, {
      id: viewer.id,
      role: viewerRole,
    });
    if (result.success) {
      setSuccessMsg('Role updated successfully.');
      setDialogOpen(false);
      setReason('');
    } else {
      setError(result.error ?? 'Role change failed.');
    }
  }

  const hasWildcard = displayStaff.permissions.includes('*');

  return (
    <div className="py-6 px-6">
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-success/10 text-success text-[13px] border border-success/20" role="status">
          {successMsg}
        </div>
      )}

      {/* ─── Current Role Card ─────────────────────────────────────── */}
      <div className="mb-6 p-4 rounded-xl bg-bg-surface border border-line">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink-muted mb-1">Current Role</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] text-accent bg-accent/10 px-2 py-0.5 rounded">
                {displayStaff.role}
              </span>
              <span className="text-[16px] font-semibold text-ink-primary">
                {ROLE_NAMES[displayStaff.role] ?? displayStaff.roleName}
              </span>
            </div>
            <p className="text-[12px] text-ink-muted mt-1">
              Outlet: {displayStaff.outlet === 'all' ? 'All Outlets' : displayStaff.outlet}
            </p>
          </div>
          {canChangeRole && (
            <button
              type="button"
              onClick={() => {
                setSelectedRole(displayStaff.role);
                setReason('');
                setError(null);
                setSuccessMsg(null);
                setDialogOpen(true);
              }}
              className="px-3 h-8 text-[12px] font-medium bg-accent text-white rounded-md hover:bg-accent/90 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Change Role
            </button>
          )}
        </div>
      </div>

      {/* ─── Permissions Matrix ────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
          Permissions
        </h2>
        {hasWildcard ? (
          <p className="text-[13px] text-ink-secondary bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
            All permissions granted (wildcard)
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PERMISSION_DOMAINS.map(({ domain, label }) => {
              const granted = displayStaff.permissions.some((p) => p.startsWith(domain));
              return (
                <div
                  key={domain}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border ${
                    granted
                      ? 'bg-success/5 border-success/20 text-success'
                      : 'bg-bg-subtle border-line text-ink-muted'
                  }`}
                  aria-label={`${label}: ${granted ? 'granted' : 'not granted'}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${granted ? 'bg-success' : 'bg-ink-muted'}`}
                    aria-hidden="true"
                  />
                  {label}
                </div>
              );
            })}
          </div>
        )}

        {/* Raw permissions list */}
        {!hasWildcard && displayStaff.permissions.length > 0 && (
          <details className="mt-3">
            <summary className="text-[11px] text-ink-muted cursor-pointer hover:text-ink-secondary">
              View all {displayStaff.permissions.length} permission strings
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayStaff.permissions.map((p) => (
                <span
                  key={p}
                  className="font-mono text-[10px] bg-bg-subtle text-ink-muted px-2 py-0.5 rounded border border-line"
                >
                  {p}
                </span>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ─── Role History ──────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
          Role History
        </h2>
        {staffAuditHistory.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No role changes recorded.</p>
        ) : (
          <ol className="space-y-3" aria-label="Role change history">
            {staffAuditHistory.map((event) => (
              <RoleHistoryItem key={event.id} event={event} />
            ))}
          </ol>
        )}
      </div>

      {/* ─── Change Role Dialog ────────────────────────────────────── */}
      {dialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-role-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-bg-surface border border-line rounded-xl shadow-3 w-full max-w-md mx-4 p-6">
            <h2 id="change-role-title" className="text-[16px] font-semibold text-ink-primary mb-4">
              Change Staff Role
            </h2>
            <p className="text-[13px] text-ink-muted mb-4">
              Changing role for: <strong className="text-ink-primary">{displayStaff.name}</strong>
            </p>

            <div className="mb-4">
              <label htmlFor="new-role-select" className="block text-[12px] text-ink-muted mb-1.5">
                New Role
              </label>
              <select
                id="new-role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as StaffRoleCode)}
                className="w-full h-9 px-3 text-[13px] bg-bg-subtle border border-line rounded-md text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r} — {ROLE_NAMES[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="role-change-reason" className="block text-[12px] text-ink-muted mb-1.5">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                id="role-change-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for role change (min 10 characters)..."
                className="w-full px-3 py-2 text-[13px] bg-bg-subtle border border-line rounded-md text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                {reason.trim().length}/10 minimum characters
              </p>
            </div>

            {error && (
              <p className="mb-3 text-[12px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <p className="text-[11px] text-ink-muted mb-4">
              {/* FIXME: OQ-ROLE-1 — approver chain pending Doc 14 verification */}
              Note: Role transition guards are best-guess pending Doc 14 verification (OQ-ROLE-1).
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setError(null);
                }}
                className="px-4 h-8 text-[13px] text-ink-secondary hover:text-ink-primary border border-line rounded-md transition-colors duration-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 h-8 text-[13px] font-medium bg-accent text-white rounded-md hover:bg-accent/90 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleHistoryItem({ event }: { event: RoleAuditEvent }) {
  const payload = event.payload as { fromRole?: string; toRole?: string };
  return (
    <li className="flex items-start gap-3 p-3 rounded-lg bg-bg-subtle border border-line">
      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent mt-1.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink-primary">
          {payload.fromRole && payload.toRole
            ? `${payload.fromRole} → ${payload.toRole}`
            : event.kind.replace('_', ' ')}
        </p>
        <p className="text-[12px] text-ink-muted mt-0.5">
          {event.reason}
        </p>
        <p className="text-[11px] text-ink-muted mt-0.5">
          by <span className="font-medium">{event.actorId}</span>
          {' '}·{' '}
          {new Date(event.at).toLocaleDateString('en-IN')}
        </p>
      </div>
    </li>
  );
}
