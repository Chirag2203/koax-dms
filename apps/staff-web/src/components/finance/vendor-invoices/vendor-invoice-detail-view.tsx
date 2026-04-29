/**
 * Vendor invoice detail view — SPEC-FINANCE-001 §6.5, L16
 *
 * L8: R12+ approve, R22+ mark-paid, R12+ dispute.
 * L13: vendorGstin/vendorPan shown in full (public business data, not PII).
 * L17: Category display with ITC eligibility.
 * L22: Dispute reverts to pending; only pending+approved can be disputed.
 * L23: Per-line and invoice-level ITC eligibility.
 * L25: HSN/SAC per line shown.
 * SPEC-ARCH-UI-001 §Card, §Field.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { Gate } from '@/src/components/primitives';
import { INRAmount } from '../shared/inr-amount';
import { GstinDisplay } from '../shared/gstin-display';
import { VendorInvoiceStatusChip } from './vendor-invoice-status-chip';
import { VendorInvoiceCategoryBadge } from './vendor-invoice-category-badge';
import { ApproveInvoiceDialog } from './approve-invoice-dialog';
import { MarkPaidDialog } from './mark-paid-dialog';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import type { VendorInvoice } from '@dms/types';

interface VendorInvoiceDetailViewProps {
  invoice: VendorInvoice;
  onBack: () => void;
}

export function VendorInvoiceDetailView({ invoice, onBack }: VendorInvoiceDetailViewProps) {
  const t = useTranslations('finance.vendorInvoices');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const disputeVendorInvoice = useFinanceStore((s) => s.disputeVendorInvoice);

  const [approveOpen, setApproveOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeTouched, setDisputeTouched] = useState(false);

  const disputeReasonValid = disputeReason.trim().length >= 10;
  const disputeReasonError = disputeTouched && !disputeReasonValid ? t('disputeReasonMinLength') : null;

  const handleDispute = () => {
    if (!disputeReasonValid) { setDisputeTouched(true); return; }
    if (!user) return;
    try {
      disputeVendorInvoice(invoice.id, disputeReason.trim(), {
        id: user.id,
        name: user.name,
        role: user.role,
      });
      toast(t('disputeSuccess'), 'success');
      setDisputeOpen(false);
      setDisputeReason('');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('disputeError'), 'error');
    }
  };

  const canApprove = invoice.status === 'pending';
  const canPay = invoice.status === 'approved';
  const canDispute = invoice.status === 'pending' || invoice.status === 'approved';

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Back nav */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary transition-colors mb-4"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t('backToList')}
      </button>

      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink-primary">{invoice.invoiceNumber}</h2>
            <p className="text-sm text-ink-secondary mt-0.5">{invoice.vendorName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <VendorInvoiceStatusChip status={invoice.status} />
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {canApprove && (
            <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="h-8 px-3 rounded-md text-xs font-semibold bg-accent text-white hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('approveAction')}
              </button>
            </Gate>
          )}
          {canPay && (
            <Gate role={['R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setPaidOpen(true)}
                className="h-8 px-3 rounded-md text-xs font-semibold bg-accent text-white hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('markPaidAction')}
              </button>
            </Gate>
          )}
          {canDispute && (
            <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setDisputeOpen(true)}
                className="h-8 px-3 rounded-md text-xs font-medium border border-[rgb(var(--state-overdue)/0.4)] text-[rgb(var(--state-overdue))] hover:bg-[rgb(var(--state-overdue)/0.06)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('disputeAction')}
              </button>
            </Gate>
          )}
        </div>

        {/* Invoice metadata */}
        <Card title={t('invoiceDetails')}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label={t('colVendor')} value={invoice.vendorName} />
            <Field
              label={t('vendorGstin')}
              value={<GstinDisplay gstin={invoice.vendorGstin} showValidation />}
            />
            {invoice.vendorPan && (
              <Field
                label={t('vendorPan')}
                value={<span className="font-mono text-xs">{invoice.vendorPan}</span>}
              />
            )}
            <Field label={t('outlet')} value={invoice.outletId} />
            <Field label={t('colRaised')} value={new Date(invoice.raisedAt).toLocaleDateString('en-IN')} />
            {invoice.dueAt && (
              <Field label={t('dueDate')} value={new Date(invoice.dueAt).toLocaleDateString('en-IN')} />
            )}
            <Field
              label={t('colCategory')}
              value={<VendorInvoiceCategoryBadge category={invoice.category} showEligibility />}
            />
            <Field
              label={t('inputCredit')}
              value={
                invoice.inputCreditEligible ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[rgb(var(--state-listed))]">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    {t('itcEligible')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                    <XCircle size={12} aria-hidden="true" />
                    {t('itcNotEligible')}
                    {invoice.inputCreditEligibilityReason && (
                      <span className="ml-1 text-xs text-ink-muted">({invoice.inputCreditEligibilityReason})</span>
                    )}
                  </span>
                )
              }
            />
            {invoice.linkedConsignmentVin && (
              <Field label={t('linkedVin')} value={<span className="font-mono text-xs">{invoice.linkedConsignmentVin}</span>} />
            )}
            {invoice.linkedInsuranceLeadId && (
              <Field label={t('linkedInsuranceLead')} value={<span className="font-mono text-xs">{invoice.linkedInsuranceLeadId}</span>} />
            )}
          </dl>
        </Card>

        {/* Line items — L25: HSN/SAC per line */}
        <Card title={t('lineItems')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="pb-2 text-left text-xs font-medium text-ink-muted">{t('lineDescription')}</th>
                  <th className="pb-2 text-left text-xs font-medium text-ink-muted">{t('hsnSac')}</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('qty')}</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('unitPrice')}</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('gstRate')}</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('gstAmount')}</th>
                  <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('lineTotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-2.5 pr-4">
                      <p className="text-sm text-ink-primary">{line.description}</p>
                      {/* L23: per-line ITC eligibility */}
                      {!line.inputCreditEligible && (
                        <p className="text-xs text-ink-muted mt-0.5">{t('itcNotEligible')}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {/* L25: HSN/SAC */}
                      {line.hsnSac ? (
                        <span className="font-mono text-xs text-ink-secondary">{line.hsnSac}</span>
                      ) : (
                        <span className="text-xs text-[rgb(var(--state-overdue))] font-medium">{t('hsnMissing')}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-sm text-ink-secondary">{line.quantity}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <INRAmount paise={line.unitPricePaise} className="text-sm text-ink-secondary" />
                    </td>
                    <td className="py-2.5 pr-4 text-right text-xs text-ink-muted">{line.gstRatePct}%</td>
                    <td className="py-2.5 pr-4 text-right">
                      <INRAmount paise={line.gstAmountPaise} className="text-xs text-ink-muted" />
                    </td>
                    <td className="py-2.5 text-right">
                      <INRAmount paise={line.lineTotalPaise} className="text-sm font-medium text-ink-primary" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line">
                <tr>
                  <td colSpan={5} className="pt-3 text-right text-xs text-ink-muted">{t('totals')}</td>
                  <td className="pt-3 pr-4 text-right">
                    <INRAmount paise={invoice.totalGstPaise} className="text-xs font-medium text-ink-secondary" />
                  </td>
                  <td className="pt-3 text-right">
                    <INRAmount
                      paise={invoice.totalAmountPaise + invoice.totalGstPaise}
                      className="text-sm font-semibold text-ink-primary"
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Audit timeline */}
        <Card title={t('auditTimeline')}>
          <ol className="relative border-l border-line ml-2 space-y-4">
            <AuditStep
              icon={<span className="w-2 h-2 rounded-full bg-ink-muted" aria-hidden="true" />}
              label={t('timelineRaised')}
              date={invoice.raisedAt}
            />
            {invoice.approvedAt && (
              <AuditStep
                icon={<CheckCircle2 size={12} className="text-[rgb(var(--state-pending))]" aria-hidden="true" />}
                label={`${t('timelineApproved')}${invoice.approvedBy ? ` ${t('by')} ${invoice.approvedBy}` : ''}`}
                date={invoice.approvedAt}
              />
            )}
            {invoice.paidAt && (
              <AuditStep
                icon={<CheckCircle2 size={12} className="text-[rgb(var(--state-listed))]" aria-hidden="true" />}
                label={`${t('timelinePaid')} · ${invoice.paymentRef ?? ''}`}
                date={invoice.paidAt}
              />
            )}
            {invoice.status === 'disputed' && (
              <AuditStep
                icon={<AlertTriangle size={12} className="text-[rgb(var(--state-overdue))]" aria-hidden="true" />}
                label={`${t('timelineDisputed')}${invoice.disputeReason ? ` · ${invoice.disputeReason}` : ''}`}
                date={null}
              />
            )}
          </ol>
        </Card>

        {/* Dispute reason display if disputed */}
        {invoice.status === 'disputed' && invoice.disputeReason && (
          <div className="flex items-start gap-2 rounded-md border border-[rgb(var(--state-overdue)/0.3)] bg-[rgb(var(--state-overdue)/0.06)] p-3">
            <AlertTriangle size={14} className="text-[rgb(var(--state-overdue))] mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-[rgb(var(--state-overdue))]">{t('disputeReasonLabel')}</p>
              <p className="text-sm text-ink-secondary mt-1">{invoice.disputeReason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Approve dialog */}
      <ApproveInvoiceDialog
        invoice={invoice}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
      />

      {/* Mark paid dialog */}
      <MarkPaidDialog
        invoice={invoice}
        open={paidOpen}
        onClose={() => setPaidOpen(false)}
      />

      {/* Dispute dialog */}
      {disputeOpen && (
        // L22: dispute dialog — inline, R12+ gated
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispute-dialog-title"
        >
          <div className="fixed inset-0 bg-black/40" onClick={() => setDisputeOpen(false)} aria-hidden="true" />
          <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
            <div className="relative z-10 w-full max-w-sm rounded-md border border-line bg-bg-canvas p-6 space-y-4 shadow-xl">
              <h2 id="dispute-dialog-title" className="text-base font-semibold text-ink-primary">{t('disputeDialogTitle')}</h2>
              <p className="text-sm text-ink-secondary">{invoice.invoiceNumber} · {invoice.vendorName}</p>
              <div>
                <label
                  htmlFor="dispute-reason"
                  className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
                >
                  {t('disputeReason')} *
                </label>
                <textarea
                  id="dispute-reason"
                  value={disputeReason}
                  onChange={(e) => { setDisputeReason(e.target.value); setDisputeTouched(true); }}
                  rows={3}
                  className={[
                    'w-full rounded-md border bg-bg-subtle px-3 py-2 text-sm text-ink-primary',
                    'placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none',
                    disputeReasonError ? 'border-[rgb(var(--state-overdue))]' : 'border-line focus:border-accent',
                  ].join(' ')}
                  placeholder={t('disputeReasonPlaceholder')}
                />
                {disputeReasonError && (
                  <p className="text-xs text-[rgb(var(--state-overdue))] mt-1">{disputeReasonError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisputeOpen(false)}
                  className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDispute}
                  disabled={!disputeReasonValid}
                  className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-[rgb(var(--state-overdue))] hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {t('disputeConfirm')}
                </button>
              </div>
            </div>
          </Gate>
        </div>
      )}
    </>
  );
}

// ─── Audit step sub-component ─────────────────────────────────────────────────

function AuditStep({
  icon,
  label,
  date,
}: {
  icon: React.ReactNode;
  label: string;
  date: string | null;
}) {
  return (
    <li className="pl-6 relative">
      <span className="absolute -left-[5px] top-0.5 flex items-center justify-center w-4 h-4">
        {icon}
      </span>
      <p className="text-sm text-ink-primary">{label}</p>
      {date && (
        <p className="text-xs text-ink-muted mt-0.5">
          {new Date(date).toLocaleDateString('en-IN')}{' '}
          {new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </li>
  );
}
