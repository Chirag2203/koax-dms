/**
 * MarkMatchedDialog — transitions a PENDING_QC GRN to MATCHED.
 *
 * Shows 3-way match summary (line count, ordered vs received, damages).
 * Spec reference: PLAN-PARTS-006 §7
 */

'use client';

import { useState, useMemo } from 'react';
import type { Grn } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { grnStatusLabel, getShortReceiptCount, getDamagedLineCount } from '../grn-detail-helpers';
import { cn } from '@dms/ui';

export interface MarkMatchedDialogProps {
  open: boolean;
  onClose: () => void;
  grn: Grn;
}

export function MarkMatchedDialog({ open, onClose, grn }: MarkMatchedDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [busy, setBusy] = useState(false);

  const shortCount = useMemo(() => getShortReceiptCount(grn), [grn]);
  const damagedCount = useMemo(() => getDamagedLineCount(grn), [grn]);

  const totalOrdered = grn.lines.reduce((acc, l) => acc + l.orderedQty, 0);
  const totalReceived = grn.lines.reduce((acc, l) => acc + l.receivedQty, 0);

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    const ok = usePartsStore.getState().transitionGrn(grn.id, 'MATCHED', {
      actor: { id: user.id, name: user.name },
    });
    setBusy(false);
    if (ok) {
      onClose();
      toast(`${grn.grnNo} → ${grnStatusLabel('MATCHED')}`, 'success');
    } else {
      toast('Transition not allowed', 'error');
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Mark as Matched"
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
              {busy ? 'Matching…' : 'Mark Matched'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-secondary">
            3-way match summary for{' '}
            <span className="font-mono font-semibold text-ink-primary">{grn.grnNo}</span>:
          </p>
          <div className="rounded-md bg-bg-subtle border border-line p-3 flex flex-col gap-2">
            <SummaryRow label="Lines" value={String(grn.lines.length)} />
            <SummaryRow
              label="Ordered qty"
              value={String(totalOrdered)}
            />
            <SummaryRow
              label="Received qty"
              value={String(totalReceived)}
              muted={totalReceived < totalOrdered}
            />
            {shortCount > 0 && (
              <SummaryRow
                label="Short receipt lines"
                value={String(shortCount)}
                warning
              />
            )}
            {damagedCount > 0 && (
              <SummaryRow
                label="Damaged / wrong lines"
                value={String(damagedCount)}
                danger
              />
            )}
          </div>
          {(shortCount > 0 || damagedCount > 0) && (
            <p className="text-[12px] text-ink-muted">
              Discrepancies noted. You can record a discrepancy note after matching.
            </p>
          )}
        </div>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  warning,
  danger,
}: {
  label: string;
  value: string;
  muted?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <span
        className={cn(
          'font-mono text-[12px] font-semibold',
          warning && 'text-[rgb(var(--state-overdue))]',
          danger && 'text-[rgb(var(--state-danger))]',
          muted && !warning && !danger && 'text-ink-muted',
          !warning && !danger && !muted && 'text-ink-primary',
        )}
      >
        {value}
      </span>
    </div>
  );
}
