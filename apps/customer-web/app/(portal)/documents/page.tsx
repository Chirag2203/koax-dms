'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { documents } from '@dms/mocks/fixtures';
import { DocumentGroup } from '@/src/components/portal/documents';
import type { Document } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupDocumentsByVehicle(docs: Document[]): Map<string, { name: string; docs: Document[] }> {
  const map = new Map<string, { name: string; docs: Document[] }>();
  for (const doc of docs) {
    const key = doc.vehicleVin;
    const existing = map.get(key);
    if (existing) {
      existing.docs.push(doc);
    } else {
      map.set(key, { name: doc.vehicleName, docs: [doc] });
    }
  }
  return map;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const t = useTranslations('portal.documents');
  const grouped = groupDocumentsByVehicle(documents);

  return (
    <div className="max-w-5xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
          {t('title')}
        </h1>
        <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* ── Document groups ─────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-16 pb-16">
        {documents.length === 0 ? (
          /* Empty state */
          <div className="py-16 text-center border border-dashed border-[var(--color-line)]">
            <p className="font-display text-xl text-[var(--color-ink-secondary)] italic mb-3">
              {t('empty')}
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">{t('emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Array.from(grouped.entries()).map(([vin, { name, docs }], index) => (
              <React.Fragment key={vin}>
                <DocumentGroup vehicleName={name} documents={docs} />
                {/* Hairline between groups (not after the last) */}
                {index < grouped.size - 1 && (
                  <div className="border-t border-[var(--color-line)]" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
