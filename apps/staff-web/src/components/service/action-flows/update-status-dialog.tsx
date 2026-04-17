'use client';

import { useState } from 'react';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives/dialog';
import { StateChip } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import type { JobCardStatus } from '@dms/types';
import { allowedNext } from '@/src/lib/service/state-machine';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Update Job Card Status',
  currentStatus: 'Current Status',
  moveTo: 'Move to',
  note: 'Note (optional)',
  notePlaceholder: 'Add a note about this status change...',
  reason: 'Reason',
  reasonPlaceholder: 'Required for this status transition...',
  cancel: 'Cancel',
  update: 'Update Status',
  updating: 'Updating...',
  selectStatus: 'Select new status',
  reasonRequired: 'A reason is required for this status change.',
};

// Statuses that require a reason (uses state-machine allowedNext for options)
const REASON_REQUIRED: JobCardStatus[] = [
  'WAITING_PARTS',
  'ADDITIONAL_WORK_APPROVAL',
  'CANCELLED',
  'REOPENED',
];

// ─── Status labels ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<JobCardStatus, string> = {
  RECEIVED: 'Received',
  DIAGNOSED: 'Diagnosed',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting Parts',
  ADDITIONAL_WORK_APPROVAL: 'Additional Work Approval',
  QC: 'Quality Check',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REOPENED: 'Reopened for Rework',
};

const STATUS_TO_CHIP: Record<JobCardStatus, StateChipStatus> = {
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateStatusDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  currentStatus: JobCardStatus;
  onStatusChange?: (newStatus: JobCardStatus) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpdateStatusDialog({
  open,
  onClose,
  jobCardId: _jobCardId,
  currentStatus,
  onStatusChange,
}: UpdateStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<JobCardStatus | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedTransitions = allowedNext(currentStatus);
  const needsReason = selectedStatus ? REASON_REQUIRED.includes(selectedStatus) : false;

  function handleClose() {
    setSelectedStatus(null);
    setNote('');
    setReason('');
    setValidationError('');
    setIsSubmitting(false);
    onClose();
  }

  function handleSubmit() {
    if (!selectedStatus) return;
    if (needsReason && !reason.trim()) {
      setValidationError(MESSAGES.reasonRequired);
      return;
    }
    setValidationError('');
    setIsSubmitting(true);

    // Simulate async update — invoke callback and close
    onStatusChange?.(selectedStatus);
    handleClose();
  }

  const inputClass =
    'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={MESSAGES.title}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="h-10 px-4 rounded-md border border-line bg-bg-canvas text-sm font-medium text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {MESSAGES.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedStatus || isSubmitting}
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
              'hover:bg-accent-hover transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {isSubmitting ? MESSAGES.updating : MESSAGES.update}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Current status */}
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted mb-2 font-medium">
            {MESSAGES.currentStatus}
          </p>
          <StateChip status={STATUS_TO_CHIP[currentStatus]} />
        </div>

        {/* Select next status */}
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted mb-2 font-medium">
            {MESSAGES.moveTo}
          </p>
          {allowedTransitions.length === 0 ? (
            <p className="text-sm text-ink-muted italic">
              This status is terminal — no further transitions available.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(status);
                    setValidationError('');
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                    selectedStatus === status
                      ? 'border-accent bg-accent/10 text-ink-primary'
                      : 'border-line bg-bg-surface text-ink-secondary hover:bg-bg-subtle hover:text-ink-primary',
                  )}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reason (required for some transitions) */}
        {needsReason && (
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-muted mb-1.5 block font-medium">
              {MESSAGES.reason} <span className="text-ink-muted">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setValidationError('');
              }}
              placeholder={MESSAGES.reasonPlaceholder}
              className={inputClass}
            />
            {validationError && (
              <p className="text-xs text-state-danger mt-1">{validationError}</p>
            )}
          </div>
        )}

        {/* Optional note */}
        <div>
          <label className="text-xs uppercase tracking-wide text-ink-muted mb-1.5 block font-medium">
            {MESSAGES.note}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={MESSAGES.notePlaceholder}
            rows={3}
            className="w-full bg-bg-subtle border border-line rounded-md px-3 py-2 text-sm text-ink-primary resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>

      </div>
    </Dialog>
  );
}
