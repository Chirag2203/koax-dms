'use client';

/**
 * VaultVehicleSection — per-VIN section in the Documents Vault.
 *
 * Shows: vehicle name header + VIN badge + doc list.
 * Renders an expiry warning chip on the section header when any doc
 * in the group is expiring-soon or expired.
 *
 * SPEC-PORTAL-DOCS-001 L5.
 * No `text-[NNpx]`, no `rounded-lg/xl`.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import type { VaultVehicleGroup } from '@/src/lib/portal/portal-docs-adapter';
import { VaultDocCard } from './vault-doc-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultVehicleSectionProps {
  group: VaultVehicleGroup;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VaultVehicleSection({ group }: VaultVehicleSectionProps) {
  const t = useTranslations('portal.documents');

  return (
    <section aria-label={group.vehicleName}>
      {/* Vehicle header */}
      <div className="flex items-baseline justify-between gap-4 mb-4 pb-3 border-b border-line">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-display text-xl text-ink-primary">
            {group.vehicleName}
          </h3>
          {/* VIN badge */}
          <span className="font-mono text-xs text-ink-muted border border-line/60 px-2 py-0.5">
            {group.vin}
          </span>
        </div>

        {/* Expiry alert indicator for the section */}
        {group.hasExpiry && (
          <div
            className="flex items-center gap-1.5 text-amber-700 flex-shrink-0"
            aria-label={t('sectionExpiryWarning')}
            title={t('sectionExpiryWarning')}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-widest hidden sm:inline">
              {t('sectionExpiryWarning')}
            </span>
          </div>
        )}
      </div>

      {/* Doc list */}
      <div
        className="divide-y divide-line"
        role="list"
        aria-label={`${t('documentsFor')} ${group.vehicleName}`}
      >
        {group.docs.map((doc) => (
          <VaultDocCard key={doc.id} doc={doc} />
        ))}
      </div>
    </section>
  );
}
