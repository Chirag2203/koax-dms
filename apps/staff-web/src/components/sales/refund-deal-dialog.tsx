'use client';

/**
 * RefundDealDialog — captures refund details before reversing a sale.
 * Requires type-to-confirm "REFUND" before enabling the destructive action.
 *
 * W3.3 / SPEC-SALES-001 §14 / L_S-REFUND-1
 *
 * PRE-FLIGHT CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 *   - Card + Field imported from custom-builds/shared/detail-card — NOT redefined locally
 *   - text-xs / text-sm only — NO text-[NNpx]
 *   - rounded-md only (Dialog primitive handles its own rounding)
 *   - Gate primitive used for RBAC (caller is responsible; dialog accepts props only)
 *   - i18n keys under salesDeals.refund.* in both en-IN.json + hi-IN.json
 *
 * RBAC: This dialog is only rendered when the actor has R12+. The caller
 *   wraps the CTA in <Gate role={['R12','R19','R22','R24']}>. Inside the
 *   dialog itself, no hasRank check is needed — Gate enforces at the call-site.
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/src/components/primitives/dialog';
import type { RefundCategory } from '@dms/types';

const MIN_REASON_LENGTH = 30;
const TYPE_TO_CONFIRM = 'REFUND';

const REFUND_CATEGORIES: { value: RefundCategory; labelKey: string }[] = [
  { value: 'DOA', labelKey: 'categoryDoa' },
  { value: 'FINANCE_REJECTED', labelKey: 'categoryFinanceRejected' },
  { value: 'CUSTOMER_REMORSE', labelKey: 'categoryCustomerRemorse' },
  { value: 'VEHICLE_DEFECT', labelKey: 'categoryVehicleDefect' },
  { value: 'OTHER', labelKey: 'categoryOther' },
];

export interface RefundDealDialogProps {
  open: boolean;
  dealId: string;
  customerName: string;
  vehicleName?: string;
  saleAmount: number;
  onClose: () => void;
  /** Called with validated data once user confirms */
  onConfirm: (data: {
    category: RefundCategory;
    reason: string;
    refundedAmount: number;
  }) => void;
}

const INR_FORMATTER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function RefundDealDialog({
  open,
  dealId: _dealId,
  customerName,
  vehicleName,
  saleAmount,
  onClose,
  onConfirm,
}: RefundDealDialogProps) {
  const t = useTranslations('salesDeals.refund');
  const [category, setCategory] = useState<RefundCategory | ''>('');
  const [reason, setReason] = useState('');
  const [refundedAmount, setRefundedAmount] = useState<string>(String(saleAmount));
  const [typeConfirm, setTypeConfirm] = useState('');

  function resetForm() {
    setCategory('');
    setReason('');
    setRefundedAmount(String(saleAmount));
    setTypeConfirm('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  const amountValid = !isNaN(Number(refundedAmount)) && Number(refundedAmount) >= 0;
  const confirmTyped = typeConfirm === TYPE_TO_CONFIRM;
  const isValid = category !== '' && reasonValid && amountValid && confirmTyped;

  function handleConfirm() {
    if (!isValid || !category) return;
    const data = {
      category: category as RefundCategory,
      reason: reason.trim(),
      refundedAmount: Number(refundedAmount),
    };
    resetForm();
    onConfirm(data);
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('dialogTitle')}
      size="md"
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
        {/* Warning banner */}
        <div
          className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-danger)/0.08)] border border-[rgb(var(--state-danger)/0.3)]"
          role="alert"
        >
          <AlertTriangle
            size={16}
            className="text-[rgb(var(--state-danger))] flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink-primary">{t('warningTitle')}</p>
            <p className="text-xs text-ink-muted">{t('warningBody')}</p>
          </div>
        </div>

        {/* Deal summary */}
        <div className="p-3 rounded-md border border-line bg-bg-subtle space-y-1">
          <p className="text-xs text-ink-muted">{t('dealSummaryLabel')}</p>
          <p className="text-sm font-medium text-ink-primary">{customerName}</p>
          {vehicleName && (
            <p className="text-xs text-ink-muted">{vehicleName}</p>
          )}
          <p className="text-sm font-mono text-ink-primary">
            ₹{INR_FORMATTER.format(saleAmount)}
          </p>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label htmlFor="refund-category" className="block text-sm font-medium text-ink-primary">
            {t('categoryLabel')} <span className="text-[rgb(var(--state-danger))]">*</span>
          </label>
          <select
            id="refund-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RefundCategory | '')}
            className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="" disabled>
              {t('categoryPlaceholder')}
            </option>
            {REFUND_CATEGORIES.map(({ value, labelKey }) => (
              <option key={value} value={value}>
                {t(labelKey as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label htmlFor="refund-reason" className="block text-sm font-medium text-ink-primary">
            {t('reasonLabel')} <span className="text-[rgb(var(--state-danger))]">*</span>
          </label>
          <textarea
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
            rows={3}
            className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <p
            className={`text-xs ${
              reasonValid ? 'text-ink-muted' : 'text-[rgb(var(--state-danger))]'
            }`}
            aria-live="polite"
          >
            {t('reasonCharCount', { count: reason.trim().length, min: MIN_REASON_LENGTH })}
          </p>
        </div>

        {/* Refunded amount */}
        <div className="space-y-1.5">
          <label htmlFor="refund-amount" className="block text-sm font-medium text-ink-primary">
            {t('amountLabel')} <span className="text-[rgb(var(--state-danger))]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted font-mono">
              ₹
            </span>
            <input
              id="refund-amount"
              type="number"
              min={0}
              step={1000}
              value={refundedAmount}
              onChange={(e) => setRefundedAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 rounded-md border border-line bg-bg-surface text-sm font-mono text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
        </div>

        {/* TCS notice (CLAUDE.md §9 — India regulatory note) */}
        <div className="p-3 rounded-md border border-line bg-bg-subtle">
          <p className="text-xs text-ink-muted">{t('tcsNotice')}</p>
        </div>

        {/* Type-to-confirm (CLAUDE.md §17 destructive-action rule) */}
        <div className="space-y-1.5">
          <label htmlFor="refund-confirm" className="block text-sm font-medium text-ink-primary">
            {t('typeConfirmLabel', { word: TYPE_TO_CONFIRM })}
          </label>
          <input
            id="refund-confirm"
            type="text"
            value={typeConfirm}
            onChange={(e) => setTypeConfirm(e.target.value)}
            placeholder={TYPE_TO_CONFIRM}
            autoComplete="off"
            className="w-full rounded-md border border-line bg-bg-surface px-3 py-2 text-sm font-mono text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {typeConfirm.length > 0 && !confirmTyped && (
            <p className="text-xs text-[rgb(var(--state-danger))]" aria-live="polite">
              {t('typeConfirmMismatch', { word: TYPE_TO_CONFIRM })}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
