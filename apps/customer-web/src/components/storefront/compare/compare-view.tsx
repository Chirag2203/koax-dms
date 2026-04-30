/**
 * CompareView — side-by-side vehicle spec comparison table.
 *
 * Shows up to 3 vehicles in columns with a row-per-spec layout.
 * A vehicle can be removed; once removed, an "Add a vehicle" placeholder
 * appears linking back to inventory.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 S10, S11
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X, ArrowLeft, Plus } from 'lucide-react';
import { cn } from '@dms/ui';
import { vehicles as allVehicles } from '@dms/mocks/fixtures';
import type { Vehicle } from '@dms/types/domain';
import { PriceDisplay } from '@/src/components/price-display';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpecRow {
  label: string;
  getValue: (v: Vehicle) => string;
}

// ─── Spec rows ────────────────────────────────────────────────────────────────

const SPEC_ROWS: SpecRow[] = [
  { label: 'Year', getValue: (v) => String(v.year) },
  { label: 'Make', getValue: (v) => v.make },
  { label: 'Model', getValue: (v) => v.model },
  { label: 'Variant', getValue: (v) => v.variant },
  { label: 'Fuel', getValue: (v) => v.fuel.charAt(0).toUpperCase() + v.fuel.slice(1) },
  { label: 'Transmission', getValue: (v) => v.transmission.charAt(0).toUpperCase() + v.transmission.slice(1) },
  { label: 'Body Style', getValue: (v) => v.bodyType.charAt(0).toUpperCase() + v.bodyType.slice(1) },
  { label: 'Colour', getValue: (v) => v.color },
  { label: 'Kilometres', getValue: (v) => `${formatKm(v.km)} km` },
  { label: 'Outlet', getValue: (v) => v.city.charAt(0).toUpperCase() + v.city.slice(1) },
  { label: 'Engine', getValue: (v) => v.engine || 'N/A' },
  { label: 'Power', getValue: (v) => v.power || 'N/A' },
  { label: 'Torque', getValue: (v) => v.torque || 'N/A' },
  { label: 'Top Speed', getValue: (v) => v.topSpeed || 'N/A' },
  { label: '0–100 km/h', getValue: (v) => v.acceleration || 'N/A' },
  { label: 'Drive', getValue: (v) => v.driveType || 'N/A' },
  { label: 'Previous Owners', getValue: (v) => String(v.previousOwners) },
  { label: 'CPO Certified', getValue: (v) => v.isCertified ? `Yes — ${v.certificationPoints} points` : 'No' },
  { label: 'Key Sets', getValue: (v) => String(v.keyCount) },
  { label: 'Tyre Condition', getValue: (v) => v.tyreCondition || 'N/A' },
  { label: 'Registration', getValue: (v) => v.registrationState },
  { label: 'Insurance Expiry', getValue: (v) => v.insuranceExpiry || 'N/A' },
  { label: 'Warranty', getValue: (v) => v.warrantyExpiry ? `Until ${v.warrantyExpiry}` : 'N/A' },
];

// ─── CompareView ──────────────────────────────────────────────────────────────

export function CompareView({ initialVins }: { initialVins: string[] }) {
  const t = useTranslations('inventory');
  const router = useRouter();

  const [vins, setVins] = React.useState<string[]>(
    initialVins.slice(0, 3),
  );

  const vehicles = vins
    .map((vin) => allVehicles.find((v) => v.vin === vin))
    .filter((v): v is Vehicle => v !== undefined);

  function removeVehicle(vin: string) {
    const newVins = vins.filter((v) => v !== vin);
    setVins(newVins);
    if (newVins.length === 0) {
      router.push('/inventory');
    }
  }

  // Determine if a value differs across all vehicles (highlight differences)
  function isDifferent(rowIndex: number): boolean {
    if (vehicles.length < 2) return false;
    const values = vehicles.map((v) => SPEC_ROWS[rowIndex]?.getValue(v));
    return new Set(values).size > 1;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 md:px-12 lg:px-24 py-16">
      {/* Back link */}
      <Link
        href="/inventory"
        className="mb-8 flex items-center gap-2 font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
      >
        <ArrowLeft size={12} aria-hidden="true" />
        {t('backToInventory')}
      </Link>

      {/* Page header */}
      <header className="mb-12">
        <span className="mb-3 block font-mono text-xs uppercase tracking-widest text-accent">
          {t('compareEyebrow')}
        </span>
        <h1 className="font-display text-4xl md:text-5xl italic tracking-tighter text-ink-primary">
          {t('compareHeadline')}
        </h1>
      </header>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse" aria-label={t('compareTableLabel')}>
          <thead>
            <tr>
              {/* Label column */}
              <th className="w-40 text-left" scope="col" />

              {/* Vehicle columns */}
              {vehicles.map((vehicle) => (
                <th
                  key={vehicle.vin}
                  scope="col"
                  className="px-4 pb-8 text-left align-top"
                >
                  <div className="space-y-3">
                    {/* Photo */}
                    <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-bg-subtle">
                      {vehicle.images[0] ? (
                        <Image
                          src={vehicle.images[0].url}
                          alt={vehicle.images[0].alt}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-line" />
                      )}
                    </div>

                    {/* Title + remove */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-ink-muted">{vehicle.year}</p>
                        <p className="font-display text-xl italic text-ink-primary">
                          {vehicle.make} {vehicle.model}
                        </p>
                        <PriceDisplay amount={vehicle.price} size="sm" className="mt-1" />
                      </div>
                      <button
                        onClick={() => removeVehicle(vehicle.vin)}
                        aria-label={`Remove ${vehicle.make} ${vehicle.model}`}
                        className="mt-1 shrink-0 text-ink-muted hover:text-ink-primary transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* VDP link */}
                    <Link
                      href={`/collection/${vehicle.vin}`}
                      className="block font-mono text-xs text-accent underline underline-offset-2 hover:text-accent/80"
                    >
                      {t('viewVDP')} →
                    </Link>
                  </div>
                </th>
              ))}

              {/* Empty slot (if < 3 vehicles) */}
              {vehicles.length < 3 && (
                <th scope="col" className="px-4 pb-8 align-top">
                  <Link
                    href="/inventory"
                    className={cn(
                      'flex flex-col items-center justify-center gap-3',
                      'aspect-[4/3] rounded-sm border border-dashed border-line',
                      'text-ink-muted hover:text-ink-primary hover:border-accent transition-colors',
                    )}
                  >
                    <Plus size={20} aria-hidden="true" />
                    <span className="font-mono text-xs uppercase tracking-widest">
                      {t('compareAddVehicle')}
                    </span>
                  </Link>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {/* Price row highlighted */}
            <tr className="border-t border-line">
              <td className="py-4 pr-4 font-mono text-xs uppercase tracking-widest text-ink-muted align-middle">
                {t('comparePrice')}
              </td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.vin} className="px-4 py-4 align-middle">
                  <PriceDisplay amount={vehicle.price} size="md" />
                </td>
              ))}
              {vehicles.length < 3 && <td className="px-4 py-4" />}
            </tr>

            {/* Spec rows */}
            {SPEC_ROWS.map((row, rowIdx) => {
              const differs = isDifferent(rowIdx);
              return (
                <tr
                  key={row.label}
                  className={cn(
                    'border-t border-line/50',
                    differs && 'bg-accent/5',
                  )}
                >
                  <td className="py-3 pr-4 font-mono text-xs uppercase tracking-widest text-ink-muted align-middle">
                    {row.label}
                  </td>
                  {vehicles.map((vehicle) => (
                    <td
                      key={vehicle.vin}
                      className={cn(
                        'px-4 py-3 text-sm align-middle',
                        differs ? 'font-medium text-ink-primary' : 'text-ink-secondary',
                      )}
                    >
                      {row.getValue(vehicle)}
                    </td>
                  ))}
                  {vehicles.length < 3 && <td className="px-4 py-3" />}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
