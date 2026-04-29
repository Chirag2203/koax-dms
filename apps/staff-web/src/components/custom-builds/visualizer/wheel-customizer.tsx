/**
 * WheelCustomizer — priced option cards for rim finish selection.
 *
 * P3.3.6: Upgraded from bare swatches to priced option cards (L82).
 * L58: V0 = material swap (5 finishes). V0.1: alternate wheel GLBs.
 * L78: Each option has id/name/price. Selection persisted via wheelOptionId.
 * L82: Cards display name + price. Stock (₹0) first. Selected state: accent border + checkmark.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L58, L78, L82
 */

'use client';

import { CircleDot } from 'lucide-react';
import { cn } from '@dms/ui';
import type { WheelMaterial } from '@dms/types';
import { WHEEL_OPTIONS } from '@/src/lib/custom-builds/customization-catalog';
import { OptionCard } from './option-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WheelCustomizerProps {
  value: WheelMaterial | undefined;
  onChange: (material: WheelMaterial | undefined) => void;
  /** Priced catalog selection (L78) */
  selectedOptionId?: string;
  onSelectOption?: (optionId: string) => void;
}

// ─── Swatch colors per finish ─────────────────────────────────────────────────

const FINISH_COLORS: Record<string, [string, string, string]> = {
  silver:      ['#a0a0a0', '#c8c8c8', '#e0e0e0'],
  gunmetal:    ['#2a2f35', '#3a3f45', '#4a5260'],
  'gloss-black': ['#000000', '#111111', '#1e1e1e'],
  bronze:      ['#6b4c2a', '#8c6e3f', '#b89060'],
  brushed:     ['#909090', '#b8b8b2', '#d0d0c8'],
};

function WheelSwatch({ finish }: { finish: string }) {
  const [outer, mid, center] = FINISH_COLORS[finish] ?? ['#888', '#aaa', '#ccc'];
  return (
    <div className="relative w-9 h-9 rounded-full flex-shrink-0">
      <div
        className="w-full h-full rounded-full border border-white/15"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${center}, ${mid} 50%, ${outer})`,
        }}
      />
      <div
        className="absolute inset-0 rounded-full overflow-hidden opacity-15"
        style={{
          background: `repeating-conic-gradient(
            rgba(255,255,255,0.4) 0deg 4deg,
            transparent 4deg 72deg
          )`,
        }}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WheelCustomizer({ value, onChange, selectedOptionId, onSelectOption }: WheelCustomizerProps) {
  const handleSelect = (optionId: string) => {
    const opt = WHEEL_OPTIONS.find((o) => o.id === optionId);
    if (!opt) return;

    // Also drive the legacy WheelMaterial field for 3D controller
    const isCurrentlySelected = selectedOptionId === optionId || (optionId === 'wheel-stock' && !value && !selectedOptionId);
    if (isCurrentlySelected && opt.finish !== 'silver') {
      // Toggle off — revert to stock
      onChange(undefined);
      onSelectOption?.('wheel-stock');
    } else {
      onChange(opt.finish === 'silver' ? undefined : opt.finish as WheelMaterial);
      onSelectOption?.(optionId);
    }
  };

  // Determine active option ID from current value
  const activeOptionId = selectedOptionId
    ?? (value ? WHEEL_OPTIONS.find((o) => o.finish === value)?.id : 'wheel-stock')
    ?? 'wheel-stock';

  return (
    <div className="px-3 py-3 space-y-1.5">
      {/* Section heading */}
      <p className="text-[14px] font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
        Rim Finish — {WHEEL_OPTIONS.length} Options
      </p>

      {/* Option cards */}
      {WHEEL_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          id={opt.id}
          name={opt.name}
          brand={opt.brand}
          price={opt.price}
          description={opt.description}
          isSelected={activeOptionId === opt.id}
          onSelect={handleSelect}
          swatch={<WheelSwatch finish={opt.finish} />}
        />
      ))}

      {/* Wheel size note */}
      <div className={cn('mt-4 px-3 py-2.5 rounded-lg bg-white/3 border border-white/6')}>
        <div className="flex items-center gap-2">
          <CircleDot size={12} className="text-white/30 flex-shrink-0" aria-hidden />
          <p className="text-[10px] text-white/35 leading-snug">
            Wheel diameter (18–22&quot;) is controlled via the Configurator panel wheel size slider.
            Alternate wheel models coming in V0.1.
          </p>
        </div>
      </div>
    </div>
  );
}
