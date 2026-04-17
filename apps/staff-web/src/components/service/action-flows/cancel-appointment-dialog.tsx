'use client';

import { useState } from 'react';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer, AlertDialog } from '@/src/components/primitives';
import { Dialog } from '@/src/components/primitives/dialog';
import { cn } from '@dms/ui';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Cancel Appointment',
  description: 'Please provide a reason for cancellation. This action cannot be undone.',
  labelReason: 'Reason for Cancellation',
  reasonPlaceholder: 'e.g. Customer requested cancellation, vehicle issue resolved...',
  cancel: 'Keep Appointment',
  submit: 'Cancel Appointment',
  success: 'Appointment cancelled',
  errorReason: 'Reason is required to cancel',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CancelAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  onComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelAppointmentDialog({
  open,
  onClose,
  appointmentId,
  onComplete,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const { user } = useStaffAuth();
  const cancelAppointment = useServiceStore((s) => s.cancelAppointment);
  const { toasts, toast, dismiss } = useToast();

  function handleClose() {
    setReason('');
    setReasonError('');
    onClose();
  }

  function handleSubmit() {
    if (!reason.trim()) {
      setReasonError(MESSAGES.errorReason);
      return;
    }
    const actor = { id: user?.id ?? 'staff-r24-001', name: user?.name ?? 'Meera Iyer' };
    cancelAppointment(appointmentId, reason.trim(), actor);
    toast(MESSAGES.success, 'warning');
    handleClose();
    onComplete?.();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={MESSAGES.title}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              {MESSAGES.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 rounded-md bg-state-danger text-white',
                'text-sm font-medium hover:bg-state-danger/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger focus-visible:ring-offset-1',
              )}
            >
              {MESSAGES.submit}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">{MESSAGES.description}</p>

          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
              {MESSAGES.labelReason} <span className="text-ink-muted">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
              rows={4}
              placeholder={MESSAGES.reasonPlaceholder}
              className={cn(
                'w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                reasonError ? 'border-state-danger' : 'border-line',
              )}
            />
            {reasonError && (
              <p className="text-xs text-state-danger mt-1">{reasonError}</p>
            )}
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
