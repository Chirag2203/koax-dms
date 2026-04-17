'use client';

import { useState } from 'react';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { cn } from '@dms/ui';

// ─── Time slots ───────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0]!;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleTestDriveModalProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduleTestDriveModal({ open, onClose, dealId }: ScheduleTestDriveModalProps) {
  const { toasts, toast, dismiss } = useToast();
  const [date, setDate] = useState(tomorrow());
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = !!date && !!timeSlot;

  function handleClose() {
    setDate(tomorrow());
    setTimeSlot('10:00');
    setNotes('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (!isValid) {
      setError('Please select a date and time slot.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await fetch(`/api/staff/sales/deals/${dealId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-drive-scheduled',
          title: 'Test Drive Scheduled',
          body: `Test drive booked for ${date} at ${timeSlot}.${notes ? ` Notes: ${notes}` : ''}`,
        }),
      });
      toast('Test drive scheduled', 'success');
      handleClose();
    } catch {
      setError('Failed to schedule test drive. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Schedule Test Drive"
        subtitle="Book a test drive slot for this customer"
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
              {submitting ? 'Saving…' : 'Schedule'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Date */}
          <div>
            <label htmlFor="td-date" className="block text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2">
              Date <span className="text-[rgb(var(--state-overdue))]">*</span>
            </label>
            <input
              id="td-date"
              type="date"
              min={tomorrow()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(
                'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
                'text-sm text-ink-primary',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            />
          </div>

          {/* Time slot */}
          <div>
            <label htmlFor="td-time" className="block text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2">
              Time Slot <span className="text-[rgb(var(--state-overdue))]">*</span>
            </label>
            <select
              id="td-time"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className={cn(
                'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
                'text-sm text-ink-primary',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="td-notes" className="block text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2">
              Notes (optional)
            </label>
            <textarea
              id="td-notes"
              rows={3}
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or preparation needed…"
              className={cn(
                'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 resize-none',
                'text-sm text-ink-primary',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                'placeholder:text-ink-muted',
              )}
            />
          </div>

          {error && (
            <p className="text-xs text-[rgb(var(--state-overdue))]">{error}</p>
          )}
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
