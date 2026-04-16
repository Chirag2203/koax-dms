'use client';
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// ─── Services Band ────────────────────────────────────────────────────────────

interface ServiceCardProps {
  title: string;
  description: string;
  href: string;
  learnMore: string;
}

function ServiceCard({ title, description, href, learnMore }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-[400px] cursor-pointer flex-col justify-between bg-[#0A0908] p-12 transition-colors hover:bg-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      aria-label={title}
    >
      <h3 className="font-display text-[56px] leading-none text-white opacity-40 transition-opacity group-hover:opacity-100 md:text-[64px] lg:text-[72px]">
        {title}
      </h3>
      <div className="flex items-end justify-between">
        <p className="max-w-[200px] text-sm leading-relaxed text-stone-500">
          {description}
        </p>
        <span className="font-mono text-xs uppercase tracking-widest text-accent">
          {learnMore} →
        </span>
      </div>
    </Link>
  );
}

export function ServicesBand() {
  const t = useTranslations('services');

  const services: ServiceCardProps[] = [
    {
      title: t('maintenance.title'),
      description: t('maintenance.description'),
      href: '/service',
      learnMore: t('learnMore'),
    },
    {
      title: t('inspection.title'),
      description: t('inspection.description'),
      href: '/certification',
      learnMore: t('learnMore'),
    },
    {
      title: t('sell.title'),
      description: t('sell.description'),
      href: '/sell',
      learnMore: t('learnMore'),
    },
  ];

  return (
    <section
      aria-label="Our services"
      className="bg-[#0A0908] px-6 py-20 md:px-12 md:py-32 lg:px-24"
    >
      <div className="grid grid-cols-1 gap-px bg-stone-800 md:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.href} {...service} />
        ))}
      </div>
    </section>
  );
}
