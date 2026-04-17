'use client';

import { useState, useMemo } from 'react';
import { cn } from '@dms/ui';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import type { Interaction } from '@dms/types';

// ─── Templates ────────────────────────────────────────────────────────────────

type TemplateKey =
  | 'greeting'
  | 'vehicle-details'
  | 'pricing-quote'
  | 'test-drive-followup'
  | 'document-request'
  | 'custom';

export const WHATSAPP_TEMPLATES: Record<
  TemplateKey,
  { label: string; body: string }
> = {
  greeting: {
    label: 'Greeting & Introduction',
    body: 'Hello {customerName}, this is BN Automobiles. Thank you for your interest in our curated pre-owned collection. I\'d be glad to help you find the right vehicle.',
  },
  'vehicle-details': {
    label: 'Share Vehicle Details',
    body: 'Hi {customerName}, here are the details for the {vehicleName} you were interested in. [BN Automobiles Team]',
  },
  'pricing-quote': {
    label: 'Pricing Quote',
    body: 'Hi {customerName}, as requested, sharing the on-road pricing breakdown for the {vehicleName}. Let me know if you\'d like to schedule a viewing.',
  },
  'test-drive-followup': {
    label: 'Test Drive Follow-up',
    body: 'Hi {customerName}, following up on your recent test drive of the {vehicleName}. Do you have any questions or would you like to move forward?',
  },
  'document-request': {
    label: 'Document Request',
    body: 'Hi {customerName}, could you please share your KYC documents (PAN + Aadhaar) to help us prepare the paperwork? You can upload them via secure portal. — BN Automobiles',
  },
  custom: {
    label: 'Custom Message',
    body: '',
  },
};

const TEMPLATE_OPTIONS = Object.entries(WHATSAPP_TEMPLATES).map(([key, val]) => ({
  key: key as TemplateKey,
  label: val.label,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function interpolate(
  template: string,
  customerName: string,
  vehicleName?: string,
): string {
  const firstName = customerName.split(' ')[0] ?? customerName;
  const vehicle = vehicleName ?? 'the vehicle';
  return template
    .replace(/\{customerName\}/g, firstName)
    .replace(/\{vehicleName\}/g, vehicle);
}

function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  const prefix = phone.startsWith('+91') ? '+91' : '';
  if (prefix) {
    return `${prefix} •••• ••${last4.slice(2)}`;
  }
  return `••••••${last4}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsappDialogProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
  customerName: string;
  customerPhone: string; // full "+91 98765 43210"
  vehicleName?: string;
  onMessageSent: (interaction: Partial<Interaction>) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsappDialog({
  open,
  onClose,
  customerName,
  customerPhone,
  vehicleName,
  onMessageSent,
}: WhatsappDialogProps) {
  const { toasts, toast, dismiss } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('greeting');
  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCustom = selectedTemplate === 'custom';

  const interpolatedBody = useMemo(() => {
    if (isCustom) return customMessage;
    const tpl = WHATSAPP_TEMPLATES[selectedTemplate];
    return interpolate(tpl.body, customerName, vehicleName);
  }, [selectedTemplate, customMessage, customerName, vehicleName, isCustom]);

  function handleClose() {
    setSelectedTemplate('greeting');
    setCustomMessage('');
    onClose();
  }

  async function handleOpenWhatsApp() {
    const digits = phoneDigitsOnly(customerPhone);
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(interpolatedBody)}`;
    window.open(url, '_blank');

    const templateLabel = WHATSAPP_TEMPLATES[selectedTemplate].label;
    setSubmitting(true);
    try {
      await onMessageSent({
        type: 'whatsapp-sent',
        title: `WhatsApp Sent: ${templateLabel}`,
        body: interpolatedBody,
      });
      toast('Message prepared on WhatsApp', 'success');
    } finally {
      setSubmitting(false);
    }
    handleClose();
  }

  const canSend = isCustom
    ? customMessage.trim().length > 0
    : true;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Send WhatsApp"
        subtitle="Select a template or compose a custom message. Opens in WhatsApp."
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={submitting || !canSend}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white',
                'bg-[#25D366] hover:bg-[#1ebe57] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Open WhatsApp
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Customer info (read-only) */}
          <div className="flex items-center justify-between rounded-md border border-line bg-bg-subtle px-3 py-2.5">
            <span className="text-sm font-medium text-ink-primary">{customerName}</span>
            <span className="font-mono text-xs text-ink-muted">{maskPhone(customerPhone)}</span>
          </div>

          {/* Template select */}
          <div>
            <label
              htmlFor="wa-template-select"
              className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5"
            >
              Message template
            </label>
            <select
              id="wa-template-select"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as TemplateKey)}
              className={cn(
                'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
                'text-sm text-ink-primary',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview or custom textarea */}
          {isCustom ? (
            <div>
              <label
                htmlFor="wa-custom-message"
                className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5"
              >
                Your message
              </label>
              <textarea
                id="wa-custom-message"
                rows={5}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your message..."
                className={cn(
                  'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 resize-none',
                  'text-sm text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  'placeholder:text-ink-muted',
                )}
              />
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
                Message preview
              </p>
              <div
                className={cn(
                  'w-full rounded-md border border-line bg-bg-subtle px-3 py-2.5',
                  'text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed',
                  'min-h-[100px]',
                )}
              >
                {interpolatedBody}
              </div>
            </div>
          )}
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
