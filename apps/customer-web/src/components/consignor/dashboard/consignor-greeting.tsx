'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { Customer } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsignorGreetingProps {
  customer: Customer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConsignorGreeting({ customer }: ConsignorGreetingProps) {
  const t = useTranslations('portal.consignor.dashboard');

  return (
    <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-8">
          {/* Mono eyebrow label */}
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
            {t('eyebrow')}
          </p>

          {/* Greeting */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-[var(--color-ink)] leading-[1.1] mb-4">
            {t('greeting', { name: customer.name })}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-xl mt-4">
            {t('greetingSubtitle')}
          </p>
        </div>

        {/* Member meta */}
        <div className="col-span-12 md:col-span-4 flex flex-col justify-end items-end gap-1 text-right">
          <span className="font-mono text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest">
            {t('eyebrow')}
          </span>
          <span className="font-mono text-sm text-[var(--color-ink)] uppercase tracking-wide">
            {customer.avatar}
          </span>
        </div>
      </div>

      {/* Hairline divider */}
      <div className="mt-8 border-t border-[var(--color-line)]" />
    </header>
  );
}
