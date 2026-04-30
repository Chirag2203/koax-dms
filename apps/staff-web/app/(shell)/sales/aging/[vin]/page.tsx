/**
 * /inventory-aging/[vin] — per-VIN aging drill-down.
 *
 * Shows: price-change history, competitor data, margin trace.
 * Read-only — no store actions on this page.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001 §7 (Drill-down)
 */

import type { Metadata } from 'next';
import { AgingDrillDownView } from '@/src/components/sales/aging/aging-drill-down-view';

export const metadata: Metadata = {
  title: 'Aging Detail — BN Automobiles DMS',
};

export default function AgingVinPage({ params }: { params: { vin: string } }) {
  return <AgingDrillDownView vin={params.vin} />;
}
