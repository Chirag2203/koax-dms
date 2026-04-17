'use client';

import { useState } from 'react';
import { Plus, Play, Pause, CheckCircle, Pencil, Trash2, SkipForward } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate, StateChip } from '@/src/components/primitives';
import { AlertDialog } from '@/src/components/primitives/dialog';
import type { StateChipStatus } from '@/src/components/primitives';
import type { JobCard, LabourLine, LabourLineStatus } from '@dms/types';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { LabourFormDialog } from '@/src/components/service/action-flows/labour-form-dialog';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  heading: 'Labour Lines',
  addLabour: 'Add Labour',
  empty: 'No labour lines yet. Add the first one to begin.',
  colCode: 'Code',
  colDescription: 'Description',
  colFlatRate: 'Flat Rate (hrs)',
  colActual: 'Actual (hrs)',
  colRate: '₹/hr',
  colTotal: 'Total',
  colTechnician: 'Technician',
  colStatus: 'Status',
  colActions: 'Actions',
  subtotal: 'Labour Sub-total',
  discount: 'Discount',
  tax: 'GST 18%',
  grandTotal: 'Grand Total',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const LABOUR_STATUS_CHIP: Record<LabourLineStatus, StateChipStatus> = {
  PLANNED: 'pending',
  IN_PROGRESS: 'svc-in-progress',
  DONE: 'svc-delivered',
  SKIPPED: 'stale',
};

const TECH_NAME_MAP: Record<string, string> = {
  'tech-r11-001': 'K. Kumar',
  'tech-r11-002': 'R. Patel',
  'tech-r11-003': 'A. Sharma',
  'tech-r11-004': 'S. Verma',
};

function getInitials(techId: string): string {
  const name = TECH_NAME_MAP[techId] ?? techId;
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardLabourTabProps {
  jobCard: JobCard;
}

// ─── Complete actual hours popover ────────────────────────────────────────────

function CompletePopover({
  line,
  onConfirm,
  onCancel,
}: {
  line: LabourLine;
  onConfirm: (actualHours: number) => void;
  onCancel: () => void;
}) {
  const [hrs, setHrs] = useState(line.actualHours ?? line.flatRateHours);
  return (
    <div className="absolute z-20 right-0 top-8 rounded-md border border-line bg-bg-surface shadow-lg p-4 min-w-[220px]">
      <p className="text-[13px] font-medium text-ink-primary mb-3">Confirm actual hours</p>
      <input
        type="number"
        value={hrs}
        min={0}
        step={0.1}
        onChange={(e) => setHrs(Number(e.target.value))}
        className={cn(
          'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm font-mono tabular-nums text-right',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 mb-3',
        )}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-8 rounded-md border border-line text-[12px] text-ink-secondary hover:bg-bg-subtle transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(hrs)}
          className="flex-1 h-8 rounded-md bg-accent text-white text-[12px] font-medium hover:bg-accent-hover transition-colors"
        >
          Complete
        </button>
      </div>
    </div>
  );
}

// ─── Labour Row ───────────────────────────────────────────────────────────────

type ToastFn = (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void;

interface LabourRowProps {
  line: LabourLine;
  index: number;
  jobCardId: string;
  onEdit: (line: LabourLine) => void;
  toast: ToastFn;
}

function LabourRow({ line, index, jobCardId, onEdit, toast }: LabourRowProps) {
  const { user } = useStaffAuth();
  const updateLabour = useServiceStore((s) => s.updateLabour);
  const deleteLabour = useServiceStore((s) => s.deleteLabour);

  const [showComplete, setShowComplete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  const total = line.flatRateHours * line.rate;
  const isOverTime =
    line.actualHours !== undefined && line.actualHours !== null
      ? line.actualHours > line.flatRateHours
      : false;

  function handleStart() {
    updateLabour(line.id, { status: 'IN_PROGRESS' }, actor);
    toast(`Started: ${line.description}`, 'success');
  }
  function handlePause() {
    updateLabour(line.id, { status: 'PLANNED' }, actor);
    toast(`Paused: ${line.description}`, 'info');
  }
  function handleComplete(actualHours: number) {
    updateLabour(line.id, { status: 'DONE', actualHours }, actor);
    setShowComplete(false);
    toast(`Completed: ${line.description}`, 'success');
  }
  function handleDelete() {
    deleteLabour(line.id, actor);
    setShowDeleteConfirm(false);
    toast('Labour line removed', 'info');
  }
  function handleSkip() {
    updateLabour(line.id, { status: 'SKIPPED' }, actor);
    setShowSkipConfirm(false);
    toast(`Skipped: ${line.description}`, 'info');
  }

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-[100px_1fr_100px_100px_90px_90px_140px_100px_120px] items-center px-4 py-3 min-w-[950px]',
          index % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle',
          'hover:bg-accent/5 transition-colors',
        )}
      >
        {/* Code */}
        <span className="font-mono text-[12px] text-ink-secondary truncate">
          {line.code}
        </span>

        {/* Description */}
        <span className="text-[13px] text-ink-primary truncate pr-2">
          {line.description}
        </span>

        {/* Flat rate */}
        <span className="font-mono text-[13px] tabular-nums text-ink-primary text-right pr-4">
          {line.flatRateHours.toFixed(1)}
        </span>

        {/* Actual */}
        <span
          className={cn(
            'font-mono text-[13px] tabular-nums text-right pr-4',
            line.actualHours !== undefined && line.actualHours !== null
              ? isOverTime
                ? 'text-state-danger'
                : 'text-[rgb(var(--state-listed))]'
              : 'text-ink-muted',
          )}
        >
          {line.actualHours !== undefined && line.actualHours !== null
            ? line.actualHours.toFixed(1)
            : '—'}
        </span>

        {/* Rate */}
        <span className="font-mono text-[13px] tabular-nums text-ink-secondary text-right pr-4">
          {(line.rate / 1000).toFixed(1)}k
        </span>

        {/* Total */}
        <span className="font-mono text-[13px] tabular-nums text-ink-primary text-right pr-4">
          {(total / 1000).toFixed(1)}k
        </span>

        {/* Technician */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
            {getInitials(line.technicianId)}
          </div>
          <span className="text-[12px] text-ink-secondary truncate">
            {TECH_NAME_MAP[line.technicianId] ?? line.technicianId}
          </span>
        </div>

        {/* Status */}
        <StateChip status={LABOUR_STATUS_CHIP[line.status]} />

        {/* Actions */}
        <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
          <div className="relative flex items-center gap-0.5">
            {/* Status transitions */}
            {line.status === 'PLANNED' && (
              <button
                type="button"
                onClick={handleStart}
                aria-label="Start labour line"
                title="Start"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {line.status === 'IN_PROGRESS' && (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  aria-label="Pause labour line"
                  title="Pause"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowComplete(true)}
                  aria-label="Complete labour line"
                  title="Complete"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-[rgb(var(--state-listed))] hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}
            {line.status === 'PLANNED' && (
              <button
                type="button"
                onClick={() => setShowSkipConfirm(true)}
                aria-label="Skip labour line"
                title="Skip"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-[rgb(var(--state-stale))] hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {/* Edit */}
            {line.status !== 'DONE' && line.status !== 'SKIPPED' && (
              <button
                type="button"
                onClick={() => onEdit(line)}
                aria-label="Edit labour line"
                title="Edit"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete labour line"
              title="Delete"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-state-danger hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {/* Complete popover */}
            {showComplete && (
              <CompletePopover
                line={line}
                onConfirm={handleComplete}
                onCancel={() => setShowComplete(false)}
              />
            )}
          </div>
        </Gate>
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete labour line?"
        description={`Remove "${line.description}" from this job card. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDelete}
      />

      {/* Skip confirm */}
      <AlertDialog
        open={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        title="Skip labour line?"
        description={`Mark "${line.description}" as skipped. It will not be billed.`}
        confirmLabel="Skip"
        cancelLabel="Cancel"
        destructive={false}
        onConfirm={handleSkip}
      />
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardLabourTab({ jobCard }: JobCardLabourTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editLine, setEditLine] = useState<LabourLine | undefined>(undefined);
  const { toasts, toast, dismiss } = useToast();

  // Source from the store's flat labourLines list, filtered by IDs on the JC.
  // The store mirrors mutations into both jc.labourLines and the flat list.
  const jcFromStore = useServiceStore((s) => s.jobCards.find((jc) => jc.id === jobCard.id));
  const jcLineIds = new Set((jcFromStore ?? jobCard).labourLines.map((l) => l.id));
  const allLabourLines = useServiceStore((s) => s.labourLines);
  const lines = allLabourLines.filter((l) => jcLineIds.has(l.id));

  const subtotal = lines.reduce((sum, l) => sum + l.flatRateHours * l.rate, 0);
  const discount = 0;
  const tax = (subtotal - discount) * 0.18;
  const grandTotal = subtotal - discount + tax;

  function handleEdit(line: LabourLine) {
    setEditLine(line);
  }
  function handleEditClose() {
    setEditLine(undefined);
  }

  if (lines.length === 0) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
        <LabourFormDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          jobCardId={jobCard.id}
        />
        <div className="rounded-md border border-line bg-bg-surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-ink-primary">{MESSAGES.heading}</h2>
            <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {MESSAGES.addLabour}
              </button>
            </Gate>
          </div>
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-muted">
            {MESSAGES.empty}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <LabourFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        jobCardId={jobCard.id}
      />
      <LabourFormDialog
        open={!!editLine}
        onClose={handleEditClose}
        jobCardId={jobCard.id}
        editLine={editLine}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-ink-primary">{MESSAGES.heading}</h2>
          <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {MESSAGES.addLabour}
            </button>
          </Gate>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-line">
          {/* Header row */}
          <div className="grid grid-cols-[100px_1fr_100px_100px_90px_90px_140px_100px_120px] border-b border-line bg-bg-subtle px-4 py-2 min-w-[950px]">
            {[
              MESSAGES.colCode,
              MESSAGES.colDescription,
              MESSAGES.colFlatRate,
              MESSAGES.colActual,
              MESSAGES.colRate,
              MESSAGES.colTotal,
              MESSAGES.colTechnician,
              MESSAGES.colStatus,
              MESSAGES.colActions,
            ].map((h) => (
              <span key={h} className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                {h}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            {lines.map((line, i) => (
              <LabourRow
                key={line.id}
                line={line}
                index={i}
                jobCardId={jobCard.id}
                onEdit={handleEdit}
                toast={toast}
              />
            ))}
          </div>
        </div>

        {/* Footer summary */}
        <div className="rounded-md border border-line bg-bg-surface p-4">
          <div className="ml-auto max-w-xs space-y-2">
            {[
              { label: MESSAGES.subtotal, value: subtotal },
              { label: MESSAGES.discount, value: discount, muted: true },
              { label: MESSAGES.tax,      value: tax,      muted: true },
            ].map(({ label, value, muted }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={cn('text-[13px]', muted ? 'text-ink-muted' : 'text-ink-secondary')}>
                  {label}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ink-primary">
                  {INR.format(value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-[15px] font-semibold text-ink-primary">{MESSAGES.grandTotal}</span>
              <span className="font-mono text-[16px] font-semibold tabular-nums text-ink-primary">
                {INR.format(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
