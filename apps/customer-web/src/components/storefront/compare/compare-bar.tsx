/**
 * CompareBar — sticky bottom bar showing selected vehicles and a Compare CTA.
 *
 * Visible when ≥1 vehicle is selected. Hidden when 0 selected.
 * Navigates to /inventory/compare?vins=VIN1,VIN2,VIN3 on "Compare" click.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L4, L12, S8, S9
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X, ArrowRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';
import { PriceDisplay } from '@/src/components/price-display';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompareBarProps {
  selectedVins: string[];
  vehicles: Vehicle[];
  onRemove: (vin: string) => void;
  onClear: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompareBar({
  selectedVins,
  vehicles,
  onRemove,
  onClear,
}: CompareBarProps) {
  const t = useTranslations('inventory');
  const router = useRouter();

  if (selectedVins.length === 0) return null;

  const selectedVehicles = selectedVins
    .map((vin) => vehicles.find((v) => v.vin === vin))
    .filter((v): v is Vehicle => v !== undefined);

  function handleCompare() {
    router.push(`/inventory/compare?vins=${selectedVins.join(',')}`);
  }

  // Slots — always show 3, with empty placeholders
  const slots: (Vehicle | null)[] = [
    selectedVehicles[0] ?? null,
    selectedVehicles[1] ?? null,
    selectedVehicles[2] ?? null,
  ];

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-bg-paper border-t border-line shadow-2xl',
        'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-300',
      )}
      role="region"
      aria-label={t('compareBarLabel')}
    >
      <div className="mx-auto max-w-[1440px] px-6 md:px-12 lg:px-24 py-4">
        <div className="flex items-center gap-4 overflow-x-auto">
          {/* Vehicle slots */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {slots.map((vehicle, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 rounded-sm border p-2.5',
                  'min-w-[200px] max-w-[240px]',
                  vehicle ? 'border-line bg-bg-subtle' : 'border-dashed border-line/40',
                )}
              >
                {vehicle ? (
                  <>
                    {/* Thumbnail */}
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-bg-subtle">
                      {vehicle.images[0] ? (
                        <Image
                          src={vehicle.images[0].url}
                          alt={vehicle.images[0].alt}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-line" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-ink-muted truncate">
                        {vehicle.year} {vehicle.make}
                      </p>
                      <p className="text-sm font-medium text-ink-primary truncate">
                        {vehicle.model}
                      </p>
                      <PriceDisplay amount={vehicle.price} size="sm" />
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => onRemove(vehicle.vin)}
                      aria-label={`Remove ${vehicle.make} ${vehicle.model} from compare`}
                      className="shrink-0 text-ink-muted hover:text-ink-primary transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-1">
                    <span className="font-mono text-xs text-ink-muted/40 uppercase tracking-widest">
                      {t('compareSlotEmpty')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClear}
              className="font-mono text-xs text-ink-muted hover:text-ink-primary underline underline-offset-2 transition-colors"
            >
              {t('compareReset')}
            </button>
            <button
              onClick={handleCompare}
              disabled={selectedVins.length < 2}
              className={cn(
                'flex items-center gap-2 rounded-sm px-5 py-2.5',
                'font-mono text-xs uppercase tracking-widest',
                'transition-colors',
                selectedVins.length >= 2
                  ? 'bg-ink-primary text-bg-paper hover:bg-ink-primary/90'
                  : 'bg-ink-primary/30 text-bg-paper/50 cursor-not-allowed',
              )}
            >
              {t('compareNow')} ({selectedVins.length})
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
