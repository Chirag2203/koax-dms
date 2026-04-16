'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { bookings } from '@dms/mocks/fixtures';
import { BookingCard, BookingFilters, filterBookings } from '@/src/components/portal/bookings';
import type { BookingFilter } from '@/src/components/portal/bookings';

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [message, setMessage] = React.useState<string | null>(null);

  const show = React.useCallback((msg: string) => {
    setMessage(msg);
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  return { message, show };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const t = useTranslations('portal.bookings');
  const [filter, setFilter] = React.useState<BookingFilter>('all');
  const { message: toastMessage, show: showToast } = useToast();

  const filtered = filterBookings(bookings, filter);

  const handleAction = (
    action: 'reschedule' | 'cancel' | 'calendar',
    bookingId: string,
  ) => {
    const booking = bookings.find((b) => b.id === bookingId);
    const vehicleName = booking?.vehicleName ?? 'booking';

    if (action === 'reschedule') {
      showToast(`Reschedule request noted for ${vehicleName}. Our team will contact you.`);
    } else if (action === 'cancel') {
      showToast(`Cancellation request noted for ${vehicleName}.`);
    } else {
      showToast(`Calendar event for ${vehicleName} — feature coming soon.`);
    }
  };

  return (
    <div className="max-w-5xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
          {t('title')}
        </h1>
        <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-16 mb-8">
        <BookingFilters active={filter} onChange={setFilter} />
      </section>

      {/* ── Booking list ───────────────────────────────────────────────────── */}
      <section
        className="px-6 md:px-12 lg:px-16 pb-16"
        aria-live="polite"
        aria-label="Bookings list"
      >
        {filtered.length === 0 ? (
          /* Empty state */
          <div className="py-16 text-center border border-dashed border-[var(--color-line)]">
            <p className="font-display text-xl text-[var(--color-ink-secondary)] italic mb-6">
              {t('empty')}
            </p>
            <Link
              href="/service"
              className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
            >
              {t('emptyLink')} →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-ink)] text-[var(--color-bg-paper,#fefcf6)] font-mono text-xs uppercase tracking-widest px-6 py-3 shadow-lg max-w-sm text-center"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
