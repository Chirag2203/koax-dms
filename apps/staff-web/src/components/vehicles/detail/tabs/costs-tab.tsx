'use client';

import { IndianRupee } from 'lucide-react';
import type { VehicleMaster } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CostsTabProps {
  vehicle: VehicleMaster;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CostsTab({ vehicle: _vehicle }: CostsTabProps) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
      <div className="flex justify-center mb-3">
        <IndianRupee className="h-8 w-8 text-ink-muted" aria-hidden="true" />
      </div>
      <p className="text-sm text-ink-muted font-medium">Detailed cost ledger coming in v2</p>
      <p className="text-xs text-ink-muted mt-2">
        Per-VIN cost aggregation (JC parts + labour + refurb + landing) will be
        derived from the parts-store and service-store in Phase 3.
      </p>
    </div>
  );
}
