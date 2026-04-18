/**
 * SubmitQcDialog — submits a DRAFT GRN to PENDING_QC.
 *
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

export interface SubmitQcDialogProps {
  open: boolean;
  onClose: () => void;
  grn: Grn;
}

export function SubmitQcDialog({ open, onClose, grn }: SubmitQcDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    const ok = usePartsStore.getState().transitionGrn(grn.id, 'PENDING_QC', {
      actor: { id: user.id, name: user.name },
    });
    setBusy(false);
    if (ok) {
      onClose();
      toast(`${grn.grnNo} → ${grnStatusLabel('PENDING_QC')}`, 'success');
    } else {
      toast('Transition not allowed', 'error');
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Submit for QC"
        subtitle={grn.grnNo}
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
              {busy ? 'Submitting…' : 'Submit for QC'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          Submit{' '}
          <span className="font-mono font-semibold text-ink-primary">{grn.grnNo}</span>{' '}
          for quality control inspection? This will enable the QC team to
          verify and match the received goods.
        </p>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
