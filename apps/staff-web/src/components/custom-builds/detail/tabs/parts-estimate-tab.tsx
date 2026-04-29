/**
 * Parts & Estimate tab — parts line table with CRUD + estimate summary.
 *
 * CRUD: add part (Dialog), edit qty, remove part (AlertDialog).
 * Estimate: live totals via computeGstBreakdown (parts subtotal, BN margin %,
 *           vendor labour, GST on labour, GST on parts margin, TOTAL).
 * P2 actions (Save as Quote / PDF / Share link) are fully wired:
 *   - Save as Quote: calls saveQuote(jobId, marginPct, actor) on store.
 *   - Share Link: opens ShareQuoteDialog with URL + WhatsApp + Email.
 *   - Download PDF: uses browser print-to-PDF via window.print() on
 *     the public preview page (L26 decision — @react-pdf/renderer not added).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6 Tab 2, §10, L6, L16, L26, P2
 */

'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, Share2, Printer } from 'lucide-react';
import type { BuildJob, CustomBuildVendor, BuildJobPartLine } from '@dms/types';
import type { CustomBuildPart } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';
import { AddPartDialog } from '../../dialogs/add-part-dialog';
import { ShareQuoteDialog } from '../../dialogs/share-quote-dialog';
import { formatINR } from '../../shared/format-inr';
import { computeGstBreakdown } from '@/src/lib/custom-builds/gst-breakdown';
import { Card } from '../../shared/detail-card';

interface PartsEstimateTabProps {
  job: BuildJob;
  vendor?: CustomBuildVendor;
}

const LOCKED_STAGES = new Set(['APPROVED', 'PARTS_ORDERING', 'IN_PROGRESS', 'QC', 'QC_FAILED', 'DELIVERED', 'CANCELLED']);

function PartRow({
  line,
  locked,
  onRemove,
  onQtyChange,
}: {
  line: BuildJobPartLine;
  locked: boolean;
  onRemove: () => void;
  onQtyChange: (qty: number) => void;
}) {
  const lineTotal = line.unitCost * line.qty;

  return (
    <tr className="border-b border-line hover:bg-bg-hover transition-colors">
      <td className="px-4 py-3 text-sm text-ink-primary">{line.partName}</td>
      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{line.partSku}</td>
      <td className="px-4 py-3 text-xs text-ink-secondary">{line.brand}</td>
      <td className="px-4 py-3 text-xs text-ink-secondary capitalize">{line.category}</td>
      <td className="px-4 py-3 text-center">
        {locked ? (
          <span className="font-mono text-xs text-ink-primary tabular-nums">{line.qty}</span>
        ) : (
          <input
            type="number"
            min={1}
            max={99}
            value={line.qty}
            onChange={(e) => onQtyChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-14 h-7 text-center rounded border border-line bg-bg-canvas font-mono text-xs text-ink-primary focus:outline-none focus:border-accent"
            aria-label={`Quantity for ${line.partName}`}
          />
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-ink-primary tabular-nums">
        {formatINR(line.unitCost)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-ink-primary tabular-nums">
        {formatINR(lineTotal)}
      </td>
      <td className="px-4 py-3 text-center font-mono text-xs text-ink-muted tabular-nums">
        {line.installHours}h
      </td>
      {!locked && (
        <td className="px-4 py-2 text-center">
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded text-ink-muted hover:text-state-danger transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-danger"
            aria-label={`Remove ${line.partName}`}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </td>
      )}
    </tr>
  );
}

export function PartsEstimateTab({ job, vendor }: PartsEstimateTabProps) {
  const { user } = useStaffAuth();
  const addPart = useCustomBuildsStore((s) => s.addPart);
  const removePart = useCustomBuildsStore((s) => s.removePart);
  const updatePartLine = useCustomBuildsStore((s) => s.updatePartLine);
  const saveQuote = useCustomBuildsStore((s) => s.saveQuote);
  const parts = useCustomBuildsStore((s) => s.parts);
  const { toasts, toast, dismiss } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<BuildJobPartLine | null>(null);

  const role = user?.role ?? 'R05';
  const canEdit = hasRank(role, 'R09');
  const locked = LOCKED_STAGES.has(job.stage);

  const actor = user ? { id: user.id, name: user.name, role: user.role } : null;

  const partsSubtotal = job.parts.reduce((sum, p) => sum + p.unitCost * p.qty, 0);
  const partsListPriceSum = job.parts.reduce((sum, p) => {
    const catalogPart = parts.find((cp) => cp.sku === p.partSku);
    return sum + (catalogPart?.listPrice ?? p.unitCost) * p.qty;
  }, 0);
  const totalInstallHours = job.parts.reduce((sum, p) => sum + p.installHours * p.qty, 0);
  const vendorLabour = vendor ? Math.round((totalInstallHours / 8) * vendor.dayRate) : 0;
  const breakdown = computeGstBreakdown({
    partsSubtotal,
    partsListPriceSum,
    vendorLabour,
    marginPct: job.marginPct,
  });

  const handleAddPart = (part: CustomBuildPart, qty: number) => {
    if (!actor) return;
    const line: BuildJobPartLine = {
      partSku: part.sku,
      partName: part.name,
      brand: part.brand,
      category: part.category,
      qty,
      unitCost: part.bnCost ?? part.listPrice,
      installHours: part.installHours,
      vendorId: part.vendorId,
    };
    try {
      addPart(job.id, line, actor);
      toast(`${part.name} added`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to add part', 'error');
    }
  };

  const handleRemovePart = () => {
    if (!actor || !removeTarget) return;
    try {
      removePart(job.id, removeTarget.partSku, actor);
      toast(`${removeTarget.partName} removed`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to remove part', 'error');
    }
    setRemoveTarget(null);
  };

  const handleQtyChange = (partSku: string, qty: number) => {
    if (!actor) return;
    try {
      updatePartLine(job.id, partSku, { qty }, actor);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update quantity', 'error');
    }
  };

  const handleSaveQuote = () => {
    if (!actor) return;
    try {
      const result = saveQuote(job.id, job.marginPct, actor);
      toast(`Quote saved. Total: ${formatINR(result.total)}`, 'success');
      setShowShareDialog(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save quote', 'error');
    }
  };

  const handleOpenPdf = () => {
    if (!job.quoteToken) {
      toast('Save the quote first to generate a PDF link.', 'warning');
      return;
    }
    // L26: PDF via browser print-to-PDF on the public preview page.
    // @react-pdf/renderer is not added to avoid heavy dependency; browser print
    // on the preview page gives a clean, print-stylesheet-optimised output.
    const previewUrl = `/custom-builds/preview/${job.quoteToken}`;
    window.open(previewUrl + '?print=1', '_blank', 'noopener,noreferrer');
    toast('Open the preview page and use Print → Save as PDF.', 'info', 5000);
  };

  return (
    <div className="p-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Parts table */}
      <Card
        title="Parts Lines"
        rightSlot={
          canEdit && !locked ? (
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Plus size={13} aria-hidden="true" />
              Add Part
            </button>
          ) : locked ? (
            <span className="text-xs text-ink-muted italic">Locked after Approval</span>
          ) : undefined
        }
      >
        {job.parts.length === 0 ? (
          <div className="rounded-md border border-dashed border-line p-8 text-center">
            <p className="text-sm text-ink-muted">No parts added yet.</p>
            {canEdit && !locked && (
              <button
                type="button"
                onClick={() => setShowAddDialog(true)}
                className="mt-2 text-xs text-accent hover:underline focus-visible:outline-none"
              >
                Add the first part
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-line overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-bg-subtle border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wider">Part</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-ink-muted uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">Line Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-ink-muted uppercase tracking-wider">Install</th>
                  {!locked && <th className="px-4 py-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {job.parts.map((line) => (
                  <PartRow
                    key={line.partSku}
                    line={line}
                    locked={locked}
                    onRemove={() => setRemoveTarget(line)}
                    onQtyChange={(qty) => handleQtyChange(line.partSku, qty)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* GST Breakdown + Estimate summary — per L6, L16 */}
      <Card title="Estimate Summary">
        <div className="max-w-sm ml-auto space-y-2">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Parts subtotal (BN cost)</dt>
              <dd className="font-mono text-ink-primary tabular-nums">{formatINR(breakdown.partsCostBN)}</dd>
            </div>
            {vendor && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Vendor labour ({totalInstallHours.toFixed(1)}h)</dt>
                <dd className="font-mono text-ink-primary tabular-nums">{formatINR(breakdown.vendorLabour)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 text-ink-muted text-xs">
              <dt>BN margin ({job.marginPct}%)</dt>
              <dd className="font-mono tabular-nums">{formatINR(Math.round(breakdown.bnMargin))}</dd>
            </div>
            {breakdown.gstOnLabour > 0 && (
              <div className="flex justify-between gap-4 text-ink-muted text-xs">
                <dt>GST on labour (18%)</dt>
                <dd className="font-mono tabular-nums">{formatINR(Math.round(breakdown.gstOnLabour))}</dd>
              </div>
            )}
            {breakdown.gstOnPartsMargin > 0 && (
              <div className="flex justify-between gap-4 text-ink-muted text-xs">
                <dt>GST on parts margin (18/118)</dt>
                <dd className="font-mono tabular-nums">{formatINR(Math.round(breakdown.gstOnPartsMargin))}</dd>
              </div>
            )}
            <div className="border-t border-line pt-2 flex justify-between gap-4 font-medium">
              <dt className="text-ink-primary">Estimate Total</dt>
              <dd className="font-mono text-base text-ink-primary tabular-nums">
                {formatINR(Math.round(breakdown.total))}
              </dd>
            </div>
          </dl>

          {/* P2 actions */}
          <div className="pt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSaveQuote}
              disabled={job.parts.length === 0}
              className="w-full h-8 flex items-center justify-center gap-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={12} aria-hidden="true" />
              Save as Quote
            </button>
            <button
              type="button"
              onClick={() => setShowShareDialog(true)}
              disabled={!job.quoteToken}
              className="w-full h-8 flex items-center justify-center gap-1.5 rounded border border-line text-xs text-ink-secondary hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Share2 size={12} aria-hidden="true" />
              Share Link
            </button>
            <button
              type="button"
              onClick={handleOpenPdf}
              disabled={!job.quoteToken}
              className="w-full h-8 flex items-center justify-center gap-1.5 rounded border border-line text-xs text-ink-secondary hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={12} aria-hidden="true" />
              Download PDF
            </button>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <AddPartDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        parts={parts}
        onAdd={handleAddPart}
        lockedStage={locked}
      />

      <AlertDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Part?"
        description={`Remove "${removeTarget?.partName}" from this build job?`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemovePart}
      />

      <ShareQuoteDialog
        open={showShareDialog}
        job={job}
        onClose={() => setShowShareDialog(false)}
      />
    </div>
  );
}
