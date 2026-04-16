'use client';

import * as React from 'react';
import { Shield, Wrench, Palette, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CertificationPanelProps {
  vehicle: Vehicle;
  className?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MECHANICAL_ITEMS = [
  'Engine compression & leakage test',
  'Transmission shift quality analysis',
  'Suspension & dynamic chassis control',
  'Brake system integrity',
  'Electrical systems diagnostic',
  'Cooling system pressure test',
];

const COSMETIC_ITEMS = [
  'Paint depth consistency verification',
  'Interior leather & stitch integrity',
  'Underbody cleaning & ceramic coating',
  'Glass & optics inspection',
  'Chrome & trim assessment',
  'Wheel & tyre detailed check',
];

const DOCUMENTATION_ITEMS = [
  'Service record authenticity audit',
  'RTO/Title clearance certification',
  'Insurance claim history review',
  'Odometer verification (digital + physical)',
  'Previous owner documentation',
  'Warranty transfer eligibility',
];

// ─── Checklist column ─────────────────────────────────────────────────────────

interface ChecklistColumnProps {
  icon: React.ReactNode;
  label: string;
  items: string[];
}

function ChecklistColumn({ icon, label, items }: ChecklistColumnProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-emerald-300">{icon}</span>
        <h4 className="font-mono text-[12px] uppercase tracking-widest text-white">
          {label}
        </h4>
      </div>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-emerald-300 font-mono mt-0.5 flex-shrink-0">/</span>
            <span className="text-stone-400 text-sm leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Toast helper ─────────────────────────────────────────────────────────────

function useToast() {
  const [message, setMessage] = React.useState<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(msg: string) {
    setMessage(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 4000);
  }

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { message, show };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CertificationPanel({ vehicle, className }: CertificationPanelProps) {
  const t = useTranslations('vdp.certification');
  const { message, show } = useToast();

  if (!vehicle.isCertified) return null;

  function handleDownload() {
    show('PDF download coming soon.');
  }

  return (
    <section
      className={cn(
        'bg-[#002114] text-white px-6 md:px-12 lg:px-24 py-16 md:py-24 overflow-hidden relative',
        className,
      )}
    >
      {/* Watermark shield */}
      <Shield
        aria-hidden="true"
        className="absolute right-0 top-0 opacity-10 pointer-events-none text-white"
        style={{ width: '300px', height: '300px' }}
        strokeWidth={0.5}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-20 gap-8">
          <div>
            <h2 className="font-display text-3xl md:text-[48px] tracking-[-0.04em] mb-4">
              {vehicle.certificationPoints}-{t('title').replace(/^\d+-/, '')}
            </h2>
            <p className="text-stone-400 max-w-xl text-sm md:text-base">
              {t('description')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className={cn(
              'bg-emerald-100 text-[#002114] px-6 md:px-8 py-3 md:py-4 rounded-sm',
              'font-mono text-xs uppercase tracking-widest',
              'hover:bg-white transition-colors flex-shrink-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
            )}
          >
            {t('downloadPdf')}
          </button>
        </div>

        {/* Three-column checklist grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          <ChecklistColumn
            icon={<Wrench className="h-5 w-5" />}
            label={t('mechanical')}
            items={MECHANICAL_ITEMS}
          />
          <ChecklistColumn
            icon={<Palette className="h-5 w-5" />}
            label={t('cosmetic')}
            items={COSMETIC_ITEMS}
          />
          <ChecklistColumn
            icon={<FileText className="h-5 w-5" />}
            label={t('documentation')}
            items={DOCUMENTATION_ITEMS}
          />
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-8 left-1/2 -translate-x-1/2 z-50',
            'bg-[#002114] border border-emerald-900 text-stone-200',
            'px-6 py-4 rounded-sm shadow-xl',
            'font-sans text-sm max-w-sm text-center',
          )}
        >
          {message}
        </div>
      )}
    </section>
  );
}
