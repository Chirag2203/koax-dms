/**
 * PoApprovalCard — sidebar card showing approval state + duplicate action buttons.
 *
 * Spec reference: PLAN-PARTS-006 §4.3
 */

'use client';

import { useState } from 'react';
import type { PurchaseOrder, Supplier } from '@dms/types';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { staffName, formatDateTime, formatINR } from '../helpers';
import { requiredApproverRole } from '@/src/lib/parts/state-machine';
import { canApprove } from '@/src/lib/parts/state-machine';
import { ApprovePoDialog, RejectPoDialog } from './action-flows';
import { cn } from '@dms/ui';

export interface PoApprovalCardProps {
  po: PurchaseOrder;
  supplier: Supplier | undefined;
}

const ROLE_LABELS: Record<string, string> = {
  R13: 'Parts Counter (R13)',
  R12: 'Parts Manager (R12)',
  R03: 'Outlet Manager (R03)',
  R19: 'General Manager (R19)',
};

export function PoApprovalCard({ po, supplier }: PoApprovalCardProps) {
  const { user } = useStaffAuth();
  const role = user?.role ?? '';
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const requiredRole = requiredApproverRole(po.total);
  const canApprovePo = canApprove(role, po.total);

  if (po.status === 'PENDING_APPROVAL') {
    return (
      <>
        <div className="rounded-md border border-line bg-bg-surface p-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
            Approval Required
          </h3>
          <p className="text-[13px] text-ink-secondary mb-1">
            Requires{' '}
            <span className="font-mono font-semibold text-ink-primary">
              {ROLE_LABELS[requiredRole] ?? requiredRole}
            </span>{' '}
            or higher to approve.
          </p>
          <p className="text-[12px] text-ink-muted mb-4">
            PO total: <span className="font-mono">{formatINR(po.total)}</span>
          </p>
          <div className="flex flex-col gap-2">
            {canApprovePo ? (
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium bg-accent text-white',
                  'hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                Approve
              </button>
            ) : (
              <span
                title={`Requires approval role for ${formatINR(po.total)}`}
                className="inline-flex"
              >
                <button
                  type="button"
                  disabled
                  className="h-9 px-4 rounded-md text-sm font-medium bg-accent text-white opacity-40 cursor-not-allowed w-full"
                >
                  Approve
                </button>
              </span>
            )}
            {canApprovePo ? (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border',
                  'border-[rgb(var(--state-danger))] text-[rgb(var(--state-danger))]',
                  'hover:bg-[rgb(var(--state-danger)/0.08)] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--state-danger))]',
                )}
              >
                Reject
              </button>
            ) : (
              <span
                title={`Requires approval role for ${formatINR(po.total)}`}
                className="inline-flex"
              >
                <button
                  type="button"
                  disabled
                  className="h-9 px-4 rounded-md text-sm font-medium border border-line text-ink-muted opacity-40 cursor-not-allowed w-full"
                >
                  Reject
                </button>
              </span>
            )}
          </div>
        </div>
        <ApprovePoDialog
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          po={po}
          supplier={supplier}
        />
        <RejectPoDialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          po={po}
        />
      </>
    );
  }

  if (po.status === 'APPROVED' || po.status === 'DISPATCHED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED' || po.status === 'CLOSED') {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-4">
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
          Approval
        </h3>
        <Row label="Approved By">
          <span className="text-[13px] text-ink-primary">{staffName(po.approverId)}</span>
        </Row>
        {po.approvedAt && (
          <Row label="Approved At">
            <span className="font-mono text-[12px] text-ink-secondary">{formatDateTime(po.approvedAt)}</span>
          </Row>
        )}
      </div>
    );
  }

  if (po.status === 'REJECTED') {
    return (
      <div className="rounded-md border border-[rgb(var(--state-danger)/0.3)] bg-[rgb(var(--state-danger)/0.05)] p-4">
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-[rgb(var(--state-danger))] mb-3">
          Rejected
        </h3>
        <Row label="Rejected By">
          <span className="text-[13px] text-ink-primary">{staffName(po.approverId)}</span>
        </Row>
        {po.approvedAt && (
          <Row label="Rejected At">
            <span className="font-mono text-[12px] text-ink-secondary">{formatDateTime(po.approvedAt)}</span>
          </Row>
        )}
        {po.rejectedReason && (
          <div className="mt-3 pt-3 border-t border-[rgb(var(--state-danger)/0.2)]">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted block mb-1">Reason</span>
            <p className="text-[13px] text-ink-secondary italic">&quot;{po.rejectedReason}&quot;</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-2">
      <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
