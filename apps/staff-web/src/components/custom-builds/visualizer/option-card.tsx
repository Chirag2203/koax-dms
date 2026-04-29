/**
 * OptionCard — shared priced option card for all 3D customizers.
 *
 * L82: Displays name + description + ₹price + selected checkmark.
 * Stock option (₹0) always available + first.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L82
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@dms/ui';
import { formatINR } from '../shared/format-inr';

export interface OptionCardProps {
  id: string;
  name: string;
  brand?: string;
  price: number;
  description?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  /** Optional visual swatch rendered next to the name */
  swatch?: React.ReactNode;
  /** Warning label shown below description (e.g., "Track-only") */
  warningLabel?: string;
}

export function OptionCard({
  id,
  name,
  brand,
  price,
  description,
  isSelected,
  onSelect,
  swatch,
  warningLabel,
}: OptionCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={isSelected}
      aria-label={`${name}${price > 0 ? ` — ${formatINR(price)}` : ' — Stock'}${isSelected ? ' — selected' : ''}`}
      onClick={() => onSelect(id)}
      whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left min-h-[88px]',
        'border transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isSelected
          ? 'bg-accent/10 border-accent/40'
          : 'bg-white/3 border-white/6 hover:bg-white/6 hover:border-white/14',
      )}
    >
      {/* Optional swatch — 36px */}
      {swatch && (
        <div className="flex-shrink-0" aria-hidden>
          {swatch}
        </div>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[15px] font-semibold leading-tight truncate',
          isSelected ? 'text-white' : 'text-white/80',
        )}>
          {name}
        </p>
        {brand && brand !== '—' && (
          <p className="text-[11px] text-white/40 mt-0.5 leading-none font-medium truncate">
            {brand}
          </p>
        )}
        {description && (
          <p className="text-[12px] text-white/35 mt-0.5 leading-snug line-clamp-2">
            {description}
          </p>
        )}
        {warningLabel && (
          <p className="text-[10px] text-amber-400/70 mt-0.5 leading-snug">
            {warningLabel}
          </p>
        )}
      </div>

      {/* Price + checkmark */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={cn(
          'text-[16px] font-semibold font-mono tabular-nums',
          price === 0
            ? 'text-white/30'
            : isSelected
              ? 'text-accent'
              : 'text-white/60',
        )}>
          {price === 0 ? 'Stock' : formatINR(price)}
        </span>
        {isSelected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-5 h-5 rounded-full bg-accent flex items-center justify-center"
            aria-hidden
          >
            <Check size={11} className="text-white" />
          </motion.span>
        )}
      </div>
    </motion.button>
  );
}
