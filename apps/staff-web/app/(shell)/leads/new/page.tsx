/**
 * /leads/new — New lead capture form.
 *
 * SPEC-LEADS-001 §8, §9.3
 * L4: Walk-in form is staff-only (R05+).
 */

import { NewLeadPage } from '@/src/components/leads/new-lead-page';

export const metadata = { title: 'New Lead — BN DMS' };

export default function Page() {
  return <NewLeadPage />;
}
