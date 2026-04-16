'use client';

import * as React from 'react';
import { Wrench, Search, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ServiceType } from '@dms/types';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  wrench: Wrench,
  'shield-check': Search,
  sparkles: Sparkles,
};

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatIndianPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

// ─── Single card ──────────────────────────────────────────────────────────────

interface ServiceCardProps {
  service: ServiceType;
  bookNow: string;
}

function ServiceCard({ service, bookNow }: ServiceCardProps) {
  const Icon = ICON_MAP[service.icon] ?? Wrench;

  return (
    <div className="group relative overflow-hidden rounded-sm border border-line bg-bg-elevated p-6 transition-colors hover:bg-bg-hover">
      <div className="relative z-10">
        <Icon
          className="mb-6 h-7 w-7 text-accent"
          aria-hidden="true"
        />
        <h3 className="mb-2 font-display text-xl">{service.name}</h3>
        <p className="mb-6 text-sm leading-relaxed text-ink-secondary">
          {service.description}
        </p>
        <div className="mb-4 font-mono text-sm text-accent">
          ₹{formatIndianPrice(service.priceRange.min)} – ₹{formatIndianPrice(service.priceRange.max)}
        </div>
        <a
          href="#service-booking"
          className="font-mono text-xs uppercase tracking-widest text-ink-secondary transition-colors hover:text-accent"
        >
          {bookNow} →
        </a>
      </div>
    </div>
  );
}

// ─── Service Type Cards section ───────────────────────────────────────────────

interface ServiceTypeCardsProps {
  services: ServiceType[];
}

export function ServiceTypeCards({ services }: ServiceTypeCardsProps) {
  const t = useTranslations('service');

  // Show only the first 3 services
  const displayed = services.slice(0, 3);

  return (
    <section
      aria-label="Service types"
      className="px-6 py-16 md:px-12 md:py-20 lg:px-24"
    >
      <div className="mb-12 flex items-end justify-between">
        <h2 className="font-display text-3xl md:text-4xl">
          {t('serviceTypes.heading')}
        </h2>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted opacity-60">
          {t('serviceTypes.step')}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {displayed.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            bookNow={t('serviceTypes.bookNow')}
          />
        ))}
      </div>
    </section>
  );
}
