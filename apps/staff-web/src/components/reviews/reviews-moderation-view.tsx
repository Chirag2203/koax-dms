/**
 * ReviewsModerationView — staff-side moderation queue.
 *
 * L3:  Approve: R10+. Hide: R02+.
 * L4:  Full name visible to moderators (staff-only surface).
 * L12: hideReason required (min 5 chars).
 * L13: Outlet-scoped for non-R19+ staff.
 *
 * Spec reference: SPEC-REVIEWS-001 §UI surfaces (moderation queue)
 * SPEC-ARCH-UI-001: Card/Field from detail-card, Gate primitive, no text-[Npx].
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';

import { Gate } from '@/src/components/primitives/gate';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { useReviewsStore } from '@/src/lib/reviews/reviews-store';
import { StarRating } from './star-rating';

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'pending' | 'approved' | 'hidden';

// ─── NPS colour chip ──────────────────────────────────────────────────────────

function NpsChip({ score }: { score: number }) {
  let colour = 'bg-success/10 text-success';
  if (score <= 6) colour = 'bg-danger/10 text-danger';
  else if (score <= 8) colour = 'bg-warning/10 text-warning';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-mono font-medium ${colour}`}
    >
      {score}/10
    </span>
  );
}

// ─── Kind chip ────────────────────────────────────────────────────────────────

function KindChip({ kind }: { kind: 'delivery' | 'service' }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-medium bg-accent/10 text-accent">
      {kind === 'delivery' ? 'Delivery' : 'Service'}
    </span>
  );
}

// ─── Hide dialog ──────────────────────────────────────────────────────────────

function HideDialog({
  reviewId,
  onConfirm,
  onCancel,
}: {
  reviewId: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hide-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-bg-surface border border-line-strong rounded-md shadow-3 p-6 w-full max-w-sm mx-4">
        <h2
          id="hide-dialog-title"
          className="text-sm font-semibold text-ink-primary mb-3"
        >
          Hide review
        </h2>
        <p className="text-xs text-ink-secondary mb-4">
          Provide a reason for hiding this review (min 5 characters). This is
          stored for audit purposes.
        </p>
        <label htmlFor="hide-reason" className="block text-xs text-ink-muted mb-1.5">
          Reason <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="hide-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Abusive language, off-topic content…"
          className="w-full rounded-md border border-line bg-bg-canvas px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          aria-required="true"
        />
        {reason.trim().length > 0 && !isValid && (
          <p role="alert" className="text-xs text-danger mt-1">
            Reason must be at least 5 characters.
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-sm text-ink-secondary border border-line hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={!isValid}
            aria-disabled={!isValid}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-danger text-white hover:bg-danger/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Hide review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onApprove,
  onHide,
}: {
  review: import('@dms/types').Review;
  onApprove: (id: string) => void;
  onHide: (id: string) => void;
}) {
  const date = new Date(review.submittedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-md border border-line bg-bg-surface p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* L4: full name shown to staff (staff surface only) */}
          <p className="text-sm font-medium text-ink-primary truncate">
            {review.customerFirstName} · {review.customerCity}
          </p>
          <p className="text-xs text-ink-muted mt-0.5 font-mono">{review.vinOrJcId}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <KindChip kind={review.kind} />
          <NpsChip score={review.npsScore} />
        </div>
      </div>

      {/* Stars + date */}
      <div className="flex items-center gap-2">
        <StarRating npsScore={review.npsScore} size={14} />
        <span className="text-xs text-ink-muted">{date}</span>
      </div>

      {/* Free text */}
      {review.freeText && (
        <p className="text-sm text-ink-secondary leading-relaxed line-clamp-4">
          &ldquo;{review.freeText}&rdquo;
        </p>
      )}

      {/* Moderation info for hidden/approved */}
      {review.status !== 'pending-moderation' && review.moderatedBy && (
        <div className="text-xs text-ink-muted border-t border-line pt-2">
          {review.status === 'hidden' && review.hideReason && (
            <p>
              <span className="font-medium text-ink-secondary">Hide reason:</span>{' '}
              {review.hideReason}
            </p>
          )}
          <p className="mt-0.5">
            Moderated by {review.moderatedBy}{' '}
            {review.moderatedAt &&
              `on ${new Date(review.moderatedAt).toLocaleDateString('en-IN')}`}
          </p>
        </div>
      )}

      {/* Action buttons — only for pending-moderation */}
      {review.status === 'pending-moderation' && (
        <div className="flex items-center gap-2 pt-1">
          {/* L3: Approve — R10+ */}
          <Gate
            role={['R10', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R22', 'R24']}
            fallback="hide"
          >
            <button
              type="button"
              onClick={() => onApprove(review.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-success text-white hover:bg-success/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
            >
              Approve
            </button>
          </Gate>

          {/* L3: Hide — R02+ */}
          <Gate
            role={['R02', 'R10', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R22', 'R24']}
            fallback="hide"
          >
            <button
              type="button"
              onClick={() => onHide(review.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-line text-ink-secondary hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Hide
            </button>
          </Gate>
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ReviewsModerationView() {
  const t = useTranslations('reviews');
  const { user } = useStaffAuth();
  const { toast, toasts, dismiss } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [hideDialogReviewId, setHideDialogReviewId] = useState<string | null>(null);

  const allReviews = useReviewsStore((s) => s.reviews);
  const approveReview = useReviewsStore((s) => s.approveReview);
  const hideReview = useReviewsStore((s) => s.hideReview);
  const selectPendingModeration = useReviewsStore((s) => s.selectPendingModeration);

  // L13: outlet scope for non-GM staff
  const isGM = user ? ['R19', 'R22', 'R24'].includes(user.role) : false;

  // Map staff outlet name → ID
  const outletIdMap: Record<string, string> = {
    bangalore: 'BLR-01',
    mumbai: 'MUM-01',
    chennai: 'CHE-01',
  };
  const userOutletId = user ? (outletIdMap[user.outlet] ?? undefined) : undefined;
  const scopedOutletId = isGM ? undefined : userOutletId;

  const pendingReviews = useMemo(
    () => selectPendingModeration(scopedOutletId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allReviews, scopedOutletId],
  );

  const approvedReviews = useMemo(
    () =>
      allReviews.filter(
        (r) =>
          r.status === 'approved' &&
          (isGM || r.outletId === scopedOutletId),
      ),
    [allReviews, isGM, scopedOutletId],
  );

  const hiddenReviews = useMemo(
    () =>
      allReviews.filter(
        (r) =>
          r.status === 'hidden' &&
          (isGM || r.outletId === scopedOutletId),
      ),
    [allReviews, isGM, scopedOutletId],
  );

  const tabReviews = {
    pending: pendingReviews,
    approved: approvedReviews,
    hidden: hiddenReviews,
  }[activeTab];

  // Search filter by VIN / customer first name
  const filtered = useMemo(() => {
    if (!search.trim()) return tabReviews;
    const q = search.toLowerCase();
    return tabReviews.filter(
      (r) =>
        r.vinOrJcId.toLowerCase().includes(q) ||
        r.customerFirstName.toLowerCase().includes(q) ||
        r.customerCity.toLowerCase().includes(q),
    );
  }, [tabReviews, search]);

  function handleApprove(id: string) {
    if (!user) return;
    try {
      approveReview(id, user.id ?? user.role);
      toast(t('approveSuccess'), 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('actionFailed'), 'error');
    }
  }

  function handleHideConfirm(reason: string) {
    if (!user || !hideDialogReviewId) return;
    try {
      hideReview(hideDialogReviewId, user.id ?? user.role, reason);
      toast(t('hideSuccess'), 'success');
      setHideDialogReviewId(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('actionFailed'), 'error');
      setHideDialogReviewId(null);
    }
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'pending', label: t('tabs.pending'), count: pendingReviews.length },
    { key: 'approved', label: t('tabs.approved'), count: approvedReviews.length },
    { key: 'hidden', label: t('tabs.hidden'), count: hiddenReviews.length },
  ];

  return (
    <Gate
      role={['R02', 'R10', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R22', 'R24']}
      fallback="hide"
    >
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">

        {/* Toast region */}
        {toasts.length > 0 && (
          <div
            role="region"
            aria-live="polite"
            aria-label="Notifications"
            className="fixed top-4 right-4 z-[200] flex flex-col gap-2"
          >
            {toasts.map((t_item) => (
              <div
                key={t_item.id}
                className="flex items-center gap-3 bg-bg-surface border border-line-strong rounded-md shadow-3 px-4 py-3 text-sm text-ink-primary max-w-sm"
              >
                <span className="flex-1">{t_item.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t_item.id)}
                  aria-label="Dismiss"
                  className="text-ink-muted hover:text-ink-primary"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Star size={20} className="text-accent" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-ink-primary">{t('title')}</h1>
            </div>
            <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="px-6 pt-4 flex items-center justify-between gap-4 shrink-0">
          {/* Tab row */}
          <div
            role="tablist"
            aria-label="Review status tabs"
            className="flex gap-1 border-b border-line w-full pb-0"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'px-3 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent -mb-px',
                    active
                      ? 'border-accent text-ink-primary'
                      : 'border-transparent text-ink-muted hover:text-ink-secondary',
                  ].join(' ')}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1.5 inline-block font-mono text-xs tabular-nums px-1.5 py-0.5 rounded-full bg-accent/10 text-accent leading-none">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 shrink-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-full max-w-xs rounded-md border border-line bg-bg-canvas px-3 py-1.5 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* List */}
        <div
          role="tabpanel"
          aria-label={TABS.find((t) => t.key === activeTab)?.label}
          className="flex-1 overflow-y-auto px-6 pb-6"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Star size={32} className="text-ink-muted mb-3" aria-hidden="true" />
              <p className="text-sm text-ink-secondary">{t('emptyState')}</p>
            </div>
          ) : (
            <div className="grid gap-4 mt-2">
              {filtered.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onApprove={handleApprove}
                  onHide={(id) => setHideDialogReviewId(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Hide dialog */}
        {hideDialogReviewId && (
          <HideDialog
            reviewId={hideDialogReviewId}
            onConfirm={handleHideConfirm}
            onCancel={() => setHideDialogReviewId(null)}
          />
        )}
      </div>
    </Gate>
  );
}
