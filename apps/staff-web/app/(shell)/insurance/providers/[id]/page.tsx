import { ProviderDetailView } from '@/src/components/insurance/provider-detail-view';

interface Props {
  params: { id: string };
}

export default function ProviderDetailPage({ params }: Props) {
  return <ProviderDetailView providerId={params.id} />;
}
