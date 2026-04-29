/**
 * NotificationsHubView — main dispatch log page.
 * SPEC-NOTIFICATIONS-001 §6.1
 *
 * KPI strip: Sent today, Delivery rate, Opted-out 7d, Failed 7d
 * Filter bar + paginated dispatch table (L12, L13)
 *
 * ≤200 LoC per spec §11
 */

'use client';

import { useMemo } from 'react';
import { useNotificationsStore } from '../../lib/notifications/notifications-store';
import { NotificationsFilterBar } from './notifications-filter-bar';
import { NotificationsTable } from './notifications-table';
import type { DispatchFilters } from '@dms/types';

interface NotificationsHubViewProps {
  filters: DispatchFilters;
}

// ─── StatTile (inline — no import to stay ≤200 LoC) ─────────────────────────

function KpiTile({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface px-4 py-3 flex flex-col gap-0.5 min-w-0">
      <span className="text-xs text-ink-muted uppercase tracking-wider truncate">{label}</span>
      <span
        className={`text-2xl font-semibold tabular-nums ${alert ? 'text-[rgb(var(--state-overdue))]' : 'text-ink-primary'}`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-ink-muted">{sub}</span>}
    </div>
  );
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoPast7Days(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function NotificationsHubView({ filters }: NotificationsHubViewProps) {
  const dispatches = useNotificationsStore((s) => s.dispatches);
  const selectDispatchPage = useNotificationsStore((s) => s.selectDispatchPage);

  // ─── KPI computation ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const today = isoToday();
    const past7 = isoPast7Days();

    const sentToday = dispatches.filter(
      (d) => d.status !== 'opted-out' && d.sentAt.slice(0, 10) === today,
    ).length;

    // Delivery rate: delivered / (sent + delivered + read + failed) * 100
    const terminal = dispatches.filter((d) =>
      ['sent', 'delivered', 'read', 'failed'].includes(d.status),
    );
    const deliveryRate =
      terminal.length === 0
        ? 0
        : Math.round(
            (terminal.filter((d) => ['delivered', 'read'].includes(d.status)).length /
              terminal.length) *
              100,
          );

    const optedOut7d = dispatches.filter(
      (d) => d.status === 'opted-out' && d.sentAt.slice(0, 10) >= past7,
    ).length;

    const failed7d = dispatches.filter(
      (d) => d.status === 'failed' && d.sentAt.slice(0, 10) >= past7,
    ).length;

    return { sentToday, deliveryRate, optedOut7d, failed7d };
  }, [dispatches]);

  // ─── Paginated result ─────────────────────────────────────────────────────

  // L_HUB_RERENDER: include `dispatches` in deps so the page re-computes
  // after the store hydrator seeds fixtures. Zustand's `get()` returns
  // fresh state, but useMemo only re-runs on dep change.
  const result = useMemo(
    () => selectDispatchPage(filters.page ?? 1, filters),
    [selectDispatchPage, filters, dispatches],
  );

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Sent today" value={kpis.sentToday} />
        <KpiTile label="Delivery rate" value={`${kpis.deliveryRate}%`} sub="all time" />
        <KpiTile
          label="Opted-out"
          value={kpis.optedOut7d}
          sub="last 7 days"
          alert={kpis.optedOut7d > 0}
        />
        <KpiTile
          label="Failed"
          value={kpis.failed7d}
          sub="last 7 days"
          alert={kpis.failed7d > 0}
        />
      </div>

      {/* Filter Bar */}
      <NotificationsFilterBar />

      {/* Dispatch Table */}
      <NotificationsTable result={result} />
    </div>
  );
}
