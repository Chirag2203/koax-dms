'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarClock, Wrench, Truck, FileText } from 'lucide-react';
import type { OwnedVehicle } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnedVehiclesStripProps {
  vehicles: OwnedVehicle[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km) + ' km';
}

// ─── Single vehicle card ──────────────────────────────────────────────────────

function OwnedVehicleCard({ vehicle }: { vehicle: OwnedVehicle }) {
  const t = useTranslations('portal.account');

  return (
    <div className="flex gap-4 md:gap-6 py-6 first:pt-0 group">
      {/* Photo */}
      <Link
        href={`/vehicles/${vehicle.vin}`}
        className="flex-shrink-0 relative w-[100px] h-[100px] md:w-[120px] md:h-[120px] overflow-hidden bg-[var(--color-bg-subtle)]"
        tabIndex={-1}
        aria-hidden="true"
      >
        {vehicle.imageUrl ? (
          <Image
            src={vehicle.imageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            sizes="120px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-bg-subtle)]" />
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link href={`/vehicles/${vehicle.vin}`} className="group/link">
            <h3 className="font-display text-xl text-[var(--color-ink)] leading-snug group-hover/link:underline underline-offset-4">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
          </Link>

          {/* Service status badge */}
          <span
            className={`flex-shrink-0 font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 ${
              vehicle.isServiceOverdue
                ? 'bg-amber-100 text-amber-800'
                : 'bg-[var(--color-secondary-container,#bceed3)] text-[var(--color-on-secondary-container,#2d5a46)]'
            }`}
          >
            {vehicle.isServiceOverdue
              ? t('ownedVehicles.serviceOverdue')
              : t('ownedVehicles.serviceCurrent')}
          </span>
        </div>

        {/* Meta */}
        <div className="text-sm text-[var(--color-ink-secondary)] space-y-0.5 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
            {vehicle.variant} · {vehicle.color}
          </p>
          <p>
            {t('ownedVehicles.currentMileage')}: {formatKm(vehicle.currentMileage)}
          </p>
          <p>
            {t('ownedVehicles.nextService')}: {formatDate(vehicle.nextServiceDue)} /{' '}
            {formatKm(vehicle.nextServiceDueKm)}
          </p>
          <p className="font-mono text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider">
            {t('ownedVehicles.reg')}: {vehicle.registrationNumber}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={`/service/schedule?vin=${vehicle.vin}`}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            <Wrench className="h-3 w-3" aria-hidden="true" />
            {t('ownedVehicles.scheduleService')}
          </Link>

          <span className="text-[var(--color-line)]" aria-hidden="true">·</span>

          <Link
            href={`/service/pickup?vin=${vehicle.vin}`}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            <Truck className="h-3 w-3" aria-hidden="true" />
            {t('ownedVehicles.requestPickup')}
          </Link>

          <span className="text-[var(--color-line)]" aria-hidden="true">·</span>

          <Link
            href={`/documents?vin=${vehicle.vin}`}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            <FileText className="h-3 w-3" aria-hidden="true" />
            {t('ownedVehicles.viewDocuments')}
          </Link>
        </div>
      </div>

      {/* Next service icon */}
      <div className="flex-shrink-0 self-center hidden md:block">
        <CalendarClock
          className={`h-5 w-5 ${
            vehicle.isServiceOverdue
              ? 'text-amber-600'
              : 'text-[var(--color-forest,#1F4D3A)]'
          }`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnedVehiclesStrip({ vehicles }: OwnedVehiclesStripProps) {
  const t = useTranslations('portal.account');

  return (
    <section className="px-6 md:px-12 lg:px-16 py-12">
      {/* Section header */}
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-[var(--color-ink)]/10">
        <h2 className="font-display text-2xl md:text-3xl italic text-[var(--color-ink)]">
          {t('ownedVehicles.title')}
        </h2>
      </div>

      {vehicles.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-xl italic text-[var(--color-ink-secondary)] mb-4">
            {t('ownedVehicles.empty')}
          </p>
          <Link
            href="/collection"
            className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4"
          >
            {t('ownedVehicles.emptyLink')}
          </Link>
        </div>
      ) : (
        <div
          className="divide-y divide-[var(--color-line)]"
          role="list"
          aria-label={t('ownedVehicles.listLabel')}
        >
          {vehicles.map((v) => (
            <div role="listitem" key={v.vin}>
              <OwnedVehicleCard vehicle={v} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
