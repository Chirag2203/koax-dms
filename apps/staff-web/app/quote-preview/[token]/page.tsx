/**
 * Public shareable quote preview page.
 *
 * NOT under the (shell) layout — no auth required.
 * No PII leaked. Token TTL 7 days enforced client-side (L6).
 *
 * Spec reference: SPEC-INSURANCE-001 §5.2, L6
 */

import { QuotePreviewView } from '@/src/components/insurance/quote-preview-view';

interface Props {
  params: { token: string };
}

export default function QuotePreviewPage({ params }: Props) {
  return <QuotePreviewView token={params.token} />;
}
