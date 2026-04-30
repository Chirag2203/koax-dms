/**
 * ColorSwatchPicker — color swatch grid for color facet filter.
 *
 * Derives approximate CSS colours from colour name strings. Unknown colours
 * fall back to a neutral swatch. Selection is case-insensitive partial match.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L11, S18
 */

'use client';

import * as React from 'react';
import { cn } from '@dms/ui';

// ─── Color map ────────────────────────────────────────────────────────────────

/**
 * Map of lowercase color name fragment → CSS hex.
 * Designed to cover the typical luxury vehicle palette.
 * Unknown names fall back to a neutral grey swatch.
 */
const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a',
  white: '#f5f5f0',
  silver: '#c0c0c0',
  grey: '#808080',
  gray: '#808080',
  blue: '#1e3a5f',
  red: '#8b1a1a',
  green: '#1a3a2a',
  brown: '#5c3a1e',
  gold: '#b8960c',
  beige: '#c8b89a',
  orange: '#c85a1e',
  yellow: '#c8b41e',
  purple: '#4a1a6e',
  burgundy: '#6e1a2a',
  bronze: '#8c5a2a',
  champagne: '#d4bc8a',
  graphite: '#4a4a4a',
  pearl: '#e8e4d4',
  crayon: '#d4c8b4',
  'agate grey': '#8a8a8a',
  'dark blue': '#0a1a3a',
  'night blue': '#0a1428',
  'racing red': '#9e1a1a',
  manhattan: '#c8a06a',
};

function colorNameToHex(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return hex;
  }
  return '#6b6b6b'; // fallback neutral
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColorOption {
  value: string; // The color name as it appears on the vehicle fixture
  label: string; // Display label
}

export interface ColorSwatchPickerProps {
  options: ColorOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ColorSwatchPicker({
  options,
  selected,
  onChange,
  className,
}: ColorSwatchPickerProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      role="group"
      aria-label="Select colour"
    >
      {options.map(({ value, label }) => {
        const isSelected = selected.includes(value);
        const hex = colorNameToHex(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            title={label}
            aria-label={`${isSelected ? 'Remove' : 'Select'} colour: ${label}`}
            aria-pressed={isSelected}
            className={cn(
              'relative h-7 w-7 rounded-full transition-transform',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'focus-visible:ring-offset-bg-paper',
              isSelected && 'ring-2 ring-accent ring-offset-1 ring-offset-bg-paper scale-110',
              !isSelected && 'hover:scale-105',
            )}
            style={{ backgroundColor: hex }}
          >
            {isSelected && (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="absolute inset-0 m-auto h-3 w-3"
                aria-hidden="true"
              >
                <path
                  d="M3 8l3 3 7-7"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Extract unique color values from a list of vehicles.
 * Returns a deduplicated, sorted list of ColorOption objects.
 */
export function buildColorOptions(colors: string[]): ColorOption[] {
  const unique = [...new Set(colors)].sort();
  return unique.map((c) => ({ value: c, label: c }));
}
