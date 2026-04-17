'use client';

import { useState } from 'react';
import { Edit, MessageSquarePlus } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate, StateChip } from '@/src/components/primitives';
import type { JobCard, AdvisorNote, JobCardTimelineEvent } from '@dms/types';
import { EditComplaintDialog } from '../action-flows/edit-complaint-dialog';
import { EditDiagnosisDialog } from '../action-flows/edit-diagnosis-dialog';
import { SendApprovalDialog } from '../action-flows/send-approval-dialog';
import { NotesPanel } from '../side-panels/notes-panel';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  complaint: 'Customer Complaint',
  diagnosticNotes: 'Diagnostic Notes',
  notDiagnosed: 'Not diagnosed yet.',
  addDiagnosis: 'Add Diagnosis',
  estimateSummary: 'Estimate Summary',
  labourSubtotal: 'Labour Sub-total',
  partsSubtotal: 'Parts Sub-total',
  taxCgst: 'CGST 9%',
  taxSgst: 'SGST 9%',
  grandTotal: 'Grand Total',
  awaitingApproval: 'Awaiting Customer Approval',
  sendForApproval: 'Send for Approval',
  pinnedNotes: 'Pinned Notes',
  recentActivity: 'Recent Activity',
  viewAllNotes: 'View all notes',
  costVsPrice: 'Cost vs Price',
  costLabour: 'Labour Cost',
  costParts: 'Parts Cost',
  costTotal: 'Total Cost',
  charged: 'Charged',
  margin: 'Margin',
  estimated: '(estimated)',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Timeline event type labels ───────────────────────────────────────────────

const TIMELINE_EVENT_LABEL: Record<string, string> = {
  received: 'Job Card Received',
  diagnosed: 'Vehicle Diagnosed',
  estimate_approved: 'Estimate Approved',
  labour_started: 'Labour Started',
  part_reserved: 'Part Reserved',
  part_fitted: 'Part Fitted',
  inspection_complete: 'Inspection Complete',
  qc_passed: 'QC Passed',
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Vehicle Delivered',
  note: 'Note Added',
  photo_uploaded: 'Photo Uploaded',
  status_changed: 'Status Changed',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-semibold leading-[1.4] text-ink-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardOverviewTabProps {
  jobCard: JobCard;
  notes: AdvisorNote[];
  timeline: JobCardTimelineEvent[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardOverviewTab({
  jobCard,
  notes,
  timeline,
}: JobCardOverviewTabProps) {
  const [diagEditOpen, setDiagEditOpen] = useState(false);
  const [complaintEditOpen, setComplaintEditOpen] = useState(false);
  const [sendApprovalOpen, setSendApprovalOpen] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);

  const labourSubtotal = jobCard.labourLines.reduce(
    (sum, l) => sum + l.flatRateHours * l.rate,
    0,
  );
  const partsSubtotal = jobCard.partsLines.reduce(
    (sum, p) => sum + p.qty * p.unitPrice,
    0,
  );
  const subtotal = labourSubtotal + partsSubtotal;
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const grandTotal = subtotal + cgst + sgst;

  // Cost vs Price: naive 60% cost approximation
  const labourCost = labourSubtotal * 0.6;
  const partsCost = partsSubtotal * 0.6;
  const totalCost = labourCost + partsCost;
  const charged = grandTotal;
  const margin = charged > 0 ? Math.round(((charged - totalCost) / charged) * 100) : 0;

  const pinnedNotes = notes.filter((n) => !!n.pinned).slice(0, 2);
  const recentEvents = [...timeline]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  return (
    <>
      <div className="space-y-4">
        {/* Customer Complaint */}
        <CardSection
          title={MESSAGES.complaint}
          action={
            <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setComplaintEditOpen(true)}
                aria-label="Edit customer complaint"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Edit className="h-4 w-4" aria-hidden="true" />
              </button>
            </Gate>
          }
        >
          <p className="text-[15px] leading-[1.55] text-ink-primary whitespace-pre-line">
            {jobCard.customerComplaint || (
              <span className="text-ink-muted italic">No complaint recorded.</span>
            )}
          </p>
        </CardSection>

        {/* Diagnostic Notes */}
        <CardSection
          title={MESSAGES.diagnosticNotes}
          action={
            <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
              {jobCard.diagnosticNotes ? (
                <button
                  type="button"
                  onClick={() => setDiagEditOpen(true)}
                  aria-label="Edit diagnostic notes"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </Gate>
          }
        >
          {jobCard.diagnosticNotes ? (
            <p className="text-[15px] leading-[1.55] text-ink-primary whitespace-pre-line">
              {jobCard.diagnosticNotes}
            </p>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-ink-muted italic">{MESSAGES.notDiagnosed}</p>
              <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
                <button
                  type="button"
                  onClick={() => setDiagEditOpen(true)}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  {MESSAGES.addDiagnosis}
                </button>
              </Gate>
            </div>
          )}
        </CardSection>

        {/* Estimate Summary */}
        <CardSection
          title={MESSAGES.estimateSummary}
          action={
            jobCard.estimatedTotal > 0 && subtotal !== jobCard.estimatedTotal ? (
              <StateChip status="svc-approval" label={MESSAGES.awaitingApproval} />
            ) : undefined
          }
        >
          <div className="space-y-2">
            {[
              { label: MESSAGES.labourSubtotal, value: labourSubtotal },
              { label: MESSAGES.partsSubtotal, value: partsSubtotal },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-line last:border-0">
                <span className="text-[13px] text-ink-secondary">{label}</span>
                <span className="font-mono text-[13px] tabular-nums text-ink-primary">
                  {INR.format(value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1 border-b border-line">
              <span className="text-[13px] text-ink-secondary">{MESSAGES.taxCgst}</span>
              <span className="font-mono text-[13px] tabular-nums text-ink-muted">
                {INR.format(cgst)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-line">
              <span className="text-[13px] text-ink-secondary">{MESSAGES.taxSgst}</span>
              <span className="font-mono text-[13px] tabular-nums text-ink-muted">
                {INR.format(sgst)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[15px] font-semibold text-ink-primary">{MESSAGES.grandTotal}</span>
              <span className="font-mono text-[18px] font-semibold tabular-nums text-ink-primary">
                {INR.format(grandTotal)}
              </span>
            </div>
          </div>

          {/* Awaiting approval banner */}
          {jobCard.estimatedTotal > 0 && subtotal !== jobCard.estimatedTotal && (
            <div className="mt-3 flex items-center justify-between rounded-md border border-line bg-bg-subtle px-3 py-2">
              <p className="text-[13px] text-ink-secondary">
                Estimate is pending customer approval.
              </p>
              <Gate role={['R09', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
                <button
                  type="button"
                  onClick={() => setSendApprovalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  {MESSAGES.sendForApproval}
                </button>
              </Gate>
            </div>
          )}
        </CardSection>

        {/* Cost vs Price */}
        {(labourSubtotal > 0 || partsSubtotal > 0) && (
          <CardSection title={MESSAGES.costVsPrice}>
            <div className="space-y-2">
              {[
                { label: MESSAGES.costLabour, value: labourCost },
                { label: MESSAGES.costParts, value: partsCost },
                { label: MESSAGES.costTotal, value: totalCost },
                { label: MESSAGES.charged, value: charged },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-line last:border-0">
                  <span className="text-[13px] text-ink-secondary">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[13px] tabular-nums text-ink-primary">
                      {INR.format(Math.round(value))}
                    </span>
                    {label === MESSAGES.costTotal && (
                      <span className="text-[11px] text-ink-muted">{MESSAGES.estimated}</span>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between py-1">
                <span className="text-[13px] font-medium text-ink-primary">{MESSAGES.margin}</span>
                <span className={cn(
                  'font-mono text-[14px] font-semibold tabular-nums',
                  margin >= 20 ? 'text-state-success' : margin >= 0 ? 'text-ink-primary' : 'text-state-danger',
                )}>
                  {margin}%
                </span>
              </div>
            </div>
          </CardSection>
        )}

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <CardSection
            title={MESSAGES.pinnedNotes}
            action={
              notes.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setNotesPanelOpen(true)}
                  className="text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                >
                  {MESSAGES.viewAllNotes} ({notes.length})
                </button>
              ) : undefined
            }
          >
            <div className="space-y-3">
              {pinnedNotes.map((n) => (
                <div key={n.id} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                    {getInitials(n.authorId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-medium text-ink-primary">{n.authorId}</span>
                      <span className="font-mono text-[11px] text-ink-muted">
                        {formatRelative(n.at)}
                      </span>
                    </div>
                    <p className="text-[13px] text-ink-secondary">{n.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        )}

        {/* Recent Activity */}
        {recentEvents.length > 0 && (
          <CardSection title={MESSAGES.recentActivity}>
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div
                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink-primary">
                      {TIMELINE_EVENT_LABEL[event.type] ?? event.type}
                      {event.description ? (
                        <span className="text-ink-secondary"> — {event.description}</span>
                      ) : null}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-ink-muted">{event.actorName}</span>
                      <span className="font-mono text-[11px] text-ink-muted">
                        {formatRelative(event.at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        )}
      </div>

      {/* Dialogs */}
      <EditComplaintDialog
        open={complaintEditOpen}
        onClose={() => setComplaintEditOpen(false)}
        jobCardId={jobCard.id}
        initialValue={jobCard.customerComplaint}
      />

      <EditDiagnosisDialog
        open={diagEditOpen}
        onClose={() => setDiagEditOpen(false)}
        jobCardId={jobCard.id}
        initialValue={jobCard.diagnosticNotes ?? ''}
      />

      <SendApprovalDialog
        open={sendApprovalOpen}
        onClose={() => setSendApprovalOpen(false)}
        jobCard={jobCard}
      />

      {/* Notes panel */}
      <NotesPanel
        open={notesPanelOpen}
        onClose={() => setNotesPanelOpen(false)}
        jobCardId={jobCard.id}
        jobNo={jobCard.jobNo}
      />
    </>
  );
}
