'use client';

/**
 * /staff/org-chart — Org chart view
 * SPEC-STAFF-001 §8.4, L26
 *
 * Access: R03+ (staff.orgchart.read per §12)
 * Re-org (change reportsTo): R02+ only (staff.orgchart.reorg per §12)
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, AlertCircle } from 'lucide-react';
import type { StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { OrgChart } from '@/src/components/staff/org-chart';

export default function StaffOrgChartPage() {
  // ─── ALL HOOKS FIRST (Rules of Hooks) ──────────────────────────────────────
  const { user } = useStaffAuth();
  const hydrated = useStaffStore((s) => s.hydrated);
  // Pull the function reference (stable) — call it in useMemo so the result
  // is memoised. Calling it inside the selector returns a NEW array each
  // render → infinite re-render loop. Same pattern as L37 visualizer fix.
  const selectStaffForViewer = useStaffStore((s) => s.selectStaffForViewer);
  const userRole = user?.role as StaffRoleCode | undefined;

  const allStaff = useMemo(
    () =>
      hydrated && userRole
        ? selectStaffForViewer(userRole)
        : [],
    [hydrated, selectStaffForViewer, userRole],
  );

  // ─── Now safe to early-return ──────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ink-muted text-sm">Sign in required.</p>
      </div>
    );
  }

  if (!userRole || !hasRank(userRole, 'R03')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={28} className="text-warning" aria-hidden="true" />
        <p className="text-ink-muted text-sm">
          Outlet Manager (R03) or higher required to view org chart.
        </p>
        <Link href="/staff" className="text-accent text-sm underline">
          Back to Staff Directory
        </Link>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="px-6 py-4">
        <div className="h-32 rounded-xl bg-bg-subtle animate-pulse" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-surface="staff">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-6 py-3 border-b border-line text-[12px] text-ink-muted flex-shrink-0">
        <Link href="/staff" className="hover:text-accent transition-colors duration-100">
          Staff
        </Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span className="text-ink-primary">Org Chart</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <OrgChart
          staff={allStaff}
          viewerRole={userRole}
        />
      </div>
    </div>
  );
}
