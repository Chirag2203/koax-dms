/**
 * NpsSubmitView — customer-facing NPS review submission form.
 *
 * L1:  NPS 0–10 picker with colour coding (0–6 red, 7–8 amber, 9–10 green).
 * L9:  Free text optional, max 1,000 chars.
 * L10: Duplicate check — store throws DuplicateReviewError.
 * L14: reviewId is pre-minted (from notification link).
 *
 * v1: Reads review request details from fixture reviews.
 *     No real auth — uses mockCustomer as the submitter.
 *
 * Spec reference: SPEC-REVIEWS-001 S-REV-1, S-REV-2, S-REV-6, S-REV-8
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { reviews as fixtureReviews } from '@dms/mocks/fixtures';
import { mockCustomer } from '@dms/mocks/fixtures';

// ─── Local store instance for customer-web ────────────────────────────────────
// NOTE: customer-web does not import staff-web's store. In v1, the submission
// is mocked — it logs the submission and shows success. A real implementation
// would POST to an API route. This matches the MVP philosophy (frontend-first).
// No cross-app store sharing per CLAUDE.md §4.

// ─── NPS button colour ────────────────────────────────────────────────────────

function npsColour(score: number): string {
  if (score <= 6) return 'bg-danger/10 text-danger border-danger/40 hover:bg-danger/20';
  if (score <= 8) return 'bg-warning/10 text-warning border-warning/40 hover:bg-warning/20';
  return 'bg-success/10 text-success border-success/40 hover:bg-success/20';
}

function npsActiveColour(score: number): string {
  if (score <= 6) return 'bg-danger text-white border-danger';
  if (score <= 8) return 'bg-warning text-white border-warning';
  return 'bg-success text-white border-success';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NpsSubmitViewProps {
  reviewId: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'not-found';

export function NpsSubmitView({ reviewId }: NpsSubmitViewProps) {
  const t = useTranslations('portal.reviews');

  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [freeText, setFreeText] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  // Find the fixture review to get context (VIN, kind, etc.)
  const fixtureReview = fixtureReviews.find((r) => r.id === reviewId);

  // Not found or link expired
  if (!fixtureReview) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-medium text-[var(--color-ink-primary)]">
          {t('linkExpiredTitle')}
        </p>
        <p className="text-sm text-[var(--color-ink-secondary)] mt-2">
          {t('linkExpiredBody')}
        </p>
        <Link
          href="/account"
          className="mt-6 inline-block px-4 py-2 rounded-md border border-[var(--color-line)] text-sm text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          {t('backToAccount')}
        </Link>
      </div>
    );
  }

  // Already submitted — the duplicate case
  if (submitState === 'duplicate') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-medium text-[var(--color-ink-primary)]">
          {t('alreadySubmittedTitle')}
        </p>
        <p className="text-sm text-[var(--color-ink-secondary)] mt-2">
          {t('alreadySubmittedBody')}
        </p>
        <Link
          href="/account"
          className="mt-6 inline-block px-4 py-2 rounded-md border border-[var(--color-line)] text-sm text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          {t('backToAccount')}
        </Link>
      </div>
    );
  }

  // Success state
  if (submitState === 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke="var(--color-success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-[var(--color-ink-primary)]">
          {t('thankYouTitle')}
        </p>
        <p className="text-sm text-[var(--color-ink-secondary)] mt-2">
          {t('thankYouBody')}
        </p>
        <Link
          href="/account"
          className="mt-6 inline-block px-4 py-2 rounded-md border border-[var(--color-line)] text-sm text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          {t('backToAccount')}
        </Link>
      </div>
    );
  }

  // Kind label
  const kindLabel =
    fixtureReview.kind === 'delivery'
      ? t('kindDelivery', { vinOrJcId: fixtureReview.vinOrJcId })
      : t('kindService', { vinOrJcId: fixtureReview.vinOrJcId });

  function handleSubmit() {
    if (npsScore === null) return;
    setSubmitState('submitting');

    // v1 mock: simulate async submit. In production this calls POST /api/reviews.
    setTimeout(() => {
      // Check if already submitted (duplicate check via fixture)
      const alreadySubmitted = fixtureReviews.some(
        (r) =>
          r.customerId === mockCustomer.id &&
          r.vinOrJcId === fixtureReview!.vinOrJcId &&
          r.id !== reviewId, // different record = prior submission
      );

      if (alreadySubmitted) {
        setSubmitState('duplicate');
      } else {
        setSubmitState('success');
      }
    }, 600);
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-[var(--color-ink-primary)] mb-2">
        {t('title')}
      </h1>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-1">
        {kindLabel}
      </p>
      <p className="text-xs text-[var(--color-ink-muted)] mb-8">
        {t('subtitle')}
      </p>

      {/* NPS question */}
      <fieldset className="mb-8">
        <legend className="text-sm font-medium text-[var(--color-ink-primary)] mb-4">
          {t('npsQuestion')}
        </legend>

        {/* 0–10 grid */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="NPS score 0 to 10">
          {Array.from({ length: 11 }, (_, i) => {
            const active = npsScore === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setNpsScore(i)}
                aria-pressed={active}
                aria-label={`Score ${i}`}
                className={[
                  'w-10 h-10 rounded-md border font-mono text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                  active ? npsActiveColour(i) : npsColour(i),
                ].join(' ')}
              >
                {i}
              </button>
            );
          })}
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[var(--color-ink-muted)]">{t('npsLowLabel')}</span>
          <span className="text-xs text-[var(--color-ink-muted)]">{t('npsHighLabel')}</span>
        </div>
      </fieldset>

      {/* Free text */}
      <div className="mb-8">
        <label
          htmlFor="review-text"
          className="block text-sm font-medium text-[var(--color-ink-primary)] mb-2"
        >
          {t('freeTextLabel')}{' '}
          <span className="text-xs text-[var(--color-ink-muted)]">
            {t('freeTextOptional')}
          </span>
        </label>
        <textarea
          id="review-text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={t('freeTextPlaceholder')}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
        />
        <p className="text-xs text-[var(--color-ink-muted)] mt-1 text-right">
          {freeText.length}/1000
        </p>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={npsScore === null || submitState === 'submitting'}
        aria-disabled={npsScore === null || submitState === 'submitting'}
        className="w-full py-3 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
      >
        {submitState === 'submitting' ? t('submitting') : t('submitCta')}
      </button>
    </div>
  );
}
