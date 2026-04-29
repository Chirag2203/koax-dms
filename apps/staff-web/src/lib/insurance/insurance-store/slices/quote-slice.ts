/**
 * Insurance quote slice.
 *
 * Handles comparison computation, quote save, discount, share token.
 * L18: discount > 10% requires R12+ (throws R12RequiredError).
 * L6: share token TTL = 7 days.
 *
 * Spec reference: SPEC-INSURANCE-001 §5.1, §6, L18, L6
 */

import type { InsuranceQuote } from '@dms/types';
import { buildQuotes, sortQuotes } from '../../comparison';
import type { InsuranceSlice, QuoteActions, VehicleInput, CustomerInput, StoreActor } from '../types';
import { R12RequiredError } from '../types';
import { trackInsuranceEvent } from '@/src/lib/insurance/analytics';

// Role rank map for R12 gate
const ROLE_RANK: Record<string, number> = {
  R09: 9, R10: 10, R11: 11, R12: 12, R13: 13,
  R19: 19, R22: 22, R24: 24,
};

function rank(role: string): number {
  const explicit = ROLE_RANK[role];
  if (explicit !== undefined) return explicit;
  return parseInt(role.replace('R', ''), 10) || 0;
}

export const createQuoteSlice: InsuranceSlice<QuoteActions> = (set, get) => ({
  computeComparison(vehicleInput: VehicleInput, customerInput: CustomerInput): InsuranceQuote[] {
    const providers = get().providers;
    const quotes = buildQuotes(vehicleInput, customerInput, providers, 'temp-lead');
    return sortQuotes(quotes, 'total', providers);
  },

  saveQuote(leadId: string, quote: InsuranceQuote): InsuranceQuote {
    const now = new Date().toISOString();
    const saved: InsuranceQuote = {
      ...quote,
      leadId,
      generatedAt: now,
      status: 'active',
    };

    set((state) => {
      const lead = state.leads.find((l) => l.leadId === leadId);
      if (!lead) throw new Error(`Lead not found: ${leadId}`);
      lead.quotes.push(saved);
      lead.stage = 'quoted';
      lead.updatedAt = now;
    });

    // §11: analytics event — quote generated
    trackInsuranceEvent('insurance_quote_generated', {
      leadId,
      quoteId: saved.quoteId,
      providerId: saved.providerId,
      totalPremium: saved.totalPremium,
      actorId: 'system', // saveQuote does not take an actor param; system-level
    });

    return saved;
  },

  /**
   * L18 / B6: discount > 10% requires R12+ approval.
   * Throws R12RequiredError if actor role is below R12.
   */
  applyDiscount(quoteId: string, pct: number, actor: StoreActor): InsuranceQuote {
    if (pct > 10 && rank(actor.role) < 12) {
      throw new R12RequiredError(pct);
    }

    let updated: InsuranceQuote | undefined;

    set((state) => {
      for (const lead of state.leads) {
        const q = lead.quotes.find((q) => q.quoteId === quoteId);
        if (q) {
          q.discountPct = pct;
          // Record approval ref when > 10%
          if (pct > 10) {
            q.discountApprovalRefId = actor.id;
          }
          // Adjust total premium by discount
          const base = q.ownDamagePremium + q.thirdPartyPremium;
          q.totalPremium = Math.round(base * (1 - pct / 100));
          updated = { ...q };
          lead.updatedAt = new Date().toISOString();
          break;
        }
      }
    });

    if (!updated) throw new Error(`Quote not found: ${quoteId}`);
    return updated;
  },

  /**
   * Generate a share token for a quote. L6: TTL = 7 days.
   */
  generateShareToken(quoteId: string): { token: string; expiresAt: string } {
    const token = `share-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    set((state) => {
      for (const lead of state.leads) {
        const q = lead.quotes.find((q) => q.quoteId === quoteId);
        if (q) {
          q.shareToken = token;
          q.shareTokenExpiresAt = expiresAt;
          q.status = 'shared';
          lead.updatedAt = new Date().toISOString();
          break;
        }
      }
    });

    // §11: analytics event — quote shared
    // Find the lead for this quote to populate leadId in the event
    const leadForQuote = get().leads.find((l) => l.quotes.some((q) => q.quoteId === quoteId));
    if (leadForQuote) {
      trackInsuranceEvent('insurance_quote_shared', {
        leadId: leadForQuote.leadId,
        quoteId,
        shareToken: token,
        shareTokenExpiresAt: expiresAt,
        actorId: 'system',
      });
    }

    return { token, expiresAt };
  },

  /**
   * Look up a quote by its share token.
   * Returns 'expired' if TTL passed, 'not-found' if token not matched.
   */
  getQuoteByToken(token: string): InsuranceQuote | 'expired' | 'not-found' {
    for (const lead of get().leads) {
      const q = lead.quotes.find((q) => q.shareToken === token);
      if (!q) continue;
      if (!q.shareTokenExpiresAt) return 'expired';
      if (new Date(q.shareTokenExpiresAt) < new Date()) return 'expired';
      return q;
    }
    return 'not-found';
  },
});
