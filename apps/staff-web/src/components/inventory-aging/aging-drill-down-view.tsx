'use client';

/**
 * AgingDrillDownView — per-VIN aging detail page.
 *
 * Shows:
 *   - Price history (all PRICE_CHANGED SalesEvents for VIN)
 *   - Competitor data table (from fixture)
 *   - Margin trace (cost basis, current price, guardrail floor)
 *
 * Read-only — no store actions on this view.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001 §7 (Drill-down)
 * L12: read-only, no actions
 *
 * PRE-FLIGHT: Card/Field from detail-card, text-xs/sm/base only, rounded-md.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { computeAgingBand } from '@/src/lib/inventory-aging/selectors';
import { competitorPrices } from '@dms/mocks/fixtures';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupee(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AgingDrillDownViewProps {
  vin: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgingDrillDownView({ vin }: AgingDrillDownViewProps) {
  const t = useTranslations('inventoryAging');

  const vehicle    = useVehiclesStore((s) => s.vehicles[vin]);
  const salesEvents = useVehiclesStore((s) => s.salesEvents[vin] ?? []);
  const costLedger  = useVehiclesStore((s) => s.costLedger[vin] ?? []);

  // Price history — PRICE_CHANGED events
  const priceHistory = useMemo(
    () => salesEvents.filter((e) => e.kind === 'PRICE_CHANGED').reverse(),
    [salesEvents],
  );

  // Competitor data for this VIN
  const vinCompetitors = useMemo(
    () => competitorPrices.filter((c) => c.vin === vin),
    [vin],
  );

  // Derive current price from events (LISTED sets base; PRICE_CHANGED updates)
  // VehicleMaster does not hold the price — that lives in inventory.Vehicle.
  const currentPrice = useMemo(() => {
    let price = 0;
    for (const ev of salesEvents) {
      if (ev.kind === 'LISTED') {
        const p = ev.payload as { listPrice?: number };
        price = p.listPrice ?? 0;
      } else if (ev.kind === 'PRICE_CHANGED') {
        const p = ev.payload as { toPrice?: number };
        if (p.toPrice != null) price = p.toPrice;
      }
    }
    return price;
  }, [salesEvents]);
  const costBasis = costLedger.reduce((sum, e) => sum + e.amount, 0);
  const guardrailFloor = Math.ceil(costBasis * 1.05);
  const currentMargin = currentPrice - costBasis;
  const currentMarginPct = costBasis > 0 ? ((currentMargin / costBasis) * 100).toFixed(1) : null;

  // Days listed
  const daysListed = vehicle?.listedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(vehicle.listedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const agingBand = daysListed !== null ? computeAgingBand(daysListed) : null;

  const vehicleName = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(' ')
    : vin;

  if (!vehicle) {
    return (
      <div className="flex flex-col h-full bg-bg-canvas">
        <div className="p-6">
          <p className="text-sm text-ink-muted">{t('vinNotFound', { vin })}</p>
          <Link href="/inventory-aging" className="text-sm text-accent hover:underline mt-2 inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t('backToReport')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-line bg-bg-surface">
        <Link
          href="/inventory-aging"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t('backToReport')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-accent/10">
            <TrendingDown className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-primary">{vehicleName}</h1>
            <p className="text-xs font-mono text-ink-muted">{vin}</p>
          </div>
          {agingBand && (
            <span className={[
              'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              agingBand === 'critical' ? 'bg-state-danger/15 text-state-danger border border-state-danger/25' :
              agingBand === 'stale'    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/25' :
              'bg-bg-subtle text-ink-secondary border border-line',
            ].join(' ')}>
              {daysListed}d on lot
            </span>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Margin Trace */}
        <Card title={t('marginTraceTitle')}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label={t('costBasisLabel')} value={costBasis > 0 ? formatRupee(costBasis) : '—'} />
            <Field label={t('currentPriceLabel')} value={formatRupee(currentPrice)} />
            <Field
              label={t('currentMarginLabel')}
              value={
                costBasis > 0 ? (
                  <span>
                    {formatRupee(currentMargin)}{' '}
                    <span className="text-xs text-ink-muted">({currentMarginPct}%)</span>
                  </span>
                ) : '—'
              }
            />
            <Field
              label={t('guardrailFloorLabel')}
              value={
                <span>
                  {costBasis > 0 ? formatRupee(guardrailFloor) : '—'}
                  <span className="block text-xs text-ink-muted">{t('guardrailNote')}</span>
                </span>
              }
            />
          </dl>
        </Card>

        {/* Price History */}
        <Card title={t('priceHistoryTitle')}>
          {priceHistory.length === 0 ? (
            <p className="text-xs text-ink-muted">{t('noPriceHistory')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="grid" aria-label={t('priceHistoryTitle')}>
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colDate')}</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colPrevPrice')}</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colNewPrice')}</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colChange')}</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colSource')}</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((ev) => {
                    const p = ev.payload as {
                      fromPrice?: number;
                      toPrice?: number;
                      source?: string;
                    };
                    const prev = p.fromPrice ?? 0;
                    const next = p.toPrice ?? 0;
                    const delta = next - prev;
                    return (
                      <tr key={ev.id} className="border-b border-line last:border-0 hover:bg-bg-subtle">
                        <td className="py-2 pr-4 text-xs text-ink-secondary">{formatDate(ev.at)}</td>
                        <td className="py-2 px-4 text-right font-mono text-xs tabular-nums text-ink-secondary">{formatRupee(prev)}</td>
                        <td className="py-2 px-4 text-right font-mono text-xs tabular-nums text-ink-primary">{formatRupee(next)}</td>
                        <td className={[
                          'py-2 px-4 text-right font-mono text-xs tabular-nums font-medium',
                          delta < 0 ? 'text-state-danger' : 'text-success',
                        ].join(' ')}>
                          {delta > 0 ? '+' : ''}{formatRupee(delta)}
                        </td>
                        <td className="py-2 px-4 text-xs text-ink-muted">
                          {p.source === 'AGING_SUGGESTION' ? t('sourceAgingSuggestion') : (p.source ?? 'Manual')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Competitor Data */}
        <Card title={t('competitorDataTitle')}>
          {vinCompetitors.length === 0 ? (
            <p className="text-xs text-ink-muted">{t('noCompetitorData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="grid" aria-label={t('competitorDataTitle')}>
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colCompetitor')}</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colListedPrice')}</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colScrapedAt')}</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colVsDelta')}</th>
                  </tr>
                </thead>
                <tbody>
                  {vinCompetitors.map((c, i) => {
                    const delta = currentPrice - c.listedPrice;
                    return (
                      <tr key={i} className="border-b border-line last:border-0 hover:bg-bg-subtle">
                        <td className="py-2 pr-4 text-sm text-ink-primary">{c.competitorName}</td>
                        <td className="py-2 px-4 text-right font-mono text-xs tabular-nums text-ink-secondary">{formatRupee(c.listedPrice)}</td>
                        <td className="py-2 px-4 text-xs text-ink-muted">{c.scrapedAt}</td>
                        <td className={[
                          'py-2 px-4 text-right font-mono text-xs tabular-nums',
                          delta > 0 ? 'text-state-danger' : 'text-success',
                        ].join(' ')}>
                          {delta > 0 ? '+' : ''}{formatRupee(delta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
