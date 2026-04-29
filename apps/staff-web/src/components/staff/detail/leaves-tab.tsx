'use client';

/**
 * Leaves Tab — apply, approve, view balance & history.
 * Spec reference: SPEC-STAFF-001 P4.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Plus, X, ExternalLink } from 'lucide-react';
import type { StaffProfile, StaffRoleCode, LeaveType, LeaveApplication } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';

interface LeavesTabProps {
  staff: StaffProfile;
  viewer: { id: string; role: string };
}

const LEAVE_TYPES: { value: LeaveType; label: string; description: string }[] = [
  { value: 'CL', label: 'Casual', description: '12/yr' },
  { value: 'SL', label: 'Sick', description: '12/yr' },
  { value: 'EL', label: 'Earned', description: '21/yr' },
  { value: 'CompOff', label: 'Comp Off', description: 'Accrual' },
  { value: 'Maternity', label: 'Maternity', description: '26 weeks' },
  { value: 'Paternity', label: 'Paternity', description: '15 days' },
  { value: 'LWP', label: 'Loss of Pay', description: 'No deduction' },
];

const STATUS_STYLE: Record<LeaveApplication['status'], string> = {
  pending: 'bg-warning/15 text-warning border-warning/25',
  approved: 'bg-success/15 text-success border-success/25',
  rejected: 'bg-state-danger/15 text-state-danger border-state-danger/25',
  cancelled: 'bg-bg-subtle text-ink-muted border-line',
};

function countWorkingDays(from: string, to: string): number {
  const s = new Date(from);
  const e = new Date(to);
  if (e < s) return 0;
  let n = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) n += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Apply Leave dialog ──────────────────────────────────────────────────────

function ApplyLeaveDialog({
  staffId,
  actor,
  onClose,
  onApplied,
}: {
  staffId: string;
  actor: { id: string; role: StaffRoleCode };
  onClose: () => void;
  onApplied: () => void;
}) {
  const applyLeave = useStaffStore((s) => s.applyLeave);
  const [type, setType] = useState<LeaveType>('CL');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]!);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]!);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => countWorkingDays(fromDate, toDate), [fromDate, toDate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }
    const result = applyLeave(staffId, type, fromDate, toDate, reason.trim(), actor);
    if (!result.success) {
      setError(result.error ?? 'Failed to apply leave');
      return;
    }
    onApplied();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-bg-surface border border-line p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-ink-primary">Apply for Leave</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-bg-subtle rounded"
            aria-label="Close"
          >
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-[11px] text-ink-muted">Leave Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="h-9 px-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — {t.description}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
        </div>

        <div className="mt-3 p-3 rounded-md bg-accent/10 border border-accent/30">
          <p className="text-[11px] text-ink-muted">Working days (excludes weekends)</p>
          <p className="text-[18px] font-semibold text-accent tabular-nums">
            {days} day{days !== 1 ? 's' : ''}
          </p>
        </div>

        <label className="flex flex-col gap-1 mt-4">
          <span className="text-[11px] text-ink-muted">Reason</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Brief reason for the leave"
            className="px-3 py-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </label>

        {error && <p className="mt-3 text-[12px] text-state-danger">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 h-9 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent/90"
          >
            Submit Application
          </button>
        </div>
      </form>
    </div>
  );
}


// ─── Main ────────────────────────────────────────────────────────────────────

export function LeavesTab({ staff, viewer }: LeavesTabProps) {
  // Pull base state (stable refs); compute balance via useMemo to avoid the
  // infinite-render trap where `s.selectLeaveBalance(...)` would return a new
  // object every render. Same fix as visualizer L37 pattern.
  const allBalances = useStaffStore((s) => s.leaveBalances);
  const allLeaves = useStaffStore((s) => s.leaveApplications);
  const cancelLeave = useStaffStore((s) => s.cancelLeave);

  const balance = useMemo(() => {
    const existing = allBalances[staff.id];
    if (existing) return existing;
    // Default balance — stable across renders via useMemo
    const now = new Date();
    const fyStart =
      now.getMonth() >= 3
        ? `${now.getFullYear()}-04-01`
        : `${now.getFullYear() - 1}-04-01`;
    return {
      staffId: staff.id,
      fyStart,
      CL: { entitled: 12, used: 0 },
      SL: { entitled: 12, used: 0 },
      EL: { entitled: 21, used: 0, carriedForward: 0 },
      CompOff: { accrued: 0, used: 0 },
    };
  }, [allBalances, staff.id]);

  const leaves = useMemo(
    () =>
      Object.values(allLeaves)
        .filter((l) => l.staffId === staff.id)
        .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
    [allLeaves, staff.id],
  );

  const [applyOpen, setApplyOpen] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const isSelf = viewer.id === staff.id;
  const canApply = isSelf || hasRank(viewer.role as StaffRoleCode, 'R09');
  const canViewGlobal = hasRank(viewer.role as StaffRoleCode, 'R09');

  function bucketBar(used: number, total: number): React.ReactNode {
    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    return (
      <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden mt-1.5">
        <div
          className={`h-full rounded-full ${
            pct >= 80 ? 'bg-state-danger' : pct >= 50 ? 'bg-warning' : 'bg-accent'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  const cards = [
    {
      label: 'Casual',
      used: balance.CL.used,
      total: balance.CL.entitled,
      remaining: balance.CL.entitled - balance.CL.used,
    },
    {
      label: 'Sick',
      used: balance.SL.used,
      total: balance.SL.entitled,
      remaining: balance.SL.entitled - balance.SL.used,
    },
    {
      label: 'Earned',
      used: balance.EL.used,
      total: balance.EL.entitled + balance.EL.carriedForward,
      remaining: balance.EL.entitled + balance.EL.carriedForward - balance.EL.used,
    },
    {
      label: 'Comp Off',
      used: balance.CompOff.used,
      total: balance.CompOff.accrued,
      remaining: balance.CompOff.accrued - balance.CompOff.used,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* ── Header + Apply button ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-ink-primary">Leaves</h2>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {staff.name}&rsquo;s leave balance and applications for FY{' '}
            {balance.fyStart.slice(0, 4)}–
            {(parseInt(balance.fyStart.slice(0, 4), 10) + 1).toString().slice(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canViewGlobal && (
            <Link
              href="/staff/leaves"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] font-medium text-ink-primary hover:bg-bg-subtle transition-colors"
              title="Open the global leaves admin view"
            >
              <ExternalLink size={13} aria-hidden />
              Manage all leaves
            </Link>
          )}
          {canApply && (
            <button
              type="button"
              onClick={() => setApplyOpen(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors"
            >
              <Plus size={14} aria-hidden />
              Apply Leave
            </button>
          )}
        </div>
      </div>

      {/* ── Balance cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-line bg-bg-surface p-4"
          >
            <p className="text-[11px] uppercase tracking-wider text-ink-muted">
              {c.label}
            </p>
            <p className="text-[24px] font-bold text-ink-primary mt-1 tabular-nums">
              {c.remaining}
              <span className="text-[14px] font-normal text-ink-muted ml-1">
                / {c.total}
              </span>
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              {c.used} day{c.used !== 1 ? 's' : ''} used
            </p>
            {bucketBar(c.used, c.total)}
          </div>
        ))}
      </div>

      {/* ── Leave history ── */}
      <div>
        <h3 className="text-[14px] font-semibold text-ink-primary mb-3">
          Leave History ({leaves.length})
        </h3>
        {leaves.length === 0 ? (
          <div className="rounded-lg border border-line bg-bg-subtle p-6 text-center">
            <Calendar size={28} className="text-ink-muted mx-auto mb-2 opacity-50" aria-hidden />
            <p className="text-[13px] text-ink-muted">No leave applications yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-bg-surface overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-bg-subtle border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                    Type
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                    Period
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                    Days
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                    Reason
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                    Status
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => {
                  const days = countWorkingDays(l.fromDate, l.toDate);
                  return (
                    <tr key={l.leaveId} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 font-medium text-ink-primary">{l.type}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">
                        {formatDate(l.fromDate)} – {formatDate(l.toDate)}
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary tabular-nums">{days}</td>
                      <td className="px-4 py-2.5 text-ink-secondary truncate max-w-[200px]">
                        {l.reason}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                            STATUS_STYLE[l.status]
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isSelf && l.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => {
                              const r = cancelLeave(l.leaveId, {
                                id: viewer.id,
                                role: viewer.role as StaffRoleCode,
                              });
                              if (r.success) toast('Leave cancelled', 'success');
                              else toast(r.error ?? 'Cancel failed', 'error');
                            }}
                            className="text-[12px] text-state-danger hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {applyOpen && (
        <ApplyLeaveDialog
          staffId={staff.id}
          actor={{ id: viewer.id, role: viewer.role as StaffRoleCode }}
          onClose={() => setApplyOpen(false)}
          onApplied={() => toast('Leave application submitted', 'success')}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
