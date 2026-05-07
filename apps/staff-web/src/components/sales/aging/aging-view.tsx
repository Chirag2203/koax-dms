'use client';

/**
 * AgingView — Reports view for /inventory-aging.
 *
 * Lists all ACTIVE listings sorted by daysListed desc, grouped by aging band.
 * R10+ "Apply suggestion" button opens AlertDialog with reason textarea.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001 §7 (Reports view)
 * L1: aging bands, L2: guardrail, L3: RESERVED included in list, L5: ACTIVE filter
 * L6: R10+ gate on apply action
 *
 * PRE-FLIGHT: Card/Field imported from detail-card, text-xs/sm/base only,
 * rounded-md only, Gate for RBAC, i18n via useTranslations.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

import { Gate } from '@/src/components/primitives/gate';
import { Button } from '@/src/components/primitives/button';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';
import { selectAgedListings } from '@/src/lib/sales/aging/selectors';
import type { AgingBand, AgedListingRow } from '@/src/lib/sales/aging/selectors';
import type { DealStage } from '@dms/types';
import { competitorPrices } from '@dms/mocks/fixtures';
import { ApplySuggestionDialog } from './apply-suggestion-dialog';

// ─── Band config ──────────────────────────────────────────────────────────────

const BAND_ORDER: AgingBand[] = ['critical', 'stale', 'aging', 'moderate', 'fresh'];

const BAND_LABEL: Record<AgingBand, string> = {
  critical: '180+ days (Critical)',
  stale:    '90–180 days (Stale)',
  aging:    '60–90 days (Aging)',
  moderate: '30–60 days (Moderate)',
  fresh:    '< 30 days (Fresh)',
};

const BAND_CHIP_CLASS: Record<AgingBand, string> = {
  critical: 'bg-state-danger/15 text-state-danger border border-state-danger/25',
  stale:    'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
  aging:    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20',
  moderate: 'bg-bg-subtle text-ink-secondary border border-line',
  fresh:    'bg-bg-subtle text-ink-secondary border border-line',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupee(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Deal stage chip config ───────────────────────────────────────────────────

const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  'new-lead':   'New Lead',
  'contacted':  'Contacted',
  'test-drive': 'Test Drive',
  'reserved':   'Reserved',
  'sales-order':'Sales Order',
  'delivered':  'Delivered',
  'lost':       'Lost',
  'on-hold':    'On Hold',
  'refunded':   'Refunded',
};

const DEAL_STAGE_CHIP_CLASS: Record<DealStage, string> = {
  'new-lead':    'bg-bg-subtle text-ink-secondary border border-line',
  'contacted':   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  'test-drive':  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  'reserved':    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  'sales-order': 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
  'delivered':   'bg-bg-subtle text-ink-muted border border-line',
  'lost':        'bg-state-danger/10 text-state-danger border border-state-danger/20',
  'on-hold':     'bg-bg-subtle text-ink-muted border border-line',
  'refunded':    'bg-state-danger/10 text-state-danger border border-state-danger/20',
};

function DealStageChip({ stage }: { stage: DealStage }) {
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium',
      DEAL_STAGE_CHIP_CLASS[stage],
    )}>
      {DEAL_STAGE_LABEL[stage]}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgingView() {
  const t = useTranslations('inventoryAging');

  const vehicles  = useVehiclesStore((s) => s.vehicles);
  const salesEvents = useVehiclesStore((s) => s.salesEvents);
  const costLedger  = useVehiclesStore((s) => s.costLedger);
  // Single base-ref selector per CLAUDE.md §10 #14
  const deals = useSalesDealsStore((s) => s.deals);

  const rows = useMemo(
    () => selectAgedListings(
      { vehicles, salesEvents, costLedger },
      competitorPrices,
      new Date().toISOString(),
      deals,
    ),
    [vehicles, salesEvents, costLedger, deals],
  );

  // Group by band
  const byBand = useMemo(() => {
    const map = new Map<AgingBand, AgedListingRow[]>();
    for (const row of rows) {
      const existing = map.get(row.agingBand) ?? [];
      existing.push(row);
      map.set(row.agingBand, existing);
    }
    return map;
  }, [rows]);

  // Apply-suggestion dialog state
  const [applyTarget, setApplyTarget] = useState<AgedListingRow | null>(null);

  const isEmpty = rows.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-line bg-bg-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-accent/10">
              <TrendingDown className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink-primary">
                {t('pageTitle')}
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {t('pageSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Gate role={['R10', 'R19', 'R22', 'R24']} fallback="hide">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // DEF-IA-1: v2 wires real scrape; v1 stub
                  alert('Competitor data refresh is coming in v2 (DEF-IA-1).');
                }}
              >
                {t('refreshCompetitorData')}
              </Button>
            </Gate>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isEmpty ? (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="rounded-md border border-line bg-bg-surface p-12 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-bg-subtle mx-auto mb-4">
              <Info className="h-6 w-6 text-ink-muted" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-ink-primary">{t('emptyTitle')}</p>
            <p className="text-xs text-ink-muted mt-1">{t('emptySubtitle')}</p>
          </div>
        ) : (
          BAND_ORDER.map((band) => {
            const bandRows = byBand.get(band);
            if (!bandRows || bandRows.length === 0) return null;

            return (
              <AgingBandSection
                key={band}
                band={band}
                label={BAND_LABEL[band]}
                chipClass={BAND_CHIP_CLASS[band]}
                rows={bandRows}
                onApply={(row) => setApplyTarget(row)}
                t={t}
              />
            );
          })
        )}

        {/* ── Summary totals ──────────────────────────────────────────── */}
        {!isEmpty && (
          <div className="rounded-md border border-line bg-bg-surface px-6 py-4 flex items-center gap-6">
            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider">{t('totalActive')}</span>
              <p className="text-sm font-semibold text-ink-primary mt-0.5">{rows.length} vehicles</p>
            </div>
            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider">{t('criticalCount')}</span>
              <p className="text-sm font-semibold text-state-danger mt-0.5">
                {byBand.get('critical')?.length ?? 0} vehicles
              </p>
            </div>
            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider">{t('staleCount')}</span>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                {byBand.get('stale')?.length ?? 0} vehicles
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Apply suggestion dialog ─────────────────────────────────────── */}
      {applyTarget && (
        <ApplySuggestionDialog
          row={applyTarget}
          open={Boolean(applyTarget)}
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  );
}

// ─── AgingBandSection ─────────────────────────────────────────────────────────

interface AgingBandSectionProps {
  band: AgingBand;
  label: string;
  chipClass: string;
  rows: AgedListingRow[];
  onApply: (row: AgedListingRow) => void;
  t: ReturnType<typeof useTranslations<'inventoryAging'>>;
}

function AgingBandSection({ band, label, chipClass, rows, onApply, t }: AgingBandSectionProps) {
  const isCritical = band === 'critical';
  const isStale = band === 'stale';

  return (
    <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
      {/* Section header */}
      <div className={cn(
        'flex items-center gap-3 px-6 py-3 border-b border-line',
        isCritical ? 'bg-state-danger/5' : isStale ? 'bg-amber-500/5' : 'bg-bg-subtle',
      )}>
        {(isCritical || isStale) && (
          <AlertTriangle
            className={cn('h-4 w-4', isCritical ? 'text-state-danger' : 'text-amber-500')}
            aria-hidden="true"
          />
        )}
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          chipClass,
        )}>
          {label}
        </span>
        <span className="text-xs text-ink-muted ml-auto">{rows.length} vehicles</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="grid" aria-label={`${label} vehicles`}>
          <thead>
            <tr className="border-b border-line bg-bg-subtle">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">
                {t('colVin')}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">
                {t('colVehicle')}
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">
                {t('colDaysListed')}
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">
                {t('colCurrentPrice')}
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">
                {t('colCostBasis')}
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">
                {t('colSuggestedDrop')}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">
                {t('colReason')}
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AgingRow
                key={row.vin}
                row={row}
                onApply={onApply}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── AgingRow ─────────────────────────────────────────────────────────────────

interface AgingRowProps {
  row: AgedListingRow;
  onApply: (row: AgedListingRow) => void;
  t: ReturnType<typeof useTranslations<'inventoryAging'>>;
}

const REASON_LABEL: Record<string, string> = {
  competitor_price:  'Competitor price',
  margin_guardrail:  'Margin guardrail',
  no_suggestion:     '—',
};

function AgingRow({ row, onApply, t }: AgingRowProps) {
  const hasSuggestion = row.suggestedDrop > 0;

  return (
    <tr className="border-b border-line last:border-0 hover:bg-bg-subtle transition-colors">
      {/* VIN */}
      <td className="px-4 py-3">
        <Link
          href={row.linkedDealId ? `/sales?dealId=${row.linkedDealId}` : `/inventory-aging/${row.vin}`}
          className="font-mono text-xs text-accent hover:underline underline-offset-2"
        >
          {row.vin.slice(-8)}
        </Link>
      </td>

      {/* Vehicle name + deal stage chip */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-ink-primary leading-snug">{row.vehicleName}</span>
          {row.linkedDealStage && (
            <DealStageChip stage={row.linkedDealStage} />
          )}
        </div>
      </td>

      {/* Days listed */}
      <td className="px-4 py-3 text-right">
        <span className={cn(
          'font-mono text-xs tabular-nums',
          row.agingBand === 'critical' ? 'text-state-danger font-semibold' :
          row.agingBand === 'stale'    ? 'text-amber-600 dark:text-amber-400 font-medium' :
          'text-ink-secondary',
        )}>
          {row.daysListed}d
        </span>
      </td>

      {/* Current price */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-xs tabular-nums text-ink-primary">
          {formatRupee(row.currentPrice)}
        </span>
      </td>

      {/* Cost basis */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-xs tabular-nums text-ink-secondary">
          {row.costBasis > 0 ? formatRupee(row.costBasis) : '—'}
        </span>
      </td>

      {/* Suggested drop */}
      <td className="px-4 py-3 text-right">
        {hasSuggestion ? (
          <span className="font-mono text-xs tabular-nums text-state-danger font-medium">
            -{formatRupee(row.suggestedDrop)}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        )}
      </td>

      {/* Reason */}
      <td className="px-4 py-3">
        <span className="text-xs text-ink-secondary">
          {REASON_LABEL[row.reason] ?? row.reason}
        </span>
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        {hasSuggestion ? (
          <Gate
            role={['R10', 'R19', 'R22', 'R24']}
            fallback="tooltip"
            tooltipMessage={t('applyRequiresR10')}
          >
            <Button
              variant="primary"
              size="sm"
              onClick={() => onApply(row)}
              aria-label={`Apply price suggestion for ${row.vin}`}
            >
              {t('applySuggestion')}
            </Button>
          </Gate>
        ) : (
          <span className="text-xs text-ink-muted">{t('noAction')}</span>
        )}
      </td>
    </tr>
  );
}
