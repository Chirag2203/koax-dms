'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import type { JobCard } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  title: 'Send Estimate for Approval',
  channelLabel: 'Send via',
  channelWhatsApp: 'WhatsApp',
  channelSms: 'SMS',
  previewLabel: 'Message Preview',
  cancel: 'Cancel',
  submit: 'Send Estimate',
  successWhatsApp: 'Estimate sent via WhatsApp',
  successSms: 'Estimate sent via SMS',
} as const;

type Channel = 'whatsapp' | 'sms';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const CUSTOMER_MAP: Record<string, { name: string; phoneMasked: string; phoneDigits: string }> = {
  'customer-001': { name: 'Rohit Malhotra', phoneMasked: '+91 98765 ••••1', phoneDigits: '9876500001' },
  'customer-002': { name: 'Kavitha Nair', phoneMasked: '+91 87654 ••••2', phoneDigits: '8765400002' },
  'customer-003': { name: 'Siddharth Joshi', phoneMasked: '+91 76543 ••••3', phoneDigits: '7654300003' },
  'customer-004': { name: 'Divya Menon', phoneMasked: '+91 99887 ••••4', phoneDigits: '9988700004' },
  'customer-005': { name: 'Arjun Kapoor', phoneMasked: '+91 88776 ••••5', phoneDigits: '8877600005' },
  'customer-006': { name: 'Priya Pillai', phoneMasked: '+91 77665 ••••6', phoneDigits: '7766500006' },
  'customer-007': { name: 'Vikram Bose', phoneMasked: '+91 99001 ••••7', phoneDigits: '9900100007' },
  'customer-008': { name: 'Ananya Singh', phoneMasked: '+91 88990 ••••8', phoneDigits: '8899000008' },
  'customer-009': { name: 'Rajesh Verma', phoneMasked: '+91 77889 ••••9', phoneDigits: '7788900009' },
  'customer-010': { name: 'Meera Nambiar', phoneMasked: '+91 66778 ••••0', phoneDigits: '6677800010' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  jobCard: JobCard;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SendApprovalDialog({ open, onClose, jobCard }: SendApprovalDialogProps) {
  const [channel, setChannel] = useState<Channel>('whatsapp');

  const { user } = useStaffAuth();
  const logCommunication = useServiceStore((s) => s.logCommunication);
  const { toasts, toast, dismiss } = useToast();

  const customer = CUSTOMER_MAP[jobCard.customerId] ?? {
    name: jobCard.customerId,
    phoneMasked: '—',
    phoneDigits: '',
  };

  const labourSubtotal = jobCard.labourLines.reduce((sum, l) => sum + l.flatRateHours * l.rate, 0);
  const partsSubtotal = jobCard.partsLines.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const subtotal = labourSubtotal + partsSubtotal;
  const grandTotal = subtotal * 1.18; // 9% CGST + 9% SGST

  const vehicleName = `VIN: ${jobCard.vin}`;
  const messageTemplate = `Dear ${customer.name}, your estimate for ${vehicleName} is ${INR.format(Math.round(grandTotal))}. Please confirm your approval to proceed with the service. Reply YES to approve. — BN Automobiles`;

  function handleSubmit() {
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    logCommunication(
      jobCard.id,
      { channel, template: 'estimate-approval', actorId: actor.id },
      actor,
    );

    const successMsg = channel === 'whatsapp' ? MESSAGES.successWhatsApp : MESSAGES.successSms;
    toast(successMsg, 'success');

    // Open WhatsApp in new tab
    if (channel === 'whatsapp' && customer.phoneDigits) {
      const encoded = encodeURIComponent(messageTemplate);
      window.open(`https://wa.me/91${customer.phoneDigits}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }

    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={MESSAGES.title}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              {MESSAGES.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white',
                'text-sm font-medium hover:bg-accent-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              {MESSAGES.submit}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Summary card */}
          <div className="rounded-md border border-line bg-bg-subtle p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-ink-muted">Customer</span>
              <span className="text-sm font-medium text-ink-primary">{customer.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-ink-muted">Phone</span>
              <span className="font-mono text-sm text-ink-secondary">{customer.phoneMasked}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-xs uppercase tracking-wide text-ink-muted">Total Estimate</span>
              <span className="font-mono text-[15px] font-semibold tabular-nums text-ink-primary">
                {INR.format(Math.round(grandTotal))}
              </span>
            </div>
          </div>

          {/* Channel select */}
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted mb-2">
              {MESSAGES.channelLabel}
            </p>
            <div className="flex gap-3">
              {(['whatsapp', 'sms'] as Channel[]).map((ch) => (
                <label key={ch} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="channel"
                    value={ch}
                    checked={channel === ch}
                    onChange={() => setChannel(ch)}
                    className="h-4 w-4 accent-accent"
                  />
                  <span className="text-sm text-ink-primary">
                    {ch === 'whatsapp' ? MESSAGES.channelWhatsApp : MESSAGES.channelSms}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Message preview */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
              {MESSAGES.previewLabel}
            </label>
            <textarea
              readOnly
              value={messageTemplate}
              rows={4}
              className={cn(
                'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                'text-sm text-ink-secondary resize-none cursor-default',
                'focus:outline-none',
              )}
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Template: estimate-approval — read-only preview
            </p>
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
