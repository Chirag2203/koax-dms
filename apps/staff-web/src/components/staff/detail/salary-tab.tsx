'use client';

/**
 * Salary tab — SPEC-STAFF-001 §P2
 *
 * Visibility: R12+ (outlet scope) / R16+ (org) / self. Sub-R12 callers receive
 * a 403-state via selectStaffForViewer stripping salary fields (L18).
 *
 * Compliance banner: PT slabs flagged unverified: true (L16, OQ-PT-1).
 * Payroll math is preview-only; statutory filing via greytHR/Keka (L1, L27).
 * Payslip: browser print-to-PDF (L28).
 *
 * L29: Salary updates R22+ gated. Append-only salaryHistory. Emits salary-change.
 */

import { useState } from 'react';
import { AlertTriangle, Info, ChevronDown, Printer, Lock, X } from 'lucide-react';
import type { StaffProfile, StaffRoleCode, SalaryStructure } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import {
  computeGross,
  computePF,
  computeESIC,
  computePT,
  computeTDS,
} from '@/src/lib/staff/payroll-math';

// ─── Edit Salary form (R22+ gated at slice level via updateSalary) ───────────

function EditSalaryForm({
  staff,
  viewer,
  onClose,
}: {
  staff: StaffProfile;
  viewer: { role: string; id: string };
  onClose: () => void;
}) {
  const updateSalary = useStaffStore((s) => s.updateSalary);
  const current = (staff as StaffProfile & { currentSalary?: SalaryStructure }).currentSalary;

  const [basic, setBasic] = useState(current?.basic ?? 0);
  const [hra, setHra] = useState(current?.hra ?? 0);
  const [da, setDa] = useState(current?.da ?? 0);
  const [specialAllowance, setSpecialAllowance] = useState(current?.specialAllowance ?? 0);
  const [conveyance, setConveyance] = useState(current?.conveyance ?? 0);
  const [medical, setMedical] = useState(current?.medical ?? 0);
  const [performanceBonus, setPerformanceBonus] = useState(current?.performanceBonus ?? 0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const newGross = basic + hra + da + specialAllowance + conveyance + medical + performanceBonus;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Reason for change is required');
      return;
    }
    if (basic < 1) {
      setError('Basic must be greater than zero');
      return;
    }
    try {
      updateSalary(
        staff.id,
        {
          basic,
          hra,
          da,
          specialAllowance,
          conveyance,
          medical,
          performanceBonus,
          effectiveFrom: new Date().toISOString().split('T')[0]!,
          approvedBy: viewer.id,
          approvedAt: new Date().toISOString(),
          reason: reason.trim(),
        },
        { id: viewer.id, role: viewer.role as StaffRoleCode },
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update salary');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-bg-surface border border-line p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-ink-primary">Edit Salary Structure</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-bg-subtle rounded">
            <X size={16} className="text-ink-muted" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Basic', basic, setBasic, true],
            ['HRA', hra, setHra, false],
            ['DA', da, setDa, false],
            ['Special Allowance', specialAllowance, setSpecialAllowance, false],
            ['Conveyance', conveyance, setConveyance, false],
            ['Medical', medical, setMedical, false],
            ['Performance Bonus', performanceBonus, setPerformanceBonus, false],
          ].map(([label, val, setter, required]) => (
            <label key={label as string} className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-muted">
                {label as string}{required ? ' *' : ''}
              </span>
              <input
                type="number"
                min={0}
                value={val as number}
                onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
                required={required as boolean}
                className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <p className="text-[11px] text-ink-muted">New Gross Monthly</p>
          <p className="text-[18px] font-semibold text-accent tabular-nums">
            {formatINR(newGross)}
          </p>
        </div>
        <label className="flex flex-col gap-1 mt-4">
          <span className="text-[11px] text-ink-muted">Reason for change *</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={2}
            placeholder="Annual review / Promotion / Adjustment / etc."
            className="px-3 py-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </label>
        {error && (
          <p className="mt-3 text-[12px] text-state-danger">{error}</p>
        )}
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
            Save & Approve
          </button>
        </div>
        <p className="mt-3 text-[10px] text-ink-muted">
          R22+ required at the slice level. Salary history is append-only; this creates a new entry effective today.
        </p>
      </form>
    </div>
  );
}

// ─── formatINR co-located ─────────────────────────────────────────────────────
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalaryTabProps {
  staff: StaffProfile;
  viewer: { role: string; id: string };
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3 px-6">
        {title}
      </h2>
      <div className="px-6 space-y-2">{children}</div>
    </div>
  );
}

function SalaryRow({
  label,
  amount,
  bold,
  muted,
}: {
  label: string;
  amount: number | string;
  bold?: boolean;
  muted?: boolean;
}) {
  const amtStr = typeof amount === 'number' ? formatINR(amount) : amount;
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${bold ? 'border-t border-line mt-1 pt-2' : ''}`}
    >
      <span
        className={`text-[13px] ${bold ? 'font-semibold text-ink-primary' : muted ? 'text-ink-muted' : 'text-ink-secondary'}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-[13px] ${bold ? 'font-bold text-ink-primary' : muted ? 'text-ink-muted' : 'text-ink-primary'}`}
      >
        {amtStr}
      </span>
    </div>
  );
}

/** Small warning chip for unverified PT slabs (L16) */
function UnverifiedChip({ tooltip }: { tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/15 text-warning border border-warning/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-warning"
        aria-label="Unverified — see tooltip"
      >
        <AlertTriangle size={9} aria-hidden="true" />
        UNVERIFIED
      </button>
      {show && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-0 mb-1 w-60 text-[11px] bg-bg-surface border border-line rounded-lg p-2 shadow-lg text-ink-secondary"
        >
          {tooltip}
        </div>
      )}
    </span>
  );
}

// ─── Payslip preview dialog ───────────────────────────────────────────────────

interface PayslipDialogProps {
  staff: StaffProfile;
  salary: SalaryStructure;
  month: number;
  year: number;
  onClose: () => void;
}

function PayslipDialog({ staff, salary, month, year, onClose }: PayslipDialogProps) {
  const gross = computeGross(salary);
  const pf = computePF(salary.basic);
  const { employee: esicEmp, employer: esicEmpr } = computeESIC(gross);
  const pt = computePT(staff.stateOfPosting, gross, month);
  const tds = Math.round(computeTDS(gross * 12));
  const totalDed = pf + esicEmp + pt.amount + tds;
  const net = gross - totalDed;

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Payslip preview"
    >
      <div className="bg-bg-canvas border border-line rounded-2xl w-[600px] max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-[16px] font-bold text-ink-primary">Payslip Preview</h2>
            <p className="text-[12px] text-ink-muted">
              {MONTH_NAMES[month - 1]} {year} · {staff.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Printer size={13} aria-hidden="true" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close payslip"
              className="px-3 py-1.5 text-[12px] text-ink-muted hover:text-ink-primary rounded-lg border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Close
            </button>
          </div>
        </div>

        {/* Compliance notice */}
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-warning/8 border border-warning/25 text-[11px] text-warning flex items-start gap-2">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Payroll math is preview-only. PT slabs unverified (OQ-PT-1). Statutory filing via
            greytHR/Keka per Doc 06 §15.2.
          </p>
        </div>

        {/* Payslip body */}
        <div className="px-6 py-4 space-y-4 print:px-0">
          {/* Employer info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-ink-primary">BN Automobiles</p>
              <p className="text-[11px] text-ink-muted">
                {staff.outlet.charAt(0).toUpperCase() + staff.outlet.slice(1)} Outlet
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-semibold text-ink-primary">
                {MONTH_NAMES[month - 1]} {year}
              </p>
              <p className="font-mono text-[11px] text-ink-muted">{staff.id}</p>
            </div>
          </div>

          <div className="border-t border-line pt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
            <span className="text-ink-muted">Employee Name</span>
            <span className="font-medium text-ink-primary">{staff.name}</span>
            <span className="text-ink-muted">Role</span>
            <span className="font-medium text-ink-primary">{staff.roleName}</span>
            <span className="text-ink-muted">Department</span>
            <span className="font-medium text-ink-primary">{staff.department}</span>
            <span className="text-ink-muted">State of Posting</span>
            <span className="font-medium text-ink-primary">{staff.stateOfPosting}</span>
          </div>

          {/* Earnings */}
          <div className="rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-2 bg-bg-subtle">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Earnings</p>
            </div>
            <div className="px-4 py-2 space-y-1">
              <SalaryRow label="Basic" amount={salary.basic} />
              <SalaryRow label="HRA" amount={salary.hra} />
              {(salary.da ?? 0) > 0 && <SalaryRow label="DA" amount={salary.da ?? 0} />}
              <SalaryRow label="Special Allowance" amount={salary.specialAllowance} />
              <SalaryRow label="Conveyance" amount={salary.conveyance ?? 0} />
              <SalaryRow label="Medical" amount={salary.medical ?? 0} />
              <SalaryRow label="Performance Bonus" amount={salary.performanceBonus ?? 0} />
              <SalaryRow label="Gross Total" amount={gross} bold />
            </div>
          </div>

          {/* Deductions */}
          <div className="rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-2 bg-bg-subtle">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Deductions</p>
            </div>
            <div className="px-4 py-2 space-y-1">
              <SalaryRow label="PF (12% of Basic, capped ₹1,800)" amount={pf} />
              {esicEmp > 0 ? (
                <SalaryRow label="ESIC Employee (0.75% of gross)" amount={esicEmp} />
              ) : (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[13px] text-ink-muted">ESIC</span>
                  <span className="text-[12px] text-ink-muted italic">Not applicable (gross &gt; ₹21,000)</span>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5">
                <span className="flex items-center text-[13px] text-ink-secondary">
                  Professional Tax ({staff.stateOfPosting})
                  <UnverifiedChip tooltip="PT slab pending tax counsel review per OQ-PT-1. Preview value only." />
                </span>
                <span className="font-mono text-[13px] text-ink-primary">{formatINR(pt.amount)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="flex items-center gap-1 text-[13px] text-ink-muted">
                  TDS (informational)
                  <Info size={11} className="text-ink-muted" aria-hidden="true" />
                </span>
                <span className="font-mono text-[13px] text-ink-muted">{formatINR(tds)}</span>
              </div>
              <SalaryRow label="Total Deductions" amount={totalDed} bold />
            </div>
          </div>

          {/* Net pay */}
          <div className="rounded-xl bg-accent/8 border border-accent/20 px-4 py-4 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-ink-primary">Net Pay</span>
            <span className="font-mono text-[22px] font-bold text-accent">{formatINR(net)}</span>
          </div>

          {/* Employer ESIC */}
          {esicEmpr > 0 && (
            <p className="text-[11px] text-ink-muted px-1">
              Employer ESIC (3.25% of gross): {formatINR(esicEmpr)} — not deducted from employee pay.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Salary tab ───────────────────────────────────────────────────────────────

const MONTH_OPTS = [
  { value: '4-2026', label: 'April 2026' },
  { value: '3-2026', label: 'March 2026' },
  { value: '2-2026', label: 'February 2026' },
  { value: '1-2026', label: 'January 2026' },
  { value: '12-2025', label: 'December 2025' },
  { value: '11-2025', label: 'November 2025' },
];

export function SalaryTab({ staff, viewer }: SalaryTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const viewerRole = viewer.role as StaffRoleCode;
  const isSelf = viewer.id === staff.id;

  // RBAC: R12+ or self can see salary (L8)
  const canSeeSalary = isSelf || hasRank(viewerRole, 'R12');
  // R22+ can edit salary (L29)
  const canEditSalary = hasRank(viewerRole, 'R22');

  const liveStaff = useStaffStore((s) => s.selectStaffById(staff.id)) ?? staff;
  const currentSalary = (liveStaff as StaffProfile & { currentSalary?: SalaryStructure }).currentSalary;
  const salaryHistory = (liveStaff as StaffProfile & { salaryHistory?: SalaryStructure[] }).salaryHistory ?? [];

  const [selectedMonth, setSelectedMonth] = useState('4-2026');
  const [payslipOpen, setPayslipOpen] = useState(false);

  if (!canSeeSalary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
        <Lock size={28} className="text-ink-muted" aria-hidden="true" />
        <p className="text-[14px] font-medium text-ink-primary">Salary Restricted</p>
        <p className="text-[13px] text-ink-muted text-center max-w-sm">
          Parts Manager (R12) authority required to view salary data. (L8, Doc 14 §18)
        </p>
      </div>
    );
  }

  if (!currentSalary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
        <p className="text-[14px] font-medium text-ink-primary">No Salary Structure</p>
        <p className="text-[13px] text-ink-muted text-center max-w-sm">
          Salary structure has not been configured for this staff member.
          {canEditSalary && ' Use the Edit Salary action to set one.'}
        </p>
      </div>
    );
  }

  const gross = computeGross(currentSalary);
  const pf = computePF(currentSalary.basic);
  const { employee: esicEmp } = computeESIC(gross);
  const pt = computePT(liveStaff.stateOfPosting, gross, new Date().getMonth() + 1);
  const tds = Math.round(computeTDS(gross * 12));
  const totalDeductions = pf + esicEmp + pt.amount + tds;
  const netPay = gross - totalDeductions;

  const parsedMonth = parseInt(selectedMonth.split('-')[0]!, 10);
  const parsedYear = parseInt(selectedMonth.split('-')[1]!, 10);

  return (
    <div className="py-4">
      {/* ─── Compliance banner (sticky) ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 mx-6 mb-5 px-4 py-2.5 rounded-lg bg-warning/10 border border-warning/30 text-[12px] text-warning flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Payroll preview only.</strong> PT slabs flagged for tax counsel verification
          (OQ-PT-1). Statutory filing via greytHR/Keka per Doc 06 §15.2.
        </p>
      </div>

      {/* ─── Salary Structure Summary ────────────────────────────────────── */}
      <Section title="Salary Structure">
        <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 bg-bg-subtle flex items-center justify-between">
            <p className="text-[12px] font-medium text-ink-primary">Current Structure</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted">
                Effective {currentSalary.effectiveFrom}
              </span>
              {canEditSalary && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
                  title="Edit Salary (R22+ required)"
                >
                  Edit Salary
                </button>
              )}
            </div>
          </div>
          <div className="px-4 py-3 space-y-1">
            <SalaryRow label="Basic" amount={currentSalary.basic} />
            <SalaryRow label="HRA" amount={currentSalary.hra} />
            {(currentSalary.da ?? 0) > 0 && (
              <SalaryRow label="DA" amount={currentSalary.da ?? 0} />
            )}
            <SalaryRow label="Special Allowance" amount={currentSalary.specialAllowance} />
            <SalaryRow label="Conveyance" amount={currentSalary.conveyance ?? 0} muted />
            <SalaryRow label="Medical" amount={currentSalary.medical ?? 0} muted />
            <SalaryRow label="Performance Bonus" amount={currentSalary.performanceBonus ?? 0} muted />
            <SalaryRow label="Gross Monthly" amount={gross} bold />
            <SalaryRow label="Gross Annual" amount={gross * 12} bold />
          </div>
        </div>
      </Section>

      {/* ─── Deductions card ─────────────────────────────────────────────── */}
      <Section title="Statutory Deductions">
        <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 space-y-1">
            <SalaryRow label="PF (12% of Basic, capped ₹1,800)" amount={pf} />
            {esicEmp > 0 ? (
              <SalaryRow label="ESIC Employee (0.75% of gross)" amount={esicEmp} />
            ) : (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-ink-muted">ESIC</span>
                <span className="text-[12px] text-ink-muted italic">Not applicable (gross &gt; ₹21,000)</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center text-[13px] text-ink-secondary">
                Professional Tax ({liveStaff.stateOfPosting})
                <UnverifiedChip tooltip="PT slab pending tax counsel review per OQ-PT-1. Not for statutory remittance." />
              </span>
              <span className="font-mono text-[13px] text-ink-primary">{formatINR(pt.amount)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-1 text-[13px] text-ink-muted">
                TDS (informational avg)
                <Info size={11} className="text-ink-muted" aria-hidden="true" />
              </span>
              <span className="font-mono text-[13px] text-ink-muted">{formatINR(tds)}</span>
            </div>
            <SalaryRow label="Total Deductions" amount={totalDeductions} bold />
          </div>
        </div>
      </Section>

      {/* ─── Net Pay ─────────────────────────────────────────────────────── */}
      <div className="px-6 mb-5">
        <div className="rounded-xl bg-accent/8 border border-accent/20 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Net Monthly Pay</p>
            <p className="text-[11px] text-ink-muted mt-0.5">After all deductions</p>
          </div>
          <span className="font-mono text-[28px] font-bold text-accent">{formatINR(netPay)}</span>
        </div>
      </div>

      {/* ─── Salary History ──────────────────────────────────────────────── */}
      <Section title="Salary History">
        {salaryHistory.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No salary history recorded.</p>
        ) : (
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-bg-subtle">
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-muted">Effective Date</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-ink-muted">Basic</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-ink-muted">Gross</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-muted">Reason</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-muted">Approved By</th>
                </tr>
              </thead>
              <tbody>
                {[...salaryHistory]
                  .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                  .map((s, i) => (
                    <tr key={`${s.effectiveFrom}-${i}`} className="border-t border-line">
                      <td className="px-4 py-2.5 font-mono text-ink-primary">{s.effectiveFrom}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-primary">{formatINR(s.basic)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-primary">{formatINR(computeGross(s))}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">{s.reason ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-ink-muted text-[11px]">{s.approvedBy}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {!canEditSalary && (
          <p className="mt-1.5 text-[11px] text-ink-muted">
            Salary raise approvals require CFO (R22) authority (L29).
          </p>
        )}
      </Section>

      {/* ─── Payslip Generator ───────────────────────────────────────────── */}
      <Section title="Payslip Generator">
        <div className="rounded-xl border border-line bg-bg-surface px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none h-9 pl-3 pr-8 text-[13px] bg-bg-canvas border border-line rounded-lg text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                aria-label="Select payslip period"
              >
                {MONTH_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <button
              type="button"
              onClick={() => setPayslipOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Printer size={14} aria-hidden="true" />
              Generate Payslip
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            Preview-only. Download via browser print-to-PDF (L28). No server job required.
          </p>
        </div>
      </Section>

      {/* Payslip dialog */}
      {payslipOpen && (
        <PayslipDialog
          staff={liveStaff}
          salary={currentSalary}
          month={parsedMonth}
          year={parsedYear}
          onClose={() => setPayslipOpen(false)}
        />
      )}

      {/* Edit Salary modal — R22+ gated */}
      {editOpen && canEditSalary && (
        <EditSalaryForm
          staff={liveStaff}
          viewer={viewer}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
