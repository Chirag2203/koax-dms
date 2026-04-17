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
  title: 'Add Note',
  labelNote: 'Note',
  labelPin: 'Pin this note',
  placeholder: 'Enter your note here...',
  cancel: 'Cancel',
  submit: 'Add Note',
  successToast: 'Note added successfully',
  errorMin: 'Note must be at least 5 characters',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddNoteDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddNoteDialog({ open, onClose, jobCardId }: AddNoteDialogProps) {
  const [text, setText] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState('');

  const { user } = useStaffAuth();
  const addNote = useServiceStore((s) => s.addNote);
  const { toasts, toast, dismiss } = useToast();

  function handleClose() {
    setText('');
    setPinned(false);
    setError('');
    onClose();
  }

  function handleSubmit() {
    if (text.trim().length < 5) {
      setError(MESSAGES.errorMin);
      return;
    }
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    addNote(jobCardId, text.trim(), pinned, actor);
    toast(MESSAGES.successToast, 'success');
    handleClose();
  }

  const isDirty = text.length > 0;

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
          {/* Note textarea */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
              {MESSAGES.labelNote} <span className="text-ink-muted">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError('');
              }}
              rows={5}
              placeholder={MESSAGES.placeholder}
              className={cn(
                'w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                error ? 'border-state-danger' : 'border-line',
              )}
            />
            {error && (
              <p className="text-xs text-state-danger mt-1">{error}</p>
            )}
          </div>

          {/* Pin checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-accent focus:ring-accent"
            />
            <span className="text-sm text-ink-primary">{MESSAGES.labelPin}</span>
          </label>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
