'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import type { ServiceRecord } from '@dms/types';
import { PriceDisplay } from '@/src/components/price-display';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceHistoryPreviewProps {
  records: ServiceRecord[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonthYear(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(dateStr))
    .toUpperCase();
}

function formatFullDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

// ─── Single ledger row ────────────────────────────────────────────────────────

function LedgerRow({ record }: { record: ServiceRecord }) {
  const t = useTranslations('portal.account');
  const monthYear = formatMonthYear(record.date);
  const fullDate = formatFullDate(record.date);
  const itemsSummary = record.items.slice(0, 3).join(' · ');

  return (
    <tr className="group hover:bg-bg-hover transition-colors">
      {/* Date column */}
      <td className="px-0 py-5 pr-8 align-top whitespace-nowrap">
        <span
          className="font-mono text-sm text-[var(--color-ink-muted)] block"
          title={fullDate}
        >
          {monthYear}
        </span>
      </td>

      {/* Vehicle + operation */}
      <td className="py-5 pr-8 align-top">
        <span className="font-display text-lg italic text-[var(--color-ink)] block leading-snug mb-0.5">
          {record.vehicleName}
        </span>
        <span className="text-sm text-[var(--color-ink-secondary)]">
          {record.type}
          {itemsSummary && ` — ${itemsSummary}`}
        </span>
      </td>

      {/* Status */}
      <td className="py-5 pr-8 align-top whitespace-nowrap hidden md:table-cell">
        <span className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              record.status === 'completed'
                ? 'bg-[var(--color-forest,#1F4D3A)]'
                : 'bg-[var(--color-brass)]'
            }`}
            aria-hidden="true"
          />
          <span
            className={`font-mono text-[10px] uppercase tracking-widest ${
              record.status === 'completed'
                ? 'text-[var(--color-forest,#1F4D3A)]'
                : 'text-[var(--color-brass)]'
            }`}
          >
            {record.status === 'completed'
              ? t('serviceHistory.completed')
              : t('serviceHistory.inProgress')}
          </span>
        </span>
      </td>

      {/* Cost + link */}
      <td className="py-5 align-top text-right">
        <div className="flex flex-col items-end gap-2">
          <PriceDisplay amount={record.cost} size="sm" />
          {record.invoiceUrl ? (
            <a
              href={record.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-ink-muted)] group-hover:text-[var(--color-brass)] transition-colors"
              aria-label={`View service record for ${record.vehicleName}`}
            >
              <FileText className="h-4 w-4" />
            </a>
          ) : (
            <span
              className="text-[var(--color-ink-muted)]/30"
              aria-hidden="true"
            >
              <FileText className="h-4 w-4" />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceHistoryPreview({ records }: ServiceHistoryPreviewProps) {
  const t = useTranslations('portal.account');
  const recent = records.slice(0, 5);

  return (
    <section className="px-6 md:px-12 lg:px-16 py-12">
      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
        <div className="max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-3">
            {t('serviceHistory.eyebrow')}
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] leading-tight">
            {t('serviceHistory.title')}
          </h2>
          <p className="text-sm text-[var(--color-ink-secondary)] mt-2 leading-relaxed">
            {t('serviceHistory.subtitle')}
          </p>
        </div>
        <div className="mt-6 md:mt-0">
          <Link
            href="/service"
            className="font-mono text-[10px] uppercase tracking-widest border border-[var(--color-ink)] px-6 py-2.5 hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            {t('serviceHistory.requestService')}
          </Link>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="font-display text-lg italic text-[var(--color-ink-secondary)] py-8">
          {t('serviceHistory.empty')}
        </p>
      ) : (
        <>
          {/* Ledger table */}
          <div className="border border-line overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-bg-subtle border-b border-line">
                <tr>
                  <th className="px-0 py-3 pr-8 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
                    {t('serviceHistory.colDate')}
                  </th>
                  <th className="py-3 pr-8 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
                    {t('serviceHistory.colVehicleOp')}
                  </th>
                  <th className="py-3 pr-8 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hidden md:table-cell">
                    {t('serviceHistory.colStatus')}
                  </th>
                  <th className="py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] text-right">
                    {t('serviceHistory.colCost')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line px-8">
                {recent.map((r) => (
                  <LedgerRow key={r.id} record={r} />
                ))}
              </tbody>
            </table>
          </div>

          {/* View all */}
          {records.length > 5 && (
            <div className="mt-6 text-right">
              <Link
                href="/vehicles"
                className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4"
              >
                {t('serviceHistory.viewAll')} ({records.length}) →
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
