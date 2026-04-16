'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Eye, MessageSquare, ArrowRight } from 'lucide-react';
import type { ConsignedVehicle } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsignedVehicleCardsProps {
  vehicles: ConsignedVehicle[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(dateStr))
    .toUpperCase();
}

function getDaysListed(listedAt: string): number {
  const listed = new Date(listedAt);
  const now = new Date();
  return Math.floor((now.getTime() - listed.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type VehicleStatus = ConsignedVehicle['status'];

const STATUS_CLASSES: Record<VehicleStatus, string> = {
  listed: 'bg-[var(--color-forest,#1F4D3A)]/10 text-[var(--color-forest,#1F4D3A)]',
  reserved: 'bg-[var(--color-warning,#D97706)]/10 text-[var(--color-warning,#D97706)]',
  'under-offer': 'bg-[var(--color-brass)]/10 text-[var(--color-brass)]',
  sold: 'bg-[var(--color-ink-muted)]/10 text-[var(--color-ink-muted)]',
  withdrawn: 'bg-[var(--color-danger,#DC2626)]/10 text-[var(--color-danger,#DC2626)]',
};

function StatusBadge({ status }: { status: VehicleStatus }) {
  const t = useTranslations('portal.consignor.status');
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest rounded-sm',
        STATUS_CLASSES[status] ?? 'bg-[var(--color-ink-muted)]/10 text-[var(--color-ink-muted)]',
      ].join(' ')}
    >
      {t(status)}
    </span>
  );
}

// ─── Single vehicle card ──────────────────────────────────────────────────────

function VehicleCard({ vehicle }: { vehicle: ConsignedVehicle }) {
  const t = useTranslations('portal.consignor.dashboard.vehicles');
  const days = vehicle.consignmentDate ? getDaysListed(vehicle.consignmentDate) : 0;

  return (
    <article className="border border-[var(--color-line)] bg-[var(--color-bg-elevated,#faf8f2)] overflow-hidden group">
      {/* Image — 16:10 */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-bg-subtle,#f3f1ea)]">
        {vehicle.imageUrl ? (
          <Image
            src={vehicle.imageUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-bg-subtle,#f3f1ea)]" />
        )}
        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={vehicle.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Make / Model / Year */}
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
            {vehicle.year} · {vehicle.make.toUpperCase()} {vehicle.model.toUpperCase()}
          </p>
          <h3 className="font-display text-xl text-[var(--color-ink)] leading-snug">
            {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.variant && (
            <p className="text-sm text-[var(--color-ink-secondary)] mt-0.5">
              {vehicle.variant}
            </p>
          )}
        </div>

        {/* Price row */}
        <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-[var(--color-line)]">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              {t('askingPrice')}
            </p>
            <p className="font-mono tabular-nums text-sm text-[var(--color-ink)]">
              {formatInr(vehicle.askingPrice)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              {t('listedPrice')}
            </p>
            <p className="font-mono tabular-nums text-sm text-[var(--color-brass)] font-medium">
              {formatInr(vehicle.currentListPrice)}
            </p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-[var(--color-ink-muted)] mb-4">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
            <Eye size={11} strokeWidth={1.5} aria-hidden="true" />
            {t('viewings', { count: vehicle.viewingsCount ?? 0 })}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
            <MessageSquare size={11} strokeWidth={1.5} aria-hidden="true" />
            {t('inquiries', { count: vehicle.inquiriesCount ?? 0 })}
          </span>
          {vehicle.consignmentDate && (
            <span className="font-mono text-[10px] uppercase tracking-wide ml-auto">
              {t('daysListed', { days })}
            </span>
          )}
        </div>

        {/* Fee + link */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
          <span className="font-mono text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest">
            {t('feeRate', { rate: vehicle.feePercentage })}
          </span>
          <Link
            href={`/consignor/vehicles`}
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            {t('viewDetails')}
            <ArrowRight size={11} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConsignedVehicleCards({ vehicles }: ConsignedVehicleCardsProps) {
  const t = useTranslations('portal.consignor.dashboard.vehicles');

  return (
    <section className="px-6 md:px-12 lg:px-16 py-8">
      {/* Section header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl md:text-3xl text-[var(--color-ink)]">
          {t('title')}
        </h2>
      </div>

      {vehicles.length === 0 ? (
        <div className="border border-[var(--color-line)] p-10 text-center">
          <p className="font-display text-lg italic text-[var(--color-ink-secondary)] mb-2">
            {t('empty')}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.vin} vehicle={vehicle} />
          ))}
        </div>
      )}
    </section>
  );
}
