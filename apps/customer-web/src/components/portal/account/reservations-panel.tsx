'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import type { Reservation } from '@dms/types';
import { PriceDisplay } from '@/src/components/price-display';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReservationsPanelProps {
  reservations: Reservation[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatExpiry(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(dateStr))
    .toUpperCase();
}

function getDaysRemaining(expiresAt: string): number {
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  return Math.max(0, Math.round((exp - now) / (1000 * 60 * 60 * 24)));
}

// ─── Single reservation row ────────────────────────────────────────────────────

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const t = useTranslations('portal.account');
  const daysLeft = getDaysRemaining(reservation.expiresAt);
  const expiryLabel = formatExpiry(reservation.expiresAt);
  const isUrgent = daysLeft <= 2;

  return (
    <div className="py-6 first:pt-0">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden bg-bg-subtle">
          {reservation.thumbnailUrl ? (
            <Image
              src={reservation.thumbnailUrl}
              alt={reservation.vehicleName}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-bg-subtle" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-lg text-ink-primary leading-snug mb-1">
            {reservation.vehicleName}
          </h4>

          <p
            className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${
              isUrgent ? 'text-danger' : 'text-ink-muted'
            }`}
          >
            {t('reservations.holdExpires', { date: expiryLabel })}
            {isUrgent && daysLeft > 0 && ` · ${daysLeft}D LEFT`}
            {daysLeft === 0 && ' · EXPIRES TODAY'}
          </p>

          <p className="text-sm text-ink-secondary mb-3">
            {t('reservations.deposit')}{' '}
            <PriceDisplay amount={reservation.depositAmount} size="sm" />
          </p>

          {/* Actions */}
          <div className="flex items-center gap-5">
            <button
              className="bg-ink-primary text-bg-paper px-5 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={`${t('reservations.payBalance')} for ${reservation.vehicleName}`}
            >
              {t('reservations.payBalance')}
            </button>
            <button
              className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={`${t('reservations.release')} hold on ${reservation.vehicleName}`}
            >
              {t('reservations.release')}
            </button>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-accent-subtle text-accent">
            {t('reservations.activeHold')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReservationsPanel({ reservations }: ReservationsPanelProps) {
  const t = useTranslations('portal.account');
  const activeReservations = reservations.filter((r) => r.status === 'active');

  return (
    <div className="bg-bg-subtle border border-line p-8 md:p-10 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Lock className="h-5 w-5 text-success" aria-hidden="true" />
        <h2 className="font-display text-2xl text-ink-primary">
          {t('reservations.title')}
          {activeReservations.length > 0 && (
            <span className="ml-2 font-mono text-sm text-ink-muted">
              ({activeReservations.length})
            </span>
          )}
        </h2>
      </div>

      {activeReservations.length === 0 ? (
        <p className="font-display text-base text-ink-secondary italic">
          {t('reservations.empty')}
        </p>
      ) : (
        <div className="divide-y divide-line">
          {activeReservations.map((r) => (
            <ReservationRow key={r.id} reservation={r} />
          ))}
        </div>
      )}
    </div>
  );
}
