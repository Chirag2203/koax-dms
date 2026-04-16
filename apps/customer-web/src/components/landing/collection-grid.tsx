'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@dms/ui';
import { ArrowRight } from 'lucide-react';
import type { Vehicle } from '@dms/types';

// ─── Inline collection vehicle card (light variant) ──────────────────────────
// Mirrors the Stitch reference collection card pattern. Once the shared
// VehicleCard component (from @/src/components/vehicle-card) is available,
// this inline implementation can be replaced with that component.

interface CollectionCardProps {
  vehicle: Vehicle;
}

function CollectionCard({ vehicle }: CollectionCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(vehicle.price);

  const metaLabel = [
    vehicle.year,
    `${new Intl.NumberFormat('en-IN').format(vehicle.km)} KM`,
    vehicle.city.toUpperCase(),
  ].join(' · ');

  const primaryImage = vehicle.images[0];

  return (
    <div className="group cursor-pointer">
      <Link
        href={`/collection/${vehicle.vin}`}
        aria-label={`View ${vehicle.make} ${vehicle.model} ${vehicle.variant}`}
      >
        {/* Image — 4:5 portrait */}
        <div className="mb-6 aspect-[4/5] overflow-hidden rounded-sm bg-bg-subtle">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt}
              width={primaryImage.width}
              height={primaryImage.height}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="h-full w-full bg-bg-subtle" aria-hidden="true" />
          )}
        </div>

        {/* Details */}
        <div className="mb-4 border-b border-line pb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {metaLabel}
            </span>
            {vehicle.isCertified && (
              <span className="font-mono text-[9px] uppercase tracking-widest text-accent">
                CPO
              </span>
            )}
          </div>
          <h4 className="mb-1 font-display text-2xl text-ink-primary">
            {vehicle.make} {vehicle.model}
          </h4>
          <p className="font-sans text-sm text-ink-secondary">
            {vehicle.color} · {vehicle.interiorColor.split(' with')[0]}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-sans text-xl font-light text-ink-primary">
            {formattedPrice}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent opacity-0 transition-opacity group-hover:opacity-100">
            View Details
          </span>
        </div>
      </Link>
    </div>
  );
}

// ─── Collection Grid ──────────────────────────────────────────────────────────

interface CollectionGridProps {
  vehicles: Vehicle[];
}

export function CollectionGrid({ vehicles }: CollectionGridProps) {
  const t = useTranslations('collection');
  const displayed = vehicles.slice(0, 9);

  return (
    <section
      id="collection"
      aria-label="Available inventory"
      className="bg-bg-paper px-6 py-20 md:px-12 md:py-32 lg:px-24"
    >
      {/* Section header */}
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="mb-4 block font-mono text-xs uppercase tracking-[0.3em] text-accent">
            The Collection
          </span>
          <h2 className="font-display text-3xl font-normal tracking-tight text-ink-primary md:text-5xl">
            {t('headline')}
          </h2>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
        {displayed.map((vehicle) => (
          <CollectionCard key={vehicle.vin} vehicle={vehicle} />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-20 flex justify-center">
        <Link
          href="/collection"
          className={buttonVariants({ variant: 'secondary', size: 'md' })}
        >
          {t('viewAll')}
          <ArrowRight className="h-[1em] w-[1em] shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
