'use client';

/**
 * Exit Tab — SPEC-STAFF-001 S8.
 *
 * States:
 *   - No exit:      Empty state + "Initiate Exit" button (R12+)
 *   - INITIATED:    Details card + countdown + "Finalize F&F" (R16+) + "Cancel Exit" (R12+)
 *   - FNF_FINALIZED: F&F breakdown cards + PDF stub button
 *
 * Anonymization scheduled date shown as footnote throughout.
 */

import { useState, useMemo } from 'react';
import { LogOut, AlertCircle, FileText, Download } from 'lucide-react';
import type { StaffProfile, StaffRoleCode, SalaryStructure } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { InitiateExitDialog } from '@/src/components/staff/dialogs/initiate-exit-dialog';
import { FnFFinalizeDialog } from '@/src/components/staff/dialogs/fnf-finalize-dialog';

interface ExitTabProps {
  staff: StaffProfile;
  viewer: { id: string; role: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

// ─── Card primitive ──────────────────────────────────────────────────────────

function Card({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

// ─── Cancel Exit confirmation ─────────────────────────────────────────────────

function CancelExitDialog({
  staffName,
  actor,
  onCancel,
  onConfirm,
}: {
  staffName: string;
  actor: { id: string; role: StaffRoleCode };
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.');
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-exit-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-bg-surface border border-line p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle size={20} className="text-warning flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 id="cancel-exit-title" className="text-sm font-semibold text-ink-primary">
              Cancel Exit Workflow
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Cancelling the exit for <strong>{staffName}</strong> will remove all exit data.
              This action cannot be undone.
            </p>
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted uppercase tracking-wider">Reason</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Reason for cancelling exit (min 5 chars)"
            className="px-3 py-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </label>
        {error && (
          <p className="mt-2 text-xs text-state-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Keep Exit
          </button>
          <button
            type="submit"
            className="px-4 h-9 text-sm font-medium rounded-md bg-warning text-white hover:bg-warning/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
          >
            Cancel Exit
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExitTab({ staff, viewer }: ExitTabProps) {
  const viewerRole = viewer.role as StaffRoleCode;
  const isR12Plus = hasRank(viewerRole, 'R12');
  const isR16Plus = hasRank(viewerRole, 'R16');

  // Pull store slices — stable refs to avoid infinite re-render
  const allExitStates = useStaffStore((s) => s.exitStates);
  const cancelExit = useStaffStore((s) => s.cancelExit);
  const allBalances = useStaffStore((s) => s.leaveBalances);

  // Stable derived values
  const exitState = useMemo(() => allExitStates[staff.id] ?? null, [allExitStates, staff.id]);
  const elBalance = useMemo(() => {
    const bal = allBalances[staff.id];
    return bal ? bal.EL.entitled + bal.EL.carriedForward - bal.EL.used : 0;
  }, [allBalances, staff.id]);

  // Get salary from store (live)
  const liveStaff = useStaffStore((s) => s.staffById[staff.id]);
  const salary = (liveStaff as (typeof liveStaff & { currentSalary?: SalaryStructure }) | undefined)
    ?.currentSalary;

  const [initiateOpen, setInitiateOpen] = useState(false);
  const [fnfOpen, setFnfOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  // Tab visibility: visible when exit exists OR viewer is R12+
  const canSeeTab = exitState !== null || isR12Plus;
  if (!canSeeTab) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-48 gap-3">
        <LogOut size={28} className="text-ink-muted opacity-40" aria-hidden />
        <p className="text-sm text-ink-muted">Exit information is restricted.</p>
      </div>
    );
  }

  function handleCancelExit(reason: string) {
    const result = cancelExit(staff.id, reason, { id: viewer.id, role: viewerRole });
    setCancelOpen(false);
    if (result.success) {
      toast('Exit workflow cancelled.', 'success');
    } else {
      toast(result.error ?? 'Cancel failed.', 'error');
    }
  }

  // ─── No exit initiated ───────────────────────────────────────────────────

  if (!exitState) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">Exit</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              No exit workflow initiated for {staff.name}.
            </p>
          </div>
          {isR12Plus && (
            <button
              type="button"
              onClick={() => setInitiateOpen(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-state-danger text-white text-sm font-medium hover:bg-state-danger/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger"
            >
              <LogOut size={14} aria-hidden />
              Initiate Exit
            </button>
          )}
        </div>

        <div className="rounded-md border border-line bg-bg-subtle p-8 text-center">
          <LogOut size={32} className="text-ink-muted opacity-30 mx-auto mb-3" aria-hidden />
          <p className="text-sm text-ink-muted">
            When an exit is initiated, the last working day, reason, notice period, and F&amp;F
            computation will appear here.
          </p>
        </div>

        {initiateOpen && (
          <InitiateExitDialog
            staffId={staff.id}
            staffName={staff.name}
            actor={{ id: viewer.id, role: viewerRole }}
            onClose={() => setInitiateOpen(false)}
            onInitiated={() => toast('Exit workflow initiated.', 'success')}
          />
        )}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    );
  }

  // ─── INITIATED ──────────────────────────────────────────────────────────

  if (exitState.status === 'INITIATED') {
    const daysLeft = daysUntil(exitState.lastWorkingDay);

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">Exit</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              Exit initiated for {staff.name}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isR16Plus && (
              <button
                type="button"
                onClick={() => setFnfOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <FileText size={14} aria-hidden />
                Finalize F&amp;F
              </button>
            )}
            {isR12Plus && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-secondary hover:bg-bg-subtle transition-colors"
              >
                Cancel Exit
              </button>
            )}
          </div>
        </div>

        {/* Countdown */}
        <div className="p-4 rounded-md border border-line bg-bg-subtle">
          <p className="text-xs text-ink-muted">Days until last working day</p>
          <p
            className={`text-2xl font-bold tabular-nums mt-0.5 ${
              daysLeft <= 7 ? 'text-state-danger' : daysLeft <= 14 ? 'text-warning' : 'text-ink-primary'
            }`}
          >
            {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            Last working day: {formatDate(exitState.lastWorkingDay)}
          </p>
        </div>

        {/* Exit details card */}
        <Card title="Exit Details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Last Working Day</dt>
              <dd className="text-sm text-ink-primary mt-0.5">{formatDate(exitState.lastWorkingDay)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Reason</dt>
              <dd className="text-sm text-ink-primary mt-0.5 capitalize">{exitState.reason}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Notice Period</dt>
              <dd className="text-sm text-ink-primary mt-0.5">
                {exitState.noticePeriodDays} day{exitState.noticePeriodDays !== 1 ? 's' : ''}
                {exitState.noticePeriodWaived && (
                  <span className="ml-2 text-xs text-warning">(Waived)</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Initiated At</dt>
              <dd className="text-sm text-ink-primary mt-0.5">{formatDate(exitState.initiatedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Initiated By</dt>
              <dd className="text-sm font-mono text-ink-secondary mt-0.5">{exitState.initiatedBy}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Status</dt>
              <dd className="mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-warning/15 text-warning border-warning/25">
                  Initiated
                </span>
              </dd>
            </div>
            {exitState.noticePeriodWaived && exitState.waiverReason && (
              <div className="col-span-2">
                <dt className="text-xs text-ink-muted uppercase tracking-wider">Waiver Reason</dt>
                <dd className="text-sm text-ink-secondary mt-0.5">{exitState.waiverReason}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs text-ink-muted">
            PII anonymization scheduled for {formatDate(exitState.anonymizationScheduledFor)} (7 years from
            last working day — Doc 06 §17).
          </p>
        </Card>

        {fnfOpen && (
          <FnFFinalizeDialog
            staffId={staff.id}
            staffName={staff.name}
            exitState={exitState}
            actor={{ id: viewer.id, role: viewerRole }}
            salary={salary}
            elBalance={elBalance}
            startDate={staff.startDate}
            onClose={() => setFnfOpen(false)}
            onFinalized={() => toast('F&F finalized.', 'success')}
          />
        )}
        {cancelOpen && (
          <CancelExitDialog
            staffName={staff.name}
            actor={{ id: viewer.id, role: viewerRole }}
            onCancel={() => setCancelOpen(false)}
            onConfirm={handleCancelExit}
          />
        )}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    );
  }

  // ─── FNF_FINALIZED ──────────────────────────────────────────────────────

  const fnf = exitState.fnf!;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Exit — F&amp;F Sheet</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Full &amp; Final settlement finalized for {staff.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast('PDF generation coming in v1.1', 'info')}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors"
        >
          <Download size={14} aria-hidden />
          Download F&amp;F PDF
        </button>
      </div>

      {/* Exit details summary */}
      <Card title="Exit Details">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Last Working Day</dt>
            <dd className="text-sm text-ink-primary mt-0.5">{formatDate(exitState.lastWorkingDay)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Reason</dt>
            <dd className="text-sm text-ink-primary mt-0.5 capitalize">{exitState.reason}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">F&amp;F Finalized At</dt>
            <dd className="text-sm text-ink-primary mt-0.5">
              {exitState.fnfFinalizedAt ? formatDate(exitState.fnfFinalizedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Status</dt>
            <dd className="mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-success/15 text-success border-success/25">
                F&amp;F Finalized
              </span>
            </dd>
          </div>
        </dl>
      </Card>

      {/* Earnings */}
      <Card title="Earnings">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Pro-rated Salary</dt>
            <dd className="text-sm text-ink-primary mt-0.5 tabular-nums">{formatINR(fnf.proRatedSalary)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">EL Encashment</dt>
            <dd className="text-sm text-ink-primary mt-0.5 tabular-nums">{formatINR(fnf.elEncashment)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Gratuity</dt>
            <dd className="text-sm text-ink-primary mt-0.5 tabular-nums">
              {formatINR(fnf.gratuity)}
              {fnf.gratuityCapped && (
                <span className="ml-1.5 text-xs text-warning">(cap applied)</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Total Earnings</dt>
            <dd className="text-sm font-semibold text-success mt-0.5 tabular-nums">
              {formatINR(fnf.proRatedSalary + fnf.elEncashment + fnf.gratuity)}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Deductions */}
      <Card title="Deductions">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {fnf.advanceDeduction > 0 && (
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Advance Recovery</dt>
              <dd className="text-sm text-ink-primary mt-0.5 tabular-nums">{formatINR(fnf.advanceDeduction)}</dd>
            </div>
          )}
          {fnf.noticeShortfall > 0 && (
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Notice Shortfall</dt>
              <dd className="text-sm text-ink-primary mt-0.5 tabular-nums">{formatINR(fnf.noticeShortfall)}</dd>
            </div>
          )}
          {fnf.assetLoss > 0 && (
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Asset Loss / Damage</dt>
              <dd className="text-sm text-ink-primary mt-0.5 tabular-nums">{formatINR(fnf.assetLoss)}</dd>
            </div>
          )}
          {fnf.otherDeduction > 0 && (
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Other</dt>
              <dd className="text-sm text-ink-primary mt-0.5 tabular-nums">{formatINR(fnf.otherDeduction)}</dd>
            </div>
          )}
          {fnf.deductionsTotal === 0 && (
            <div className="col-span-2">
              <dd className="text-sm text-ink-muted">No deductions.</dd>
            </div>
          )}
          {fnf.deductionsTotal > 0 && (
            <div className="col-span-2">
              <dt className="text-xs text-ink-muted uppercase tracking-wider">Total Deductions</dt>
              <dd className="text-sm font-semibold text-state-danger mt-0.5 tabular-nums">
                {formatINR(fnf.deductionsTotal)}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Net Payable */}
      <Card title="Net Payable">
        <div className="flex items-end justify-between">
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Net Payable to Employee</dt>
            <dd
              className={`text-3xl font-bold tabular-nums mt-1 ${
                fnf.netPayable >= 0 ? 'text-ink-primary' : 'text-state-danger'
              }`}
            >
              {formatINR(fnf.netPayable)}
            </dd>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-success/15 text-success border-success/25">
            Finalized
          </span>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          PII anonymization scheduled for {formatDate(exitState.anonymizationScheduledFor)} (7 years
          from last working day — Doc 06 §17).
        </p>
      </Card>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
