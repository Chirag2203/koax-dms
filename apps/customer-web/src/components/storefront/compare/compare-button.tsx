/**
 * CompareButton — per-card toggle to add/remove a vehicle from the compare tray.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L4, L12, S8, S9
 */

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { GitCompare } from 'lucide-react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompareButtonProps {
  vin: string;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (vin: string) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompareButton({
  vin,
  isSelected,
  isDisabled,
  onToggle,
  className,
}: CompareButtonProps) {
  const t = useTranslations('inventory');

  return (
    <button
      type="button"
      onClick={() => onToggle(vin)}
      disabled={isDisabled && !isSelected}
      aria-pressed={isSelected}
      aria-label={isSelected ? t('compareRemove') : t('compareAdd')}
      title={
        isDisabled && !isSelected ? t('compareMax') : undefined
      }
      className={cn(
        'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5',
        'font-mono text-xs uppercase tracking-widest transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        isSelected
          ? 'border-accent bg-accent/10 text-accent'
          : isDisabled
          ? 'cursor-not-allowed border-line text-ink-muted/40'
          : 'border-line text-ink-muted hover:border-accent hover:text-accent',
        className,
      )}
    >
      <GitCompare size={11} aria-hidden="true" />
      {isSelected ? t('compareSelected') : t('compareAdd')}
    </button>
  );
}
