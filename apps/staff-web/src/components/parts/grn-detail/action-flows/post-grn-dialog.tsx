/**
 * PostGrnDialog — the big one. Posts a MATCHED GRN to inventory.
 *
 * Shows previewPostEffects panel. Handles postGrn failure inline.
 * Spec reference: PLAN-PARTS-006 §7
 */

'use client';

import { useState, useMemo } from 'react';
import type { Grn, PurchaseOrder } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { previewPostEffects } from '../grn-detail-helpers';
import { OUTLET_NAMES } from '../../helpers';
import { cn } from '@dms/ui';

export interface PostGrnDialogProps {
  open: boolean;
  onClose: () => void;
  grn: Grn;
  po: PurchaseOrder | undefined;
}

const MAX_PART_PREVIEW = 5;

export function PostGrnDialog({ open, onClose, grn, po }: PostGrnDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const parts = usePartsStore((s) => s.parts);
  const allGrns = usePartsStore((s) => s.grns);

  const preview = useMemo(
    () => previewPostEffects(grn, po, parts, allGrns),
    [grn, po, parts, allGrns],
  );

  const eligibleLines = grn.lines.filter(
    (l) => l.condition === 'OK' && l.receivedQty > 0,
  );

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    setInlineError(null);

    const ok = usePartsStore.getState().postGrn(grn.id, { id: user.id, name: user.name });

    setBusy(false);

    if (ok) {
      onClose();
      toast(
        `${grn.grnNo} posted · ${preview.movementCount} stock movement${preview.movementCount !== 1 ? 's' : ''} written`,
        'success',
      );
    } else {
      // Keep dialog open — show inline error per spec §7
      setInlineError('Transition not allowed from current state.');
      toast('Transition not allowed', 'error');
    }
  }

  const outletLabel = (outletId: string) => OUTLET_NAMES[outletId] ?? outletId;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Post to Inventory"
        subtitle={grn.grnNo}
        size="md"
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
              {busy ? 'Posting…' : 'Post to Inventory'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Inline error */}
          {inlineError && (
            <div className="rounded-md border border-[rgb(var(--state-danger)/0.3)] bg-[rgb(var(--state-danger)/0.07)] px-4 py-3">
              <p className="text-sm text-[rgb(var(--state-danger))]">{inlineError}</p>
            </div>
          )}

          {/* Stock movements summary */}
          <div className="rounded-md bg-bg-subtle border border-line p-4">
            <p className="text-sm font-semibold text-ink-primary mb-3">
              {preview.movementCount} IN stock movement{preview.movementCount !== 1 ? 's' : ''} across{' '}
              {preview.perPartDeltas.length} part{preview.perPartDeltas.length !== 1 ? 's' : ''}
            </p>

            {/* Per-outlet + per-part deltas */}
            {preview.perPartDeltas.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {preview.perPartDeltas
                  .slice(0, MAX_PART_PREVIEW)
                  .map(({ partCode, delta }) => {
                    const outletId = grn.outletId;
                    return (
                      <li key={partCode} className="font-mono text-[12px] text-ink-secondary">
                        <span className="text-ink-muted mr-2">{outletLabel(outletId)}</span>
                        <span className="text-[rgb(var(--state-listed))]">+{delta}</span>
                        <span className="ml-2 text-ink-primary">{partCode}</span>
                      </li>
                    );
                  })}
                {preview.perPartDeltas.length > MAX_PART_PREVIEW && (
                  <li className="font-mono text-[12px] text-ink-muted">
                    +{preview.perPartDeltas.length - MAX_PART_PREVIEW} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-muted">
                No eligible lines (all lines are DAMAGED/WRONG or have 0 received qty).
              </p>
            )}
          </div>

          {/* PO auto-transition */}
          <div className="rounded-md bg-bg-subtle border border-line px-4 py-3">
            {po ? (
              preview.poTransition ? (
                <p className="text-[13px] text-ink-secondary">
                  <span className="font-mono font-semibold text-ink-primary">{po.poNo}</span>{' '}
                  will auto-transition to{' '}
                  <span className="font-semibold text-ink-primary">
                    {preview.poTransition === 'RECEIVED' ? 'Received' : 'Partially Received'}
                  </span>
                  .
                </p>
              ) : (
                <p className="text-[13px] text-ink-muted">
                  PO status will not change (no receivable lines).
                </p>
              )
            ) : (
              <p className="text-[13px] text-ink-muted">
                Not linked to any PO.
              </p>
            )}
          </div>

          <p className="text-[12px] text-ink-muted">
            This action will write {preview.movementCount} stock movement record{preview.movementCount !== 1 ? 's' : ''} and
            update part stock levels and weighted-average costs. This cannot be undone.
          </p>
        </div>
      </Dialog>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
