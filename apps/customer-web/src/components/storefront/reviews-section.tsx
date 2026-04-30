/**
 * ReviewsSection — public storefront VDP reviews surface.
 *
 * L4:  Displays only `{firstName} from {city}` — no last name, email, or phone.
 * L5:  NPS → star mapping: 0–6 → 1★; 7–8 → 4★; 9–10 → 5★.
 * L6:  Shows top 3 most recent approved reviews for the VIN.
 * DEF-REVIEWS-1: "See all reviews" CTA is deferred to P2.
 *
 * v1: reads from fixture reviews directly.
 * No external store needed — this is a server-compatible component.
 *
 * Spec reference: SPEC-REVIEWS-001 §UI surfaces (storefront VDP), S-REV-7, S-REV-8
 */

import { reviews as allReviews } from '@dms/mocks/fixtures';
import { npsToStars } from '@dms/types';

// ─── Star SVG ─────────────────────────────────────────────────────────────────

function StarSvg({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={filled ? 'text-yellow-500' : 'text-gray-300'}
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

function StarRow({ npsScore }: { npsScore: number }) {
  const count = npsToStars(npsScore);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${count} out of 5 stars`}
      role="img"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <StarSvg key={i} filled={i < count} />
      ))}
    </span>
  );
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

function AggregateBar({
  npsScores,
  count,
}: {
  npsScores: number[];
  count: number;
}) {
  if (npsScores.length === 0) return null;

  // L5: map each NPS → stars, then average
  const starValues = npsScores.map(npsToStars);
  const avgStars = starValues.reduce((a, b) => a + b, 0) / starValues.length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <StarSvg key={i} filled={i < Math.round(avgStars)} />
        ))}
      </div>
      <span className="text-sm font-medium text-[var(--color-ink-primary)]">
        {avgStars.toFixed(1)} / 5
      </span>
      <span className="text-sm text-[var(--color-ink-secondary)]">
        ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({
  firstName,
  city,
  npsScore,
  freeText,
  submittedAt,
  kind,
}: {
  firstName: string;
  city: string;
  npsScore: number;
  freeText?: string;
  submittedAt: string;
  kind: 'delivery' | 'service';
}) {
  const date = new Date(submittedAt).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <article className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-surface)] p-4 space-y-3">
      {/* L4: only firstName + city — no last name, email, or phone */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink-primary)]">
            {firstName}
            <span className="font-normal text-[var(--color-ink-secondary)]">
              {' '}from {city}
            </span>
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{date}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-sm bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium shrink-0">
          {kind === 'delivery' ? 'Delivery' : 'Service'}
        </span>
      </div>

      <StarRow npsScore={npsScore} />

      {freeText && (
        <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">
          &ldquo;{freeText}&rdquo;
        </p>
      )}
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReviewsSectionProps {
  vin: string;
}

export function ReviewsSection({ vin }: ReviewsSectionProps) {
  // L6: only approved reviews for this VIN
  const approved = allReviews
    .filter((r) => r.vinOrJcId === vin && r.status === 'approved')
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );

  const top3 = approved.slice(0, 3); // L6: top 3 most recent
  const allNps = approved.map((r) => r.npsScore);

  return (
    <section
      aria-labelledby="reviews-heading"
      className="px-4 md:px-8 lg:px-16 py-8 border-t border-[var(--color-line)]"
    >
      {/* Section header */}
      <div className="mb-6">
        <h2
          id="reviews-heading"
          className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-secondary)] mb-3"
        >
          Owner Reviews
        </h2>

        {approved.length > 0 ? (
          <AggregateBar npsScores={allNps} count={approved.length} />
        ) : (
          /* S-REV-8: empty state */
          <div className="text-sm text-[var(--color-ink-secondary)]">
            <p>No reviews yet. Be the first to share your experience.</p>
          </div>
        )}
      </div>

      {/* Review cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((review) => (
            <ReviewCard
              key={review.id}
              firstName={review.customerFirstName}
              city={review.customerCity}
              npsScore={review.npsScore}
              freeText={review.freeText}
              submittedAt={review.submittedAt}
              kind={review.kind}
            />
          ))}
        </div>
      )}

      {/* DEF-REVIEWS-1: "See all reviews" deferred to P2 */}
      {approved.length > 3 && (
        <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
          +{approved.length - 3} more reviews — full listing coming soon
        </p>
      )}
    </section>
  );
}
