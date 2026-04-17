'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@dms/ui';
import { StateChip, Gate, ToastContainer } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useServiceStore } from '@/src/lib/service/service-store';
import type { WarrantyClaim } from '@dms/types';
import { WarrantyStatusDialog } from './action-flows/warranty-status-dialog';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  breadcrumbService: 'Service',
  breadcrumbWarranty: 'Warranty Claims',
  tabOverview: 'Overview',
  tabPartsLabour: 'Parts & Labour',
  tabTimeline: 'Timeline',
  tabDocuments: 'Documents',
  approveForReview: 'Approve for Review',
  approve: 'Approve',
  reject: 'Reject',
  requestMoreInfo: 'Request More Info',
  markPaid: 'Mark Paid',
} as const;

// ─── Status maps ──────────────────────────────────────────────────────────────

const WC_STATUS_TO_CHIP: Record<string, StateChipStatus> = {
  DRAFT: 'wc-draft',
  SUBMITTED: 'wc-submitted',
  UNDER_REVIEW: 'wc-under-review',
  APPROVED: 'wc-approved',
  REJECTED: 'wc-rejected',
  PAID: 'wc-paid',
};

const WC_TYPE_LABELS: Record<string, string> = {
  MANUFACTURER: 'Manufacturer',
  EXTENDED: 'Extended',
  CPO: 'CPO',
  GOODWILL: 'Goodwill',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'parts-labour' | 'timeline' | 'documents';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: MESSAGES.tabOverview },
  { id: 'parts-labour', label: MESSAGES.tabPartsLabour },
  { id: 'timeline', label: MESSAGES.tabTimeline },
  { id: 'documents', label: MESSAGES.tabDocuments },
];

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

// ─── Timeline tab ─────────────────────────────────────────────────────────────

function TimelineTab({ claim }: { claim: WarrantyClaim }) {
  interface Milestone {
    label: string;
    timestamp: string | undefined;
    done: boolean;
  }

  const milestones: Milestone[] = [
    { label: 'Claim Submitted', timestamp: claim.submittedAt, done: !!claim.submittedAt },
    {
      label: 'Under Review',
      timestamp: claim.status === 'UNDER_REVIEW' || claim.status === 'APPROVED' || claim.status === 'PAID' ? claim.submittedAt : undefined,
      done: ['UNDER_REVIEW', 'APPROVED', 'PAID'].includes(claim.status),
    },
    {
      label: 'Approved',
      timestamp: claim.approvedAt,
      done: claim.status === 'APPROVED' || claim.status === 'PAID',
    },
    {
      label: 'Paid',
      timestamp: claim.paidAt,
      done: claim.status === 'PAID',
    },
  ];

  return (
    <div className="rounded-md border border-line bg-bg-surface p-6">
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
                  <p className="font-mono text-[11px] text-ink-muted">{formatDate(m.timestamp)}</p>
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

export interface WarrantyClaimDetailViewProps {
  claim: WarrantyClaim;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WarrantyClaimDetailView({ claim: initialClaim }: WarrantyClaimDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    targetStatus: WarrantyClaim['status'];
    requireReason: boolean;
  }>({ open: false, targetStatus: 'UNDER_REVIEW', requireReason: false });

  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // Read live from store
  const storeClaim = useServiceStore(
    (s) => s.warrantyClaims.find((w) => w.id === initialClaim.id),
  );
  const claim = storeClaim ?? initialClaim;

  // Find linked job card
  const linkedJC = useServiceStore((s) =>
    claim.jobCardId ? s.jobCards.find((jc) => jc.id === claim.jobCardId) : undefined,
  );

  // Find linked parts + labour lines for Parts & Labour tab
  const allLabour = useServiceStore((s) => s.labourLines);
  const allParts = useServiceStore((s) => s.partsLines);
  const claimLabour = allLabour.filter((l) => claim.labourIds.includes(l.id));
  const claimParts = allParts.filter((p) => claim.partsIds.includes(p.id));

  const totalParts = claimParts.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const totalLabour = claimLabour.reduce((sum, l) => sum + l.flatRateHours * l.rate, 0);

  function openStatusDialog(targetStatus: WarrantyClaim['status'], requireReason = false) {
    setStatusDialog({ open: true, targetStatus, requireReason });
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
            href="/service?tab=warranty"
            className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            {MESSAGES.breadcrumbWarranty}
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[13px] text-ink-primary" aria-current="page">
            {claim.claimNo}
          </span>
        </nav>

        {/* ── Header row ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
              {claim.claimNo}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px] text-ink-muted">{maskVin(claim.vin)}</span>
              <span className="text-ink-muted">·</span>
              <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
                {WC_TYPE_LABELS[claim.type] ?? claim.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            <StateChip status={WC_STATUS_TO_CHIP[claim.status] ?? 'wc-draft'} />

            {/* SUBMITTED: Approve for Review + Reject */}
            {claim.status === 'SUBMITTED' && (
              <>
                <Gate role={['R19', 'R22', 'R24']} fallback="disable">
                  <button
                    type="button"
                    onClick={() => openStatusDialog('UNDER_REVIEW')}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    {MESSAGES.approveForReview}
                  </button>
                </Gate>
                <Gate role={['R19', 'R22', 'R24']} fallback="disable">
                  <button
                    type="button"
                    onClick={() => openStatusDialog('REJECTED', true)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-state-danger hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    {MESSAGES.reject}
                  </button>
                </Gate>
              </>
            )}

            {/* UNDER_REVIEW: Approve + Request More Info + Reject */}
            {claim.status === 'UNDER_REVIEW' && (
              <>
                <Gate role={['R19', 'R22', 'R24']} fallback="disable">
                  <button
                    type="button"
                    onClick={() => openStatusDialog('APPROVED')}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    {MESSAGES.approve}
                  </button>
                </Gate>
                <Gate role={['R19', 'R22', 'R24']} fallback="disable">
                  <button
                    type="button"
                    onClick={() => openStatusDialog('REJECTED', true)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-state-danger hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    {MESSAGES.reject}
                  </button>
                </Gate>
              </>
            )}

            {/* APPROVED: Mark Paid (R22+ only) */}
            {claim.status === 'APPROVED' && (
              <Gate role={['R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  onClick={() => openStatusDialog('PAID')}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.markPaid}
                </button>
              </Gate>
            )}
          </div>
        </div>

        {/* ── Canonical underline tabs ─────────────────────────────────────── */}
        <div
          className="mt-6 flex items-end gap-0 border-b border-line"
          role="tablist"
          aria-label="Warranty claim detail tabs"
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

            {/* ── Overview tab ───────────────────────────────────────────── */}
            <div
              role="tabpanel"
              id="panel-overview"
              aria-labelledby="tab-overview"
              hidden={activeTab !== 'overview'}
            >
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Incident card */}
                  <div className="rounded-md border border-line bg-bg-surface p-6">
                    <h2 className="text-[16px] font-semibold text-ink-primary mb-4">Incident Details</h2>
                    <div className="space-y-0">
                      <DetailRow label="Reported Reason" value={claim.reason} />
                      <DetailRow label="Amount" value={
                        <span className="font-mono font-semibold">{INR.format(claim.amount)}</span>
                      } />
                      {claim.submittedAt && (
                        <DetailRow label="Submitted At" value={
                          <span className="font-mono text-[12px]">{formatDate(claim.submittedAt)}</span>
                        } />
                      )}
                      {claim.approvedAt && (
                        <DetailRow label="Approved At" value={
                          <span className="font-mono text-[12px]">{formatDate(claim.approvedAt)}</span>
                        } />
                      )}
                      {claim.paidAt && (
                        <DetailRow label="Paid At" value={
                          <span className="font-mono text-[12px]">{formatDate(claim.paidAt)}</span>
                        } />
                      )}
                      {claim.notes && (
                        <DetailRow label="Notes" value={
                          <span className="text-[13px] text-ink-secondary max-w-[240px] text-right">{claim.notes}</span>
                        } />
                      )}
                    </div>
                  </div>

                  {/* Summary card */}
                  <div className="rounded-md border border-line bg-bg-surface p-6">
                    <h2 className="text-[16px] font-semibold text-ink-primary mb-4">Cost Summary</h2>
                    <div className="space-y-0">
                      <DetailRow label="Total Parts" value={
                        <span className="font-mono">{INR.format(totalParts)}</span>
                      } />
                      <DetailRow label="Total Labour" value={
                        <span className="font-mono">{INR.format(totalLabour)}</span>
                      } />
                      <DetailRow label="Grand Total" value={
                        <span className="font-mono font-semibold text-[14px]">{INR.format(claim.amount)}</span>
                      } />
                    </div>
                    {claim.amount > 200000 && (
                      <div className="mt-4 rounded-md border border-line bg-bg-subtle px-4 py-3">
                        <p className="text-[12px] text-ink-muted">
                          Authorization required for claims exceeding ₹2,00,000. Ensure R22/R24 sign-off is obtained.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Parts & Labour tab ─────────────────────────────────────── */}
            <div
              role="tabpanel"
              id="panel-parts-labour"
              aria-labelledby="tab-parts-labour"
              hidden={activeTab !== 'parts-labour'}
            >
              {activeTab === 'parts-labour' && (
                <div className="space-y-4">
                  {/* Parts table */}
                  <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
                    <div className="px-4 py-3 border-b border-line">
                      <h2 className="text-[16px] font-semibold text-ink-primary">Parts</h2>
                    </div>
                    {claimParts.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[13px] text-ink-muted">
                        No parts linked to this claim.
                      </div>
                    ) : (
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-line">
                            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-ink-muted">Code</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-ink-muted">Description</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-ink-muted">Qty</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-ink-muted">Unit Price</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-ink-muted">Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claimParts.map((p) => (
                            <tr key={p.id} className="border-b border-line last:border-0">
                              <td className="px-4 py-3 font-mono text-[12px] text-ink-muted">{p.partCode}</td>
                              <td className="px-4 py-3 text-ink-primary">{p.description}</td>
                              <td className="px-4 py-3 font-mono text-right tabular-nums">{p.qty}</td>
                              <td className="px-4 py-3 font-mono text-right tabular-nums">{INR.format(p.unitPrice)}</td>
                              <td className="px-4 py-3 font-mono text-right tabular-nums font-medium">{INR.format(p.qty * p.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Labour table */}
                  <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
                    <div className="px-4 py-3 border-b border-line">
                      <h2 className="text-[16px] font-semibold text-ink-primary">Labour</h2>
                    </div>
                    {claimLabour.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[13px] text-ink-muted">
                        No labour lines linked to this claim.
                      </div>
                    ) : (
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-line">
                            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-ink-muted">Description</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-ink-muted">Hours</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-ink-muted">Rate ₹/hr</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-ink-muted">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claimLabour.map((l) => (
                            <tr key={l.id} className="border-b border-line last:border-0">
                              <td className="px-4 py-3 text-ink-primary">{l.description}</td>
                              <td className="px-4 py-3 font-mono text-right tabular-nums">{l.flatRateHours.toFixed(1)}</td>
                              <td className="px-4 py-3 font-mono text-right tabular-nums">{INR.format(l.rate)}</td>
                              <td className="px-4 py-3 font-mono text-right tabular-nums font-medium">{INR.format(l.flatRateHours * l.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Timeline tab ────────────────────────────────────────────── */}
            <div
              role="tabpanel"
              id="panel-timeline"
              aria-labelledby="tab-timeline"
              hidden={activeTab !== 'timeline'}
            >
              {activeTab === 'timeline' && <TimelineTab claim={claim} />}
            </div>

            {/* ── Documents tab ────────────────────────────────────────────── */}
            <div
              role="tabpanel"
              id="panel-documents"
              aria-labelledby="tab-documents"
              hidden={activeTab !== 'documents'}
            >
              {activeTab === 'documents' && (
                <div className="rounded-md border border-line bg-bg-surface p-6">
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="text-[14px] font-medium text-ink-primary">No documents attached</p>
                    <p className="text-[13px] text-ink-muted">
                      Document upload will be available in S5.
                    </p>
                    <label className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-accent">
                      <input type="file" className="sr-only" accept=".pdf,.doc,.docx" disabled />
                      Add Document (coming in S5)
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="mt-6 lg:mt-0 space-y-3 lg:sticky lg:top-6 lg:self-start">

            {/* VIN / Vehicle card */}
            <SidebarCard title="Vehicle">
              <DetailRow label="VIN" value={
                <span className="font-mono text-[12px]">{maskVin(claim.vin)}</span>
              } />
              <DetailRow label="Type" value={
                <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
                  {WC_TYPE_LABELS[claim.type] ?? claim.type}
                </span>
              } />
              <DetailRow label="Amount" value={
                <span className="font-mono font-semibold">{INR.format(claim.amount)}</span>
              } />
            </SidebarCard>

            {/* Linked Job Card */}
            {linkedJC && (
              <SidebarCard title="Linked Job Card">
                <Link
                  href={`/service/jobcards/${linkedJC.id}`}
                  className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                >
                  {linkedJC.jobNo}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </SidebarCard>
            )}

            {/* Status / Approval */}
            <SidebarCard title="Status">
              <div className="space-y-0">
                <DetailRow label="Status" value={
                  <StateChip status={WC_STATUS_TO_CHIP[claim.status] ?? 'wc-draft'} />
                } />
                {claim.submittedAt && (
                  <DetailRow label="Submitted" value={
                    <span className="font-mono text-[12px]">{formatDate(claim.submittedAt)}</span>
                  } />
                )}
                {claim.approvedAt && (
                  <DetailRow label="Approved" value={
                    <span className="font-mono text-[12px]">{formatDate(claim.approvedAt)}</span>
                  } />
                )}
                {claim.paidAt && (
                  <DetailRow label="Paid" value={
                    <span className="font-mono text-[12px]">{formatDate(claim.paidAt)}</span>
                  } />
                )}
              </div>
            </SidebarCard>

          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

      <WarrantyStatusDialog
        open={statusDialog.open}
        onClose={() => setStatusDialog((p) => ({ ...p, open: false }))}
        claimId={claim.id}
        targetStatus={statusDialog.targetStatus}
        requireReason={statusDialog.requireReason}
        onComplete={() => toast('Claim status updated', 'success')}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
