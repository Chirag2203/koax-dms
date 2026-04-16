'use client';

import { dashboardStats, vehicles } from '@dms/mocks/fixtures';
import { useOutlet } from '@/src/hooks/use-outlet';
import { StatCard } from '@/src/components/dashboard/stat-card';
import { InventorySnapshotPanel } from '@/src/components/dashboard/inventory-snapshot-panel';
import type { InventoryRow } from '@/src/components/dashboard/inventory-snapshot-panel';
import { SalesPipelinePanel } from '@/src/components/dashboard/sales-pipeline-panel';
import { ServiceBayPanel } from '@/src/components/dashboard/service-bay-panel';
import { ActivityFeed } from '@/src/components/dashboard/activity-feed';
import { AlertsTasksPanel } from '@/src/components/dashboard/alerts-tasks-panel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Map the first 5 vehicles from the fixture to the snapshot row shape */
const INVENTORY_ROWS: InventoryRow[] = vehicles.slice(0, 5).map((v) => {
  const listedAt = v.listedAt ? new Date(v.listedAt) : new Date();
  const daysOnLot = Math.floor(
    (Date.now() - listedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const statusMap: Record<string, InventoryRow['status']> = {
    published: 'listed',
    draft: 'draft',
    'in-refurb': 'in-refurb',
    reserved: 'reserved',
    sold: 'sold',
  };

  return {
    vin: v.vin,
    maskedVin: v.vin,
    make: v.make,
    model: v.model,
    status: statusMap[v.status ?? 'published'] ?? 'listed',
    days: Math.max(daysOnLot, 14), // floor at 14 so the mock looks live
    price: v.price,
    imageUrl: v.images?.[0]?.url,
  };
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { outletLabel } = useOutlet();
  const todayFormatted = DATE_FORMATTER.format(new Date());

  return (
    <div className="flex flex-col min-h-full bg-bg-canvas">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-[rgb(var(--line))]">
        <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary tracking-tight">
          Dashboard
        </h1>
        <div className="flex items-center gap-2 text-ink-muted text-sm">
          <span className="font-medium text-ink-secondary">{outletLabel}</span>
          <span aria-hidden="true">&middot;</span>
          <time dateTime={new Date().toISOString().slice(0, 10)}>
            {todayFormatted}
          </time>
        </div>
      </header>

      {/* ── Stat strip ───────────────────────────────────────────────────── */}
      <section
        aria-label="Key performance indicators"
        className="px-6 py-5 border-b border-[rgb(var(--line))]"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vehicles in stock */}
          <StatCard
            label={dashboardStats[0]!.label}
            value={dashboardStats[0]!.value}
            delta={dashboardStats[0]!.delta}
            deltaType={dashboardStats[0]!.deltaType}
            subtitle={dashboardStats[0]!.subtitle}
          />

          {/* Open deals */}
          <StatCard
            label={dashboardStats[1]!.label}
            value={dashboardStats[1]!.value}
            subtitle={dashboardStats[1]!.subtitle}
          />

          {/* Active job cards */}
          <StatCard
            label={dashboardStats[2]!.label}
            value={dashboardStats[2]!.value}
            subtitle={dashboardStats[2]!.subtitle}
          />

          {/* Revenue MTD — isAmount flag formats via AmountCell */}
          <StatCard
            label={dashboardStats[3]!.label}
            value={dashboardStats[3]!.value}
            delta={dashboardStats[3]!.delta}
            deltaType={dashboardStats[3]!.deltaType}
            isAmount
          />
        </div>
      </section>

      {/* ── Main panels row ──────────────────────────────────────────────── */}
      <section
        aria-label="Operational panels"
        className="px-6 py-5 border-b border-[rgb(var(--line))]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <InventorySnapshotPanel rows={INVENTORY_ROWS} />
          <SalesPipelinePanel />
          <ServiceBayPanel />
        </div>
      </section>

      {/* ── Secondary panels row ─────────────────────────────────────────── */}
      <section
        aria-label="Activity and alerts"
        className="px-6 py-5"
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Activity feed — 3/5 cols */}
          <div className="lg:col-span-3">
            <ActivityFeed />
          </div>

          {/* Alerts & tasks — 2/5 cols */}
          <div className="lg:col-span-2">
            <AlertsTasksPanel />
          </div>
        </div>
      </section>
    </div>
  );
}
