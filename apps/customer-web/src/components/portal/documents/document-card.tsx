'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Shield, Car, Download, FileCheck } from 'lucide-react';
import type { Document } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentCardProps {
  doc: Document;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(dateStr))
    .toUpperCase();
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const DOC_TYPE_LABELS: Record<Document['type'], string> = {
  rc: 'RC',
  insurance: 'Insurance',
  puc: 'PUC',
  warranty: 'Warranty',
  invoice: 'Invoice',
  'service-record': 'Service Record',
  'purchase-agreement': 'Purchase Agreement',
  'inspection-report': 'Inspection Report',
  'sale-agreement': 'Sale Agreement',
  'custom-build-quote': 'Custom Build Quote',
};

function DocIcon({ type }: { type: Document['type'] }) {
  const cls = 'h-5 w-5 flex-shrink-0 text-accent';
  switch (type) {
    case 'insurance':
      return <Shield className={cls} aria-hidden="true" />;
    case 'rc':
    case 'puc':
      return <Car className={cls} aria-hidden="true" />;
    case 'warranty':
    case 'inspection-report':
      return <FileCheck className={cls} aria-hidden="true" />;
    default:
      return <FileText className={cls} aria-hidden="true" />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentCard({ doc }: DocumentCardProps) {
  const t = useTranslations('portal.documents');

  const uploadedLabel = formatDate(doc.uploadedAt);
  const typeLabel = DOC_TYPE_LABELS[doc.type] ?? doc.type.toUpperCase();

  // Expiry handling
  let expiryBadge: React.ReactNode = null;
  if (doc.expiresAt) {
    const days = daysUntil(doc.expiresAt);
    if (days < 0) {
      expiryBadge = (
        <span className="inline-flex items-center px-2 py-0.5 bg-danger/10 text-danger font-mono text-[10px] uppercase tracking-widest">
          {t('expired')}
        </span>
      );
    } else if (days <= 60) {
      expiryBadge = (
        <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 font-mono text-[10px] uppercase tracking-widest border border-amber-200">
          {t('expiresIn', { days })}
        </span>
      );
    }
  }

  return (
    <div className="flex items-center gap-4 py-4 group">
      {/* Icon */}
      <div className="flex-shrink-0">
        <DocIcon type={doc.type} />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-display text-base text-ink-primary leading-snug truncate">
          {doc.name}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {typeLabel}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            {t('uploadedOn', { date: uploadedLabel })}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            {doc.fileSize}
          </span>
          {expiryBadge}
        </div>
      </div>

      {/* Download */}
      <a
        href={doc.fileUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 p-2 text-ink-muted hover:text-accent transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={`${t('download')} ${doc.name}`}
        title={t('download')}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
