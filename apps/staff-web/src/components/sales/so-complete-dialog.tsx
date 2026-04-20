'use client';

/**
 * SO Complete Dialog — transfer-first sequencing.
 *
 * Per SPEC-VEHICLES-001 §7.1: transferOwnership is called FIRST.
 * Only on success does the sale get marked complete.
 * If transfer fails, the SO stays in its prior state — manual staff retry.
 *
 * Sales module will integrate fully in v2 when the full Sales store ships.
 * For P4, this dialog proves the vehicles-store transfer path works and
 * can be triggered from any sales detail page.
 */

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SoCompleteDialogProps {
  open: boolean;
  onClose: () => void;
  /** Minimal SO shape needed for the transfer */
  salesOrder: {
    id: string;
    vin: string;
    buyerId: string;
    deliveryKm: number;
    buyerIsJoint?: boolean;
    jointBuyerId?: string;
  };
  /** Called after both transfer + SO-complete succeed */
  onComplete?: (soId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SoCompleteDialog({
  open,
  onClose,
  salesOrder,
  onComplete,
}: SoCompleteDialogProps) {
  const { user } = useStaffAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const actor = { id: user?.id ?? 'staff-system', name: user?.name ?? 'Staff' };

  async function handleComplete() {
    setStatus('loading');
    setErrorMsg('');

    try {
      // Step 1: validate + execute transfer FIRST (SPEC-VEHICLES-001 §7.1)
      useVehiclesStore.getState().transferOwnership(
        {
          vin: salesOrder.vin,
          toCustomerId: salesOrder.buyerId,
          joint: salesOrder.buyerIsJoint && salesOrder.jointBuyerId
            ? { withCustomerId: salesOrder.jointBuyerId }
            : undefined,
          source: 'BN_SALE',
          kmAtClose: salesOrder.deliveryKm,
          kmAtOpen: salesOrder.deliveryKm,
          linkedSalesOrderId: salesOrder.id,
        },
        actor,
      );

      // Step 2: only on transfer success, mark SO complete
      // Sales module will integrate fully in v2 — log intent here
      console.info(
        `[Sales module will integrate fully in v2] SO ${salesOrder.id} marked complete after transfer.`,
      );

      setStatus('success');
      onComplete?.(salesOrder.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setErrorMsg(`Transfer failed: ${msg}`);
      setStatus('error');
      // SO remains in previous state — manual retry
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Complete Sale & Transfer Ownership"
      subtitle={`SO: ${salesOrder.id} · VIN: ${salesOrder.vin}`}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-line text-sm text-ink-secondary hover:bg-bg-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={status === 'loading' || status === 'success'}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              status === 'success'
                ? 'bg-state-success/20 text-state-success border border-state-success/30'
                : 'bg-accent text-white hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {status === 'loading'
              ? 'Transferring…'
              : status === 'success'
              ? 'Sale completed'
              : 'Complete Sale'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-secondary leading-relaxed">
          This will transfer vehicle ownership to the buyer and mark the sales order as complete.
          The transfer happens first — if it fails, the sale will not be marked complete.
        </p>

        <div className="rounded-md bg-bg-subtle border border-line p-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-ink-muted">Buyer ID</span>
            <span className="font-mono text-ink-primary">{salesOrder.buyerId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Delivery KM</span>
            <span className="font-mono text-ink-primary tabular-nums">
              {salesOrder.deliveryKm.toLocaleString('en-IN')}
            </span>
          </div>
          {salesOrder.buyerIsJoint && salesOrder.jointBuyerId && (
            <div className="flex justify-between">
              <span className="text-ink-muted">Joint buyer</span>
              <span className="font-mono text-ink-primary">{salesOrder.jointBuyerId}</span>
            </div>
          )}
        </div>

        {status === 'success' && (
          <p className="text-sm text-state-success font-medium">
            Sale completed and ownership transferred successfully.
          </p>
        )}

        {status === 'error' && (
          <p className="text-sm text-state-danger">
            {errorMsg}
            {' '}SO remains in previous state — please retry.
          </p>
        )}
      </div>
    </Dialog>
  );
}
