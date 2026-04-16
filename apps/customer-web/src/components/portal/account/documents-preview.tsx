'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileText, Download, Lock } from 'lucide-react';
import type { Document } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentsPreviewProps {
  documents: Document[];
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

function groupByVehicle(documents: Document[]): Map<string, Document[]> {
  const map = new Map<string, Document[]>();
  for (const doc of documents) {
    const key = `${doc.vehicleVin}__${doc.vehicleName}`;
    const existing = map.get(key) ?? [];
    map.set(key, [...existing, doc]);
  }
  return map;
}

const DOC_TYPE_LABELS: Record<Document['type'], string> = {
  rc: 'Registration Certificate',
  insurance: 'Insurance Policy',
  puc: 'PUC Certificate',
  warranty: 'Warranty Document',
  invoice: 'Purchase Invoice',
  'service-record': 'Service Record',
  'purchase-agreement': 'Purchase Agreement',
  'inspection-report': 'Inspection Report',
};

// ─── Single document row ──────────────────────────────────────────────────────

function DocumentRow({ doc }: { doc: Document }) {
  return (
    <div className="flex items-center justify-between py-3.5 first:pt-0 group">
      {/* Icon + name */}
      <div className="flex items-center gap-3 min-w-0">
        <FileText
          className="h-4 w-4 flex-shrink-0 text-ink-muted group-hover:text-accent transition-colors"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-display text-base text-ink-primary leading-snug truncate">
            {doc.name || DOC_TYPE_LABELS[doc.type] || doc.type}
          </p>
          <p className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mt-0.5">
            {formatDate(doc.uploadedAt)} · {doc.fileSize}
          </p>
        </div>
      </div>

      {/* Download */}
      <a
        href={doc.fileUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 ml-4 p-1.5 text-ink-muted hover:text-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={`Download ${doc.name || DOC_TYPE_LABELS[doc.type]}`}
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsPreview({ documents }: DocumentsPreviewProps) {
  const t = useTranslations('portal.account');
  const recent = documents.slice(0, 6);
  const grouped = groupByVehicle(recent);

  return (
    <section className="px-6 md:px-12 lg:px-16 py-12">
      <div className="grid grid-cols-12 gap-8 md:gap-12">
        {/* Left: heading + vault notice */}
        <div className="col-span-12 md:col-span-4">
          <h2 className="font-display text-2xl md:text-3xl text-ink-primary mb-4">
            {t('documents.title')}
          </h2>
          <p className="text-sm text-ink-secondary leading-relaxed mb-8">
            {t('documents.subtitle')}
          </p>

          {/* Vault status */}
          <div className="p-5 bg-bg-subtle border border-line/40 flex items-center gap-3">
            <Lock
              className="h-5 w-5 text-accent flex-shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">
                {t('documents.vaultLabel')}
              </p>
              <p className="text-sm font-medium text-ink-primary">
                {t('documents.vaultStatus')}
              </p>
            </div>
          </div>

          {documents.length > 6 && (
            <div className="mt-6">
              <Link
                href="/documents"
                className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline underline-offset-4"
              >
                {t('documents.viewAll')} →
              </Link>
            </div>
          )}
        </div>

        {/* Right: document list grouped by vehicle */}
        <div className="col-span-12 md:col-span-8">
          {documents.length === 0 ? (
            <p className="font-display text-lg italic text-ink-secondary py-8">
              {t('documents.empty')}
            </p>
          ) : (
            <div className="space-y-10">
              {Array.from(grouped.entries()).map(([key, docs]) => {
                const vehicleName = key.split('__')[1] ?? key;
                return (
                  <div key={key}>
                    {/* Vehicle header */}
                    <h3 className="font-display text-lg text-ink-primary mb-3 pb-2 border-b border-line">
                      {vehicleName}
                    </h3>

                    {/* Document rows */}
                    <div className="divide-y divide-line">
                      {docs.map((doc) => (
                        <DocumentRow key={doc.id} doc={doc} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
