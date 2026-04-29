'use client';

/**
 * SO Complete Dialog — transfer-first sequencing + seller signatures checklist.
 *
 * Per SPEC-VEHICLES-001 §7.1: transferOwnership is called FIRST.
 * Per PLAN-VEHICLES-003 P2 §9 (L15, L16, L34):
 *   - All current joint owners (sellerCustomerIds) must check a signature box
 *   - R19/R22/R24 may override missing signatures with reason + proof doc IDs
 *   - On success: emitSalesEvent SOLD (with sellerSignatures + optional override)
 */

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';

// ─── Override roles (R19+) ────────────────────────────────────────────────────

const OVERRIDE_ROLES = new Set(['R19', 'R22', 'R24']);

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
    /** IDs of all current joint owners who must sign (L15) */
    sellerCustomerIds: string[];
    /** Sale price for TCS computation */
    amount?: number;
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

  // Seller signatures state: set of checked customerId strings
  const [signedIds, setSignedIds] = useState<Set<string>>(new Set());
  const [overrideExpanded, setOverrideExpanded] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideDocIdsRaw, setOverrideDocIdsRaw] = useState('');

  const actor = { id: user?.id ?? 'staff-system', name: user?.name ?? 'Staff', role: user?.role ?? 'UNKNOWN' };
  const canOverride = user ? OVERRIDE_ROLES.has(user.role) : false;

  const allSigned = salesOrder.sellerCustomerIds.length === 0 ||
    salesOrder.sellerCustomerIds.every((id) => signedIds.has(id));
  const missingCount = salesOrder.sellerCustomerIds.filter((id) => !signedIds.has(id)).length;

  // Parse override proof doc IDs from comma-separated input
  const overrideProofDocIds = overrideDocIdsRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const overrideValid =
    canOverride &&
    overrideReason.trim().length > 0 &&
    overrideProofDocIds.length >= 1;

  const canSubmit = status !== 'loading' && status !== 'success' &&
    (allSigned || overrideValid);

  function toggleSignature(customerId: string) {
    setSignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  }

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

      // Step 2: emit SOLD SalesEvent (PLAN-VEHICLES-003 L15)
      const finalPrice = salesOrder.amount ?? 0;
      const tcsCollected = finalPrice > 1_000_000 ? Math.round(finalPrice * 0.01) : 0;

      const sellerSignatures = Array.from(signedIds).map((customerId) => ({
        customerId,
        signedAt: new Date().toISOString(),
        actorId: actor.id,
      }));

      const soldPayload: Record<string, unknown> = {
        salesOrderId: salesOrder.id,
        finalPrice,
        flow: 'MARGIN_SCHEME' as const,
        tcsCollected,
        sellerSignatures,
        buyerCustomerId: salesOrder.buyerId,
      };

      // Attach override if used
      if (!allSigned && overrideValid) {
        soldPayload['override'] = {
          by: actor.id,
          reason: overrideReason.trim(),
          proofDocIds: overrideProofDocIds,
        };
      }

      useVehiclesStore.getState().emitSalesEvent(
        salesOrder.vin,
        'SOLD',
        soldPayload,
        actor,
      );

      setStatus('success');
      onComplete?.(salesOrder.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setErrorMsg(`Failed: ${msg}`);
      setStatus('error');
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
            disabled={!canSubmit}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              status === 'success'
                ? 'bg-state-success/20 text-state-success border border-state-success/30'
                : 'bg-accent text-white hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {status === 'loading' ? 'Processing…' : status === 'success' ? 'Sale completed' : 'Complete Sale'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-secondary leading-relaxed">
          This will transfer vehicle ownership to the buyer and mark the sales order as complete.
          The transfer happens first — if it fails, the sale will not be marked complete.
        </p>

        {/* SO summary */}
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

        {/* Seller signatures checklist (L15) */}
        {salesOrder.sellerCustomerIds.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-widest">
              Seller Signatures
            </h4>
            <div className="rounded-md border border-line bg-bg-subtle divide-y divide-line">
              {salesOrder.sellerCustomerIds.map((customerId) => (
                <label
                  key={customerId}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-canvas transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={signedIds.has(customerId)}
                    onChange={() => toggleSignature(customerId)}
                    className="h-4 w-4 rounded border-line accent-accent"
                  />
                  <span className="text-sm text-ink-primary font-mono">{customerId}</span>
                  {signedIds.has(customerId) && (
                    <span className="ml-auto text-xs text-state-success">Signed</span>
                  )}
                </label>
              ))}
            </div>

            {/* Override panel (R19+) */}
            {missingCount > 0 && canOverride && (
              <div className="rounded-md border border-line overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOverrideExpanded((v) => !v)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-sm',
                    'text-ink-secondary hover:bg-bg-subtle transition-colors',
                    overrideExpanded && 'bg-bg-subtle',
                  )}
                >
                  <span className="font-medium">Override (R19+) — {missingCount} signature{missingCount > 1 ? 's' : ''} missing</span>
                  <span className="text-xs text-ink-muted">{overrideExpanded ? '▲' : '▼'}</span>
                </button>
                {overrideExpanded && (
                  <div className="px-4 pb-4 pt-2 flex flex-col gap-3 border-t border-line">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-ink-muted">
                        Override reason <span className="text-state-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. Seller unreachable — notarised POA attached"
                        className={cn(
                          'h-9 w-full rounded-md border border-line bg-bg-canvas px-3 text-sm text-ink-primary',
                          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
                          'placeholder:text-ink-muted',
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-ink-muted">
                        Proof doc IDs (comma-separated) <span className="text-state-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={overrideDocIdsRaw}
                        onChange={(e) => setOverrideDocIdsRaw(e.target.value)}
                        placeholder="doc-001, doc-002"
                        className={cn(
                          'h-9 w-full rounded-md border border-line bg-bg-canvas px-3 text-sm text-ink-primary',
                          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
                          'placeholder:text-ink-muted',
                        )}
                      />
                      {overrideDocIdsRaw && overrideProofDocIds.length === 0 && (
                        <p className="text-xs text-state-danger">At least one proof doc ID is required.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Warning when missing and no override */}
            {missingCount > 0 && !canOverride && (
              <p className="text-xs text-state-danger">
                {missingCount} seller signature{missingCount > 1 ? 's' : ''} missing. R19+ override required to proceed.
              </p>
            )}
          </div>
        )}

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
