'use client';

/**
 * Initiate Exit dialog — SPEC-STAFF-001 S8.
 *
 * Captures: last working day, exit reason, optional notice waiver.
 * Shows computed notice period preview.
 * R12+ gate enforced in store; UI also hides trigger below R12.
 */

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { StaffRoleCode } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import type { ExitReason } from '@/src/lib/staff/staff-store';

interface InitiateExitDialogProps {
  staffId: string;
  staffName: string;
  actor: { id: string; role: StaffRoleCode };
  onClose: () => void;
  onInitiated: () => void;
}

const REASON_OPTIONS: { value: ExitReason; label: string }[] = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'other', label: 'Other' },
];

export function InitiateExitDialog({
  staffId,
  staffName,
  actor,
  onClose,
  onInitiated,
}: InitiateExitDialogProps) {
  const initiateExit = useStaffStore((s) => s.initiateExit);

  const today = new Date().toISOString().split('T')[0]!;
  const [lastWorkingDay, setLastWorkingDay] = useState(today);
  const [reason, setReason] = useState<ExitReason>('resignation');
  const [waiveNotice, setWaiveNotice] = useState(false);
  const [waiverReason, setWaiverReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const noticeDays = useMemo(() => {
    const lwd = new Date(lastWorkingDay);
    const now = new Date(today);
    const diff = Math.max(0, Math.round((lwd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    return diff;
  }, [lastWorkingDay, today]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (waiveNotice && waiverReason.trim().length < 5) {
      setError('Waiver reason must be at least 5 characters.');
      return;
    }
    setSubmitting(true);
    const result = initiateExit(
      staffId,
      {
        lastWorkingDay,
        reason,
        noticePeriodWaived: waiveNotice,
        waiverReason: waiveNotice ? waiverReason.trim() : undefined,
      },
      actor,
    );
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to initiate exit.');
      return;
    }
    onInitiated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="initiate-exit-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-bg-surface border border-line p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="initiate-exit-title" className="text-sm font-semibold text-ink-primary">
            Initiate Exit — {staffName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-bg-subtle rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close"
          >
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Last Working Day */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted uppercase tracking-wider">
              Last Working Day
            </span>
            <input
              type="date"
              value={lastWorkingDay}
              min={today}
              onChange={(e) => setLastWorkingDay(e.target.value)}
              required
              className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          {/* Notice period preview */}
          <div className="p-3 rounded-md bg-accent/10 border border-accent/30">
            <p className="text-xs text-ink-muted">Notice period (calendar days from today)</p>
            <p className="text-lg font-semibold text-accent tabular-nums mt-0.5">
              {noticeDays} day{noticeDays !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Reason */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted uppercase tracking-wider">
              Exit Reason
            </span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ExitReason)}
              className="h-9 px-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Notice waiver */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={waiveNotice}
                onChange={(e) => setWaiveNotice(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-sm text-ink-primary">Waive notice period</span>
            </label>
            {waiveNotice && (
              <label className="flex flex-col gap-1 mt-2">
                <span className="text-xs text-ink-muted uppercase tracking-wider">
                  Waiver Reason
                </span>
                <textarea
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  rows={2}
                  placeholder="Brief reason for waiving notice period (min 5 chars)"
                  className="px-3 py-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </label>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-state-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 h-9 text-sm font-medium rounded-md bg-state-danger text-white hover:bg-state-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger"
          >
            Initiate Exit
          </button>
        </div>
      </form>
    </div>
  );
}
