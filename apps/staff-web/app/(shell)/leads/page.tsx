/**
 * /leads — Kanban board + list view toggle.
 *
 * SPEC-LEADS-001 §8, §9.1
 */

import { LeadsBoard } from '@/src/components/leads/leads-board';

export const metadata = { title: 'Leads — BN DMS' };

export default function LeadsPage() {
  return <LeadsBoard />;
}
