/**
 * GST margin detail card — SPEC-FINANCE-001 L16, §6.3
 *
 * L16: Per-VIN drill-down showing:
 *      salePrice, acquisitionCost, refurb cost lines, computed margin, computed GST,
 *      stored GST, discrepancy section (R22+ acknowledge).
 * L1: GST margin formula display — math in lib, display only here.
 * SPEC-ARCH-UI-001 §Card, §Field.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { Dialog } from '@/src/components/primitives';
import { Gate } from '@/src/components/primitives';
import { DiscrepancyAlert } from './discrepancy-alert';
import { INRAmount } from '../shared/inr-amount';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import type { MarginReconciliationRow } from '@dms/types';

interface GstMarginDetailCardProps {
  row: MarginReconciliationRow;
}

/**
 * MarginBreakdownCard per §6.3.
 * L16: Drill-down rendering for a single VIN's margin reconciliation.
 */
export function GstMarginDetailCard({ row }: GstMarginDetailCardProps) {
  const t = useTranslations('finance.gst');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const acknowledgeMarginDiscrepancy = useFinanceStore((s) => s.acknowledgeMarginDiscrepancy);

  const [ackOpen, setAckOpen] = useState(false);
  const [ackReason, setAckReason] = useState('');
  const [ackTouched, setAckTouched] = useState(false);

  const ackReasonValid = ackReason.trim().length >= 10;
  const ackReasonError = ackTouched && !ackReasonValid
    ? t('ackReasonMinLength')
    : null;

  const handleAcknowledge = () => {
    if (!ackReasonValid) { setAckTouched(true); return; }
    if (!user) return;
    try {
      acknowledgeMarginDiscrepancy(row.vin, row.saleEventId, ackReason.trim(), {
        id: user.id,
        name: user.name,
        role: user.role,
      });
      toast(t('ackSuccess'), 'success');
      setAckOpen(false);
      setAckReason('');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('ackError'), 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <Card title={`${row.vin} — ${t('marginBreakdown')}`}>
        <div className="space-y-4">
          {/* Summary row */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field
              label={t('saleDate')}
              value={new Date(row.saleDate).toLocaleDateString('en-IN')}
            />
            <Field
              label={t('saleEventId')}
              value={<span className="font-mono text-xs">{row.saleEventId}</span>}
            />
            <Field
              label={t('customer')}
              value={`${row.customerName} (PAN: ${row.customerPanLast4})`}
            />
            <Field
              label={t('outlet')}
              value={row.outletId}
            />
          </dl>

          {/* Margin calculation waterfall — §6.3 */}
          <div className="rounded-md border border-line bg-bg-subtle p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">{t('salePrice')}</span>
              <INRAmount paise={row.salePricePaise} className="text-ink-primary" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">— {t('acquisitionCost')}</span>
              <INRAmount paise={row.acquisitionCostPaise} className="text-ink-muted" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">— {t('allowableRefurb')}</span>
              <INRAmount paise={row.allowableRefurbPaise} className="text-ink-muted" />
            </div>
            <div className="border-t border-line pt-2 flex justify-between text-sm font-medium">
              <span className="text-ink-primary">= {t('computedMargin')}</span>
              <INRAmount paise={row.computedMarginPaise} className="text-ink-primary" />
            </div>
            <div className="flex justify-between text-xs text-ink-muted">
              <span>× 18 / 118</span>
              <span>{/* formula label — no computation here (L10) */}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-accent">
              <span>= {t('computedGst')}</span>
              <INRAmount paise={row.computedGstPaise} className="text-accent" />
            </div>
          </div>

          {/* Stored vs computed — L20 */}
          {row.storedGstPaise !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t('storedGst')}</span>
                <INRAmount paise={row.storedGstPaise} className="text-ink-secondary" />
              </div>
              <DiscrepancyAlert
                storedGstPaise={row.storedGstPaise}
                computedGstPaise={row.computedGstPaise}
                ack={row.discrepancyAck}
                onAcknowledge={
                  row.discrepancyDetected && !row.discrepancyAck
                    ? () => setAckOpen(true)
                    : undefined
                }
              />
            </div>
          )}

          {/* Reconciliation status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted uppercase tracking-wider">{t('status')}</span>
            {row.reconciliationStatus === 'reconciled' ? (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))] text-xs font-mono uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--state-listed))]" aria-hidden="true" />
                Reconciled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 bg-bg-subtle border border-line text-ink-muted text-xs font-mono uppercase tracking-widest">
                Open
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Acknowledge discrepancy dialog — R22+ only (L20) */}
      <Gate role={['R22', 'R24']} fallback="hide">
        <Dialog
          open={ackOpen}
          onClose={() => setAckOpen(false)}
          title={t('acknowledgeDiscrepancy')}
          subtitle={t('acknowledgeDiscrepancySubtitle')}
          size="sm"
          dirty={ackReason.length > 0}
          footer={
            <>
              <button
                type="button"
                onClick={() => setAckOpen(false)}
                className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={!ackReasonValid}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
              >
                {t('acknowledge')}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="ack-reason"
                className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
              >
                {t('ackReason')} *
              </label>
              <textarea
                id="ack-reason"
                value={ackReason}
                onChange={(e) => { setAckReason(e.target.value); setAckTouched(true); }}
                rows={3}
                className={[
                  'w-full rounded-md border bg-bg-subtle px-3 py-2 text-sm text-ink-primary',
                  'placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none',
                  ackReasonError ? 'border-state-danger' : 'border-line focus:border-accent',
                ].join(' ')}
                placeholder={t('ackReasonPlaceholder')}
              />
              {ackReasonError && (
                <p className="text-xs text-state-danger mt-1">{ackReasonError}</p>
              )}
            </div>
          </div>
        </Dialog>
      </Gate>
    </>
  );
}
