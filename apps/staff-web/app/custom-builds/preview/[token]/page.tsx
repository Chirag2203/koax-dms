/**
 * Public build quote preview page — /custom-builds/preview/[token]
 *
 * NOT under (shell) layout — no auth required, no sidebar.
 * Light-themed, customer-facing (diverges from staff dark theme per spec §9.6).
 *
 * PII exclusion (L13, §9.6): only job title, vehicle make/model/year (no VIN),
 * parts display names + list prices, quote total.
 * EXCLUDED: customer name/phone/email/address, bnCost, techNotes,
 *           vendor contact details, internal pricing breakdown, activity log.
 *
 * 14-day TTL (L8): quoteExpiresAt < now → QuoteExpiredState.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9.6, L8, L13, P2
 */

import { BuildQuotePreviewView } from '@/src/components/custom-builds/preview/build-quote-preview-view';

interface Props {
  params: { token: string };
}

export default function BuildQuotePreviewPage({ params }: Props) {
  return <BuildQuotePreviewView token={params.token} />;
}
