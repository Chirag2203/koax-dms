/**
 * NpsTile — NPS average KPI tile for the Reports hub.
 *
 * L11: Gated at R10+ (SPEC-REVIEWS-001 L11).
 * Seam 28: reads useReviewsStore.selectNpsAverage.
 *
 * Renders NPS as X.X / 10 (not a percentage).
 * Shows '—' when no reviews in period (L9 analog).
 *
 * Spec reference: SPEC-REVIEWS-001 §UI surfaces (Reports hub: NPS tile)
 */

'use client';

import { useTranslations } from 'next-intl';
import type { ReportPeriod, ReportScope } from '@/src/lib/reports/types';
import { useReviewsStore } from '@/src/lib/reviews/reviews-store';
import { Gate } from '@/src/components/primitives/gate';

interface NpsTileProps {
  period: ReportPeriod;
  scope: ReportScope;
}

function NpsTileInner({ period, scope }: NpsTileProps) {
  const t = useTranslations('reports');
  const selectNpsAverage = useReviewsStore((s) => s.selectNpsAverage);

  const avg = selectNpsAverage(period, scope);

  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      {/* Label */}
      <p className="text-xs text-ink-muted uppercase tracking-wider">
        {t('kpi.npsAverage')}
      </p>

      {/* Value */}
      <div className="mt-2">
        {avg !== null ? (
          <span className="font-mono text-base text-ink-primary tabular-nums">
            {avg.toFixed(1)}{' '}
            <span className="text-xs text-ink-muted font-sans">{t('kpi.npsAverageUnit')}</span>
          </span>
        ) : (
          <span className="text-base text-ink-muted">—</span>
        )}
      </div>

      {/* No data caption */}
      {avg === null && (
        <p className="text-xs text-ink-muted mt-1">
          {t('noDataForPeriod')}
        </p>
      )}

      {/* NPS scale hint */}
      {avg !== null && (
        <p className="text-xs text-ink-muted mt-1">
          {avg >= 9 ? 'Promoter zone' : avg >= 7 ? 'Passive zone' : 'Detractor zone'}
        </p>
      )}
    </div>
  );
}

// ─── Gate wrapper (L11: R10+) ─────────────────────────────────────────────────

export function NpsTile(props: NpsTileProps) {
  return (
    <Gate
      role={['R10', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R22', 'R24']}
      fallback="hide"
    >
      <NpsTileInner {...props} />
    </Gate>
  );
}
