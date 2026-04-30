/**
 * /leads/[id] — Lead detail page.
 *
 * SPEC-LEADS-001 §8, §9.2
 */

import { LeadDetailPage } from '@/src/components/leads/lead-detail-page';

export const metadata = { title: 'Lead Detail — BN DMS' };

export default function Page({ params }: { params: { id: string } }) {
  return <LeadDetailPage leadId={params.id} />;
}
