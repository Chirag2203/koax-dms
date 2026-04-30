/**
 * /inventory-aging — Inventory Aging + Pricing Intelligence report.
 *
 * Lists all ACTIVE listings sorted by days-listed desc, grouped by aging band.
 * R10+ can apply suggested price drops via an AlertDialog.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001 §7 (Reports view)
 */

import type { Metadata } from 'next';
import { InventoryAgingView } from '@/src/components/inventory-aging/inventory-aging-view';

export const metadata: Metadata = {
  title: 'Inventory Aging — BN Automobiles DMS',
};

export default function InventoryAgingPage() {
  return <InventoryAgingView />;
}
