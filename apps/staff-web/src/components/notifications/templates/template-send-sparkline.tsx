/**
 * TemplateSendSparkline — 7-bar mini chart of sends per day (last 7 days).
 * SPEC-NOTIFICATIONS-001 §6.3
 *
 * Pure SVG, no external charting library.
 * ≤80 LoC per spec §11
 */

'use client';

interface TemplateSendSparklineProps {
  /** Array of daily counts. Should be 7 items (oldest to newest). */
  counts: number[];
}

export function TemplateSendSparkline({ counts }: TemplateSendSparklineProps) {
  const max = Math.max(...counts, 1);
  const W = 120;
  const H = 36;
  const BAR_W = 12;
  const GAP = 4;

  const bars = counts.slice(-7).map((c, i) => ({
    x: i * (BAR_W + GAP),
    height: Math.max(2, Math.round((c / max) * H)),
    count: c,
  }));

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-label="Sends last 7 days"
      role="img"
      className="overflow-visible"
    >
      {bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x}
            y={H - bar.height}
            width={BAR_W}
            height={bar.height}
            rx="2"
            className="fill-accent/60 hover:fill-accent transition-colors"
          />
          <title>{`Day ${i + 1}: ${bar.count} sends`}</title>
        </g>
      ))}
    </svg>
  );
}
