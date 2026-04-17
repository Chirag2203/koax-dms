'use client';

import { useState } from 'react';
import { Plus, BookmarkCheck, PackageCheck, Wrench, RotateCcw, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate, StateChip } from '@/src/components/primitives';
import { AlertDialog } from '@/src/components/primitives/dialog';
import type { StateChipStatus } from '@/src/components/primitives';
import type { JobCard, PartsLine, PartsLineStatus } from '@dms/types';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { PartsFormDialog } from '@/src/components/service/action-flows/parts-form-dialog';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  heading: 'Parts',
  addPart: 'Add Part',
  empty: 'No parts lines yet. Add the first part to begin.',
  colCode: 'Part Code',
  colDescription: 'Description',
  colQty: 'Qty',
  colUnitPrice: 'Unit Price',
  colTotal: 'Total',
  colWarranty: 'Warranty',
  colStatus: 'Status',
  colActions: 'Actions',
  outOfStock: 'Parts Pending',
  outOfStockMsg: 'Some requested parts may be unavailable. Check with Parts Manager.',
  totalLabel: 'Parts Sub-total',
  warrantyCovered: 'Warranty-Covered',
  yes: 'Yes',
  no: 'No',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const PARTS_STATUS_CHIP: Record<PartsLineStatus, StateChipStatus> = {
  REQUESTED: 'pending',
  RESERVED: 'svc-waiting-parts',
  ISSUED: 'svc-diagnosed',
  FITTED: 'svc-delivered',
  RETURNED: 'stale',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardPartsTabProps {
  jobCard: JobCard;
}

// ─── Parts Row ────────────────────────────────────────────────────────────────

type ToastFn = (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void;

interface PartsRowProps {
  line: PartsLine;
  index: number;
  jobCardId: string;
  onEdit: (line: PartsLine) => void;
  toast: ToastFn;
}

function PartsRow({ line, index, jobCardId, onEdit, toast }: PartsRowProps) {
  const { user } = useStaffAuth();
  const updatePart = useServiceStore((s) => s.updatePart);
  const deletePart = useServiceStore((s) => s.deletePart);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
  const lineTotal = line.qty * line.unitPrice;

  // Shortage stub flag — future: backend would set this
  const isShortage = (line as PartsLine & { shortage?: boolean }).shortage === true;

  function handleReserve() {
    updatePart(line.id, { status: 'RESERVED' }, actor);
    toast(`Reserved: ${line.description}`, 'success');
  }
  function handleIssue() {
    updatePart(line.id, { status: 'ISSUED' }, actor);
    toast(`Issued: ${line.description}`, 'success');
  }
  function handleFit() {
    updatePart(line.id, { status: 'FITTED' }, actor);
    toast(`Fitted: ${line.description}`, 'success');
  }
  function handleReturn() {
    updatePart(line.id, { status: 'RETURNED' }, actor);
    setShowReturnConfirm(false);
    toast(`Returned: ${line.description}`, 'info');
  }
  function handleDelete() {
    deletePart(line.id, actor);
    setShowDeleteConfirm(false);
    toast('Part removed', 'info');
  }

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-[120px_1fr_60px_110px_110px_80px_100px_130px] items-center px-4 py-3 min-w-[840px]',
          index % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle',
          'hover:bg-accent/5 transition-colors',
        )}
      >
        {/* Part Code */}
        <span className="font-mono text-[11px] text-ink-secondary truncate">
          {line.partCode}
        </span>

        {/* Description + shortage stub */}
        <div className="min-w-0 pr-2">
          <span className="text-[13px] text-ink-primary truncate block">
            {line.description}
          </span>
          {isShortage && line.status === 'REQUESTED' && (
            <a
              href={`/parts/po/new?jobCard=${jobCardId}&part=${line.partCode}`}
              onClick={(e) => {
                e.preventDefault();
                toast('S5 Parts module — coming soon', 'info');
              }}
              className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent mt-0.5"
            >
              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
              Create PO (S5)
            </a>
          )}
        </div>

        {/* Qty */}
        <span className="font-mono text-[13px] tabular-nums text-ink-primary text-center">
          {line.qty}
        </span>

        {/* Unit Price */}
        <span className="font-mono text-[13px] tabular-nums text-ink-primary text-right pr-4">
          {INR.format(line.unitPrice)}
        </span>

        {/* Total */}
        <span className="font-mono text-[13px] tabular-nums text-ink-primary text-right pr-4">
          {INR.format(lineTotal)}
        </span>

        {/* Warranty */}
        <span
          className={cn(
            'inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider w-fit',
            line.warrantyCovered
              ? 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]'
              : 'bg-bg-subtle text-ink-muted',
          )}
        >
          {line.warrantyCovered ? MESSAGES.yes : MESSAGES.no}
        </span>

        {/* Status */}
        <StateChip status={PARTS_STATUS_CHIP[line.status]} />

        {/* Actions */}
        <Gate role={['R09', 'R12', 'R13', 'R19', 'R22', 'R24']} fallback="hide">
          <div className="flex items-center gap-0.5">
            {line.status === 'REQUESTED' && (
              <button
                type="button"
                onClick={handleReserve}
                aria-label="Reserve part"
                title="Reserve"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {line.status === 'RESERVED' && (
              <button
                type="button"
                onClick={handleIssue}
                aria-label="Issue part"
                title="Issue"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {line.status === 'ISSUED' && (
              <button
                type="button"
                onClick={handleFit}
                aria-label="Mark as fitted"
                title="Fit"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-[rgb(var(--state-listed))] hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {(line.status === 'RESERVED' || line.status === 'ISSUED') && (
              <button
                type="button"
                onClick={() => setShowReturnConfirm(true)}
                aria-label="Return part"
                title="Return"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-state-danger hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {/* Edit — only on non-terminal statuses */}
            {line.status !== 'FITTED' && line.status !== 'RETURNED' && (
              <button
                type="button"
                onClick={() => onEdit(line)}
                aria-label="Edit part"
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
              aria-label="Delete part"
              title="Delete"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-ink-muted hover:text-state-danger hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </Gate>
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete part?"
        description={`Remove "${line.description}" (${line.partCode}) from this job card. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDelete}
      />

      {/* Return confirm */}
      <AlertDialog
        open={showReturnConfirm}
        onClose={() => setShowReturnConfirm(false)}
        title="Return part?"
        description={`Mark "${line.description}" as returned to stock.`}
        confirmLabel="Return"
        cancelLabel="Cancel"
        destructive={false}
        onConfirm={handleReturn}
      />
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardPartsTab({ jobCard }: JobCardPartsTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editLine, setEditLine] = useState<PartsLine | undefined>(undefined);
  const { toasts, toast, dismiss } = useToast();

  // Source from the store's flat partsLines list, filtered by IDs on the JC.
  // The store mirrors mutations into both jc.partsLines and the flat list.
  const jcFromStore = useServiceStore((s) => s.jobCards.find((jc) => jc.id === jobCard.id));
  const jcPartIds = new Set((jcFromStore ?? jobCard).partsLines.map((p) => p.id));
  const allPartsLines = useServiceStore((s) => s.partsLines);
  const lines = allPartsLines.filter((p) => jcPartIds.has(p.id));

  const total = lines.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const warrantyCoveredTotal = lines
    .filter((p) => p.warrantyCovered)
    .reduce((sum, p) => sum + p.qty * p.unitPrice, 0);

  const hasRequestedParts = lines.some((p) => p.status === 'REQUESTED');

  function handleEdit(line: PartsLine) {
    setEditLine(line);
  }
  function handleEditClose() {
    setEditLine(undefined);
  }

  if (lines.length === 0) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
        <PartsFormDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          jobCardId={jobCard.id}
        />
        <div className="rounded-md border border-line bg-bg-surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-ink-primary">{MESSAGES.heading}</h2>
            <Gate role={['R09', 'R12', 'R13', 'R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {MESSAGES.addPart}
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
      <PartsFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        jobCardId={jobCard.id}
      />
      <PartsFormDialog
        open={!!editLine}
        onClose={handleEditClose}
        jobCardId={jobCard.id}
        editLine={editLine}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-ink-primary">{MESSAGES.heading}</h2>
          <Gate role={['R09', 'R12', 'R13', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {MESSAGES.addPart}
            </button>
          </Gate>
        </div>

        {/* Pending parts notice */}
        {hasRequestedParts && (
          <div
            className="flex items-start gap-3 rounded-md border border-state-danger/30 bg-state-danger/5 px-4 py-3"
            role="alert"
          >
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-state-danger" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-medium text-ink-primary">{MESSAGES.outOfStock}</p>
              <p className="text-[12px] text-ink-secondary mt-0.5">{MESSAGES.outOfStockMsg}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-line">
          {/* Header row */}
          <div className="grid grid-cols-[120px_1fr_60px_110px_110px_80px_100px_130px] border-b border-line bg-bg-subtle px-4 py-2 min-w-[840px]">
            {[
              MESSAGES.colCode,
              MESSAGES.colDescription,
              MESSAGES.colQty,
              MESSAGES.colUnitPrice,
              MESSAGES.colTotal,
              MESSAGES.colWarranty,
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
              <PartsRow
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

        {/* Footer */}
        <div className="rounded-md border border-line bg-bg-surface p-4">
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-secondary">{MESSAGES.totalLabel}</span>
              <span className="font-mono text-[13px] tabular-nums text-ink-primary">
                {INR.format(total)}
              </span>
            </div>
            {warrantyCoveredTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">{MESSAGES.warrantyCovered}</span>
                <span className="font-mono text-[13px] tabular-nums text-[rgb(var(--state-listed))]">
                  -{INR.format(warrantyCoveredTotal)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-[15px] font-semibold text-ink-primary">Net Payable</span>
              <span className="font-mono text-[16px] font-semibold tabular-nums text-ink-primary">
                {INR.format(total - warrantyCoveredTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
