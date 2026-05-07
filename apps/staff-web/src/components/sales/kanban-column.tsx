'use client';

import { useState } from 'react';
import { cn } from '@dms/ui';
import type { Deal, DealStage } from '@dms/types';
import { DealCard } from './deal-card';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

function formatINR(amount: number): string {
  return INR_FORMATTER.format(amount);
}

function sumAmount(deals: Deal[]): number {
  return deals.reduce((acc, d) => acc + d.amount, 0);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KanbanColumnProps {
  stage: DealStage;
  title: string;
  deals: Deal[];
  onMoveDeal: (dealId: string, toStage: DealStage) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanColumn({ stage, title, deals, onMoveDeal }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        // Only fire when leaving the column entirely (not child elements)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dealId = e.dataTransfer.getData('application/x-deal-id');
        if (dealId) onMoveDeal(dealId, stage);
      }}
      className={cn(
        'flex flex-col min-h-[500px] rounded-md border p-3 transition-colors',
        dragOver ? 'border-accent bg-accent/5' : 'border-line bg-bg-subtle',
      )}
      aria-label={`${title} column — ${deals.length} deals`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
          <span className="bg-bg-hover rounded-full px-2 py-0.5 text-xs font-mono text-ink-muted">
            {deals.length}
          </span>
        </div>
        <span className="font-mono text-xs text-ink-muted tabular-nums">
          &#8377; {formatINR(sumAmount(deals))}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {deals.length === 0 ? (
          <p className="text-center text-xs text-ink-muted py-8">No deals in this stage.</p>
        ) : (
          deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        )}
      </div>
    </div>
  );
}
