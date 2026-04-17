'use client';

import { useState } from 'react';
import { cn } from '@dms/ui';
import type { Interaction } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddNoteModalProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
  onSaved: (note: Interaction) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'transition-colors',
);

const labelCls = 'block text-[10px] uppercase tracking-wide text-ink-muted mb-1.5 font-medium';
const errorCls = 'text-xs text-state-danger mt-1';

// ─── Component ────────────────────────────────────────────────────────────────

export function AddNoteModal({ open, onClose, dealId, onSaved }: AddNoteModalProps) {
  const { toasts, toast, dismiss } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'shared'>('internal');
  const [bodyError, setBodyError] = useState('');

  function handleClose() {
    setTitle('');
    setBody('');
    setVisibility('internal');
    setBodyError('');
    onClose();
  }

  async function handleSave() {
    if (!body.trim()) {
      setBodyError('Note body is required.');
      return;
    }
    if (body.length > 1000) {
      setBodyError('Note must be 1000 characters or fewer.');
      return;
    }
    setBodyError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/sales/deals/${dealId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          title: title.trim() || 'Note',
          body: body.trim(),
          visibility,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const json = (await res.json()) as { data: Interaction };
      onSaved(json.data);
      toast('Note added', 'success');
      handleClose();
    } catch {
      toast('Could not save. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Add a note"
        size="md"
        dirty={body.length > 0}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || !body.trim()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Add note'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Title (optional) */}
          <div>
            <label htmlFor="note-title" className={labelCls}>
              Title (optional)
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="E.g. Follow-up summary"
              className={inputCls}
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="note-body" className={labelCls}>
              Note <span className="text-ink-muted" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <textarea
                id="note-body"
                rows={5}
                maxLength={1000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your note here..."
                aria-invalid={!!bodyError}
                className={cn(
                  'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                  'text-sm text-ink-primary placeholder:text-ink-muted resize-y min-h-[120px]',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  'transition-colors',
                  bodyError && 'border-state-danger',
                )}
              />
              <p className="absolute bottom-2 right-3 font-mono text-[10px] text-ink-muted pointer-events-none">
                {body.length}/1000
              </p>
            </div>
            {bodyError && <p className={errorCls}>{bodyError}</p>}
          </div>

          {/* Visibility */}
          <div>
            <label className={labelCls}>Visibility</label>
            <div className="flex items-center gap-1 bg-bg-subtle rounded-md p-0.5 border border-line w-fit">
              {([
                { value: 'internal', label: 'Internal only' },
                { value: 'shared', label: 'Shared with team' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={cn(
                    'h-8 px-4 rounded text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    visibility === opt.value
                      ? 'bg-bg-surface text-ink-primary shadow-sm'
                      : 'text-ink-muted hover:text-ink-secondary',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
