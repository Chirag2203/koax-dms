'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import type { WarrantyClaimStatus } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const TRANSITION_LABELS: Record<WarrantyClaimStatus, string> = {
  DRAFT: 'Save as Draft',
  SUBMITTED: 'Submit Claim',
  UNDER_REVIEW: 'Approve for Review',
  APPROVED: 'Approve Claim',
  REJECTED: 'Reject Claim',
  PAID: 'Mark as Paid',
};

const TRANSITION_MESSAGES: Partial<Record<WarrantyClaimStatus, string>> = {
  UNDER_REVIEW: 'This will move the claim to Under Review status. Provide any notes below.',
  APPROVED: 'Approving this claim will allow it to be marked for payment.',
  REJECTED: 'Please provide a detailed reason for rejection. This will be recorded.',
  PAID: 'This will mark the claim as paid. Confirm the payment reference if applicable.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WarrantyStatusDialogProps {
  open: boolean;
  onClose: () => void;
  claimId: string;
  targetStatus: WarrantyClaimStatus;
  /** Whether reason textarea is required (e.g. for REJECTED) */
  requireReason?: boolean;
  onComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WarrantyStatusDialog({
  open,
  onClose,
  claimId,
  targetStatus,
  requireReason = false,
  onComplete,
}: WarrantyStatusDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const { user } = useStaffAuth();
  const updateWarrantyClaimStatus = useServiceStore((s) => s.updateWarrantyClaimStatus);
  const { toasts, toast, dismiss } = useToast();

  const isDestructive = targetStatus === 'REJECTED';
  const actionLabel = TRANSITION_LABELS[targetStatus] ?? 'Confirm';
  const helpText = TRANSITION_MESSAGES[targetStatus];

  function handleClose() {
    setReason('');
    setReasonError('');
    onClose();
  }

  function handleSubmit() {
    if (requireReason && !reason.trim()) {
      setReasonError('Reason is required');
      return;
    }
    const actor = { id: user?.id ?? 'staff-r24-001', name: user?.name ?? 'Meera Iyer' };
    updateWarrantyClaimStatus(claimId, targetStatus, reason.trim() || undefined, actor);
    toast(`Claim ${actionLabel.toLowerCase()}`, 'success');
    handleClose();
    onComplete?.();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={actionLabel}
        size="sm"
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
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 rounded-md text-white',
                'text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                isDestructive
                  ? 'bg-state-danger hover:bg-state-danger/90 focus-visible:ring-state-danger'
                  : 'bg-accent hover:bg-accent-hover focus-visible:ring-accent',
              )}
            >
              {actionLabel}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {helpText && (
            <p className="text-[13px] text-ink-secondary">{helpText}</p>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
              {requireReason ? 'Reason *' : 'Notes (optional)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
              rows={4}
              placeholder={
                targetStatus === 'REJECTED'
                  ? 'Explain why the claim is being rejected...'
                  : 'Add any notes or comments...'
              }
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
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
