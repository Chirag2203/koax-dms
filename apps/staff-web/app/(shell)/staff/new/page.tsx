'use client';

/**
 * /staff/new — Onboarding Wizard (5 steps)
 * SPEC-STAFF-001 P1+ §8.3 — L24
 *
 * Step 1: Basic info (name, email, phone, DOB, emergency contact)
 * Step 2: Role & Outlet (role selector scoped by actor authority, outlet, department, reports-to)
 * Step 3: Documents (Aadhaar last-4, PAN, offer letter filename, bank details — filenames only)
 * Step 4: DPDP Consent (mandatory — blocks step 5 if not given) + salary scaffold gate
 * Step 5: Review & Submit (fingerprint enrollment stub)
 *
 * L24: DPDP consent + role + salary scaffold occurs at step 4 + 5;
 *      salary fields hidden behind R12+ gate (FIXME: OQ-PT-1 — salary tab P2).
 *
 * RBAC gate (S7 AC — L_S7):
 *   Page-level:  R03+ can reach the wizard.
 *   Role options in Step 2:
 *     - R03–R11  (Outlet Manager): can only select roles below R12 (i.e. R05–R11 range).
 *     - R12–R18  (Manager tier): can select R05–R18 (all non-admin roles below R12+ tier).
 *     - R02+     (Org Admin):    can select all roles including R12+ tier.
 *   Submit guard: if actor is not R02+ and selected role meets R12 rank, reject with toast.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Fingerprint } from 'lucide-react';
import { cn } from '@dms/ui';
import type { StaffRoleCode, StaffProfile, Department } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type OutletValue = 'bangalore' | 'mumbai' | 'chennai';
type StepId = 1 | 2 | 3 | 4 | 5;

interface Step1Data {
  name: string;
  email: string;
  phone: string;
  dob: string;
  emergencyName: string;
  emergencyPhone: string;
}

interface Step2Data {
  role: StaffRoleCode;
  outlet: OutletValue;
  department: Department;
  reportsTo: string;
}

interface Step3Data {
  aadhaarLast4: string;
  panMasked: string;
  offerLetterFilename: string;
  bankAccountLast4: string;
  bankName: string;
}

interface Step4Data {
  dpdpConsent: boolean;
}

type WizardData = Step1Data & Step2Data & Step3Data & Step4Data;

// ─── Constants ────────────────────────────────────────────────────────────────

const ONBOARDABLE_ROLES: StaffRoleCode[] = [
  'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18',
  'R19', 'R20', 'R21',
];

const ROLE_NAMES: Partial<Record<StaffRoleCode, string>> = {
  R03: 'Outlet Manager', R04: 'Sales Manager', R05: 'Sales Executive',
  R06: 'Marketing Exec', R07: 'Marketing Manager', R08: 'Workshop Manager',
  R09: 'Service Advisor', R10: 'Master Technician', R11: 'Technician',
  R12: 'Parts Manager', R13: 'Parts Counter', R14: 'Body Shop Manager',
  R15: 'Finance Executive', R16: 'Finance Head', R17: 'HR Executive',
  R18: 'Accountant', R19: 'General Manager', R20: 'IT Admin', R21: 'Receptionist',
};

const DEPARTMENTS: Department[] = [
  'SALES', 'SERVICE', 'PARTS', 'FINANCE', 'MARKETING', 'HR', 'OPERATIONS', 'MANAGEMENT',
];

const OUTLETS: { value: OutletValue; label: string }[] = [
  { value: 'bangalore', label: 'Bangalore (BLR)' },
  { value: 'mumbai', label: 'Mumbai (MUM)' },
  { value: 'chennai', label: 'Chennai (CHE)' },
];

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Role & Outlet' },
  { id: 3, label: 'Documents' },
  { id: 4, label: 'Consent' },
  { id: 5, label: 'Review' },
];

const INITIAL: WizardData = {
  // Step 1
  name: '', email: '', phone: '', dob: '', emergencyName: '', emergencyPhone: '',
  // Step 2
  role: 'R05', outlet: 'bangalore', department: 'SALES', reportsTo: '',
  // Step 3
  aadhaarLast4: '', panMasked: '', offerLetterFilename: '', bankAccountLast4: '', bankName: '',
  // Step 4
  dpdpConsent: false,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function generateId(role: StaffRoleCode): string {
  return `staff-${role.toLowerCase()}-${Date.now().toString(36)}`;
}

// ─── Shared field primitives ──────────────────────────────────────────────────

const inputClass =
  'w-full h-9 px-3 text-[13px] bg-bg-subtle border border-line rounded-md text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent';

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] text-ink-muted mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ data, onChange, errors }: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Partial<Record<keyof WizardData, string>>;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-ink-primary">Basic Information</h2>
      <Field label="Full Name" required error={errors.name}>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Ramesh Kumar"
          className={inputClass}
          aria-required="true"
        />
      </Field>
      <Field label="Work Email" required error={errors.email}>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="ramesh.kumar@bnautomobiles.in"
          className={inputClass}
          aria-required="true"
        />
      </Field>
      <Field label="Phone">
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+91 98760-XXXXX"
          className={inputClass}
        />
      </Field>
      <Field label="Date of Birth">
        <input
          type="date"
          value={data.dob}
          onChange={(e) => onChange({ dob: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="pt-2 border-t border-line">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
          Emergency Contact
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact Name">
            <input
              type="text"
              value={data.emergencyName}
              onChange={(e) => onChange({ emergencyName: e.target.value })}
              placeholder="Contact name"
              className={inputClass}
            />
          </Field>
          <Field label="Contact Phone">
            <input
              type="tel"
              value={data.emergencyPhone}
              onChange={(e) => onChange({ emergencyPhone: e.target.value })}
              placeholder="+91 XXXXX-XXXXX"
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Step2({ data, onChange, errors, actorRole }: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Partial<Record<keyof WizardData, string>>;
  actorRole: StaffRoleCode;
}) {
  /**
   * Role-option scoping per S7 / L_S7:
   *   R02+ (Org Admin, rank 22):  all roles selectable
   *   R12+ but not R02 (rank 15–21): below-R12 roles only (can't self-elevate to admin tier)
   *   R03+ but not R12 (Outlet Manager, rank 18 — note: R03 rank=18 > R12 rank=15):
   *     actually R03 has rank 18 which IS >= R12 rank 15, so R03 can see all non-R02+ roles.
   *     We apply a two-tier guard:
   *       - R02+ sees everything
   *       - R03–R11 (rank < 15) sees only roles NOT meeting R12 rank (i.e. below manager tier)
   *
   * From the rank table:
   *   R03 = 18, R04 = 16, R08 = 16, R10 = 12, R12 = 15, R14 = 16, R16 = 18
   *   R02 = 22
   *
   * Spec S7 intent: "R03 can onboard Sales Executive (R05)". R12+ manager-tier
   * roles require R02+ to onboard. We define "manager-tier" as hasRank(role, 'R12').
   */
  const canOnboardManagerTier = hasRank(actorRole, 'R02');
  const availableRoles = canOnboardManagerTier
    ? ONBOARDABLE_ROLES
    : ONBOARDABLE_ROLES.filter((r) => !hasRank(r, 'R12'));

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-ink-primary">Role & Outlet</h2>
      <Field label="Role" required error={errors.role}>
        <select
          value={data.role}
          onChange={(e) => onChange({ role: e.target.value as StaffRoleCode })}
          className={inputClass}
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>{r} — {ROLE_NAMES[r] ?? r}</option>
          ))}
        </select>
        {!canOnboardManagerTier && (
          <p className="mt-1 text-[11px] text-ink-muted">
            Manager-tier (R12+) roles require Org Admin (R02) authority. Onboardable roles shown.
          </p>
        )}
      </Field>
      <Field label="Outlet" required>
        <select
          value={data.outlet}
          onChange={(e) => onChange({ outlet: e.target.value as OutletValue })}
          className={inputClass}
        >
          {OUTLETS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Department" required>
        <select
          value={data.department}
          onChange={(e) => onChange({ department: e.target.value as Department })}
          className={inputClass}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </Field>
      <Field label="Reports To (Staff ID or Name — optional)">
        <input
          type="text"
          value={data.reportsTo}
          onChange={(e) => onChange({ reportsTo: e.target.value })}
          placeholder="e.g. staff-r03-001"
          className={inputClass}
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          Leave blank to assign to no manager. Can be updated from org chart later.
        </p>
      </Field>
    </div>
  );
}

function Step3({ data, onChange }: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  /**
   * Document upload stubs — store filename only (no actual file upload in v1).
   * L6: Aadhaar last-4 only. PAN stored masked. Bank account last-4 only.
   * DPDP: STAFF_DOCUMENT_ACCESS consent required for non-HR access.
   */
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-ink-primary">Documents</h2>
      <p className="text-[12px] text-ink-muted">
        Filenames are stored; actual files are uploaded to secure storage separately (v1 stub).
        Per Doc 06 §19 + L6: Aadhaar last-4 only; PAN masked; bank last-4 only.
      </p>

      <Field label="Aadhaar — Last 4 Digits Only">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]{4}"
          value={data.aadhaarLast4}
          onChange={(e) => onChange({ aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          placeholder="XXXX"
          className={inputClass}
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          Full Aadhaar number is never stored (Doc 06 §19.1 + L6).
        </p>
      </Field>

      <Field label="PAN (masked format, e.g. ABCPX1234X)">
        <input
          type="text"
          maxLength={10}
          value={data.panMasked}
          onChange={(e) => onChange({ panMasked: e.target.value.toUpperCase().slice(0, 10) })}
          placeholder="ABCPX1234X"
          className={cn(inputClass, 'font-mono uppercase')}
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          Visible to R02+/R22/R23 only (L6).
        </p>
      </Field>

      <Field label="Offer Letter — Filename">
        <input
          type="text"
          value={data.offerLetterFilename}
          onChange={(e) => onChange({ offerLetterFilename: e.target.value })}
          placeholder="offer-letter-ramesh-kumar.pdf"
          className={inputClass}
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          Actual file upload handled outside DMS in v1.
        </p>
      </Field>

      <div className="pt-2 border-t border-line">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
          Bank Account (visible to R16+ only — L6)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account Last 4 Digits">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={data.bankAccountLast4}
              onChange={(e) => onChange({ bankAccountLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              placeholder="XXXX"
              className={inputClass}
            />
          </Field>
          <Field label="Bank Name">
            <input
              type="text"
              value={data.bankName}
              onChange={(e) => onChange({ bankName: e.target.value })}
              placeholder="HDFC Bank"
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Step4({ data, onChange, errors }: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Partial<Record<keyof WizardData, string>>;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-ink-primary">DPDP Consent</h2>
      <p className="text-[13px] text-ink-secondary">
        Consent must be obtained from the staff member before proceeding.
        Per Doc 06 §19 and Doc 03 §10.
      </p>

      {/* DPDP Consent block — mandatory (S7 AC, L7) */}
      <div className={cn(
        'p-4 rounded-lg border',
        data.dpdpConsent ? 'bg-success/5 border-success/20' : 'bg-accent/5 border-accent/20',
      )}>
        <div className="flex items-start gap-3">
          <input
            id="dpdp-consent"
            type="checkbox"
            checked={data.dpdpConsent}
            onChange={(e) => onChange({ dpdpConsent: e.target.checked })}
            className="mt-0.5 w-4 h-4 rounded border-line accent-accent"
            aria-required="true"
          />
          <label htmlFor="dpdp-consent" className="text-[12px] text-ink-secondary leading-relaxed">
            I confirm the new staff member has provided{' '}
            <strong className="text-ink-primary">DPDP consent</strong> for HR data processing.{' '}
            Purpose:{' '}
            <code className="font-mono text-[11px] bg-bg-subtle px-1 rounded">STAFF_HR_PROCESSING</code>.{' '}
            Duration: employment + 7 years. Per Doc 06 §19, Doc 03 §10, and L7.
          </label>
        </div>
        {errors.dpdpConsent && (
          <p className="mt-2 text-[11px] text-danger">{errors.dpdpConsent}</p>
        )}
      </div>

      {/* Salary scaffold note — gated on R12+ and blocked on OQ-PT-1 */}
      {/* FIXME: OQ-PT-1 — salary scaffold is P2, gated on tax counsel sign-off */}
      <div className="p-3 rounded-lg bg-bg-subtle border border-line">
        <p className="text-[11px] text-ink-muted">
          <strong className="text-ink-secondary">Salary Structure</strong> is set up in P2 (Salary tab) after onboarding.
          Requires R12+ to configure. PT slabs are pending tax-counsel confirmation (OQ-PT-1).
        </p>
      </div>
    </div>
  );
}

function Step5({ data, actorRole }: {
  data: WizardData;
  actorRole: StaffRoleCode;
}) {
  /**
   * Review & fingerprint enrollment stub.
   * Fingerprint webhook contract per L2/L17.
   * Actual enrollment happens when device pings POST /api/webhooks/fingerprint.
   */
  const stateOfPosting =
    data.outlet === 'bangalore' ? 'KA' : data.outlet === 'mumbai' ? 'MH' : 'TN';

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-ink-primary">Review & Submit</h2>

      {/* Summary card */}
      <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
        <div className="px-4 py-3 bg-bg-subtle border-b border-line">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            Profile Summary
          </p>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          {[
            { label: 'Name', value: data.name },
            { label: 'Email', value: data.email },
            { label: 'Phone', value: data.phone || '—' },
            { label: 'Role', value: `${data.role} — ${ROLE_NAMES[data.role] ?? data.role}` },
            { label: 'Outlet', value: OUTLETS.find((o) => o.value === data.outlet)?.label ?? data.outlet },
            { label: 'Department', value: data.department },
            { label: 'State of Posting', value: stateOfPosting },
            { label: 'Reports To', value: data.reportsTo || 'None assigned' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-4">
              <span className="w-32 flex-shrink-0 text-[12px] text-ink-muted">{label}</span>
              <span className="text-[13px] text-ink-primary">{value}</span>
            </div>
          ))}
          <div className="flex items-start gap-4">
            <span className="w-32 flex-shrink-0 text-[12px] text-ink-muted">DPDP Consent</span>
            <span className={cn('text-[13px] font-medium', data.dpdpConsent ? 'text-success' : 'text-danger')}>
              {data.dpdpConsent ? 'Given' : 'NOT given — required'}
            </span>
          </div>
        </div>
      </div>

      {/* Fingerprint enrollment stub */}
      <div className="p-4 rounded-xl border border-line bg-bg-surface">
        <div className="flex items-start gap-3">
          <Fingerprint size={20} className="text-ink-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-medium text-ink-primary mb-1">
              Fingerprint Enrollment
            </p>
            <p className="text-[12px] text-ink-muted">
              Enrollment is completed when the fingerprint device pings the webhook
              (<code className="font-mono text-[11px]">POST /api/webhooks/fingerprint</code>).
              The device admin should register the new staff ID on the device after profile creation.
              Status will update automatically.
            </p>
            <p className="text-[11px] text-ink-muted mt-2">
              HMAC-SHA256 auth per L17. Device contract: Suprema BioStation A2 (OQ3).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stepper progress bar ─────────────────────────────────────────────────────

function StepperBar({ current }: { current: StepId }) {
  return (
    <nav aria-label="Onboarding steps" className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors duration-150',
                  done
                    ? 'bg-success text-white'
                    : active
                    ? 'bg-accent text-white'
                    : 'bg-bg-subtle border border-line text-ink-muted',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <CheckCircle2 size={14} aria-hidden="true" /> : step.id}
              </span>
              <span
                className={cn(
                  'mt-1 text-[10px] whitespace-nowrap',
                  active ? 'text-ink-primary font-medium' : 'text-ink-muted',
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-8 sm:w-12 mx-1 mb-4 transition-colors duration-150',
                  step.id < current ? 'bg-success' : 'bg-line',
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Validation per step ──────────────────────────────────────────────────────

function validateStep(
  step: StepId,
  data: WizardData,
  actorRole: StaffRoleCode,
): Partial<Record<keyof WizardData, string>> {
  const e: Partial<Record<keyof WizardData, string>> = {};
  if (step === 1) {
    if (!data.name.trim()) e.name = 'Full name is required.';
    if (!data.email.trim() || !data.email.includes('@')) e.email = 'Valid work email required.';
  }
  if (step === 2) {
    // L_S7: Manager-tier (R12+) roles require R02+ actor authority.
    if (hasRank(data.role, 'R12') && !hasRank(actorRole, 'R02')) {
      e.role = 'Org Admin (R02) authority required to onboard Manager-tier (R12+) roles.';
    }
  }
  if (step === 4) {
    if (!data.dpdpConsent) e.dpdpConsent = 'DPDP consent is required to proceed (S7 AC).';
  }
  return e;
}

/**
 * Final submit-time RBAC guard (L_S7).
 * Prevents bypass where actor manipulates state client-side after Step 2.
 * Returns an error string if the actor cannot onboard the selected role, null otherwise.
 */
function submitRbacGuard(data: WizardData, actorRole: StaffRoleCode): string | null {
  if (hasRank(data.role, 'R12') && !hasRank(actorRole, 'R02')) {
    return 'Insufficient rank to onboard a Manager-tier role. Org Admin (R02) required.';
  }
  return null;
}

// ─── Access denied component ──────────────────────────────────────────────────

function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle size={28} className="text-warning" aria-hidden="true" />
      <p className="text-ink-muted text-sm">{message}</p>
      <Link href="/staff" className="text-accent text-sm underline">
        Back to Staff Directory
      </Link>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

function OnboardingWizard({ actorRole }: { actorRole: StaffRoleCode }) {
  const router = useRouter();
  const addStaff = useStaffStore((s) => s.addStaff);
  const { toasts, toast, dismiss } = useToast();
  const [step, setStep] = useState<StepId>(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof WizardData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  function patch(update: Partial<WizardData>) {
    setData((d) => ({ ...d, ...update }));
    // Clear errors for updated keys
    const cleared = Object.fromEntries(
      Object.keys(update).map((k) => [k, undefined]),
    );
    setErrors((e) => ({ ...e, ...cleared }));
  }

  function goNext() {
    const errs = validateStep(step, data, actorRole);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (step < 5) setStep((s) => (s + 1) as StepId);
  }

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as StepId);
  }

  function handleSubmit() {
    // L_S7: Final RBAC guard — re-validate at submit time to prevent client-side bypass.
    const rbacError = submitRbacGuard(data, actorRole);
    if (rbacError) {
      toast(rbacError, 'error');
      setStep(2);
      return;
    }

    // Final validation across all steps
    const e1 = validateStep(1, data, actorRole);
    const e2 = validateStep(2, data, actorRole);
    const e4 = validateStep(4, data, actorRole);
    const allErrors = { ...e1, ...e2, ...e4 };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Jump to first failing step
      if (Object.keys(e1).length > 0) setStep(1);
      else if (Object.keys(e2).length > 0) setStep(2);
      else if (Object.keys(e4).length > 0) setStep(4);
      return;
    }

    const now = new Date().toISOString();
    const stateOfPosting: 'KA' | 'MH' | 'TN' =
      data.outlet === 'bangalore' ? 'KA' : data.outlet === 'mumbai' ? 'MH' : 'TN';

    const profile: StaffProfile = {
      id: generateId(data.role),
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim() || undefined,
      avatar: initials(data.name),
      role: data.role,
      roleName: ROLE_NAMES[data.role] ?? data.role,
      department: data.department,
      outlet: data.outlet,
      status: 'ONBOARDING',
      reportsTo: data.reportsTo.trim() || null,
      startDate: now.split('T')[0] ?? '',
      permissions: [],
      // PII fields (L6)
      aadhaarLast4: data.aadhaarLast4 || undefined,
      panMasked: data.panMasked || undefined,
      bankAccountMasked: data.bankAccountLast4 ? `XXXX${data.bankAccountLast4}` : undefined,
      stateOfPosting,
      // DPDP (L7)
      dpdpConsentGiven: data.dpdpConsent,
      dpdpConsentAt: data.dpdpConsent ? now : undefined,
      hrConsentGivenAt: data.dpdpConsent ? now : undefined,
      fingerprintEnrolled: false,
      // Timestamps
      createdAt: now,
      updatedAt: now,
      schemaVersion: 'v1',
    };

    addStaff(profile);
    setSubmitted(true);
    setTimeout(() => router.push('/staff'), 2000);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <CheckCircle2 size={32} className="text-success" aria-hidden="true" />
        <p className="text-[16px] font-semibold text-ink-primary">Staff profile created!</p>
        <p className="text-ink-muted text-sm">Redirecting to staff directory...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-surface="staff">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-6 py-3 border-b border-line text-[12px] text-ink-muted flex-shrink-0">
        <Link href="/staff" className="hover:text-accent transition-colors duration-100">
          Staff
        </Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span className="text-ink-primary">Onboard New Staff</span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-xl mx-auto">
          <h1 className="text-[20px] font-bold text-ink-primary mb-2">Onboard New Staff</h1>
          <p className="text-[13px] text-ink-muted mb-6">
            5-step wizard. DPDP consent and salary scaffold occur at steps 4–5 (L24).
            Salary structure (P2) is configured after onboarding. Role guard: R02+ for R12+ roles.
          </p>

          {/* Stepper */}
          <div className="mb-8 overflow-x-auto">
            <StepperBar current={step} />
          </div>

          {/* Step content */}
          <div className="bg-bg-surface border border-line rounded-xl p-6">
            {step === 1 && <Step1 data={data} onChange={patch} errors={errors} />}
            {step === 2 && <Step2 data={data} onChange={patch} errors={errors} actorRole={actorRole} />}
            {step === 3 && <Step3 data={data} onChange={patch} />}
            {step === 4 && <Step4 data={data} onChange={patch} errors={errors} />}
            {step === 5 && <Step5 data={data} actorRole={actorRole} />}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-line">
              <div>
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1.5 px-3 h-8 text-[13px] text-ink-secondary hover:text-ink-primary border border-line rounded-md transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                    Back
                  </button>
                ) : (
                  <Link
                    href="/staff"
                    className="px-3 h-8 flex items-center text-[13px] text-ink-secondary hover:text-ink-primary border border-line rounded-md transition-colors duration-100"
                  >
                    Cancel
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted">
                  Step {step} of {STEPS.length}
                </span>
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-1.5 px-4 h-8 text-[13px] font-medium bg-accent text-white rounded-md hover:bg-accent/90 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Next
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!data.dpdpConsent}
                    className={cn(
                      'px-4 h-8 text-[13px] font-medium rounded-md transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      data.dpdpConsent
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'bg-bg-subtle text-ink-muted cursor-not-allowed border border-line',
                    )}
                    aria-disabled={!data.dpdpConsent}
                  >
                    Create Staff Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffOnboardPage() {
  const { user } = useStaffAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ink-muted text-sm">Sign in required.</p>
      </div>
    );
  }

  // L_S7: Page gate is R03+ (Outlet Manager). Role-option scoping + submit guard
  // enforce the finer-grained R02+ requirement for manager-tier (R12+) roles.
  if (!hasRank(user.role as StaffRoleCode, 'R03')) {
    return <AccessDenied message="You need Outlet Manager (R03) or higher to onboard new staff." />;
  }

  return <OnboardingWizard actorRole={user.role as StaffRoleCode} />;
}
