/**
 * ExportDsrDialog — DPDP Act 2023 DSR (Data Subject Request) CSV export.
 * SPEC-NOTIFICATIONS-001 §6.5, L7 (R23-gated DPO function)
 *
 * Accepts a customerId and triggers a client-side CSV download of all dispatch
 * records for that customer. In v1.1, this routes through a server action.
 *
 * ≤140 LoC per spec §11
 */

'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Dialog } from '../../primitives/dialog';
import { useToast } from '../../../hooks/use-toast';
import { ToastContainer } from '../../primitives/toast';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';

interface ExportDsrDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Minimal CSV builder — no external dep required for v1 mock. */
function buildCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return 'No records found';
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = (row[h] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(','),
    ),
  ];
  return lines.join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportDsrDialog({ open, onClose }: ExportDsrDialogProps) {
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');
  const { toasts, toast, dismiss } = useToast();

  const selectDispatchesByRecipient = useNotificationsStore(
    (s) => s.selectDispatchesByRecipient,
  );

  const handleExport = () => {
    setError('');
    if (!customerId.trim()) {
      setError('Customer ID is required');
      return;
    }

    const dispatches = selectDispatchesByRecipient(customerId.trim());

    if (dispatches.length === 0) {
      setError('No dispatch records found for this customer ID');
      return;
    }

    // L3: phone is already masked in the store; no further redaction needed here
    const rows = dispatches.map((d) => ({
      dispatch_id: d.id,
      template: d.templateName,
      channel: d.channel,
      module: d.module,
      sent_at: d.sentAt,
      status: d.status,
      recipient_phone_masked: d.recipient.raw ?? '',
      customer_id: d.recipient.customerId ?? '',
      source_entity: d.sourceEntityId ?? '',
    }));

    const csv = buildCsv(rows);
    downloadCsv(csv, `dsr-${customerId.trim()}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast(`${dispatches.length} records exported`, 'success');
    onClose();
  };

  const handleClose = () => {
    setCustomerId('');
    setError('');
    onClose();
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Dialog
        open={open}
        onClose={handleClose}
        title="Export DSR (DPDP Act 2023)"
        subtitle="Download all notification records for a data subject as CSV. L7 — R23 DPO access required."
        size="sm"
        dirty={customerId !== ''}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Download size={14} aria-hidden="true" />
              Export CSV
            </button>
          </>
        }
      >
        <div>
          <label
            htmlFor="dsr-customer-id"
            className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
          >
            Customer ID <span className="text-state-danger">*</span>
          </label>
          <input
            id="dsr-customer-id"
            type="text"
            value={customerId}
            onChange={(e) => { setCustomerId(e.target.value); setError(''); }}
            placeholder="e.g. cust-arjun-mehta"
            className={`h-10 w-full bg-bg-subtle border rounded-md px-3 text-sm font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 ${error ? 'border-state-danger' : 'border-line'}`}
            aria-required="true"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'dsr-error' : undefined}
          />
          {error && (
            <p id="dsr-error" className="text-xs text-state-danger mt-1">{error}</p>
          )}
          <p className="text-xs text-ink-muted mt-1.5">
            Enter the internal customer ID. Phone numbers are not accepted (L15).
          </p>
        </div>
      </Dialog>
    </>
  );
}
