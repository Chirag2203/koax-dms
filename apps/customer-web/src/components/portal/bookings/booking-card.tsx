'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { Booking } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingCardProps {
  booking: Booking;
  onAction?: (action: 'reschedule' | 'cancel' | 'calendar', bookingId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBookingDate(dateStr: string, time: string): string {
  const date = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(dateStr))
    .toUpperCase();
  // Convert "22 Apr 2026" -> "22 APR 2026"
  return `${date} · ${time}`;
}

const BORDER_COLOR: Record<Booking['type'], string> = {
  'test-drive': 'border-[var(--color-brass)]',
  service: 'border-[var(--color-success,#3b7a57)]',
};

const STATUS_CLASSES: Record<Booking['status'], string> = {
  confirmed: 'text-[var(--color-success,#3b7a57)]',
  completed: 'text-[var(--color-ink-muted)]',
  cancelled: 'text-[var(--color-danger,#c0392b)] line-through',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingCard({ booking, onAction }: BookingCardProps) {
  const t = useTranslations('portal.bookings');

  const dateLabel = formatBookingDate(booking.date, booking.time);
  const typeLabel = booking.type === 'test-drive' ? t('testDrive') : t('service');
  const statusLabel =
    booking.status === 'confirmed'
      ? t('confirmed')
      : booking.status === 'completed'
        ? t('completed')
        : t('cancelled');

  const handleAction = (action: 'reschedule' | 'cancel' | 'calendar') => {
    onAction?.(action, booking.id);
  };

  return (
    <article
      className={[
        'border border-[var(--color-line)] border-l-4 bg-[var(--color-bg-paper,#fefcf6)]',
        'p-6 md:p-8',
        BORDER_COLOR[booking.type],
      ].join(' ')}
      aria-label={`${typeLabel} booking for ${booking.vehicleName}`}
    >
      {/* Top row: date + type badge */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)]">
          {dateLabel}
        </span>
        <span
          className={[
            'font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border flex-shrink-0',
            booking.type === 'test-drive'
              ? 'border-[var(--color-brass)] text-[var(--color-brass)] bg-[var(--color-brass)]/5'
              : 'border-[var(--color-success,#3b7a57)] text-[var(--color-success,#3b7a57)] bg-[var(--color-success,#3b7a57)]/5',
          ].join(' ')}
        >
          {typeLabel}
        </span>
      </div>

      {/* Vehicle name */}
      <h3 className="font-display text-lg text-[var(--color-ink)] leading-snug mb-4">
        {booking.vehicleName}
      </h3>

      {/* Details grid */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 mb-5">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-0.5">
            {t('outlet')}
          </dt>
          <dd className="text-sm text-[var(--color-ink-secondary)]">{booking.outletName}</dd>
        </div>
        {booking.advisorName && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-0.5">
              {t('advisor')}
            </dt>
            <dd className="text-sm text-[var(--color-ink-secondary)]">{booking.advisorName}</dd>
          </div>
        )}
        {booking.estimatedDuration && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-0.5">
              {t('duration')}
            </dt>
            <dd className="text-sm text-[var(--color-ink-secondary)]">{booking.estimatedDuration}</dd>
          </div>
        )}
        {booking.estimatedCost && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-0.5">
              {t('estCost')}
            </dt>
            <dd className="text-sm text-[var(--color-ink-secondary)]">{booking.estimatedCost}</dd>
          </div>
        )}
      </dl>

      {/* Status + actions */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-[var(--color-line)]">
        {/* Status */}
        <span className={['font-mono text-xs uppercase tracking-widest', STATUS_CLASSES[booking.status]].join(' ')}>
          {statusLabel}
        </span>

        {/* Action buttons — only for non-cancelled */}
        {booking.status !== 'cancelled' && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleAction('reschedule')}
              className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
              aria-label={`Reschedule booking for ${booking.vehicleName}`}
            >
              {t('reschedule')}
            </button>
            <span className="text-[var(--color-line)]" aria-hidden="true">·</span>
            <button
              onClick={() => handleAction('cancel')}
              className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
              aria-label={`Cancel booking for ${booking.vehicleName}`}
            >
              {t('cancel')}
            </button>
            <span className="text-[var(--color-line)]" aria-hidden="true">·</span>
            <button
              onClick={() => handleAction('calendar')}
              className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
              aria-label={`Add booking for ${booking.vehicleName} to calendar`}
            >
              {t('addToCalendar')}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
