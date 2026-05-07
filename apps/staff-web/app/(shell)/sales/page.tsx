'use client';

/**
 * Sales Pipeline page — Kanban + list view.
 *
 * W3.1: Drag to 'reserved' → reservation conflict guard + toast on conflict.
 * W3.2: Drag to 'lost' → MarkDealLostDialog intercept; cancel = revert.
 * staff.sales.reservation-guard.v1 / staff.sales.deal-lost-reason.v1
 */

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, LayoutGrid, List, TrendingDown } from 'lucide-react';
import { cn } from '@dms/ui';
import { deals as allDeals } from '@dms/mocks/fixtures';
import type { Deal, DealStage, LostReasonCategory } from '@dms/types';
import { KanbanColumn } from '@/src/components/sales/kanban-column';
import { DealListView } from '@/src/components/sales/deal-list-view';
import { MarkDealLostDialog } from '@/src/components/sales/mark-deal-lost-dialog';
import {
  useSalesDealsStore,
  isReservationConflictError,
} from '@/src/lib/sales/sales-deals-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { deriveSalesEvent } from '@/src/components/sales/derive-sales-event';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';

// ─── Stage config ─────────────────────────────────────────────────────────────

const ACTIVE_STAGES: { stage: DealStage; title: string }[] = [
  { stage: 'new-lead', title: 'New Lead' },
  { stage: 'contacted', title: 'Contacted' },
  { stage: 'test-drive', title: 'Test Drive' },
  { stage: 'reserved', title: 'Reserved' },
  { stage: 'sales-order', title: 'Sales Order' },
  { stage: 'delivered', title: 'Delivered' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

function formatCrores(amount: number): string {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(2)} L`;
  }
  return INR_FORMATTER.format(amount);
}

// ─── Pending lost state (intercept before committing stage change) ─────────

interface PendingLost {
  dealId: string;
  customerName: string;
  prevStage: DealStage;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('salesDeals.pipeline');
  const view = searchParams.get('view') ?? 'kanban';
  const { user } = useStaffAuth();
  const { toast, toasts, dismiss } = useToast();

  // Local optimistic state for deal stages (drag & drop)
  const [dealStages, setDealStages] = useState<Record<string, DealStage>>(() => {
    const map: Record<string, DealStage> = {};
    for (const deal of allDeals) {
      map[deal.id] = deal.stage;
    }
    return map;
  });

  // W3.2 — pending lost dialog state (intercept drag-to-lost)
  const [pendingLost, setPendingLost] = useState<PendingLost | null>(null);

  // Filter state
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [filterOutlet, setFilterOutlet] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Build filtered + stage-patched deals
  // L_S-ZUSTAND-1: base ref returned from selector; computation in useMemo (no anti-pattern)
  const storeDeals = useSalesDealsStore((s) => s.deals);

  const patchedDeals: Deal[] = useMemo(
    () =>
      allDeals.map((d) => ({
        ...d,
        stage: dealStages[d.id] ?? d.stage,
      })),
    [dealStages],
  );

  const filteredDeals = useMemo(
    () =>
      patchedDeals.filter((d) => {
        if (filterAssignedToMe && d.assignedTo !== 'staff-005') return false;
        if (filterOutlet && d.outlet !== filterOutlet) return false;
        if (filterSource && d.source !== filterSource) return false;
        return true;
      }),
    [patchedDeals, filterAssignedToMe, filterOutlet, filterSource],
  );

  // Drag & drop handler
  const handleMoveDeal = useCallback(
    (dealId: string, toStage: DealStage) => {
      const allCurrentDeals = useSalesDealsStore.getState().deals;
      const deal = allCurrentDeals[dealId] ?? allDeals.find((d) => d.id === dealId);
      const prevStage: DealStage = deal?.stage ?? (dealStages[dealId] as DealStage) ?? 'new-lead';

      // W3.2 — Intercept drag-to-lost: open dialog, do NOT commit yet
      if (toStage === 'lost') {
        // Optimistic UI move (visual feedback only)
        setDealStages((prev) => ({ ...prev, [dealId]: 'lost' }));
        setPendingLost({
          dealId,
          customerName: deal?.customerName ?? 'Customer',
          prevStage,
        });
        return;
      }

      // Optimistic UI update
      setDealStages((prev) => ({ ...prev, [dealId]: toStage }));

      // W3.1 — Reservation guard: try-catch for VIN_ALREADY_RESERVED
      const vinForEvent = deal?.vehicleVin;
      if (vinForEvent && prevStage !== undefined) {
        let updated: Deal | null = null;
        try {
          updated = useSalesDealsStore.getState().advanceStage(dealId, toStage);
        } catch (err) {
          if (isReservationConflictError(err)) {
            // Revert optimistic move
            setDealStages((prev) => ({ ...prev, [dealId]: prevStage }));
            toast(
              `Cannot reserve — ${vinForEvent} is already reserved by ${err.conflictingCustomerName} (Deal #${err.conflictingDealId.slice(-6)}). Resolve that deal first or pick a different vehicle.`,
              'error',
            );
            return;
          }
          // Other errors — revert silently
          setDealStages((prev) => ({ ...prev, [dealId]: prevStage }));
          return;
        }

        if (updated) {
          const derived = deriveSalesEvent(prevStage, toStage, updated);
          if (derived && user) {
            try {
              useVehiclesStore.getState().emitSalesEvent(
                vinForEvent,
                derived.kind,
                derived.payload,
                { id: user.id, name: user.name, role: user.role },
              );
            } catch {
              // Swallow validation errors in drag & drop
            }
          }
        }
      }

      // Fire-and-forget the API call
      fetch(`/api/staff/sales/deals/${dealId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage }),
      }).catch(() => {
        setDealStages((prev) => {
          const reverted = { ...prev };
          const original = allDeals.find((d) => d.id === dealId);
          if (original) reverted[dealId] = original.stage;
          return reverted;
        });
      });
    },
    [user, dealStages, toast],
  );

  // W3.2 — Confirm lost from dialog
  const handleLostConfirm = useCallback(
    (data: { category: LostReasonCategory; freeText?: string }) => {
      if (!pendingLost || !user) return;
      const { dealId, prevStage } = pendingLost;
      setPendingLost(null);

      const now = new Date().toISOString();
      const result = useSalesDealsStore.getState().markDealLost(
        dealId,
        {
          category: data.category,
          freeText: data.freeText,
          capturedAt: now,
          capturedByEmployeeId: user.id,
        },
        { id: user.id, name: user.name, role: user.role },
      );

      if ('ok' in result) {
        // Validation error — revert
        setDealStages((prev) => ({ ...prev, [dealId]: prevStage }));
        toast(t('toastMarkLostFailed'), 'error');
        return;
      }

      // Commit stage in local state (already set optimistically)
      setDealStages((prev) => ({ ...prev, [dealId]: 'lost' }));
      toast(t('toastDealMarkedLost'), 'info');

      fetch(`/api/staff/sales/deals/${dealId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: 'lost', lostReason: data }),
      }).catch(() => {/* fire-and-forget */});
    },
    [pendingLost, user, toast],
  );

  // W3.2 — Cancel lost dialog → revert optimistic move
  const handleLostCancel = useCallback(() => {
    if (!pendingLost) return;
    setDealStages((prev) => ({ ...prev, [pendingLost.dealId]: pendingLost.prevStage }));
    setPendingLost(null);
  }, [pendingLost]);

  // Suppress unused warning: storeDeals is read to register Zustand subscription
  void storeDeals;

  // Summary stats
  const activeDeals = useMemo(
    () =>
      filteredDeals.filter((d) =>
        ['new-lead', 'contacted', 'test-drive', 'reserved', 'sales-order'].includes(d.stage),
      ),
    [filteredDeals],
  );
  const pipelineTotal = useMemo(
    () => activeDeals.reduce((acc, d) => acc + d.amount, 0),
    [activeDeals],
  );
  const deliveredThisMonth = useMemo(
    () => filteredDeals.filter((d) => d.stage === 'delivered').length,
    [filteredDeals],
  );

  function setView(v: 'kanban' | 'list') {
    const params = new URLSearchParams(searchParams.toString());
    if (v === 'kanban') {
      params.delete('view');
    } else {
      params.set('view', v);
    }
    router.replace(`/sales?${params.toString()}`);
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-bg-canvas">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-semibold leading-tight text-ink-primary tracking-tight">
          {t('pageTitle')}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/sales/aging"
            className={cn(
              'inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium',
              'bg-bg-surface text-ink-primary border border-line hover:bg-bg-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            )}
            title="Inventory aging report — listings sorted by days-on-market with price-drop suggestions"
          >
            <TrendingDown className="h-4 w-4" aria-hidden="true" />
            {t('agingReport')}
          </Link>
          <Link
            href="/sales/leads/new"
            className={cn(
              'inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-semibold',
              'bg-accent text-white hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            )}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('newLead')}
          </Link>
        </div>
      </div>

      {/* ── View toggle + filters ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 pb-4 border-b border-line shrink-0 flex-wrap">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-bg-subtle rounded-md p-0.5 border border-line">
          <button
            type="button"
            onClick={() => setView('kanban')}
            aria-pressed={view === 'kanban'}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              view === 'kanban'
                ? 'bg-bg-surface text-ink-primary shadow-sm'
                : 'text-ink-muted hover:text-ink-secondary',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            {t('viewKanban')}
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              view === 'list'
                ? 'bg-bg-surface text-ink-primary shadow-sm'
                : 'text-ink-muted hover:text-ink-secondary',
            )}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            {t('viewList')}
          </button>
        </div>

        {/* Filter: Assigned to me toggle */}
        <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterAssignedToMe}
            onChange={(e) => setFilterAssignedToMe(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-accent"
          />
          {t('filterMyDealsOnly')}
        </label>

        {/* Filter: Outlet */}
        <select
          value={filterOutlet}
          onChange={(e) => setFilterOutlet(e.target.value)}
          aria-label="Filter by outlet"
          className={cn(
            'h-8 rounded-md border border-line bg-bg-canvas px-2.5 text-xs text-ink-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent/50',
          )}
        >
          <option value="">{t('filterAllOutlets')}</option>
          <option value="BLR-01">{t('filterOutletBLR')}</option>
          <option value="MUM-01">{t('filterOutletMUM')}</option>
          <option value="CHE-01">{t('filterOutletCHE')}</option>
        </select>

        {/* Filter: Source */}
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          aria-label="Filter by source"
          className={cn(
            'h-8 rounded-md border border-line bg-bg-canvas px-2.5 text-xs text-ink-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent/50',
          )}
        >
          <option value="">{t('filterAllSources')}</option>
          <option value="web">{t('filterSourceWeb')}</option>
          <option value="walk-in">{t('filterSourceWalkIn')}</option>
          <option value="referral">{t('filterSourceReferral')}</option>
          <option value="whatsapp">{t('filterSourceWhatsapp')}</option>
          <option value="phone">{t('filterSourcePhone')}</option>
        </select>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <div className="h-full overflow-x-auto px-6 py-4">
            <div className="grid grid-flow-col auto-cols-[300px] gap-3 pb-4 h-full">
              {ACTIVE_STAGES.map(({ stage, title }) => {
                const stageDeals = filteredDeals.filter((d) => d.stage === stage);
                return (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    title={title}
                    deals={stageDeals}
                    onMoveDeal={handleMoveDeal}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-6 py-4">
            <DealListView deals={filteredDeals} />
          </div>
        )}
      </div>

      {/* ── Summary footer ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-line bg-bg-canvas px-6 py-3 flex items-center gap-4">
        <span className="text-xs text-ink-muted">
          {t('summaryActiveDeals', { count: activeDeals.length })}
        </span>
        <span className="text-ink-muted text-xs">·</span>
        <span className="text-xs text-ink-muted">
          {t('summaryPipeline', { value: `₹ ${formatCrores(pipelineTotal)}` })}
        </span>
        <span className="text-ink-muted text-xs">·</span>
        <span className="text-xs text-ink-muted">
          {t('summaryDeliveredThisMonth', { count: deliveredThisMonth })}
        </span>
      </div>

      {/* W3.2 — Mark Deal Lost dialog (intercepts kanban drag) */}
      {pendingLost && (
        <MarkDealLostDialog
          open={Boolean(pendingLost)}
          dealId={pendingLost.dealId}
          customerName={pendingLost.customerName}
          onClose={handleLostCancel}
          onConfirm={handleLostConfirm}
        />
      )}
    </div>
  );
}
