/**
 * /inventory-aging — Inventory Aging + Pricing Intelligence report.
 *
 * Lists all ACTIVE listings sorted by days-listed desc, grouped by aging band.
 * R10+ can apply suggested price drops via an AlertDialog.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001 §7 (Reports view)
 */

import type { Metadata } from 'next';
import { AgingView } from '@/src/components/sales/aging/aging-view';

export const metadata: Metadata = {
  title: 'Inventory Aging — BN Automobiles DMS',
};

export default function InventoryAgingPage() {
  return <AgingView />;
}
