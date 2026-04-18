/**
 * PoHeader — breadcrumb + h1 + status chip + subtitle + action buttons.
 *
 * Spec reference: PLAN-PARTS-006 §4.1, §4.4
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { PurchaseOrder, Supplier } from '@dms/types';
import { StateChip } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { poStatusToChip, formatINR, OUTLET_NAMES } from '../helpers';
import { hasRank } from './po-detail-helpers';
import { canApprove } from '@/src/lib/parts/state-machine';
import {
  SubmitPoDialog,
  ApprovePoDialog,
  RejectPoDialog,
  CancelPoDialog,
  DispatchPoDialog,
  ClosePoDialog,
} from './action-flows';

export interface PoHeaderProps {
  po: PurchaseOrder;
  supplier: Supplier | undefined;
}

export function PoHeader({ po, supplier }: PoHeaderProps) {
  const { user } = useStaffAuth();
  const role = user?.role ?? '';

  const [submitOpen, setSubmitOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const outletLabel = OUTLET_NAMES[po.outletId] ?? po.outletId;
  const lineCount = po.lines.length;

  // Action visibility
  const showSubmit = po.status === 'DRAFT';
  const showApprove = po.status === 'PENDING_APPROVAL';
  const showReject = po.status === 'PENDING_APPROVAL';
  const showCancel = po.status === 'DRAFT' || po.status === 'APPROVED';
  const showDispatch = po.status === 'APPROVED';
  const showClose = po.status === 'RECEIVED';

  // Role checks
  const canSubmit = hasRank(role, 'R13');
  const canApprovePo = canApprove(role, po.total);
  const canCancelDraft = po.status === 'DRAFT' && hasRank(role, 'R13');
  const canCancelApproved = po.status === 'APPROVED' && hasRank(role, 'R12');
  const canCancel = canCancelDraft || canCancelApproved;
  const canDispatch = hasRank(role, 'R13');
  const canClose = hasRank(role, 'R13');

  const btnBase = cn(
    'inline-flex items-center h-10 px-4 rounded-md text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
  );
  const btnPrimary = cn(btnBase, 'bg-accent text-white hover:bg-accent/90');
  const btnSecondary = cn(btnBase, 'border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle');
  const btnDestructive = cn(
    btnBase,
    'border border-[rgb(var(--state-danger))] text-[rgb(var(--state-danger))] hover:bg-[rgb(var(--state-danger)/0.08)]',
  );
  const btnDisabled = cn(btnBase, 'opacity-40 cursor-not-allowed pointer-events-none border border-line bg-bg-surface text-ink-primary');

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/parts" className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
              Parts
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-3 w-3 text-ink-muted" />
          </li>
          <li>
            <Link href="/parts?tab=po" className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
              Purchase Orders
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-3 w-3 text-ink-muted" />
          </li>
          <li aria-current="page" className="font-mono text-[13px] text-ink-primary">
            {po.poNo}
          </li>
        </ol>
      </nav>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            {po.poNo}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StateChip status={poStatusToChip(po.status)} />
            <span className="text-ink-muted text-sm">·</span>
            <span className="text-sm text-ink-secondary">{supplier?.name ?? '—'}</span>
            <span className="text-ink-muted text-sm">·</span>
            <span className="text-sm text-ink-secondary">{outletLabel}</span>
            <span className="text-ink-muted text-sm">·</span>
            <span className="text-sm text-ink-secondary">{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
            <span className="text-ink-muted text-sm">·</span>
            <span className="font-mono text-sm text-ink-secondary">{formatINR(po.total)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {showSubmit && (
            canSubmit ? (
              <button type="button" onClick={() => setSubmitOpen(true)} className={btnPrimary}>
                Submit for Approval
              </button>
            ) : (
              <span title="Requires Parts Counter (R13) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Submit for Approval</button>
              </span>
            )
          )}

          {showApprove && (
            canApprovePo ? (
              <button type="button" onClick={() => setApproveOpen(true)} className={btnPrimary}>
                Approve
              </button>
            ) : (
              <span title={`Requires approval role for PO of ${formatINR(po.total)}`} className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Approve</button>
              </span>
            )
          )}

          {showReject && (
            canApprovePo ? (
              <button type="button" onClick={() => setRejectOpen(true)} className={btnDestructive}>
                Reject
              </button>
            ) : (
              <span title={`Requires approval role for PO of ${formatINR(po.total)}`} className="inline-flex">
                <button type="button" disabled className={cn(btnDisabled, 'border-[rgb(var(--state-danger))/0.3]')}>Reject</button>
              </span>
            )
          )}

          {showCancel && (
            canCancel ? (
              <button type="button" onClick={() => setCancelOpen(true)} className={btnDestructive}>
                Cancel PO
              </button>
            ) : (
              <span title="Requires Parts Manager (R12) role or higher to cancel an approved PO" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Cancel PO</button>
              </span>
            )
          )}

          {showDispatch && (
            canDispatch ? (
              <button type="button" onClick={() => setDispatchOpen(true)} className={btnPrimary}>
                Mark Dispatched
              </button>
            ) : (
              <span title="Requires Parts Counter (R13) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Mark Dispatched</button>
              </span>
            )
          )}

          {showClose && (
            canClose ? (
              <button type="button" onClick={() => setCloseOpen(true)} className={btnSecondary}>
                Close PO
              </button>
            ) : (
              <span title="Requires Parts Counter (R13) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Close PO</button>
              </span>
            )
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SubmitPoDialog open={submitOpen} onClose={() => setSubmitOpen(false)} po={po} supplier={supplier} />
      <ApprovePoDialog open={approveOpen} onClose={() => setApproveOpen(false)} po={po} supplier={supplier} />
      <RejectPoDialog open={rejectOpen} onClose={() => setRejectOpen(false)} po={po} />
      <CancelPoDialog open={cancelOpen} onClose={() => setCancelOpen(false)} po={po} />
      <DispatchPoDialog open={dispatchOpen} onClose={() => setDispatchOpen(false)} po={po} />
      <ClosePoDialog open={closeOpen} onClose={() => setCloseOpen(false)} po={po} />
    </>
  );
}
