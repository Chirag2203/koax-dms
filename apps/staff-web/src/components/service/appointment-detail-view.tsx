'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Calendar,
  MapPin,
} from 'lucide-react';
import { cn } from '@dms/ui';
import { StateChip, ToastContainer, Gate } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { Appointment } from '@dms/types';
import { AppointmentCheckinDialog } from './action-flows/appointment-checkin-dialog';
import { RescheduleAppointmentDialog } from './action-flows/reschedule-appointment-dialog';
import { CancelAppointmentDialog } from './action-flows/cancel-appointment-dialog';
import { useServiceStore } from '@/src/lib/service/service-store';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  breadcrumbService: 'Service',
  breadcrumbAppointments: 'Appointments',
  checkIn: 'Check-In',
  reschedule: 'Reschedule',
  cancelAppointment: 'Cancel Appointment',
  viewJobCard: 'View Job Card',
  details: 'Appointment Details',
  progress: 'Progress',
  customer: 'Customer',
  assignment: 'Assignment',
  advisor: 'Advisor',
  bay: 'Bay',
  na: '—',
} as const;

// ─── Status maps ──────────────────────────────────────────────────────────────

const APT_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  SCHEDULED: 'apt-scheduled',
  CONFIRMED: 'apt-confirmed',
  CHECKED_IN: 'apt-checked-in',
  CANCELLED: 'apt-cancelled',
  NO_SHOW: 'apt-no-show',
};

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

const CUSTOMER_MAP: Record<string, { name: string; phone: string; email: string; phoneDigits: string }> = {
  'customer-001': { name: 'Rohit Malhotra', phone: '+91 98765 ••••1', email: 'r.m••••@gmail.com', phoneDigits: '9876500001' },
  'customer-002': { name: 'Kavitha Nair', phone: '+91 87654 ••••2', email: 'k.n••••@outlook.com', phoneDigits: '8765400002' },
  'customer-003': { name: 'Siddharth Joshi', phone: '+91 76543 ••••3', email: 's.j••••@gmail.com', phoneDigits: '7654300003' },
  'customer-004': { name: 'Divya Menon', phone: '+91 99887 ••••4', email: 'd.m••••@yahoo.com', phoneDigits: '9988700004' },
  'customer-005': { name: 'Arjun Kapoor', phone: '+91 88776 ••••5', email: 'a.k••••@gmail.com', phoneDigits: '8877600005' },
  'customer-006': { name: 'Priya Pillai', phone: '+91 77665 ••••6', email: 'p.p••••@gmail.com', phoneDigits: '7766500006' },
  'customer-007': { name: 'Vikram Bose', phone: '+91 99001 ••••7', email: 'v.b••••@gmail.com', phoneDigits: '9900100007' },
  'customer-008': { name: 'Ananya Singh', phone: '+91 88990 ••••8', email: 'a.s••••@outlook.com', phoneDigits: '8899000008' },
  'customer-009': { name: 'Rajesh Verma', phone: '+91 77889 ••••9', email: 'r.v••••@gmail.com', phoneDigits: '7788900009' },
  'customer-010': { name: 'Meera Nambiar', phone: '+91 66778 ••••0', email: 'm.n••••@gmail.com', phoneDigits: '6677800010' },
};

const ADVISOR_MAP: Record<string, string> = {
  'staff-r09-001': 'Priya Sharma',
  'staff-r09-002': 'Rajesh Kumar',
  'staff-r09-003': 'Deepa Nair',
};

const OUTLET_LABELS: Record<string, string> = {
  'BLR-01': 'Bangalore',
  'MUM-01': 'Mumbai',
  'CHE-01': 'Chennai',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-line last:border-0">
      <span className="text-[12px] text-ink-muted shrink-0">{label}</span>
      <span className="text-[13px] text-ink-primary text-right">{value}</span>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Timeline milestone ───────────────────────────────────────────────────────

interface TimelineMilestone {
  label: string;
  timestamp: string | undefined;
  done: boolean;
}

function ProgressTimeline({ milestones }: { milestones: TimelineMilestone[] }) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[16px] font-semibold text-ink-primary mb-4">{MESSAGES.progress}</h2>
      <div className="relative pl-8">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-line" aria-hidden="true" />
        <div className="space-y-5">
          {milestones.map((m, i) => (
            <div key={i} className="relative flex items-start gap-3">
              <div
                className={cn(
                  'absolute -left-8 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  m.done
                    ? 'bg-accent border-accent text-white'
                    : 'bg-bg-surface border-line',
                )}
                aria-hidden="true"
              >
                {m.done && (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[14px] font-medium', m.done ? 'text-ink-primary' : 'text-ink-muted')}>
                  {m.label}
                </p>
                {m.timestamp && (
                  <p className="font-mono text-[11px] text-ink-muted">{formatDateTime(m.timestamp)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppointmentDetailViewProps {
  appointment: Appointment;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentDetailView({ appointment: initialAppointment }: AppointmentDetailViewProps) {
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // Read live from store
  const storeAppointment = useServiceStore(
    (s) => s.appointments.find((a) => a.id === initialAppointment.id),
  );
  const appointment = storeAppointment ?? initialAppointment;

  // Find linked job card if checked in
  const linkedJC = useServiceStore((s) =>
    s.jobCards.find((jc) =>
      s.timelineEvents.some(
        (e) => e.type === 'appointment_checkin' && e.metadata?.appointmentId === appointment.id && e.jobCardId === jc.id,
      ),
    ),
  );

  const customer = CUSTOMER_MAP[appointment.customerId] ?? {
    name: appointment.customerId,
    phone: '—',
    email: '—',
    phoneDigits: '',
  };

  const isActive = appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED';
  const isCheckedIn = appointment.status === 'CHECKED_IN';
  const isTerminal = appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW';

  const aptLabel = `APT-${appointment.id.replace(/^apt-/i, '').toUpperCase()}`;

  // Timeline milestones derived from appointment state
  const milestones: TimelineMilestone[] = [
    {
      label: 'Appointment Created',
      timestamp: appointment.createdAt,
      done: true,
    },
    {
      label: 'Confirmed',
      timestamp: appointment.status !== 'SCHEDULED' ? appointment.scheduledAt : undefined,
      done: appointment.status !== 'SCHEDULED',
    },
    {
      label: 'Checked In',
      timestamp: isCheckedIn ? appointment.scheduledAt : undefined,
      done: isCheckedIn,
    },
    {
      label: 'Service Complete',
      timestamp: undefined,
      done: false,
    },
  ];

  return (
    <div className="min-h-full bg-bg-canvas">
      <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">

        {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1">
          <Link
            href="/service"
            className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            {MESSAGES.breadcrumbService}
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <Link
            href="/service?tab=appointments"
            className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            {MESSAGES.breadcrumbAppointments}
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[13px] text-ink-primary" aria-current="page">
            {aptLabel}
          </span>
        </nav>

        {/* ── Header row ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-0">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
              {aptLabel}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[15px] text-ink-secondary">{customer.name}</span>
              {appointment.vin && (
                <>
                  <span className="text-ink-muted">·</span>
                  <span className="font-mono text-[13px] text-ink-muted">{maskVin(appointment.vin)}</span>
                </>
              )}
              <span className="text-ink-muted">·</span>
              <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
                {SERVICE_TYPE_LABELS[appointment.serviceTypeId] ?? appointment.serviceTypeId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            <StateChip status={APT_STATUS_TO_CHIP[appointment.status] ?? 'apt-scheduled'} />

            {/* Status-based actions */}
            {isActive && (
              <>
                <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="disable">
                  <button
                    type="button"
                    onClick={() => setCheckinOpen(true)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    {MESSAGES.checkIn}
                  </button>
                </Gate>
                <button
                  type="button"
                  onClick={() => setRescheduleOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {MESSAGES.reschedule}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-state-danger hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.cancelAppointment}
                </button>
              </>
            )}

            {isCheckedIn && linkedJC && (
              <Link
                href={`/service/jobcards/${linkedJC.id}`}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                {MESSAGES.viewJobCard} — {linkedJC.jobNo}
              </Link>
            )}
          </div>
        </div>

        {/* ── Main 70/30 grid ───────────────────────────────────────────────── */}
        <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">

          {/* Left column */}
          <div className="space-y-4">

            {/* Summary card */}
            <div className="rounded-md border border-line bg-bg-surface p-6">
              <h2 className="text-[16px] font-semibold text-ink-primary mb-4">{MESSAGES.details}</h2>
              <div className="space-y-0">
                <DetailRow label="Scheduled At" value={
                  <span className="font-mono text-[13px]">{formatDateTime(appointment.scheduledAt)}</span>
                } />
                <DetailRow label="Customer" value={customer.name} />
                <DetailRow label="Phone" value={
                  <span className="font-mono">{customer.phone}</span>
                } />
                <DetailRow label="Email" value={
                  <span className="font-mono text-[12px]">{customer.email}</span>
                } />
                <DetailRow label="VIN" value={
                  appointment.vin
                    ? <span className="font-mono">{maskVin(appointment.vin)}</span>
                    : MESSAGES.na
                } />
                <DetailRow label="Service Type" value={
                  SERVICE_TYPE_LABELS[appointment.serviceTypeId] ?? appointment.serviceTypeId
                } />
                <DetailRow label="Advisor" value={
                  appointment.advisorId
                    ? (ADVISOR_MAP[appointment.advisorId] ?? appointment.advisorId)
                    : MESSAGES.na
                } />
                <DetailRow label="Bay" value={
                  appointment.bayId ?? MESSAGES.na
                } />
                <DetailRow label="Duration" value={
                  <span className="font-mono text-[12px] text-ink-secondary">
                    {appointment.estimatedDurationMins} mins
                  </span>
                } />
                <DetailRow label="Outlet" value={
                  OUTLET_LABELS[appointment.outletId] ?? appointment.outletId
                } />
                {appointment.notes && (
                  <DetailRow label="Notes" value={
                    <span className="text-[13px] text-ink-secondary max-w-[240px] text-right">{appointment.notes}</span>
                  } />
                )}
              </div>
            </div>

            {/* Progress timeline */}
            <ProgressTimeline milestones={milestones} />

            {/* Linked JC notice when checked in */}
            {isCheckedIn && linkedJC && (
              <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
                <p className="text-[13px] text-ink-secondary">
                  Vehicle checked in.{' '}
                  <Link
                    href={`/service/jobcards/${linkedJC.id}`}
                    className="text-accent hover:underline font-medium"
                  >
                    {linkedJC.jobNo}
                  </Link>
                  {' '}created and in progress.
                </p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="mt-6 lg:mt-0 space-y-3 lg:sticky lg:top-6 lg:self-start">

            {/* Customer contact card */}
            <SidebarCard title={MESSAGES.customer}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-ink-primary">{customer.name}</span>
                <a
                  href={`https://wa.me/91${customer.phoneDigits}?text=${encodeURIComponent('Hi, regarding your service appointment at BN Automobiles.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Send WhatsApp message"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <div className="space-y-1">
                <a
                  href={`tel:+91${customer.phoneDigits}`}
                  aria-label={`Call ${customer.name}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Phone className="h-3 w-3 text-ink-muted shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[12px] text-ink-secondary">{customer.phone}</span>
                </a>
                <a
                  href={`mailto:${customer.email.replace(/••••/g, 'masked')}`}
                  aria-label={`Email ${customer.name}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Mail className="h-3 w-3 text-ink-muted shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[12px] text-ink-secondary">{customer.email}</span>
                </a>
              </div>
            </SidebarCard>

            {/* Assignment card */}
            <SidebarCard title={MESSAGES.assignment}>
              <div className="space-y-0">
                <DetailRow label={MESSAGES.advisor} value={
                  appointment.advisorId
                    ? (ADVISOR_MAP[appointment.advisorId] ?? appointment.advisorId)
                    : MESSAGES.na
                } />
                <DetailRow label={MESSAGES.bay} value={
                  appointment.bayId
                    ? <span className="font-mono text-[12px]">{appointment.bayId.toUpperCase()}</span>
                    : MESSAGES.na
                } />
                <DetailRow label="Outlet" value={
                  OUTLET_LABELS[appointment.outletId] ?? appointment.outletId
                } />
              </div>
            </SidebarCard>

          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

      <AppointmentCheckinDialog
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        appointment={appointment}
      />

      <RescheduleAppointmentDialog
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        appointment={appointment}
        onComplete={() => toast('Appointment rescheduled', 'success')}
      />

      <CancelAppointmentDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        appointmentId={appointment.id}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
