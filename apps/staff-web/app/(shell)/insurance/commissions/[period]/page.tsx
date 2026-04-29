import { CommissionPeriodView } from '@/src/components/insurance/commission-period-view';

export default function CommissionPeriodPage({ params }: { params: { period: string } }) {
  return <CommissionPeriodView periodId={params.period} />;
}
