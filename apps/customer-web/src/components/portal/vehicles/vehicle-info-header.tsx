'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Wrench, Truck, ArrowLeft } from 'lucide-react';
import type { OwnedVehicle } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return vin.slice(0, 9) + '••••' + vin.slice(-4);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km) + ' km';
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VehicleInfoHeaderProps {
  vehicle: OwnedVehicle;
}

// ─── Detail row helper ────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[var(--color-line)]">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] shrink-0">
        {label}
      </span>
      <span
        className={[
          mono ? 'font-mono text-sm' : 'text-sm',
          accent ? 'text-[var(--color-brass)]' : 'text-[var(--color-ink)]',
          'text-right',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleInfoHeader({ vehicle }: VehicleInfoHeaderProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <div className="px-6 md:px-12 lg:px-16 pt-8 pb-12">
      {/* Back link */}
      <Link
        href="/vehicles"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors mb-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        {t('backToVehicles')}
      </Link>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Photo (3:2 aspect) */}
        <div
          className="relative w-full overflow-hidden bg-[var(--color-bg-subtle)]"
          style={{ aspectRatio: '3/2' }}
        >
          {vehicle.imageUrl ? (
            <Image
              src={vehicle.imageUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-bg-subtle)]" />
          )}
        </div>

        {/* Right: Details */}
        <div className="flex flex-col justify-between">
          {/* Title block */}
          <div className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brass)] mb-2">
              {vehicle.make} · {vehicle.year}
            </p>
            <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] leading-tight mb-1">
              {vehicle.model}
            </h1>
            <p className="text-[var(--color-ink-secondary)] text-sm">
              {vehicle.variant} · {vehicle.color}
            </p>

            {/* Service badge */}
            <div className="mt-3">
              <span
                className={`inline-flex font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 ${
                  vehicle.isServiceOverdue
                    ? 'bg-[var(--color-warning,#f59e0b)]/10 text-[var(--color-warning,#b45309)]'
                    : 'bg-[var(--color-success,#16a34a)]/10 text-[var(--color-success,#16a34a)]'
                }`}
              >
                {vehicle.isServiceOverdue ? t('serviceOverdue') : t('serviceCurrent')}
              </span>
            </div>
          </div>

          {/* Detail rows */}
          <div className="flex-1 mb-6">
            <DetailRow
              label="VIN"
              value={maskVin(vehicle.vin)}
              mono
            />
            <DetailRow
              label={t('registration')}
              value={vehicle.registrationNumber}
              mono
            />
            <DetailRow
              label={t('currentMileage')}
              value={formatKm(vehicle.currentMileage)}
              mono
            />
            <DetailRow
              label={t('nextService')}
              value={
                <span>
                  {formatDate(vehicle.nextServiceDue)}{' '}
                  <span className="text-[var(--color-ink-muted)]">
                    · {formatKm(vehicle.nextServiceDueKm)}
                  </span>
                </span>
              }
            />
          </div>

          {/* Quick actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/service/schedule?vin=${vehicle.vin}`}
              className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest border border-[var(--color-ink)] px-6 py-3 hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              {t('scheduleService')}
            </Link>
            <Link
              href={`/service/pickup?vin=${vehicle.vin}`}
              className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest border border-[var(--color-line)] px-6 py-3 text-[var(--color-ink-secondary)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
            >
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              {t('requestPickup')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
