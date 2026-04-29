import { LeadDetailView } from '@/src/components/insurance/lead-detail-view';

interface Props {
  params: { id: string };
}

export default function LeadDetailPage({ params }: Props) {
  return <LeadDetailView leadId={params.id} />;
}
