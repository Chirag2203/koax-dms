'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { cn } from '@dms/ui';
import { deals as allDeals } from '@dms/mocks/fixtures';
import type { Deal, DealStage } from '@dms/types';
import { KanbanColumn } from '@/src/components/sales/kanban-column';
import { DealListView } from '@/src/components/sales/deal-list-view';

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view') ?? 'kanban';

  // Local optimistic state for deal stages (drag & drop)
  const [dealStages, setDealStages] = useState<Record<string, DealStage>>(() => {
    const map: Record<string, DealStage> = {};
    for (const deal of allDeals) {
      map[deal.id] = deal.stage;
    }
    return map;
  });

  // Filter state
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [filterOutlet, setFilterOutlet] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Build filtered + stage-patched deals
  const patchedDeals: Deal[] = allDeals.map((d) => ({
    ...d,
    stage: dealStages[d.id] ?? d.stage,
  }));

  const filteredDeals = patchedDeals.filter((d) => {
    if (filterAssignedToMe && d.assignedTo !== 'staff-005') return false;
    if (filterOutlet && d.outlet !== filterOutlet) return false;
    if (filterSource && d.source !== filterSource) return false;
    return true;
  });

  // Drag & drop handler
  const handleMoveDeal = useCallback((dealId: string, toStage: DealStage) => {
    setDealStages((prev) => ({ ...prev, [dealId]: toStage }));
    // Fire-and-forget the API call
    fetch(`/api/staff/sales/deals/${dealId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStage }),
    }).catch(() => {
      // On failure, revert
      setDealStages((prev) => {
        const reverted = { ...prev };
        const original = allDeals.find((d) => d.id === dealId);
        if (original) reverted[dealId] = original.stage;
        return reverted;
      });
    });
  }, []);

  // Summary stats
  const activeDeals = filteredDeals.filter((d) =>
    ['new-lead', 'contacted', 'test-drive', 'reserved', 'sales-order'].includes(d.stage),
  );
  const pipelineTotal = activeDeals.reduce((acc, d) => acc + d.amount, 0);
  const deliveredThisMonth = filteredDeals.filter((d) => d.stage === 'delivered').length;

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
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary tracking-tight">
          Sales Pipeline
        </h1>
        <Link
          href="/sales/leads/new"
          className={cn(
            'inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-semibold',
            'bg-accent text-white hover:bg-accent/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Lead
        </Link>
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
            Kanban
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
            List
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
          My deals only
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
          <option value="">All Outlets</option>
          <option value="BLR-01">Bangalore (BLR-01)</option>
          <option value="MUM-01">Mumbai (MUM-01)</option>
          <option value="CHE-01">Chennai (CHE-01)</option>
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
          <option value="">All Sources</option>
          <option value="web">Web</option>
          <option value="walk-in">Walk-in</option>
          <option value="referral">Referral</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Phone</option>
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
          <span className="font-mono font-semibold text-ink-primary">{activeDeals.length}</span> active deals
        </span>
        <span className="text-ink-muted text-xs">·</span>
        <span className="text-xs text-ink-muted">
          <span className="font-mono font-semibold text-ink-primary">&#8377; {formatCrores(pipelineTotal)}</span> pipeline
        </span>
        <span className="text-ink-muted text-xs">·</span>
        <span className="text-xs text-ink-muted">
          <span className="font-mono font-semibold text-ink-primary">{deliveredThisMonth}</span> delivered this month
        </span>
      </div>
    </div>
  );
}
