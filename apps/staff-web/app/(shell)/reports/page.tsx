/**
 * /reports — Reports & Analytics hub page.
 *
 * Replaces the "Coming soon" stub with the full KPI hub.
 * Gate: R10+ (enforced in ReportsHubView).
 *
 * Spec reference: SPEC-REPORTS-001 §9.1, §20 P1
 */

import type { Metadata } from 'next';
import { ReportsHubView } from '@/src/components/reports/reports-hub-view';

export const metadata: Metadata = {
  title: 'Reports & Analytics — BN Automobiles DMS',
};

export default function ReportsPage() {
  return <ReportsHubView />;
}
