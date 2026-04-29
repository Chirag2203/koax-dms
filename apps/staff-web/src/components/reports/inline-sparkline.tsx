/**
 * InlineSparkline — pure SVG sparkline component.
 *
 * L5: No charting library. Inline SVG polyline + dots.
 * L17: Wrapped in React.lazy + Suspense (see kpi-tile.tsx for lazy boundary).
 * Spec reference: SPEC-REPORTS-001 §9.3 (L5, L17)
 *
 * Props:
 *   data    — 8 data points; sparkline shows trend direction
 *   width   — defaults 80
 *   height  — defaults 24
 *   aria-label — provided by parent for screen readers
 */

import type { SVGProps } from 'react';

export interface InlineSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  'aria-label'?: string;
}

export function InlineSparkline({
  data,
  width = 80,
  height = 24,
  className,
  'aria-label': ariaLabel,
}: InlineSparklineProps) {
  // L17: respects prefers-reduced-motion — checked in media query class approach
  // If data is empty or too short, render flat line
  if (!data || data.length === 0) {
    return (
      <svg
        role="img"
        aria-label={ariaLabel ?? 'No trend data'}
        width={width}
        height={height}
        className={className}
        aria-hidden={!ariaLabel}
      >
        <title>{ariaLabel ?? 'No trend data'}</title>
        <line
          x1={0} y1={height / 2}
          x2={width} y2={height / 2}
          className="stroke-accent"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const padding = 2;
  const plotW = width  - padding * 2;
  const plotH = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  // Normalise: if all values equal, render flat line at midpoint
  const normalise = (v: number): number => {
    if (range === 0) return plotH / 2;
    return plotH - ((v - min) / range) * plotH;
  };

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * plotW;
    const y = padding + normalise(v);
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const lastValue = data[data.length - 1] ?? 0;
  const label = ariaLabel ?? `Trend sparkline, last value ${Math.round(lastValue)}`;

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      className={className}
      aria-hidden={!ariaLabel}
    >
      <title>{label}</title>

      {/* L5: SVG polyline — no chart library */}
      <polyline
        points={polylinePoints}
        fill="none"
        className="stroke-accent motion-reduce:hidden"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Reduced motion: flat line showing final value only */}
      <line
        x1={0} y1={padding + normalise(lastValue)}
        x2={width} y2={padding + normalise(lastValue)}
        className="stroke-accent hidden motion-reduce:block"
        strokeWidth={1.5}
        strokeDasharray="3 2"
        strokeLinecap="round"
      />
    </svg>
  );
}
