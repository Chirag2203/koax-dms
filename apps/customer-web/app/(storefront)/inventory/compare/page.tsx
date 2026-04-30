/**
 * /inventory/compare — side-by-side vehicle comparison page.
 *
 * Reads VINs from ?vins=VIN1,VIN2,VIN3 query param.
 * Renders the CompareView client component.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 S10, S11
 */

import * as React from 'react';
import type { Metadata } from 'next';
import { CompareView } from '@/src/components/storefront/compare/compare-view';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Compare Vehicles | BN Automobiles',
  description: 'Compare up to three pre-owned luxury vehicles side by side — specifications, pricing, and history.',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ vins?: string }>;
}) {
  const params = await searchParams;
  const vins = (params.vins ?? '').split(',').filter(Boolean).slice(0, 3);

  return (
    <React.Suspense>
      <CompareView initialVins={vins} />
    </React.Suspense>
  );
}
