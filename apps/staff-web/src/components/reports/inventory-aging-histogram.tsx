/**
 * InventoryAgingHistogram — 5-bucket horizontal bar chart.
 *
 * §9.6: Five horizontal bar rows. Width proportional to bucket count / max.
 * 90–180d → state-pending tint; 180+d → state-overdue tint (PLAN-VEHICLES-003 L23).
 *
 * Spec reference: SPEC-REPORTS-001 §9.6
 */

'use client';

import { useTranslations } from 'next-intl';

interface Bucket {
  label: string;
  count: number;
}

interface InventoryAgingHistogramProps {
  buckets: Bucket[];
}

// Map bucket label to i18n key
const LABEL_KEY_MAP: Record<string, string> = {
  '<30d':    'agingBucket_lt30',
  '30–60d':  'agingBucket_30_60',
  '60–90d':  'agingBucket_60_90',
  '90–180d': 'agingBucket_90_180',
  '180+d':   'agingBucket_180plus',
};

// §9.6: State tints for aged inventory (PLAN-VEHICLES-003 L23)
function rowTint(label: string): string {
  if (label === '180+d')   return 'bg-[rgb(var(--state-overdue)/0.08)]';
  if (label === '90–180d') return 'bg-[rgb(var(--state-pending)/0.06)]';
  return '';
}

export function InventoryAgingHistogram({ buckets }: InventoryAgingHistogramProps) {
  const t = useTranslations('reports.kpi');

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  if (buckets.length === 0 || buckets.every((b) => b.count === 0)) {
    return (
      <p className="text-sm text-ink-muted">
        <span aria-label="no data">—</span>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Inventory aging buckets">
      {buckets.map((bucket) => {
        const widthPct = Math.round((bucket.count / maxCount) * 100);
        const i18nKey  = LABEL_KEY_MAP[bucket.label];
        const tint     = rowTint(bucket.label);

        return (
          <div
            key={bucket.label}
            role="listitem"
            className={`flex items-center gap-2 px-2 py-1 rounded-sm ${tint}`}
          >
            {/* Label */}
            <span className="text-xs text-ink-muted w-20 shrink-0">
              {i18nKey ? t(i18nKey as Parameters<typeof t>[0]) : bucket.label}
            </span>

            {/* Bar */}
            <div className="flex-1 bg-bg-subtle rounded-sm h-2 overflow-hidden">
              <div
                className="h-2 bg-accent rounded-sm transition-all duration-300"
                style={{ width: `${widthPct}%` }}
                aria-hidden="true"
              />
            </div>

            {/* Count badge */}
            <span className="font-mono text-xs text-ink-primary tabular-nums w-6 text-right shrink-0">
              {bucket.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
