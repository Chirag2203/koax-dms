'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Wrench, Truck, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { OwnedVehicle } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return vin.slice(0, 9) + '····' + vin.slice(-4);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OwnedVehicleCardProps {
  vehicle: OwnedVehicle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnedVehicleCard({ vehicle }: OwnedVehicleCardProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <Link href={`/vehicles/${vehicle.vin}`} className="group block h-full">
      <article
        className={cn(
          'h-full flex flex-col',
          'overflow-hidden rounded-sm transition-all duration-300',
          'border border-line hover:border-accent/40',
          'bg-bg-subtle hover:bg-bg-hover',
        )}
      >
        {/* Photo — fixed aspect, grayscale with color on hover */}
        <div className="relative aspect-[16/10] overflow-hidden flex-shrink-0">
          {vehicle.imageUrl ? (
            <Image
              src={vehicle.imageUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover grayscale opacity-80 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-bg-hover" />
          )}

          {/* Service status badge */}
          <div className="absolute top-3 right-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                'font-mono text-[10px] uppercase tracking-widest backdrop-blur-sm',
                vehicle.isServiceOverdue
                  ? 'bg-warning/20 text-warning border border-warning/30'
                  : 'bg-success/20 text-success border border-success/30',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', vehicle.isServiceOverdue ? 'bg-warning' : 'bg-success')} />
              {vehicle.isServiceOverdue ? t('serviceOverdue') : t('serviceCurrent')}
            </span>
          </div>
        </div>

        {/* Card body — flex-1 to fill remaining height */}
        <div className="flex flex-col flex-1 p-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display text-lg text-ink-primary leading-snug line-clamp-2">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <ChevronRight
              className="h-4 w-4 text-ink-muted mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />
          </div>

          {/* Variant + color */}
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            {vehicle.variant} · {vehicle.color}
          </p>

          {/* VIN */}
          <p className="font-mono text-[11px] text-ink-secondary mb-auto">
            {maskVin(vehicle.vin)}
          </p>

          {/* Stats — pushed to bottom via mb-auto above */}
          <div className="grid grid-cols-2 gap-3 py-3 mt-4 border-t border-line">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">Mileage</p>
              <p className="font-mono text-sm text-ink-primary tabular-nums">{formatKm(vehicle.currentMileage)} km</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">Next Service</p>
              <p className={cn('font-mono text-sm tabular-nums', vehicle.isServiceOverdue ? 'text-warning' : 'text-ink-primary')}>
                {formatDate(vehicle.nextServiceDue)}
              </p>
            </div>
          </div>

          {/* Quick actions — contained within card */}
          <div className="flex items-center justify-between pt-3 border-t border-line">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-accent">
                <Wrench className="h-3 w-3" />
                Service
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                <Truck className="h-3 w-3" />
                Pickup
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                <FileText className="h-3 w-3" />
                Docs
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
