'use client';

import * as React from 'react';
import { Wrench, Palette, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MECHANICAL_ITEMS = [
  'Engine compression & leakage test',
  'Transmission shift quality & fluid spectral analysis',
  'Suspension geometry and bushing elasticity measurement',
  'Brake system integrity — pad depth, rotor trueness, bias',
  'Electrical systems diagnostic — fault code sweep',
  'Cooling system pressure test and thermostat validation',
  'Fuel system pressure and injector balance check',
  'Battery state-of-health and charging circuit analysis',
];

const COSMETIC_ITEMS = [
  'Paint depth consistency verification — every panel measured',
  'Interior leather and stitch integrity — seat bolsters, headlining',
  'UV damage assessment on leather, wood trim, and plastics',
  'High-definition undercarriage scanning — rust, impact, corrosion',
  'Glass and optics inspection — chips, delamination, seal integrity',
  'Chrome and trim assessment — plating depth, adhesion',
  'Wheel surface and structural integrity — run-out check',
  'Convertible / sunroof mechanism and seal inspection',
];

const DOCUMENTATION_ITEMS = [
  'Service record authenticity audit — digital and physical',
  'RTO / Title clearance and encumbrance verification',
  'Insurance claim history review via national aggregators',
  'Odometer verification — digital tamper check and physical wear correlation',
  'Previous owner documentation and chain of title',
  'Warranty transfer eligibility and OEM status confirmation',
  'Recall and campaign compliance check',
  'Import and regulatory compliance audit — homologation',
];

// ─── Checklist column ─────────────────────────────────────────────────────────

function ChecklistColumn({
  icon,
  label,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#4ade80]" aria-hidden="true">
          {icon}
        </span>
        <h4 className="font-mono text-[11px] uppercase tracking-widest text-white">
          {label}
        </h4>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="font-mono text-[#4ade80] mt-0.5 shrink-0 text-xs">/</span>
            <span className="font-sans text-sm text-white/50 leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InspectionProcess() {
  const t = useTranslations('certification');

  return (
    <section className="bg-[#002114] text-white px-6 md:px-12 lg:px-24 py-20 md:py-32 relative overflow-hidden">

      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: '256px 256px',
        }}
      />

      <div className="max-w-[1440px] mx-auto relative z-10">

        {/* Header */}
        <div className="mb-16 md:mb-20 max-w-2xl">
          <h2
            className={cn(
              'font-display text-3xl md:text-4xl tracking-[-0.03em] text-white mb-4',
            )}
          >
            {t('processTitle')}
          </h2>
          <p className="font-sans text-sm text-white/50 leading-relaxed">
            {t('processSubtitle')}
          </p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          <ChecklistColumn
            icon={<Wrench className="h-5 w-5" strokeWidth={1.5} />}
            label={t('processItems.mechanical')}
            items={MECHANICAL_ITEMS}
          />
          <ChecklistColumn
            icon={<Palette className="h-5 w-5" strokeWidth={1.5} />}
            label={t('processItems.cosmetic')}
            items={COSMETIC_ITEMS}
          />
          <ChecklistColumn
            icon={<FileText className="h-5 w-5" strokeWidth={1.5} />}
            label={t('processItems.documentation')}
            items={DOCUMENTATION_ITEMS}
          />
        </div>

      </div>
    </section>
  );
}
