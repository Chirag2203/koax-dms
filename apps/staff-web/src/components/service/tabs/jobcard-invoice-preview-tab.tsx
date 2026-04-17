'use client';

import { Download, FileText } from 'lucide-react';
import { Gate, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { JobCard } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Tax Invoice',
  preview: 'PREVIEW — NOT FOR CUSTOMER USE',
  company: 'BN Automobiles',
  gstin: 'GSTIN: 29AABCB1234F1Z5',
  address: '100, Lavelle Road, Bengaluru — 560001, Karnataka',
  billTo: 'Bill To',
  vehicle: 'Vehicle',
  lineItems: 'Line Items',
  colNo: 'Sl',
  colDesc: 'Description',
  colHsnSac: 'HSN/SAC',
  colQty: 'Qty',
  colRate: 'Rate',
  colAmount: 'Amount',
  subtotal: 'Sub-total',
  cgst: 'CGST 9%',
  sgst: 'SGST 9%',
  roundOff: 'Round Off',
  grandTotal: 'Grand Total',
  terms: 'Subject to Bengaluru jurisdiction. Goods once sold will not be taken back.',
  generateInvoice: 'Generate GST Invoice',
  downloadPdf: 'Download PDF Preview',
  note: 'Note: Actual invoice generation and GST filing is handled by the Finance module. This is a preview only.',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const CUSTOMER_NAME_MAP: Record<string, string> = {
  'customer-001': 'Rohit Malhotra',
  'customer-002': 'Kavitha Nair',
  'customer-003': 'Siddharth Joshi',
  'customer-004': 'Divya Menon',
  'customer-005': 'Arjun Kapoor',
  'customer-006': 'Priya Pillai',
  'customer-007': 'Vikram Bose',
  'customer-008': 'Ananya Singh',
  'customer-009': 'Rajesh Verma',
  'customer-010': 'Meera Nambiar',
};

const MASKED_PHONE = '+91 98765 ••••1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardInvoicePreviewTabProps {
  jobCard: JobCard;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardInvoicePreviewTab({ jobCard }: JobCardInvoicePreviewTabProps) {
  const { toasts, toast, dismiss } = useToast();
  const router = useRouter();
  const labourLines = jobCard.labourLines;
  const partsLines = jobCard.partsLines;

  const labourSubtotal = labourLines.reduce((sum, l) => sum + l.flatRateHours * l.rate, 0);
  const partsSubtotal = partsLines.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const subtotal = labourSubtotal + partsSubtotal;
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const grandTotalRaw = subtotal + cgst + sgst;
  const grandTotalRounded = Math.round(grandTotalRaw);
  const roundOff = grandTotalRounded - grandTotalRaw;

  const customerName = CUSTOMER_NAME_MAP[jobCard.customerId] ?? jobCard.customerId;

  let lineNo = 0;

  return (
    <>
    <div className="rounded-md border border-line bg-bg-surface p-6 print-area-invoice">
      {/* Preview banner */}
      <div className="mb-4 text-center">
        <span className="inline-flex items-center gap-2 rounded px-3 py-1 bg-[rgb(var(--state-stale)/0.1)] font-mono text-[11px] uppercase tracking-widest text-[rgb(var(--state-stale))]">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {MESSAGES.preview}
        </span>
      </div>

      {/* Invoice header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-line">
        <div>
          <h2 className="text-[22px] font-semibold leading-[1.3] text-ink-primary">
            {MESSAGES.company}
          </h2>
          <p className="text-[13px] text-ink-secondary mt-0.5">{MESSAGES.gstin}</p>
          <p className="text-[12px] text-ink-muted mt-0.5">{MESSAGES.address}</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-semibold text-ink-primary">{MESSAGES.title}</p>
          <p className="font-mono text-[12px] text-ink-muted mt-0.5">{jobCard.jobNo}</p>
        </div>
      </div>

      {/* Bill to + Vehicle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Bill To */}
        <div className="rounded-md border border-line bg-bg-subtle p-3">
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-2">
            {MESSAGES.billTo}
          </p>
          <p className="text-[14px] font-semibold text-ink-primary">{customerName}</p>
          <p className="font-mono text-[12px] text-ink-secondary mt-0.5">{MASKED_PHONE}</p>
        </div>

        {/* Vehicle */}
        <div className="rounded-md border border-line bg-bg-subtle p-3">
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-2">
            {MESSAGES.vehicle}
          </p>
          <p className="font-mono text-[13px] text-ink-primary">{jobCard.vin}</p>
          <p className="text-[12px] text-ink-secondary mt-0.5">
            ODO In: {jobCard.odometerIn.toLocaleString('en-IN')} km
          </p>
        </div>
      </div>

      {/* Line items table */}
      <div className="rounded-md border border-line overflow-hidden mb-4">
        {/* Header */}
        <div className="grid grid-cols-[32px_1fr_80px_50px_100px_100px] border-b border-line bg-bg-subtle px-4 py-2">
          {[
            MESSAGES.colNo,
            MESSAGES.colDesc,
            MESSAGES.colHsnSac,
            MESSAGES.colQty,
            MESSAGES.colRate,
            MESSAGES.colAmount,
          ].map((h) => (
            <span key={h} className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              {h}
            </span>
          ))}
        </div>

        {/* Labour lines */}
        {labourLines.map((l, i) => {
          lineNo++;
          return (
            <div
              key={l.id}
              className={`grid grid-cols-[32px_1fr_80px_50px_100px_100px] items-center px-4 py-2 ${i % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle'}`}
            >
              <span className="font-mono text-[12px] text-ink-muted">{lineNo}</span>
              <span className="text-[13px] text-ink-primary pr-2">{l.description}</span>
              <span className="font-mono text-[11px] text-ink-muted">998714</span>
              <span className="font-mono text-[12px] text-ink-secondary text-center">
                {l.flatRateHours}h
              </span>
              <span className="font-mono text-[13px] text-ink-primary text-right pr-4">
                {INR.format(l.rate)}
              </span>
              <span className="font-mono text-[13px] text-ink-primary text-right">
                {INR.format(l.flatRateHours * l.rate)}
              </span>
            </div>
          );
        })}

        {/* Parts lines */}
        {partsLines.map((p, i) => {
          lineNo++;
          return (
            <div
              key={p.id}
              className={`grid grid-cols-[32px_1fr_80px_50px_100px_100px] items-center px-4 py-2 ${(i + labourLines.length) % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle'}`}
            >
              <span className="font-mono text-[12px] text-ink-muted">{lineNo}</span>
              <span className="text-[13px] text-ink-primary pr-2">{p.description}</span>
              <span className="font-mono text-[11px] text-ink-muted">87089900</span>
              <span className="font-mono text-[12px] text-ink-secondary text-center">{p.qty}</span>
              <span className="font-mono text-[13px] text-ink-primary text-right pr-4">
                {INR.format(p.unitPrice)}
              </span>
              <span className="font-mono text-[13px] text-ink-primary text-right">
                {INR.format(p.qty * p.unitPrice)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="min-w-[280px] space-y-2">
          {[
            { label: MESSAGES.subtotal, value: subtotal },
            { label: MESSAGES.cgst, value: cgst, muted: true },
            { label: MESSAGES.sgst, value: sgst, muted: true },
            { label: MESSAGES.roundOff, value: roundOff, muted: true },
          ].map(({ label, value, muted }) => (
            <div key={label} className="flex items-center justify-between">
              <span className={`text-[13px] ${muted ? 'text-ink-muted' : 'text-ink-secondary'}`}>
                {label}
              </span>
              <span className="font-mono text-[13px] tabular-nums text-ink-primary">
                {INR.format(value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line pt-2">
            <span className="text-[15px] font-semibold text-ink-primary">{MESSAGES.grandTotal}</span>
            <span className="font-mono text-[18px] font-semibold tabular-nums text-ink-primary">
              {INR.format(grandTotalRounded)}
            </span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <p className="text-[12px] text-ink-muted mb-6">{MESSAGES.terms}</p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Gate role={['R22', 'R24']} fallback="disable">
          <button
            type="button"
            onClick={() => {
              toast('Invoice generation opens in Finance module (coming in S6)', 'info');
              const financeUrl = `/finance/invoices/new?jobCard=${jobCard.id}`;
              void router.prefetch(financeUrl);
            }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {MESSAGES.generateInvoice}
          </button>
        </Gate>
        <button
          type="button"
          onClick={() => {
            window.print();
          }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {MESSAGES.downloadPdf}
        </button>
      </div>

      {/* Note */}
      <p className="mt-4 text-[12px] text-ink-muted italic">{MESSAGES.note}</p>
      <p className="mt-1 text-[11px] text-ink-muted italic">
        Note: On iOS Safari, use Share → Print for best results.
      </p>
    </div>
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
