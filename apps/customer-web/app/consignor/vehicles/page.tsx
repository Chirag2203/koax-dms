'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Eye, MessageSquare, CheckCircle2, Circle, Clock } from 'lucide-react';
import { consignedVehicles } from '@dms/mocks/fixtures';
import type { ConsignedVehicle } from '@dms/types/domain';

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

// ─── Timeline step ────────────────────────────────────────────────────────────

type TimelineKey = 'consigned' | 'listed' | 'viewings' | 'offer' | 'sold';

const TIMELINE_STEPS: TimelineKey[] = ['consigned', 'listed', 'viewings', 'offer', 'sold'];

const STATUS_TIMELINE_INDEX: Partial<Record<VehicleStatus, number>> = {
  listed: 1,
  reserved: 2,
  'under-offer': 3,
  sold: 4,
  withdrawn: -1,
};

function StatusTimeline({ vehicle }: { vehicle: ConsignedVehicle }) {
  const t = useTranslations('portal.consignor.vehicles.timeline');
  const currentIndex = STATUS_TIMELINE_INDEX[vehicle.status] ?? 0;

  return (
    <div className="flex items-center gap-0" aria-label="Status timeline">
      {TIMELINE_STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <React.Fragment key={step}>
            {/* Step */}
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className="flex-shrink-0">
                {isComplete ? (
                  <CheckCircle2
                    size={14}
                    className="text-[var(--color-forest,#1F4D3A)]"
                    aria-hidden="true"
                  />
                ) : isCurrent ? (
                  <Clock
                    size={14}
                    className="text-[var(--color-brass)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    size={14}
                    className="text-[var(--color-line)]"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span
                className={[
                  'font-mono text-[8px] uppercase tracking-wider text-center leading-none',
                  isComplete
                    ? 'text-[var(--color-forest,#1F4D3A)]'
                    : isCurrent
                    ? 'text-[var(--color-brass)]'
                    : 'text-[var(--color-ink-muted)]/40',
                ].join(' ')}
              >
                {t(step)}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className={[
                  'flex-1 h-px mb-4 mx-1',
                  i < currentIndex
                    ? 'bg-[var(--color-forest,#1F4D3A)]'
                    : 'bg-[var(--color-line)]',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Full vehicle card ────────────────────────────────────────────────────────

function FullVehicleCard({ vehicle }: { vehicle: ConsignedVehicle }) {
  const t = useTranslations('portal.consignor.vehicles');

  return (
    <article className="border border-[var(--color-line)] overflow-hidden">
      {/* Image row */}
      <div className="relative aspect-[16/6] md:aspect-[16/5] overflow-hidden bg-[var(--color-bg-subtle,#f3f1ea)] group">
        {vehicle.imageUrl ? (
          <Image
            src={vehicle.imageUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-bg-subtle,#f3f1ea)]" />
        )}
        {/* Status badge overlay */}
        <div className="absolute top-4 left-4">
          <StatusBadge status={vehicle.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {/* Top row: identity + stats */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          {/* Identity */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              {vehicle.year} · {vehicle.make.toUpperCase()} {vehicle.model.toUpperCase()}
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-[var(--color-ink)] leading-snug">
              {vehicle.make} {vehicle.model}
            </h2>
            {vehicle.variant && (
              <p className="text-sm text-[var(--color-ink-secondary)] mt-1">
                {vehicle.variant}
                {vehicle.color ? ` · ${vehicle.color}` : ''}
              </p>
            )}
          </div>

          {/* Stats cluster */}
          <div className="flex gap-6 flex-shrink-0">
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
                <Eye size={10} className="inline mr-1" aria-hidden="true" />
                Views
              </p>
              <p className="font-display text-2xl text-[var(--color-ink)]">
                {vehicle.viewingsCount ?? 0}
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
                <MessageSquare size={10} className="inline mr-1" aria-hidden="true" />
                Inquiries
              </p>
              <p className="font-display text-2xl text-[var(--color-ink)]">
                {vehicle.inquiriesCount ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pt-5 border-t border-[var(--color-line)]">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              Asking Price
            </p>
            <p className="font-mono tabular-nums text-sm text-[var(--color-ink)]">
              {formatInr(vehicle.askingPrice)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              Listed Price
            </p>
            <p className="font-mono tabular-nums text-sm text-[var(--color-brass)] font-medium">
              {formatInr(vehicle.currentListPrice)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              Fee Rate
            </p>
            <p className="font-mono text-sm text-[var(--color-ink)]">
              {vehicle.feePercentage}%
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              Est. Net Payout
            </p>
            <p className="font-mono tabular-nums text-sm text-[var(--color-ink)]">
              {formatInr(vehicle.currentListPrice * (1 - vehicle.feePercentage / 100))}
            </p>
          </div>
        </div>

        {/* Status timeline */}
        <div className="pt-5 border-t border-[var(--color-line)]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-4">
            Status Timeline
          </p>
          <StatusTimeline vehicle={vehicle} />
        </div>

        {/* Consigned date */}
        {vehicle.consignmentDate && (
          <div className="mt-4 pt-4 border-t border-[var(--color-line)]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
              Consigned {formatDate(vehicle.consignmentDate)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsignorVehiclesPage() {
  const t = useTranslations('portal.consignor.vehicles');

  return (
    <div className="max-w-5xl">
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CONSIGNOR PORTAL
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-[var(--color-ink)] leading-[1.1] mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-xl">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* ── Vehicle cards ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-16 py-8 pb-16">
        {consignedVehicles.length === 0 ? (
          <div className="border border-[var(--color-line)] p-10 text-center">
            <p className="font-display text-lg italic text-[var(--color-ink-secondary)] mb-2">
              {t('empty')}
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">{t('emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {consignedVehicles.map((vehicle) => (
              <FullVehicleCard key={vehicle.vin} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
