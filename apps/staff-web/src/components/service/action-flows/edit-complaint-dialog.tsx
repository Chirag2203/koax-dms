'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Edit Customer Complaint',
  label: 'Customer Complaint',
  placeholder: 'Describe the customer complaint...',
  cancel: 'Cancel',
  submit: 'Save Changes',
  success: 'Customer complaint updated',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditComplaintDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  initialValue: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditComplaintDialog({
  open,
  onClose,
  jobCardId,
  initialValue,
}: EditComplaintDialogProps) {
  const [value, setValue] = useState(initialValue);

  const { user } = useStaffAuth();
  const updateJobCard = useServiceStore((s) => s.updateJobCard);
  const { toasts, toast, dismiss } = useToast();

  // Sync when dialog opens with fresh initialValue
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  function handleClose() {
    setValue(initialValue);
    onClose();
  }

  function handleSubmit() {
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    updateJobCard(jobCardId, { customerComplaint: value.trim() }, actor);
    toast(MESSAGES.success, 'success');
    onClose();
  }

  const isDirty = value !== initialValue;

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
        <div>
          <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
            {MESSAGES.label} <span className="text-ink-muted">*</span>
          </label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={6}
            placeholder={MESSAGES.placeholder}
            className={cn(
              'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
          />
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
