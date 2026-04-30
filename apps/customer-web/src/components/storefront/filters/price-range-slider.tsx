/**
 * PriceRangeSlider — dual-thumb range slider for price in Indian rupees.
 *
 * Displays ₹5 Lakh – ₹2 Crore range.
 * Formats display values in lakh/crore notation for Indian readability.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L2, S1
 */

'use client';

import * as React from 'react';
import { RangeSlider } from './range-slider';
import { PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT } from '@/src/lib/storefront/use-filters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceRangeSliderProps {
  valueMin: number | null;
  valueMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
  className?: string;
}

// ─── Formatter ────────────────────────────────────────────────────────────────

/**
 * Format rupee amount in Indian lakh/crore shorthand.
 * e.g. 500000 → "₹5L", 15000000 → "₹1.5Cr"
 */
export function formatRupeeShort(amount: number): string {
  if (amount >= 10_000_000) {
    const crores = amount / 10_000_000;
    return `₹${crores % 1 === 0 ? crores : crores.toFixed(1)}Cr`;
  }
  if (amount >= 100_000) {
    const lakhs = amount / 100_000;
    return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)}L`;
  }
  return `₹${new Intl.NumberFormat('en-IN').format(amount)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceRangeSlider({
  valueMin,
  valueMax,
  onChange,
  className,
}: PriceRangeSliderProps) {
  const effectiveMin = valueMin ?? PRICE_MIN_DEFAULT;
  const effectiveMax = valueMax ?? PRICE_MAX_DEFAULT;

  function handleChange(newMin: number, newMax: number) {
    const minChanged = newMin !== PRICE_MIN_DEFAULT;
    const maxChanged = newMax !== PRICE_MAX_DEFAULT;
    onChange(minChanged ? newMin : null, maxChanged ? newMax : null);
  }

  return (
    <RangeSlider
      min={PRICE_MIN_DEFAULT}
      max={PRICE_MAX_DEFAULT}
      step={100_000} // ₹1 Lakh steps
      valueMin={effectiveMin}
      valueMax={effectiveMax}
      onChange={handleChange}
      formatValue={formatRupeeShort}
      label="Price"
      className={className}
    />
  );
}
