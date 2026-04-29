/**
 * Approve vendor invoice dialog — SPEC-FINANCE-001 §1.3
 *
 * L8: R12+ approve. Approval is non-reversible (L22).
 * L22: Non-reversible — we show a confirmation warning.
 * L25: HSN/SAC codes must be present on all lines at approval.
 * SPEC-ARCH-UI-001 §Dialog.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Dialog, Gate } from '@/src/components/primitives';
import { INRAmount } from '../shared/inr-amount';
import { VendorInvoiceCategoryBadge } from './vendor-invoice-category-badge';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import type { VendorInvoice } from '@dms/types';

interface ApproveInvoiceDialogProps {
  invoice: VendorInvoice;
  open: boolean;
  onClose: () => void;
}

export function ApproveInvoiceDialog({ invoice, open, onClose }: ApproveInvoiceDialogProps) {
  const t = useTranslations('finance.vendorInvoices');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const approveVendorInvoice = useFinanceStore((s) => s.approveVendorInvoice);

  const [confirmed, setConfirmed] = useState(false);

  // L25: check HSN/SAC on all lines
  const missingHsn = invoice.lines.filter((l) => !l.hsnSac || l.hsnSac.trim() === '');

  const canApprove = confirmed && missingHsn.length === 0;

  const handleApprove = () => {
    if (!user || !canApprove) return;
    try {
      approveVendorInvoice(invoice.id, { id: user.id, name: user.name, role: user.role });
      toast(t('approveSuccess'), 'success');
      setConfirmed(false);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('approveError'), 'error');
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* L8: R12+ only — Gate wraps the whole dialog content */}
      <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
        <Dialog
          open={open}
          onClose={handleClose}
          title={t('approveDialogTitle')}
          subtitle={`${invoice.invoiceNumber} · ${invoice.vendorName}`}
          size="sm"
          dirty={confirmed}
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
                onClick={handleApprove}
                disabled={!canApprove}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
              >
                {t('approveConfirm')}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-md border border-line bg-bg-subtle p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('colCategory')}</span>
                <VendorInvoiceCategoryBadge category={invoice.category} showEligibility />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('colAmount')}</span>
                <INRAmount paise={invoice.totalAmountPaise} className="text-ink-primary font-medium" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('colGst')}</span>
                <INRAmount paise={invoice.totalGstPaise} className="text-ink-secondary" />
              </div>
              <div className="border-t border-line pt-2 flex justify-between text-sm font-semibold">
                <span className="text-ink-primary">{t('totalWithGst')}</span>
                <INRAmount
                  paise={invoice.totalAmountPaise + invoice.totalGstPaise}
                  className="text-ink-primary"
                />
              </div>
            </div>

            {/* L25: HSN/SAC warning */}
            {missingHsn.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-[rgb(var(--state-overdue)/0.3)] bg-[rgb(var(--state-overdue)/0.06)] p-3">
                <AlertTriangle size={14} className="text-[rgb(var(--state-overdue))] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-[rgb(var(--state-overdue))]">{t('missingHsnWarning')}</p>
                  <ul className="mt-1 space-y-0.5">
                    {missingHsn.map((l) => (
                      <li key={l.id} className="text-xs text-ink-muted">{l.description}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-ink-muted mt-1">{t('missingHsnNote')}</p>
                </div>
              </div>
            )}

            {/* L22: non-reversible warning */}
            <div className="flex items-start gap-2 rounded-md border border-[rgb(var(--state-pending)/0.3)] bg-[rgb(var(--state-pending)/0.06)] p-3">
              <AlertTriangle size={14} className="text-[rgb(var(--state-pending))] mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs text-ink-secondary">
                {t('approveNonReversibleNote')}
              </p>
            </div>

            {/* Confirm checkbox */}
            {missingHsn.length === 0 && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-line accent-accent"
                />
                <span className="text-sm text-ink-secondary">{t('approveConfirmCheck')}</span>
              </label>
            )}
          </div>
        </Dialog>
      </Gate>
    </>
  );
}
