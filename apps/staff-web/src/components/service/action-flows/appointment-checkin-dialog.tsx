'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import type { Appointment, JobCard } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Check-In & Create Job Card',
  labelCustomerVehicle: 'Customer & Vehicle',
  sectionArrival: 'Arrival',
  sectionAssignment: 'Assignment',
  sectionScope: 'Job Card Scope',
  labelOdometer: 'Odometer at Arrival (km)',
  labelBay: 'Assign Bay',
  labelTechnicians: 'Assign Technicians',
  labelAdvisor: 'Service Advisor',
  labelPriority: 'Priority',
  labelPromisedAt: 'Promised By',
  labelCustomerComplaint: 'Customer Complaint',
  labelEstimate: 'Initial Estimate (₹)',
  labelNote: 'Internal Note (optional)',
  notePlaceholder: 'Any additional notes for the job card…',
  complaintPlaceholder: 'Describe the customer\u2019s concerns in their words…',
  cancel: 'Cancel',
  submit: 'Check-In & Create Job Card',
  errorOdometer: 'Odometer reading is required',
  errorComplaint: 'Customer complaint is required (min 5 chars)',
  noFreeBays: 'No free bays — bay assignment skipped',
} as const;

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'annual-service': 'Annual Service',
  'mechanical-repair': 'Mechanical Repair',
  'aesthetic-detailing': 'Detailing',
  'pre-purchase-inspection': 'Pre-Purchase PPI',
  'brake-service': 'Brake Service',
  'electrical-diagnostic': 'Electrical Diag.',
  'body-shop': 'Body Shop',
  'accessory-installation': 'Accessories',
  'wheel-alignment': 'Wheel Alignment',
};

const CUSTOMER_MAP: Record<string, { name: string; phone: string }> = {
  'customer-001': { name: 'Rohit Malhotra', phone: '+91 98765 ••••1' },
  'customer-002': { name: 'Kavitha Nair', phone: '+91 87654 ••••2' },
  'customer-003': { name: 'Siddharth Joshi', phone: '+91 76543 ••••3' },
  'customer-004': { name: 'Divya Menon', phone: '+91 99887 ••••4' },
  'customer-005': { name: 'Arjun Kapoor', phone: '+91 88776 ••••5' },
  'customer-006': { name: 'Priya Pillai', phone: '+91 77665 ••••6' },
  'customer-007': { name: 'Vikram Bose', phone: '+91 99001 ••••7' },
  'customer-008': { name: 'Ananya Singh', phone: '+91 88990 ••••8' },
  'customer-009': { name: 'Rajesh Verma', phone: '+91 77889 ••••9' },
  'customer-010': { name: 'Meera Nambiar', phone: '+91 66778 ••••0' },
};

const TECHNICIAN_OPTIONS = [
  { id: 'tech-r11-001', name: 'K. Kumar' },
  { id: 'tech-r11-002', name: 'R. Patel' },
  { id: 'tech-r11-003', name: 'A. Sharma' },
  { id: 'tech-r11-004', name: 'S. Verma' },
];

const ADVISOR_OPTIONS = [
  { id: 'staff-r09-001', name: 'Priya Sharma (R09)' },
  { id: 'staff-r09-002', name: 'Ravi Kumar (R09)' },
  { id: 'staff-r12-001', name: 'Deepa Rao (R12)' },
];

const PRIORITY_OPTIONS: Array<{ value: JobCard['priority']; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'VIP', label: 'VIP' },
];

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Convert an ISO string to a value suitable for <input type="datetime-local">. */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  // treat as local time
  return new Date(local).toISOString();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppointmentCheckinDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentCheckinDialog({
  open,
  onClose,
  appointment,
}: AppointmentCheckinDialogProps) {
  // Arrival
  const [odometerIn, setOdometerIn] = useState('');
  // Assignment
  const [bayId, setBayId] = useState(appointment.bayId ?? '');
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);
  const [advisorId, setAdvisorId] = useState(appointment.advisorId ?? '');
  // Scope
  const [priority, setPriority] = useState<JobCard['priority']>('NORMAL');
  const [promisedAt, setPromisedAt] = useState(isoToLocalInput(appointment.scheduledAt));
  const [customerComplaint, setCustomerComplaint] = useState(appointment.notes ?? '');
  const [estimatedTotal, setEstimatedTotal] = useState('');
  // Meta
  const [note, setNote] = useState('');
  // Errors
  const [odometerError, setOdometerError] = useState('');
  const [complaintError, setComplaintError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user } = useStaffAuth();
  const bays = useServiceStore((s) => s.bays);
  const checkInAppointment = useServiceStore((s) => s.checkInAppointment);
  const { toasts, toast, dismiss } = useToast();
  const router = useRouter();

  const freeBays = useMemo(() => bays.filter((b) => b.status === 'FREE'), [bays]);
  const customer = CUSTOMER_MAP[appointment.customerId] ?? {
    name: appointment.customerId,
    phone: '—',
  };

  function handleClose() {
    setOdometerIn('');
    setBayId(appointment.bayId ?? '');
    setTechnicianIds([]);
    setAdvisorId(appointment.advisorId ?? '');
    setPriority('NORMAL');
    setPromisedAt(isoToLocalInput(appointment.scheduledAt));
    setCustomerComplaint(appointment.notes ?? '');
    setEstimatedTotal('');
    setNote('');
    setOdometerError('');
    setComplaintError('');
    onClose();
  }

  function toggleTechnician(id: string) {
    setTechnicianIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    let hasError = false;
    if (!odometerIn.trim() || isNaN(Number(odometerIn)) || Number(odometerIn) <= 0) {
      setOdometerError(MESSAGES.errorOdometer);
      hasError = true;
    }
    if (customerComplaint.trim().length < 5) {
      setComplaintError(MESSAGES.errorComplaint);
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    const actor = { id: user?.id ?? 'staff-r24-001', name: user?.name ?? 'Meera Iyer' };

    try {
      const newJC = checkInAppointment(
        appointment.id,
        {
          odometerIn: Number(odometerIn),
          bayId: bayId || undefined,
          technicianIds: technicianIds.length > 0 ? technicianIds : undefined,
          advisorId: advisorId || undefined,
          priority,
          promisedAt: promisedAt ? localInputToIso(promisedAt) : undefined,
          customerComplaint: customerComplaint.trim(),
          estimatedTotal: estimatedTotal.trim()
            ? Math.max(0, Number(estimatedTotal))
            : undefined,
          note: note.trim() || undefined,
        },
        actor,
      );

      toast(`Appointment checked in; job card ${newJC.jobNo} created`, 'success');
      handleClose();
      router.push(`/service/jobcards/${newJC.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  const isDirty =
    odometerIn.length > 0 ||
    technicianIds.length > 0 ||
    estimatedTotal.length > 0 ||
    note.length > 0 ||
    customerComplaint !== (appointment.notes ?? '') ||
    priority !== 'NORMAL';

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={MESSAGES.title}
        subtitle={`APT-${appointment.id.replace(/^apt-/i, '').toUpperCase()}`}
        size="lg"
        dirty={isDirty}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              {MESSAGES.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white',
                'text-sm font-medium hover:bg-accent-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {MESSAGES.submit}
            </button>
          </>
        }
      >
        <div className="space-y-5">

          {/* Customer / Vehicle summary card */}
          <div className="rounded-md border border-line bg-bg-subtle p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted mb-3">
              {MESSAGES.labelCustomerVehicle}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-[11px] text-ink-muted">Customer</p>
                <p className="text-[14px] font-medium text-ink-primary">{customer.name}</p>
              </div>
              <div>
                <p className="text-[11px] text-ink-muted">Phone</p>
                <p className="font-mono text-[13px] text-ink-secondary">{customer.phone}</p>
              </div>
              {appointment.vin && (
                <div>
                  <p className="text-[11px] text-ink-muted">VIN</p>
                  <p className="font-mono text-[13px] text-ink-secondary">{maskVin(appointment.vin)}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-ink-muted">Service Type</p>
                <p className="text-[13px] text-ink-secondary">
                  {SERVICE_TYPE_LABELS[appointment.serviceTypeId] ?? appointment.serviceTypeId}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-ink-muted">Scheduled At</p>
                <p className="font-mono text-[13px] text-ink-secondary">
                  {formatDateTime(appointment.scheduledAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Arrival */}
          <div className="rounded-md border border-line bg-bg-surface p-4 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
              {MESSAGES.sectionArrival}
            </p>

            <div>
              <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                {MESSAGES.labelOdometer} <span className="text-ink-muted">*</span>
              </label>
              <input
                type="number"
                value={odometerIn}
                onChange={(e) => {
                  setOdometerIn(e.target.value);
                  if (odometerError) setOdometerError('');
                }}
                min={0}
                step={1}
                placeholder="e.g. 48200"
                className={cn(
                  'h-10 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary font-mono tabular-nums',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  odometerError ? 'border-state-danger' : 'border-line',
                )}
              />
              {odometerError && (
                <p className="text-xs text-state-danger mt-1">{odometerError}</p>
              )}
            </div>
          </div>

          {/* Section: Assignment */}
          <div className="rounded-md border border-line bg-bg-surface p-4 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
              {MESSAGES.sectionAssignment}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                  {MESSAGES.labelBay}
                </label>
                {freeBays.length === 0 && !bayId ? (
                  <p className="text-[12px] text-ink-muted italic">{MESSAGES.noFreeBays}</p>
                ) : (
                  <select
                    value={bayId}
                    onChange={(e) => setBayId(e.target.value)}
                    className={cn(
                      'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
                      'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                    )}
                  >
                    <option value="">— No bay assigned —</option>
                    {freeBays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} ({b.type}) — {b.outletId}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                  {MESSAGES.labelAdvisor}
                </label>
                <select
                  value={advisorId}
                  onChange={(e) => setAdvisorId(e.target.value)}
                  className={cn(
                    'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  )}
                >
                  <option value="">— Use my account —</option>
                  {ADVISOR_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                {MESSAGES.labelTechnicians}
              </label>
              <div className="flex flex-wrap gap-2">
                {TECHNICIAN_OPTIONS.map((t) => {
                  const active = technicianIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTechnician(t.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        active
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-line bg-bg-subtle text-ink-secondary hover:border-ink-secondary',
                      )}
                    >
                      {active ? '✓ ' : ''}{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Job Card Scope */}
          <div className="rounded-md border border-line bg-bg-surface p-4 space-y-4">
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
              {MESSAGES.sectionScope}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                  {MESSAGES.labelPriority}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as JobCard['priority'])}
                  className={cn(
                    'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  )}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                  {MESSAGES.labelPromisedAt}
                </label>
                <input
                  type="datetime-local"
                  value={promisedAt}
                  onChange={(e) => setPromisedAt(e.target.value)}
                  className={cn(
                    'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary font-mono',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                {MESSAGES.labelCustomerComplaint} <span className="text-ink-muted">*</span>
              </label>
              <textarea
                value={customerComplaint}
                onChange={(e) => {
                  setCustomerComplaint(e.target.value);
                  if (complaintError) setComplaintError('');
                }}
                rows={3}
                placeholder={MESSAGES.complaintPlaceholder}
                className={cn(
                  'w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  complaintError ? 'border-state-danger' : 'border-line',
                )}
              />
              {complaintError && (
                <p className="text-xs text-state-danger mt-1">{complaintError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                {MESSAGES.labelEstimate}
              </label>
              <input
                type="number"
                value={estimatedTotal}
                onChange={(e) => setEstimatedTotal(e.target.value)}
                min={0}
                step={100}
                placeholder="0"
                className={cn(
                  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary font-mono tabular-nums text-right',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                )}
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Optional. Refine later by adding labour &amp; parts lines.
              </p>
            </div>
          </div>

          {/* Confirm note */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
              {MESSAGES.labelNote}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={MESSAGES.notePlaceholder}
              className={cn(
                'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            />
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
