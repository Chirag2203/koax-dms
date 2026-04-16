'use client';

import * as React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreferenceToggleProps {
  id: string;
  label: string;
  description: string;
  consentText: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PreferenceToggle({
  id,
  label,
  description,
  consentText,
  checked,
  onChange,
}: PreferenceToggleProps) {
  return (
    <div className="py-6 border-b border-[var(--color-line)] last:border-0">
      <div className="flex items-start justify-between gap-6">
        {/* Label + description */}
        <div className="flex-1 min-w-0">
          <label
            htmlFor={id}
            className="font-sans text-base font-medium text-[var(--color-ink)] cursor-pointer select-none"
          >
            {label}
          </label>
          <p className="text-sm text-[var(--color-ink-secondary)] mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Toggle switch */}
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 mt-0.5 transition-colors duration-200',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
            checked
              ? 'bg-[var(--color-accent,var(--color-brass))]'
              : 'bg-[var(--color-line)]',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
              checked ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* DPDP consent text */}
      <p className="font-mono text-[10px] text-[var(--color-ink-muted)] mt-3 leading-relaxed max-w-lg">
        {consentText}
      </p>
    </div>
  );
}
