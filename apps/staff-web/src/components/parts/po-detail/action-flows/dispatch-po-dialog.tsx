/**
 * DispatchPoDialog — marks an APPROVED PO as DISPATCHED.
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

export interface DispatchPoDialogProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder;
}

export function DispatchPoDialog({ open, onClose, po }: DispatchPoDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    const ok = usePartsStore.getState().transitionPurchaseOrder(po.id, 'DISPATCHED', {
      actor: { id: user.id, name: user.name },
    });
    setBusy(false);
    if (ok) {
      setNote('');
      onClose();
      toast(`${po.poNo} → ${poStatusLabel('DISPATCHED')}`, 'success');
    } else {
      toast('Transition not allowed', 'error');
    }
  }

  function handleClose() {
    setNote('');
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Mark as Dispatched"
        subtitle={po.poNo}
        size="sm"
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
              disabled={busy}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {busy ? 'Saving…' : 'Mark Dispatched'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-secondary">
            Confirm that{' '}
            <span className="font-mono font-semibold text-ink-primary">{po.poNo}</span>{' '}
            has been dispatched by the supplier.
          </p>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="dispatch-note"
              className="text-[12px] font-medium text-ink-primary"
            >
              Tracking note <span className="text-ink-muted">(optional)</span>
            </label>
            <textarea
              id="dispatch-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. courier tracking number, AWB, or internal reference…"
              className={cn(
                'w-full rounded-md border border-line bg-bg-subtle px-3 py-2',
                'text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                'placeholder:text-ink-muted',
              )}
            />
          </div>
        </div>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
