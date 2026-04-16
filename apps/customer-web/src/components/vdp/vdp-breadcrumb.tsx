'use client';
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VdpBreadcrumbProps {
  vehicle: {
    make: string;
    model: string;
    year: number;
    bodyType: string;
    variant: string;
  };
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VdpBreadcrumb({ vehicle, className }: VdpBreadcrumbProps) {
  const t = useTranslations('vdp.breadcrumb');

  const currentLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toUpperCase();
  const bodyTypeLabel = capitalise(vehicle.bodyType) + 'S';

  return (
    <header
      className={cn(
        'bg-[#171413] pt-24 pb-4 px-6 md:px-12 lg:px-24',
        className,
      )}
    >
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]"
      >
        <Link
          href="/collection"
          className="text-stone-500 hover:text-stone-300 transition-colors"
        >
          {t('collection')}
        </Link>

        <span className="text-stone-700" aria-hidden="true">·</span>

        <Link
          href={`/collection?bodyType=${vehicle.bodyType}`}
          className="text-stone-500 hover:text-stone-300 transition-colors"
        >
          {bodyTypeLabel}
        </Link>

        <span className="text-stone-700" aria-hidden="true">·</span>

        <span className="text-stone-300" aria-current="page">
          {currentLabel}
        </span>
      </nav>
    </header>
  );
}
