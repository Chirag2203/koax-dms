'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';
import { PriceDisplay } from './price-display';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VehicleCardVariant = 'featured' | 'collection';

export interface VehicleCardProps {
  vehicle: Vehicle;
  variant?: VehicleCardVariant;
  className?: string;
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

// ─── Featured variant ─────────────────────────────────────────────────────────

function FeaturedCard({ vehicle }: { vehicle: Vehicle }) {
  const primaryImage = vehicle.images[0];
  const metaLine = `${vehicle.year} · ${vehicle.make.toUpperCase()} ${vehicle.model.toUpperCase()}`;
  // Use first sentence of editorial copy as the card title, fall back to make+model
  const cardTitle = vehicle.editorialCopy
    ? vehicle.editorialCopy.split('.')[0] ?? `${vehicle.make} ${vehicle.model}`
    : `${vehicle.make} ${vehicle.model}`;

  return (
    <>
      {/* Image — 16:10 */}
      <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-sm bg-[#1a1916]">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className={cn(
              // Full-fidelity image (was: `grayscale opacity-80` which crushed
              // image legibility on the dark surface — user feedback 2026-05-08).
              'object-cover',
              'motion-safe:transition-transform motion-safe:duration-700',
              'group-hover:scale-105',
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-[#2a2926]" />
        )}
      </div>

      {/* Text block */}
      <div className="space-y-4">
        <span className="block font-mono text-[11px] uppercase tracking-widest text-ink-muted">
          {metaLine}
        </span>

        <h3 className="font-display text-3xl leading-tight text-ink-primary">
          {cardTitle}
        </h3>

        {vehicle.editorialCopy && (
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-secondary">
            {vehicle.editorialCopy}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <PriceDisplay amount={vehicle.price} size="md" />
          <ArrowRight
            aria-hidden="true"
            className={cn(
              'h-5 w-5 text-ink-muted',
              'motion-safe:transition-colors motion-safe:duration-[240ms]',
              'group-hover:text-accent',
            )}
          />
        </div>
      </div>
    </>
  );
}

// ─── Collection variant ────────────────────────────────────────────────────────

function CollectionCard({ vehicle }: { vehicle: Vehicle }) {
  const primaryImage = vehicle.images[0];
  const cityLabel = CITY_LABELS[vehicle.city] ?? vehicle.city.toUpperCase();
  const metaLine = `${vehicle.year} · ${formatKm(vehicle.km)} KM · ${cityLabel}`;

  return (
    <>
      {/* Image — 4:5 */}
      <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-sm bg-bg-subtle">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn(
              // Full-fidelity image (was: `mix-blend-multiply opacity-90`
              // which multiplied against the dark card surface and turned
              // every photo nearly black — user feedback 2026-05-08).
              'object-cover',
              'motion-safe:transition-transform motion-safe:duration-700',
              'group-hover:scale-[1.02]',
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-bg-subtle" />
        )}
      </div>

      {/* Upper meta + title */}
      <div className="pb-4 border-b border-line mb-4">
        <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          {metaLine}
        </span>

        {/* Title with underline-reveal on hover */}
        <h4
          className={cn(
            'relative mb-1 inline-block font-display text-xl leading-snug text-ink-primary',
            'after:absolute after:bottom-0 after:left-0 after:h-px after:bg-ink-primary',
            'after:w-0 after:motion-safe:transition-[width] after:motion-safe:duration-300',
            'group-hover:after:w-full',
          )}
        >
          {vehicle.make} {vehicle.model}
        </h4>

        <p className="text-sm text-ink-secondary">
          {vehicle.variant} · {vehicle.color}
        </p>
      </div>

      {/* Price + view link */}
      <div className="flex items-center justify-between">
        <PriceDisplay
          amount={vehicle.price}
          size="md"
          className="font-sans font-medium"
        />
        <span
          aria-hidden="true"
          className={cn(
            'font-mono text-[10px] uppercase tracking-widest text-accent',
            'motion-safe:opacity-0 motion-safe:transition-opacity motion-safe:duration-[240ms]',
            'group-hover:opacity-100',
          )}
        >
          View &rarr;
        </span>
      </div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function VehicleCard({
  vehicle,
  variant = 'collection',
  className,
}: VehicleCardProps) {
  return (
    <Link
      href={`/collection/${vehicle.vin}`}
      className={cn('group relative block cursor-pointer', className)}
      aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
    >
      {variant === 'featured' ? (
        <FeaturedCard vehicle={vehicle} />
      ) : (
        <CollectionCard vehicle={vehicle} />
      )}
    </Link>
  );
}
