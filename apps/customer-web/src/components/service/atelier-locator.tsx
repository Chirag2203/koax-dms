'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { Outlet } from '@dms/types';

// ─── City config ──────────────────────────────────────────────────────────────

type City = 'bangalore' | 'mumbai' | 'chennai';

const CITIES: { id: City; label: string; code: string }[] = [
  { id: 'bangalore', label: 'Bangalore', code: 'KA' },
  { id: 'mumbai', label: 'Mumbai', code: 'MH' },
  { id: 'chennai', label: 'Chennai', code: 'TN' },
];

// ─── Atelier Locator ──────────────────────────────────────────────────────────

interface AtelierLocatorProps {
  outlets: Outlet[];
}

export function AtelierLocator({ outlets }: AtelierLocatorProps) {
  const t = useTranslations('service');
  const [activeCity, setActiveCity] = React.useState<City>('bangalore');

  const activeOutlet = outlets.find((o) => o.city === activeCity);

  return (
    <section
      aria-label="Atelier location"
      className="px-6 py-16 md:px-12 md:py-20 lg:px-24"
    >
      <div className="mb-12 flex items-end justify-between">
        <h2 className="font-display text-3xl md:text-4xl">
          {t('atelier.heading')}
        </h2>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted opacity-60">
          {t('atelier.step')}
        </span>
      </div>

      {/* City tabs */}
      <div className="mb-8 flex flex-wrap gap-3">
        {CITIES.map(({ id, label, code }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveCity(id)}
            className={cn(
              'rounded-full px-5 py-2',
              'font-mono text-xs uppercase tracking-widest',
              'border transition-colors motion-safe:duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              activeCity === id
                ? 'border-accent bg-accent text-white'
                : 'border-line text-ink-secondary hover:border-line-strong hover:text-ink-primary',
            )}
            aria-pressed={activeCity === id}
            aria-label={`Select ${label}`}
          >
            <span className="mr-1 opacity-50">{code}</span> {label}
          </button>
        ))}
      </div>

      {/* Outlet info */}
      {activeOutlet && (
        <div
          key={activeOutlet.id}
          className="rounded-sm border border-line bg-bg-elevated p-6 md:grid md:grid-cols-3 md:gap-8"
        >
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {t('atelier.address')}
            </p>
            <p className="text-sm leading-relaxed text-ink-primary">
              {activeOutlet.address}
            </p>
          </div>
          <div className="mt-6 md:mt-0">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {t('atelier.phone')}
            </p>
            <a
              href={`tel:${activeOutlet.phone}`}
              className="text-sm text-ink-primary hover:text-accent transition-colors"
            >
              {activeOutlet.phone}
            </a>
          </div>
          <div className="mt-6 md:mt-0">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {t('atelier.hours')}
            </p>
            <p className="text-sm text-ink-primary">
              {t('atelier.weekday')}: {activeOutlet.openingHours.weekday}
            </p>
            <p className="text-sm text-ink-primary">
              {t('atelier.saturday')}: {activeOutlet.openingHours.saturday}
            </p>
            <p className="text-sm text-ink-primary">
              {t('atelier.sunday')}: {activeOutlet.openingHours.sunday}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
