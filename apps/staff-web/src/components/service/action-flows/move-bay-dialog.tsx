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
  title: 'Move Bay',
  labelBay: 'New Bay',
  labelReason: 'Reason',
  reasonPlaceholder: 'Explain why the bay is being changed...',
  cancel: 'Cancel',
  submit: 'Move Bay',
  success: 'Bay changed',
  noFreeBays: 'No free bays available',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MoveBayDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  currentBayId?: string;
  onComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MoveBayDialog({
  open,
  onClose,
  jobCardId,
  currentBayId,
  onComplete,
}: MoveBayDialogProps) {
  const [reason, setReason] = useState('');

  const { user } = useStaffAuth();
  const bays = useServiceStore((s) => s.bays);
  const moveBay = useServiceStore((s) => s.moveBay);
  const { toasts, toast, dismiss } = useToast();

  const freeBays = bays.filter((b) => b.status === 'FREE');

  const [selectedBayId, setSelectedBayId] = useState(() => freeBays[0]?.id ?? '');

  function handleClose() {
    setReason('');
    setSelectedBayId(freeBays[0]?.id ?? '');
    onClose();
  }

  function handleSubmit() {
    if (!selectedBayId) return;
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    moveBay(jobCardId, selectedBayId, actor);
    toast(MESSAGES.success, 'success');
    handleClose();
    onComplete?.();
  }

  const isDirty = reason.length > 0 || selectedBayId !== (freeBays[0]?.id ?? '');

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
              disabled={!selectedBayId}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white',
                'text-sm font-medium hover:bg-accent-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {MESSAGES.submit}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {freeBays.length === 0 ? (
            <p className="text-sm text-ink-muted italic">{MESSAGES.noFreeBays}</p>
          ) : (
            <>
              {/* Bay select */}
              <div>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                  {MESSAGES.labelBay} <span className="text-ink-muted">*</span>
                </label>
                <select
                  value={selectedBayId}
                  onChange={(e) => setSelectedBayId(e.target.value)}
                  className={cn(
                    'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  )}
                >
                  {freeBays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.type}) — {b.outletId}
                    </option>
                  ))}
                </select>
                {currentBayId && (
                  <p className="text-[11px] text-ink-muted mt-1">
                    Current bay: <span className="font-mono">{currentBayId.toUpperCase()}</span>
                  </p>
                )}
              </div>

              {/* Reason textarea */}
              <div>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                  {MESSAGES.labelReason}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={MESSAGES.reasonPlaceholder}
                  className={cn(
                    'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  )}
                />
              </div>
            </>
          )}
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
