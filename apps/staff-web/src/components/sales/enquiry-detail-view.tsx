'use client';

import { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { Deal, Interaction, Kyc, InteractionType, KycStatus } from '@dms/types';
import { StateChip } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { LogCallModal } from './log-call-modal';
import { ScheduleTestDriveModal } from './schedule-test-drive-modal';

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

const FILTER_TABS: { key: InteractionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'messages', label: 'Messages' },
  { key: 'calls', label: 'Calls' },
  { key: 'notes', label: 'Notes' },
  { key: 'system', label: 'System' },
];

function filterInteractions(items: Interaction[], filter: InteractionFilter): Interaction[] {
  if (filter === 'all') return items;
  if (filter === 'messages') {
    return items.filter((i) =>
      ['whatsapp-sent', 'whatsapp-received', 'email-sent', 'email-received'].includes(i.type),
    );
  }
  if (filter === 'calls') {
    return items.filter((i) => ['call-inbound', 'call-outbound'].includes(i.type));
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
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>('all');
  const [showLogCall, setShowLogCall] = useState(false);
  const [showScheduleTD, setShowScheduleTD] = useState(false);

  const visibleInteractions = filterInteractions(
    [...interactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    interactionFilter,
  );

  const opened = daysAgo(deal.createdAt);

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
              Leads &amp; Enquiries
            </Link>
            <span className="text-ink-muted text-xs">/</span>
            <span className="font-mono text-[11px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-2 py-0.5 rounded">
              ENQ-{deal.id.replace('deal-', '').padStart(4, '0')}
            </span>
            <StateChip
              status={STAGE_STATUS_MAP[deal.stage]}
              label={STAGE_LABEL[deal.stage]}
            />
          </div>

          {/* Customer name + actions */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[32px] font-semibold leading-[1.2] text-ink-primary tracking-tight">
                {deal.customerName}
              </h1>
              <p className="text-sm text-ink-muted mt-1">
                {deal.city.charAt(0).toUpperCase() + deal.city.slice(1)}
                {' · '}
                {deal.source === 'walk-in' ? 'Walk-in' : deal.source.charAt(0).toUpperCase() + deal.source.slice(1)}
                {' · '}
                opened {opened} day{opened !== 1 ? 's' : ''} ago
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <button
                type="button"
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                Assign Lead
              </button>
              <button
                type="button"
                onClick={() => setShowLogCall(true)}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                Log Call
              </button>
              <button
                type="button"
                onClick={() => setShowScheduleTD(true)}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-semibold',
                  'bg-accent text-white hover:bg-accent/90',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                )}
              >
                Schedule Test Drive
              </button>
            </div>
          </div>
        </div>

        {/* ── Two-column body ───────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Interaction Ledger (60%) */}
          <div className="w-[60%] flex flex-col border-r border-line overflow-hidden">
            {/* Section header + filter tabs */}
            <div className="shrink-0 px-6 pt-5 pb-0 border-b border-line">
              <h2 className="text-base font-semibold text-ink-primary mb-3">Interaction Ledger</h2>
              <div className="flex items-center gap-1">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setInteractionFilter(tab.key)}
                    className={cn(
                      'h-8 px-3 rounded-t text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      interactionFilter === tab.key
                        ? 'text-ink-primary border-b-2 border-accent bg-accent/5'
                        : 'text-ink-muted hover:text-ink-secondary',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {visibleInteractions.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-12">
                  No interactions in this category.
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
                      <span className="font-mono text-[11px] text-ink-muted shrink-0 whitespace-nowrap">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>

                    {/* Body */}
                    {item.body && (
                      <p className="text-[13px] text-ink-secondary leading-relaxed mb-2">
                        {item.body}
                      </p>
                    )}

                    {/* Meta pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                        {item.addedByName}
                      </span>
                      {item.templateId && (
                        <span className="font-mono text-[10px] text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                          {item.templateId}
                        </span>
                      )}
                      {item.durationSeconds && (
                        <span className="font-mono text-[10px] text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                          {durationLabel(item.durationSeconds)}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-ink-muted ml-auto">
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
            {/* Vehicle of Interest panel */}
            {deal.vehicleName && (
              <div className="p-5 border-b border-line">
                {deal.vehicleImage && (
                  <div className="relative w-full aspect-video rounded-md overflow-hidden mb-4 bg-bg-subtle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deal.vehicleImage}
                      alt={deal.vehicleName}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 font-mono text-[10px] uppercase tracking-widest bg-[rgb(var(--state-listed)/0.9)] text-white px-2 py-0.5 rounded">
                      IN STOCK
                    </span>
                  </div>
                )}

                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
                  Interest Category: SUV
                </p>
                <h3 className="text-base font-semibold text-ink-primary leading-snug mb-0.5">
                  {deal.vehicleName}
                </h3>
                <p className="text-sm text-ink-muted mb-3">Autobiography trim</p>

                <div className="border-t border-line my-3" />

                {deal.vehicleVin && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-ink-muted">Asset Identifier</span>
                    <span className="font-mono text-xs text-ink-primary bg-bg-subtle px-2 py-0.5 rounded select-all">
                      {deal.vehicleVin}
                    </span>
                  </div>
                )}

                {deal.amount > 0 && (
                  <p className="font-mono text-[28px] font-semibold text-ink-primary tabular-nums mt-3">
                    &#8377; {formatINR(deal.amount)}
                  </p>
                )}
              </div>
            )}

            {/* Compliance & KYC panel */}
            <div className="p-5">
              <h3 className="text-sm font-semibold text-ink-primary mb-4">Compliance &amp; KYC</h3>

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
                <p className="text-sm text-ink-muted">No KYC record available.</p>
              )}
            </div>

            {/* Deal notes */}
            {deal.notes && (
              <div className="px-5 pb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  Notes
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed bg-bg-subtle rounded-md p-3 border border-line">
                  {deal.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <LogCallModal
        open={showLogCall}
        onClose={() => setShowLogCall(false)}
        dealId={deal.id}
      />
      <ScheduleTestDriveModal
        open={showScheduleTD}
        onClose={() => setShowScheduleTD(false)}
        dealId={deal.id}
      />
    </>
  );
}
