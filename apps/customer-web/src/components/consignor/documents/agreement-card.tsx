'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import type { ConsignmentAgreement } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgreementCardProps {
  agreement: ConsignmentAgreement;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgreementCard({ agreement }: AgreementCardProps) {
  const t = useTranslations('portal.consignor.documents');

  function handleViewTerms(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    // Toast: PDF download coming soon
    const toast = document.createElement('div');
    toast.textContent = t('pdfComingSoon');
    toast.className = [
      'fixed bottom-6 right-6 z-50',
      'px-5 py-3 border border-[var(--color-brass)]/30 bg-[var(--color-bg-paper,#fdf9f0)]',
      'font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)]',
      'shadow-md',
    ].join(' ');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  return (
    <article className="border border-[var(--color-line)] overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--color-line)] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileText
            className="h-5 w-5 flex-shrink-0 text-[var(--color-brass)] mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h3 className="font-display text-lg text-[var(--color-ink)] leading-snug">
              {agreement.vehicleName}
            </h3>
            {agreement.vehicleVin && (
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mt-0.5">
                VIN · {agreement.vehicleVin}
              </p>
            )}
          </div>
        </div>

        {/* View Terms */}
        <button
          type="button"
          onClick={handleViewTerms}
          className={[
            'flex-shrink-0 font-mono text-[11px] uppercase tracking-widest',
            'text-[var(--color-brass)] hover:underline underline-offset-4 transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
          ].join(' ')}
        >
          {t('viewTerms')} →
        </button>
      </div>

      {/* Details */}
      <div className="px-6 py-5">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Signed date */}
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              Signed
            </dt>
            <dd className="font-mono text-sm text-[var(--color-ink)]">
              {formatDate(agreement.signedDate)}
            </dd>
          </div>

          {/* Duration */}
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              Duration
            </dt>
            <dd className="font-mono text-sm text-[var(--color-ink)]">
              {agreement.durationMonths} months
            </dd>
          </div>

          {/* Fee rate */}
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
              Fee Rate
            </dt>
            <dd className="font-mono text-sm text-[var(--color-brass)]">
              {agreement.feePercentage}%
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
