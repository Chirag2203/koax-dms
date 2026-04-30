'use client';

/**
 * TestDriveBookingList — customer portal view of their test-drive bookings.
 *
 * Design direction: Editorial Luxury / Dark Premium (customer surface tokens).
 * Uses `--color-brass`, `--color-ink`, `--color-line`, font-display, font-mono.
 * NO text-[NNpx]. NO rounded-lg/xl.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S3 S11 S12 L10
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarCheck } from 'lucide-react';
import { useTestDriveStore } from '@/src/lib/test-drive/test-drive-store-bridge';
import type { TestDriveBooking, TestDriveStatus } from '@dms/types';

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TestDriveStatus, string> = {
  PENDING: 'Pending Confirmation',
  SCHEDULED: 'Confirmed',
  EXECUTING: 'In Progress',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
  CANCELLED: 'Cancelled',
};

const STATUS_CHIP_CLASS: Record<TestDriveStatus, string> = {
  PENDING: 'bg-amber-50 border-amber-300 text-amber-700',
  SCHEDULED: 'bg-blue-50 border-blue-200 text-blue-700',
  EXECUTING: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  COMPLETED: 'bg-[var(--color-ink-muted,#888)/0.08] border-[var(--color-line)] text-[var(--color-ink-secondary)]',
  NO_SHOW: 'bg-red-50 border-red-200 text-red-600',
  CANCELLED: 'bg-zinc-50 border-zinc-200 text-zinc-500',
};

const SLOT_LABEL: Record<string, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  FULL_DAY: 'Full Day',
};

const OUTLET_LABEL: Record<string, string> = {
  bangalore: 'Bangalore',
  mumbai: 'Mumbai',
  chennai: 'Chennai',
};

// ─── Interest summary for customer (S12 — no raw label) ──────────────────────

function interestSummary(interest: string): string {
  if (interest === 'hot') return 'We are excited to follow up with you soon!';
  if (interest === 'warm') return 'We will be in touch to discuss next steps.';
  return 'Our team will reach out if you have further questions.';
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ booking, onCancel }: { booking: TestDriveBooking; onCancel: (id: string) => void }) {
  const t = useTranslations('portal.testDrive');
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const displayDate = booking.confirmedDate ?? booking.requestedDate;
  const displaySlot = SLOT_LABEL[booking.confirmedSlot ?? booking.requestedSlot] ?? '';
  const outletName = OUTLET_LABEL[booking.outletId] ?? booking.outletId;

  return (
    <div className="border border-[var(--color-line)] p-4 md:p-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-widest mb-0.5">
            {booking.id}
          </p>
          <p className="font-display text-lg text-[var(--color-ink)] leading-tight">
            {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}
          </p>
        </div>
        <span className={[
          'inline-flex items-center gap-1 px-2 py-0.5 border font-mono text-xs uppercase tracking-widest shrink-0',
          STATUS_CHIP_CLASS[booking.status],
        ].join(' ')}>
          <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        <span className="flex items-center gap-1 font-mono text-xs text-[var(--color-ink-secondary)]">
          <CalendarCheck size={11} strokeWidth={1.5} aria-hidden="true" />
          {displayDate} · {displaySlot}
        </span>
        <span className="font-mono text-xs text-[var(--color-ink-muted)]">
          {outletName}
        </span>
      </div>

      {/* Post-drive summary (S12) */}
      {booking.status === 'COMPLETED' && booking.feedback && (
        <p className="text-sm text-[var(--color-ink-secondary)] italic mb-4">
          {interestSummary(booking.feedback.interestLevel)}
        </p>
      )}

      {/* Cancellation reason */}
      {booking.status === 'CANCELLED' && booking.cancellationReason && (
        <p className="text-sm text-[var(--color-ink-muted)] mb-4">
          {t('cancelledReason')}: {booking.cancellationReason}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* S3: customer can cancel own PENDING booking */}
        {booking.status === 'PENDING' && !cancelOpen && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="font-mono text-xs uppercase tracking-widest text-red-600 hover:text-red-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            {t('cancelButton')}
          </button>
        )}
      </div>

      {/* Inline cancel confirm */}
      {cancelOpen && (
        <div className="mt-4 p-4 border border-red-200 bg-red-50" role="dialog" aria-label={t('cancelConfirmTitle')}>
          <p className="text-sm font-medium text-red-700 mb-1">{t('cancelConfirmTitle')}</p>
          <p className="text-xs text-red-600 mb-3">{t('cancelConfirmBody')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onCancel(booking.id); setCancelOpen(false); }}
              className="px-3 py-1.5 bg-red-600 text-white font-mono text-xs uppercase tracking-widest hover:bg-red-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              {t('cancelConfirm')}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="px-3 py-1.5 border border-red-300 text-red-600 font-mono text-xs uppercase tracking-widest hover:bg-red-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            >
              {t('cancelDismiss')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

export function TestDriveBookingList({ customerId }: { customerId: string }) {
  const t = useTranslations('portal.testDrive');
  const selectByCustomer = useTestDriveStore((s) => s.selectByCustomer);
  const cancelBooking = useTestDriveStore((s) => s.cancelBooking);

  const bookings = React.useMemo(
    () => selectByCustomer(customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customerId, selectByCustomer],
  );

  function handleCancel(id: string) {
    // Bridge signature is (id, customerId) — reason defaults to 'Cancelled by customer'
    cancelBooking(id, customerId);
  }

  // S11: empty state
  if (bookings.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-[var(--color-line)]">
        <CalendarCheck size={36} className="mx-auto mb-4 text-[var(--color-ink-muted)]" strokeWidth={1} aria-hidden="true" />
        <p className="font-display text-xl italic text-[var(--color-ink-secondary)] mb-6">
          {t('emptyState')}
        </p>
        <Link
          href="/test-drive/new"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          {t('emptyCta')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite" aria-label={t('bookingsListLabel')}>
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
      ))}
    </div>
  );
}
