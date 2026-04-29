/**
 * RenewalPipelineView — Kanban + List view toggle for renewal leads.
 *
 * Styled to match sales/custom-builds canonical Kanban pattern (L43 equivalent):
 *   - Column header: bold name + count chip + currency total (₹NL compact)
 *   - Column width: 300px, card width ~280px
 *   - Card: customer name bold + priority dot, phone masked, vehicle+VIN, premium, time-ago, stage chip
 *   - Drag-drop: native HTML5 DnD, forward-only stage transitions, invalid drop → toast
 *   - scrollbar-thin-dark on horizontal scroll container
 *
 * View toggle (L_P2_3):
 *   - URL state: ?view=kanban (default) | ?view=list
 *   - View toggle buttons mirror custom-builds-board pattern
 *
 * Expiry chip colour tiers (§35):
 *   - 31–60d to expiry → amber
 *   - ≤30d            → red
 *   - ≤7d             → urgent-red (urgent priority)
 *
 * Gate: R09+
 * Spec reference: SPEC-INSURANCE-001 §5.3, §31, §35, L7, L_P2_1, L_P2_2, L_P2_3
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Clock, Copy, Check, LayoutGrid, List } from 'lucide-react';
import { cn } from '@dms/ui';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { Gate } from '@/src/components/primitives/gate';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { LeadListView } from './lead-list-view';
import { ClosePolicyDialog } from './dialogs/close-policy-dialog';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import type { InsuranceLead, InsuranceLeadStage } from '@dms/types';

// ─── Stage config ─────────────────────────────────────────────────────────────

/**
 * L_P2_2 (locked): Kanban stages map to Lead.stage directly.
 * Forward-only transitions: due-soon → due → quoted → negotiating → closed-won|closed-lost
 * due-soon and due are derived from priority, not an independent state.
 */
const STAGE_CONFIG: {
  id: InsuranceLeadStage;
  label: string;
  subtitle: string;
  colorClass: string;
}[] = [
  { id: 'due-soon',    label: 'Due Soon',     subtitle: '31–60 days',    colorClass: 'text-ink-muted' },
  { id: 'due',         label: 'Due',          subtitle: '≤30 days',      colorClass: 'text-warning' },
  { id: 'quoted',      label: 'Quoted',       subtitle: 'Quote sent',    colorClass: 'text-accent' },
  { id: 'negotiating', label: 'Negotiating',  subtitle: 'Engaged',       colorClass: 'text-info' },
  { id: 'closed-won',  label: 'Closed Won',   subtitle: 'Policy issued', colorClass: 'text-success' },
  { id: 'closed-lost', label: 'Closed Lost',  subtitle: 'Not converted', colorClass: 'text-error' },
];

/**
 * Forward-only transition map (L_P2_2).
 * A lead may only move to one of the listed target stages.
 */
const VALID_FORWARD_TRANSITIONS: Partial<Record<InsuranceLeadStage, InsuranceLeadStage[]>> = {
  'due-soon':    ['due', 'quoted'],
  'due':         ['quoted'],
  'quoted':      ['negotiating', 'closed-won', 'closed-lost'],
  'negotiating': ['closed-won', 'closed-lost'],
};

function isValidTransition(from: InsuranceLeadStage, to: InsuranceLeadStage): boolean {
  const allowed = VALID_FORWARD_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last2 = cleaned.slice(-2);
    const first5 = cleaned.startsWith('91') ? `+${cleaned.slice(0, 4)}` : `+91${cleaned.slice(0, 2)}`;
    return `${first5}···${last2}`;
  }
  return phone;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function daysUntilExpiry(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Compact ₹NL format for column totals */
function formatColumnTotal(leads: InsuranceLead[]): string {
  const total = leads.reduce((sum, l) => {
    const best = l.quotes.reduce((max, q) => Math.max(max, q.totalPremium), 0);
    return sum + best;
  }, 0);
  if (total === 0) return '';
  if (total >= 100_000) return `₹${(total / 100_000).toFixed(1)}L total premium`;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(total)}`;
}

/** §35: Expiry chip colour tier */
function expiryChipClass(days: number): string {
  if (days <= 7)  return 'bg-[rgb(var(--state-overdue)/0.12)] text-[rgb(var(--state-overdue))]';
  if (days <= 30) return 'bg-[rgb(var(--state-overdue)/0.08)] text-warning';
  return 'bg-[rgb(var(--state-pending)/0.08)] text-[rgb(var(--state-pending))]';
}

/** Stage micro-status label derived from lead data (§35) */
function getMicroStatus(lead: InsuranceLead): string {
  if (lead.expiresAt) {
    const days = daysUntilExpiry(lead.expiresAt);
    if (lead.stage === 'due-soon' || lead.stage === 'due') {
      return `${days}d to expiry`;
    }
  }
  switch (lead.stage) {
    case 'quoted':      return lead.quotes.length > 0 ? 'Quote sent' : 'Awaiting quote';
    case 'negotiating': return 'Awaiting docs';
    case 'closed-won':  return 'Policy issued';
    case 'closed-lost': return 'Lost';
    default:            return '';
  }
}

function getMicroStatusClass(lead: InsuranceLead): string {
  switch (lead.stage) {
    case 'due-soon':    return 'bg-[rgb(var(--state-pending)/0.08)] text-[rgb(var(--state-pending))]';
    case 'due':         return 'bg-[rgb(var(--state-overdue)/0.08)] text-warning';
    case 'quoted':      return 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]';
    case 'negotiating': return 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]';
    case 'closed-won':  return 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]';
    case 'closed-lost': return 'bg-bg-subtle text-ink-muted';
    default:            return 'bg-bg-subtle text-ink-muted';
  }
}

// ─── VIN copy badge (mirrored from build-job-card) ────────────────────────────

function VinCopyBadge({ vin }: { vin: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(vin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [vin]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy VIN ${vin}`}
      className={cn(
        'inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded',
        'bg-bg-subtle text-ink-muted border border-line/60 transition-colors',
        'hover:bg-bg-hover hover:text-ink-secondary',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
      )}
    >
      {vin}
      {copied
        ? <Check size={9} className="text-accent" aria-hidden />
        : <Copy size={9} aria-hidden />}
    </button>
  );
}

// ─── Lead card ────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: InsuranceLead;
  vehicleName: string;
  customerName: string;
  customerPhone: string;
  isDragging?: boolean;
}

function LeadCard({ lead, vehicleName, customerName, customerPhone, isDragging }: LeadCardProps) {
  const isUrgent = lead.priority === 'urgent';
  const microStatus = getMicroStatus(lead);
  const microStatusClass = getMicroStatusClass(lead);
  const bestPremium = lead.quotes.reduce((max, q) => Math.max(max, q.totalPremium), 0);

  return (
    <Link
      href={`/insurance/leads/${lead.leadId}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
    >
      <div
        className={cn(
          'bg-bg-surface border border-line rounded-md p-3',
          'hover:border-accent/40 cursor-grab active:cursor-grabbing',
          'transition-colors relative select-none',
          isDragging && 'opacity-60 shadow-lg rotate-1',
        )}
        aria-label={`Insurance lead for ${customerName} — ${vehicleName}`}
      >
        {/* Priority dot (top-right) */}
        {isUrgent && (
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[rgb(var(--state-overdue))]"
            aria-label="Urgent — expiry within 30 days"
          />
        )}

        {/* Customer name (bold) */}
        <div className="flex items-start justify-between mb-1 gap-2 pr-3">
          <h3 className="text-sm font-medium text-ink-primary truncate">{customerName}</h3>
        </div>

        {/* Phone masked (mono muted) */}
        <p className="font-mono text-xs text-ink-muted mb-2">{maskPhone(customerPhone)}</p>

        {/* Vehicle name + VIN copy badge */}
        <p className="text-[13px] text-ink-secondary mb-1 line-clamp-1">{vehicleName}</p>
        <div className="mb-2">
          <VinCopyBadge vin={lead.vin} />
        </div>

        {/* Premium — large bold mono (or expiry chip if no quotes yet) */}
        {bestPremium > 0 ? (
          <p className="font-mono text-[15px] text-ink-primary mb-2 tabular-nums">
            &#8377;{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(bestPremium)}
          </p>
        ) : lead.expiresAt ? (
          (() => {
            const days = daysUntilExpiry(lead.expiresAt);
            return (
              <p className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded inline-block mb-2', expiryChipClass(days))}>
                {days}d to expiry
              </p>
            );
          })()
        ) : (
          <p className="text-sm text-ink-muted mb-2">No quote yet</p>
        )}

        {/* Footer: time-ago chip + stage micro-status badge */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-ink-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {timeAgo(lead.updatedAt)}
          </span>
          {microStatus && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', microStatusClass)}>
              {microStatus}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: InsuranceLeadStage;
  label: string;
  subtitle: string;
  colorClass: string;
  leads: InsuranceLead[];
  vehicleMap: Record<string, { make: string; model: string; year: number }>;
  customerById: Record<string, { name: string; phone: string }>;
  activeDragId: string | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDrop: (leadId: string, targetStage: InsuranceLeadStage) => void;
}

function KanbanColumn({
  stage,
  label,
  subtitle,
  colorClass,
  leads,
  vehicleMap,
  customerById,
  activeDragId,
  onDragStart,
  onDragEnd,
  onDrop,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragSource = activeDragId != null && leads.some((l) => l.leadId === activeDragId);
  const colTotal = formatColumnTotal(leads);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragSource) setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const leadId = e.dataTransfer.getData('text/plain');
        if (leadId && !isDragSource) {
          onDrop(leadId, stage);
        }
      }}
      className={cn(
        'flex-shrink-0 w-[300px] flex flex-col min-h-[500px] rounded-md border p-3 transition-colors',
        isDragOver && !isDragSource ? 'border-accent bg-accent/5' : 'border-line bg-bg-subtle',
      )}
      aria-label={`${label} column — ${leads.length} leads`}
    >
      {/* Column header — mirrors sales/custom-builds pattern */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <h3 className={cn('text-sm font-semibold', colorClass)}>{label}</h3>
          <span className="bg-bg-hover rounded-full px-2 py-0.5 text-[11px] font-mono text-ink-muted">
            {leads.length}
          </span>
        </div>
        {colTotal && (
          <span className="font-mono text-[11px] text-ink-muted tabular-nums">{colTotal}</span>
        )}
      </div>
      <p className="text-[10px] text-ink-faint mb-2 -mt-2">{subtitle}</p>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {leads.length === 0 ? (
          <p className="text-center text-xs text-ink-muted py-8">No leads in this stage.</p>
        ) : (
          leads.map((lead) => {
            const veh = vehicleMap[lead.vin];
            const vehicleName = veh ? `${veh.year} ${veh.make} ${veh.model}` : lead.vin;
            const customer = customerById[lead.customerId] ?? { name: 'Unknown customer', phone: '' };
            return (
              <div
                key={lead.leadId}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', lead.leadId);
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart(lead.leadId);
                }}
                onDragEnd={onDragEnd}
                className={cn(activeDragId === lead.leadId && 'opacity-50')}
              >
                <LeadCard
                  lead={lead}
                  vehicleName={vehicleName}
                  customerName={customer.name}
                  customerPhone={customer.phone}
                  isDragging={activeDragId === lead.leadId}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Role rank helper (mirrors lead-slice) ─────────────────────────────────────

function rankRole(role: string): number {
  const n = parseInt(role.replace('R', ''), 10);
  return isNaN(n) ? 0 : n;
}

// ─── Close-policy dialog portal (avoids IIFE in JSX) ────────────────────────

interface ClosePolicyDialogPortalProps {
  closePolicyTarget: { leadId: string; prefillQuoteId?: string; prefillPremium?: number } | null;
  leads: InsuranceLead[];
  user: { id: string; name: string; role: string } | null;
  toast: (msg: string, variant: 'success' | 'error') => void;
  onClose: () => void;
}

function ClosePolicyDialogPortal({
  closePolicyTarget,
  leads,
  user,
  toast,
  onClose,
}: ClosePolicyDialogPortalProps) {
  if (!closePolicyTarget || !user) return null;

  const targetLead = leads.find((l) => l.leadId === closePolicyTarget.leadId);
  if (!targetLead) return null;

  return (
    <ClosePolicyDialog
      open={true}
      onClose={onClose}
      lead={targetLead}
      actor={{ id: user.id, name: user.name, role: user.role }}
      prefill={{
        selectedQuoteId: closePolicyTarget.prefillQuoteId,
        totalPremium: closePolicyTarget.prefillPremium,
      }}
      onSuccess={() => {
        toast('Lead closed as Won. Policy details recorded.', 'success');
        onClose();
      }}
    />
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function RenewalPipelineView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'list';

  const leads = useInsuranceStore((s) => s.leads);
  const syncRenewalFeed = useInsuranceStore((s) => s.syncRenewalFeed);
  const advanceStage = useInsuranceStore((s) => s.advanceStage);
  const vehicleMap = useVehiclesStore((s) => s.vehicles);
  const customers = useCustomersStore((s) => s.customers);
  const { user } = useStaffAuth();

  // Memoized customerId → { name, phone } lookup — base ref + useMemo avoids infinite renders
  const customerById = useMemo(() => {
    const map: Record<string, { name: string; phone: string }> = {};
    for (const [id, c] of Object.entries(customers)) {
      map[id] = { name: c.name, phone: c.phone ?? '' };
    }
    return map;
  }, [customers]);
  const { toasts, toast, dismiss } = useToast();

  const [syncResult, setSyncResult] = useState<{ created: number; skipped: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Close-policy dialog state: triggered when drop targets closed-won
  const [closePolicyTarget, setClosePolicyTarget] = useState<{
    leadId: string;
    prefillQuoteId?: string;
    prefillPremium?: number;
  } | null>(null);

  // L_INT_1: hydrator runs auto-feed once on mount
  useEffect(() => {
    const result = syncRenewalFeed();
    setSyncResult(result);
  }, [syncRenewalFeed]);

  const setView = useCallback(
    (v: 'kanban' | 'list') => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === 'kanban') {
        params.delete('view');
      } else {
        params.set('view', v);
      }
      router.replace(`/insurance/renewal-pipeline?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleManualSync() {
    setSyncing(true);
    const result = syncRenewalFeed();
    setSyncResult(result);
    setSyncing(false);
  }

  const handleDrop = useCallback(
    (leadId: string, targetStage: InsuranceLeadStage) => {
      // L_INT_2: Live actor from useStaffAuth — never hardcoded
      if (!user) {
        toast('Sign in required to move leads.', 'error');
        return;
      }
      if (rankRole(user.role) < 9) {
        toast('Insufficient role for stage transitions.', 'error');
        return;
      }

      const lead = leads.find((l) => l.leadId === leadId);
      if (!lead) return;

      // Validate forward-only transition (L_P2_2)
      if (!isValidTransition(lead.stage, targetStage)) {
        toast(
          `Cannot move from "${lead.stage}" to "${targetStage}". Only forward transitions are allowed.`,
          'error',
        );
        return;
      }

      const actor = { id: user.id, name: user.name, role: user.role };

      // When dropping to closed-won, open the close-policy dialog as a confirmation step
      // Pre-fill best quote if available
      if (targetStage === 'closed-won') {
        if (rankRole(user.role) < 10) {
          toast('Insufficient role for stage transitions.', 'error');
          return;
        }
        const bestQuote = lead.quotes.reduce<typeof lead.quotes[0] | null>(
          (max, q) => (!max || q.totalPremium > max.totalPremium ? q : max),
          null,
        );
        setClosePolicyTarget({
          leadId,
          prefillQuoteId: bestQuote?.quoteId,
          prefillPremium: bestQuote?.totalPremium,
        });
        return;
      }

      // For closed-lost, check R10+
      if (targetStage === 'closed-lost' && rankRole(user.role) < 10) {
        toast('Insufficient role for stage transitions.', 'error');
        return;
      }

      try {
        advanceStage(leadId, targetStage, actor);
      } catch (err) {
        toast(
          err instanceof Error ? err.message : 'Stage transition failed.',
          'error',
        );
      }
    },
    [leads, advanceStage, toast, user],
  );

  // Flatten vehicleMap to just the fields consumed by LeadListView
  const vehicles: Record<string, { make: string; model: string; year: number }> = {};
  for (const [vin, vm] of Object.entries(vehicleMap)) {
    vehicles[vin] = { make: vm.make, model: vm.model, year: vm.year };
  }

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="text-[22px] font-semibold text-ink-primary">Renewal Pipeline</h1>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Auto-populated from expiring policies. Drag to advance stage.
            </p>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 h-9 px-3 rounded border border-line bg-bg-surface text-[13px] text-ink-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh Expiry Feed
          </button>
        </div>

        {/* Sync banner */}
        {syncResult && syncResult.created > 0 && (
          <div className="px-6 py-2 bg-accent/10 border-b border-accent/20 shrink-0">
            <p className="text-[12px] text-accent">
              Renewal feed sync complete — {syncResult.created} lead{syncResult.created !== 1 ? 's' : ''} created,{' '}
              {syncResult.skipped} skipped (idempotent).
            </p>
          </div>
        )}

        {/* View toggle — mirrors custom-builds-board pattern (L_P2_3) */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-line shrink-0">
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
        </div>

        {/* Content */}
        {view === 'list' ? (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <LeadListView leads={leads} vehicleMap={vehicles} />
          </div>
        ) : (
          /* Kanban board — scrollbar-thin-dark on horizontal scroll */
          <div className="flex-1 overflow-x-auto scrollbar-thin-dark p-6">
            <div className="flex gap-3 min-w-max h-full">
              {STAGE_CONFIG.map((col) => {
                const colLeads = leads.filter((l) => l.stage === col.id);
                return (
                  <KanbanColumn
                    key={col.id}
                    stage={col.id}
                    label={col.label}
                    subtitle={col.subtitle}
                    colorClass={col.colorClass}
                    leads={colLeads}
                    vehicleMap={vehicleMap}
                    customerById={customerById}
                    activeDragId={activeDragId}
                    onDragStart={setActiveDragId}
                    onDragEnd={() => setActiveDragId(null)}
                    onDrop={handleDrop}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* IRDAI disclaimer */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-[11px] text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Insurance is the subject matter of solicitation.
          </p>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Close-policy dialog — triggered when dropping card on closed-won column */}
      <ClosePolicyDialogPortal
        closePolicyTarget={closePolicyTarget}
        leads={leads}
        user={user}
        toast={toast}
        onClose={() => setClosePolicyTarget(null)}
      />
    </Gate>
  );
}
