/**
 * RejectGrnDialog — rejects a PENDING_QC GRN with mandatory reason.
 *
 * Uses Dialog (not AlertDialog) to accommodate the textarea body.
 * Spec reference: PLAN-PARTS-006 §7
 */

'use client';

import { useState } from 'react';
import type { Grn } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { grnStatusLabel } from '../grn-detail-helpers';
import { cn } from '@dms/ui';

export interface RejectGrnDialogProps {
  open: boolean;
  onClose: () => void;
  grn: Grn;
}

export function RejectGrnDialog({ open, onClose, grn }: RejectGrnDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const canConfirm = reason.trim().length >= 4;

  async function handleConfirm() {
    if (!user || !canConfirm) return;
    setBusy(true);
    const ok = usePartsStore.getState().transitionGrn(grn.id, 'REJECTED', {
      reason: reason.trim(),
      actor: { id: user.id, name: user.name },
    });
    setBusy(false);
    if (ok) {
      setReason('');
      onClose();
      toast(`${grn.grnNo} → ${grnStatusLabel('REJECTED')}`, 'success');
    } else {
      toast('Transition not allowed', 'error');
    }
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Reject GRN"
        subtitle={grn.grnNo}
        size="sm"
        dirty={reason.trim().length > 0}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || busy}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white',
                'bg-[rgb(var(--state-danger))] hover:bg-[rgb(var(--state-danger)/0.9)]',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--state-danger))]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {busy ? 'Rejecting…' : 'Reject GRN'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-secondary">
            Please provide a reason for rejecting this GRN. The goods will need
            to be returned to the supplier.
          </p>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reject-grn-reason"
              className="text-[12px] font-medium text-ink-primary"
            >
              Reason for rejection{' '}
              <span className="text-[rgb(var(--state-danger))]">*</span>
            </label>
            <textarea
              id="reject-grn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Enter reason (minimum 4 characters)…"
              className={cn(
                'w-full rounded-md border border-line bg-bg-subtle px-3 py-2',
                'text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                'placeholder:text-ink-muted',
              )}
            />
            <span className="text-[11px] text-ink-muted">
              {reason.trim().length} / 4 characters minimum
            </span>
          </div>
        </div>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
