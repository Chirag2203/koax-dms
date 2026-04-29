/**
 * /reports/[kpi] — KPI drill-down detail page (P2 stub).
 *
 * P1 ships this as a placeholder per spec §20 P2.
 *
 * Spec reference: SPEC-REPORTS-001 §20 P2, DEF-REPORTS-2
 */

import Link from 'next/link';
import type { Metadata } from 'next';

interface KpiDetailPageProps {
  params: { kpi: string };
}

export async function generateMetadata({ params }: KpiDetailPageProps): Promise<Metadata> {
  return {
    title: `${params.kpi} Detail — Reports — BN Automobiles DMS`,
  };
}

export default function KpiDetailPage({ params }: KpiDetailPageProps) {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg-canvas px-6 py-24">
      <div className="text-center max-w-sm">
        <p className="text-xs text-ink-muted uppercase tracking-wider mb-2">
          KPI Detail — {params.kpi}
        </p>
        <h1 className="font-semibold text-ink-primary mb-2" style={{ fontSize: 24 }}>
          Detail view coming in P2
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          Click-through drill-down panels (DEF-REPORTS-2) will be available in the next release.
        </p>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 border border-line rounded-md px-4 py-2 text-sm text-ink-secondary hover:bg-bg-hover transition-colors"
        >
          ← Back to Reports
        </Link>
      </div>
    </div>
  );
}
