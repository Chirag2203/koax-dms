/**
 * KpiTile — wrapper around StatTile pattern from SPEC-ARCH-UI-001 §3.4.
 *
 * Renders a KpiValue with:
 *   - currency → formatINR (font-mono text-base tabular-nums)
 *   - percentage → value.toFixed(1) + '%'
 *   - count → Math.round
 *   - days → Nd suffix
 *   - histogram → InventoryAgingHistogram
 *   - deferred → '—' + deferred notice
 *   - null value → '—' + noDataForPeriod caption (L9)
 *
 * L17: InlineSparkline wrapped in React.lazy + Suspense.
 * L8: formatting via lib/reports/format.ts.
 * L9: null value renders '—', never 0 for no-data.
 *
 * Spec reference: SPEC-REPORTS-001 §9.2 (L8, L9, L17)
 */

'use client';

import { lazy, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import type { KpiValue } from '@/src/lib/reports/types';
import { formatINR, formatPct, formatCount, formatDays } from '@/src/lib/reports/format';
import { InventoryAgingHistogram } from './inventory-aging-histogram';

// L17: lazy load sparkline — largest client-side computation
const InlineSparkline = lazy(() =>
  import('./inline-sparkline').then((m) => ({ default: m.InlineSparkline })),
);

interface KpiTileProps {
  label:    string;
  kpi:      KpiValue;
  subtitle?: string;
  /** Optional extra content below value (e.g. SLA chip) */
  footer?:  React.ReactNode;
}

// ─── Value renderer ────────────────────────────────────────────────────────────

function renderValue(kpi: KpiValue, t: (key: string) => string): React.ReactNode {
  // Deferred (L14 parts margin)
  if (kpi.kind === 'deferred') {
    return (
      <span className="text-base text-ink-muted">—</span>
    );
  }

  // Histogram (inventory aging — rendered separately)
  if (kpi.kind === 'histogram') {
    return null; // rendered in body
  }

  // L9: null value → '—'
  if (kpi.value === null) {
    return <span className="text-base text-ink-muted">—</span>;
  }

  // L8: Numeric formatters
  if (kpi.kind === 'currency') {
    return (
      <span className="font-mono text-base text-ink-primary tabular-nums">
        {formatINR(kpi.value)}
      </span>
    );
  }
  if (kpi.kind === 'percentage') {
    return (
      <span className="font-mono text-base text-ink-primary tabular-nums">
        {formatPct(kpi.value)}
      </span>
    );
  }
  if (kpi.kind === 'count') {
    return (
      <span className="font-mono text-base text-ink-primary tabular-nums">
        {formatCount(kpi.value)}
      </span>
    );
  }
  if (kpi.kind === 'days') {
    return (
      <span className="font-mono text-base text-ink-primary tabular-nums">
        {formatDays(kpi.value)}
      </span>
    );
  }

  // Fallback
  return <span className="text-base text-ink-muted">—</span>;
}

// ─── Sparkline renderer ───────────────────────────────────────────────────────

function renderSparkline(kpi: KpiValue, label: string) {
  if (kpi.kind === 'deferred' || kpi.kind === 'histogram') return null;
  if (!kpi.trend || kpi.trend.length < 2) return null;

  const lastValue = kpi.trend[kpi.trend.length - 1] ?? 0;

  return (
    // L17: Suspense wrapper for lazy InlineSparkline
    <Suspense fallback={<div className="h-6 w-20 bg-bg-subtle rounded-sm animate-pulse" />}>
      <InlineSparkline
        data={kpi.trend}
        width={80}
        height={24}
        className="mt-2"
        aria-label={`${label} trend, last value ${Math.round(lastValue)}`}
      />
    </Suspense>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KpiTile({ label, kpi, subtitle, footer }: KpiTileProps) {
  const t = useTranslations('reports');

  // Per §9.2: StatTile markup
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      {/* Label */}
      <p className="text-xs text-ink-muted uppercase tracking-wider">{label}</p>

      {/* Value */}
      <div className="mt-2">
        {renderValue(kpi, t)}
      </div>

      {/* Histogram (inventory aging) */}
      {kpi.kind === 'histogram' && (
        <div className="mt-2">
          <InventoryAgingHistogram buckets={kpi.buckets} />
        </div>
      )}

      {/* Sparkline */}
      {renderSparkline(kpi, label)}

      {/* L9: No data caption */}
      {kpi.kind !== 'deferred' && kpi.kind !== 'histogram' && kpi.value === null && (
        <p className="text-xs text-ink-muted mt-1">{t('noDataForPeriod')}</p>
      )}

      {/* L14: Deferred notice */}
      {kpi.kind === 'deferred' && (
        <p className="text-xs text-ink-muted mt-1">{t('partsMarginDeferredNotice')}</p>
      )}

      {/* Subtitle */}
      {subtitle && kpi.kind !== 'deferred' && (
        <p className="text-xs text-ink-muted mt-1">{subtitle}</p>
      )}

      {/* Footer (e.g. SLA chip) */}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}

// ─── Skeleton tile for loading state ─────────────────────────────────────────

export function KpiTileSkeleton() {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4 animate-pulse">
      <div className="h-3 bg-bg-subtle rounded w-24 mb-2" />
      <div className="h-6 bg-bg-subtle rounded w-32 mb-2" />
      <div className="h-4 bg-bg-subtle rounded w-20" />
    </div>
  );
}
