/**
 * RangeSlider — generic dual-thumb range input primitive.
 *
 * Renders two overlapping range inputs that together select a min–max
 * interval. Thumb positions are computed by percentage for the highlight track.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 §Component map
 */

'use client';

import * as React from 'react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step?: number;
  onChange: (min: number, max: number) => void;
  formatValue?: (n: number) => string;
  label: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  step = 1,
  onChange,
  formatValue,
  label,
  className,
}: RangeSliderProps) {
  const range = max - min;
  const leftPct = range > 0 ? ((valueMin - min) / range) * 100 : 0;
  const rightPct = range > 0 ? ((valueMax - min) / range) * 100 : 100;

  function handleMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newMin = Math.min(Number(e.target.value), valueMax - step);
    onChange(newMin, valueMax);
  }

  function handleMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newMax = Math.max(Number(e.target.value), valueMin + step);
    onChange(valueMin, newMax);
  }

  const displayMin = formatValue ? formatValue(valueMin) : String(valueMin);
  const displayMax = formatValue ? formatValue(valueMax) : String(valueMax);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Labels */}
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs text-ink-muted">{displayMin}</span>
        <span className="font-mono text-xs text-ink-muted">{displayMax}</span>
      </div>

      {/* Track + thumbs */}
      <div className="relative h-1.5">
        {/* Base track */}
        <div className="absolute inset-0 rounded-full bg-line" />

        {/* Highlight track */}
        <div
          className="absolute h-full rounded-full bg-accent"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          aria-hidden="true"
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={handleMinChange}
          aria-label={`${label} minimum`}
          className={cn(
            'absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer',
            'pointer-events-none',
            '[&::-webkit-slider-thumb]:pointer-events-auto',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink-primary',
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg-paper',
            '[&::-webkit-slider-thumb]:shadow-sm',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:pointer-events-auto',
            '[&::-moz-range-thumb]:appearance-none',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-ink-primary',
            '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-bg-paper',
          )}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={handleMaxChange}
          aria-label={`${label} maximum`}
          className={cn(
            'absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer',
            'pointer-events-none',
            '[&::-webkit-slider-thumb]:pointer-events-auto',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink-primary',
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg-paper',
            '[&::-webkit-slider-thumb]:shadow-sm',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:pointer-events-auto',
            '[&::-moz-range-thumb]:appearance-none',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-ink-primary',
            '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-bg-paper',
          )}
        />
      </div>
    </div>
  );
}
