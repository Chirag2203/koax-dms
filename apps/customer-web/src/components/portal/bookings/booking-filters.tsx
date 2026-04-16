'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { Booking } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingFilter = 'all' | 'test-drive' | 'service';

export interface BookingFiltersProps {
  active: BookingFilter;
  onChange: (filter: BookingFilter) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingFilters({ active, onChange }: BookingFiltersProps) {
  const t = useTranslations('portal.bookings');

  const filters: { key: BookingFilter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'test-drive', label: t('filterTestDrive') },
    { key: 'service', label: t('filterService') },
  ];

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="tablist"
      aria-label="Filter bookings"
    >
      {filters.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={[
              'px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-widest transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              isActive
                ? 'bg-accent text-white'
                : 'border border-line text-ink-secondary hover:border-accent hover:text-accent',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function filterBookings(bookings: Booking[], filter: BookingFilter): Booking[] {
  if (filter === 'all') return bookings;
  return bookings.filter((b) => b.type === filter);
}
