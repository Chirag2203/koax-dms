'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';
import { PriceDisplay } from '../price-display';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VdpTitleBlockProps {
  vehicle: Vehicle;
  className?: string;
}

// ─── Toast (lightweight) ─────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskVin(vin: string): string {
  const last4 = vin.slice(-4);
  return `${vin.slice(0, 9)}${'\u2022'.repeat(4)}${last4}`;
}

function formatKmIndian(km: number): string {
  return new Intl.NumberFormat('en-IN').format(km);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VdpTitleBlock({ vehicle, className }: VdpTitleBlockProps) {
  const t = useTranslations('vdp');
  const { message, show } = useToast();

  const titleLine = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}`;

  function handleReserve() {
    show(t('reserve.success'));
  }

  function handleSchedule() {
    show(t('reserve.bookingSuccess'));
  }

  return (
    <section
      id="vehicle-details"
      className={cn(
        'bg-[#1e1b1a] text-white px-6 md:px-12 lg:px-24 py-16 md:py-24',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto">
        {/* Metadata row — moved from gallery sidebar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 font-mono text-[11px] uppercase tracking-widest text-stone-500">
          <span>{maskVin(vehicle.vin)}</span>
          <span className="w-1 h-1 bg-stone-700 rounded-full" aria-hidden="true" />
          <span>{formatKmIndian(vehicle.km)} KM</span>
          <span className="w-1 h-1 bg-stone-700 rounded-full" aria-hidden="true" />
          <span>{capitalise(vehicle.city)}</span>
          {vehicle.isCertified && (
            <>
              <span className="w-1 h-1 bg-stone-700 rounded-full" aria-hidden="true" />
              <span className="text-accent">CPO Certified</span>
            </>
          )}
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
          {/* Left — title + descriptors */}
          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-[56px] lg:text-[88px] leading-[0.95] tracking-[-0.04em] mb-6">
              {titleLine}
            </h1>
            <p className="text-lg text-stone-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              {[vehicle.variant, vehicle.color, vehicle.interiorColor,
                `${vehicle.previousOwners} owner${vehicle.previousOwners !== 1 ? 's' : ''}`]
                .filter(Boolean)
                .map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="w-1 h-1 bg-stone-600 rounded-full inline-block" aria-hidden="true" />
                    )}
                    {part}
                  </React.Fragment>
                ))}
            </p>
          </div>

          {/* Right — price + CTAs */}
          <div className="flex flex-col items-start lg:items-end gap-8">
            <div className="flex flex-col items-start lg:items-end gap-2">
              <PriceDisplay
                amount={vehicle.price}
                size="lg"
                className="font-display text-[40px] md:text-[56px] text-white tabular-nums"
              />
              <span className="font-mono text-[11px] text-stone-500">
                {t('price.gstCaption')}
              </span>
            </div>

            <div className="flex flex-col gap-4 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleReserve}
                className={cn(
                  'bg-accent text-white px-10 py-5 rounded-full',
                  'font-mono text-sm uppercase tracking-widest',
                  'flex items-center justify-between gap-8',
                  'hover:bg-accent-hover transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1b1a]',
                )}
              >
                {t('price.reserve')} &rarr;
              </button>

              <button
                type="button"
                onClick={handleSchedule}
                className={cn(
                  'border border-stone-700 text-stone-300 px-10 py-5 rounded-full',
                  'font-mono text-sm uppercase tracking-widest',
                  'hover:border-stone-400 hover:text-white transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1b1a]',
                )}
              >
                {t('price.scheduleViewing')}
              </button>

              <a
                href="#emi-calculator"
                className={cn(
                  'text-center font-mono text-[11px] uppercase tracking-widest text-stone-500',
                  'hover:text-accent transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {t('price.askFinancing')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-8 left-1/2 -translate-x-1/2 z-50',
            'bg-[#1e1b1a] border border-stone-700 text-white',
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
