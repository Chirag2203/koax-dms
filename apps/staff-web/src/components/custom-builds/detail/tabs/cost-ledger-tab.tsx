/**
 * CostLedgerTab — Custom Builds job detail, Cost Ledger tab.
 *
 * SPEC-CUSTOM-BUILDS-001 §6 Tab 5, P4:
 * - If DELIVERED and costLedgerWriteRef exists: show the 3 written entries +
 *   link to the vehicle's full cost ledger.
 * - If not yet DELIVERED: show preview of the breakdown that will be written.
 * - Visible to R12+ only (gate applied in detail-view).
 *
 * L39: costLedgerWriteRef is the source of truth for whether entries were written.
 * L40: Full ledger lives on /vehicles/[vin]?tab=cost-ledger — link provided.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, Receipt } from 'lucide-react';
import { cn } from '@dms/ui';
import type { BuildJob } from '@dms/types';
import type { CustomBuildVendor } from '@dms/types';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { computeGstBreakdown } from '@/src/lib/custom-builds/gst-breakdown';
import { formatINR } from '../../../custom-builds/shared/format-inr';
import { Card } from '../../../custom-builds/shared/detail-card';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

interface LedgerRow {
  id: string;
  label: string;
  note: string;
  amount: number;
  category: string;
  date: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  'custom-build-parts': 'Parts',
  'custom-build-labour': 'Vendor Labour + GST',
  'custom-build-vendor-fee': 'BN Margin',
};

const CATEGORY_DOT: Record<string, string> = {
  'custom-build-parts': 'bg-[rgb(var(--state-in-refurb))]',
  'custom-build-labour': 'bg-[rgb(var(--state-reserved))]',
  'custom-build-vendor-fee': 'bg-accent',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LedgerTable({ rows, date }: { rows: LedgerRow[]; date: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="overflow-hidden rounded-md border border-line">
      {/* Header */}
      <div className="grid grid-cols-[1fr_140px_160px] border-b border-line bg-bg-subtle px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">Category</span>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">Date</span>
        <span className="text-right font-mono text-xs uppercase tracking-widest text-ink-muted">Amount</span>
      </div>

      {rows.map((row, i) => (
        <div
          key={row.id}
          className={cn(
            'grid grid-cols-[1fr_140px_160px] items-center px-4 py-3',
            i % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle',
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn('inline-block h-2 w-2 shrink-0 rounded-full', CATEGORY_DOT[row.category] ?? 'bg-ink-muted')}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block truncate text-sm text-ink-primary">
                {CATEGORY_LABEL[row.category] ?? row.category}
              </span>
              <span className="block truncate text-xs text-ink-muted">{row.note}</span>
            </div>
          </div>
          <span className="font-mono text-xs text-ink-secondary">{date}</span>
          <span className="text-right font-mono text-sm tabular-nums text-ink-primary">{formatINR(row.amount)}</span>
        </div>
      ))}

      {/* Total */}
      <div className="grid grid-cols-[1fr_140px_160px] items-center border-t border-line bg-bg-subtle px-4 py-3">
        <span className="col-span-2 text-sm font-semibold text-ink-primary">Total Written to Ledger</span>
        <span className="text-right font-mono text-base font-semibold tabular-nums text-ink-primary">
          {formatINR(total)}
        </span>
      </div>
    </div>
  );
}

// ─── Preview (not yet delivered, or fallback when store not yet hydrated) ────

function LedgerPreview({
  job,
  vendor,
  isDeliveredFallback = false,
}: {
  job: BuildJob;
  vendor?: CustomBuildVendor;
  /**
   * true  → job is DELIVERED but runtime entries haven't hydrated yet.
   *         Show "computed from formula" message instead of "will be written".
   * false → job is not yet delivered; show the normal pre-delivery notice.
   */
  isDeliveredFallback?: boolean;
}) {
  const partsSubtotal = job.parts.reduce((s, p) => s + p.unitCost * p.qty, 0);
  const totalHours = job.parts.reduce((s, p) => s + p.installHours * p.qty, 0);
  const vendorLabour = vendor ? Math.round((totalHours / 8) * vendor.dayRate) : 0;
  const bd = computeGstBreakdown({ partsSubtotal, partsListPriceSum: partsSubtotal, vendorLabour, marginPct: job.marginPct ?? 15 });

  const preview: Array<{ label: string; amount: number; note: string; category: string }> = [
    { category: 'custom-build-parts',      label: 'Parts',                 amount: Math.round(bd.partsCostBN), note: `Custom build parts: ${job.title}` },
    { category: 'custom-build-labour',     label: 'Vendor Labour + GST',   amount: Math.round(bd.vendorLabour + bd.gstOnLabour), note: `Vendor labour + GST: ${vendor?.name ?? '—'}` },
    { category: 'custom-build-vendor-fee', label: 'BN Margin',             amount: Math.round(bd.bnMargin), note: `BN margin on build ${job.id}` },
  ];

  const bannerText = isDeliveredFallback
    ? 'Amounts computed from build formula. Full ledger view available on the vehicle detail page.'
    : 'Cost ledger entries will be written when this build is delivered. The preview below shows the amounts that will be recorded.';

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-[rgb(var(--state-stale)/0.4)] bg-[rgb(var(--state-stale)/0.06)] px-4 py-3">
        <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--state-stale))]" aria-hidden="true" />
        <p className="text-sm text-ink-secondary">
          {bannerText}
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-dashed border-line opacity-75">
        <div className="grid grid-cols-[1fr_160px] border-b border-line bg-bg-subtle px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">Category (Preview)</span>
          <span className="text-right font-mono text-xs uppercase tracking-widest text-ink-muted">Est. Amount</span>
        </div>
        {preview.map((row, i) => (
          <div
            key={row.category}
            className={cn('grid grid-cols-[1fr_160px] items-center px-4 py-3', i % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', CATEGORY_DOT[row.category] ?? 'bg-ink-muted')} aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-sm text-ink-primary">{row.label}</span>
                <span className="block truncate text-xs text-ink-muted">{row.note}</span>
              </div>
            </div>
            <span className="text-right font-mono text-sm tabular-nums text-ink-secondary">{formatINR(row.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface CostLedgerTabProps {
  job: BuildJob;
  vendor?: CustomBuildVendor;
}

// Stable empty-array reference — `?? []` would create new ref each render and
// trigger infinite renders. Same pattern as visualizer L37.
const EMPTY_LEDGER: ReadonlyArray<{
  id: string;
  category: string;
  note?: string;
  amount: number;
  date: string;
}> = [];

export function CostLedgerTab({ job, vendor }: CostLedgerTabProps) {
  const ledgerByVin = useVehiclesStore((s) => s.costLedger);
  const writeRef = job.costLedgerWriteRef;
  const isDelivered = job.stage === 'DELIVERED';

  const runtimeEntries = useMemo(
    () => (ledgerByVin[job.vin] as typeof EMPTY_LEDGER | undefined) ?? EMPTY_LEDGER,
    [ledgerByVin, job.vin],
  );

  // Build rows from runtime store entries that match this job's entryIds
  const writtenRows: LedgerRow[] = useMemo(() => {
    if (!writeRef) return [];
    return runtimeEntries
      .filter((e) => writeRef.entryIds.includes(e.id))
      .map((e) => ({
        id: e.id,
        label: CATEGORY_LABEL[e.category] ?? e.category,
        note: e.note ?? '',
        amount: e.amount,
        category: e.category,
        date: e.date,
      }));
  }, [runtimeEntries, writeRef]);

  const writeDate = writeRef ? formatDate(writeRef.writtenAt) : '';

  return (
    <div className="p-6 space-y-6">
      <Card
        title="Cost Ledger"
        rightSlot={
          isDelivered ? (
            <Link
              href={`/inventory/${job.vin}?tab=cost-ledger`}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-surface px-3 py-1.5 text-xs font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View on Vehicle Ledger
            </Link>
          ) : undefined
        }
      >
        <p className="text-sm text-ink-muted mb-4">
          Entries written to the per-VIN cost ledger on delivery.
        </p>

        {isDelivered && writeRef ? (
          <>
            <div className="flex items-center gap-2 text-xs text-ink-muted mb-4">
              <span className="inline-block h-2 w-2 rounded-full bg-[rgb(var(--state-listed))]" aria-hidden="true" />
              Written on {writeDate}
            </div>
            {writtenRows.length > 0 ? (
              <LedgerTable rows={writtenRows} date={writeDate} />
            ) : (
              // Fallback: writeRef present but vehicles-store not yet hydrated.
              // Show computed amounts from formula with an appropriate message.
              <LedgerPreview job={job} vendor={vendor} isDeliveredFallback />
            )}
          </>
        ) : (
          <LedgerPreview job={job} vendor={vendor} />
        )}
      </Card>
    </div>
  );
}
