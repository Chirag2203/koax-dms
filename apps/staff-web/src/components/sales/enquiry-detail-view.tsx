'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Zap,
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  ChevronLeft,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { Deal, Interaction, Kyc, InteractionType, KycStatus } from '@dms/types';
import { StateChip } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { LogCallModal } from './log-call-modal';
import { ScheduleTestDriveModal } from './schedule-test-drive-modal';
import { UpdateLeadModal } from './update-lead-modal';
import { AddNoteModal } from './add-note-modal';
import { ContactDetailsPanel } from './contact-details-panel';
import { WhatsappDialog } from './whatsapp-dialog';
import { AiCallDialog } from './ai-call-dialog';
import { TestDrivesForDealCard } from './test-drives-for-deal-card';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

function formatINR(amount: number): string {
  return INR_FORMATTER.format(amount);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 2) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function daysAgo(iso: string): number {
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function durationLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─── Stage label map ──────────────────────────────────────────────────────────

import type { DealStage } from '@dms/types';

const STAGE_LABEL: Record<DealStage, string> = {
  'new-lead': 'New Lead',
  contacted: 'Contacted',
  'test-drive': 'Test Drive',
  reserved: 'Reserved',
  'sales-order': 'Sales Order',
  delivered: 'Delivered',
  lost: 'Lost',
  'on-hold': 'On Hold',
  refunded: 'Refunded',
};

const STAGE_STATUS_MAP: Record<DealStage, StateChipStatus> = {
  'new-lead': 'draft',
  contacted: 'pending',
  'test-drive': 'listed',
  reserved: 'reserved',
  'sales-order': 'cpo',
  delivered: 'sold',
  lost: 'stale',
  'on-hold': 'stale',
  refunded: 'stale',
};

// ─── Interaction icon ─────────────────────────────────────────────────────────

function InteractionIcon({ type }: { type: InteractionType }) {
  const cls = 'h-4 w-4 shrink-0';
  switch (type) {
    case 'whatsapp-sent':
    case 'whatsapp-received':
      return <MessageSquare className={cn(cls, 'text-[rgb(var(--state-listed))]')} />;
    case 'call-inbound':
    case 'call-outbound':
      return <Phone className={cn(cls, 'text-[rgb(var(--state-pending))]')} />;
    case 'call-ai':
      return <Sparkles className={cn(cls, 'text-accent')} />;
    case 'email-sent':
    case 'email-received':
      return <Mail className={cn(cls, 'text-accent')} />;
    case 'note':
      return <FileText className={cn(cls, 'text-ink-muted')} />;
    case 'test-drive-scheduled':
      return <Clock className={cn(cls, 'text-[rgb(var(--state-cpo))]')} />;
    default:
      return <Zap className={cn(cls, 'text-ink-muted')} />;
  }
}

// ─── KYC status badge ─────────────────────────────────────────────────────────

function KycBadge({ status }: { status: KycStatus }) {
  switch (status) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--state-listed))]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Verified
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--state-pending))]">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--state-overdue))]">
          <XCircle className="h-3.5 w-3.5" />
          Rejected
        </span>
      );
    case 'not-started':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
          <MinusCircle className="h-3.5 w-3.5" />
          Not Started
        </span>
      );
  }
}

// ─── Interaction filter tabs ──────────────────────────────────────────────────

type InteractionFilter = 'all' | 'messages' | 'calls' | 'notes' | 'system';

const FILTER_TABS: { key: InteractionFilter; tKey: string }[] = [
  { key: 'all', tKey: 'filterAll' },
  { key: 'messages', tKey: 'filterMessages' },
  { key: 'calls', tKey: 'filterCalls' },
  { key: 'notes', tKey: 'filterNotes' },
  { key: 'system', tKey: 'filterSystem' },
];

function filterInteractions(items: Interaction[], filter: InteractionFilter): Interaction[] {
  if (filter === 'all') return items;
  if (filter === 'messages') {
    return items.filter((i) =>
      ['whatsapp-sent', 'whatsapp-received', 'email-sent', 'email-received'].includes(i.type),
    );
  }
  if (filter === 'calls') {
    return items.filter((i) => ['call-inbound', 'call-outbound', 'call-ai'].includes(i.type));
  }
  if (filter === 'notes') {
    return items.filter((i) => i.type === 'note');
  }
  if (filter === 'system') {
    return items.filter((i) =>
      ['enquiry-created', 'stage-changed', 'assigned', 'payment-received'].includes(i.type),
    );
  }
  return items;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnquiryDetailViewProps {
  deal: Deal;
  interactions: Interaction[];
  kyc: Kyc | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnquiryDetailView({ deal, interactions, kyc }: EnquiryDetailViewProps) {
  const router = useRouter();
  const t = useTranslations('salesDeals.enquiry');
  const { toast, toasts, dismiss } = useToast();
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>('all');
  const [showLogCall, setShowLogCall] = useState(false);
  const [showScheduleTD, setShowScheduleTD] = useState(false);
  const [showUpdateLead, setShowUpdateLead] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [aiCallOpen, setAiCallOpen] = useState(false);
  const [dealData, setDealData] = useState<Deal>(deal);
  const [interactionList, setInteractionList] = useState<Interaction[]>(interactions);

  async function handleInteractionSaved(interaction: Partial<Interaction>) {
    try {
      const res = await fetch(`/api/staff/sales/deals/${dealData.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interaction),
      });
      const saved = await res.json() as Interaction;
      setInteractionList((prev) => [saved, ...prev]);
    } catch {
      // swallow — toast is shown by the dialog
    }
  }

  const visibleInteractions = filterInteractions(
    [...interactionList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    interactionFilter,
  );

  const opened = daysAgo(dealData.createdAt);

  return (
    <>
      <div className="flex flex-col h-full min-h-screen bg-bg-canvas">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-line bg-bg-canvas px-6 py-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/sales"
              className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('breadcrumbBack')}
            </Link>
            <span className="text-ink-muted text-xs">/</span>
            <span className="font-mono text-xs uppercase tracking-widest bg-bg-subtle text-ink-muted px-2 py-0.5 rounded">
              ENQ-{dealData.id.replace('deal-', '').padStart(4, '0')}
            </span>
            <StateChip
              status={STAGE_STATUS_MAP[dealData.stage]}
              label={STAGE_LABEL[dealData.stage]}
            />
          </div>

          {/* Customer name + actions */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold leading-[1.2] text-ink-primary tracking-tight">
                {dealData.customerName}
              </h1>
              <p className="text-sm text-ink-muted mt-1">
                {dealData.city.charAt(0).toUpperCase() + dealData.city.slice(1)}
                {' · '}
                {dealData.source === 'walk-in' ? 'Walk-in' : dealData.source.charAt(0).toUpperCase() + dealData.source.slice(1)}
                {' · '}
                opened {opened} day{opened !== 1 ? 's' : ''} ago
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-1">
              {/* W1.3: Assign Lead — DEF-SALES-N: assignment UI is coming in v1.1;
                    currently leads are auto-routed to the on-duty SA.
                    Per CLAUDE.md §10 DoD #15: explicit info toast, never silent. */}
              <button
                type="button"
                onClick={() => toast(t('assignLeadComingSoon'), 'info')}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {t('assignLead')}
              </button>
              <button
                type="button"
                onClick={() => setShowUpdateLead(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {t('updateLead')}
              </button>
              <button
                type="button"
                onClick={() => setShowAddNote(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {t('addNote')}
              </button>
              <button
                type="button"
                onClick={() => setShowLogCall(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {t('logCall')}
              </button>
              <button
                type="button"
                onClick={() => setWhatsappOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-[#25D366] hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {t('whatsapp')}
              </button>
              <button
                type="button"
                onClick={() => setAiCallOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t('aiCall')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (dealData.customerName) params.set('customerId', dealData.customerName);
                  if (dealData.vehicleVin) params.set('vehicleVin', dealData.vehicleVin);
                  router.push(`/test-drives/new?${params.toString()}`);
                }}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {t('bookTestDrive')}
              </button>
              <button
                type="button"
                onClick={() => setShowScheduleTD(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {t('scheduleTestDrive')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Two-column body ───────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Interaction Ledger (60%) */}
          <div className="w-[60%] flex flex-col border-r border-line overflow-hidden">
            {/* Section header + filter tabs */}
            <div className="shrink-0 px-6 pt-5 pb-0">
              <h2 className="text-base font-semibold text-ink-primary mb-3">{t('interactionLedger')}</h2>
              <div className="flex items-end gap-0 border-b border-line" role="tablist" aria-label="Interaction filter tabs">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={`tab-filter-${tab.key}`}
                    aria-controls={`panel-filter-${tab.key}`}
                    aria-selected={interactionFilter === tab.key}
                    onClick={() => setInteractionFilter(tab.key)}
                    className={cn(
                      'relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                      interactionFilter === tab.key
                        ? 'text-ink-primary'
                        : 'text-ink-muted hover:text-ink-secondary',
                    )}
                  >
                    {t(tab.tKey)}
                    {interactionFilter === tab.key && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm bg-accent"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {visibleInteractions.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-12">
                  {t('noInteractions')}
                </p>
              ) : (
                visibleInteractions.map((item) => (
                  <div
                    key={item.id}
                    className="bg-bg-surface border border-line rounded-md p-3"
                  >
                    {/* Row: icon + title + timestamp */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <InteractionIcon type={item.type} />
                        <span className="text-sm font-medium text-ink-primary truncate">
                          {item.title}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-ink-muted shrink-0 whitespace-nowrap">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>

                    {/* Body */}
                    {item.body && (
                      <p className="text-sm text-ink-secondary leading-relaxed mb-2">
                        {item.body}
                      </p>
                    )}

                    {/* Meta pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                        {item.addedByName}
                      </span>
                      {item.type === 'call-ai' && (
                        <span className="font-mono text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                          AI
                        </span>
                      )}
                      {item.templateId && (
                        <span className="font-mono text-xs text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                          {item.templateId}
                        </span>
                      )}
                      {item.durationSeconds && (
                        <span className="font-mono text-xs text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                          {durationLabel(item.durationSeconds)}
                        </span>
                      )}
                      <span className="font-mono text-xs text-ink-muted ml-auto">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Sidebar (40%) */}
          <div className="w-[40%] flex flex-col overflow-y-auto">
            {/* Contact Details panel */}
            <div className="m-4 mb-0">
              <ContactDetailsPanel
                customerName={dealData.customerName}
                customerPhone={dealData.customerPhone}
                customerEmail={dealData.customerEmail}
                city={dealData.city}
                outlet={dealData.outlet}
                onOpenWhatsapp={() => setWhatsappOpen(true)}
              />
            </div>

            {/* Vehicle of Interest panel */}
            {dealData.vehicleName && (
              <div className="rounded-md border border-line bg-bg-surface p-6 m-4 mb-0">
                {dealData.vehicleImage && (
                  <div className="relative w-full aspect-video rounded-md overflow-hidden mb-4 bg-bg-subtle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dealData.vehicleImage}
                      alt={dealData.vehicleName}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 font-mono text-xs uppercase tracking-widest bg-[rgb(var(--state-listed)/0.9)] text-white px-2 py-0.5 rounded">
                      {t('inStock')}
                    </span>
                  </div>
                )}

                <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1">
                  Interest Category: SUV
                </p>
                <h3 className="text-base font-semibold text-ink-primary leading-snug mb-0.5">
                  {dealData.vehicleName}
                </h3>
                <p className="text-sm text-ink-muted mb-3">Autobiography trim</p>

                <div className="border-t border-line my-3" />

                {dealData.vehicleVin && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-ink-muted">{t('assetIdentifier')}</span>
                    <span className="font-mono text-xs text-ink-primary bg-bg-subtle px-2 py-0.5 rounded select-all">
                      {dealData.vehicleVin}
                    </span>
                  </div>
                )}

                {dealData.amount > 0 && (
                  <p className="font-mono text-2xl font-semibold text-ink-primary tabular-nums mt-3">
                    &#8377; {formatINR(dealData.amount)}
                  </p>
                )}
              </div>
            )}

            {/* Compliance & KYC panel */}
            <div className="rounded-md border border-line bg-bg-surface p-4 m-4 mb-0">
              <h3 className="text-sm font-semibold text-ink-primary mb-4">{t('complianceKyc')}</h3>

              {kyc ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-line">
                    <span className="text-sm text-ink-secondary">Identity Verification (Aadhaar)</span>
                    <KycBadge status={kyc.aadhaar} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-line">
                    <span className="text-sm text-ink-secondary">Financial Records (PAN)</span>
                    <KycBadge status={kyc.pan} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-ink-secondary">Bank Statement Linkage</span>
                    <KycBadge status={kyc.bankStatement} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">{t('noKycRecord')}</p>
              )}
            </div>

            {/* Deal notes */}
            {dealData.notes && (
              <div className="rounded-md border border-line bg-bg-surface p-4 m-4 mb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  {t('notesLabel')}
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {dealData.notes}
                </p>
              </div>
            )}

            {/* Test Drives card — Seam 44 cross-module visibility */}
            <div className="m-4 mb-4">
              <TestDrivesForDealCard deal={dealData} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <LogCallModal
        open={showLogCall}
        onClose={() => setShowLogCall(false)}
        dealId={dealData.id}
      />
      <ScheduleTestDriveModal
        open={showScheduleTD}
        onClose={() => setShowScheduleTD(false)}
        dealId={dealData.id}
      />
      <UpdateLeadModal
        open={showUpdateLead}
        onClose={() => setShowUpdateLead(false)}
        deal={dealData}
        onSaved={(updated) => setDealData((prev) => ({ ...prev, ...updated }))}
      />
      <AddNoteModal
        open={showAddNote}
        onClose={() => setShowAddNote(false)}
        dealId={dealData.id}
        onSaved={(note) => setInteractionList((prev) => [note, ...prev])}
      />
      <WhatsappDialog
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        dealId={dealData.id}
        customerName={dealData.customerName}
        customerPhone={dealData.customerPhone}
        vehicleName={dealData.vehicleName}
        onMessageSent={handleInteractionSaved}
      />
      <AiCallDialog
        open={aiCallOpen}
        onClose={() => setAiCallOpen(false)}
        dealId={dealData.id}
        customerName={dealData.customerName}
        vehicleName={dealData.vehicleName}
        onCallLogged={handleInteractionSaved}
      />
      {/* W1.3: toast container for info/error feedback in this view */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
