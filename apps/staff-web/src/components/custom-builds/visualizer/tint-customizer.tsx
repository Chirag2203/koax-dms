/**
 * TintCustomizer — priced option cards for window tint selection.
 *
 * P3.3.6: Upgraded from slider + swatches to priced option cards (L82).
 * L60: 5 tint levels + colors.
 * L78: Each option has id/name/price. Selection persisted via tintOptionId.
 * L82: Cards display name + price. Stock (No Tint, ₹0) first.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L60, L78, L82
 */

'use client';

import { cn } from '@dms/ui';
import type { TintColor } from '@dms/types';
import { TINT_OPTIONS } from '@/src/lib/custom-builds/customization-catalog';
import { OptionCard } from './option-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TintSpec {
  level: number;
  color: TintColor;
}

export interface TintCustomizerProps {
  value: TintSpec | undefined;
  onChange: (tint: TintSpec | undefined) => void;
  /** Priced catalog selection (L78) */
  selectedOptionId?: string;
  onSelectOption?: (optionId: string) => void;
}

// ─── Tint color hex map ───────────────────────────────────────────────────────

const TINT_HEX: Record<string, string> = {
  smoke:  '#1c1c1c',
  amber:  '#c8860a',
  blue:   '#0a3d6b',
  green:  '#0a4a1e',
  mirror: '#e0e8f0',
  clear:  '#e8f0f8',
};

function TintSwatch({ color, level }: { color: string; level: number }) {
  const hex = TINT_HEX[color] ?? '#1c1c1c';
  return (
    <div
      className="w-9 h-9 rounded-lg border border-white/15 flex-shrink-0"
      style={{
        backgroundColor: hex,
        opacity: level === 0 ? 0.15 : 0.3 + (level / 100) * 0.7,
      }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TintCustomizer({ value, onChange, selectedOptionId, onSelectOption }: TintCustomizerProps) {
  const handleSelect = (optionId: string) => {
    const opt = TINT_OPTIONS.find((o) => o.id === optionId);
    if (!opt) return;

    onSelectOption?.(optionId);

    if (opt.level === 0) {
      onChange(undefined);
    } else {
      onChange({ level: opt.level, color: opt.color as TintColor });
    }
  };

  // Determine active option ID from current value
  let activeOptionId = selectedOptionId;
  if (!activeOptionId) {
    if (!value || value.level === 0) {
      activeOptionId = 'tint-stock';
    } else {
      // Best-match from catalog
      const match = TINT_OPTIONS.find(
        (o) => o.level === value.level && o.color === value.color,
      );
      activeOptionId = match?.id ?? 'tint-stock';
    }
  }

  return (
    <div className={cn('px-3 py-3 space-y-1.5')}>
      <p className="text-[14px] font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
        Window Tint — {TINT_OPTIONS.length} Options
      </p>

      {TINT_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          id={opt.id}
          name={opt.name}
          brand={opt.brand}
          price={opt.price}
          description={opt.description}
          isSelected={activeOptionId === opt.id}
          onSelect={handleSelect}
          swatch={<TintSwatch color={opt.color} level={opt.level} />}
        />
      ))}
    </div>
  );
}
