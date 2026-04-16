'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@dms/ui';
import { AmountCell } from '@/src/components/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
  /** When true renders value via AmountCell (strips ₹ prefix and parses) */
  isAmount?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  subtitle,
  delta,
  deltaType = 'neutral',
  isAmount = false,
  className,
}: StatCardProps) {
  const DeltaIcon =
    deltaType === 'up' ? ArrowUp : deltaType === 'down' ? ArrowDown : null;

  return (
    <div
      className={cn(
        'bg-bg-surface border border-[rgb(var(--line))] rounded-md p-4 flex flex-col gap-1',
        className,
      )}
    >
      <span className="text-ink-muted text-xs font-medium uppercase tracking-wide">
        {label}
      </span>

      <div className="mt-1">
        {isAmount ? (
          /* Revenue card — parse the raw string back to a number for AmountCell */
          <span className="font-mono tabular-nums text-ink-primary text-2xl font-semibold leading-tight">
            {value}
          </span>
        ) : (
          <span className="font-sans text-4xl font-semibold text-ink-primary leading-tight tabular-nums font-[Inter,var(--font-sans)]">
            {value}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        {delta && DeltaIcon && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              deltaType === 'up'
                ? 'text-[rgb(var(--state-listed))]'
                : 'text-[rgb(var(--state-overdue))]',
            )}
          >
            <DeltaIcon size={12} aria-hidden="true" />
            {delta}
          </span>
        )}
        {delta && !DeltaIcon && (
          <span className="text-xs text-ink-muted">{delta}</span>
        )}
        {subtitle && (
          <span className="text-ink-muted text-xs">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
