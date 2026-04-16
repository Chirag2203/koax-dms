'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { Outlet } from '@dms/types';

// ─── Team member type ─────────────────────────────────────────────────────────

export interface TeamMember {
  name: string;
  role: string;
  photo: string;
}

// ─── City section props ───────────────────────────────────────────────────────

export interface CitySectionProps {
  outlet: Outlet;
  index: number; // 1-based
  tag: string;
  roleLabel: string;
  description: string;
  showroomPhoto: string;
  showroomAlt: string;
  team: TeamMember[];
  /** Alternates bg shade — even index gets bg-subtle */
  alternate?: boolean;
}

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div
      className={cn(
        'border border-line rounded-sm p-5',
        'bg-bg-elevated flex flex-col',
        'hover:border-line-strong motion-safe:transition-colors',
      )}
    >
      {/* Portrait */}
      <div className="aspect-square relative overflow-hidden rounded-sm mb-5 bg-bg-subtle">
        <Image
          src={member.photo}
          alt={member.name}
          fill
          sizes="(max-width: 768px) 50vw, 200px"
          className="object-cover grayscale hover:grayscale-0 motion-safe:transition-all motion-safe:duration-500"
        />
      </div>
      {/* Name + role */}
      <h4 className="font-display text-xl tracking-tight text-ink-primary mb-1">
        {member.name}
      </h4>
      <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
        {member.role}
      </span>
    </div>
  );
}

// ─── City section ─────────────────────────────────────────────────────────────

export function CitySection({
  outlet,
  index,
  tag,
  roleLabel,
  description,
  showroomPhoto,
  showroomAlt,
  team,
  alternate = false,
}: CitySectionProps) {
  const t = useTranslations('cities');

  const citySlug = outlet.city; // 'bangalore' | 'mumbai' | 'chennai'
  const cityName = outlet.city.charAt(0).toUpperCase() + outlet.city.slice(1);
  const padded = String(index).padStart(2, '0');

  return (
    <section
      className={cn(
        'px-6 md:px-12 lg:px-24 py-20 md:py-32',
        alternate ? 'bg-bg-subtle' : 'bg-bg-paper',
      )}
    >
      <div className="max-w-[1440px] mx-auto">

        {/* ── City headline row ── */}
        <div className="flex items-baseline justify-between mb-12 border-t border-line pt-10">
          <h2
            className={cn(
              'font-display text-4xl md:text-5xl tracking-[-0.03em] text-ink-primary',
            )}
          >
            {padded} — {cityName}
          </h2>
          <span className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-accent">
            {tag}
          </span>
        </div>

        {/* ── Two-column layout: photo + details ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-10 mb-20">

          {/* Left: showroom photo */}
          <div className="md:col-span-7 aspect-[16/10] relative overflow-hidden rounded-sm bg-bg-subtle">
            <Image
              src={showroomPhoto}
              alt={showroomAlt}
              fill
              sizes="(max-width: 768px) 100vw, 58vw"
              className="object-cover"
              priority={index === 1}
            />
          </div>

          {/* Right: details */}
          <div className="md:col-span-5 pt-8 md:pt-0 flex flex-col justify-between gap-8">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4 block">
                {roleLabel}
              </span>
              <p className="font-sans text-lg leading-relaxed text-ink-primary mb-8">
                {description}
              </p>

              {/* Address block */}
              <div className="border-t border-line pt-6 mb-6">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2 block">
                  Address
                </span>
                <address className="not-italic font-mono text-xs text-ink-secondary leading-relaxed">
                  {outlet.address}
                </address>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4 border-t border-line pt-6 mb-6">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2 block">
                    Phone
                  </span>
                  <a
                    href={`tel:${outlet.phone.replace(/\s/g, '')}`}
                    className="font-mono text-xs text-ink-primary hover:text-accent motion-safe:transition-colors"
                  >
                    {outlet.phone}
                  </a>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2 block">
                    Email
                  </span>
                  <a
                    href={`mailto:${outlet.email}`}
                    className="font-mono text-xs text-ink-primary hover:text-accent motion-safe:transition-colors break-all"
                  >
                    {outlet.email}
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-3 gap-4 border-t border-line pt-6 mb-6">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2 block">
                    {t('weekday')}
                  </span>
                  <p className="font-mono text-xs text-ink-secondary">
                    {outlet.openingHours.weekday}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2 block">
                    {t('saturday')}
                  </span>
                  <p className="font-mono text-xs text-ink-secondary">
                    {outlet.openingHours.saturday}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2 block">
                    {t('sunday')}
                  </span>
                  <p className="font-mono text-xs text-ink-secondary">
                    {outlet.openingHours.sunday}
                  </p>
                </div>
              </div>

              {/* Vehicle count */}
              <p className="font-mono text-xs text-ink-muted border-t border-line pt-5">
                <span className="text-accent font-medium">{outlet.vehicleCount}</span>
                {' '}{t('vehiclesLabel')}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/service"
                className={cn(
                  'inline-flex items-center justify-center gap-2',
                  'border border-ink-primary text-ink-primary rounded-full',
                  'px-6 py-3 font-mono text-[11px] uppercase tracking-widest',
                  'hover:bg-ink-primary hover:text-bg-paper',
                  'motion-safe:transition-all motion-safe:duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {t('bookVisit')} →
              </Link>
              <Link
                href={`/collection?city=${citySlug}`}
                className={cn(
                  'inline-flex items-center justify-center',
                  'font-mono text-[11px] uppercase tracking-widest text-accent',
                  'hover:text-accent-hover underline underline-offset-4',
                  'motion-safe:transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  'px-2 py-3',
                )}
              >
                {t('viewInventory')} →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Team row ── */}
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-8 block border-t border-line pt-8">
            {t('teamLabel')}
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {team.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
