/**
 * MarkRejectedDialog — enter rejection reason and reject a PENDING_DLT template.
 * SPEC-NOTIFICATIONS-001 L16
 * SPEC-ARCH-UI-001 §3.5 (Dialog), §12 (form patterns)
 */

'use client';

import { useState } from 'react';
import { Dialog } from '../../primitives/dialog';
import { useToast } from '../../../hooks/use-toast';
import { ToastContainer } from '../../primitives/toast';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';
import type { NotificationTemplate, Actor } from '@dms/types';

interface MarkRejectedDialogProps {
  open: boolean;
  onClose: () => void;
  template: NotificationTemplate;
  actor: Actor;
  onRejected?: () => void;
}

export function MarkRejectedDialog({
  open,
  onClose,
  template,
  actor,
  onRejected,
}: MarkRejectedDialogProps) {
  const [reason, setReason] = useState('');
  const { toasts, toast, dismiss } = useToast();

  const isDirty = reason !== '';

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast('Please enter a rejection reason', 'error');
      return;
    }
    try {
      useNotificationsStore.getState().markRejected(template.id, reason, actor);
      toast('Template marked as rejected', 'info');
      onRejected?.();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Rejection failed', 'error');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Dialog
        open={open}
        onClose={handleClose}
        title="Mark Template Rejected"
        subtitle={`Record the rejection reason from the DLT registrar for "${template.name}".`}
        size="sm"
        dirty={isDirty}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-[rgb(var(--state-overdue))] hover:bg-[rgb(var(--state-overdue)/0.9)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Mark Rejected
            </button>
          </>
        }
      >
        <div>
          <label
            htmlFor="rejection-reason"
            className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
          >
            Rejection Reason <span className="text-state-danger">*</span>
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
            placeholder="Enter the rejection reason from the DLT registrar..."
            aria-required="true"
          />
        </div>
      </Dialog>
    </>
  );
}
