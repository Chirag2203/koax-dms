/**
 * RecordDiscrepancyDialog — records discrepancy notes on a GRN (not a transition).
 *
 * Every save sets threeWayMatchStatus = 'DISCREPANCY'. Idempotent.
 * Spec reference: PLAN-PARTS-006 §7
 */

'use client';

import { useState } from 'react';
import type { Grn } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { cn } from '@dms/ui';

export interface RecordDiscrepancyDialogProps {
  open: boolean;
  onClose: () => void;
  grn: Grn;
}

export function RecordDiscrepancyDialog({
  open,
  onClose,
  grn,
}: RecordDiscrepancyDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  // Pre-populate with existing notes if any
  const [notes, setNotes] = useState(grn.discrepancyNotes ?? '');
  const [busy, setBusy] = useState(false);

  const canConfirm = notes.trim().length >= 4;

  async function handleConfirm() {
    if (!user || !canConfirm) return;
    setBusy(true);
    usePartsStore.getState().updateGrn(
      grn.id,
      {
        threeWayMatchStatus: 'DISCREPANCY',
        discrepancyNotes: notes.trim(),
      },
      { id: user.id, name: user.name },
    );
    setBusy(false);
    onClose();
    toast(`${grn.grnNo} marked with discrepancy`, 'success');
  }

  function handleClose() {
    // Don't reset — let user edit existing notes next time
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Record Discrepancy"
        subtitle={grn.grnNo}
        size="sm"
        dirty={notes !== (grn.discrepancyNotes ?? '')}
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
                'h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {busy ? 'Saving…' : 'Save Discrepancy'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-secondary">
            Record notes about the discrepancy found during inspection.
            This does not block posting — discrepancy is informational.
          </p>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="discrepancy-notes"
              className="text-[12px] font-medium text-ink-primary"
            >
              Discrepancy notes{' '}
              <span className="text-[rgb(var(--state-danger))]">*</span>
            </label>
            <textarea
              id="discrepancy-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe the discrepancy — short receipt, damaged item, wrong part…"
              className={cn(
                'w-full rounded-md border border-line bg-bg-subtle px-3 py-2',
                'text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                'placeholder:text-ink-muted',
              )}
            />
            <span className="text-[11px] text-ink-muted">
              {notes.trim().length} / 4 characters minimum
            </span>
          </div>
        </div>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
