'use client';

/**
 * VaultControls — search + category + status filters for the Documents Vault.
 *
 * SPEC-PORTAL-DOCS-001 L10: client-side filtering only.
 * No `text-[NNpx]`, no `rounded-lg/xl`.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import type { Document } from '@dms/types';
import type { VaultFilterState } from '@/src/lib/portal/portal-docs-adapter';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultControlsProps {
  filters: VaultFilterState;
  onChange: (next: VaultFilterState) => void;
  totalDocs: number;
}

// ─── Category options ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: Array<{ value: Document['type'] | 'all'; labelKey: string }> = [
  { value: 'all',                labelKey: 'filterCategoryAll' },
  { value: 'rc',                 labelKey: 'filterRc' },
  { value: 'insurance',          labelKey: 'filterInsurance' },
  { value: 'puc',                labelKey: 'filterPuc' },
  { value: 'warranty',           labelKey: 'filterWarranty' },
  { value: 'invoice',            labelKey: 'filterInvoice' },
  { value: 'sale-agreement',     labelKey: 'filterSaleAgreement' },
  { value: 'custom-build-quote', labelKey: 'filterCustomBuildQuote' },
  { value: 'purchase-agreement', labelKey: 'filterPurchaseAgreement' },
  { value: 'inspection-report',  labelKey: 'filterInspectionReport' },
  { value: 'service-record',     labelKey: 'filterServiceRecord' },
];

const STATUS_OPTIONS: Array<{ value: VaultFilterState['status']; labelKey: string }> = [
  { value: 'all',            labelKey: 'filterStatusAll' },
  { value: 'active',         labelKey: 'filterStatusActive' },
  { value: 'expiring-soon',  labelKey: 'filterStatusExpiringSoon' },
  { value: 'expired',        labelKey: 'filterStatusExpired' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function VaultControls({ filters, onChange, totalDocs }: VaultControlsProps) {
  const t = useTranslations('portal.documents');

  const hasActiveFilter =
    filters.search !== '' ||
    filters.category !== 'all' ||
    filters.status !== 'all';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleClearSearch = () => {
    onChange({ ...filters, search: '' });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, category: e.target.value as VaultFilterState['category'] });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, status: e.target.value as VaultFilterState['status'] });
  };

  const handleClearAll = () => {
    onChange({ search: '', category: 'all', status: 'all' });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filters.search}
          onChange={handleSearchChange}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-9 pr-8 py-2 border border-line bg-bg-subtle text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          aria-label={t('searchPlaceholder')}
        />
        {filters.search && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-primary"
            aria-label={t('clearSearch')}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <select
        value={filters.category}
        onChange={handleCategoryChange}
        className="border border-line bg-bg-subtle text-sm text-ink-primary px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent cursor-pointer"
        aria-label={t('filterCategoryLabel')}
      >
        {CATEGORY_OPTIONS.map(({ value, labelKey }) => (
          <option key={value} value={value}>
            {t(labelKey as keyof object)}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filters.status}
        onChange={handleStatusChange}
        className="border border-line bg-bg-subtle text-sm text-ink-primary px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent cursor-pointer"
        aria-label={t('filterStatusLabel')}
      >
        {STATUS_OPTIONS.map(({ value, labelKey }) => (
          <option key={value} value={value}>
            {t(labelKey as keyof object)}
          </option>
        ))}
      </select>

      {/* Clear all (only when filters active) */}
      {hasActiveFilter && (
        <button
          type="button"
          onClick={handleClearAll}
          className="font-mono text-xs uppercase tracking-widest text-ink-muted hover:text-accent transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('clearAllFilters')} ×
        </button>
      )}

      {/* Doc count */}
      <span className="font-mono text-xs text-ink-muted whitespace-nowrap ml-auto">
        {t('docCount', { count: totalDocs })}
      </span>
    </div>
  );
}
