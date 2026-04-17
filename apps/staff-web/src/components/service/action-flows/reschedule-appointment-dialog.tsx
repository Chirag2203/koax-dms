'use client';

import { useState, useMemo } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import type { Appointment } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Reschedule Appointment',
  labelDate: 'New Date',
  labelTime: 'Time Slot',
  cancel: 'Cancel',
  submit: 'Reschedule',
  success: 'Appointment rescheduled',
  errorDate: 'Date is required',
  errorTime: 'Time slot is required',
  slotTaken: (id: string) => `Slot taken by APT-${id.slice(-6).toUpperCase()} — pick another`,
} as const;

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RescheduleAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment;
  onComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RescheduleAppointmentDialog({
  open,
  onClose,
  appointment,
  onComplete,
}: RescheduleAppointmentDialogProps) {
  const currentDate = new Date(appointment.scheduledAt);
  const [date, setDate] = useState(
    currentDate.toISOString().slice(0, 10),
  );
  const [timeSlot, setTimeSlot] = useState(
    `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`,
  );
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');

  const { user } = useStaffAuth();
  const appointments = useServiceStore((s) => s.appointments);
  const rescheduleAppointment = useServiceStore((s) => s.rescheduleAppointment);
  const { toasts, toast, dismiss } = useToast();

  // Check for slot conflict — same bay or same advisor, same date+time, excluding current
  const conflictingApt = useMemo<Appointment | undefined>(() => {
    if (!date || !timeSlot) return undefined;
    const newISO = new Date(`${date}T${timeSlot}:00`).toISOString();
    return appointments.find((a) => {
      if (a.id === appointment.id) return false;
      if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') return false;
      const aDate = a.scheduledAt.slice(0, 16); // YYYY-MM-DDTHH:MM
      const newDate = newISO.slice(0, 16);
      if (aDate !== newDate) return false;
      // Same bay or same advisor = conflict
      return (
        (a.bayId && appointment.bayId && a.bayId === appointment.bayId) ||
        (a.advisorId && appointment.advisorId && a.advisorId === appointment.advisorId)
      );
    });
  }, [date, timeSlot, appointments, appointment]);

  function handleClose() {
    setDateError('');
    setTimeError('');
    onClose();
  }

  function handleSubmit() {
    if (!date) { setDateError(MESSAGES.errorDate); return; }
    if (!timeSlot) { setTimeError(MESSAGES.errorTime); return; }
    if (conflictingApt) return; // block submit — conflict shown in UI

    const newISO = new Date(`${date}T${timeSlot}:00`).toISOString();
    const actor = { id: user?.id ?? 'staff-r24-001', name: user?.name ?? 'Meera Iyer' };
    rescheduleAppointment(appointment.id, newISO, actor);
    toast(MESSAGES.success, 'success');
    handleClose();
    onComplete?.();
  }

  const isDirty = date !== currentDate.toISOString().slice(0, 10) || timeSlot !== `${String(currentDate.getHours()).padStart(2, '0')}:00`;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={MESSAGES.title}
        size="md"
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
              disabled={!!conflictingApt}
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
        <div className="space-y-5">

          {/* Date input */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
              {MESSAGES.labelDate} <span className="text-ink-muted">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (dateError) setDateError('');
              }}
              className={cn(
                'h-10 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                dateError ? 'border-state-danger' : 'border-line',
              )}
            />
            {dateError && <p className="text-xs text-state-danger mt-1">{dateError}</p>}
          </div>

          {/* Time slot grid */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-2">
              {MESSAGES.labelTime} <span className="text-ink-muted">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    setTimeSlot(slot);
                    if (timeError) setTimeError('');
                  }}
                  className={cn(
                    'h-9 rounded-md border text-sm font-mono font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                    timeSlot === slot
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-bg-subtle text-ink-secondary hover:border-accent/50 hover:text-ink-primary',
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
            {timeError && <p className="text-xs text-state-danger mt-1">{timeError}</p>}
          </div>

          {/* Conflict notice */}
          {conflictingApt && (
            <div className="rounded-md border border-state-danger/40 bg-state-danger/10 px-4 py-3">
              <p className="text-[13px] text-state-danger">
                {MESSAGES.slotTaken(conflictingApt.id)}
              </p>
            </div>
          )}
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
