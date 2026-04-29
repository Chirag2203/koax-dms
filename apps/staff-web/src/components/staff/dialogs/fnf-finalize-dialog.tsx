'use client';

/**
 * F&F Finalize dialog — SPEC-STAFF-001 S8.
 *
 * Pre-populates via computeFFSummary. Lets R16+ adjust numbers manually.
 * On submit calls finalizeFnF store action.
 */

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { StaffRoleCode, SalaryStructure, LeaveBalance } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import type { FnFPayload, StaffExitState } from '@/src/lib/staff/staff-store';
import { computeFFSummary } from '@/src/lib/staff/payroll-math';

interface FnFFinalizeDialogProps {
  staffId: string;
  staffName: string;
  exitState: StaffExitState;
  actor: { id: string; role: StaffRoleCode };
  /** Current salary structure (may be undefined if no salary set) */
  salary?: SalaryStructure;
  /** Current EL balance (days) */
  elBalance?: number;
  startDate: string;
  onClose: () => void;
  onFinalized: () => void;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted uppercase tracking-wider">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent tabular-nums"
      />
    </label>
  );
}

export function FnFFinalizeDialog({
  staffId,
  staffName,
  exitState,
  actor,
  salary,
  elBalance = 0,
  startDate,
  onClose,
  onFinalized,
}: FnFFinalizeDialogProps) {
  const finalizeFnF = useStaffStore((s) => s.finalizeFnF);

  // Compute defaults from payroll-math
  const defaults = useMemo(() => {
    if (!salary) return null;
    const lwdDate = new Date(exitState.lastWorkingDay);
    const firstDayOfExitMonth = new Date(lwdDate.getFullYear(), lwdDate.getMonth(), 1);
    const daysWorked = lwdDate.getDate() - firstDayOfExitMonth.getDate() + 1;
    return computeFFSummary({
      staffId,
      basic: salary.basic,
      da: salary.da ?? 0,
      monthlyGross: salary.basic + (salary.da ?? 0) + salary.hra + salary.specialAllowance,
      exitDate: exitState.lastWorkingDay,
      startDate,
      daysWorkedInExitMonth: daysWorked,
      eligibleELDays: elBalance,
    });
  }, [staffId, salary, exitState.lastWorkingDay, startDate, elBalance]);

  const [proRatedSalary, setProRatedSalary] = useState(defaults?.proRatedSalary ?? 0);
  const [elEncashment, setElEncashment] = useState(defaults?.elEncashment ?? 0);
  const [gratuity, setGratuity] = useState(defaults?.gratuity ?? 0);
  const gratuityCapped = defaults?.gratuityCapped ?? false;
  const [advance, setAdvance] = useState(0);
  const [noticeShortfall, setNoticeShortfall] = useState(0);
  const [assetLoss, setAssetLoss] = useState(0);
  const [otherDeduction, setOtherDeduction] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const deductionsTotal = advance + noticeShortfall + assetLoss + otherDeduction;
  const netPayable = proRatedSalary + elEncashment + gratuity - deductionsTotal;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fnfPayload: FnFPayload = {
      proRatedSalary,
      elEncashment,
      gratuity,
      gratuityCapped,
      deductionsTotal,
      advanceDeduction: advance,
      noticeShortfall,
      assetLoss,
      otherDeduction,
      netPayable,
    };
    const result = finalizeFnF(staffId, fnfPayload, actor);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to finalize F&F.');
      return;
    }
    onFinalized();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fnf-dialog-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-xl bg-bg-surface border border-line p-6 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="fnf-dialog-title" className="text-sm font-semibold text-ink-primary">
            Finalize F&amp;F — {staffName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-bg-subtle rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close"
          >
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        {!salary && (
          <div className="mb-4 p-3 rounded-md bg-warning/10 border border-warning/30">
            <p className="text-xs text-warning">
              No salary structure found. Amounts pre-filled as ₹0 — adjust manually.
            </p>
          </div>
        )}

        {/* Earnings */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
            Earnings
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <NumberInput label="Pro-rated Salary (L23)" value={proRatedSalary} onChange={setProRatedSalary} />
            <NumberInput label="EL Encashment (L19)" value={elEncashment} onChange={setElEncashment} />
            <div className="flex flex-col gap-1">
              <NumberInput label="Gratuity (L11)" value={gratuity} onChange={setGratuity} />
              {gratuityCapped && (
                <p className="text-xs text-warning mt-0.5">
                  Statutory cap ₹20L applied (PoG Amendment 2018)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
            Deductions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Advance Recovery" value={advance} onChange={setAdvance} />
            <NumberInput label="Notice Shortfall" value={noticeShortfall} onChange={setNoticeShortfall} />
            <NumberInput label="Asset Loss / Damage" value={assetLoss} onChange={setAssetLoss} />
            <NumberInput label="Other Deductions" value={otherDeduction} onChange={setOtherDeduction} />
          </div>
        </div>

        {/* Net Payable summary */}
        <div className="p-4 rounded-md bg-bg-subtle border border-line">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <dt className="text-xs text-ink-muted">Total Earnings</dt>
              <dd className="text-sm font-medium text-success tabular-nums">
                {formatINR(proRatedSalary + elEncashment + gratuity)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Total Deductions</dt>
              <dd className="text-sm font-medium text-state-danger tabular-nums">
                {formatINR(deductionsTotal)}
              </dd>
            </div>
            <div className="col-span-2 border-t border-line pt-2">
              <dt className="text-xs text-ink-muted">Net Payable</dt>
              <dd
                className={`text-lg font-bold tabular-nums ${netPayable >= 0 ? 'text-ink-primary' : 'text-state-danger'}`}
              >
                {formatINR(netPayable)}
              </dd>
            </div>
          </dl>
        </div>

        {error && (
          <p className="mt-3 text-xs text-state-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 h-9 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Finalize F&amp;F
          </button>
        </div>
      </form>
    </div>
  );
}
