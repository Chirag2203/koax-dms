import * as React from 'react';
import Link from 'next/link';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';
import { VehicleCard } from '@/src/components/vehicle-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimilarVehiclesProps {
  vehicles: Vehicle[];
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SimilarVehicles({ vehicles, className }: SimilarVehiclesProps) {
  if (vehicles.length === 0) return null;

  return (
    <section
      className={cn(
        'bg-bg-subtle px-6 md:px-12 lg:px-24 py-20 md:py-32',
        className,
      )}
      aria-labelledby="similar-vehicles-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between">
          <h2
            id="similar-vehicles-heading"
            className="font-display text-3xl md:text-[48px] tracking-[-0.04em] text-ink-primary"
          >
            Curated Alternatives
          </h2>
          <Link
            href="/collection"
            className={cn(
              'font-mono text-xs uppercase tracking-widest text-accent',
              'border-b border-accent pb-1',
              'hover:text-accent/80 hover:border-accent/80 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'whitespace-nowrap ml-4',
            )}
          >
            View Full Collection
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 md:mt-16">
          {vehicles.slice(0, 3).map((vehicle) => (
            <VehicleCard
              key={vehicle.vin}
              vehicle={vehicle}
              variant="collection"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
