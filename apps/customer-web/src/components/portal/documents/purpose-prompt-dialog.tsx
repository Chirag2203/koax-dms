'use client';

/**
 * PurposePromptDialog — DPDP purpose selection before download.
 *
 * SPEC-PORTAL-DOCS-001 L2, L3:
 * - Every download triggers this dialog BEFORE the file is served.
 * - 4 purpose options: CUSTOMER_HANDOFF, RTO_FILING, AUDIT, OTHER.
 * - 'OTHER' reveals an optional free-text field (purposeNote).
 * - Cancelling closes with no download, no event emitted.
 * - Confirming calls onConfirm(purpose, note) which triggers download + event.
 *
 * No new deps — plain React state + focus trap via autofocus.
 * No rounded-lg/xl per UI canon (rounded-md only).
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { X, Shield } from 'lucide-react';
import type { DownloadPurpose } from '@dms/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PurposePromptDialogProps {
  isOpen: boolean;
  documentName: string;
  onConfirm: (purpose: DownloadPurpose, purposeNote?: string) => void;
  onCancel: () => void;
}

interface PurposeOption {
  value: DownloadPurpose;
  labelKey: string;
}

const PURPOSE_OPTIONS: PurposeOption[] = [
  { value: 'CUSTOMER_HANDOFF', labelKey: 'purposeCustomerHandoff' },
  { value: 'RTO_FILING',       labelKey: 'purposeRtoFiling' },
  { value: 'AUDIT',            labelKey: 'purposeAudit' },
  { value: 'OTHER',            labelKey: 'purposeOther' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PurposePromptDialog({
  isOpen,
  documentName,
  onConfirm,
  onCancel,
}: PurposePromptDialogProps) {
  const t = useTranslations('portal.documents');

  const [selectedPurpose, setSelectedPurpose] = React.useState<DownloadPurpose | null>(null);
  const [purposeNote, setPurposeNote] = React.useState('');

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedPurpose(null);
      setPurposeNote('');
    }
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  const handleConfirm = () => {
    if (!selectedPurpose) return;
    onConfirm(selectedPurpose, selectedPurpose === 'OTHER' && purposeNote.trim() ? purposeNote.trim() : undefined);
  };

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="purpose-dialog-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Panel */}
      <div className="w-full max-w-md bg-bg-base border border-line shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent mb-0.5">
                {t('purposeDialogEyebrow')}
              </p>
              <h2
                id="purpose-dialog-title"
                className="font-display text-lg text-ink-primary leading-snug"
              >
                {t('purposeDialogTitle')}
              </h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 p-1 text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={t('cancel')}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Document name */}
          <p className="font-display text-sm text-ink-secondary mb-1 truncate">
            {documentName}
          </p>
          <p className="text-sm text-ink-muted leading-relaxed mb-5">
            {t('purposeDialogSubtitle')}
          </p>

          {/* Purpose options */}
          <fieldset>
            <legend className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-3">
              {t('purposeDialogChoose')}
            </legend>
            <div className="space-y-2.5">
              {PURPOSE_OPTIONS.map(({ value, labelKey }) => (
                <label
                  key={value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="download-purpose"
                    value={value}
                    checked={selectedPurpose === value}
                    onChange={() => setSelectedPurpose(value)}
                    className="h-4 w-4 text-accent border-line focus:ring-accent focus:ring-offset-0"
                  />
                  <span className="text-sm text-ink-secondary group-hover:text-ink-primary transition-colors">
                    {t(labelKey as keyof object)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Optional note for OTHER */}
          {selectedPurpose === 'OTHER' && (
            <div className="mt-4">
              <label
                htmlFor="purpose-note"
                className="block font-mono text-xs uppercase tracking-widest text-ink-muted mb-1.5"
              >
                {t('purposeNoteLabel')}
              </label>
              <textarea
                id="purpose-note"
                value={purposeNote}
                onChange={(e) => setPurposeNote(e.target.value)}
                placeholder={t('purposeNotePlaceholder')}
                rows={2}
                className="w-full border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          )}

          {/* DPDP notice */}
          <p className="mt-4 text-xs text-ink-muted leading-relaxed">
            {t('purposeDialogDpdpNotice')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="font-mono text-xs uppercase tracking-widest text-ink-muted hover:text-ink-primary transition-colors px-4 py-2 border border-transparent hover:border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPurpose}
            className={[
              'font-mono text-xs uppercase tracking-widest px-5 py-2',
              'border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'transition-colors',
              selectedPurpose
                ? 'bg-accent text-bg-base border-accent hover:bg-accent/90'
                : 'bg-bg-subtle text-ink-muted border-line cursor-not-allowed',
            ].join(' ')}
          >
            {t('purposeConfirmDownload')}
          </button>
        </div>
      </div>
    </div>
  );
}
