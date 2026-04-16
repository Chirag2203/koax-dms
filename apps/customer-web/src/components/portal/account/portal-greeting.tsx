'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortalGreetingProps {
  customer: Customer;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

function formatMemberSince(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

const CITY_LABELS: Record<string, string> = {
  bangalore: 'BANGALORE',
  mumbai: 'MUMBAI',
  chennai: 'CHENNAI',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PortalGreeting({ customer }: PortalGreetingProps) {
  const t = useTranslations('portal.account');
  const greeting = getGreeting();
  const cityLabel = CITY_LABELS[customer.preferredCity] ?? customer.preferredCity.toUpperCase();
  const memberSince = formatMemberSince(customer.memberSince);

  return (
    <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-8">
          {/* Mono member label */}
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent mb-4">
            {t('memberLabel', {
              city: cityLabel,
              since: memberSince,
            })}
          </p>

          {/* Time-based greeting */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-ink-primary leading-[1.1] mb-4">
            {t(`greeting.${greeting}`, { name: customer.name })}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-ink-secondary leading-relaxed max-w-xl mt-4">
            {t('greetingSubtitle')}
          </p>
        </div>

        {/* Last login meta */}
        <div className="col-span-12 md:col-span-4 flex flex-col justify-end items-end gap-1 text-right">
          <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">
            {t('memberAccount')}
          </span>
          <span className="font-mono text-sm text-ink-primary uppercase tracking-wide">
            {customer.avatar}
          </span>
        </div>
      </div>

      {/* Hairline divider */}
      <div className="mt-8 border-t border-line" />
    </header>
  );
}
