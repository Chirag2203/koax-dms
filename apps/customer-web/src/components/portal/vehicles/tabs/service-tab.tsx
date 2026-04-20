'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import type { ServiceRecordView } from '@/src/lib/portal/portal-vehicle-adapter';

function formatCost(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km) + ' km';
}

interface ServiceRecordRowProps {
  record: ServiceRecordView;
}

function ServiceRecordRow({ record }: ServiceRecordRowProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <div className="grid grid-cols-[96px_1fr] gap-6 py-7 group">
      {/* Date column */}
      <div className="pt-1">
        <span className="font-mono text-sm text-ink-muted block leading-tight">
          {record.dateMonthYear}
        </span>
        <span className="font-mono text-[10px] text-ink-muted/60 mt-1 block">
          {formatKm(record.km)}
        </span>
      </div>

      {/* Main content */}
      <div>
        {/* Status + type */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${
                  record.status === 'completed' ? 'bg-success' : 'bg-accent'
                }`}
                aria-hidden="true"
              />
              <h3 className="font-display text-base text-ink-primary leading-snug line-clamp-2">
                {record.type}
              </h3>
            </div>
          </div>
          <span className="font-mono text-sm text-ink-primary shrink-0 pt-0.5">
            {formatCost(record.cost)}
          </span>
        </div>

        {/* Items */}
        {record.items.length > 0 && (
          <p className="text-sm text-ink-secondary leading-relaxed ml-3.5 mb-3 line-clamp-2">
            {record.items.join(', ')}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between ml-3.5">
          <span className="font-mono text-[10px] text-ink-muted">
            {record.technicianDisplayName}
          </span>
          {record.invoiceUrl && (
            <a
              href={record.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-accent hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

interface ServiceTabProps {
  records: ServiceRecordView[];
  earlierCount: number;
}

export function ServiceTab({ records, earlierCount }: ServiceTabProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <div>
      {records.length === 0 ? (
        <p className="font-display text-lg italic text-ink-secondary py-8">
          {t('noRecords')}
        </p>
      ) : (
        <div className="divide-y divide-line" role="list" aria-label={t('serviceHistory')}>
          {records.map((record) => (
            <div key={record.id} role="listitem">
              <ServiceRecordRow record={record} />
            </div>
          ))}
        </div>
      )}

      {/* Earlier history footer */}
      {earlierCount > 0 && (
        <div className="mt-6 pt-6 border-t border-line">
          <p className="font-mono text-[11px] text-ink-muted">
            {t('earlierHistory', { count: earlierCount })}
          </p>
        </div>
      )}
    </div>
  );
}
