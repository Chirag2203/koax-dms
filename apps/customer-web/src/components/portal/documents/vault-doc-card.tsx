'use client';

/**
 * VaultDocCard — document row in the Documents Vault.
 *
 * Shows: type icon, doc name, category label, uploaded-by, date, file size,
 * expiry chip, download button (triggers purpose prompt).
 *
 * SPEC-PORTAL-DOCS-001 L2: download triggers PurposePromptDialog.
 * No `text-[NNpx]`, no `rounded-lg/xl`. Uses text-xs/sm per UI canon.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Shield,
  Car,
  Download,
  FileCheck,
  FileSignature,
  Wrench,
  Receipt,
} from 'lucide-react';
import type { Document } from '@dms/types';
import type { VaultDocumentView } from '@/src/lib/portal/portal-docs-adapter';
import { ExpiryChip } from './expiry-chip';
import { PurposePromptDialog } from './purpose-prompt-dialog';
import { emitPortalDownloadEvent } from '@/src/lib/portal/portal-docs-adapter';
import type { DownloadPurpose } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultDocCardProps {
  doc: VaultDocumentView;
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
  const cls = 'h-5 w-5 flex-shrink-0';
  switch (type) {
    case 'insurance':
      return <Shield className={`${cls} text-accent`} aria-hidden="true" />;
    case 'rc':
    case 'puc':
      return <Car className={`${cls} text-accent`} aria-hidden="true" />;
    case 'warranty':
    case 'inspection-report':
      return <FileCheck className={`${cls} text-accent`} aria-hidden="true" />;
    case 'sale-agreement':
    case 'purchase-agreement':
      return <FileSignature className={`${cls} text-accent`} aria-hidden="true" />;
    case 'invoice':
      return <Receipt className={`${cls} text-accent`} aria-hidden="true" />;
    case 'service-record':
      return <Wrench className={`${cls} text-accent`} aria-hidden="true" />;
    default:
      return <FileText className={`${cls} text-accent`} aria-hidden="true" />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VaultDocCard({ doc }: VaultDocCardProps) {
  const t = useTranslations('portal.documents');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const downloadLinkRef = React.useRef<HTMLAnchorElement>(null);

  const uploadedLabel = formatDate(doc.uploadedAt);
  const typeLabel = DOC_TYPE_LABELS[doc.type] ?? doc.type.toUpperCase();

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setDialogOpen(true);
  };

  const handlePurposeConfirm = (purpose: DownloadPurpose, purposeNote?: string) => {
    // L2: emit DocumentAccessEvent before triggering download
    emitPortalDownloadEvent(doc.id, doc.vehicleVin, purpose, purposeNote);
    setDialogOpen(false);
    // Trigger the actual download
    downloadLinkRef.current?.click();
  };

  const handleCancel = () => setDialogOpen(false);

  return (
    <>
      <div
        role="listitem"
        className={[
          'flex items-start gap-4 py-4 group',
          doc.expiryStatus !== 'active' ? 'py-5' : '',
        ].join(' ')}
      >
        {/* Type icon */}
        <div
          className="flex-shrink-0 mt-0.5 w-9 h-9 flex items-center justify-center border border-accent/20 bg-accent/5"
          aria-hidden="true"
        >
          <DocIcon type={doc.type} />
        </div>

        {/* Doc name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-base text-ink-primary leading-snug">
              {doc.name}
            </p>
            {doc.isReplaced && (
              <span className="font-mono text-xs text-ink-muted border border-line px-1.5 py-0.5">
                {t('replaced')}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              {typeLabel}
            </span>
            {doc.uploadedBy && (
              <>
                <span className="text-line/60 text-xs" aria-hidden="true">·</span>
                <span className="font-mono text-xs text-ink-muted">
                  {doc.uploadedBy}
                </span>
              </>
            )}
            <span className="text-line/60 text-xs" aria-hidden="true">·</span>
            <span className="font-mono text-xs text-ink-muted">
              {t('uploadedOn', { date: uploadedLabel })}
            </span>
            <span className="text-line/60 text-xs" aria-hidden="true">·</span>
            <span className="font-mono text-xs text-ink-muted">
              {doc.fileSize}
            </span>
          </div>

          {/* Expiry chip — separate row so it doesn't wrap mid-meta */}
          {doc.expiryStatus !== 'active' && (
            <div className="mt-2">
              <ExpiryChip status={doc.expiryStatus} daysUntilExpiry={doc.daysUntilExpiry} />
            </div>
          )}
        </div>

        {/* Download trigger (visible button — actual anchor hidden) */}
        <button
          type="button"
          onClick={handleDownloadClick}
          className="flex-shrink-0 p-2 text-ink-muted hover:text-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={`${t('download')} ${doc.name}`}
          title={t('download')}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Hidden anchor that does the real download after purpose selection */}
        <a
          ref={downloadLinkRef}
          href={doc.fileUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        >
          {doc.name}
        </a>
      </div>

      {/* DPDP purpose prompt dialog */}
      <PurposePromptDialog
        isOpen={dialogOpen}
        documentName={doc.name}
        onConfirm={handlePurposeConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
