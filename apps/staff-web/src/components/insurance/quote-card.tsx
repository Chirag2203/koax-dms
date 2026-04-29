/**
 * QuoteCard — IRDAI fail-closed (L16 / B4).
 *
 * Returns null + console.error if irdaiRegNo or claimSettlementRatio
 * are missing from provider. Enforced via QuoteCardPropsSchema (Zod).
 *
 * Spec reference: SPEC-INSURANCE-001 §13, L2, L16
 */

'use client';

import { QuoteCardPropsSchema } from '@dms/types';
import type { InsuranceProvider, InsuranceQuote } from '@dms/types';
import { cn } from '@dms/ui';
import { ShieldCheck, Wrench, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteCardProps {
  provider: InsuranceProvider;
  quote: InsuranceQuote;
  onAddonChange?: (quoteId: string, addon: string, selected: boolean) => void;
  isSelected?: boolean;
  onSelect?: (quoteId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteCard({ provider, quote, onAddonChange, isSelected, onSelect }: QuoteCardProps) {
  const [addonsExpanded, setAddonsExpanded] = useState(false);

  // L16 / B4: fail-closed IRDAI disclosure validation
  const validation = QuoteCardPropsSchema.safeParse({ provider, quote });
  if (!validation.success) {
    console.error(
      '[IRDAI disclosure failure] QuoteCard: missing required IRDAI fields (irdaiRegNo or claimSettlementRatio). Component will not render.',
      { providerId: provider.id, errors: validation.error.flatten() },
    );
    return null;
  }

  // Additional explicit checks for L16 (empty string = invalid)
  if (!provider.irdaiRegNo || provider.claimSettlementRatio === undefined || provider.claimSettlementRatio === null) {
    console.error(
      '[IRDAI disclosure failure] QuoteCard: irdaiRegNo is empty or claimSettlementRatio is missing.',
      { providerId: provider.id },
    );
    return null;
  }

  const availableAddons = provider.addonCatalog.filter((a) => a.available);

  return (
    <div
      className={cn(
        'rounded-lg border bg-bg-surface transition-colors duration-150',
        isSelected ? 'border-accent' : 'border-line hover:border-line-strong',
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-bg-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={provider.logoUrl}
              alt={`${provider.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-ink-primary leading-tight">{provider.name}</h3>
            {/* L2: IRDAI reg no mandatory on every quote card */}
            <p className="text-[11px] text-ink-muted mt-0.5">
              IRDAI Reg No. <span className="font-mono text-ink-secondary">{provider.irdaiRegNo}</span>
            </p>
          </div>
        </div>
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(quote.quoteId)}
            aria-pressed={isSelected}
            className={cn(
              'text-[13px] font-medium px-3 py-1.5 rounded-md border transition-colors',
              isSelected
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-subtle text-ink-secondary border-line hover:bg-bg-hover',
            )}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px bg-line mx-4 rounded-md overflow-hidden mb-4">
        <div className="bg-bg-surface px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <TrendingUp size={12} className="text-success" aria-hidden="true" />
            {/* L2: CSR mandatory */}
            <span className="text-[13px] font-semibold text-ink-primary">{provider.claimSettlementRatio}%</span>
          </div>
          <p className="text-[10px] text-ink-muted" title="Source: IRDAI Annual Report FY24">Claim Settlement</p>
        </div>
        <div className="bg-bg-surface px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Wrench size={12} className="text-ink-muted" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-ink-primary">{provider.networkGaragesCount.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-[10px] text-ink-muted">Network Garages</p>
        </div>
        <div className="bg-bg-surface px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <ShieldCheck size={12} className="text-accent" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-ink-primary">{fmt(quote.idv)}</span>
          </div>
          <p className="text-[10px] text-ink-muted">IDV</p>
        </div>
      </div>

      {/* ── Premium breakdown ───────────────────────────────────────────── */}
      <div className="px-4 pb-3 space-y-1.5 text-[13px]">
        <div className="flex justify-between text-ink-secondary">
          <span>Own Damage</span>
          <span>{fmt(quote.ownDamagePremium)}</span>
        </div>
        <div className="flex justify-between text-ink-secondary">
          <span>Third Party</span>
          <span>{fmt(quote.thirdPartyPremium)}</span>
        </div>
        {quote.ncbApplied > 0 && (
          <div className="flex justify-between text-success">
            <span>NCB Discount ({quote.ncbPct}%)</span>
            <span>- {fmt(quote.ncbApplied)}</span>
          </div>
        )}
        {quote.discountPct !== undefined && quote.discountPct > 0 && (
          <div className="flex justify-between text-success">
            <span>Discount ({quote.discountPct}%)</span>
            <span className="text-[11px] text-ink-muted ml-1">{quote.discountApprovalRefId ? 'R12 approved' : ''}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-ink-primary border-t border-line pt-1.5 mt-1.5">
          <span>Total Premium</span>
          <span className="text-[15px]">{fmt(quote.totalPremium)}</span>
        </div>
      </div>

      {/* ── Addon section ───────────────────────────────────────────────── */}
      {availableAddons.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={() => setAddonsExpanded((e) => !e)}
            className="flex items-center gap-1 text-[12px] font-medium text-ink-secondary hover:text-ink-primary transition-colors"
            aria-expanded={addonsExpanded}
          >
            {addonsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Addons ({quote.selectedAddons.length} selected)
          </button>

          {addonsExpanded && (
            <div className="mt-2 space-y-1.5">
              {availableAddons.map((addon) => {
                const isChecked = quote.selectedAddons.includes(addon.code);
                return (
                  <label
                    key={addon.code}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => onAddonChange?.(quote.quoteId, addon.code, e.target.checked)}
                      className="w-4 h-4 rounded accent-accent"
                      aria-label={addon.label}
                    />
                    <span className="text-[12px] text-ink-secondary group-hover:text-ink-primary">
                      {addon.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Deductible note ─────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <p className="text-[11px] text-ink-muted">
          Compulsory deductible: {fmt(quote.deductible)}
        </p>
      </div>
    </div>
  );
}
