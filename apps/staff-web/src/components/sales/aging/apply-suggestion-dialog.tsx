'use client';

/**
 * ApplySuggestionDialog — AlertDialog for applying a price drop suggestion.
 *
 * R10+ gate enforced by parent (Gate primitive). This dialog is only reachable
 * when the user has passed the gate check.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001 §7
 * L6: R10+ gate (enforced in parent via Gate; also enforced in store action)
 * L11: emits PRICE_CHANGED with source='AGING_SUGGESTION'
 *
 * PRE-FLIGHT: uses AlertDialog from primitives, text-xs/sm only, rounded-md.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import type { AgedListingRow } from '@/src/lib/sales/aging/selectors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupee(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ApplySuggestionDialogProps {
  row: AgedListingRow;
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplySuggestionDialog({ row, open, onClose }: ApplySuggestionDialogProps) {
  const t = useTranslations('inventoryAging');
  const { user } = useStaffAuth();
  const { toast } = useToast();
  const applySuggestedPriceDrop = useVehiclesStore((s) => s.applySuggestedPriceDrop);

  const [reasonText, setReasonText] = useState('');
  const canConfirm = reasonText.trim().length > 0;

  function handleConfirm() {
    if (!user) return;
    if (!canConfirm) return;

    try {
      applySuggestedPriceDrop(
        row.vin,
        row.suggestedPrice,
        reasonText.trim(),
        { id: user.id, name: user.name, role: user.role },
      );
      toast(
        t('applySuccess', { vin: row.vin.slice(-8), price: formatRupee(row.suggestedPrice) }),
        'success',
      );
      onClose();
      setReasonText('');
    } catch (err) {
      toast(err instanceof Error ? err.message : t('applyError'), 'error');
    }
  }

  function handleClose() {
    setReasonText('');
    onClose();
  }

  return (
    <>
      {/* Custom dialog with textarea — AlertDialog doesn't support body slots,
          so we render manually using the AlertDialog styling pattern */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={handleClose}
          />

          {/* Modal */}
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="apply-dialog-title"
            aria-describedby="apply-dialog-desc"
            className={cn(
              'relative bg-bg-surface border border-line-strong rounded-md shadow-xl w-full max-w-[520px]',
              'flex flex-col',
            )}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 id="apply-dialog-title" className="text-base font-semibold text-ink-primary">
                {t('applyDialogTitle')}
              </h2>
              <p id="apply-dialog-desc" className="mt-1 text-sm text-ink-secondary">
                {t('applyDialogDesc', {
                  vehicle: row.vehicleName,
                  currentPrice: formatRupee(row.currentPrice),
                  newPrice: formatRupee(row.suggestedPrice),
                  drop: formatRupee(row.suggestedDrop),
                })}
              </p>
            </div>

            {/* Summary row */}
            <div className="px-6 pb-4">
              <div className="rounded-md border border-line bg-bg-subtle px-4 py-3 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-ink-muted">{t('currentPriceLabel')}</p>
                  <p className="text-sm font-semibold text-ink-primary mt-0.5 font-mono tabular-nums">
                    {formatRupee(row.currentPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">{t('suggestedDropLabel')}</p>
                  <p className="text-sm font-semibold text-state-danger mt-0.5 font-mono tabular-nums">
                    -{formatRupee(row.suggestedDrop)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">{t('newPriceLabel')}</p>
                  <p className="text-sm font-semibold text-accent mt-0.5 font-mono tabular-nums">
                    {formatRupee(row.suggestedPrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason textarea */}
            <div className="px-6 pb-4">
              <label
                htmlFor="apply-reason"
                className="block text-xs font-medium text-ink-primary mb-1.5"
              >
                {t('reasonLabel')}
                <span className="text-state-danger ml-0.5" aria-hidden="true">*</span>
              </label>
              <textarea
                id="apply-reason"
                rows={3}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                className={cn(
                  'w-full bg-bg-subtle border border-line rounded-md px-3 py-2',
                  'text-sm text-ink-primary placeholder:text-ink-muted',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  'resize-none',
                )}
              />
              {!canConfirm && reasonText.length === 0 && (
                <p className="text-xs text-ink-muted mt-1">{t('reasonRequired')}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
                  'bg-accent hover:bg-accent/90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {t('applyConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
