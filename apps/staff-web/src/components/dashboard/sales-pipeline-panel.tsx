'use client';

import Link from 'next/link';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineStage {
  label: string;
  count: number;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { label: 'New leads', count: 12 },
  { label: 'Test drive booked', count: 6 },
  { label: 'Reserved', count: 4 },
  { label: 'Sales order', count: 3 },
  { label: 'Delivered this month', count: 5 },
];

const MAX_COUNT = Math.max(...PIPELINE_STAGES.map((s) => s.count));

// ─── Component ────────────────────────────────────────────────────────────────

export function SalesPipelinePanel() {
  return (
    <div className="bg-bg-surface border border-line rounded-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary">
          Sales
        </h2>
        <Link
          href="/sales"
          className="text-xs text-accent hover:text-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          View all →
        </Link>
      </div>

      {/* Funnel stages */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const pct = Math.round((stage.count / MAX_COUNT) * 100);
          return (
            <div key={stage.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-secondary">{stage.label}</span>
                <span className="font-semibold text-[15px] font-mono tabular-nums text-ink-primary">
                  {stage.count}
                </span>
              </div>
              <div className="h-1.5 w-full bg-bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top deal callout */}
      <div className="px-4 py-3 border-t border-line text-[12px] text-ink-secondary">
        <span className="text-ink-muted">Top deal: </span>
        Porsche Panamera 4 &middot;{' '}
        <span className="font-mono tabular-nums">&#8377;1,28,50,000</span>
        {' '}&middot;{' '}
        <span className="text-[rgb(var(--state-reserved))]">Reserved</span>
      </div>
    </div>
  );
}
