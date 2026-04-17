'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Re-assign Advisor',
  labelAdvisor: 'New Advisor',
  labelReason: 'Reason',
  reasonPlaceholder: 'Explain why the advisor is being reassigned...',
  cancel: 'Cancel',
  submit: 'Re-assign',
  success: 'Advisor reassigned',
  errorReason: 'Reason is required',
} as const;

// Advisor options — matches ADVISOR_MAP in detail view
const ADVISOR_OPTIONS = [
  { id: 'staff-r09-001', name: 'Priya Sharma' },
  { id: 'staff-r09-002', name: 'Rajesh Kumar' },
  { id: 'staff-r09-003', name: 'Deepa Nair' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReassignAdvisorDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  currentAdvisorId: string;
  onComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReassignAdvisorDialog({
  open,
  onClose,
  jobCardId,
  currentAdvisorId,
  onComplete,
}: ReassignAdvisorDialogProps) {
  const [advisorId, setAdvisorId] = useState(currentAdvisorId);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const { user } = useStaffAuth();
  const reassignAdvisor = useServiceStore((s) => s.reassignAdvisor);
  const { toasts, toast, dismiss } = useToast();

  function handleClose() {
    setAdvisorId(currentAdvisorId);
    setReason('');
    setReasonError('');
    onClose();
  }

  function handleSubmit() {
    if (!reason.trim()) {
      setReasonError(MESSAGES.errorReason);
      return;
    }
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    reassignAdvisor(jobCardId, advisorId, reason.trim(), actor);
    toast(MESSAGES.success, 'success');
    handleClose();
    onComplete?.();
  }

  const isDirty = advisorId !== currentAdvisorId || reason.length > 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={MESSAGES.title}
        size="sm"
        dirty={isDirty}
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
                'inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white',
                'text-sm font-medium hover:bg-accent-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              {MESSAGES.submit}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Advisor select */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
              {MESSAGES.labelAdvisor} <span className="text-ink-muted">*</span>
            </label>
            <select
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              className={cn(
                'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            >
              {ADVISOR_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason textarea */}
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
