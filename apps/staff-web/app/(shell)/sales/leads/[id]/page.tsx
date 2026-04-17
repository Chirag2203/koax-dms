import { notFound } from 'next/navigation';
import { deals, interactions, kycStatuses } from '@dms/mocks/fixtures';
import { EnquiryDetailView } from '@/src/components/sales/enquiry-detail-view';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EnquiryDetailPage({ params }: PageProps) {
  const deal = deals.find((d) => d.id === params.id);

  if (!deal) {
    notFound();
  }

  const dealInteractions = interactions.filter((i) => i.dealId === params.id);
  const kyc = kycStatuses.find((k) => k.dealId === params.id) ?? null;

  return (
    <EnquiryDetailView
      deal={deal}
      interactions={dealInteractions}
      kyc={kyc}
    />
  );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export function generateMetadata({ params }: PageProps) {
  const deal = deals.find((d) => d.id === params.id);
  return {
    title: deal ? `${deal.customerName} — Enquiry` : 'Enquiry Detail',
  };
}
