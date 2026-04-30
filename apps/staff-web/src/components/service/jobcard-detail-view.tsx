'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';
import { isUpgradeReady } from '@/src/lib/service-to-sale/upgrade-eligibility';
import type { VehicleRecall } from '@/src/lib/service-to-sale/upgrade-eligibility';
import { maskedContactFor } from '@dms/vehicles-core';
import { ROLE_RANK } from '@/src/lib/vehicles/state-machine';
import {
  ChevronRight,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  StickyNote,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@dms/ui';
import {
  StateChip,
  VinBadge,
  OutletPill,
  Gate,
  ToastContainer,
} from '@/src/components/primitives';
import type { StateChipStatus, OutletCode } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { JobCard, JobCardStatus, JobCardPriority } from '@dms/types';
import { JobCardOverviewTab } from './tabs/jobcard-overview-tab';
import { JobCardLabourTab } from './tabs/jobcard-labour-tab';
import { JobCardPartsTab } from './tabs/jobcard-parts-tab';
import { JobCardInspectionTab } from './tabs/jobcard-inspection-tab';
import { JobCardTimelineTab } from './tabs/jobcard-timeline-tab';
import { JobCardInvoicePreviewTab } from './tabs/jobcard-invoice-preview-tab';
import { UpdateStatusDialog } from './action-flows/update-status-dialog';
import { JobCardMoreActionsMenu } from './action-flows/jobcard-more-actions-menu';
import { AddNoteDialog } from './action-flows/add-note-dialog';
import { ReopenJobCardDialog } from './action-flows/reopen-jobcard-dialog';
import { NotesPanel } from './side-panels/notes-panel';
import { PhotosPanel } from './side-panels/photos-panel';
import { AttachmentsPanel } from './side-panels/attachments-panel';
import { CommunicationsPanel } from './side-panels/communications-panel';

// ─── Messages ─────────────────────────────────────────────────────────────────

// ─── Stub recall data (L2: real feed is DEF-SERVICE-SALE-1) ──────────────────
// VINs listed here have known open recalls in the fixture dataset for demo purposes.
const STUB_RECALLS: VehicleRecall[] = [
  {
    id: 'recall-001',
    vin: 'WP0AAA1X8PSA12345',   // Porsche Taycan — fictitious airbag recall
    title: 'Airbag Inflator Recall',
    issuedAt: '2025-11-20',
    status: 'OPEN',
    description: 'Potential airbag inflator rupture under high humidity conditions.',
  },
  {
    id: 'recall-002',
    vin: 'WDD2221971A012345',    // Mercedes-Benz S-Class — fictitious software recall
    title: 'MBUX Software Update',
    issuedAt: '2026-01-15',
    status: 'OPEN',
    description: 'Infotainment system may freeze under certain navigation conditions.',
  },
];

// ─── Upgrade reason → chip label ──────────────────────────────────────────────
const UPGRADE_REASON_LABEL: Record<string, string> = {
  'age-over-5y':  'Vehicle >5 years',
  'km-over-70k':  '>70,000 km',
  'open-recall':  'Open recall',
};

const MESSAGES = {
  breadcrumbService: 'Service',
  breadcrumbJobCards: 'Job Cards',
  updateStatus: 'Update Status',
  addNote: 'Add Note',
  markDiagnosed: 'Mark Diagnosed',
  startWork: 'Start Work',
  sendToQc: 'Send to QC',
  markReadyForDelivery: 'Mark Ready for Delivery',
  markDelivered: 'Mark Delivered',
  generateInvoice: 'Generate Invoice',
  reopenRework: 'Reopen for Rework',
  resolve: 'Resolve',
  waitingPartsMsg: 'Job card is blocked — waiting for parts to arrive before work can resume.',
  approvalMsg: 'Awaiting customer approval for additional work discovered during service.',
  upgradeReadyTitle: "Customer's vehicle is upgrade-ready",
  upgradeReadyCta: 'Create sales lead',
  upgradeLeadCreated: 'Sales lead created for',
  upgradeLeadFallback: 'Lead funnel ships in B1 — would create lead for',
  odometerIn: 'Odometer In',
  promisedBy: 'Promised By',
  estimate: 'Estimate',
  labourProgress: 'Labour Progress',
  overdue: 'OVERDUE',
  customer: 'Customer',
  vehicle: 'Vehicle',
  assignment: 'Assignment',
  advisor: 'Advisor',
  technicians: 'Technicians',
  bay: 'Bay',
  promisedAt: 'Promised At',
  warrantyLink: 'View Warranty Claim',
  photos: 'Photos',
  attachments: 'Attachments',
  notes: 'Notes',
  quickActions: 'Quick Actions',
  communications: 'Communications',
  viewAll: 'View all',
} as const;

// ─── Tab config ───────────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'labour' | 'parts' | 'inspection' | 'timeline' | 'invoice-preview';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'labour', label: 'Labour' },
  { id: 'parts', label: 'Parts' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'invoice-preview', label: 'Invoice Preview' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()} · ${hour}:${min}`;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function isOverdue(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}

// ─── Status → chip ────────────────────────────────────────────────────────────

const STATUS_TO_CHIP: Record<JobCardStatus, StateChipStatus> = {
  AWAITING_CONFIRMATION: 'svc-awaiting-confirmation', // SPEC-CUSTOMER-PORTAL-002
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

const PRIORITY_TO_CHIP: Record<JobCardPriority, StateChipStatus> = {
  LOW: 'priority-low',
  NORMAL: 'priority-normal',
  HIGH: 'priority-high',
  VIP: 'priority-vip',
};

// ─── Customer + Staff name maps ───────────────────────────────────────────────

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

const TECH_MAP: Record<string, string> = {
  'tech-r11-001': 'K. Kumar',
  'tech-r11-002': 'R. Patel',
  'tech-r11-003': 'A. Sharma',
  'tech-r11-004': 'S. Verma',
};

const OUTLET_MAP: Record<string, OutletCode> = {
  'BLR-01': 'bangalore',
  'MUM-01': 'mumbai',
  'CHE-01': 'chennai',
};

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  call: 'Call',
  email: 'Email',
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardDetailViewProps {
  jobCard: JobCard;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-line last:border-0">
      <span className="text-[12px] text-ink-muted shrink-0">{label}</span>
      <span className="text-[13px] text-ink-primary text-right">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JobCardDetailView({ jobCard: initialJobCard }: JobCardDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [photosPanelOpen, setPhotosPanelOpen] = useState(false);
  const [attachmentsPanelOpen, setAttachmentsPanelOpen] = useState(false);
  const [commsPanelOpen, setCommsPanelOpen] = useState(false);

  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // Read job card from store (falls back to initialJobCard for SSR)
  const storeJobCard = useServiceStore(
    (s) => s.jobCards.find((jc) => jc.id === initialJobCard.id),
  );
  const jobCard = storeJobCard ?? initialJobCard;

  // Store-backed data
  const allAdvisorNotes = useServiceStore((s) => s.advisorNotes);
  const allTimelineEvents = useServiceStore((s) => s.timelineEvents);
  const allCommunications = useServiceStore((s) => s.communications);
  const setJobCardStatus = useServiceStore((s) => s.setJobCardStatus);
  const logCommunication = useServiceStore((s) => s.logCommunication);

  // Look up the real customer from the store for contact masking (PLAN-VEHICLES-002 §E)
  const storeCustomer = useCustomersStore((s) => s.customers[jobCard.customerId]);
  const viewerRank = ROLE_RANK[user?.role ?? ''] ?? 0;
  const contact = storeCustomer
    ? maskedContactFor(storeCustomer, viewerRank)
    : { phone: '', email: '', isMasked: false };

  const notes = allAdvisorNotes.filter((n) => n.jobCardId === jobCard.id);
  const timeline = allTimelineEvents.filter((e) => e.jobCardId === jobCard.id);
  const recentComms = allCommunications
    .filter((c) => c.jobCardId === jobCard.id)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, 3);

  const customer = CUSTOMER_MAP[jobCard.customerId] ?? {
    name: jobCard.customerId,
    phone: '—',
    email: '—',
    phoneDigits: '',
  };
  // Use masked contact values from the store if available; fall back to CUSTOMER_MAP
  const displayPhone = storeCustomer ? (contact.phone || '—') : customer.phone;
  const displayEmail = storeCustomer ? (contact.email || '—') : customer.email;
  const outletCode = OUTLET_MAP[jobCard.outletId] ?? 'bangalore';
  const advisorName = ADVISOR_MAP[jobCard.advisorId] ?? jobCard.advisorId;

  // Labour progress
  const totalLabour = jobCard.labourLines.length;
  const doneLabour = jobCard.labourLines.filter((l) => l.status === 'DONE').length;
  const labourPct = totalLabour > 0 ? Math.round((doneLabour / totalLabour) * 100) : 0;
  const allLabourDone = totalLabour > 0 && doneLabour === totalLabour;

  const isBlocked =
    jobCard.status === 'WAITING_PARTS' || jobCard.status === 'ADDITIONAL_WORK_APPROVAL';

  // ─── Upgrade-readiness computation (SPEC-SERVICE-SALE-001 §5, L11) ──────────
  // L11: Look up VehicleMaster by VIN for age check. null if not in store.
  const vehicleMaster = useVehiclesStore((s) => s.vehicles[jobCard.vin] ?? null);
  const upgradeVehicleInfo = vehicleMaster ? { year: vehicleMaster.year } : null;
  const upgradeResult = isUpgradeReady(upgradeVehicleInfo, jobCard, STUB_RECALLS);

  // ─── Create lead handler (Seam 30) ──────────────────────────────────────────
  // Per user direction (2026-04-30): leads live entirely inside the sales
  // module. Calls useSalesDealsStore.createLeadFromService() directly.
  function handleCreateSalesLead() {
    try {
      const vehicleName = vehicleMaster
        ? `${vehicleMaster.year} ${vehicleMaster.make} ${vehicleMaster.model}`
        : `Vehicle ${jobCard.vin}`;
      useSalesDealsStore.getState().createLeadFromService({
        customerId: jobCard.customerId,
        customerName: customer.name,
        customerPhone: customer.phone ?? '',
        vehicleVin: jobCard.vin,
        vehicleName,
        outletId: jobCard.outletId,
        city: jobCard.outletId,
        sourceJobCardId: jobCard.id,
      });
      toast(`${MESSAGES.upgradeLeadCreated} ${customer.name}`, 'success');
    } catch (e) {
      console.error('[service-to-sale] Failed to create sales lead:', e);
      toast(`${MESSAGES.upgradeLeadFallback} ${customer.name}`, 'error');
    }
  }

  const actor = { id: user?.id ?? 'staff-r24-001', name: user?.name ?? 'Meera Iyer' };

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      'Hi, reaching you regarding your service request.',
    );
    window.open(
      `https://wa.me/91${customer.phoneDigits}?text=${msg}`,
      '_blank',
      'noopener,noreferrer',
    );
    logCommunication(jobCard.id, { channel: 'whatsapp', template: 'adhoc', actorId: actor.id }, actor);
  }

  function handlePhone() {
    logCommunication(jobCard.id, { channel: 'call', template: 'adhoc', actorId: actor.id }, actor);
  }

  function handleEmail() {
    logCommunication(jobCard.id, { channel: 'email', template: 'adhoc', actorId: actor.id }, actor);
  }

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
            href="/service?tab=jobcards"
            className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            {MESSAGES.breadcrumbJobCards}
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[13px] text-ink-primary" aria-current="page">
            {jobCard.jobNo}
          </span>
        </nav>

        {/* ── Header row ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-0">
          {/* Left block */}
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
              {jobCard.jobNo}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[15px] text-ink-secondary">{customer.name}</span>
              <span className="text-ink-muted">·</span>
              <VinBadge vin={jobCard.vin} masked size="sm" />
              <OutletPill outlet={outletCode} />
            </div>
          </div>

          {/* Right block */}
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            <StateChip status={STATUS_TO_CHIP[jobCard.status]} />
            <StateChip status={PRIORITY_TO_CHIP[jobCard.priority]} />

            {/* State-specific primary CTA */}
            {jobCard.status === 'RECEIVED' && (
              <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  onClick={() => setUpdateStatusOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.markDiagnosed}
                </button>
              </Gate>
            )}
            {jobCard.status === 'DIAGNOSED' && (
              <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  onClick={() => setUpdateStatusOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.startWork}
                </button>
              </Gate>
            )}
            {jobCard.status === 'IN_PROGRESS' && allLabourDone && (
              <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  onClick={() => setUpdateStatusOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.sendToQc}
                </button>
              </Gate>
            )}
            {jobCard.status === 'QC' && (
              <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  onClick={() => setUpdateStatusOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.markReadyForDelivery}
                </button>
              </Gate>
            )}
            {jobCard.status === 'READY_FOR_DELIVERY' && (
              <Gate role={['R19', 'R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  onClick={() => setUpdateStatusOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.markDelivered}
                </button>
              </Gate>
            )}
            {jobCard.status === 'DELIVERED' && (
              <>
                <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
                  <button
                    type="button"
                    onClick={() => {
                      toast('Invoice generation opens in Finance module (coming in S6)', 'info');
                    }}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {MESSAGES.generateInvoice}
                  </button>
                </Gate>
                <Gate role={['R19', 'R22', 'R24']} fallback="hide">
                  <button
                    type="button"
                    onClick={() => setReopenOpen(true)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {MESSAGES.reopenRework}
                  </button>
                </Gate>
              </>
            )}

            {/* Update Status (unless delivered/cancelled) */}
            {jobCard.status !== 'DELIVERED' && jobCard.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => setUpdateStatusOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {MESSAGES.updateStatus}
              </button>
            )}

            {/* Add Note */}
            <button
              type="button"
              onClick={() => setAddNoteOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
              {MESSAGES.addNote}
            </button>

            <JobCardMoreActionsMenu
              jobCard={jobCard}
              onActionComplete={() => toast('Action completed', 'info')}
            />
          </div>
        </div>

        {/* ── Upgrade-ready banner (SPEC-SERVICE-SALE-001 §6, L6, L7) ────── */}
        {/* L6: renders above the action bar (above blocked-state banners)    */}
        {/* L7: Gate role R09+ — hidden from R11 Technicians and below         */}
        {upgradeResult.ready && (
          <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
            <div
              className="mt-4 flex items-start justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-3"
              role="alert"
              aria-label="Vehicle upgrade-ready notification"
              data-testid="upgrade-ready-banner"
            >
              <div className="flex items-start gap-3 min-w-0">
                <TrendingUp
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary">
                    {MESSAGES.upgradeReadyTitle}
                  </p>
                  {/* L8: all reason chips rendered */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {upgradeResult.reasons.map((reason) => (
                      <span
                        key={reason}
                        data-testid={`upgrade-reason-chip-${reason}`}
                        className="inline-flex items-center rounded-sm bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                      >
                        {UPGRADE_REASON_LABEL[reason] ?? reason}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateSalesLead}
                data-testid="create-lead-cta"
                className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                {MESSAGES.upgradeReadyCta}
              </button>
            </div>
          </Gate>
        )}

        {/* ── Blocked state banners ────────────────────────────────────────── */}
        {isBlocked && (
          <div
            className="mt-4 flex items-start justify-between gap-3 rounded-md border border-line bg-bg-subtle px-4 py-3"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
              <p className="text-[13px] text-ink-secondary">
                {jobCard.status === 'WAITING_PARTS'
                  ? MESSAGES.waitingPartsMsg
                  : MESSAGES.approvalMsg}
              </p>
            </div>
            <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setUpdateStatusOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {MESSAGES.resolve}
              </button>
            </Gate>
          </div>
        )}

        {/* ── KPI strip ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-0 pt-5">
          {/* Odometer In */}
          <div className="rounded-md border border-line bg-bg-surface p-4">
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-1">
              {MESSAGES.odometerIn}
            </p>
            <p className="font-mono text-[18px] font-semibold tabular-nums text-ink-primary">
              {jobCard.odometerIn.toLocaleString('en-IN')} km
            </p>
          </div>

          {/* Promised By */}
          <div className="rounded-md border border-line bg-bg-surface p-4">
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-1">
              {MESSAGES.promisedBy}
            </p>
            <p
              className={cn(
                'text-[14px] font-medium',
                isOverdue(jobCard.promisedAt)
                  ? 'text-state-danger'
                  : 'text-ink-primary',
              )}
            >
              {isOverdue(jobCard.promisedAt) && (
                <span className="font-mono text-[11px] uppercase tracking-wider mr-1.5">
                  {MESSAGES.overdue}
                </span>
              )}
              {formatDate(jobCard.promisedAt)}
            </p>
          </div>

          {/* Estimate */}
          <div className="rounded-md border border-line bg-bg-surface p-4">
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-1">
              {MESSAGES.estimate}
            </p>
            <p className="font-mono text-[18px] font-semibold tabular-nums text-ink-primary">
              {INR.format(jobCard.estimatedTotal)}
            </p>
          </div>

          {/* Labour Progress */}
          <div className="rounded-md border border-line bg-bg-surface p-4">
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-1">
              {MESSAGES.labourProgress}
            </p>
            <p className="font-mono text-[18px] font-semibold tabular-nums text-ink-primary">
              {doneLabour}/{totalLabour}
              <span className="text-[13px] font-normal text-ink-muted ml-2">lines</span>
            </p>
            {totalLabour > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${labourPct}%` }}
                  role="progressbar"
                  aria-valuenow={labourPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${labourPct}% labour complete`}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div
          className="mt-6 flex items-end gap-0 border-b border-line"
          role="tablist"
          aria-label="Job card detail tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                activeTab === tab.id
                  ? 'text-ink-primary'
                  : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm bg-accent"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Content: 70/30 split ─────────────────────────────────────────── */}
        <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
          {/* Main tab content */}
          <div>
            <div
              role="tabpanel"
              id="panel-overview"
              aria-labelledby="tab-overview"
              hidden={activeTab !== 'overview'}
            >
              {activeTab === 'overview' && (
                <JobCardOverviewTab
                  jobCard={jobCard}
                  notes={notes}
                  timeline={timeline}
                />
              )}
            </div>

            <div
              role="tabpanel"
              id="panel-labour"
              aria-labelledby="tab-labour"
              hidden={activeTab !== 'labour'}
            >
              {activeTab === 'labour' && <JobCardLabourTab jobCard={jobCard} />}
            </div>

            <div
              role="tabpanel"
              id="panel-parts"
              aria-labelledby="tab-parts"
              hidden={activeTab !== 'parts'}
            >
              {activeTab === 'parts' && <JobCardPartsTab jobCard={jobCard} />}
            </div>

            <div
              role="tabpanel"
              id="panel-inspection"
              aria-labelledby="tab-inspection"
              hidden={activeTab !== 'inspection'}
            >
              {activeTab === 'inspection' && (
                <JobCardInspectionTab
                  jobCardId={jobCard.id}
                  inspectionId={jobCard.inspectionId}
                />
              )}
            </div>

            <div
              role="tabpanel"
              id="panel-timeline"
              aria-labelledby="tab-timeline"
              hidden={activeTab !== 'timeline'}
            >
              {activeTab === 'timeline' && (
                <JobCardTimelineTab jobCardId={jobCard.id} />
              )}
            </div>

            <div
              role="tabpanel"
              id="panel-invoice-preview"
              aria-labelledby="tab-invoice-preview"
              hidden={activeTab !== 'invoice-preview'}
            >
              {activeTab === 'invoice-preview' && (
                <JobCardInvoicePreviewTab jobCard={jobCard} />
              )}
            </div>
          </div>

          {/* ── Sticky sidebar ─────────────────────────────────────────────── */}
          <div className="mt-6 lg:mt-0 space-y-3 lg:sticky lg:top-6 lg:self-start">
            {/* Customer card */}
            <SidebarCard title={MESSAGES.customer}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-ink-primary">{customer.name}</span>
                <a
                  href={`https://wa.me/91${customer.phoneDigits}?text=${encodeURIComponent('Hi, reaching you regarding your service request.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Send WhatsApp message"
                  onClick={handleWhatsApp}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <div className="space-y-1">
                <a
                  href={`tel:+91${customer.phoneDigits}`}
                  aria-label={`Call ${customer.name}`}
                  onClick={handlePhone}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Phone className="h-3 w-3 text-ink-muted shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[12px] text-ink-secondary flex items-center gap-1">
                    {displayPhone}
                    {contact.isMasked && storeCustomer?.phone && (
                      <span title="Confidential — full contact requires R19+ access" className="inline-flex">
                        <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                </a>
                <a
                  href={`mailto:${displayEmail.replace(/••••/g, 'masked')}`}
                  aria-label={`Email ${customer.name}`}
                  onClick={handleEmail}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Mail className="h-3 w-3 text-ink-muted shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[12px] text-ink-secondary flex items-center gap-1">
                    {displayEmail}
                    {contact.isMasked && storeCustomer?.email && (
                      <span title="Confidential — full contact requires R19+ access" className="inline-flex">
                        <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                </a>
              </div>
            </SidebarCard>

            {/* Vehicle card */}
            <SidebarCard title={MESSAGES.vehicle}>
              <SidebarRow label="VIN" value={<VinBadge vin={jobCard.vin} masked size="sm" />} />
              <SidebarRow label="ODO In" value={
                <span className="font-mono text-[13px] tabular-nums">
                  {jobCard.odometerIn.toLocaleString('en-IN')} km
                </span>
              } />
              <SidebarRow label="Outlet" value={<OutletPill outlet={outletCode} />} />
            </SidebarCard>

            {/* Assignment card */}
            <SidebarCard title={MESSAGES.assignment}>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">{MESSAGES.advisor}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                      {getInitials(advisorName)}
                    </div>
                    <span className="text-[13px] text-ink-primary">{advisorName}</span>
                  </div>
                </div>

                {jobCard.technicianIds.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">{MESSAGES.technicians}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {jobCard.technicianIds.map((tid) => {
                        const name = TECH_MAP[tid] ?? tid;
                        return (
                          <div key={tid} className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-[10px] font-semibold text-ink-secondary">
                              {getInitials(name)}
                            </div>
                            <span className="text-[12px] text-ink-secondary">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {jobCard.bayId && (
                  <SidebarRow label={MESSAGES.bay} value={
                    <span className="font-mono text-[12px]">{jobCard.bayId.toUpperCase()}</span>
                  } />
                )}

                <SidebarRow label={MESSAGES.promisedAt} value={
                  <span className={cn(
                    'text-[12px]',
                    isOverdue(jobCard.promisedAt) ? 'text-state-danger' : 'text-ink-secondary',
                  )}>
                    {formatDate(jobCard.promisedAt)}
                  </span>
                } />
              </div>
            </SidebarCard>

            {/* Communications log */}
            <SidebarCard title={MESSAGES.communications}>
              {recentComms.length === 0 ? (
                <p className="text-[12px] text-ink-muted italic">No communications yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentComms.map((comm) => (
                    <div key={comm.id} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
                        {CHANNEL_LABEL[comm.channel] ?? comm.channel}
                      </span>
                      <span className="text-[12px] text-ink-secondary flex-1 truncate">
                        {comm.template}
                      </span>
                      <span className="font-mono text-[11px] text-ink-muted shrink-0">
                        {formatRelative(comm.sentAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setCommsPanelOpen(true)}
                className="mt-2 text-[12px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
              >
                {MESSAGES.viewAll} →
              </button>
            </SidebarCard>

            {/* Warranty claim card (conditional) */}
            {jobCard.warrantyClaimId && (
              <SidebarCard title="Warranty Claim">
                <Link
                  href={`/service/warranty/${jobCard.warrantyClaimId}`}
                  className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                >
                  {MESSAGES.warrantyLink}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </SidebarCard>
            )}

            {/* Quick actions */}
            <SidebarCard title={MESSAGES.quickActions}>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNotesPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                  {MESSAGES.notes} ({notes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPhotosPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {MESSAGES.photos}
                </button>
                <button
                  type="button"
                  onClick={() => setAttachmentsPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {MESSAGES.attachments}
                </button>
              </div>
            </SidebarCard>
          </div>
        </div>

      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

      <UpdateStatusDialog
        open={updateStatusOpen}
        onClose={() => setUpdateStatusOpen(false)}
        jobCardId={jobCard.id}
        currentStatus={jobCard.status}
        onStatusChange={(newStatus) => {
          setJobCardStatus(jobCard.id, newStatus as JobCardStatus, {
            actorId: actor.id,
            actorName: actor.name,
          });
          toast(`Status updated to ${newStatus.replace(/_/g, ' ')}`, 'success');
        }}
      />

      <AddNoteDialog
        open={addNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        jobCardId={jobCard.id}
      />

      <ReopenJobCardDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        jobCardId={jobCard.id}
      />

      {/* Panels */}
      <NotesPanel
        open={notesPanelOpen}
        onClose={() => setNotesPanelOpen(false)}
        jobCardId={jobCard.id}
        jobNo={jobCard.jobNo}
      />
      <PhotosPanel
        open={photosPanelOpen}
        onClose={() => setPhotosPanelOpen(false)}
        jobCardId={jobCard.id}
        jobNo={jobCard.jobNo}
      />
      <AttachmentsPanel
        open={attachmentsPanelOpen}
        onClose={() => setAttachmentsPanelOpen(false)}
        jobCardId={jobCard.id}
        jobNo={jobCard.jobNo}
      />
      <CommunicationsPanel
        open={commsPanelOpen}
        onClose={() => setCommsPanelOpen(false)}
        jobCardId={jobCard.id}
        jobNo={jobCard.jobNo}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
