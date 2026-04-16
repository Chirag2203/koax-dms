'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import type { ServiceRecord } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonthYear(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(dateStr))
    .toUpperCase();
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km) + ' km';
}

function formatCost(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function advisorInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ServiceTimelineProps {
  records: ServiceRecord[];
}

// ─── Single entry ─────────────────────────────────────────────────────────────

function TimelineEntry({ record }: { record: ServiceRecord }) {
  const t = useTranslations('portal.vehicles');

  return (
    <div className="grid grid-cols-[80px_1fr] md:grid-cols-[96px_1fr] gap-6 py-8 group">
      {/* Date column */}
      <div className="pt-1">
        <span className="font-mono text-sm text-[var(--color-ink-muted)] block leading-tight">
          {formatMonthYear(record.date)}
        </span>
        <span className="font-mono text-[10px] text-[var(--color-ink-muted)]/60 mt-1 block">
          {formatKm(record.km)}
        </span>
      </div>

      {/* Main content */}
      <div>
        {/* Top row: type + status + cost */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="min-w-0">
            {/* Status dot + type */}
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${
                  record.status === 'completed'
                    ? 'bg-[var(--color-success,#16a34a)]'
                    : 'bg-[var(--color-brass)]'
                }`}
                aria-hidden="true"
              />
              <h3 className="font-display text-lg text-[var(--color-ink)] leading-snug">
                {record.type}
              </h3>
            </div>
            <p className="text-sm text-[var(--color-ink-secondary)] ml-3.5">
              {record.vehicleName}
            </p>
          </div>

          {/* Cost */}
          <span className="font-mono text-sm text-[var(--color-ink)] shrink-0 pt-0.5">
            {formatCost(record.cost)}
          </span>
        </div>

        {/* Items */}
        <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed ml-3.5 mb-3">
          {record.items.join(', ')}
        </p>

        {/* Footer: advisor + invoice */}
        <div className="flex items-center justify-between ml-3.5">
          {/* Advisor initials badge */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-ink)]/8 font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-muted)]"
              title={record.advisorName}
              aria-label={`${t('advisorInitials')}: ${record.advisorName}`}
            >
              {advisorInitials(record.advisorName)}
            </span>
            <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
              {record.advisorName}
            </span>
          </div>

          {/* Invoice link */}
          {record.invoiceUrl && (
            <a
              href={record.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              {t('downloadInvoice')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceTimeline({ records }: ServiceTimelineProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <section className="px-6 md:px-12 lg:px-16 py-12 border-t border-[var(--color-line)]">
      {/* Header */}
      <h2 className="font-display text-2xl md:text-3xl text-[var(--color-ink)] mb-8">
        {t('serviceHistory')}
      </h2>

      {records.length === 0 ? (
        <p className="font-display text-lg italic text-[var(--color-ink-secondary)] py-8">
          {t('noRecords')}
        </p>
      ) : (
        <div
          className="divide-y divide-[var(--color-line)]"
          role="list"
          aria-label={t('serviceHistory')}
        >
          {records.map((record) => (
            <div key={record.id} role="listitem">
              <TimelineEntry record={record} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
