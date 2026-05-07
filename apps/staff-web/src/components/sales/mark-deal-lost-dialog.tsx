'use client';

/**
 * MarkDealLostDialog — captures structured lost reason before transitioning
 * a deal to stage='lost'.
 *
 * W3.2 / SPEC-SALES-001 §13 / L_S-LOST-1
 *
 * PRE-FLIGHT CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 *   - Card + Field imported from custom-builds/shared/detail-card — NOT redefined locally
 *   - text-xs / text-sm only — NO text-[NNpx]
 *   - rounded-md only (Dialog primitive handles its own rounding)
 *   - No inline hasRank — not applicable here (any role can mark lost)
 *   - i18n keys under salesDeals.markLost.* in both en-IN.json + hi-IN.json
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/src/components/primitives/dialog';
import type { LostReasonCategory } from '@dms/types';

const MIN_FREE_TEXT = 10;

// L_S-LOST-1: category options for the select/radio
const LOST_REASON_CATEGORIES: { value: LostReasonCategory; labelKey: string }[] = [
  { value: 'PRICE_TOO_HIGH', labelKey: 'categoryPriceTooHigh' },
  { value: 'CHOSE_COMPETITOR', labelKey: 'categoryChoseCompetitor' },
  { value: 'FINANCING_FALLTHROUGH', labelKey: 'categoryFinancingFallthrough' },
  { value: 'CHANGED_MIND', labelKey: 'categoryChangedMind' },
  { value: 'VEHICLE_ISSUE', labelKey: 'categoryVehicleIssue' },
  { value: 'TIMING', labelKey: 'categoryTiming' },
  { value: 'OTHER', labelKey: 'categoryOther' },
];

export interface MarkDealLostDialogProps {
  open: boolean;
  dealId: string;
  customerName: string;
  onClose: () => void;
  /** Called with validated data once user confirms */
  onConfirm: (data: {
    category: LostReasonCategory;
    freeText?: string;
  }) => void;
}

export function MarkDealLostDialog({
  open,
  dealId: _dealId,
  customerName,
  onClose,
  onConfirm,
}: MarkDealLostDialogProps) {
  const t = useTranslations('salesDeals.markLost');
  const [category, setCategory] = useState<LostReasonCategory | ''>('');
  const [freeText, setFreeText] = useState('');

  function handleClose() {
    setCategory('');
    setFreeText('');
    onClose();
  }

  const needsFreeText = category === 'OTHER';
  const freeTextValid = !needsFreeText || freeText.trim().length >= MIN_FREE_TEXT;
  const isValid = category !== '' && freeTextValid;

  function handleConfirm() {
    if (!isValid || !category) return;
    const data = {
      category: category as LostReasonCategory,
      freeText: freeText.trim() || undefined,
    };
    setCategory('');
    setFreeText('');
    onConfirm(data);
  }

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
            title={!isValid ? t('confirmButtonDisabledTitle') : undefined}
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
          <AlertTriangle
            size={16}
            className="text-[rgb(var(--state-danger))] flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-ink-primary">
            {t('warningBody', { name: customerName })}
          </p>
        </div>

        {/* Category select */}
        <div className="space-y-1.5">
          <label htmlFor="lost-category" className="block text-sm font-medium text-ink-primary">
            {t('categoryLabel')} <span className="text-[rgb(var(--state-danger))]">*</span>
          </label>
          <select
            id="lost-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as LostReasonCategory | '')}
            className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="" disabled>
              {t('categoryPlaceholder')}
            </option>
            {LOST_REASON_CATEGORIES.map(({ value, labelKey }) => (
              <option key={value} value={value}>
                {t(labelKey as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        {/* Free-text — required for OTHER, optional for others */}
        <div className="space-y-1.5">
          <label htmlFor="lost-freetext" className="block text-sm font-medium text-ink-primary">
            {needsFreeText ? (
              <>
                {t('freeTextLabelRequired')}
                <span className="text-[rgb(var(--state-danger))]"> *</span>
              </>
            ) : (
              t('freeTextLabelOptional')
            )}
          </label>
          <textarea
            id="lost-freetext"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder={needsFreeText ? t('freeTextPlaceholderRequired') : t('freeTextPlaceholderOptional')}
            rows={3}
            className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {needsFreeText && (
            <p
              className={`text-xs ${
                freeText.trim().length >= MIN_FREE_TEXT
                  ? 'text-ink-muted'
                  : 'text-[rgb(var(--state-danger))]'
              }`}
              aria-live="polite"
            >
              {t('freeTextCharCount', {
                count: freeText.trim().length,
                min: MIN_FREE_TEXT,
              })}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
