'use client';

/**
 * /staff — Staff Directory
 * SPEC-STAFF-001 P1 §8.1
 *
 * RBAC: R09+ can view own outlet; R02+ can view all outlets (§12).
 * Per task spec: R09+ to view, R12+ to onboard.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Users,
  Search,
  LayoutGrid,
  List,
  Plus,
  AlertCircle,
  Network,
  Calendar,
} from 'lucide-react';
import type { StaffProfile, StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { StaffCard } from '@/src/components/staff/staff-card';
import { StaffTable } from '@/src/components/staff/staff-table';
import { StaffFilters } from '@/src/components/staff/staff-filters';
import type { StaffFilterValues } from '@/src/components/staff/staff-filters';

const EMPTY_FILTERS: StaffFilterValues = {
  outlet: '',
  role: '',
  department: '',
  status: '',
  search: '',
};

export default function StaffDirectoryPage() {
  // ─── ALL HOOKS FIRST (Rules of Hooks — no conditional returns above) ───
  const t = useTranslations('staff.staffModule');
  const { user } = useStaffAuth();
  const hydrated = useStaffStore((s) => s.hydrated);
  const selectStaffForViewer = useStaffStore((s) => s.selectStaffForViewer);

  const [view, setView] = useState<'card' | 'table'>('card');
  const [filters, setFilters] = useState<StaffFilterValues>(EMPTY_FILTERS);

  const userRole = user?.role as StaffRoleCode | undefined;
  const userOutlet = user?.outlet;

  const allStaff = useMemo(
    () => (hydrated && userRole ? selectStaffForViewer(userRole) : []),
    [hydrated, selectStaffForViewer, userRole],
  );

  const scopedStaff = useMemo(() => {
    if (!userRole) return [];
    if (hasRank(userRole, 'R02')) return allStaff;
    return allStaff.filter((s) => s.outlet === userOutlet || s.outlet === 'all');
  }, [allStaff, userOutlet, userRole]);

  const filteredStaff = useMemo(() => {
    let result = scopedStaff;
    if (filters.outlet) result = result.filter((s) => s.outlet === filters.outlet);
    if (filters.role) result = result.filter((s) => s.role === filters.role);
    if (filters.department) result = result.filter((s) => s.department === filters.department);
    if (filters.status) result = result.filter((s) => s.status === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q) ||
          s.roleName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [scopedStaff, filters]);

  // ─── Now safe to early-return ────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ink-muted text-sm">Sign in to view staff directory.</p>
      </div>
    );
  }

  if (!userRole || !hasRank(userRole, 'R09')) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <AlertCircle className="text-warning" size={20} />
        <p className="text-ink-muted text-sm">
          You do not have access to the staff directory.
        </p>
      </div>
    );
  }

  const canOnboard = hasRank(userRole, 'R12');
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col h-full" data-surface="staff">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-ink-muted" aria-hidden="true" />
          <h1 className="text-[18px] font-semibold text-ink-primary">
            {t('directory.title')}
          </h1>
          {hydrated && (
            <span className="font-mono text-[12px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              {filteredStaff.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-bg-subtle rounded-md p-0.5 border border-line">
            <button
              type="button"
              onClick={() => setView('card')}
              title={t('directory.viewToggle.card')}
              aria-pressed={view === 'card'}
              className={[
                'flex items-center justify-center w-7 h-7 rounded transition-colors duration-100',
                view === 'card'
                  ? 'bg-bg-surface text-ink-primary shadow-1'
                  : 'text-ink-muted hover:text-ink-secondary',
              ].join(' ')}
            >
              <LayoutGrid size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              title={t('directory.viewToggle.table')}
              aria-pressed={view === 'table'}
              className={[
                'flex items-center justify-center w-7 h-7 rounded transition-colors duration-100',
                view === 'table'
                  ? 'bg-bg-surface text-ink-primary shadow-1'
                  : 'text-ink-muted hover:text-ink-secondary',
              ].join(' ')}
            >
              <List size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Leaves link — R09+ */}
          <Link
            href="/staff/leaves"
            className="inline-flex items-center gap-1.5 px-3 h-8 border border-line bg-bg-surface text-ink-primary text-[13px] font-medium rounded-md hover:bg-bg-subtle transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            <Calendar size={14} aria-hidden="true" />
            Leaves
          </Link>

          {/* Org Chart link — R09+ */}
          <Link
            href="/staff/org-chart"
            className="inline-flex items-center gap-1.5 px-3 h-8 border border-line bg-bg-surface text-ink-primary text-[13px] font-medium rounded-md hover:bg-bg-subtle transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            <Network size={14} aria-hidden="true" />
            Org Chart
          </Link>

          {/* Onboard CTA — R12+ only */}
          {canOnboard && (
            <Link
              href="/staff/new"
              className="flex items-center gap-1.5 px-3 h-8 bg-accent text-white text-[13px] font-medium rounded-md hover:bg-accent/90 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Plus size={14} aria-hidden="true" />
              {t('directory.onboard')}
            </Link>
          )}
        </div>
      </div>

      {/* ─── Search + Filters ───────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder={t('directory.search')}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-bg-subtle border border-line rounded-md text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-0"
            />
          </div>
          <StaffFilters
            values={filters}
            onChange={setFilters}
            showOutletFilter={hasRank(user.role as StaffRoleCode, 'R02')}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-[12px] text-accent hover:text-accent/80 underline"
            >
              {t('directory.filters.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!hydrated ? (
          /* Loading skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-bg-subtle animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Users size={32} className="text-ink-muted opacity-40" aria-hidden="true" />
            <p className="text-[14px] text-ink-muted">{t('directory.empty.title')}</p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-[13px] text-accent underline"
              >
                {t('directory.empty.clearFilters')}
              </button>
            )}
          </div>
        ) : view === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStaff.map((staff) => (
              <StaffCard key={staff.id} staff={staff} />
            ))}
          </div>
        ) : (
          <StaffTable staff={filteredStaff} />
        )}
      </div>
    </div>
  );
}
