// ─── AI Call Templates ────────────────────────────────────────────────────────
// Keyed by call intent. Used by AiCallDialog stage 3 summary.

export type CallSentiment = 'positive' | 'neutral' | 'follow-up';

export interface AiCallTemplate {
  summary: (ctx: { customerName: string; vehicleName?: string }) => string;
  actionItems: (ctx: { customerName: string; vehicleName?: string }) => string[];
  duration: string;
  sentiment: CallSentiment;
}

export const AI_CALL_TEMPLATES: Record<string, AiCallTemplate> = {
  introduction: {
    summary: (ctx) =>
      `Introduced BN Automobiles and our curated pre-owned collection to ${ctx.customerName}. Customer showed initial interest in luxury SUVs and agreed to share preferences via email.`,
    actionItems: () => [
      'Share brochure of top 3 SUVs',
      'Follow up in 3 days',
      'Add to priority contact list',
    ],
    duration: '2m 48s',
    sentiment: 'neutral',
  },
  'vehicle-details': {
    summary: (ctx) =>
      `Discussed pricing, features, and condition of the ${ctx.vehicleName ?? 'vehicle'}. Customer asked about EMI options and delivery timeline. Open to scheduling a viewing.`,
    actionItems: (ctx) => [
      'Share detailed spec sheet (PDF)',
      'Prepare EMI options: 48-60 months',
      `Offer weekend viewing for ${ctx.vehicleName ?? 'the vehicle'}`,
    ],
    duration: '4m 12s',
    sentiment: 'positive',
  },
  'test-drive': {
    summary: (ctx) =>
      `Customer confirmed interest in test-driving the ${ctx.vehicleName ?? 'vehicle'}. Booked a slot for Saturday 10:00 AM at Bangalore outlet. Requested driving licence copy to be ready on arrival.`,
    actionItems: () => [
      'Schedule: Saturday 10:00 AM BLR outlet',
      'Send location pin + parking instructions',
      'Assign advisor: Priya S.',
    ],
    duration: '3m 24s',
    sentiment: 'positive',
  },
  'follow-up': {
    summary: (ctx) =>
      `Followed up with ${ctx.customerName} regarding their recent enquiry. Customer is still evaluating options with family. Agreed to share a no-obligation pricing comparison.`,
    actionItems: () => [
      'Share pricing comparison with 2 alternatives',
      'Check back in 1 week',
      'Note: family decision in progress',
    ],
    duration: '2m 15s',
    sentiment: 'neutral',
  },
  'kyc-request': {
    summary: (ctx) =>
      `Requested KYC documents (PAN + Aadhaar) from ${ctx.customerName}. Customer was hesitant about sharing via email — prefers in-person at outlet. Offered secure upload portal as alternative.`,
    actionItems: () => [
      'Send secure upload portal link via WhatsApp',
      'Offer in-person document collection at outlet',
      'Reschedule if not submitted in 48h',
    ],
    duration: '3m 45s',
    sentiment: 'follow-up',
  },
  feedback: {
    summary: (ctx) =>
      `Collected post-delivery feedback from ${ctx.customerName}. Overall experience rated 9/10. Customer highlighted quality of paperwork handling. Minor suggestion: faster pickup scheduling.`,
    actionItems: () => [
      'Add testimonial to CRM (with consent)',
      'Share feedback with delivery team',
      'Send thank-you note + service reminder',
    ],
    duration: '2m 58s',
    sentiment: 'positive',
  },
  custom: {
    summary: () => 'Custom AI call completed. Review transcript and summary.',
    actionItems: () => [
      'Review call transcript',
      'Update deal notes manually',
    ],
    duration: '3m 00s',
    sentiment: 'neutral',
  },
};
