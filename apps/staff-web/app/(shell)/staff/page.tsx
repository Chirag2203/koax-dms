'use client';

/**
 * /staff — Staff Directory
 * SPEC-STAFF-001 P1 §8.1
 *
 * RBAC: R09+ can view own outlet; R02+ can view all outlets (§12).
 * L_S7: R03+ can onboard (gate updated from R12); R03 sees non-manager-tier roles only.
 * S8 / L23: R02+ admin button to run anonymization sweep (manual trigger for MVP).
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
  ShieldAlert,
} from 'lucide-react';
import type { StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { StaffCard } from '@/src/components/staff/staff-card';
import { StaffTable } from '@/src/components/staff/staff-table';
import { StaffFilters } from '@/src/components/staff/staff-filters';
import type { StaffFilterValues } from '@/src/components/staff/staff-filters';
import {
  runAnonymizationSweepDryRun,
  runAnonymizationSweep,
} from '@/src/lib/staff/anonymization-scheduler';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';

const EMPTY_FILTERS: StaffFilterValues = {
  outlet: '',
  role: '',
  department: '',
  status: '',
  search: '',
};

const ANONYMIZE_CONFIRM_WORD = 'ANONYMIZE';

// ─── Anonymization confirm dialog ─────────────────────────────────────────────

function AnonSweepDialog({
  dueCount,
  onConfirm,
  onClose,
}: {
  dueCount: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const confirmed = input.trim() === ANONYMIZE_CONFIRM_WORD;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="anon-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-bg-surface border border-line p-6">
        <div className="flex items-start gap-3 mb-4">
          <ShieldAlert size={22} className="text-state-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 id="anon-dialog-title" className="text-[16px] font-semibold text-ink-primary">
              Run Anonymization Sweep
            </h2>
            <p className="text-[13px] text-ink-secondary mt-1">
              This will permanently anonymize PII for{' '}
              <strong className="text-ink-primary">{dueCount} staff record{dueCount !== 1 ? 's' : ''}</strong>{' '}
              whose 7-year retention period has elapsed (Doc 06 §17, L12).
            </p>
            <p className="text-[12px] text-state-danger mt-2 font-medium">
              This action is irreversible. PII fields (name, email, phone, PAN, Aadhaar, bank)
              will be replaced with anonymized placeholders. Staff IDs are preserved for FK integrity.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="anon-confirm-input" className="block text-[12px] text-ink-muted mb-1.5">
            Type <code className="font-mono bg-bg-subtle px-1 rounded text-ink-primary">{ANONYMIZE_CONFIRM_WORD}</code>{' '}
            to confirm:
          </label>
          <input
            id="anon-confirm-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ANONYMIZE_CONFIRM_WORD}
            autoFocus
            className="w-full h-9 px-3 text-[13px] font-mono bg-bg-subtle border border-line rounded-md text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
            aria-required="true"
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed}
            className={`px-4 h-9 text-sm font-medium rounded-md transition-colors ${
              confirmed
                ? 'bg-state-danger text-white hover:bg-state-danger/90'
                : 'bg-bg-subtle text-ink-muted cursor-not-allowed border border-line'
            }`}
            aria-disabled={!confirmed}
          >
            Anonymize {dueCount} Record{dueCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffDirectoryPage() {
  // ─── ALL HOOKS FIRST (Rules of Hooks — no conditional returns above) ───
  const t = useTranslations('staff.staffModule');
  const { user } = useStaffAuth();
  const hydrated = useStaffStore((s) => s.hydrated);
  const selectStaffForViewer = useStaffStore((s) => s.selectStaffForViewer);
  const { toasts, toast, dismiss } = useToast();

  const [view, setView] = useState<'card' | 'table'>('card');
  const [filters, setFilters] = useState<StaffFilterValues>(EMPTY_FILTERS);
  const [anonDialogOpen, setAnonDialogOpen] = useState(false);
  const [anonDueCount, setAnonDueCount] = useState(0);

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

  // L_S7: R03+ can reach the onboarding wizard (page gate). Role scoping is
  // enforced inside the wizard; this CTA just controls visibility of the button.
  const canOnboard = hasRank(userRole, 'R03');
  // S8 / L23: R02+ admin button for manual anonymization sweep
  const canAdminAnon = hasRank(userRole, 'R02');
  const hasFilters = Object.values(filters).some(Boolean);

  function handleAnonPreview() {
    if (!user || !userRole) return;
    const result = runAnonymizationSweepDryRun({ id: user.id, role: userRole });
    if (!result.success) {
      toast(result.error, 'error');
      return;
    }
    setAnonDueCount(result.due.length);
    setAnonDialogOpen(true);
  }

  function handleAnonSweep() {
    if (!user || !userRole) return;
    const result = runAnonymizationSweep({ id: user.id, role: userRole });
    setAnonDialogOpen(false);
    if (!result.success) {
      toast(result.error, 'error');
      return;
    }
    if (result.result.count === 0) {
      toast('No records were due for anonymization.', 'success');
    } else {
      toast(`Anonymized ${result.result.count} staff record${result.result.count !== 1 ? 's' : ''}.`, 'success');
    }
  }

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

          {/* Onboard CTA — R03+ (L_S7) */}
          {canOnboard && (
            <Link
              href="/staff/new"
              className="flex items-center gap-1.5 px-3 h-8 bg-accent text-white text-[13px] font-medium rounded-md hover:bg-accent/90 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Plus size={14} aria-hidden="true" />
              {t('directory.onboard')}
            </Link>
          )}

          {/* Anonymization sweep — R02+ only (S8 / L23 manual admin trigger) */}
          {canAdminAnon && (
            <button
              type="button"
              onClick={handleAnonPreview}
              className="inline-flex items-center gap-1.5 px-3 h-8 border border-state-danger/40 bg-bg-surface text-state-danger text-[13px] font-medium rounded-md hover:bg-state-danger/5 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger focus-visible:ring-offset-1"
              title="Run anonymization sweep — permanently removes PII from expired staff records (L23)"
            >
              <ShieldAlert size={14} aria-hidden="true" />
              Anonymize
            </button>
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

      {/* Anonymization confirm dialog */}
      {anonDialogOpen && (
        <AnonSweepDialog
          dueCount={anonDueCount}
          onConfirm={handleAnonSweep}
          onClose={() => setAnonDialogOpen(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
