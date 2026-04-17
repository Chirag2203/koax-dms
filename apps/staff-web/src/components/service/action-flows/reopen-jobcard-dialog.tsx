'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Reopen for Rework',
  subtitle: 'Reopens the job card from DELIVERED state and sets it back to IN_PROGRESS.',
  labelReason: 'Reason for Rework',
  reasonPlaceholder: 'Describe why this job card needs to be reopened...',
  cancel: 'Cancel',
  submit: 'Reopen Job Card',
  success: 'Job card reopened for rework',
  errorReason: 'Reason is required',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReopenJobCardDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  onComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReopenJobCardDialog({
  open,
  onClose,
  jobCardId,
  onComplete,
}: ReopenJobCardDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const { user } = useStaffAuth();
  const reopenJobCard = useServiceStore((s) => s.reopenJobCard);
  const { toasts, toast, dismiss } = useToast();

  function handleClose() {
    setReason('');
    setReasonError('');
    onClose();
  }

  function handleSubmit() {
    if (!reason.trim()) {
      setReasonError(MESSAGES.errorReason);
      return;
    }
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    reopenJobCard(jobCardId, reason.trim(), actor);
    toast(MESSAGES.success, 'success');
    handleClose();
    onComplete?.();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={MESSAGES.title}
        subtitle={MESSAGES.subtitle}
        size="sm"
        dirty={reason.length > 0}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              {MESSAGES.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white',
                'text-sm font-medium hover:bg-accent-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              {MESSAGES.submit}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
            {MESSAGES.labelReason} <span className="text-ink-muted">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError('');
            }}
            rows={5}
            placeholder={MESSAGES.reasonPlaceholder}
            className={cn(
              'w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              reasonError ? 'border-state-danger' : 'border-line',
            )}
          />
          {reasonError && (
            <p className="text-xs text-state-danger mt-1">{reasonError}</p>
          )}
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
