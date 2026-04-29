/**
 * CustomBuildsStoreHydrator
 *
 * Client-only component that seeds the Zustand custom-builds store from
 * fixtures on first client mount, preventing SSR/hydration mismatches.
 *
 * Also back-fills the vehicles-store cost ledger for any fixture build jobs
 * that are already DELIVERED but have no costLedgerWriteRef (i.e. their
 * cost entries were pre-computed and baked into the fixture rather than written
 * by a real deliverJob call). This ensures:
 *
 *   1. The Custom Builds cost-ledger tab shows LedgerTable (not LedgerPreview)
 *      for delivered fixture jobs.
 *   2. The /inventory/[vin] cost-ledger tab includes custom-build write-back
 *      entries for vehicles that have delivered builds.
 *
 * Mount once inside the /custom-builds route tree layout.
 * The vehicles-store must also be hydrated (VehiclesStoreHydrator) in the
 * same layout — both are idempotent.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §14, L39/L40
 */

'use client';

import { useEffect } from 'react';
import {
  buildJobs,
  aftermarketParts,
  buildVendors,
} from '@dms/mocks/fixtures';
import { useCustomBuildsStore } from './custom-builds-store';
import { useVehiclesStore } from '../vehicles/vehicles-store';
import { computeGstBreakdown } from './gst-breakdown';
import type { CostLedgerEntry } from '@dms/types';

// ─── System actor for fixture seed writes ────────────────────────────────────

const FIXTURE_ACTOR_ID = 'system-fixture-seed';

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomBuildsStoreHydrator() {
  useEffect(() => {
    const cbStore = useCustomBuildsStore.getState();
    if (cbStore.hydrated) return;

    // Seed custom-builds store
    cbStore.hydrate(buildJobs, aftermarketParts, buildVendors);

    // Back-fill vehicles-store cost ledger for DELIVERED fixture jobs that
    // have no costLedgerWriteRef (L39). These jobs were delivered "in the
    // fixture world" — their 3 cost entries never ran through deliverJob().
    const vehiclesStore = useVehiclesStore.getState();
    const vendors = buildVendors;

    for (const job of buildJobs) {
      if (job.stage !== 'DELIVERED') continue;
      if (job.costLedgerWriteRef) continue; // already has a write ref — skip

      const partsSubtotal = job.parts.reduce((s, p) => s + p.unitCost * p.qty, 0);
      const totalHours = job.parts.reduce((s, p) => s + p.installHours * p.qty, 0);
      const vendor = vendors.find((v) => v.id === job.vendorId);
      const vendorLabour = vendor ? Math.round((totalHours / 8) * vendor.dayRate) : 0;
      const marginPct = job.marginPct ?? 15;

      const breakdown = computeGstBreakdown({
        partsSubtotal,
        partsListPriceSum: partsSubtotal,
        vendorLabour,
        marginPct,
      });

      const deliveredAt = job.deliveredAt ?? job.updatedAt;
      const dateStr = deliveredAt.split('T')[0]!;

      const entries: CostLedgerEntry[] = [
        {
          id: `CLE-CB-P-${job.id}`,
          vin: job.vin,
          category: 'custom-build-parts',
          date: dateStr,
          amount: Math.round(breakdown.partsCostBN),
          note: `Custom build parts: ${job.title}`,
          addedBy: FIXTURE_ACTOR_ID,
          addedAt: deliveredAt,
        },
        {
          id: `CLE-CB-L-${job.id}`,
          vin: job.vin,
          category: 'custom-build-labour',
          date: dateStr,
          amount: Math.round(breakdown.vendorLabour + breakdown.gstOnLabour),
          note: `Vendor labour + GST: ${vendor?.name ?? 'vendor'}`,
          addedBy: FIXTURE_ACTOR_ID,
          addedAt: deliveredAt,
        },
        {
          id: `CLE-CB-F-${job.id}`,
          vin: job.vin,
          category: 'custom-build-vendor-fee',
          date: dateStr,
          amount: Math.round(breakdown.bnMargin),
          note: `BN margin on build ${job.id}`,
          addedBy: FIXTURE_ACTOR_ID,
          addedAt: deliveredAt,
        },
      ];

      vehiclesStore.addCostLedgerEntries(job.vin, entries);
    }
  }, []);

  return null;
}
