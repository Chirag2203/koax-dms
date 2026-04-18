/**
 * GrnHeader — breadcrumb + h1 + status chip + subtitle + action buttons.
 *
 * Spec reference: PLAN-PARTS-006 §5.1, §5.4
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Grn, PurchaseOrder, Supplier } from '@dms/types';
import { StateChip } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { grnStatusToChip, formatDateTime } from '../helpers';
import { hasRank } from '../po-detail/po-detail-helpers';
import {
  SubmitQcDialog,
  MarkMatchedDialog,
  RejectGrnDialog,
  RecordDiscrepancyDialog,
  PostGrnDialog,
} from './action-flows';

export interface GrnHeaderProps {
  grn: Grn;
  po: PurchaseOrder | undefined;
  supplier: Supplier | undefined;
}

export function GrnHeader({ grn, po, supplier }: GrnHeaderProps) {
  const { user } = useStaffAuth();
  const role = user?.role ?? '';

  const [submitQcOpen, setSubmitQcOpen] = useState(false);
  const [matchedOpen, setMatchedOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  // Action visibility
  const showSubmitQc = grn.status === 'DRAFT';
  const showMarkMatched = grn.status === 'PENDING_QC';
  const showReject = grn.status === 'PENDING_QC';
  const showDiscrepancy = grn.status === 'PENDING_QC' || grn.status === 'MATCHED';
  const showPost = grn.status === 'MATCHED';

  // Role checks
  const canSubmitQc = hasRank(role, 'R13');
  const canMarkMatched = hasRank(role, 'R12');
  const canReject = hasRank(role, 'R12');
  const canDiscrepancy = hasRank(role, 'R12');
  const canPost = hasRank(role, 'R12');

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
            <Link href="/parts?tab=grn" className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
              GRNs
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-3 w-3 text-ink-muted" />
          </li>
          <li aria-current="page" className="font-mono text-[13px] text-ink-primary">
            {grn.grnNo}
          </li>
        </ol>
      </nav>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            {grn.grnNo}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StateChip status={grnStatusToChip(grn.status)} />
            <span className="text-ink-muted text-sm">·</span>
            <span className="text-sm text-ink-secondary">{supplier?.name ?? '—'}</span>
            {po && (
              <>
                <span className="text-ink-muted text-sm">·</span>
                <Link
                  href={`/parts/po/${po.id}`}
                  className="font-mono text-sm text-accent hover:underline"
                >
                  {po.poNo}
                </Link>
              </>
            )}
            <span className="text-ink-muted text-sm">·</span>
            <span className="text-sm text-ink-secondary">
              received {formatDateTime(grn.receivedAt)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {showSubmitQc && (
            canSubmitQc ? (
              <button type="button" onClick={() => setSubmitQcOpen(true)} className={btnPrimary}>
                Submit for QC
              </button>
            ) : (
              <span title="Requires Parts Counter (R13) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Submit for QC</button>
              </span>
            )
          )}

          {showMarkMatched && (
            canMarkMatched ? (
              <button type="button" onClick={() => setMatchedOpen(true)} className={btnPrimary}>
                Mark Matched
              </button>
            ) : (
              <span title="Requires Parts Manager (R12) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Mark Matched</button>
              </span>
            )
          )}

          {showDiscrepancy && (
            canDiscrepancy ? (
              <button type="button" onClick={() => setDiscrepancyOpen(true)} className={btnSecondary}>
                Record Discrepancy
              </button>
            ) : (
              <span title="Requires Parts Manager (R12) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Record Discrepancy</button>
              </span>
            )
          )}

          {showReject && (
            canReject ? (
              <button type="button" onClick={() => setRejectOpen(true)} className={btnDestructive}>
                Reject
              </button>
            ) : (
              <span title="Requires Parts Manager (R12) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Reject</button>
              </span>
            )
          )}

          {showPost && (
            canPost ? (
              <button type="button" onClick={() => setPostOpen(true)} className={btnPrimary}>
                Post to Inventory
              </button>
            ) : (
              <span title="Requires Parts Manager (R12) role or higher" className="inline-flex">
                <button type="button" disabled className={btnDisabled}>Post to Inventory</button>
              </span>
            )
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SubmitQcDialog open={submitQcOpen} onClose={() => setSubmitQcOpen(false)} grn={grn} />
      <MarkMatchedDialog open={matchedOpen} onClose={() => setMatchedOpen(false)} grn={grn} />
      <RejectGrnDialog open={rejectOpen} onClose={() => setRejectOpen(false)} grn={grn} />
      <RecordDiscrepancyDialog open={discrepancyOpen} onClose={() => setDiscrepancyOpen(false)} grn={grn} />
      <PostGrnDialog open={postOpen} onClose={() => setPostOpen(false)} grn={grn} po={po} />
    </>
  );
}
