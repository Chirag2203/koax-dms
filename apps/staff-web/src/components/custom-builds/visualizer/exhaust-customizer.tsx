/**
 * ExhaustCustomizer — priced option cards for exhaust selection.
 *
 * P3.3.6: Upgraded from swatch cards to priced option cards (L82).
 * L61: 4 tip styles + muffler-delete option.
 * L78: Each option has id/name/price. Selection persisted via exhaustOptionId.
 * L82: Cards display name + description + price. Stock (₹0) first.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L61, L78, L82
 */

'use client';

import type { ExhaustTipStyle } from '@dms/types';
import { EXHAUST_OPTIONS } from '@/src/lib/custom-builds/customization-catalog';
import { OptionCard } from './option-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExhaustSpec {
  tipStyle: ExhaustTipStyle;
  mufflerDeleted: boolean;
}

export interface ExhaustCustomizerProps {
  value: ExhaustSpec | undefined;
  onChange: (exhaust: ExhaustSpec | undefined) => void;
  /** Priced catalog selection (L78) */
  selectedOptionId?: string;
  onSelectOption?: (optionId: string) => void;
}

// ─── Pattern swatch ───────────────────────────────────────────────────────────

function ExhaustSwatch({ tipStyle }: { tipStyle: string }) {
  let bg: React.CSSProperties['background'];
  switch (tipStyle) {
    case 'stock-chrome':
      bg = `radial-gradient(circle at 30% 30%, #f0f0f0, #c0c0c0 50%, #808080)`;
      break;
    case 'twin-polished':
      bg = `radial-gradient(circle at 30% 30%, #ffffff, #e8e8e8 40%, #a0a0a0)`;
      break;
    case 'quad-black':
      bg = '#1a1a1a';
      break;
    case 'carbon-tipped':
      bg = `repeating-linear-gradient(45deg, #1e1e1e 0px, #1e1e1e 4px, #2e2e2e 4px, #2e2e2e 8px)`;
      break;
    default:
      bg = '#888888';
  }
  return (
    <div
      className="w-9 h-9 rounded-lg border border-white/10 flex-shrink-0"
      style={{ background: bg }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExhaustCustomizer({ value, onChange, selectedOptionId, onSelectOption }: ExhaustCustomizerProps) {
  const handleSelect = (optionId: string) => {
    const opt = EXHAUST_OPTIONS.find((o) => o.id === optionId);
    if (!opt) return;

    onSelectOption?.(optionId);

    if (opt.tipStyle === 'stock-chrome' && !opt.mufflerDeleted) {
      onChange(undefined);
    } else {
      onChange({ tipStyle: opt.tipStyle as ExhaustTipStyle, mufflerDeleted: opt.mufflerDeleted });
    }
  };

  // Determine active option ID from current value
  let activeOptionId = selectedOptionId;
  if (!activeOptionId) {
    if (!value) {
      activeOptionId = 'exh-stock';
    } else {
      const match = EXHAUST_OPTIONS.find(
        (o) => o.tipStyle === value.tipStyle && o.mufflerDeleted === value.mufflerDeleted,
      );
      activeOptionId = match?.id ?? 'exh-stock';
    }
  }

  return (
    <div className="px-3 py-3 space-y-1.5">
      <p className="text-[14px] font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
        Exhaust System — {EXHAUST_OPTIONS.length} Options
      </p>

      {EXHAUST_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          id={opt.id}
          name={opt.name}
          brand={opt.brand}
          price={opt.price}
          description={opt.description}
          isSelected={activeOptionId === opt.id}
          onSelect={handleSelect}
          swatch={<ExhaustSwatch tipStyle={opt.tipStyle} />}
          warningLabel={opt.mufflerDeleted ? 'Race-only — not road-legal' : undefined}
        />
      ))}
    </div>
  );
}
