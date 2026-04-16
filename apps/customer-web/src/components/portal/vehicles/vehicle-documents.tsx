'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Download } from 'lucide-react';
import type { Document } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function isExpiringSoon(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days60 = 60 * 24 * 60 * 60 * 1000;
  return diff > 0 && diff <= days60;
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VehicleDocumentsProps {
  documents: Document[];
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocumentRow({ doc }: { doc: Document }) {
  const t = useTranslations('portal.vehicles');
  const expiring = isExpiringSoon(doc.expiresAt);
  const expired = isExpired(doc.expiresAt);

  return (
    <div className="flex items-start gap-4 py-5 group">
      {/* Icon */}
      <div
        className="flex-shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center border border-[var(--color-brass)]/30 bg-[var(--color-brass)]/5"
        aria-hidden="true"
      >
        <FileText className="h-4 w-4 text-[var(--color-brass)]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display text-base text-[var(--color-ink)] leading-snug mb-0.5">
          {doc.name}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {/* Upload date */}
          <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
            {t('uploadedOn')} {formatDate(doc.uploadedAt)}
          </span>

          {/* File size */}
          <span
            className="font-mono text-[11px] text-[var(--color-ink-muted)]"
            aria-label={`File size: ${doc.fileSize}`}
          >
            {doc.fileSize}
          </span>

          {/* Expiry badge */}
          {(expiring || expired) && doc.expiresAt && (
            <span
              className={`inline-flex font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 ${
                expired
                  ? 'bg-red-100 text-red-700'
                  : 'bg-[var(--color-warning,#f59e0b)]/10 text-[var(--color-warning,#b45309)]'
              }`}
            >
              {t('expires', { date: formatDate(doc.expiresAt) })}
            </span>
          )}
        </div>
      </div>

      {/* Download button */}
      <a
        href={doc.fileUrl}
        download
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-[var(--color-ink-muted)] hover:text-[var(--color-brass)] hover:border-[var(--color-brass)]/40 border border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        aria-label={`Download ${doc.name}`}
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleDocuments({ documents }: VehicleDocumentsProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <section
      id="documents"
      className="px-6 md:px-12 lg:px-16 py-12 border-t border-[var(--color-line)]"
    >
      {/* Header */}
      <h2 className="font-display text-2xl md:text-3xl text-[var(--color-ink)] mb-8">
        {t('documents')}
      </h2>

      {documents.length === 0 ? (
        <p className="font-display text-lg italic text-[var(--color-ink-secondary)] py-8">
          {t('noDocuments')}
        </p>
      ) : (
        <div
          className="divide-y divide-[var(--color-line)]"
          role="list"
          aria-label={t('documents')}
        >
          {documents.map((doc) => (
            <div key={doc.id} role="listitem">
              <DocumentRow doc={doc} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
