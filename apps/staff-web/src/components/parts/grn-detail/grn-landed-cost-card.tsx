/**
 * GrnLandedCostCard — shows import landed cost adders.
 *
 * Only rendered when grn.landedCostAdders present.
 * Spec reference: PLAN-PARTS-006 §5.2
 */

import type { Grn } from '@dms/types';
import { AmountCell } from '@/src/components/primitives';

export interface GrnLandedCostCardProps {
  grn: Grn;
}

export function GrnLandedCostCard({ grn }: GrnLandedCostCardProps) {
  if (!grn.landedCostAdders) return null;

  const { freight = 0, customs = 0, igst = 0, clearing = 0 } = grn.landedCostAdders;
  const totalAdded = freight + customs + igst + clearing;

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Landed Cost Adders
      </h2>
      <div className="flex flex-col gap-3">
        <LandedRow label="Freight" amount={freight} />
        <LandedRow label="Customs Duty" amount={customs} />
        <LandedRow label="IGST" amount={igst} />
        <LandedRow label="Clearing" amount={clearing} />
        <div className="border-t border-line pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-primary">Total Landed Add-on</span>
          <AmountCell amount={totalAdded} align="right" size="md" />
        </div>
      </div>
    </section>
  );
}

function LandedRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-secondary">{label}</span>
      <AmountCell amount={amount} align="right" size="sm" />
    </div>
  );
}
