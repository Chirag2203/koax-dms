/**
 * TemplateStatusWorkflow — submit / approve / reject workflow buttons.
 * SPEC-NOTIFICATIONS-001 §6.3, L16
 *
 * DRAFT / REJECTED → "Submit for DLT review"
 * PENDING_DLT → "Mark Approved" | "Mark Rejected"
 * APPROVED / DEPRECATED → no actions
 *
 * ≤140 LoC per spec §11
 */

'use client';

import { useState } from 'react';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';
import { Gate } from '../../primitives/gate';
import { MarkApprovedDialog } from '../dialogs/mark-approved-dialog';
import { MarkRejectedDialog } from '../dialogs/mark-rejected-dialog';
import { useToast } from '../../../hooks/use-toast';
import { ToastContainer } from '../../primitives/toast';
import type { NotificationTemplate, Actor } from '@dms/types';

const DLT_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-[rgb(var(--state-pending)/0.12)] text-[rgb(var(--state-pending))]',
  PENDING_DLT: 'bg-[rgb(var(--state-pending)/0.12)] text-[rgb(var(--state-pending))]',
  APPROVED: 'bg-[rgb(var(--state-active)/0.12)] text-[rgb(var(--state-active))]',
  REJECTED: 'bg-[rgb(var(--state-overdue)/0.12)] text-[rgb(var(--state-overdue))]',
  DEPRECATED: 'bg-bg-subtle text-ink-muted',
};

const DLT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_DLT: 'Pending DLT',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DEPRECATED: 'Deprecated',
};

interface TemplateStatusWorkflowProps {
  template: NotificationTemplate;
  actor: Actor;
  onUpdated?: () => void;
}

export function TemplateStatusWorkflow({
  template,
  actor,
  onUpdated,
}: TemplateStatusWorkflowProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const { toasts, toast, dismiss } = useToast();
  const submitForDlt = useNotificationsStore((s) => s.submitForDlt);

  const handleSubmit = () => {
    try {
      submitForDlt(template.id, actor);
      toast('Template submitted for DLT review', 'info');
      onUpdated?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Submission failed', 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center gap-3 flex-wrap">
        {/* Status badge */}
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
            DLT_STATUS_BADGE[template.status] ?? 'bg-bg-subtle text-ink-muted'
          }`}
        >
          {DLT_STATUS_LABEL[template.status] ?? template.status}
        </span>

        {/* Workflow actions — R17 (Notification Manager) or R19+ */}
        <Gate permission="notifications:template:manage">
          {(template.status === 'DRAFT' || template.status === 'REJECTED') && (
            <button
              type="button"
              onClick={handleSubmit}
              className="h-8 px-3 rounded-md text-xs font-medium text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Submit for DLT review
            </button>
          )}

          {template.status === 'PENDING_DLT' && (
            <>
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="h-8 px-3 rounded-md text-xs font-medium text-white bg-[rgb(var(--state-active))] hover:bg-[rgb(var(--state-active)/0.9)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Mark Approved
              </button>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="h-8 px-3 rounded-md text-xs font-medium text-white bg-[rgb(var(--state-overdue))] hover:bg-[rgb(var(--state-overdue)/0.9)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Mark Rejected
              </button>
            </>
          )}
        </Gate>
      </div>

      <MarkApprovedDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        template={template}
        actor={actor}
        onApproved={onUpdated}
      />

      <MarkRejectedDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        template={template}
        actor={actor}
        onRejected={onUpdated}
      />
    </>
  );
}
