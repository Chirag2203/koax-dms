/**
 * SuspensionCustomizer — priced option cards for suspension lowering kits.
 *
 * P3.3.6: Upgraded from slider to priced option cards (L82).
 * Bug 3 fix: The slider was not responsive due to pointer-events stacking context
 *   conflicts with the R3F canvas sibling. Replaced with option cards that use
 *   standard button click handlers — no slider input required.
 * L62: Range 0–50mm. Warning at >30mm (amber), 50mm (red).
 * L78: Each option has id/name/price/loweringMm. Selection via suspensionOptionId.
 * L82: Cards display name + description + price. Stock (₹0) first.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L62, L78, L82
 */

'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@dms/ui';
import { SUSPENSION_OPTIONS } from '@/src/lib/custom-builds/customization-catalog';
import { OptionCard } from './option-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuspensionSpec {
  loweringMm: number;
}

export interface SuspensionCustomizerProps {
  value: SuspensionSpec | undefined;
  onChange: (suspension: SuspensionSpec | undefined) => void;
  /** Priced catalog selection (L78) */
  selectedOptionId?: string;
  onSelectOption?: (optionId: string) => void;
}

// ─── Warning thresholds ────────────────────────────────────────────────────────

function getWarning(mm: number): { level: 'amber' | 'red'; message: string } | null {
  if (mm >= 50) return { level: 'red',   message: 'Slammed — track only' };
  if (mm > 30)  return { level: 'amber', message: 'Aggressive — may rub on potholes' };
  return null;
}

// ─── Lowering visual indicator ────────────────────────────────────────────────

function LoweringIndicator({ loweringMm }: { loweringMm: number }) {
  if (loweringMm === 0) return null;
  return (
    <div className="relative h-10 flex items-end justify-center mt-2" aria-hidden>
      <svg viewBox="0 0 200 50" className="w-full opacity-25">
        <path
          d="M20,35 L30,16 L60,8 L140,8 L170,16 L180,35 Z"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />
        <line x1="0" y1="46" x2="200" y2="46" stroke="white" strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="46" r="8" fill="none" stroke="white" strokeWidth="1.5" />
        <circle cx="150" cy="46" r="8" fill="none" stroke="white" strokeWidth="1.5" />
        <rect
          x="14"
          y={35 - (loweringMm / 50) * 18}
          width="172"
          height="2"
          fill="white"
          opacity="0.5"
        />
      </svg>
      <div className="absolute bottom-0 right-2 text-[9px] text-white/30 font-mono">
        -{loweringMm}mm
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SuspensionCustomizer({ value, onChange, selectedOptionId, onSelectOption }: SuspensionCustomizerProps) {
  const handleSelect = (optionId: string) => {
    const opt = SUSPENSION_OPTIONS.find((o) => o.id === optionId);
    if (!opt) return;

    onSelectOption?.(optionId);

    if (opt.loweringMm === 0) {
      onChange(undefined);
    } else {
      onChange({ loweringMm: opt.loweringMm });
    }
  };

  // Determine active option ID from current value
  let activeOptionId = selectedOptionId;
  if (!activeOptionId) {
    if (!value || value.loweringMm === 0) {
      activeOptionId = 'susp-stock';
    } else {
      const match = SUSPENSION_OPTIONS.find((o) => o.loweringMm === value.loweringMm);
      activeOptionId = match?.id ?? 'susp-stock';
    }
  }

  const activeOpt = SUSPENSION_OPTIONS.find((o) => o.id === activeOptionId);
  const loweringMm = activeOpt?.loweringMm ?? value?.loweringMm ?? 0;
  const warning = getWarning(loweringMm);

  return (
    <div className="px-3 py-3 space-y-1.5">
      <p className="text-[14px] font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
        Ride Height — {SUSPENSION_OPTIONS.length} Options
      </p>

      {SUSPENSION_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          id={opt.id}
          name={opt.name}
          brand={opt.brand}
          price={opt.price}
          description={
            opt.description
              ? opt.description
              : opt.loweringMm > 0
                ? `Lowers body by ${opt.loweringMm}mm`
                : undefined
          }
          isSelected={activeOptionId === opt.id}
          onSelect={handleSelect}
        />
      ))}

      {/* Visual lowering indicator */}
      <LoweringIndicator loweringMm={loweringMm} />

      {/* Warning chip */}
      {warning && (
        <div
          className={cn(
            'flex items-start gap-2 px-3 py-2 rounded-lg border mt-2',
            warning.level === 'red'
              ? 'bg-red-950/30 border-red-600/30 text-red-300'
              : 'bg-amber-950/30 border-amber-600/30 text-amber-300',
          )}
          role="alert"
        >
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-[10px] leading-snug font-medium">
            {warning.message}
          </p>
        </div>
      )}
    </div>
  );
}
