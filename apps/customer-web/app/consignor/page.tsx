'use client';

import * as React from 'react';
import {
  mockCustomer,
  consignedVehicles,
  consignorMessages,
} from '@dms/mocks/fixtures';
import {
  ConsignorGreeting,
  StatsOverview,
  ConsignedVehicleCards,
  RecentMessagesPreview,
} from '@/src/components/consignor/dashboard';

export default function ConsignorDashboardPage() {
  return (
    <div className="max-w-5xl">
      {/* ── 1. Greeting ───────────────────────────────────────────────────────── */}
      <ConsignorGreeting customer={mockCustomer} />

      {/* ── 2. Stats Overview ─────────────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-line)]" />
      <StatsOverview vehicles={consignedVehicles} />

      {/* ── 3. Consigned Vehicle Cards ────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-line)]" />
      <ConsignedVehicleCards vehicles={consignedVehicles} />

      {/* ── 4. Recent Messages Preview ────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-line)]" />
      <RecentMessagesPreview messages={consignorMessages} />
    </div>
  );
}
