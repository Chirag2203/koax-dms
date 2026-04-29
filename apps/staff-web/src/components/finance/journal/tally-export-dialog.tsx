/**
 * Tally export dialog — SPEC-FINANCE-001 §1.5, §6.7
 *
 * L5: CSV download; manual monthly upload to Tally Prime.
 * L8: R22+ only — export journal.
 * L19: Filename: BN_<outletCode>_<periodLabel>_journal.csv
 * L28: assertVoucherBalanced — error surfaced to user; export blocked.
 * L30: Idempotent — re-export produces byte-identical CSV.
 * SPEC-ARCH-UI-001 §Dialog.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Dialog, Gate } from '@/src/components/primitives';
import { INRAmount } from '../shared/inr-amount';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';

interface TallyExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional: pre-computed entry count for the preview summary */
  entryCount?: number;
  totalDebitPaise?: number;
}

export function TallyExportDialog({
  open,
  onClose,
  entryCount = 0,
  totalDebitPaise = 0,
}: TallyExportDialogProps) {
  const t = useTranslations('finance.journal');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const period = useFinanceStore((s) => s.period);
  const outletScope = useFinanceStore((s) => s.outletScope);
  const exportJournalCSV = useFinanceStore((s) => s.exportJournalCSV);

  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{ filename: string; csvByteLength: number } | null>(null);

  const handleExport = () => {
    if (!user) return;
    setExporting(true);
    try {
      // L28: exportJournalCSV calls assertAllVouchersBalanced internally → throws on imbalance
      // L30: idempotent
      const result = exportJournalCSV(period, outletScope);
      setLastExport({ filename: result.filename, csvByteLength: result.csvByteLength });

      // Trigger browser download — L5: CSV only
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast(`${t('exportSuccess')} · ${result.filename}`, 'success');
    } catch (e) {
      // L28: VoucherImbalancedError or other
      toast(e instanceof Error ? e.message : t('exportError'), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* L8: R22+ only */}
      <Gate role={['R22', 'R24']} fallback="hide">
        <Dialog
          open={open}
          onClose={onClose}
          title={t('exportDialogTitle')}
          subtitle={`${period.label} · ${outletScope}`}
          size="sm"
          footer={
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('close')}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || entryCount === 0}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 inline-flex items-center gap-2"
              >
                <Download size={14} aria-hidden="true" />
                {exporting ? t('exporting') : t('exportCsv')}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Export summary */}
            <div className="rounded-md border border-line bg-bg-subtle p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('period')}</span>
                <span className="font-mono text-xs text-ink-primary">{period.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('outlet')}</span>
                <span className="font-mono text-xs text-ink-primary">{outletScope}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('voucherCount')}</span>
                <span className="text-sm font-medium text-ink-primary">{entryCount}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-line pt-2">
                <span className="text-ink-muted">{t('totalDebit')}</span>
                <INRAmount paise={totalDebitPaise} className="text-sm font-semibold text-ink-primary" />
              </div>
            </div>

            {/* Filename preview — L19 */}
            <div>
              <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">{t('filenamePreview')}</p>
              <p className="font-mono text-xs text-accent bg-accent/5 border border-accent/20 rounded px-3 py-2">
                BN_{outletScope}_{period.label}_journal.csv
              </p>
            </div>

            {/* Last export info — L30: idempotent */}
            {lastExport && (
              <div className="flex items-start gap-2 rounded-md border border-[rgb(var(--state-listed)/0.3)] bg-[rgb(var(--state-listed)/0.06)] p-3">
                <CheckCircle2 size={14} className="text-[rgb(var(--state-listed))] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-[rgb(var(--state-listed))]">{t('exportComplete')}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {lastExport.filename} · {(lastExport.csvByteLength / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">{t('idempotentNote')}</p>
                </div>
              </div>
            )}

            {/* L28: voucher balance warning */}
            <div className="flex items-start gap-2 rounded-md border border-[rgb(var(--state-pending)/0.3)] bg-[rgb(var(--state-pending)/0.06)] p-3">
              <AlertTriangle size={14} className="text-[rgb(var(--state-pending))] mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs text-ink-secondary">
                {t('balanceCheckNote')}
              </p>
            </div>

            {/* Empty warning */}
            {entryCount === 0 && (
              <p className="text-xs text-ink-muted text-center">{t('noEntriesForPeriod')}</p>
            )}
          </div>
        </Dialog>
      </Gate>
    </>
  );
}
