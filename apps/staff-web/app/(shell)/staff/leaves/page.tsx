'use client';

/**
 * /staff/leaves — Admin Leaves view
 * SPEC-STAFF-001 §8.6 — Leaves admin
 *
 * Scope toggle: mine (R09+) / outlet (R10+) / all-outlets (R02+)
 * Filter chips: type (CL/SL/EL/CompOff), status (pending/approved/rejected/cancelled), date range
 * Inline approve/reject: R09+ for own team; R10+ for outlet; R02+ cross-outlet
 * Reject requires reason (RejectDialog, min 10 chars per §8.6 AC)
 * Approval cascade: CompOff deducted from comp-off balance on approve
 * Stats strip: pending count, this-month approved, overdue (pending > 3 days), rejected
 * Cross-outlet view (R02+): shows outlet column, sortable
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  AlertCircle,
  Check,
  X,
  Search,
  Filter as FilterIcon,
  ChevronRight,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import type { StaffRoleCode, LeaveApplication, LeaveType } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';

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

// ─── Reject dialog (inline) ──────────────────────────────────────────────────

function RejectDialog({
  leaveId,
  onClose,
  actor,
  onRejected,
}: {
  leaveId: string;
  onClose: () => void;
  actor: { id: string; role: StaffRoleCode };
  onRejected: () => void;
}) {
  const rejectLeave = useStaffStore((s) => s.rejectLeave);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleReject() {
    if (!reason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    // §8.6 AC: reason must be at least 10 characters
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }
    const result = rejectLeave(leaveId, reason.trim(), actor);
    if (!result.success) {
      setError(result.error ?? 'Reject failed');
      return;
    }
    onRejected();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-bg-surface border border-line p-6">
        <h2 className="text-[16px] font-semibold text-ink-primary mb-3">Reject Leave</h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Reason for rejection (min 10 characters)"
          className="w-full px-3 py-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          aria-describedby="reject-reason-hint"
        />
        <p
          id="reject-reason-hint"
          className={`mt-1 text-[11px] ${reason.trim().length >= 10 ? 'text-success' : 'text-ink-muted'}`}
        >
          {reason.trim().length} / 10 characters minimum
        </p>
        {error && <p className="mt-1 text-[12px] text-state-danger">{error}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="px-4 h-9 text-sm font-medium rounded-md bg-state-danger text-white hover:bg-state-danger/90"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StaffLeavesPage() {
  const { user } = useStaffAuth();
  const allLeaves = useStaffStore((s) => s.leaveApplications);
  const allStaff = useStaffStore((s) => s.staffById);
  const approveLeave = useStaffStore((s) => s.approveLeave);
  const hydrated = useStaffStore((s) => s.hydrated);
  const { toasts, toast, dismiss } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | LeaveApplication['status']>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | LeaveType>('all');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'mine' | 'outlet' | 'all'>('mine');
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [outletSort, setOutletSort] = useState<'asc' | 'desc' | null>(null);

  const userRole = user?.role as StaffRoleCode | undefined;
  const userOutlet = user?.outlet;

  const visibleLeaves = useMemo(() => {
    if (!user || !userRole) return [];
    let leaves = Object.values(allLeaves);

    // Scope filter
    if (scope === 'mine') {
      // Leaves where viewer is the manager (own team)
      leaves = leaves.filter((l) => allStaff[l.staffId]?.reportsTo === user.id);
    } else if (scope === 'outlet') {
      if (!hasRank(userRole, 'R10')) return []; // R10+ for outlet view
      leaves = leaves.filter((l) => allStaff[l.staffId]?.outlet === userOutlet);
    } else {
      // 'all' — R02+ only
      if (!hasRank(userRole, 'R02')) return [];
    }

    // Status + type
    if (statusFilter !== 'all') leaves = leaves.filter((l) => l.status === statusFilter);
    if (typeFilter !== 'all') leaves = leaves.filter((l) => l.type === typeFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      leaves = leaves.filter((l) => {
        const subj = allStaff[l.staffId];
        return (
          subj?.name.toLowerCase().includes(q) ||
          l.staffId.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q)
        );
      });
    }

    // Outlet column sort (R02+ cross-outlet view only)
    if (scope === 'all' && outletSort) {
      leaves = [...leaves].sort((a, b) => {
        const outA = allStaff[a.staffId]?.outlet ?? '';
        const outB = allStaff[b.staffId]?.outlet ?? '';
        return outletSort === 'asc' ? outA.localeCompare(outB) : outB.localeCompare(outA);
      });
      return leaves;
    }

    return leaves.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  }, [allLeaves, allStaff, user, userRole, userOutlet, scope, statusFilter, typeFilter, search, outletSort]);

  // Stats for the top strip
  const stats = useMemo(() => {
    const all = Object.values(allLeaves);
    const inScope = all.filter((l) => {
      if (scope === 'mine') return allStaff[l.staffId]?.reportsTo === user?.id;
      if (scope === 'outlet') return allStaff[l.staffId]?.outlet === userOutlet;
      return true;
    });
    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    return {
      pending: inScope.filter((l) => l.status === 'pending').length,
      // Overdue: pending AND appliedAt > 3 days ago (§8.6 AC)
      overdue: inScope.filter(
        (l) => l.status === 'pending' && now - new Date(l.appliedAt).getTime() > THREE_DAYS_MS,
      ).length,
      // This-month approved
      approvedThisMonth: inScope.filter(
        (l) => l.status === 'approved' && new Date(l.appliedAt) >= thisMonthStart,
      ).length,
      rejected: inScope.filter((l) => l.status === 'rejected').length,
    };
  }, [allLeaves, allStaff, scope, user?.id, userOutlet]);

  // Auth guard
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ink-muted text-sm">Sign in required.</p>
      </div>
    );
  }

  if (!userRole || !hasRank(userRole, 'R09')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={28} className="text-warning" aria-hidden="true" />
        <p className="text-ink-muted text-sm">R09+ required to view leaves.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-surface="staff">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-6 py-3 border-b border-line text-[12px] text-ink-muted flex-shrink-0">
        <Link href="/staff" className="hover:text-accent transition-colors">
          Staff
        </Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span className="text-ink-primary">Leaves</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-ink-muted" aria-hidden="true" />
          <div>
            <h1 className="text-[20px] font-semibold text-ink-primary">Leaves</h1>
            <p className="text-[12px] text-ink-muted mt-0.5">
              Approvals, history, and balances across staff
            </p>
          </div>
        </div>

        {/* Scope toggle */}
        <div className="flex items-center bg-bg-subtle rounded-md p-0.5 border border-line">
          <button
            type="button"
            onClick={() => setScope('mine')}
            aria-pressed={scope === 'mine'}
            className={`px-3 h-7 rounded text-[12px] font-medium transition-colors ${
              scope === 'mine'
                ? 'bg-bg-surface text-ink-primary shadow-sm'
                : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            My team
          </button>
          {hasRank(userRole, 'R10') && (
            <button
              type="button"
              onClick={() => setScope('outlet')}
              aria-pressed={scope === 'outlet'}
              className={`px-3 h-7 rounded text-[12px] font-medium transition-colors ${
                scope === 'outlet'
                  ? 'bg-bg-surface text-ink-primary shadow-sm'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              Outlet
            </button>
          )}
          {hasRank(userRole, 'R02') && (
            <button
              type="button"
              onClick={() => setScope('all')}
              aria-pressed={scope === 'all'}
              className={`px-3 h-7 rounded text-[12px] font-medium transition-colors ${
                scope === 'all'
                  ? 'bg-bg-surface text-ink-primary shadow-sm'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              All outlets
            </button>
          )}
        </div>
      </div>

      {/* Stats strip — pending, overdue, this-month approved, rejected (§8.6) */}
      <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-line flex-shrink-0">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          aria-pressed={statusFilter === 'pending'}
          className={`text-left rounded-lg border p-3 transition-colors ${
            statusFilter === 'pending' ? 'border-accent bg-accent/5' : 'border-line bg-bg-surface hover:bg-bg-subtle'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Pending</p>
          <p className="text-[22px] font-bold tabular-nums text-warning">{stats.pending}</p>
        </button>

        {/* Overdue tile: pending > 3 days — non-interactive filter, just informational */}
        <div
          className={`text-left rounded-lg border p-3 ${
            stats.overdue > 0 ? 'border-state-danger/40 bg-state-danger/5' : 'border-line bg-bg-surface'
          }`}
          aria-label={`${stats.overdue} overdue pending requests`}
        >
          <div className="flex items-center gap-1 mb-1">
            <Clock size={10} className={stats.overdue > 0 ? 'text-state-danger' : 'text-ink-muted'} aria-hidden="true" />
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">Overdue</p>
          </div>
          <p className={`text-[22px] font-bold tabular-nums ${stats.overdue > 0 ? 'text-state-danger' : 'text-ink-muted'}`}>
            {stats.overdue}
          </p>
          <p className="text-[10px] text-ink-muted mt-0.5">Pending &gt; 3 days</p>
        </div>

        <div className="text-left rounded-lg border p-3 border-line bg-bg-surface">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Approved (month)</p>
          <p className="text-[22px] font-bold tabular-nums text-success">{stats.approvedThisMonth}</p>
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          aria-pressed={statusFilter === 'rejected'}
          className={`text-left rounded-lg border p-3 transition-colors ${
            statusFilter === 'rejected' ? 'border-accent bg-accent/5' : 'border-line bg-bg-surface hover:bg-bg-subtle'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Rejected</p>
          <p className="text-[22px] font-bold tabular-nums text-state-danger">{stats.rejected}</p>
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-line flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, staff ID, or reason…"
            className="w-full h-8 pl-8 pr-3 text-[13px] bg-bg-subtle border border-line rounded-md text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <FilterIcon size={12} className="text-ink-muted" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-8 w-32 px-2 rounded-md border border-line bg-bg-canvas text-[12px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="h-8 w-32 px-2 rounded-md border border-line bg-bg-canvas text-[12px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All types</option>
            <option value="CL">Casual (CL)</option>
            <option value="SL">Sick (SL)</option>
            <option value="EL">Earned (EL)</option>
            <option value="CompOff">Comp Off</option>
            <option value="Maternity">Maternity</option>
            <option value="Paternity">Paternity</option>
            <option value="LWP">LWP</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!hydrated ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-bg-subtle animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : visibleLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Calendar size={32} className="text-ink-muted opacity-40" aria-hidden="true" />
            <p className="text-[14px] text-ink-muted">No leaves match the current filters.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-bg-surface overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-bg-subtle border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                    Staff
                  </th>
                  {/* Outlet column — R02+ cross-outlet view, sortable (§8.6) */}
                  {scope === 'all' && (
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                      <button
                        type="button"
                        onClick={() =>
                          setOutletSort((s) => (s === 'asc' ? 'desc' : s === 'desc' ? null : 'asc'))
                        }
                        className="inline-flex items-center gap-1 hover:text-ink-primary transition-colors"
                        aria-label={`Sort by outlet — currently ${outletSort ?? 'unsorted'}`}
                      >
                        Outlet
                        <ArrowUpDown
                          size={10}
                          className={outletSort ? 'text-accent' : 'text-ink-muted'}
                          aria-hidden="true"
                        />
                      </button>
                    </th>
                  )}
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
                {visibleLeaves.map((l) => {
                  const subj = allStaff[l.staffId];
                  const days = countWorkingDays(l.fromDate, l.toDate);
                  return (
                    <tr key={l.leaveId} className="border-b border-line last:border-0 hover:bg-bg-subtle/50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/staff/${l.staffId}`}
                          className="text-ink-primary font-medium hover:underline"
                        >
                          {subj?.name ?? l.staffId}
                        </Link>
                        {subj && (
                          <p className="text-[11px] text-ink-muted capitalize mt-0.5">
                            {subj.role}
                          </p>
                        )}
                      </td>
                      {/* Outlet cell — cross-outlet view only */}
                      {scope === 'all' && (
                        <td className="px-4 py-2.5 capitalize text-ink-secondary text-[12px]">
                          {subj?.outlet ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-2.5 font-medium text-ink-primary">{l.type}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">
                        <span className="block">{formatDate(l.fromDate)}</span>
                        <span className="block text-[11px] text-ink-muted">
                          → {formatDate(l.toDate)}
                        </span>
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
                        {l.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const r = approveLeave(l.leaveId, {
                                  id: user.id,
                                  role: userRole,
                                });
                                if (r.success) toast('Leave approved', 'success');
                                else toast(r.error ?? 'Approve failed', 'error');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md bg-success text-white text-[11px] font-medium hover:bg-success/90"
                              title="Approve"
                            >
                              <Check size={11} aria-hidden="true" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectFor(l.leaveId)}
                              className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md border border-line bg-bg-surface text-[11px] font-medium text-ink-primary hover:bg-bg-subtle"
                              title="Reject"
                            >
                              <X size={11} aria-hidden="true" />
                              Reject
                            </button>
                          </div>
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

      {rejectFor && (
        <RejectDialog
          leaveId={rejectFor}
          actor={{ id: user.id, role: userRole }}
          onClose={() => setRejectFor(null)}
          onRejected={() => toast('Leave rejected', 'success')}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
