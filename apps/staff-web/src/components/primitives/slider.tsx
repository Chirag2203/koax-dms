/**
 * Slider — reusable custom slider matching staff dark theme.
 *
 * L42 (locked): This is the canonical slider for staff-web.
 * All <input type="range"> must be replaced with this component.
 *
 * L50 (locked): Uses direct CSS pseudo-element styling
 * ([&::-webkit-slider-thumb], [&::-moz-range-thumb]) on a real
 * <input type="range"> — NOT a hidden-input overlay. Mirrors
 * customer-web/src/components/vdp/emi-calculator.tsx.
 * Track gradient via inline style for filled-portion progress.
 * Browser-default chrome suppressed via appearance-none.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 L42, L50
 */

'use client';

import { useId, useCallback } from 'react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  formatValue,
  disabled = false,
  className,
}: SliderProps) {
  const id = useId();

  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(value) : String(value);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (e.key === 'Home') {
        e.preventDefault();
        onChange(min);
      } else if (e.key === 'End') {
        e.preventDefault();
        onChange(max);
      }
      // ArrowLeft/ArrowRight/ArrowUp/ArrowDown are handled natively
    },
    [disabled, min, max, onChange],
  );

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {/* Label row */}
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-[11px] font-medium text-ink-muted uppercase tracking-wider select-none"
          >
            {label}
          </label>
          <span
            className="font-mono text-[11px] text-ink-secondary tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {displayValue}
          </span>
        </div>
      )}

      {/* Single styled <input type="range"> — no overlay tricks */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        className={cn(
          // Track
          'w-full h-[2px] rounded-none appearance-none cursor-pointer',
          // Webkit thumb
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-accent',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:border-0',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:duration-150',
          '[&::-webkit-slider-thumb]:hover:scale-110',
          // Moz thumb
          '[&::-moz-range-thumb]:w-4',
          '[&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-accent',
          '[&::-moz-range-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:border-0',
          '[&::-moz-range-thumb]:transition-transform',
          '[&::-moz-range-thumb]:duration-150',
          '[&::-moz-range-thumb]:hover:scale-110',
          // Focus ring on webkit thumb
          'focus-visible:outline-none',
          '[&:focus-visible::-webkit-slider-thumb]:ring-2',
          '[&:focus-visible::-webkit-slider-thumb]:ring-accent',
          '[&:focus-visible::-webkit-slider-thumb]:ring-offset-2',
          '[&:focus-visible::-webkit-slider-thumb]:ring-offset-[--color-bg-canvas]',
          // Disabled
          'disabled:cursor-not-allowed',
          'disabled:opacity-50',
        )}
        style={{
          background: `linear-gradient(to right, rgb(var(--color-accent)) 0%, rgb(var(--color-accent)) ${pct}%, rgb(var(--color-line)) ${pct}%, rgb(var(--color-line)) 100%)`,
        }}
      />

      {/* Min/max labels if no explicit label */}
      {!label && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-ink-muted tabular-nums">
            {formatValue ? formatValue(min) : String(min)}
          </span>
          <span
            className="font-mono text-[11px] text-ink-secondary tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {displayValue}
          </span>
          <span className="font-mono text-[10px] text-ink-muted tabular-nums">
            {formatValue ? formatValue(max) : String(max)}
          </span>
        </div>
      )}
    </div>
  );
}
