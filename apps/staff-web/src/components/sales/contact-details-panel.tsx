'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy, Phone, MessageCircle, Mail } from 'lucide-react';
import { cn } from '@dms/ui';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactDetailsPanelProps {
  customerName: string;
  customerPhone: string; // full format like "+91 98765 43210"
  customerEmail?: string;
  city: string;
  outlet: string;
  onOpenWhatsapp?: () => void;
}

// ─── PII helpers ──────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  // Keep last 4 digits visible, mask the rest (after country prefix)
  // e.g. "+91 98765 43210" → "+91 9•••• ••210"
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  // Reconstruct with masked middle
  const prefix = phone.startsWith('+91') ? '+91' : '';
  const rest = digits.slice(prefix ? 2 : 0, -4);
  const masked = rest.replace(/./g, '•');
  // Format similar to original spacing
  if (prefix) {
    // "+91 9•••• ••210"
    const maskedSection = masked.length > 0 ? ' ' + masked.slice(0, 1) + '•'.repeat(Math.max(0, masked.length - 1)) : '';
    return `${prefix}${maskedSection} ••${last4.slice(0, 3)}${last4.slice(3)}`;
  }
  return `••••••${last4}`;
}

function maskEmail(email: string): string {
  // Show first char + ••• + @domain — e.g. v•••@gmail.com
  const atIdx = email.indexOf('@');
  if (atIdx <= 0) return email;
  const localPart = email.slice(0, atIdx);
  const domain = email.slice(atIdx); // includes @
  return `${localPart.slice(0, 1)}•••${domain}`;
}

function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactDetailsPanel({
  customerName,
  customerPhone,
  customerEmail,
  city,
  outlet,
  onOpenWhatsapp,
}: ContactDetailsPanelProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // R05 = Sales Associate — default masked; R10+ default unmasked
  const roleNum = user ? parseInt(user.role.replace('R', ''), 10) : 10;
  const defaultUnmasked = roleNum >= 10;
  const [showPii, setShowPii] = useState(defaultUnmasked);

  const displayPhone = showPii ? customerPhone : maskPhone(customerPhone);
  const displayEmail = customerEmail
    ? showPii
      ? customerEmail
      : maskEmail(customerEmail)
    : undefined;

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(phoneDigitsOnly(customerPhone));
      toast('Phone copied', 'success');
    } catch {
      toast('Could not copy', 'error');
    }
  }

  async function copyEmail() {
    if (!customerEmail) return;
    try {
      await navigator.clipboard.writeText(customerEmail);
      toast('Copied to clipboard', 'success');
    } catch {
      toast('Could not copy', 'error');
    }
  }

  const cityDisplay =
    city.charAt(0).toUpperCase() + city.slice(1);
  const outletDisplay = outlet.toUpperCase();

  return (
    <>
      <div className="rounded-md border border-line bg-bg-surface p-4">
        {/* Title row */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-ink-primary">Contact Details</h3>
          <button
            type="button"
            onClick={() => setShowPii((v) => !v)}
            aria-label={showPii ? 'Hide details' : 'Show details'}
            title={showPii ? 'Hide details' : 'Show details'}
            className={cn(
              'inline-flex items-center justify-center h-7 w-7 rounded-md',
              'text-ink-muted hover:text-ink-primary hover:bg-bg-hover',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            {showPii ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Phone row */}
        <div className="flex items-center justify-between py-2 border-t border-line">
          <span className="text-xs uppercase tracking-wide text-ink-muted">Phone</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm text-ink-primary tabular-nums">
              {displayPhone}
            </span>
            {/* Copy phone */}
            <button
              type="button"
              onClick={copyPhone}
              aria-label="Copy phone"
              title="Copy phone"
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-md',
                'text-ink-muted hover:text-ink-primary hover:bg-bg-hover',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {/* Call */}
            <a
              href={`tel:${phoneDigitsOnly(customerPhone)}`}
              aria-label="Call now"
              title="Call now"
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-md',
                'text-ink-muted hover:text-ink-primary hover:bg-bg-hover',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            {/* WhatsApp */}
            <button
              type="button"
              onClick={onOpenWhatsapp}
              aria-label="Open WhatsApp"
              title="Open WhatsApp"
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-md',
                'text-[#25D366] hover:text-[#1ebe57] hover:bg-bg-hover',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Email row */}
        {customerEmail && (
          <div className="flex items-center justify-between py-2 border-t border-line">
            <span className="text-xs uppercase tracking-wide text-ink-muted">Email</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm text-ink-primary">
                {displayEmail}
              </span>
              {/* Copy email */}
              <button
                type="button"
                onClick={copyEmail}
                aria-label="Copy email"
                title="Copy email"
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-md',
                  'text-ink-muted hover:text-ink-primary hover:bg-bg-hover',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {/* Send email */}
              <a
                href={`mailto:${customerEmail}`}
                aria-label="Send email"
                title="Send email"
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-md',
                  'text-ink-muted hover:text-ink-primary hover:bg-bg-hover',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}

        {/* City / Outlet row */}
        <div className="flex items-center justify-between py-2 border-t border-line">
          <span className="text-xs uppercase tracking-wide text-ink-muted">Location</span>
          <span className="font-mono text-sm text-ink-primary">
            {cityDisplay} &middot; {outletDisplay}
          </span>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
