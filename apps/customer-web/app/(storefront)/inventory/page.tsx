/**
 * /inventory — filterable inventory listing page.
 *
 * Replaces the old single-list inventory stub. Wraps InventoryView
 * in a Suspense boundary (required because useSearchParams is used inside).
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 §InventoryPage, L8
 */

import * as React from 'react';
import type { Metadata } from 'next';
import { InventoryView } from '@/src/components/storefront/inventory/inventory-view';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Inventory | BN Automobiles',
  description:
    'Search and filter our hand-selected inventory of pre-owned luxury vehicles. Filter by price, year, fuel type, body style, colour, and more. Available in Bangalore, Mumbai, and Chennai.',
};

// ─── Loading fallback ─────────────────────────────────────────────────────────

function InventoryFallback() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 md:px-12 lg:px-24 py-16">
      <header className="mb-12">
        <span className="mb-3 block h-3 w-24 rounded-sm bg-bg-subtle animate-pulse" />
        <div className="h-16 w-72 rounded-sm bg-bg-subtle animate-pulse mb-4" />
        <div className="h-4 w-64 rounded-sm bg-bg-subtle animate-pulse" />
      </header>
      <div className="flex gap-10">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 w-full rounded-sm bg-bg-subtle animate-pulse" />
          ))}
        </aside>
        {/* Grid skeleton */}
        <div className="flex-1 grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-[4/5] rounded-sm bg-bg-subtle animate-pulse" />
              <div className="h-3 w-40 rounded-sm bg-bg-subtle animate-pulse" />
              <div className="h-6 w-32 rounded-sm bg-bg-subtle animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  return (
    <React.Suspense fallback={<InventoryFallback />}>
      <InventoryView />
    </React.Suspense>
  );
}
