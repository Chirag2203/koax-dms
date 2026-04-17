'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives';
import { ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogCallModalProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LogCallModal({ open, onClose, dealId }: LogCallModalProps) {
  const { toasts, toast, dismiss } = useToast();
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = notes.trim().length >= 1 && notes.trim().length <= 500;

  function handleClose() {
    setDirection('outbound');
    setDuration('');
    setNotes('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (!isValid) {
      setError('Notes are required (max 500 characters).');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await fetch(`/api/staff/sales/deals/${dealId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: direction === 'inbound' ? 'call-inbound' : 'call-outbound',
          title: direction === 'inbound' ? 'Inbound Call' : 'Outbound Call',
          body: notes,
          durationSeconds: duration ? Number(duration) * 60 : undefined,
        }),
      });
      toast('Call logged successfully', 'success');
      handleClose();
    } catch {
      setError('Failed to log call. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Log Call"
        subtitle={`Logging call for deal #${dealId}`}
        size="md"
        dirty={notes.length > 0}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !isValid}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white',
                'bg-accent hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Direction segmented control */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2">
              Direction
            </label>
            <div className="flex items-center gap-1 bg-bg-subtle rounded-md p-0.5 border border-line w-fit">
              {(['inbound', 'outbound'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setDirection(dir)}
                  className={cn(
                    'h-8 px-4 rounded text-xs font-medium capitalize transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    direction === dir
                      ? 'bg-bg-surface text-ink-primary shadow-sm'
                      : 'text-ink-muted hover:text-ink-secondary',
                  )}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="log-call-duration" className="block text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2">
              Duration (minutes, optional)
            </label>
            <input
              id="log-call-duration"
              type="number"
              min={1}
              max={120}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 5"
              className={cn(
                'h-10 w-32 bg-bg-subtle border border-line rounded-md px-3',
                'text-sm text-ink-primary font-mono',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="log-call-notes" className="block text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2">
              Notes <span className="text-[rgb(var(--state-overdue))]">*</span>
            </label>
            <textarea
              id="log-call-notes"
              rows={4}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarise what was discussed…"
              className={cn(
                'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 resize-none',
                'text-sm text-ink-primary',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                'placeholder:text-ink-muted',
              )}
            />
            <div className="flex justify-between mt-1">
              {error && <p className="text-xs text-[rgb(var(--state-overdue))]">{error}</p>}
              <p className={cn('text-xs text-right ml-auto', notes.length > 450 ? 'text-[rgb(var(--state-pending))]' : 'text-ink-muted')}>
                {notes.length}/500
              </p>
            </div>
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
