/**
 * CustomBuildsBoard — 7-column Kanban board + list view toggle.
 *
 * URL state: ?view=kanban (default) | list
 * Columns: Enquiry · Quoted · Approved · Parts Ordering · In Progress · QC · Delivered
 * Drag-drop: native HTML5 DnD (mirrors sales module pattern).
 *            Drop triggers advanceStage with role gate.
 *            InvalidStageTransitionError + InsufficientRoleError → toast, no state mutation.
 * Filter bar: outlet · vendor · stage (URL-synced).
 *
 * L43 (locked): Column header shows name + count chip + currency total.
 *   Column width ~300px to accommodate new card design.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §5, P1.1 L18, L43
 */

'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, LayoutGrid, List, ScanEye } from 'lucide-react';
import { cn } from '@dms/ui';
import type { BuildJob, BuildJobStage } from '@dms/types';
import { InvalidStageTransitionError, InsufficientRoleError } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { BuildJobCard } from './build-job-card';
import { BuildJobListView } from './build-job-list-view';

// ─── Customer directory (fixture-based — loaded once) ─────────────────────────

const CUSTOMER_DIRECTORY: Record<string, { name: string; phone: string }> = {
  'cust-arjun-mehta':   { name: 'Arjun Mehta',   phone: '+919876001003' },
  'cust-priya-mehta':   { name: 'Priya Mehta',    phone: '+919876001004' },
  'cust-rohan-desai':   { name: 'Rohan Desai',    phone: '+919876001001' },
  'cust-vikram-singh':  { name: 'Vikram Singh',   phone: '+919876002001' },
  'cust-meera-iyer':    { name: 'Meera Iyer',     phone: '+919876002002' },
  'cust-sunita-reddy':  { name: 'Sunita Reddy',   phone: '+919876003001' },
  'cust-karan-shah':    { name: 'Karan Shah',     phone: '+919876003002' },
};

function resolveCustomer(customerId: string): { name: string; phone?: string } {
  const known = CUSTOMER_DIRECTORY[customerId];
  if (known) return known;
  // Fallback: humanize the ID
  const name = customerId
    .replace('cust-', '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { name };
}

// ─── Stage columns config ─────────────────────────────────────────────────────

const KANBAN_STAGES: { stage: BuildJobStage; label: string }[] = [
  { stage: 'ENQUIRY',        label: 'Enquiry' },
  { stage: 'QUOTED',         label: 'Quoted' },
  { stage: 'APPROVED',       label: 'Approved' },
  { stage: 'PARTS_ORDERING', label: 'Parts Ordering' },
  { stage: 'IN_PROGRESS',    label: 'In Progress' },
  { stage: 'QC',             label: 'QC' },
  { stage: 'DELIVERED',      label: 'Delivered' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function formatColumnTotal(jobs: BuildJob[]): string {
  const total = jobs.reduce((sum, j) => sum + (j.quoteTotal ?? 0), 0);
  if (total === 0) return '';
  // Compact: 12,50,000 → ₹12.5L
  if (total >= 100_000) return `₹${(total / 100_000).toFixed(1)}L`;
  return `₹${INR.format(total)}`;
}

// ─── Column component ─────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: BuildJobStage;
  label: string;
  jobs: BuildJob[];
  vendors: { id: string; name: string }[];
  vehicles: Record<string, { make: string; model: string; year: number }>;
  activeDragId: string | null;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  onDrop: (jobId: string, targetStage: BuildJobStage) => void;
}

function KanbanColumn({
  stage,
  label,
  jobs,
  vendors,
  vehicles,
  activeDragId,
  onDragStart,
  onDragEnd,
  onDrop,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragSource = activeDragId != null && jobs.some((j) => j.id === activeDragId);
  const colTotal = formatColumnTotal(jobs);

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
        const jobId = e.dataTransfer.getData('text/plain');
        if (jobId && !isDragSource) {
          onDrop(jobId, stage);
        }
      }}
      className={cn(
        'flex-shrink-0 w-[300px] flex flex-col min-h-[500px] rounded-md border p-3 transition-colors',
        isDragOver && !isDragSource ? 'border-accent bg-accent/5' : 'border-line bg-bg-subtle',
      )}
      aria-label={`${label} column — ${jobs.length} builds`}
    >
      {/* Column header — matches sales kanban-column exactly */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink-primary">{label}</h3>
          <span className="bg-bg-hover rounded-full px-2 py-0.5 text-[11px] font-mono text-ink-muted">
            {jobs.length}
          </span>
        </div>
        {colTotal && (
          <span className="font-mono text-[11px] text-ink-muted tabular-nums">{colTotal}</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {jobs.length === 0 ? (
          <p className="text-center text-xs text-ink-muted py-8">No builds in this stage.</p>
        ) : (
          jobs.map((job) => {
            const vendorName = job.vendorId
              ? vendors.find((v) => v.id === job.vendorId)?.name
              : undefined;
            const veh = vehicles[job.vin];
            const vehicleName = veh
              ? `${veh.year} ${veh.make} ${veh.model}`
              : job.vin;
            const customer = resolveCustomer(job.customerId);
            return (
              <div
                key={job.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', job.id);
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart(job.id);
                }}
                onDragEnd={onDragEnd}
                className={cn(activeDragId === job.id && 'opacity-50')}
              >
                <BuildJobCard
                  job={job}
                  customerName={customer.name}
                  customerPhone={customer.phone}
                  vehicleName={vehicleName}
                  vendorName={vendorName}
                  isDragging={activeDragId === job.id}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function CustomBuildsBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'list';

  const jobs = useCustomBuildsStore((s) => s.jobs);
  const vendors = useCustomBuildsStore((s) => s.vendors);
  const hydrated = useCustomBuildsStore((s) => s.hydrated);
  const vehicleMap = useVehiclesStore((s) => s.vehicles);
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const setView = useCallback(
    (v: 'kanban' | 'list') => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === 'kanban') {
        params.delete('view');
      } else {
        params.set('view', v);
      }
      router.replace(`/custom-builds?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleNewJob = useCallback(() => {
    router.push('/custom-builds/new');
  }, [router]);

  const handleDragStart = useCallback((jobId: string) => {
    setActiveDragId(jobId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleDrop = useCallback(
    (jobId: string, targetStage: BuildJobStage) => {
      setActiveDragId(null);
      if (!user) return;

      const actor = { id: user.id, name: user.name, role: user.role };

      try {
        useCustomBuildsStore.getState().advanceStage(jobId, targetStage, actor);
      } catch (err) {
        if (err instanceof InvalidStageTransitionError) {
          toast(`Invalid move: cannot drag directly to ${targetStage}`, 'error');
        } else if (err instanceof InsufficientRoleError) {
          toast(`You do not have permission to move a job to ${targetStage}`, 'error');
        } else {
          toast('Could not move build job. Please try again.', 'error');
        }
      }
    },
    [user, toast],
  );

  if (!hydrated) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 bg-bg-subtle rounded animate-pulse" />
          <div className="h-9 w-32 bg-bg-subtle rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((s) => (
            <div key={s.stage} className="flex-shrink-0 w-[300px]">
              <div className="h-8 bg-bg-subtle rounded mb-2 animate-pulse" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-36 bg-bg-subtle rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Group jobs by stage — include QC_FAILED in QC column
  const jobsByStage = KANBAN_STAGES.reduce<Record<BuildJobStage, BuildJob[]>>(
    (acc, { stage }) => {
      acc[stage] = jobs.filter((j) =>
        stage === 'QC' ? j.stage === 'QC' || j.stage === 'QC_FAILED' : j.stage === stage,
      );
      return acc;
    },
    {} as Record<BuildJobStage, BuildJob[]>,
  );

  const vendorList = vendors.map((v) => ({ id: v.id, name: v.name }));
  const canCreate = user && ['R09', 'R10', 'R11', 'R12', 'R16', 'R19', 'R22', 'R24'].includes(user.role);

  // Flatten vehicle store to just the fields we need
  const vehicles: Record<string, { make: string; model: string; year: number }> = {};
  for (const [vin, vm] of Object.entries(vehicleMap)) {
    vehicles[vin] = { make: vm.make, model: vm.model, year: vm.year };
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
        <div>
          <h1 className="text-[18px] font-semibold text-ink-primary">Custom Builds</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {jobs.filter((j) => j.stage !== 'DELIVERED' && j.stage !== 'CANCELLED').length} active builds
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* L94: Visualizer Playground — showroom demo without a build job */}
          <button
            type="button"
            onClick={() => router.push('/custom-builds/visualizer-playground')}
            className="flex items-center gap-2 h-9 px-4 rounded-md bg-bg-subtle border border-line text-ink-secondary text-[13px] font-medium hover:bg-bg-hover hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <ScanEye size={16} aria-hidden="true" />
            Visualise a Car
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={handleNewJob}
              className="flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Plus size={16} aria-hidden="true" />
              New Build Job
            </button>
          )}
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
          <BuildJobListView jobs={jobs} vendors={vendors} />
        </div>
      ) : (
        <div
          className="flex-1 overflow-x-auto px-6 py-4 scrollbar-thin-dark"
          role="region"
          aria-label="Build jobs Kanban board"
        >
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-[16px] font-medium text-ink-primary">No builds yet</p>
              <p className="text-[13px] text-ink-muted mt-1">Create the first one.</p>
            </div>
          ) : (
            <div className="flex gap-3 pb-4 min-w-max">
              {KANBAN_STAGES.map(({ stage, label }) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  label={label}
                  jobs={jobsByStage[stage] ?? []}
                  vendors={vendorList}
                  vehicles={vehicles}
                  activeDragId={activeDragId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast notifications for DnD errors */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
