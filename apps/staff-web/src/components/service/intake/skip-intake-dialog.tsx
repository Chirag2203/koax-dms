'use client';

/**
 * SkipIntakeDialog — R19/R24 override to skip intake inspection.
 *
 * SC-8b / L9: Captures a typed reason (≥20 chars) from the R19/R24 actor before
 *   invoking recordIntakeSkipped. The reason text is stored in the intake_skipped
 *   audit event — it must be genuine, not hardcoded. CPA-2019 audit-trail contract.
 *
 * PRE-FLIGHT CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 *   - Card + Field NOT used (single-purpose dialog, not a detail card)
 *   - text-xs / text-sm only — NO text-[NNpx]
 *   - rounded-md only (Dialog primitive handles its own rounding)
 *   - No inline hasRank — Gate is used by the caller (IntakeTabContent)
 *   - i18n keys under serviceIntake.skip.* in both en-IN.json + hi-IN.json
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/src/components/primitives/dialog';

const MIN_REASON_LENGTH = 20;

interface SkipIntakeDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the user-typed reason text once confirmed */
  onConfirm: (reason: string) => void;
}

export function SkipIntakeDialog({ open, onClose, onConfirm }: SkipIntakeDialogProps) {
  const t = useTranslations('serviceIntake.skip');
  const [reason, setReason] = useState('');

  function handleClose() {
    setReason('');
    onClose();
  }

  function handleConfirm() {
    if (reason.trim().length < MIN_REASON_LENGTH) return;
    const captured = reason.trim();
    setReason('');
    onConfirm(captured);
  }

  const isValid = reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('dialogTitle')}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            title={isValid ? undefined : t('confirmButtonDisabledTitle')}
            className="inline-flex items-center h-9 px-4 rounded-md bg-[rgb(var(--state-danger))] text-white text-sm font-medium hover:bg-[rgb(var(--state-danger)/0.9)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--state-danger))] focus-visible:ring-offset-2"
          >
            {t('confirmButton')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warning notice */}
        <div
          className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-danger)/0.08)] border border-[rgb(var(--state-danger)/0.3)]"
          role="alert"
        >
          <AlertTriangle size={16} className="text-[rgb(var(--state-danger))] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-ink-primary">{t('warningBody')}</p>
        </div>

        {/* Reason textarea */}
        <div className="space-y-1.5">
          <label
            htmlFor="skip-reason"
            className="block text-sm font-medium text-ink-primary"
          >
            {t('reasonLabel')}
          </label>
          <textarea
            id="skip-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
            rows={4}
            className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {/* Live char count */}
          <p
            className={`text-xs ${isValid ? 'text-ink-muted' : 'text-[rgb(var(--state-danger))]'}`}
            aria-live="polite"
          >
            {t('reasonCharCount', { count: reason.trim().length })}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
