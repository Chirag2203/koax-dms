/**
 * SavedQuoteView — quote detail with share/PDF actions.
 *
 * Gate: R09+
 * Spec reference: SPEC-INSURANCE-001 §5.1
 */

'use client';

import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';
import { QuoteCard } from './quote-card';
import { Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  quoteId: string;
}

export function SavedQuoteView({ quoteId }: Props) {
  const leads = useInsuranceStore((s) => s.leads);
  const providers = useInsuranceStore((s) => s.providers);
  const generateShareToken = useInsuranceStore((s) => s.generateShareToken);

  // Find quote across all leads
  let foundQuote = null;
  let foundLead = null;
  for (const lead of leads) {
    const q = lead.quotes.find((q) => q.quoteId === quoteId);
    if (q) {
      foundQuote = q;
      foundLead = lead;
      break;
    }
  }

  if (!foundQuote || !foundLead) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-[15px] text-ink-muted">Quote not found.</p>
        <Link href="/insurance" className="mt-4 text-accent hover:underline text-[13px]">Back</Link>
      </div>
    );
  }

  const provider = providers.find((p) => p.id === foundQuote!.providerId);

  const handleShare = () => {
    const result = generateShareToken(quoteId);
    const url = `${window.location.origin}/quote-preview/${result.token}`;
    void navigator.clipboard?.writeText(url);
    alert(`Share URL copied to clipboard (expires ${new Date(result.expiresAt).toLocaleDateString('en-IN')})`);
  };

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <Link href={`/insurance/leads/${foundLead.leadId}`} aria-label="Back to lead">
              <ArrowLeft size={18} className="text-ink-muted" />
            </Link>
            <div>
              <h1 className="text-[22px] font-semibold text-ink-primary">Quote Detail</h1>
              <p className="text-[13px] text-ink-muted mt-0.5">Lead: {foundLead.vin}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Share quote via link"
          >
            <Share2 size={15} aria-hidden="true" />
            Share Quote
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-w-lg">
          {provider ? (
            <QuoteCard provider={provider} quote={foundQuote} />
          ) : (
            <p className="text-[13px] text-ink-muted">Provider not found.</p>
          )}

          {foundQuote.shareToken && (
            <div className="mt-4 rounded-lg border border-line bg-bg-subtle p-3">
              <p className="text-[12px] text-ink-muted">
                Share link active · expires{' '}
                {foundQuote.shareTokenExpiresAt
                  ? new Date(foundQuote.shareTokenExpiresAt).toLocaleDateString('en-IN')
                  : '—'}
              </p>
              <p className="font-mono text-[11px] text-ink-secondary mt-1 truncate">
                /quote-preview/{foundQuote.shareToken}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-[11px] text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Insurance is the subject matter of solicitation.
          </p>
        </div>
      </div>
    </Gate>
  );
}
