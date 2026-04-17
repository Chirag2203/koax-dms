/**
 * PartOverviewCard — 2×4 stat grid of key part attributes.
 *
 * Spec reference: PLAN-PARTS-003 §7
 */

'use client';

import type { Part } from '@dms/types';
import { AmountCell } from '@/src/components/primitives';

export interface PartOverviewCardProps {
  part: Part;
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function PartOverviewCard({ part }: PartOverviewCardProps) {
  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Overview
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
        <MoneyTile label="Avg Cost" amount={part.avgCost} />
        <MoneyTile label="MRP" amount={part.mrp} />
        <MoneyTile label="Last Purchase Price" amount={part.lastPurchasePrice} />
        <TextTile label="HSN" value={part.hsnCode} mono />
        <TextTile label="Category" value={titleCase(part.category)} />
        <TextTile label="Criticality" value={titleCase(part.criticality)} />
        <TextTile label="UoM" value={part.uom} mono />
        <TextTile
          label="Warranty Policy"
          value={part.warrantyPolicy ?? '—'}
          small
        />
      </div>
    </section>
  );
}

// ─── Tiles ────────────────────────────────────────────────────────────────────

function MoneyTile({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <AmountCell amount={amount} align="left" size="md" />
    </div>
  );
}

function TextTile({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <span
        className={[
          'font-medium text-ink-primary',
          mono ? 'font-mono' : '',
          small ? 'text-[13px]' : 'text-[15px]',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
