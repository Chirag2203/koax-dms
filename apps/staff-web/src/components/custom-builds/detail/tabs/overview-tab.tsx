/**
 * Overview tab — job header, stage action bar, edit details, quick stats, enquiry notes.
 *
 * UI pattern: matches customer-360 / staff-profile canonical pattern
 * (Card primitive: rounded-md border bg-bg-surface p-6 + dl/dt/dd grid).
 *
 * CRUD: edit title/notes (R10+), assign vendor, cancel job (R19+ AlertDialog),
 * finance approve (R12+), rework (R10+ on QC_FAILED).
 * Every CTA is wired to a real store action or surfaces an explicit toast — no silent no-ops.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6 Tab 1, §4, P1.1 L20
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Pencil, X as XIcon } from 'lucide-react';
import type { BuildJob, CustomBuildVendor } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { BUILD_JOB_TRANSITIONS } from '@dms/types';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';
import { AssignVendorDialog } from '../../dialogs/assign-vendor-dialog';
import { BuildStageChip } from '../../shared/build-stage-chip';
import { formatINR, daysSince } from '../../shared/format-inr';
import { Card, Field } from '../../shared/detail-card';

interface OverviewTabProps {
  job: BuildJob;
  vendor?: CustomBuildVendor;
}

// ─── Stat tile (Quick stats row) ─────────────────────────────────────────────

function StatTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <p className="text-xs text-ink-muted uppercase tracking-wider">{label}</p>
      <div className="mt-2">{value}</div>
    </div>
  );
}

export function OverviewTab({ job, vendor }: OverviewTabProps) {
  const { user } = useStaffAuth();
  const advanceStage = useCustomBuildsStore((s) => s.advanceStage);
  const approveFinance = useCustomBuildsStore((s) => s.approveFinance);
  const cancelJob = useCustomBuildsStore((s) => s.cancelJob);
  const assignVendor = useCustomBuildsStore((s) => s.assignVendor);
  const updateJobDetails = useCustomBuildsStore((s) => s.updateJobDetails);
  const vendors = useCustomBuildsStore((s) => s.vendors);
  const { toasts, toast, dismiss } = useToast();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(job.enquiryNotes ?? '');

  const role = user?.role ?? 'R05';
  const canAdvance = hasRank(role, 'R09');
  const canFinanceApprove = hasRank(role, 'R12');
  const canCancel = hasRank(role, 'R19');
  const canEditDetails = hasRank(role, 'R10');
  const canAssignVendor = hasRank(role, 'R10');
  const isQcFailed = job.stage === 'QC_FAILED';
  const isTerminal = job.stage === 'DELIVERED' || job.stage === 'CANCELLED';
  const needsFinanceApproval =
    job.stage === 'APPROVED' &&
    (job.quoteTotal ?? 0) > 200_000 &&
    !job.financeApprovalAt;

  const allowedNext = BUILD_JOB_TRANSITIONS[job.stage];
  const primaryNext = allowedNext?.find((s) => s !== 'CANCELLED');

  const actor = user ? { id: user.id, name: user.name, role: user.role } : null;

  const handleAdvance = () => {
    if (!actor || !primaryNext) return;
    try {
      advanceStage(job.id, primaryNext, actor);
      toast(`Stage advanced to ${primaryNext.replace(/_/g, ' ')}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to advance stage', 'error');
    }
  };

  const handleRework = () => {
    if (!actor) return;
    try {
      advanceStage(job.id, 'IN_PROGRESS', actor);
      toast('Job sent back for rework', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to send for rework', 'error');
    }
  };

  const handleFinanceApprove = () => {
    if (!actor) return;
    try {
      approveFinance(job.id, actor);
      toast('Finance approved', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to approve finance', 'error');
    }
  };

  const handleCancel = () => {
    if (!actor) return;
    try {
      cancelJob(job.id, 'Cancelled by manager', actor);
      toast('Job cancelled', 'warning');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to cancel job', 'error');
    }
    setShowCancelDialog(false);
  };

  const handleAssignVendor = (vendorId: string) => {
    if (!actor) return;
    try {
      assignVendor(job.id, vendorId, actor);
      toast('Vendor assigned', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to assign vendor', 'error');
    }
  };

  const handleSaveNotes = () => {
    if (!actor) return;
    try {
      updateJobDetails(job.id, { enquiryNotes: notesValue }, actor);
      setEditingNotes(false);
      toast('Notes saved', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save notes', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Finance approval banner */}
      {needsFinanceApproval && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.3)]">
          <AlertTriangle size={18} className="text-[rgb(var(--state-overdue))] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-primary">Awaiting Finance Approval</p>
            <p className="text-xs text-ink-secondary mt-0.5">
              Quote total exceeds ₹2,00,000. Finance approval required before parts ordering.
            </p>
          </div>
          {canFinanceApprove && (
            <button
              type="button"
              onClick={handleFinanceApprove}
              className="shrink-0 h-8 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Approve Finance
            </button>
          )}
        </div>
      )}

      {/* QC_FAILED rework banner */}
      {isQcFailed && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.3)]">
          <AlertTriangle size={18} className="text-[rgb(var(--state-overdue))] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-primary">QC Failed</p>
            <p className="text-xs text-ink-secondary mt-0.5">
              This build failed quality check. R10+ can send it back for rework.
            </p>
          </div>
          {hasRank(role, 'R10') && (
            <button
              type="button"
              onClick={handleRework}
              className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <RefreshCw size={12} aria-hidden="true" />
              Send for Rework
            </button>
          )}
        </div>
      )}

      {/* Stage action bar */}
      {!isQcFailed && !isTerminal && primaryNext && canAdvance && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleAdvance}
            className="h-9 px-4 rounded bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Advance to {primaryNext.replace(/_/g, ' ')}
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="h-9 px-4 rounded border border-line text-sm font-medium text-ink-secondary hover:text-state-danger hover:border-state-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger"
            >
              Cancel Job
            </button>
          )}
          {canAssignVendor && (
            <button
              type="button"
              onClick={() => setShowVendorDialog(true)}
              className="h-9 px-4 rounded border border-line text-sm font-medium text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {vendor ? 'Change Vendor' : 'Assign Vendor'}
            </button>
          )}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Stage" value={<BuildStageChip stage={job.stage} />} />
        <StatTile
          label="Quote Total"
          value={
            <p className="font-mono text-base text-ink-primary tabular-nums">
              {job.quoteTotal ? formatINR(job.quoteTotal) : '—'}
            </p>
          }
        />
        <StatTile
          label="Days Open"
          value={
            <p className="font-mono text-base text-ink-primary tabular-nums">
              {daysSince(job.createdAt)}d
            </p>
          }
        />
        <StatTile
          label="Parts"
          value={
            <p className="font-mono text-base text-ink-primary tabular-nums">
              {job.parts.length}
            </p>
          }
        />
      </div>

      {/* Job Details + Enquiry Notes — canonical Card pattern */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Job Details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field
              label="Customer"
              value={
                <Link
                  href={`/customers/${job.customerId}`}
                  className="text-accent hover:underline"
                >
                  {job.customerId.replace('cust-', '').replace(/-/g, ' ')}
                </Link>
              }
            />
            <Field
              label="Vehicle VIN"
              value={
                <Link
                  href={`/vehicles/${job.vin}`}
                  className="font-mono text-xs text-accent hover:underline"
                >
                  {job.vin}
                </Link>
              }
            />
            <Field
              label="Outlet"
              value={<span className="font-mono text-xs">{job.outletId}</span>}
            />
            <Field
              label="Vendor"
              value={
                vendor ? (
                  <span>{vendor.name}</span>
                ) : (
                  <span className="text-ink-muted italic text-xs">Not assigned</span>
                )
              }
            />
            <Field
              label="BN Margin"
              value={<span className="font-mono">{job.marginPct}%</span>}
            />
            {job.financeApprovalAt && (
              <Field
                label="Finance Approved"
                value={
                  <span className="text-[rgb(var(--state-listed))] text-xs">
                    {new Date(job.financeApprovalAt).toLocaleDateString('en-IN')}
                  </span>
                }
              />
            )}
          </dl>
        </Card>

        <Card
          title="Enquiry Notes"
          rightSlot={
            canEditDetails && !isTerminal && !editingNotes ? (
              <button
                type="button"
                onClick={() => {
                  setNotesValue(job.enquiryNotes ?? '');
                  setEditingNotes(true);
                }}
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                aria-label="Edit enquiry notes"
              >
                <Pencil size={11} aria-hidden="true" />
                Edit
              </button>
            ) : editingNotes ? (
              <button
                type="button"
                onClick={() => setEditingNotes(false)}
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
                aria-label="Cancel editing"
              >
                <XIcon size={11} aria-hidden="true" />
                Cancel
              </button>
            ) : undefined
          }
        >
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                placeholder="Add enquiry notes..."
                aria-label="Enquiry notes"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="h-8 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Save Notes
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-secondary leading-relaxed min-h-[80px]">
              {job.enquiryNotes || (
                <span className="text-ink-muted italic">No notes yet.</span>
              )}
            </p>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <AlertDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        title="Cancel Build Job?"
        description={`This will cancel "${job.title}" permanently. This action cannot be undone.`}
        confirmLabel="Cancel Job"
        cancelLabel="Keep Job"
        destructive
        requireTypeToConfirm="CANCEL"
        onConfirm={handleCancel}
      />

      <AssignVendorDialog
        open={showVendorDialog}
        onClose={() => setShowVendorDialog(false)}
        vendors={vendors}
        currentVendorId={job.vendorId}
        onAssign={handleAssignVendor}
      />
    </div>
  );
}
