'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Language = 'en-IN' | 'hi-IN';
export type OutletCity = 'bangalore' | 'mumbai' | 'chennai';

export interface RegionSectionProps {
  language: Language;
  preferredOutlet: OutletCity;
  onLanguageChange: (lang: Language) => void;
  onOutletChange: (city: OutletCity) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegionSection({
  language,
  preferredOutlet,
  onLanguageChange,
  onOutletChange,
}: RegionSectionProps) {
  const t = useTranslations('portal.preferences');

  return (
    <section className="mb-12">
      <h2 className="font-display text-xl text-[var(--color-ink)] mb-6">
        {t('region')}
      </h2>

      <div className="space-y-8">
        {/* Language */}
        <div>
          <p className="font-sans text-base font-medium text-[var(--color-ink)] mb-3">
            {t('language')}
          </p>
          <div className="flex items-center gap-3 flex-wrap" role="radiogroup" aria-label={t('language')}>
            {(
              [
                { value: 'en-IN', label: t('english') },
                { value: 'hi-IN', label: t('hindi') },
              ] as { value: Language; label: string }[]
            ).map(({ value, label }) => {
              const isSelected = language === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onLanguageChange(value)}
                  className={[
                    'px-5 py-2 font-mono text-xs uppercase tracking-widest transition-colors rounded-full',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
                    isSelected
                      ? 'bg-[var(--color-accent,var(--color-brass))] text-white'
                      : 'border border-[var(--color-line)] text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred outlet */}
        <div>
          <label
            htmlFor="preferred-outlet"
            className="font-sans text-base font-medium text-[var(--color-ink)] block mb-3"
          >
            {t('preferredOutlet')}
          </label>
          <select
            id="preferred-outlet"
            value={preferredOutlet}
            onChange={(e) => onOutletChange(e.target.value as OutletCity)}
            className={[
              'w-full max-w-xs px-4 py-2.5 border border-[var(--color-line)] bg-[var(--color-bg-paper,#fefcf6)]',
              'text-sm text-[var(--color-ink)] font-sans',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
              'appearance-none cursor-pointer',
            ].join(' ')}
            aria-label={t('preferredOutlet')}
          >
            <option value="bangalore">Bangalore</option>
            <option value="mumbai">Mumbai</option>
            <option value="chennai">Chennai</option>
          </select>
        </div>
      </div>
    </section>
  );
}
