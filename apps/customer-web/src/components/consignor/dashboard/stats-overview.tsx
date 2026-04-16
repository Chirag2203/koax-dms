'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { ConsignedVehicle } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatsOverviewProps {
  vehicles: ConsignedVehicle[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="p-6 border border-[var(--color-line)] bg-[var(--color-bg-elevated,#faf8f2)]">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-3">
        {label}
      </p>
      <p className="font-display text-4xl text-[var(--color-brass)] tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatsOverview({ vehicles }: StatsOverviewProps) {
  const t = useTranslations('portal.consignor.dashboard.stats');

  const activeListings = vehicles.filter(
    (v) => v.status === 'listed' || v.status === 'reserved' || v.status === 'under-offer',
  ).length;

  const totalViewings = vehicles.reduce((sum, v) => sum + (v.viewingsCount ?? 0), 0);
  const totalInquiries = vehicles.reduce((sum, v) => sum + (v.inquiriesCount ?? 0), 0);

  const estPayout = vehicles
    .filter((v) => v.status !== 'sold' && v.status !== 'withdrawn')
    .reduce((sum, v) => {
      const net = v.currentListPrice * (1 - v.feePercentage / 100);
      return sum + net;
    }, 0);

  const stats: StatCardProps[] = [
    { label: t('activeListings'), value: String(activeListings) },
    { label: t('totalViewings'), value: String(totalViewings) },
    { label: t('totalInquiries'), value: String(totalInquiries) },
    { label: t('estPayout'), value: formatInr(estPayout) },
  ];

  return (
    <section className="px-6 md:px-12 lg:px-16 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </section>
  );
}
