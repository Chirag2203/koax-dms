/**
 * Vendor & Schedule tab — vendor card + editable schedule + notes.
 *
 * CRUD: assign/change vendor (R10+, Dialog), edit start/completion dates,
 * set vendor confirmation status, edit vendor notes (R09+).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6 Tab 3, P1.1 L21
 */

'use client';

import { useState } from 'react';
import { Star, Pencil, X as XIcon } from 'lucide-react';
import type { BuildJob, CustomBuildVendor } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';
import { AssignVendorDialog } from '../../dialogs/assign-vendor-dialog';
import { Card, Field } from '../../shared/detail-card';

interface VendorScheduleTabProps {
  job: BuildJob;
  vendor?: CustomBuildVendor;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= Math.round(rating) ? 'text-[rgb(var(--state-in-refurb))] fill-current' : 'text-ink-muted'}
          aria-hidden="true"
        />
      ))}
      <span className="ml-1 font-mono text-xs text-ink-secondary tabular-nums">{rating.toFixed(1)}</span>
    </div>
  );
}

type ConfirmStatus = 'pending' | 'confirmed' | 'revised';

const CONFIRM_COLORS: Record<ConfirmStatus, string> = {
  pending: 'text-[rgb(var(--state-pending))]',
  confirmed: 'text-[rgb(var(--state-listed))]',
  revised: 'text-[rgb(var(--state-in-refurb))]',
};

export function VendorScheduleTab({ job, vendor }: VendorScheduleTabProps) {
  const { user } = useStaffAuth();
  const updateSchedule = useCustomBuildsStore((s) => s.updateSchedule);
  const assignVendor = useCustomBuildsStore((s) => s.assignVendor);
  const vendors = useCustomBuildsStore((s) => s.vendors);
  const { toasts, toast, dismiss } = useToast();

  const role = user?.role ?? 'R05';
  const canEditSchedule = hasRank(role, 'R09');
  const canAssignVendor = hasRank(role, 'R10');
  const isTerminal = job.stage === 'DELIVERED' || job.stage === 'CANCELLED';
  const actor = user ? { id: user.id, name: user.name, role: user.role } : null;

  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [startDate, setStartDate] = useState(job.estimatedStartDate ?? '');
  const [endDate, setEndDate] = useState(job.estimatedCompletionDate ?? '');
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>(
    (job.vendorConfirmationStatus as ConfirmStatus) ?? 'pending',
  );
  const [editingNotes, setEditingNotes] = useState(false);
  const [vendorNotes, setVendorNotes] = useState(job.vendorNotes ?? '');

  const handleSaveSchedule = () => {
    if (!actor) return;
    try {
      updateSchedule(job.id, {
        estimatedStartDate: startDate || undefined,
        estimatedCompletionDate: endDate || undefined,
        vendorConfirmationStatus: confirmStatus,
      }, actor);
      setEditingSchedule(false);
      toast('Schedule updated', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update schedule', 'error');
    }
  };

  const handleSaveNotes = () => {
    if (!actor) return;
    try {
      updateSchedule(job.id, { vendorNotes }, actor);
      setEditingNotes(false);
      toast('Vendor notes saved', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save notes', 'error');
    }
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

  return (
    <div className="p-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* No vendor state */}
      {!vendor ? (
        <div className="rounded-md border border-dashed border-line p-8 text-center">
          <p className="text-base font-medium text-ink-primary">No vendor assigned</p>
          <p className="text-sm text-ink-muted mt-1">
            {canAssignVendor
              ? 'Assign a vendor to track schedule and coordination.'
              : 'Vendor assignment requires Manager role (R10+).'}
          </p>
          {canAssignVendor && !isTerminal && (
            <button
              type="button"
              onClick={() => setShowVendorDialog(true)}
              className="mt-4 h-9 px-4 rounded bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Assign Vendor
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vendor card */}
          <Card
            title={vendor.name}
            rightSlot={
              <div className="flex items-center gap-3">
                <StarRating rating={vendor.rating} />
                {canAssignVendor && !isTerminal && (
                  <button
                    type="button"
                    onClick={() => setShowVendorDialog(true)}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                    aria-label="Change vendor"
                  >
                    <Pencil size={11} aria-hidden="true" />
                    Change
                  </button>
                )}
              </div>
            }
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="City" value={vendor.city} />
              <Field
                label="Contact"
                value={
                  <span className="space-y-0.5 block">
                    <span className="block">{vendor.contactName}</span>
                    <span className="block text-ink-secondary">{vendor.contactPhone}</span>
                    <span className="block text-ink-secondary">{vendor.contactEmail}</span>
                  </span>
                }
              />
              <Field
                label="Active Jobs"
                value={<span className="font-mono">{vendor.activeJobCount}</span>}
              />
              <Field
                label="On-time Rate"
                value={<span className="font-mono">{vendor.onTimePct}%</span>}
              />
              <Field
                label="Lifetime Jobs"
                value={<span className="font-mono">{vendor.lifetimeJobCount}</span>}
              />
              <Field label="Payment Terms" value={vendor.paymentTerms} />
              {vendor.gstIn && (
                <Field
                  label="GSTIN"
                  value={<span className="font-mono text-xs">{vendor.gstIn}</span>}
                />
              )}
            </dl>
            {vendor.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-line">
                {vendor.specialties.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-bg-subtle text-xs text-ink-secondary capitalize">{s}</span>
                ))}
              </div>
            )}
          </Card>

          {/* Schedule */}
          <Card
            title="Schedule"
            rightSlot={
              canEditSchedule && !isTerminal ? (
                editingSchedule ? (
                  <button
                    type="button"
                    onClick={() => setEditingSchedule(false)}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    <XIcon size={11} aria-hidden="true" />
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(job.estimatedStartDate ?? '');
                      setEndDate(job.estimatedCompletionDate ?? '');
                      setConfirmStatus((job.vendorConfirmationStatus as ConfirmStatus) ?? 'pending');
                      setEditingSchedule(true);
                    }}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-accent transition-colors"
                    aria-label="Edit schedule"
                  >
                    <Pencil size={11} aria-hidden="true" />
                    Edit
                  </button>
                )
              ) : undefined
            }
          >
            {editingSchedule ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-ink-muted uppercase tracking-wider mb-1" htmlFor="start-date">
                      Est. Start
                    </label>
                    <input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-line bg-bg-subtle text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-muted uppercase tracking-wider mb-1" htmlFor="end-date">
                      Est. Completion
                    </label>
                    <input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-line bg-bg-subtle text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-ink-muted uppercase tracking-wider mb-1">
                    Confirmation Status
                  </label>
                  <div className="flex items-center gap-2">
                    {(['pending', 'confirmed', 'revised'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setConfirmStatus(s)}
                        className={`h-7 px-3 rounded text-xs font-medium transition-colors capitalize focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                          confirmStatus === s
                            ? 'bg-accent text-white'
                            : 'bg-bg-subtle text-ink-secondary hover:bg-bg-hover'
                        }`}
                        aria-pressed={confirmStatus === s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="h-8 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Save Schedule
                </button>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field
                  label="Est. Start"
                  value={job.estimatedStartDate
                    ? new Date(job.estimatedStartDate).toLocaleDateString('en-IN')
                    : undefined}
                />
                <Field
                  label="Est. Completion"
                  value={job.estimatedCompletionDate
                    ? new Date(job.estimatedCompletionDate).toLocaleDateString('en-IN')
                    : undefined}
                />
                <div className="col-span-2">
                  <Field
                    label="Confirmation Status"
                    value={
                      <span className={`font-medium capitalize ${CONFIRM_COLORS[(job.vendorConfirmationStatus as ConfirmStatus) ?? 'pending']}`}>
                        {job.vendorConfirmationStatus ?? 'Pending'}
                      </span>
                    }
                  />
                </div>
              </dl>
            )}
          </Card>

          {/* Notes to vendor */}
          <Card
            title="Notes to Vendor"
            rightSlot={
              canEditSchedule && !isTerminal ? (
                editingNotes ? (
                  <button
                    type="button"
                    onClick={() => setEditingNotes(false)}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    <XIcon size={11} aria-hidden="true" />
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setVendorNotes(job.vendorNotes ?? ''); setEditingNotes(true); }}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-accent transition-colors"
                    aria-label="Edit vendor notes"
                  >
                    <Pencil size={11} aria-hidden="true" />
                    Edit
                  </button>
                )
              ) : undefined
            }
          >
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                  placeholder="Add notes for the vendor..."
                  aria-label="Notes to vendor"
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
              <p className="text-sm text-ink-secondary leading-relaxed min-h-[60px]">
                {job.vendorNotes || <span className="text-ink-muted italic">No notes yet.</span>}
              </p>
            )}
          </Card>
        </>
      )}

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
