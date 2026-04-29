import { CampaignDetailView } from '@/src/components/insurance/campaign-detail-view';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return <CampaignDetailView campaignId={params.id} />;
}
