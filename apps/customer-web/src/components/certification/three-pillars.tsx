'use client';

import * as React from 'react';
import { Wrench, Palette, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pillar {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  items: string[];
}

// ─── Pillar card ──────────────────────────────────────────────────────────────

function PillarCard({
  icon,
  title,
  description,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="flex flex-col">
      {/* Icon */}
      <span className="text-accent mb-6" aria-hidden="true">
        {icon}
      </span>

      {/* Title */}
      <h3 className="font-display text-2xl tracking-tight text-ink-primary mb-4">
        {title}
      </h3>

      {/* Description */}
      <p className="font-sans text-sm text-ink-secondary leading-relaxed mb-8">
        {description}
      </p>

      {/* Checklist items */}
      <ul className="space-y-3 mt-auto">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="font-mono text-[10px] text-accent pt-0.5 shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-sans text-sm text-ink-muted leading-snug">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ThreePillars() {
  const t = useTranslations('certification');

  return (
    <section className="bg-bg-subtle px-6 md:px-12 lg:px-24 py-20 md:py-32">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-16">
          <h2
            className={cn(
              'font-display text-3xl md:text-4xl tracking-[-0.03em] text-ink-primary',
            )}
          >
            {t('pillarsTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          <PillarCard
            icon={<Wrench className="h-8 w-8" strokeWidth={1.5} />}
            title={t('pillar1Title')}
            description={t('pillar1Desc')}
            items={[t('pillar1Item1'), t('pillar1Item2'), t('pillar1Item3'), t('pillar1Item4')]}
          />
          <PillarCard
            icon={<Palette className="h-8 w-8" strokeWidth={1.5} />}
            title={t('pillar2Title')}
            description={t('pillar2Desc')}
            items={[t('pillar2Item1'), t('pillar2Item2'), t('pillar2Item3'), t('pillar2Item4')]}
          />
          <PillarCard
            icon={<FileText className="h-8 w-8" strokeWidth={1.5} />}
            title={t('pillar3Title')}
            description={t('pillar3Desc')}
            items={[t('pillar3Item1'), t('pillar3Item2'), t('pillar3Item3'), t('pillar3Item4')]}
          />
        </div>
      </div>
    </section>
  );
}
