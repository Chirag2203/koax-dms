/**
 * CustomizationCostBreakdown — itemized list of all selected customizations + GST.
 *
 * L81: Cost summary aggregates customization total with GST 18% additive (per L25).
 *   Customization total ADDS to existing build-job parts cost in main estimate.
 * L82: Displays all selected customizations with individual prices.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L81, L82
 */

'use client';

import { cn } from '@dms/ui';
import type { VisualizerCustomizations } from '@dms/types';
import { formatINR } from '../shared/format-inr';
import {
  WHEEL_OPTIONS,
  TINT_OPTIONS,
  EXHAUST_OPTIONS,
  SUSPENSION_OPTIONS,
  HOOD_OPTIONS,
  WING_OPTIONS,
  DECAL_PRICE_PER_UNIT,
  computeCustomizationCost,
} from '@/src/lib/custom-builds/customization-catalog';
import { PAINT_PALETTE } from '@/src/lib/custom-builds/paint-palette';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomizationCostBreakdownProps {
  customizations: VisualizerCustomizations;
  activePaintKey?: string | null;
  className?: string;
}

// ─── Row component ────────────────────────────────────────────────────────────

function CostRow({ label, value, price, highlight = false }: {
  label: string;
  value?: string;
  price: number;
  highlight?: boolean;
}) {
  if (price === 0) return null;

  return (
    <div className={cn(
      'flex items-baseline justify-between gap-2 py-1',
      highlight && 'text-accent',
    )}>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={cn(
          'text-[14px] flex-shrink-0',
          highlight ? 'text-accent/80 font-medium' : 'text-white/50',
        )}>
          {label}
        </span>
        {value && (
          <span className="text-[12px] text-white/30 truncate">{value}</span>
        )}
      </div>
      <span className={cn(
        'text-[15px] font-mono tabular-nums flex-shrink-0',
        highlight ? 'text-accent font-semibold' : 'text-white/60',
      )}>
        {formatINR(price)}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CustomizationCostBreakdown({
  customizations,
  activePaintKey,
  className,
}: CustomizationCostBreakdownProps) {
  // Resolve paint price
  const activePaint = activePaintKey
    ? PAINT_PALETTE.find((p) => p.key === activePaintKey)
    : undefined;
  const paintPrice = activePaint?.listPrice ?? 0;

  // Resolve option prices via catalog lookups
  const wheelOpt = WHEEL_OPTIONS.find((o) => o.id === customizations.wheelOptionId);
  const tintOpt = TINT_OPTIONS.find((o) => o.id === customizations.tintOptionId);
  const exhaustOpt = EXHAUST_OPTIONS.find((o) => o.id === customizations.exhaustOptionId);
  const suspOpt = SUSPENSION_OPTIONS.find((o) => o.id === customizations.suspensionOptionId);
  const hoodOpt = HOOD_OPTIONS.find((o) => o.id === customizations.hoodOptionId);
  const wingOpt = WING_OPTIONS.find((o) => o.id === customizations.wingOptionId);
  const decalCount = customizations.decals?.length ?? 0;

  const breakdown = computeCustomizationCost({
    paintPrice,
    wheelOptionId: customizations.wheelOptionId,
    tintOptionId: customizations.tintOptionId,
    exhaustOptionId: customizations.exhaustOptionId,
    suspensionOptionId: customizations.suspensionOptionId,
    hoodOptionId: customizations.hoodOptionId,
    wingOptionId: customizations.wingOptionId,
    decalCount,
  });

  const hasAny = breakdown.subtotal > 0;
  if (!hasAny) return null;

  return (
    <div className={cn('px-4 py-3 border-t border-white/6', className)}>
      <p className="text-[12px] text-white/35 uppercase tracking-widest mb-2">
        Selected Customizations
      </p>

      <div className="space-y-0">
        <CostRow
          label="Paint"
          value={activePaint?.name}
          price={breakdown.paintPrice}
        />
        <CostRow
          label="Wheels"
          value={wheelOpt?.name}
          price={breakdown.wheelPrice}
        />
        <CostRow
          label="Tint"
          value={tintOpt?.name}
          price={breakdown.tintPrice}
        />
        <CostRow
          label="Exhaust"
          value={exhaustOpt?.name}
          price={breakdown.exhaustPrice}
        />
        <CostRow
          label="Suspension"
          value={suspOpt?.name}
          price={breakdown.suspensionPrice}
        />
        <CostRow
          label="Hood"
          value={hoodOpt?.name}
          price={breakdown.hoodPrice}
        />
        <CostRow
          label="Wing"
          value={wingOpt?.name}
          price={breakdown.wingPrice}
        />
        {decalCount > 0 && (
          <CostRow
            label={`Decals (${decalCount})`}
            price={decalCount * DECAL_PRICE_PER_UNIT}
          />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/8 mt-2 pt-2 space-y-1">
        <div className="flex justify-between items-baseline">
          <span className="text-[14px] text-white/40">Subtotal</span>
          <span className="text-[15px] font-mono text-white/60 tabular-nums">
            {formatINR(breakdown.subtotal)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[12px] text-white/30">GST 18%</span>
          <span className="text-[13px] font-mono text-white/40 tabular-nums">
            {formatINR(breakdown.gst)}
          </span>
        </div>
        <div className="flex justify-between items-baseline border-t border-white/8 pt-1.5 mt-1">
          <span className="text-[14px] font-semibold text-white/70">Total Customization</span>
          <span className="text-[20px] font-bold font-mono text-white/85 tabular-nums">
            {formatINR(breakdown.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
