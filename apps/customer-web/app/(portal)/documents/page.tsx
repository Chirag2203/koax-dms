'use client';

/**
 * DocumentsPage — Customer Portal Documents Vault.
 *
 * Full vault replacing the basic list per SPEC-PORTAL-DOCS-001.
 *
 * Features:
 * - Grouped by vehicle (VIN section per L5)
 * - Search by document name (L10)
 * - Filter by category + status
 * - Expiry chips: amber ≤30d, red expired (L4)
 * - Every download triggers DPDP purpose prompt + DocumentAccessEvent (L2)
 * - Documents with `supersededBy` hidden from portal (L1)
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Vault } from 'lucide-react';
import { documents } from '@dms/mocks/fixtures';
import {
  buildVaultGroups,
  type VaultFilterState,
} from '@/src/lib/portal/portal-docs-adapter';
import { VaultVehicleSection } from '@/src/components/portal/documents/vault-vehicle-section';
import { VaultControls } from '@/src/components/portal/documents/vault-controls';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const t = useTranslations('portal.documents');

  const [filters, setFilters] = React.useState<VaultFilterState>({
    search: '',
    category: 'all',
    status: 'all',
  });

  const groups = buildVaultGroups(documents, filters);
  const totalDocs = groups.reduce((sum, g) => sum + g.docs.length, 0);
  const totalRawDocs = documents.filter((d) => !d.supersededBy).length;
  const hasFilters = filters.search !== '' || filters.category !== 'all' || filters.status !== 'all';

  return (
    <div className="max-w-5xl">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-brass)] mb-4">
          {t('eyebrow')}
        </p>
        <div className="flex items-start gap-4 mb-3">
          <h1 className="font-display text-3xl md:text-4xl text-ink-primary">
            {t('title')}
          </h1>
        </div>
        <p className="text-base text-ink-secondary leading-relaxed max-w-xl">
          {t('subtitle')}
        </p>

        {/* Vault status indicator */}
        <div className="mt-6 inline-flex items-center gap-2.5 px-4 py-2.5 bg-bg-subtle border border-line/60">
          <Vault className="h-4 w-4 text-accent flex-shrink-0" aria-hidden="true" />
          <div>
            <span className="font-mono text-xs text-ink-muted uppercase tracking-widest">
              {t('vaultStatusLabel')}
            </span>
            <span className="font-mono text-xs text-ink-primary ml-2">
              {t('vaultStatusValue', { count: totalRawDocs })}
            </span>
          </div>
        </div>

        <div className="mt-8 border-t border-line" />
      </header>

      {/* ── Controls ─────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 lg:px-16 pb-6">
        <VaultControls filters={filters} onChange={setFilters} totalDocs={totalDocs} />
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-16 pb-16">
        {/* Empty state — no docs at all */}
        {totalRawDocs === 0 && (
          <div
            className="py-16 text-center border border-dashed border-line"
            role="status"
            aria-live="polite"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border border-line/40 flex items-center justify-center">
                <Vault className="h-8 w-8 text-ink-muted" aria-hidden="true" />
              </div>
            </div>
            <p className="font-display text-xl text-ink-secondary italic mb-3">
              {t('empty')}
            </p>
            <p className="text-sm text-ink-muted">{t('emptyHint')}</p>
          </div>
        )}

        {/* Filter-empty state — docs exist but no results */}
        {totalRawDocs > 0 && groups.length === 0 && hasFilters && (
          <div
            className="py-16 text-center border border-dashed border-line"
            role="status"
            aria-live="polite"
          >
            <p className="font-display text-xl text-ink-secondary italic mb-3">
              {t('filterEmpty')}
            </p>
            <button
              type="button"
              onClick={() => setFilters({ search: '', category: 'all', status: 'all' })}
              className="font-mono text-xs uppercase tracking-widest text-accent hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t('clearAllFilters')} →
            </button>
          </div>
        )}

        {/* Vehicle sections */}
        {groups.length > 0 && (
          <div className="space-y-12">
            {groups.map((group, index) => (
              <React.Fragment key={group.vin}>
                <VaultVehicleSection group={group} />
                {/* Hairline between groups (not after the last) */}
                {index < groups.length - 1 && (
                  <div className="border-t border-line" aria-hidden="true" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
