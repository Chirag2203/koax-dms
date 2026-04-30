/**
 * MultiCheckFacet — checkbox group for multi-select filter facets.
 *
 * Used for Fuel, Body Type, and other multi-select facets.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L3, S2, S3
 */

'use client';

import * as React from 'react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MultiCheckOption {
  value: string;
  label: string;
}

export interface MultiCheckFacetProps {
  options: MultiCheckOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MultiCheckFacet({
  options,
  selected,
  onChange,
  className,
}: MultiCheckFacetProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <ul className={cn('space-y-2', className)} role="group">
      {options.map(({ value, label }) => {
        const isChecked = selected.includes(value);
        return (
          <li key={value}>
            <label
              className={cn(
                'flex items-center gap-3 cursor-pointer select-none',
                'font-mono text-xs uppercase tracking-widest',
                'transition-colors',
                isChecked ? 'text-accent' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                  'transition-colors',
                  isChecked
                    ? 'border-accent bg-accent'
                    : 'border-line bg-transparent',
                )}
              >
                {isChecked && (
                  <svg
                    viewBox="0 0 10 8"
                    fill="none"
                    className="h-2 w-2"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={isChecked}
                onChange={() => toggle(value)}
                value={value}
              />
              {label}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
