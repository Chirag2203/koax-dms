/**
 * Insurance analytics — typed wrappers over the shared analytics layer.
 *
 * In v1, events are forwarded to `src/lib/analytics.ts` `track()` which pushes
 * to `window.__bn_analytics` and console.debug's them. Production wiring
 * (Segment / Amplitude / etc.) is deferred — the call sites exist so wiring is
 * a one-file change.
 *
 * Five required events per spec §11:
 *   insurance_lead_created
 *   insurance_quote_generated
 *   insurance_quote_shared
 *   insurance_lead_closed_won
 *   insurance_lead_closed_lost
 *
 * Spec reference: SPEC-INSURANCE-001 §11
 */

import { track } from '@/src/lib/analytics';

// ─── Event name catalogue ─────────────────────────────────────────────────────

export type InsuranceAnalyticsEventName =
  | 'insurance_lead_created'
  | 'insurance_quote_generated'
  | 'insurance_quote_shared'
  | 'insurance_lead_closed_won'
  | 'insurance_lead_closed_lost';

// ─── Per-event payload types ──────────────────────────────────────────────────

export interface InsuranceLeadCreatedPayload {
  leadId: string;
  vin: string;
  customerId: string;
  outlet: string;
  actorId: string;
}

export interface InsuranceQuoteGeneratedPayload {
  leadId: string;
  quoteId: string;
  providerId: string;
  totalPremium: number;
  actorId: string;
}

export interface InsuranceQuoteSharedPayload {
  leadId: string;
  quoteId: string;
  shareToken: string;
  shareTokenExpiresAt: string;
  actorId: string;
}

export interface InsuranceLeadClosedWonPayload {
  leadId: string;
  actorId: string;
  policyNumber?: string;
  quoteId?: string;
}

export interface InsuranceLeadClosedLostPayload {
  leadId: string;
  actorId: string;
  reason: string;
}

// ─── Overloaded track signatures ──────────────────────────────────────────────

export function trackInsuranceEvent(
  eventName: 'insurance_lead_created',
  payload: InsuranceLeadCreatedPayload,
): void;
export function trackInsuranceEvent(
  eventName: 'insurance_quote_generated',
  payload: InsuranceQuoteGeneratedPayload,
): void;
export function trackInsuranceEvent(
  eventName: 'insurance_quote_shared',
  payload: InsuranceQuoteSharedPayload,
): void;
export function trackInsuranceEvent(
  eventName: 'insurance_lead_closed_won',
  payload: InsuranceLeadClosedWonPayload,
): void;
export function trackInsuranceEvent(
  eventName: 'insurance_lead_closed_lost',
  payload: InsuranceLeadClosedLostPayload,
): void;

// ─── Implementation ───────────────────────────────────────────────────────────

export function trackInsuranceEvent(
  eventName: InsuranceAnalyticsEventName,
  payload:
    | InsuranceLeadCreatedPayload
    | InsuranceQuoteGeneratedPayload
    | InsuranceQuoteSharedPayload
    | InsuranceLeadClosedWonPayload
    | InsuranceLeadClosedLostPayload,
): void {
  // Delegate to the shared analytics layer.
  // Double-cast via unknown is required since our payload interfaces do not
  // carry an index signature. Safe: all fields are string-keyed primitives.
  track(eventName, payload as unknown as Record<string, unknown>);
}
