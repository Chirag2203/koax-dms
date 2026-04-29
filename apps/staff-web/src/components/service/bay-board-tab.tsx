'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@dms/ui';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { StateChip, SlideInPanel } from '@/src/components/primitives';
import { Dialog } from '@/src/components/primitives/dialog';
import type { StateChipStatus } from '@/src/components/primitives';
import type { Bay, JobCard, Appointment } from '@dms/types';
import { serviceTypes as serviceTypesFixture } from '@dms/mocks/fixtures';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

const ADVISOR_NAMES: Record<string, string> = {
  'staff-r09-001': 'Priya Sharma',
  'staff-r09-002': 'Rajesh Kumar',
  'staff-r09-003': 'Deepa Nair',
};

// Service type labels — resolved from fixture (single source of truth per spec §6)
const SERVICE_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(serviceTypesFixture.map((st) => [st.id, st.name])),
  // Legacy labels for JCs that predate the fixture-aligned IDs
  'mechanical-repair': 'Mechanical Repair',
  'brake-service': 'Brake Service',
  'electrical-diagnostic': 'Electrical Diag.',
  'body-shop': 'Body Shop',
  'wheel-alignment': 'Wheel Alignment',
};

// ─── Status maps ──────────────────────────────────────────────────────────────

const JC_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  AWAITING_CONFIRMATION: 'svc-awaiting-confirmation',
  RECEIVED: 'svc-received',
  DIAGNOSED: 'svc-diagnosed',
  IN_PROGRESS: 'svc-in-progress',
  WAITING_PARTS: 'svc-waiting-parts',
  ADDITIONAL_WORK_APPROVAL: 'svc-approval',
  QC: 'svc-qc',
  READY_FOR_DELIVERY: 'svc-ready',
  DELIVERED: 'svc-delivered',
  CANCELLED: 'svc-cancelled',
  REOPENED: 'svc-reopened',
};

const BAY_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  FREE: 'bay-free',
  OCCUPIED: 'bay-occupied',
  RESERVED: 'bay-reserved',
  MAINTENANCE: 'bay-maintenance',
};

const APT_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  SCHEDULED: 'apt-scheduled',
  CONFIRMED: 'apt-confirmed',
  CHECKED_IN: 'apt-checked-in',
  CANCELLED: 'apt-cancelled',
  NO_SHOW: 'apt-no-show',
};

// ─── KPI stat card ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  meta?: string;
  href?: string;
}

function StatCard({ label, value, meta, href }: StatCardProps) {
  const inner = (
    <div className="rounded-md border border-line bg-bg-surface p-4 transition-colors hover:bg-bg-subtle">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-[28px] font-semibold leading-[1.25] text-ink-primary tabular-nums">
        {value}
      </p>
      {meta && (
        <p className="mt-0.5 text-[12px] text-ink-muted leading-[1.45]">{meta}</p>
      )}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Assign Existing panel ────────────────────────────────────────────────────

type ToastFn = (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void;

function AssignExistingPanel({
  open,
  onClose,
  bay,
  toast,
}: {
  open: boolean;
  onClose: () => void;
  bay: Bay;
  toast: ToastFn;
}) {
  const { user } = useStaffAuth();
  const jobCards = useServiceStore((s) => s.jobCards);
  const assignBay = useServiceStore((s) => s.assignBay);

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  // JCs without a bay, not delivered/cancelled
  const unassigned = useMemo(
    () =>
      jobCards.filter(
        (jc) =>
          !jc.bayId &&
          !['DELIVERED', 'CANCELLED'].includes(jc.status),
      ),
    [jobCards],
  );

  function handleAssign(jc: JobCard) {
    assignBay(bay.id, jc.id, actor);
    toast(`${jc.jobNo} assigned to ${bay.code}`, 'success');
    onClose();
  }

  return (
    <SlideInPanel open={open} onClose={onClose} title={`Assign job to ${bay.code}`} width="40%">
      <div className="p-4 space-y-2">
        {unassigned.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">No unassigned active job cards.</p>
        ) : (
          unassigned.map((jc) => {
            const chip = JC_STATUS_TO_CHIP[jc.status] ?? 'pending';
            return (
              <div
                key={jc.id}
                className="flex items-center justify-between rounded-md border border-line bg-bg-surface p-3 gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-mono text-[13px] text-ink-primary">{jc.jobNo}</p>
                  <p className="font-mono text-[11px] text-ink-muted">{maskVin(jc.vin)}</p>
                  <div className="flex items-center gap-1.5">
                    <StateChip status={chip} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAssign(jc)}
                  className="h-8 px-3 shrink-0 rounded-md bg-accent text-white text-[12px] font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Assign
                </button>
              </div>
            );
          })
        )}
      </div>
    </SlideInPanel>
  );
}

// ─── Bay card ─────────────────────────────────────────────────────────────────

interface BayCardProps {
  bay: Bay;
  jobCard?: JobCard;
  linkedAppointment?: Appointment;
  toast: ToastFn;
}

function BayCard({ bay, jobCard, linkedAppointment, toast }: BayCardProps) {
  const { user } = useStaffAuth();
  const freeBayAction = useServiceStore((s) => s.freeBay);
  const bayChip = BAY_STATUS_TO_CHIP[bay.status] ?? 'pending';

  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showReservedDialog, setShowReservedDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  function handleFreeBay() {
    freeBayAction(bay.id, actor);
    toast(`${bay.code} marked free`, 'success');
    setShowReservedDialog(false);
    setShowMaintenanceDialog(false);
  }

  if (bay.status === 'FREE') {
    return (
      <>
        <AssignExistingPanel
          open={showAssignPanel}
          onClose={() => setShowAssignPanel(false)}
          bay={bay}
          toast={toast}
        />
        <div className="rounded-md border border-dashed border-line-strong bg-bg-surface p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] font-semibold text-ink-primary tracking-wide">
              {bay.code}
            </span>
            <StateChip status={bayChip} />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center py-3 gap-2">
            <p className="text-[13px] text-ink-muted">Available</p>
            <Link
              href={`/service/jobcards/new?bay=${bay.code}`}
              className={cn(
                'inline-flex items-center justify-center w-full h-9 rounded-md bg-accent text-white text-[12px] font-medium',
                'hover:bg-accent-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Create Job Card
            </Link>
            <button
              type="button"
              onClick={() => setShowAssignPanel(true)}
              className={cn(
                'inline-flex items-center justify-center w-full h-8 rounded-md border border-line',
                'bg-bg-surface text-ink-secondary text-[12px] hover:bg-bg-subtle transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Assign Existing
            </button>
          </div>
        </div>
      </>
    );
  }

  if (bay.status === 'RESERVED') {
    const aptId = linkedAppointment?.id;
    const aptTime = linkedAppointment?.scheduledAt ? formatTime(linkedAppointment.scheduledAt) : '—';

    return (
      <>
        <button
          type="button"
          onClick={() => setShowReservedDialog(true)}
          className="w-full text-left rounded-md border border-line bg-bg-surface p-3 flex flex-col gap-2 hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] font-semibold text-ink-primary tracking-wide">
              {bay.code}
            </span>
            <StateChip status={bayChip} />
          </div>
          <p className="text-[13px] text-ink-muted italic">Reserved — upcoming appointment</p>
          {aptId && (
            <p className="text-[12px] text-ink-muted font-mono">
              APT at {aptTime}
            </p>
          )}
          {bay.advisorId && (
            <p className="text-[12px] text-ink-muted">
              Advisor: {ADVISOR_NAMES[bay.advisorId] ?? bay.advisorId}
            </p>
          )}
        </button>

        <Dialog
          open={showReservedDialog}
          onClose={() => setShowReservedDialog(false)}
          title={`Bay ${bay.code} — Reserved`}
          size="sm"
          footer={
            <button
              type="button"
              onClick={() => setShowReservedDialog(false)}
              className="h-9 px-4 rounded-md border border-line text-sm font-medium text-ink-secondary hover:bg-bg-subtle transition-colors"
            >
              Close
            </button>
          }
        >
          <div className="space-y-4">
            <p className="text-[14px] text-ink-secondary">
              Bay reserved{aptId ? ` for appointment ${aptId}` : ''} at {aptTime}.
            </p>
            <div className="flex flex-col gap-2">
              {aptId && (
                <Link
                  href={`/service/jobcards/new?bay=${bay.code}&appointmentId=${aptId}`}
                  onClick={() => setShowReservedDialog(false)}
                  className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Convert to Job Card Now
                </Link>
              )}
              <button
                type="button"
                onClick={handleFreeBay}
                className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-line text-sm font-medium text-ink-secondary hover:bg-bg-subtle transition-colors"
              >
                Free Bay
              </button>
            </div>
          </div>
        </Dialog>
      </>
    );
  }

  if (bay.status === 'MAINTENANCE') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowMaintenanceDialog(true)}
          className="w-full text-left rounded-md border border-line bg-bg-surface p-3 flex flex-col gap-2 hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] font-semibold text-ink-primary tracking-wide">
              {bay.code}
            </span>
            <StateChip status={bayChip} />
          </div>
          <p className="text-[13px] text-ink-muted italic">Under maintenance</p>
        </button>

        <Dialog
          open={showMaintenanceDialog}
          onClose={() => setShowMaintenanceDialog(false)}
          title={`Bay ${bay.code} — Maintenance`}
          size="sm"
          footer={
            <button
              type="button"
              onClick={() => setShowMaintenanceDialog(false)}
              className="h-9 px-4 rounded-md border border-line text-sm font-medium text-ink-secondary hover:bg-bg-subtle transition-colors"
            >
              Close
            </button>
          }
        >
          <div className="space-y-4">
            <p className="text-[14px] text-ink-secondary">
              This bay is currently under maintenance.
            </p>
            <button
              type="button"
              onClick={handleFreeBay}
              className="inline-flex items-center justify-center w-full h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Mark Free
            </button>
          </div>
        </Dialog>
      </>
    );
  }

  // OCCUPIED
  if (!jobCard) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-semibold text-ink-primary tracking-wide">
            {bay.code}
          </span>
          <StateChip status={bayChip} />
        </div>
        <p className="mt-2 text-[12px] text-ink-muted">Job card data loading…</p>
      </div>
    );
  }

  const jcChip = JC_STATUS_TO_CHIP[jobCard.status] ?? 'pending';

  return (
    <Link
      href={`/service/jobcards/${jobCard.id}`}
      className={cn(
        'block rounded-md border border-line bg-bg-surface p-3 transition-colors',
        'hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-semibold text-ink-primary tracking-wide">
          {bay.code}
        </span>
        <StateChip status={bayChip} />
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-[11px] text-ink-muted">{jobCard.jobNo}</span>
          <StateChip status={jcChip} />
        </div>
        <p className="text-[13px] font-medium text-ink-primary truncate">
          {maskVin(jobCard.vin)}
        </p>
        {jobCard.technicianIds[0] && (
          <p className="text-[12px] text-ink-muted truncate">
            Tech: {jobCard.technicianIds[0]}
          </p>
        )}
        {jobCard.promisedAt && (
          <p className="text-[11px] text-ink-muted">
            ETA: {formatTime(jobCard.promisedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Awaiting Confirmation card ───────────────────────────────────────────────

interface AwaitingConfirmationCardProps {
  jc: JobCard;
  toast: ToastFn;
}

function AwaitingConfirmationCard({ jc, toast }: AwaitingConfirmationCardProps) {
  const { user } = useStaffAuth();
  const confirmPortalBooking = useServiceStore((s) => s.confirmPortalBooking);
  const declinePortalBooking = useServiceStore((s) => s.declinePortalBooking);

  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  function handleConfirm() {
    confirmPortalBooking(jc.id, actor);
    toast(`${jc.jobNo} confirmed — moved to Received`, 'success');
  }

  function handleDecline() {
    if (!declineReason.trim()) return;
    declinePortalBooking(jc.id, declineReason.trim(), actor);
    toast(`${jc.jobNo} declined`, 'warning');
    setShowDeclineDialog(false);
    setDeclineReason('');
  }

  const serviceLabel = jc.serviceTypeId
    ? (SERVICE_TYPE_LABELS[jc.serviceTypeId] ?? jc.serviceTypeId)
    : '—';

  return (
    <>
      <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-[11px] font-semibold text-ink-primary tracking-wide">
            {jc.jobNo}
          </span>
          <StateChip status="svc-awaiting-confirmation" />
        </div>
        <p className="font-mono text-[11px] text-ink-muted">{maskVin(jc.vin)}</p>
        <p className="text-[12px] text-ink-secondary">{serviceLabel}</p>
        {jc.scheduledDate && (
          <p className="font-mono text-[10px] text-ink-muted">
            {jc.scheduledDate} · {jc.scheduledSlot === 'MORNING' ? '09:00–12:00' : '13:00–17:00'}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              'flex-1 h-7 rounded-md bg-green-600 text-white text-[11px] font-medium',
              'hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
            )}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowDeclineDialog(true)}
            className={cn(
              'flex-1 h-7 rounded-md border border-red-300 text-red-600 text-[11px] font-medium',
              'hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
            )}
          >
            Decline
          </button>
        </div>
      </div>

      {/* Decline dialog */}
      <Dialog
        open={showDeclineDialog}
        onClose={() => { setShowDeclineDialog(false); setDeclineReason(''); }}
        title={`Decline booking — ${jc.jobNo}`}
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDecline}
              disabled={!declineReason.trim()}
              className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Decline booking
            </button>
            <button
              type="button"
              onClick={() => { setShowDeclineDialog(false); setDeclineReason(''); }}
              className="h-9 px-4 rounded-md border border-line text-sm font-medium text-ink-secondary hover:bg-bg-subtle transition-colors"
            >
              Cancel
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-ink-secondary">
            The customer will be notified with your reason. Please be clear and helpful.
          </p>
          <label className="block text-[12px] font-medium text-ink-secondary" htmlFor="decline-reason">
            Reason for declining *
          </label>
          <textarea
            id="decline-reason"
            rows={3}
            placeholder="e.g. No available slots on this date — please rebook for next week."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 text-sm text-ink-primary bg-bg-surface resize-none focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </Dialog>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BayBoardTab() {
  const { toasts, toast, dismiss } = useToast();

  const bays         = useServiceStore((s) => s.bays);
  const jobCards     = useServiceStore((s) => s.jobCards);
  const appointments = useServiceStore((s) => s.appointments);

  // Build a map of jobCardId → jobCard for fast lookup
  const jcMap = useMemo(() => {
    const map: Record<string, JobCard> = {};
    for (const jc of jobCards) {
      map[jc.id] = jc;
    }
    return map;
  }, [jobCards]);

  // Build a map of bayId → appointment for RESERVED bays
  const bayAptMap = useMemo(() => {
    const map: Record<string, Appointment> = {};
    for (const apt of appointments) {
      if (apt.bayId && apt.status !== 'CANCELLED') {
        map[apt.bayId] = apt;
      }
    }
    return map;
  }, [appointments]);

  // ── KPI computations ──────────────────────────────────────────────────

  const baysOccupied = bays.filter((b) => b.status === 'OCCUPIED').length;
  const baysTotal    = bays.length;

  const activeJcCount = jobCards.filter(
    (jc) => !['DELIVERED', 'CANCELLED'].includes(jc.status),
  ).length;

  const readyForDelivery = jobCards.filter(
    (jc) => jc.status === 'READY_FOR_DELIVERY',
  ).length;

  // SPEC-CUSTOMER-PORTAL-002 §5.1 — portal bookings awaiting SA confirmation
  const awaitingConfirmationJcs = useMemo(
    () => jobCards.filter((jc) => jc.status === 'AWAITING_CONFIRMATION'),
    [jobCards],
  );

  // Appointments within next 48h and in active status
  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    return appointments
      .filter((apt) => {
        const scheduledMs = new Date(apt.scheduledAt).getTime();
        const inWindow = scheduledMs >= now && scheduledMs <= now + fortyEightHours;
        return (
          inWindow &&
          ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'].includes(apt.status)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
  }, [appointments]);

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="px-6 py-5 space-y-6">

        {/* ── KPI strip ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Bays Occupied"
            value={`${baysOccupied}/${baysTotal}`}
            meta={baysTotal > 0 ? `${Math.round((baysOccupied / baysTotal) * 100)}% utilisation` : undefined}
          />
          <StatCard
            label="Active Job Cards"
            value={String(activeJcCount)}
            meta="Excluding delivered"
            href="/service?tab=jobcards"
          />
          <StatCard
            label="Ready for Delivery"
            value={String(readyForDelivery)}
            meta={readyForDelivery > 0 ? 'Awaiting customer pickup' : 'None pending'}
            href="/service?tab=jobcards&view=ready"
          />
          <StatCard
            label="Upcoming Appts (48h)"
            value={String(upcomingAppointments.length)}
            meta="Scheduled + Confirmed"
          />
          {/* SPEC-CUSTOMER-PORTAL-002 §5.1 */}
          <StatCard
            label="Awaiting Confirmation"
            value={String(awaitingConfirmationJcs.length)}
            meta={awaitingConfirmationJcs.length > 0 ? 'Portal bookings — action needed' : 'No pending portal bookings'}
          />
        </div>

        {/* ── Awaiting Confirmation swim lane ────────────────────────────────── */}
        {awaitingConfirmationJcs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary">
                Awaiting Confirmation
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-mono text-[10px] uppercase tracking-widest font-semibold">
                {awaitingConfirmationJcs.length} portal {awaitingConfirmationJcs.length === 1 ? 'booking' : 'bookings'}
              </span>
            </div>
            <p className="text-[12px] text-ink-muted mb-3">
              These bookings were submitted by customers via the portal. Confirm to move to Received, or Decline with a reason.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {awaitingConfirmationJcs.map((jc) => (
                <AwaitingConfirmationCard key={jc.id} jc={jc} toast={toast} />
              ))}
            </div>
          </div>
        )}

        {/* ── Bay grid ───────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary mb-3">
            Bay Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {bays.map((bay) => (
              <BayCard
                key={bay.id}
                bay={bay}
                jobCard={
                  bay.currentJobCardId ? jcMap[bay.currentJobCardId] : undefined
                }
                linkedAppointment={bayAptMap[bay.id]}
                toast={toast}
              />
            ))}
          </div>
        </div>

        {/* ── Upcoming Appointments ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary mb-3">
            Upcoming Appointments (next 48h)
          </h2>
          <div className="rounded-md border border-line bg-bg-surface">
            {upcomingAppointments.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-ink-muted">No upcoming appointments in the next 48 hours.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      {['Time', 'VIN', 'Service Type', 'Advisor', 'Status', 'Action'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingAppointments.map((apt, idx) => {
                      const aptChip = APT_STATUS_TO_CHIP[apt.status] ?? 'pending';
                      return (
                        <tr
                          key={apt.id}
                          className={cn(
                            'border-b border-line last:border-b-0',
                            idx % 2 === 1 ? 'bg-bg-subtle/30' : '',
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-[13px] font-semibold text-ink-primary tabular-nums whitespace-nowrap">
                            {formatDateTime(apt.scheduledAt)}
                          </td>
                          <td className="px-4 py-3 font-mono text-[12px] text-ink-muted whitespace-nowrap">
                            {apt.vin ? maskVin(apt.vin) : '—'}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-ink-primary whitespace-nowrap">
                            {SERVICE_TYPE_LABELS[apt.serviceTypeId] ?? apt.serviceTypeId}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-ink-secondary whitespace-nowrap">
                            {apt.advisorId ? (ADVISOR_NAMES[apt.advisorId] ?? apt.advisorId) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StateChip status={aptChip} />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/service/appointments/${apt.id}`}
                              className={cn(
                                'text-[12px] text-accent hover:underline',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded',
                              )}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
