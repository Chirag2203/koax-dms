/**
 * Parts landing view — tabs shell.
 *
 * Canonical underline tabs pattern copied from service-landing-view.tsx
 * (cross-module consistency mandate). URL-sync via `?tab=`.
 *
 * Spec reference: PLAN-PARTS-002 §3, §11, §17
 */

'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@dms/ui';
import { StockListTab } from './tabs/stock-list-tab';
import { LowStockTab } from './tabs/low-stock-tab';
import { PurchaseOrdersTab } from './tabs/purchase-orders-tab';
import { GrnsTab } from './tabs/grns-tab';
import { SuppliersTab } from './tabs/suppliers-tab';

// ─── Tab config ───────────────────────────────────────────────────────────────

type PartsTabId = 'stock-list' | 'low-stock' | 'po' | 'grn' | 'suppliers';

const TABS: { id: PartsTabId; label: string }[] = [
  { id: 'stock-list', label: 'Stock List' },
  { id: 'low-stock', label: 'Low Stock' },
  { id: 'po', label: 'Purchase Orders' },
  { id: 'grn', label: 'GRNs' },
  { id: 'suppliers', label: 'Suppliers' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PartsLandingView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get('tab') as PartsTabId | null;
  const activeTab: PartsTabId =
    rawTab && TABS.some((t) => t.id === rawTab) ? rawTab : 'stock-list';

  const handleTabChange = useCallback(
    (tabId: PartsTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabId);
      // The `?supplier=` deep-link from Suppliers → PO is one-shot. Strip it
      // on every switch AWAY from PO so a subsequent return to PO starts with
      // default filters (not a stale supplier filter). When combined with the
      // "unmount on switch" panel semantics, this guarantees each tab entry
      // from the landing page presents a fresh, predictable state.
      if (tabId !== 'po') {
        params.delete('supplier');
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            Parts
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted leading-[1.5]">
            Stock, purchase orders, GRNs, and suppliers
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/parts/grn/new"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line',
              'bg-bg-surface text-sm font-medium text-ink-primary',
              'hover:bg-bg-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            New GRN
          </Link>
          <Link
            href="/parts/po/new"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white',
              'text-sm font-medium hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            New PO
          </Link>
        </div>
      </div>

      {/* ── Tabs row ──────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Parts sections"
        className="flex items-end gap-0 border-b border-line px-6 shrink-0"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              activeTab === tab.id
                ? 'text-ink-primary'
                : 'text-ink-muted hover:text-ink-secondary',
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm bg-accent"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab panels ────────────────────────────────────────────────────── */}
      {/*
        Design decision (PLAN-PARTS-002 §17.1): inactive tabs UNMOUNT rather
        than staying mounted with `hidden`. Filter state resets on tab switch
        — matches spec §3 "no filter URL persistence in P2". Only one
        <div role="tabpanel"> is rendered at a time (the active one).
       */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="h-full"
        >
          {activeTab === 'stock-list' && <StockListTab />}
          {activeTab === 'low-stock' && <LowStockTab />}
          {activeTab === 'po' && <PurchaseOrdersTab />}
          {activeTab === 'grn' && <GrnsTab />}
          {activeTab === 'suppliers' && <SuppliersTab />}
        </div>
      </div>
    </div>
  );
}
