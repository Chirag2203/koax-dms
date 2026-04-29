/**
 * QuotePreviewView — public shareable quote preview (no auth required).
 *
 * No PII. Token TTL 7 days (L6). Renders IRDAI-compliant branded layout.
 * BN branding header + comparison table + disclaimer.
 *
 * Spec reference: SPEC-INSURANCE-001 §5.2, L6
 */

'use client';

import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import type { InsuranceQuote, InsuranceProvider } from '@dms/types';
import { ShieldCheck, Phone } from 'lucide-react';

interface Props {
  token: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function QuoteRow({ quote, provider }: { quote: InsuranceQuote; provider: InsuranceProvider }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={provider.logoUrl} alt={provider.name} className="w-16 h-8 object-contain" />
        </div>
        <p className="text-[11px] text-gray-500 mt-1 font-mono">{provider.irdaiRegNo}</p>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-[13px] font-semibold">{provider.claimSettlementRatio}%</span>
        <p className="text-[10px] text-gray-400">CSR</p>
      </td>
      <td className="py-3 px-4 text-right text-[13px]">{fmt(quote.idv)}</td>
      <td className="py-3 px-4 text-right text-[13px]">{fmt(quote.ownDamagePremium)}</td>
      <td className="py-3 px-4 text-right text-[13px]">{fmt(quote.thirdPartyPremium)}</td>
      <td className="py-3 px-4 text-right font-semibold text-[14px]">{fmt(quote.totalPremium)}</td>
    </tr>
  );
}

export function QuotePreviewView({ token }: Props) {
  const getQuoteByToken = useInsuranceStore((s) => s.getQuoteByToken);
  const providers = useInsuranceStore((s) => s.providers);
  const leads = useInsuranceStore((s) => s.leads);

  const result = getQuoteByToken(token);

  if (result === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <ShieldCheck size={48} className="text-gray-300 mb-4" aria-hidden="true" />
        <h1 className="text-[22px] font-semibold text-gray-800 mb-2">Quote Not Found</h1>
        <p className="text-[15px] text-gray-500 text-center max-w-sm">
          This quote link is invalid. Please contact BN Automobiles for a new quote.
        </p>
        <p className="mt-6 text-[13px] text-gray-400">Call us: 1800-XXX-XXXX</p>
      </div>
    );
  }

  if (result === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <ShieldCheck size={48} className="text-gray-300 mb-4" aria-hidden="true" />
        <h1 className="text-[22px] font-semibold text-gray-800 mb-2">This quote has expired.</h1>
        <p className="text-[15px] text-gray-500 text-center max-w-sm">
          This quote link has expired (valid for 7 days). Please contact BN Automobiles for a fresh comparison.
        </p>
        <p className="mt-6 text-[13px] text-gray-400">Call us: 1800-XXX-XXXX</p>
      </div>
    );
  }

  // Find all quotes for the same lead to show full comparison
  const sharedQuote = result as InsuranceQuote;
  const lead = leads.find((l) => l.leadId === sharedQuote.leadId);
  const quotesForDisplay = lead ? lead.quotes : [sharedQuote];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── BN Branding Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">BN Automobiles</h1>
            <p className="text-[12px] text-gray-500">Motor Insurance Comparison</p>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-gray-600">
            <Phone size={15} aria-hidden="true" />
            <span>1800-XXX-XXXX</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Intro ── */}
        <div className="mb-6">
          <h2 className="text-[22px] font-semibold text-gray-800 mb-1">Your Insurance Comparison</h2>
          <p className="text-[13px] text-gray-500">
            This comparison was generated for you by your BN Automobiles advisor.
            Valid until {sharedQuote.shareTokenExpiresAt
              ? new Date(sharedQuote.shareTokenExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'}.
          </p>
        </div>

        {/* ── Comparison table ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <table className="w-full text-[13px]" role="table" aria-label="Insurance quote comparison">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th scope="col" className="text-left py-3 px-4 font-semibold text-gray-700">Provider</th>
                <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">Claim Settlement</th>
                <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">IDV</th>
                <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Own Damage</th>
                <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Third Party</th>
                <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Total Premium</th>
              </tr>
            </thead>
            <tbody>
              {quotesForDisplay.map((quote) => {
                const provider = providers.find((p) => p.id === quote.providerId);
                if (!provider) return null;
                return (
                  <QuoteRow key={quote.quoteId} quote={quote} provider={provider} />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── CTA (no purchase — L1) ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-blue-800">Ready to proceed?</p>
            <p className="text-[12px] text-blue-600">Contact your BN Automobiles advisor to finalise your policy.</p>
          </div>
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <Phone size={16} aria-hidden="true" />
            <span>1800-XXX-XXXX</span>
          </div>
        </div>
      </main>

      {/* ── IRDAI Disclaimer ── */}
      <footer className="border-t border-gray-200 px-6 py-4 bg-white mt-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] text-gray-400">
            BN Automobiles is a registered motor insurance web aggregator (IRDAI Web Aggregator Guidelines 2017). Insurance is the subject matter of solicitation. Claim settlement ratios sourced from IRDAI Annual Report FY24. Premiums shown are indicative; final premium may vary. BN Automobiles does not issue policies directly (IRDAI Web Aggregator Guidelines §8).
          </p>
        </div>
      </footer>
    </div>
  );
}
