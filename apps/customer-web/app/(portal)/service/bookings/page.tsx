'use client';

/**
 * /(portal)/service/bookings — Customer's service booking list.
 *
 * Shows all portal-originated JCs for the authenticated customer,
 * sorted by createdAt descending.
 *
 * Supports:
 *  - AWAITING_CONFIRMATION: amber "Pending" badge + self-cancel button
 *  - Post-RECEIVED: "Contact workshop to cancel" link
 *  - CANCELLED: "Declined — {reason}" or "Cancelled by you" badge
 *
 * P2 stub: links to `/service/bookings/[id]` show a "coming soon" note.
 *
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §8.1 S3, §21 P1
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarDays, AlertCircle } from 'lucide-react';
import { cn } from '@dms/ui';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { usePortalServiceStore } from '@/src/lib/service/service-booking-service-bridge';
import { SELF_CANCEL_REASON } from '@/src/lib/service/service-booking-store';
import { serviceTypes } from '@dms/mocks/fixtures';
import type { JobCard } from '@dms/types';

// ─── Service type name lookup ─────────────────────────────────────────────────

const SERVICE_TYPE_NAME: Record<string, string> = Object.fromEntries(
  serviceTypes.map((st) => [st.id, st.name]),
);

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ booking }: { booking: JobCard }) {
  const t = useTranslations('portal.serviceBooking.list');

  if (booking.status === 'AWAITING_CONFIRMATION') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-700 font-mono text-[10px] uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        {t('pendingBadge')}
      </span>
    );
  }

  if (booking.status === 'CANCELLED') {
    const isCustomerCancel = booking.declineReason === SELF_CANCEL_REASON; // L_SVC_BOOK_1
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 font-mono text-[10px] uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
        {isCustomerCancel
          ? t('cancelledBadge')
          : `${t('declinedPrefix')}${booking.declineReason ?? ''}`}
      </span>
    );
  }

  if (booking.status === 'RECEIVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 font-mono text-[10px] uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
        {t('receivedBadge')}
      </span>
    );
  }

  const statusLabels: Record<string, string> = {
    DIAGNOSED: 'statusDiagnosed',
    IN_PROGRESS: 'statusInProgress',
    WAITING_PARTS: 'statusWaitingParts',
    ADDITIONAL_WORK_APPROVAL: 'statusApproval',
    QC: 'statusQc',
    READY_FOR_DELIVERY: 'statusReady',
    DELIVERED: 'statusDelivered',
  };

  const labelKey = statusLabels[booking.status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[10px] uppercase tracking-widest">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
      {labelKey ? t(labelKey as Parameters<typeof t>[0]) : booking.status}
    </span>
  );
}

// ─── Booking card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: JobCard;
  onCancel: (jobCardId: string) => void;
  isCancelling: string | null;
}

function ServiceBookingCard({ booking, onCancel, isCancelling }: BookingCardProps) {
  const t = useTranslations('portal.serviceBooking.list');
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  const canSelfCancel = booking.status === 'AWAITING_CONFIRMATION';
  const isPostConfirm =
    booking.status !== 'AWAITING_CONFIRMATION' && booking.status !== 'CANCELLED';

  const serviceTypeName =
    (booking.serviceTypeId ? SERVICE_TYPE_NAME[booking.serviceTypeId] : null) ??
    booking.serviceTypeId ??
    'Service';

  const formattedDate = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const slotLabel = booking.scheduledSlot === 'MORNING'
    ? t('slotMorning')
    : booking.scheduledSlot === 'AFTERNOON'
    ? t('slotAfternoon')
    : null;

  const bookedDate = new Date(booking.receivedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="border border-[var(--color-line)] p-4 md:p-5">
      {/* Top row: job number + status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-mono text-[12px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-0.5">
            {booking.jobNo}
          </p>
          <p className="font-display text-[17px] text-[var(--color-ink)] leading-tight">
            {serviceTypeName}
          </p>
        </div>
        <StatusBadge booking={booking} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
        {formattedDate && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--color-ink-secondary)]">
            <CalendarDays size={12} strokeWidth={1.5} />
            {t('scheduledFor', { date: formattedDate })}
            {slotLabel && ` · ${slotLabel}`}
          </span>
        )}
        <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
          {t('bookedOn', { date: bookedDate })}
        </span>
      </div>

      {/* VIN */}
      <p className="font-mono text-[11px] text-[var(--color-ink-muted)] mb-4 tracking-widest">
        VIN: {booking.vin}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Detail link */}
        <Link
          href={`/service/bookings/${booking.id}`}
          className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          {t('viewDetail')} →
        </Link>

        {canSelfCancel && !showCancelConfirm && (
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="font-mono text-[11px] uppercase tracking-widest text-red-600 hover:text-red-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            {t('cancelButton')}
          </button>
        )}

        {isPostConfirm && (
          <span className="font-mono text-[11px] text-[var(--color-ink-muted)] italic">
            {t('contactWorkshop')}
          </span>
        )}
      </div>

      {/* Cancel confirmation inline */}
      {showCancelConfirm && (
        <div
          role="dialog"
          aria-label={t('cancelConfirmTitle')}
          className="mt-4 p-4 border border-red-200 bg-red-50"
        >
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-[13px] font-medium text-red-700 mb-1">{t('cancelConfirmTitle')}</p>
              <p className="text-[12px] text-red-600">{t('cancelConfirmBody')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isCancelling === booking.id}
              onClick={() => {
                onCancel(booking.id);
                setShowCancelConfirm(false);
              }}
              className="px-3 py-1.5 bg-red-600 text-white font-mono text-[11px] uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              {t('cancelConfirm')}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="px-3 py-1.5 border border-red-300 text-red-600 font-mono text-[11px] uppercase tracking-widest hover:bg-red-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            >
              {t('cancelDismiss')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceBookingsPage() {
  const t = useTranslations('portal.serviceBooking.list');
  const { customerId } = usePortalAuth();
  const selectBookings = usePortalServiceStore((s) => s.selectBookingsByCustomer);
  const cancelPortalBooking = usePortalServiceStore((s) => s.cancelPortalBooking);
  const [isCancelling, setIsCancelling] = React.useState<string | null>(null);

  const bookings = React.useMemo(
    () => selectBookings(customerId).sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customerId, selectBookings],
  );

  function handleCancel(jobCardId: string) {
    setIsCancelling(jobCardId);
    cancelPortalBooking(jobCardId, customerId);
    setIsCancelling(null);
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
              {t('title')}
            </h1>
            <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href="/service/book"
            className="shrink-0 px-4 py-2.5 bg-[var(--color-brass)] text-white font-mono text-[11px] uppercase tracking-widest hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            {t('bookNew')}
          </Link>
        </div>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* List */}
      <section
        className="px-6 md:px-12 lg:px-16 pb-16"
        aria-live="polite"
        aria-label="Service bookings"
      >
        {bookings.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[var(--color-line)]">
            <CalendarDays
              size={36}
              className="mx-auto mb-4 text-[var(--color-ink-muted)]"
              strokeWidth={1}
            />
            <p className="font-display text-xl italic text-[var(--color-ink-secondary)] mb-6">
              {t('empty')}
            </p>
            <Link
              href="/service/book"
              className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
            >
              {t('emptyCta')} →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <ServiceBookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                isCancelling={isCancelling}
              />
            ))}
          </div>
        )}
      </section>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
