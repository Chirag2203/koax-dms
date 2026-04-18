/**
 * GrnQcCard — sidebar QC action center with dual-control banner and metadata.
 *
 * Spec reference: PLAN-PARTS-006 §5.3, §9
 */

'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Grn, PurchaseOrder } from '@dms/types';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { staffName, formatDateTime, formatINR } from '../helpers';
import { hasRank } from '../po-detail/po-detail-helpers';
import { isDualControl } from './grn-detail-helpers';
import {
  SubmitQcDialog,
  MarkMatchedDialog,
  RejectGrnDialog,
  RecordDiscrepancyDialog,
  PostGrnDialog,
} from './action-flows';
import { cn } from '@dms/ui';

export interface GrnQcCardProps {
  grn: Grn;
  po: PurchaseOrder | undefined;
}

export function GrnQcCard({ grn, po }: GrnQcCardProps) {
  const { user } = useStaffAuth();
  const role = user?.role ?? '';

  const [submitQcOpen, setSubmitQcOpen] = useState(false);
  const [matchedOpen, setMatchedOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  const showDualControl = isDualControl(grn);
  const grnTotal = grn.lines.reduce((acc, l) => acc + l.receivedQty * l.unitPrice, 0);

  const canSubmitQc = hasRank(role, 'R13');
  const canMarkMatched = hasRank(role, 'R12');
  const canReject = hasRank(role, 'R12');
  const canDiscrepancy = hasRank(role, 'R12');
  const canPost = hasRank(role, 'R12');

  const showSubmitQc = grn.status === 'DRAFT';
  const showMarkMatched = grn.status === 'PENDING_QC';
  const showReject = grn.status === 'PENDING_QC';
  const showDiscrepancy = grn.status === 'PENDING_QC' || grn.status === 'MATCHED';
  const showPost = grn.status === 'MATCHED';

  const btnBase = cn(
    'w-full h-9 px-4 rounded-md text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  );
  const btnPrimary = cn(btnBase, 'bg-accent text-white hover:bg-accent/90');
  const btnSecondary = cn(btnBase, 'border border-line bg-bg-canvas text-ink-primary hover:bg-bg-subtle');
  const btnDestructive = cn(
    btnBase,
    'border border-[rgb(var(--state-danger))] text-[rgb(var(--state-danger))] hover:bg-[rgb(var(--state-danger)/0.08)]',
  );
  const btnDisabled = cn(btnBase, 'opacity-40 cursor-not-allowed border border-line bg-bg-canvas text-ink-primary');

  return (
    <>
      <div className="rounded-md border border-line bg-bg-surface p-4">
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
          QC &amp; Posting
        </h3>

        {/* Dual-control banner */}
        {showDualControl && (
          <div className="rounded-md border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.1)] px-4 py-3 mb-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-ink-primary">
              <p className="font-medium">Dual-control authorization required</p>
              <p className="text-[12px] text-ink-muted mt-0.5">
                Total {formatINR(grnTotal)} exceeds ₹2,00,000. v1 is visual-only — a second approver workflow is planned for v2.
              </p>
            </div>
          </div>
        )}

        {/* QC metadata */}
        <div className="flex flex-col gap-2 mb-3">
          {grn.qcBy && (
            <MetaRow label="QC By">
              <span className="text-[12px] text-ink-primary">{staffName(grn.qcBy)}</span>
            </MetaRow>
          )}
          {grn.qcAt && (
            <MetaRow label="QC At">
              <span className="font-mono text-[12px] text-ink-secondary">{formatDateTime(grn.qcAt)}</span>
            </MetaRow>
          )}
          {grn.postedAt && (
            <MetaRow label="Posted At">
              <span className="font-mono text-[12px] text-ink-secondary">{formatDateTime(grn.postedAt)}</span>
            </MetaRow>
          )}
          {grn.threeWayMatchStatus && (
            <MetaRow label="3-Way Match">
              <span className={cn(
                'font-mono text-[11px] uppercase tracking-wider',
                grn.threeWayMatchStatus === 'DISCREPANCY'
                  ? 'text-[rgb(var(--state-overdue))]'
                  : 'text-[rgb(var(--state-listed))]',
              )}>
                {grn.threeWayMatchStatus}
              </span>
            </MetaRow>
          )}
        </div>

        {/* Action buttons */}
        {(showSubmitQc || showMarkMatched || showReject || showDiscrepancy || showPost) && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {showSubmitQc && (
              canSubmitQc ? (
                <button type="button" onClick={() => setSubmitQcOpen(true)} className={btnPrimary}>
                  Submit for QC
                </button>
              ) : (
                <span title="Requires Parts Counter (R13) role or higher" className="inline-flex w-full">
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
                <span title="Requires Parts Manager (R12) role or higher" className="inline-flex w-full">
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
                <span title="Requires Parts Manager (R12) role or higher" className="inline-flex w-full">
                  <button type="button" disabled className={btnDisabled}>Record Discrepancy</button>
                </span>
              )
            )}
            {showReject && (
              canReject ? (
                <button type="button" onClick={() => setRejectOpen(true)} className={btnDestructive}>
                  Reject GRN
                </button>
              ) : (
                <span title="Requires Parts Manager (R12) role or higher" className="inline-flex w-full">
                  <button type="button" disabled className={btnDisabled}>Reject GRN</button>
                </span>
              )
            )}
            {showPost && (
              canPost ? (
                <button type="button" onClick={() => setPostOpen(true)} className={btnPrimary}>
                  Post to Inventory
                </button>
              ) : (
                <span title="Requires Parts Manager (R12) role or higher" className="inline-flex w-full">
                  <button type="button" disabled className={btnDisabled}>Post to Inventory</button>
                </span>
              )
            )}
          </div>
        )}
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

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
