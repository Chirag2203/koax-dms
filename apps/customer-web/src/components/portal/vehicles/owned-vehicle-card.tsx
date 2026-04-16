'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Wrench, Truck, FileText } from 'lucide-react';
import type { OwnedVehicle } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return vin.slice(0, 9) + '••••' + vin.slice(-4);
}

function maskReg(reg: string): string {
  // Show first 5 chars + mask middle + last 2
  if (reg.length <= 5) return reg;
  const parts = reg.split('-');
  if (parts.length < 3) return reg;
  const last = parts[parts.length - 1] ?? '';
  const masked = last.length >= 2 ? '**' + last.slice(-2) : last;
  return [...parts.slice(0, -1), masked].join('-');
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

export interface OwnedVehicleCardProps {
  vehicle: OwnedVehicle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnedVehicleCard({ vehicle }: OwnedVehicleCardProps) {
  const t = useTranslations('portal.vehicles');

  return (
    <article className="group bg-[var(--color-paper)] border border-[var(--color-line)] overflow-hidden hover:border-[var(--color-ink)]/30 transition-colors">
      {/* Photo — 16:10 aspect ratio */}
      <Link
        href={`/vehicles/${vehicle.vin}`}
        className="block relative overflow-hidden bg-[var(--color-bg-subtle)]"
        style={{ aspectRatio: '16/10' }}
        tabIndex={-1}
        aria-hidden="true"
      >
        {vehicle.imageUrl ? (
          <Image
            src={vehicle.imageUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-bg-subtle)]" />
        )}
      </Link>

      {/* Card body */}
      <div className="p-5">
        {/* Header: name + service badge */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <Link href={`/vehicles/${vehicle.vin}`} className="group/title min-w-0">
            <h3 className="font-display text-xl text-[var(--color-ink)] leading-snug group-hover/title:underline underline-offset-4">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
          </Link>
          <span
            className={`flex-shrink-0 font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 mt-0.5 ${
              vehicle.isServiceOverdue
                ? 'bg-[var(--color-warning,#f59e0b)]/10 text-[var(--color-warning,#b45309)]'
                : 'bg-[var(--color-success,#16a34a)]/10 text-[var(--color-success,#16a34a)]'
            }`}
          >
            {vehicle.isServiceOverdue ? t('serviceOverdue') : t('serviceCurrent')}
          </span>
        </div>

        {/* Variant + color */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-4">
          {vehicle.variant} · <span className="normal-case">{vehicle.color}</span>
        </p>

        {/* VIN + Registration */}
        <div className="space-y-1 mb-4">
          <p className="font-mono text-xs text-[var(--color-ink-secondary)]">
            <span className="text-[var(--color-ink-muted)] uppercase tracking-widest text-[10px] mr-2">VIN</span>
            {maskVin(vehicle.vin)}
          </p>
          <p className="font-mono text-xs text-[var(--color-ink-secondary)]">
            <span className="text-[var(--color-ink-muted)] uppercase tracking-widest text-[10px] mr-2">
              {t('registration')}
            </span>
            {maskReg(vehicle.registrationNumber)}
          </p>
        </div>

        {/* Mileage + next service */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 py-4 border-t border-b border-[var(--color-line)] mb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-0.5">
              {t('currentMileage')}
            </p>
            <p className="font-mono text-sm text-[var(--color-ink)]">
              {formatKm(vehicle.currentMileage)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-0.5">
              {t('nextService')}
            </p>
            <p className="font-mono text-sm text-[var(--color-ink)]">
              {formatDate(vehicle.nextServiceDue)}
            </p>
            <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
              {formatKm(vehicle.nextServiceDueKm)}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={`/service/schedule?vin=${vehicle.vin}`}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            <Wrench className="h-3 w-3" aria-hidden="true" />
            {t('scheduleService')}
          </Link>

          <span className="text-[var(--color-line)]" aria-hidden="true">·</span>

          <Link
            href={`/service/pickup?vin=${vehicle.vin}`}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            <Truck className="h-3 w-3" aria-hidden="true" />
            {t('requestPickup')}
          </Link>

          <span className="text-[var(--color-line)]" aria-hidden="true">·</span>

          <Link
            href={`/vehicles/${vehicle.vin}#documents`}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            <FileText className="h-3 w-3" aria-hidden="true" />
            {t('viewDocuments')}
          </Link>
        </div>
      </div>
    </article>
  );
}
