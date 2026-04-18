/**
 * ClosePoDialog — closes a RECEIVED PO.
 *
 * Spec reference: PLAN-PARTS-006 §6
 */

'use client';

import { useState } from 'react';
import type { PurchaseOrder } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { poStatusLabel } from '../po-detail-helpers';
import { cn } from '@dms/ui';

export interface ClosePoDialogProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder;
}

export function ClosePoDialog({ open, onClose, po }: ClosePoDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    const ok = usePartsStore.getState().transitionPurchaseOrder(po.id, 'CLOSED', {
      actor: { id: user.id, name: user.name },
    });
    setBusy(false);
    if (ok) {
      onClose();
      toast(`${po.poNo} → ${poStatusLabel('CLOSED')}`, 'success');
    } else {
      toast('Transition not allowed', 'error');
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Close Purchase Order"
        subtitle={po.poNo}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {busy ? 'Closing…' : 'Close PO'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-secondary">
            Close{' '}
            <span className="font-mono font-semibold text-ink-primary">{po.poNo}</span>?
            This marks the procurement cycle as complete.
          </p>
          <p className="text-[12px] text-ink-muted">
            All goods have been received and verified. Closing this PO archives
            it for reporting purposes.
          </p>
        </div>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
