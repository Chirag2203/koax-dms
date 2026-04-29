/**
 * WingCustomizer — priced option cards for wing/spoiler selection.
 *
 * P3.3.6: New category (L79).
 * L79: Wing visual rendering deferred to v0.1 (no separate GLB mesh for Ferrari).
 *   Price applies to quote regardless. "Visual coming soon" note shown.
 * L78: Each option has id/name/price. Selection persisted via wingOptionId.
 * L82: Cards display name + price. Stock (₹0) first.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L78, L79, L82
 */

'use client';

import { cn } from '@dms/ui';
import { WING_OPTIONS } from '@/src/lib/custom-builds/customization-catalog';
import { OptionCard } from './option-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WingCustomizerProps {
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WingCustomizer({ selectedOptionId = 'wing-stock', onSelectOption }: WingCustomizerProps) {
  return (
    <div className="px-3 py-3 space-y-1.5">
      <p className="text-[14px] font-semibold text-white/40 uppercase tracking-wider mb-1 px-1">
        Wing / Spoiler — {WING_OPTIONS.length} Options
      </p>

      {WING_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          id={opt.id}
          name={opt.name}
          brand={opt.brand}
          price={opt.price}
          description={opt.description}
          isSelected={selectedOptionId === opt.id}
          onSelect={onSelectOption}
        />
      ))}
    </div>
  );
}
