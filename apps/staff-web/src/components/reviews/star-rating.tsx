/**
 * StarRating — renders filled/empty SVG stars for a given score.
 *
 * L5:  NPS → star mapping: 0–6 → 1★; 7–8 → 4★; 9–10 → 5★ (SPEC-REVIEWS-001 L5)
 * L15: SVG stars for WCAG color-contrast compliance (no emoji, no external lib).
 *
 * Used in both staff moderation queue and storefront VDP.
 */

import { npsToStars } from '@dms/types';

interface StarRatingProps {
  /** NPS score 0–10. Stars are derived via npsToStars(). */
  npsScore: number;
  /** Number of total stars shown (default 5) */
  maxStars?: number;
  /** Size in px (default 16) */
  size?: number;
  className?: string;
}

// ─── SVG star paths ───────────────────────────────────────────────────────────

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={filled ? 'text-warning' : 'text-line-strong'}
    >
      <path
        d="M10 1l2.63 5.33 5.87.85-4.25 4.14 1 5.85L10 14.45l-5.25 2.72 1-5.85L1.5 7.18l5.87-.85L10 1z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StarRating({
  npsScore,
  maxStars = 5,
  size = 16,
  className,
}: StarRatingProps) {
  // L5: derive star count from NPS
  const filledCount = npsToStars(npsScore);

  return (
    <span
      className={['inline-flex items-center gap-0.5', className].filter(Boolean).join(' ')}
      aria-label={`${filledCount} out of ${maxStars} stars`}
      role="img"
    >
      {Array.from({ length: maxStars }, (_, i) => (
        <StarIcon key={i} filled={i < filledCount} size={size} />
      ))}
    </span>
  );
}

// ─── Aggregate display ────────────────────────────────────────────────────────

interface AggregateStarsProps {
  /** Array of NPS scores to average and display */
  npsScores: number[];
  className?: string;
}

export function AggregateStars({ npsScores, className }: AggregateStarsProps) {
  if (npsScores.length === 0) return null;

  // L5: map each score to stars, average
  const starValues = npsScores.map(npsToStars);
  const avgStars = starValues.reduce((a, b) => a + b, 0) / starValues.length;

  return (
    <span className={['inline-flex items-center gap-1.5', className].filter(Boolean).join(' ')}>
      <StarRating npsScore={npsScores[0]!} maxStars={5} size={14} />
      <span className="text-xs text-ink-secondary font-mono tabular-nums">
        {avgStars.toFixed(1)} / 5
      </span>
      <span className="text-xs text-ink-muted">
        ({npsScores.length} {npsScores.length === 1 ? 'review' : 'reviews'})
      </span>
    </span>
  );
}
