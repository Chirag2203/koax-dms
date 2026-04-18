/**
 * CancelPoDialog — cancels a DRAFT or APPROVED PO with mandatory reason.
 *
 * Type-to-confirm when po.total >= 200_000.
 * Uses Dialog (not AlertDialog) because we need a textarea body.
 * Spec reference: PLAN-PARTS-006 §6
 */

'use client';

import { useState } from 'react';
import type { PurchaseOrder } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { formatINR, poStatusToChip } from '../../helpers';
import { poStatusLabel } from '../po-detail-helpers';
import { cn } from '@dms/ui';

export interface CancelPoDialogProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder;
}

const REQUIRE_TYPE_THRESHOLD = 200_000;

export function CancelPoDialog({ open, onClose, po }: CancelPoDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [reason, setReason] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [busy, setBusy] = useState(false);

  const requiresTypeConfirm = po.total >= REQUIRE_TYPE_THRESHOLD;
  const confirmWord = po.poNo;

  const canConfirm =
    reason.trim().length >= 4 &&
    (!requiresTypeConfirm || typeInput === confirmWord);

  async function handleConfirm() {
    if (!user || !canConfirm) return;
    setBusy(true);
    const ok = usePartsStore.getState().transitionPurchaseOrder(po.id, 'CANCELLED', {
      reason: reason.trim(),
      actor: { id: user.id, name: user.name },
    });
    setBusy(false);
    if (ok) {
      setReason('');
      setTypeInput('');
      onClose();
      toast(`${po.poNo} → ${poStatusLabel('CANCELLED')}`, 'success');
    } else {
      toast('Transition not allowed', 'error');
    }
  }

  function handleClose() {
    setReason('');
    setTypeInput('');
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Cancel Purchase Order"
        subtitle={po.poNo}
        size="sm"
        dirty={reason.trim().length > 0}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Keep PO
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
              {busy ? 'Cancelling…' : 'Cancel PO'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-secondary">
            This will permanently cancel{' '}
            <span className="font-mono font-semibold text-ink-primary">{po.poNo}</span>{' '}
            ({formatINR(po.total)}). This action cannot be undone.
          </p>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cancel-reason"
              className="text-[12px] font-medium text-ink-primary"
            >
              Reason for cancellation <span className="text-[rgb(var(--state-danger))]">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason (minimum 4 characters)…"
              className={cn(
                'w-full rounded-md border border-line bg-bg-subtle px-3 py-2',
                'text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                'placeholder:text-ink-muted',
              )}
            />
          </div>
          {requiresTypeConfirm && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[12px] text-ink-muted">
                Type{' '}
                <span className="font-mono font-semibold text-ink-primary">
                  {confirmWord}
                </span>{' '}
                to confirm cancellation of this high-value PO.
              </p>
              <input
                type="text"
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                placeholder={confirmWord}
                autoComplete="off"
                className={cn(
                  'h-10 w-full rounded-md border border-line bg-bg-subtle px-3',
                  'font-mono text-sm text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  'placeholder:text-ink-muted',
                )}
              />
            </div>
          )}
        </div>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
