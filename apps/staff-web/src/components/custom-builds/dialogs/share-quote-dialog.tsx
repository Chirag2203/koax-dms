/**
 * ShareQuoteDialog — share the build quote with a customer.
 *
 * Shows share URL + Copy button + WhatsApp deep-link + Email button.
 * Includes expiry date.
 *
 * WhatsApp and Email buttons are stubs (deep-links fired via window.open /
 * mailto href — no backend integration in P2).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6 Tab 2, P2 Task 3.5
 */

'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle, Mail, X } from 'lucide-react';
import type { BuildJob } from '@dms/types';

interface ShareQuoteDialogProps {
  open: boolean;
  job: BuildJob;
  onClose: () => void;
}

export function ShareQuoteDialog({ open, job, onClose }: ShareQuoteDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const token = job.quoteToken;
  const shareUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/custom-builds/preview/${token}`
    : null;

  const expiryLabel = job.quoteExpiresAt
    ? new Date(job.quoteExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
    }
  };

  const handleWhatsApp = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(
      `Hi, here is your custom build quote from BN Automobiles: ${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    if (!shareUrl) return;
    const subject = encodeURIComponent(`Your Custom Build Quote — BN Automobiles`);
    const body = encodeURIComponent(
      `Dear Customer,\n\nPlease find your custom build quote here:\n${shareUrl}\n\nThis link is valid until ${expiryLabel ?? '14 days from issue'}.\n\nRegards,\nBN Automobiles`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share quote with customer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-bg-canvas rounded-xl border border-line shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink-primary">Share with Customer</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {!token ? (
          <p className="text-[13px] text-ink-muted">
            No quote saved yet. Use &quot;Save as Quote&quot; to generate a shareable link.
          </p>
        ) : (
          <>
            {/* Share URL */}
            <div className="space-y-2">
              <label htmlFor="share-url" className="text-[12px] font-medium text-ink-secondary">
                Share link
              </label>
              <div className="flex gap-2">
                <input
                  id="share-url"
                  type="text"
                  readOnly
                  value={shareUrl ?? ''}
                  className="flex-1 h-9 px-3 rounded-lg border border-line bg-bg-subtle font-mono text-[11px] text-ink-primary focus:outline-none select-all"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={copied ? 'Copied!' : 'Copy link'}
                  className="h-9 px-3 rounded-lg border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent flex items-center gap-1.5 text-[12px]"
                >
                  {copied ? (
                    <Check size={14} className="text-state-success" aria-hidden="true" />
                  ) : (
                    <Copy size={14} aria-hidden="true" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Expiry badge */}
            {expiryLabel && (
              <p className="text-[12px] text-ink-muted">
                Expires on{' '}
                <span className="font-medium text-ink-secondary">{expiryLabel}</span>
              </p>
            )}

            {/* Share actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] text-white text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
              >
                <MessageCircle size={15} aria-hidden="true" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={handleEmail}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-hover text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <Mail size={15} aria-hidden="true" />
                Email
              </button>
            </div>

            <p className="text-[11px] text-ink-muted italic">
              WhatsApp and Email open your default app. No message is sent automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
