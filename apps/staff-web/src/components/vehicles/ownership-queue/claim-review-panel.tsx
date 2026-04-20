'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@dms/ui';
import { SlideInPanel, VinBadge, Gate } from '@/src/components/primitives';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { OwnershipClaim, RejectionReason } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimReviewPanelProps {
  open: boolean;
  claim: OwnershipClaim | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClaimReviewPanel({ open, claim, onClose }: ClaimReviewPanelProps) {
  const [rejectReason, setRejectReason] = useState<RejectionReason>('DOC_MISMATCH');
  const [showReject, setShowReject] = useState(false);

  const { user } = useStaffAuth();
  const approveClaim = useVehiclesStore((s) => s.approveClaim);
  const rejectClaim = useVehiclesStore((s) => s.rejectClaim);
  const runSweep = useVehiclesStore((s) => s.runAnonymizationSweep);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const customers = useCustomersStore((s) => s.customers);
  const claimantName = claim
    ? customers[claim.claimantCustomerId]?.name ?? claim.claimantCustomerId
    : '';

  const overlapping = claim?.overlapsOwnershipId
    ? ownerships[claim.overlapsOwnershipId]
    : null;

  function handleApprove() {
    if (!claim || !user) return;
    approveClaim(claim.id, { id: user.id, name: user.name, role: user.role });
    onClose();
  }

  function handleReject() {
    if (!claim || !user) return;
    rejectClaim(claim.id, rejectReason, { id: user.id, name: user.name, role: user.role });
    setShowReject(false);
    onClose();
  }

  if (!claim) return null;

  return (
    <SlideInPanel open={open} onClose={onClose} title="Review Claim" width="50%">
      <div className="p-6 flex flex-col gap-5">
        {/* Claim details */}
        <div className="rounded-md border border-line bg-bg-surface p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-ink-muted">VIN</dt>
              <dd className="mt-0.5"><VinBadge vin={claim.vin} size="sm" /></dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Claimant</dt>
              <dd className="mt-0.5 text-sm text-ink-primary">{claimantName}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Submitted</dt>
              <dd className="mt-0.5 font-mono text-xs text-ink-secondary">
                {new Date(claim.submittedAt).toLocaleDateString('en-IN')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Auto-match</dt>
              <dd className={cn('mt-0.5 text-xs font-medium', claim.autoMatchHit ? 'text-[rgb(var(--state-listed))]' : 'text-ink-muted')}>
                {claim.autoMatchHit ? 'Yes — matched to record' : 'No — manual review required'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Overlap banner */}
        {overlapping && (
          <div className="rounded-md border border-[rgb(var(--state-overdue)/0.3)] bg-[rgb(var(--state-overdue)/0.05)] p-4 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-[rgb(var(--state-overdue))]">Overlap detected</p>
              <p className="text-xs text-ink-secondary mt-0.5">
                This claim overlaps with ownership {overlapping.id} ({overlapping.state}).
                Approving will close the overlapping row.
              </p>
            </div>
          </div>
        )}

        {/* RC scan stub */}
        {claim.rcScanUrl && (
          <div className="rounded-md border border-line bg-bg-surface p-4">
            <p className="text-xs font-medium text-ink-secondary mb-2">RC Scan</p>
            <a
              href={claim.rcScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline"
            >
              View RC scan
            </a>
          </div>
        )}

        {/* Actions */}
        {claim.state === 'PENDING' && (
          <>
            {!showReject ? (
              <div className="flex gap-2">
                <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="tooltip" tooltipMessage="R09+ required to approve claims">
                  <button
                    type="button"
                    onClick={handleApprove}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 h-10 rounded-md',
                      'bg-[rgb(var(--state-listed))] text-white text-sm font-medium',
                      'hover:opacity-90 transition-opacity',
                    )}
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Approve
                  </button>
                </Gate>
                <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="tooltip" tooltipMessage="R09+ required to reject claims">
                  <button
                    type="button"
                    onClick={() => setShowReject(true)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 h-10 rounded-md',
                      'border border-[rgb(var(--state-overdue)/0.4)] text-[rgb(var(--state-overdue))] text-sm font-medium',
                      'hover:bg-[rgb(var(--state-overdue)/0.05)] transition-colors',
                    )}
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </button>
                </Gate>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                    Rejection reason
                  </label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value as RejectionReason)}
                    className="w-full h-10 rounded-md border border-line bg-bg-canvas px-3 text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="DOC_MISMATCH">Document Mismatch</option>
                    <option value="DUPLICATE">Duplicate Claim</option>
                    <option value="IDENTITY_FAILED">Identity Verification Failed</option>
                    <option value="VIN_NOT_ELIGIBLE">VIN Not Eligible</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowReject(false)} className="flex-1 h-9 rounded-md border border-line text-sm text-ink-secondary hover:bg-bg-subtle transition-colors">
                    Back
                  </button>
                  <button type="button" onClick={handleReject} className="flex-1 h-9 rounded-md bg-state-danger text-white text-sm font-medium hover:bg-state-danger/90 transition-colors">
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dev tools — R24 only */}
        <Gate role="R24" fallback="hide">
          <div className="rounded-md border border-dashed border-line p-4">
            <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-2">
              Dev Tools (R24 only)
            </p>
            <button
              type="button"
              onClick={() => runSweep(new Date().toISOString())}
              className="h-8 px-3 rounded border border-line text-xs text-ink-secondary hover:bg-bg-subtle transition-colors"
            >
              Run anonymization sweep
            </button>
          </div>
        </Gate>
      </div>
    </SlideInPanel>
  );
}
