'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { PriceDisplay } from '@/src/components/price-display';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedVehicleDisplay {
  vin: string;
  make: string;
  model: string;
  year: number;
  km: number;
  city: string;
  price: number;
  imageUrl: string;
  imageAlt?: string;
  savedAt: string;
}

export interface SavedCarsShelfProps {
  vehicles: SavedVehicleDisplay[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CITY_LABELS: Record<string, string> = {
  bangalore: 'BANGALORE',
  mumbai: 'MUMBAI',
  chennai: 'CHENNAI',
};

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km);
}

// ─── Mini card ────────────────────────────────────────────────────────────────

function SavedVehicleCard({ vehicle }: { vehicle: SavedVehicleDisplay }) {
  const cityLabel = CITY_LABELS[vehicle.city] ?? vehicle.city.toUpperCase();
  const metaLine = `${vehicle.year} · ${formatKm(vehicle.km)} KM · ${cityLabel}`;

  return (
    <Link
      href={`/collection/${vehicle.vin}`}
      className="group flex-shrink-0 w-[280px] md:w-[300px] snap-start block"
      aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
    >
      {/* 4:5 image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-bg-subtle mb-4">
        {vehicle.imageUrl ? (
          <Image
            src={vehicle.imageUrl}
            alt={vehicle.imageAlt ?? `${vehicle.make} ${vehicle.model}`}
            fill
            sizes="300px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-bg-subtle" />
        )}
      </div>

      {/* Meta */}
      <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
        {metaLine}
      </span>

      {/* Title */}
      <h3 className="font-display text-xl text-ink-primary leading-snug mb-2">
        {vehicle.make} {vehicle.model}
      </h3>

      {/* Price + link */}
      <div className="flex items-center justify-between">
        <PriceDisplay amount={vehicle.price} size="sm" />
        <span
          className="font-mono text-[10px] uppercase tracking-widest text-accent flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden="true"
        >
          View <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SavedCarsShelf({ vehicles }: SavedCarsShelfProps) {
  const t = useTranslations('portal.account');

  return (
    <section className="px-6 md:px-12 lg:px-16 py-12">
      {/* Section header */}
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-ink-primary/10">
        <h2 className="font-display text-3xl italic text-ink-primary">
          {t('savedCars.title')}
        </h2>
        <Link
          href="/collection"
          className="font-mono text-[11px] uppercase tracking-widest text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-2"
        >
          {t('savedCars.viewAll')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {vehicles.length === 0 ? (
        /* Empty state */
        <div className="py-16 text-center">
          <p className="font-display text-xl text-ink-secondary mb-4">
            {t('savedCars.empty')}
          </p>
          <Link
            href="/collection"
            className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline underline-offset-4"
          >
            {t('savedCars.emptyLink')}
          </Link>
        </div>
      ) : (
        /* Horizontal scroll shelf */
        <div
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin"
          role="list"
          aria-label={t('savedCars.listLabel')}
        >
          {vehicles.map((v) => (
            <div role="listitem" key={v.vin}>
              <SavedVehicleCard vehicle={v} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
