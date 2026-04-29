/**
 * Mark vendor invoice paid dialog — SPEC-FINANCE-001 §1.3
 *
 * L8: R22+ mark paid. Type-to-confirm 'PAY' per DoD §17.
 * L22: Approval must exist before payment.
 * SPEC-ARCH-UI-001 §Dialog, type-to-confirm pattern.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, Gate } from '@/src/components/primitives';
import { INRAmount } from '../shared/inr-amount';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import type { VendorInvoice } from '@dms/types';

const CONFIRM_WORD = 'PAY';

interface MarkPaidDialogProps {
  invoice: VendorInvoice;
  open: boolean;
  onClose: () => void;
}

export function MarkPaidDialog({ invoice, open, onClose }: MarkPaidDialogProps) {
  const t = useTranslations('finance.vendorInvoices');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const markVendorInvoicePaid = useFinanceStore((s) => s.markVendorInvoicePaid);

  const [paymentRef, setPaymentRef] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [paymentRefTouched, setPaymentRefTouched] = useState(false);

  const paymentRefValid = paymentRef.trim().length >= 4;
  const paymentRefError = paymentRefTouched && !paymentRefValid ? t('paymentRefRequired') : null;

  // DoD §17: type-to-confirm 'PAY' for permanent/financial action
  const confirmed = confirmWord === CONFIRM_WORD;
  const canSubmit = paymentRefValid && confirmed;

  const handlePay = () => {
    if (!user || !canSubmit) { setPaymentRefTouched(true); return; }
    try {
      markVendorInvoicePaid(invoice.id, paymentRef.trim(), {
        id: user.id,
        name: user.name,
        role: user.role,
      });
      toast(t('markPaidSuccess'), 'success');
      handleClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('markPaidError'), 'error');
    }
  };

  const handleClose = () => {
    setPaymentRef('');
    setConfirmWord('');
    setPaymentRefTouched(false);
    onClose();
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* L8: R22+ only */}
      <Gate role={['R22', 'R24']} fallback="hide">
        <Dialog
          open={open}
          onClose={handleClose}
          title={t('markPaidTitle')}
          subtitle={`${invoice.invoiceNumber} · ${invoice.vendorName}`}
          size="sm"
          dirty={paymentRef.length > 0 || confirmWord.length > 0}
          footer={
            <>
              <button
                type="button"
                onClick={handleClose}
                className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={!canSubmit}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
              >
                {t('markPaidConfirm')}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Amount summary */}
            <div className="rounded-md border border-line bg-bg-subtle p-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('totalWithGst')}</span>
                <INRAmount
                  paise={invoice.totalAmountPaise + invoice.totalGstPaise}
                  className="text-base font-semibold text-ink-primary"
                />
              </div>
              {invoice.approvedAt && (
                <p className="text-xs text-ink-muted mt-2">
                  {t('approvedOn')} {new Date(invoice.approvedAt).toLocaleDateString('en-IN')}
                  {invoice.approvedBy && ` ${t('by')} ${invoice.approvedBy}`}
                </p>
              )}
            </div>

            {/* Payment reference */}
            <div>
              <label
                htmlFor="payment-ref"
                className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
              >
                {t('paymentRef')} *
              </label>
              <input
                id="payment-ref"
                type="text"
                value={paymentRef}
                onChange={(e) => { setPaymentRef(e.target.value); setPaymentRefTouched(true); }}
                placeholder={t('paymentRefPlaceholder')}
                className={[
                  'w-full rounded-md border bg-bg-subtle px-3 py-2 text-sm text-ink-primary',
                  'placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent',
                  paymentRefError ? 'border-[rgb(var(--state-overdue))]' : 'border-line focus:border-accent',
                ].join(' ')}
              />
              {paymentRefError && (
                <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{paymentRefError}</p>
              )}
              <p className="text-xs text-ink-muted mt-1">{t('paymentRefHint')}</p>
            </div>

            {/* Type-to-confirm — DoD §17 */}
            <div>
              <label
                htmlFor="confirm-pay"
                className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
              >
                {t('typeToConfirm', { word: CONFIRM_WORD })}
              </label>
              <input
                id="confirm-pay"
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
                placeholder={CONFIRM_WORD}
                className={[
                  'w-full rounded-md border bg-bg-subtle px-3 py-2 text-sm font-mono text-ink-primary',
                  'placeholder:text-ink-muted focus:outline-none focus:ring-1',
                  confirmed
                    ? 'border-[rgb(var(--state-listed))] focus:ring-[rgb(var(--state-listed))]'
                    : 'border-line focus:border-accent focus:ring-accent',
                ].join(' ')}
              />
            </div>
          </div>
        </Dialog>
      </Gate>
    </>
  );
}
