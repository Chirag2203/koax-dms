'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarDays } from 'lucide-react';
import type { Booking } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpcomingVisitsPanelProps {
  bookings: Booking[];
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
  return `${date} · ${time}`;
}

const CITY_LABELS: Record<string, string> = {
  bangalore: 'BANGALORE',
  mumbai: 'MUMBAI',
  chennai: 'CHENNAI',
};

// ─── Single booking row ────────────────────────────────────────────────────────

function BookingRow({ booking }: { booking: Booking }) {
  const t = useTranslations('portal.account');
  const cityLabel = CITY_LABELS[booking.outletCity] ?? booking.outletCity.toUpperCase();
  const dateTimeLabel = formatBookingDate(booking.date, booking.time);

  return (
    <div className="py-6 first:pt-0 border-l-2 border-[var(--color-brass)] pl-5">
      {/* Outlet label */}
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] block mb-1">
        {cityLabel} · {booking.outletName}
      </span>

      {/* Date/time */}
      <p className="font-mono text-xs text-[var(--color-ink)] uppercase tracking-wide mb-1">
        {dateTimeLabel}
      </p>

      {/* Visit title */}
      <h4 className="font-display text-lg text-[var(--color-ink)] leading-snug mb-1">
        {booking.type === 'test-drive'
          ? t('visits.testDriveLabel')
          : t('visits.serviceLabel')}{' '}
        · {booking.vehicleName}
      </h4>

      {/* Advisor / duration / cost */}
      <div className="text-sm text-[var(--color-ink-secondary)] space-y-0.5 mb-3">
        {booking.advisorName && (
          <p>
            {t('visits.advisor')}: {booking.advisorName}
          </p>
        )}
        {booking.estimatedDuration && (
          <p>
            {t('visits.duration')}: {booking.estimatedDuration}
          </p>
        )}
        {booking.estimatedCost && (
          <p>
            {t('visits.estimatedCost')}: {booking.estimatedCost}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          aria-label={`Reschedule visit for ${booking.vehicleName}`}
        >
          {t('visits.reschedule')}
        </button>
        <span className="text-[var(--color-line)]" aria-hidden="true">·</span>
        <button
          className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          aria-label={`Cancel visit for ${booking.vehicleName}`}
        >
          {t('visits.cancel')}
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpcomingVisitsPanel({ bookings }: UpcomingVisitsPanelProps) {
  const t = useTranslations('portal.account');
  const upcoming = bookings.filter((b) => b.status === 'confirmed');

  return (
    <div className="bg-[var(--color-surface-container-low,#fcf9f3)] border border-[var(--color-outline-variant,#babab0)]/30 p-8 md:p-10 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays
          className="h-5 w-5 text-[var(--color-brass)]"
          aria-hidden="true"
        />
        <h2 className="font-display text-2xl text-[var(--color-ink)]">
          {t('visits.title')}
        </h2>
      </div>

      {upcoming.length === 0 ? (
        <div>
          <p className="font-display text-base text-[var(--color-ink-secondary)] italic mb-4">
            {t('visits.empty')}
          </p>
          <Link
            href="/service"
            className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4"
          >
            {t('visits.scheduleLink')}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-line)] space-y-0">
          {upcoming.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
