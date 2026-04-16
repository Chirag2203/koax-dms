'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ownedVehicles } from '@dms/mocks/fixtures';
import { OwnedVehicleCard } from '@/src/components/portal/vehicles';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const t = useTranslations('portal.vehicles');

  return (
    <div className="max-w-5xl">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 lg:px-16 pt-10 pb-8 border-b border-line">
        <h1 className="font-display text-3xl md:text-4xl text-ink-primary leading-tight mb-2">
          {t('title')}
        </h1>
        <p className="text-sm text-ink-secondary max-w-xl">
          {t('subtitle')}
        </p>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 lg:px-16 py-10">
        {ownedVehicles.length === 0 ? (
          /* Empty state */
          <div className="py-24 text-center">
            <p className="font-display text-xl italic text-ink-secondary mb-4">
              {t('empty')}
            </p>
            <Link
              href="/collection"
              className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline underline-offset-4"
            >
              {t('emptyLink')} →
            </Link>
          </div>
        ) : (
          /* Vehicle grid */
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            role="list"
            aria-label={t('listLabel')}
          >
            {ownedVehicles.map((vehicle) => (
              <div key={vehicle.vin} role="listitem">
                <OwnedVehicleCard vehicle={vehicle} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom padding for mobile tab bar */}
      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
