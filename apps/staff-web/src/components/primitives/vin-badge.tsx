'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VinBadgeProps {
  vin: string;
  /** If true, shows first 9 + last 4 characters with dots in the middle */
  masked?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VinBadge({ vin, masked = false, size = 'md', className }: VinBadgeProps) {
  const [copied, setCopied] = useState(false);

  const displayVin = masked ? maskVin(vin) : vin;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(vin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silent fail
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md bg-bg-subtle px-2 py-1',
        className,
      )}
    >
      <span
        className={cn(
          'font-mono tabular-nums text-ink-primary',
          size === 'sm' ? 'text-[11px]' : 'text-[13px]',
        )}
      >
        {displayVin}
      </span>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'VIN copied' : 'Copy VIN'}
        className={cn(
          'shrink-0 rounded p-0.5 transition-colors',
          'text-ink-muted hover:text-ink-primary focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        )}
      >
        {copied ? (
          <Check
            className={cn('text-success', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
            aria-hidden="true"
          />
        ) : (
          <Copy
            className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
            aria-hidden="true"
          />
        )}
      </button>
    </span>
  );
}
