/**
 * LeadsBoard — 7-column Kanban board + LOST list + list view toggle.
 *
 * SPEC-LEADS-001 §9.1
 *
 * Pre-flight checklist (CLAUDE.md §17.1):
 * 1. Card + Field imported from detail-card (not redefined locally)
 * 2. text-xs / text-sm / text-base only
 * 3. rounded-md only
 * 4. Gate for RBAC, no inline hasRank
 * 5. i18n keys under leads.* namespace
 * 6. No text-[NNpx]
 *
 * L2: Backward transitions blocked — error toast shown.
 * L7: transitionStage appends stage-change activity.
 * L9: Outlet scoping applied via useOutlet().
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { Lead, LeadActivity } from '@dms/types';
import type { LeadStage } from '@dms/types';
import { InvalidLeadStageTransitionError } from '@dms/types';
import { useLeadsStore } from '@/src/lib/leads/leads-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useOutlet } from '@/src/providers/outlet-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { Gate } from '@/src/components/primitives/gate';
import { LeadCard } from './lead-card';
import { LeadStageChip } from './lead-stage-chip';
import { LeadsListView } from './leads-list-view';

// ─── Stage columns config ─────────────────────────────────────────────────────

const KANBAN_STAGES: { stage: LeadStage; label: string }[] = [
  { stage: 'NEW',        label: 'New' },
  { stage: 'CONTACTED',  label: 'Contacted' },
  { stage: 'QUALIFIED',  label: 'Qualified' },
  { stage: 'TEST_DRIVE', label: 'Test Drive' },
  { stage: 'QUOTED',     label: 'Quoted' },
  { stage: 'SO_RAISED',  label: 'SO Raised' },
  { stage: 'DELIVERED',  label: 'Delivered' },
];

const ACTIVE_STAGES = new Set<LeadStage>(['NEW', 'CONTACTED', 'QUALIFIED', 'TEST_DRIVE', 'QUOTED', 'SO_RAISED', 'DELIVERED']);

// ─── Column component ─────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: LeadStage;
  label: string;
  leads: Lead[];
  activities: LeadActivity[];
  customerNames: Record<string, string>;
  vehicleNames: Record<string, string>;
  advisorNames: Record<string, string>;
  activeDragId: string | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDrop: (leadId: string, targetStage: LeadStage) => void;
}

function KanbanColumn({
  stage, label, leads, activities, customerNames, vehicleNames, advisorNames,
  activeDragId, onDragStart, onDragEnd, onDrop,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragSource = activeDragId != null && leads.some((l) => l.id === activeDragId);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragSource) setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const leadId = e.dataTransfer.getData('text/plain');
        if (leadId && !isDragSource) onDrop(leadId, stage);
      }}
      className={cn(
        'flex-shrink-0 w-[280px] flex flex-col min-h-[500px] rounded-md border p-3 transition-colors',
        isDragOver && !isDragSource ? 'border-accent bg-accent/5' : 'border-line bg-bg-subtle',
      )}
      aria-label={`${label} column — ${leads.length} leads`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <LeadStageChip stage={stage} />
          <span className="bg-bg-hover rounded-full px-2 py-0.5 text-xs font-mono text-ink-muted">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {leads.length === 0 ? (
          <p className="text-center text-xs text-ink-muted py-8">No leads in this stage.</p>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', lead.id);
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(lead.id);
              }}
              onDragEnd={onDragEnd}
              className={cn(activeDragId === lead.id && 'opacity-50')}
            >
              <LeadCard
                lead={lead}
                activities={activities}
                customerName={customerNames[lead.customerId] ?? lead.customerId}
                vehicleName={lead.vehicleInterestVin ? vehicleNames[lead.vehicleInterestVin] : undefined}
                advisorName={lead.assignedAdvisorId ? advisorNames[lead.assignedAdvisorId] : undefined}
                isDragging={activeDragId === lead.id}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── LOST list ────────────────────────────────────────────────────────────────

interface LostListProps {
  leads: Lead[];
  activities: LeadActivity[];
  customerNames: Record<string, string>;
  vehicleNames: Record<string, string>;
}

function LostList({ leads, activities, customerNames, vehicleNames }: LostListProps) {
  const [expanded, setExpanded] = useState(false);

  if (leads.length === 0) return null;

  return (
    <div className="px-6 pb-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink-secondary transition-colors mb-3"
      >
        <span className="font-medium">Lost Leads</span>
        <span className="bg-bg-hover rounded-full px-2 py-0.5 text-xs font-mono">{leads.length}</span>
        <span className="text-xs">{expanded ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {expanded && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              activities={activities}
              customerName={customerNames[lead.customerId] ?? lead.customerId}
              vehicleName={lead.vehicleInterestVin ? vehicleNames[lead.vehicleInterestVin] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function LeadsBoard() {
  const t = useTranslations('leads');
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'list';

  // ONE base ref per selector — SPEC-ARCH-UI-001 Zustand rule
  const leads = useLeadsStore((s) => s.leads);
  const activities = useLeadsStore((s) => s.activities);
  const hydrated = useLeadsStore((s) => s.hydrated);
  const vehicleMap = useVehiclesStore((s) => s.vehicles);
  const { user } = useStaffAuth();
  const { outlet } = useOutlet();
  const { toasts, toast, dismiss } = useToast();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // L9: Outlet scoping
  const outletLeads = useMemo(() => {
    if (!outlet || outlet === 'all') return leads;
    return leads.filter((l) => l.outletId === outlet);
  }, [leads, outlet]);

  // Customer name lookup (flattened from fixtures — mirrors custom-builds pattern)
  const CUSTOMER_NAMES: Record<string, string> = {
    'cust-arjun-mehta': 'Arjun Mehta',
    'cust-priya-mehta': 'Priya Mehta',
    'cust-vikram-singh': 'Vikram Singh',
    'cust-meera-iyer': 'Meera Iyer',
    'cust-rahul-kumar': 'Rahul Kumar',
    'cust-rohan-desai': 'Rohan Desai',
    'cust-neha-kapoor': 'Neha Kapoor',
    'cust-sunita-reddy': 'Sunita Reddy',
    'cust-karan-shah': 'Karan Shah',
    'cust-pooja-desai': 'Pooja Desai',
    'cust-bn-dealer': 'BN Automobiles',
  };

  // Advisor name lookup
  const ADVISOR_NAMES: Record<string, string> = {
    'staff-r05-001': 'Rahul Kumar',
    'staff-r04-001': 'Deepa Nair',
    'staff-r09-001': 'Sales Manager BLR',
    'staff-r05-002': 'Anil Desai',
    'staff-r10-001': 'Priya Sharma',
    'staff-r12-001': 'Senior Manager MUM',
    'staff-r05-003': 'Kiran Menon',
    'staff-r09-002': 'Sanjay Rao',
    'staff-r12-002': 'Senior Manager CHE',
  };

  // Vehicle name lookup — ONE base ref, compute in useMemo
  const vehicleNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [vin, v] of Object.entries(vehicleMap)) {
      map[vin] = `${v.year} ${v.make} ${v.model}`;
    }
    return map;
  }, [vehicleMap]);

  const setView = useCallback(
    (v: 'kanban' | 'list') => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === 'kanban') params.delete('view');
      else params.set('view', v);
      router.replace(`/leads?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleDragStart = useCallback((leadId: string) => setActiveDragId(leadId), []);
  const handleDragEnd = useCallback(() => setActiveDragId(null), []);

  const handleDrop = useCallback(
    (leadId: string, targetStage: LeadStage) => {
      setActiveDragId(null);
      if (!user) return;
      const actor = { id: user.id, name: user.name, role: user.role };
      try {
        useLeadsStore.getState().transitionStage(leadId, targetStage, actor);
      } catch (err) {
        if (err instanceof InvalidLeadStageTransitionError) {
          toast('Cannot move lead backward — log a note instead.', 'error');
        } else {
          toast('Could not move lead. Please try again.', 'error');
        }
      }
    },
    [user, toast],
  );

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const groups: Record<string, Lead[]> = {};
    for (const s of [...KANBAN_STAGES.map((x) => x.stage), 'LOST' as LeadStage]) {
      groups[s] = outletLeads.filter((l) => l.stage === s);
    }
    return groups;
  }, [outletLeads]);

  const activeCount = useMemo(
    () => outletLeads.filter((l) => ACTIVE_STAGES.has(l.stage) && l.stage !== 'DELIVERED').length,
    [outletLeads],
  );

  if (!hydrated) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 bg-bg-subtle rounded-md animate-pulse" />
          <div className="h-9 w-32 bg-bg-subtle rounded-md animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((s) => (
            <div key={s.stage} className="flex-shrink-0 w-[280px]">
              <div className="h-8 bg-bg-subtle rounded-md mb-2 animate-pulse" />
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-bg-subtle rounded-md mb-2 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">{t('title')}</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {activeCount} {t('activeLeads')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Gate role={['R05', 'R09', 'R10', 'R12', 'R13', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={() => router.push('/leads/new')}
              className="flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Plus size={16} aria-hidden="true" />
              {t('newLead')}
            </button>
          </Gate>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-line flex-shrink-0">
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
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <LeadsListView
            leads={outletLeads}
            activities={activities}
            customerNames={CUSTOMER_NAMES}
            vehicleNames={vehicleNames}
          />
        </div>
      ) : (
        <>
          <div
            className="flex-1 overflow-x-auto px-6 py-4"
            role="region"
            aria-label="Leads Kanban board"
          >
            {outletLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-base font-medium text-ink-primary">{t('noLeads')}</p>
              </div>
            ) : (
              <div className="flex gap-3 pb-4 min-w-max">
                {KANBAN_STAGES.map(({ stage, label }) => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    label={label}
                    leads={leadsByStage[stage] ?? []}
                    activities={activities}
                    customerNames={CUSTOMER_NAMES}
                    vehicleNames={vehicleNames}
                    advisorNames={ADVISOR_NAMES}
                    activeDragId={activeDragId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            )}
          </div>
          {/* LOST list below the board */}
          <LostList
            leads={leadsByStage['LOST'] ?? []}
            activities={activities}
            customerNames={CUSTOMER_NAMES}
            vehicleNames={vehicleNames}
          />
        </>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
