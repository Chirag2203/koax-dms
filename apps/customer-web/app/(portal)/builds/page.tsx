'use client';

/**
 * /(portal)/builds — Customer's Custom Build Jobs list.
 *
 * L96: Read-only view of own builds (filtered by customerId).
 * No mutation actions exposed. No internal notes leaked.
 *
 * Uses fixture import from @dms/mocks/fixtures (same pattern as service/bookings).
 * Auth: usePortalAuth() for customerId — only shows jobs where build.customerId === currentCustomer.id.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §38 L96
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Hammer, Clock } from 'lucide-react';
import { cn } from '@dms/ui';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { buildJobs } from '@dms/mocks/fixtures';
import type { BuildJob, BuildJobStage } from '@dms/types';

// ─── Stage label ──────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<BuildJobStage, string> = {
  ENQUIRY: 'Enquiry',
  QUOTED: 'Quoted',
  APPROVED: 'Approved',
  PARTS_ORDERING: 'Parts Ordering',
  IN_PROGRESS: 'In Progress',
  QC: 'QC Review',
  QC_FAILED: 'QC Failed',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STAGE_COLORS: Record<BuildJobStage, string> = {
  ENQUIRY: 'bg-gray-50 border-gray-300 text-gray-600',
  QUOTED: 'bg-blue-50 border-blue-300 text-blue-700',
  APPROVED: 'bg-green-50 border-green-300 text-green-700',
  PARTS_ORDERING: 'bg-amber-50 border-amber-300 text-amber-700',
  IN_PROGRESS: 'bg-indigo-50 border-indigo-300 text-indigo-700',
  QC: 'bg-purple-50 border-purple-300 text-purple-700',
  QC_FAILED: 'bg-red-50 border-red-300 text-red-700',
  DELIVERED: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  CANCELLED: 'bg-gray-50 border-gray-200 text-gray-400',
};

// ─── Build card ───────────────────────────────────────────────────────────────

function BuildJobCard({ job }: { job: BuildJob }) {
  const t = useTranslations('portal.builds.list');
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="border border-[var(--color-line)] p-4 md:p-5">
      {/* Top row: title + stage */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-mono text-[12px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-0.5">
            {job.id}
          </p>
          <p className="font-display text-[17px] text-[var(--color-ink)] leading-tight">
            {job.title}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest flex-shrink-0',
            STAGE_COLORS[job.stage],
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 shrink-0" />
          {STAGE_LABELS[job.stage]}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
        {job.quoteTotal != null && job.quoteTotal > 0 && (
          <span className="font-mono text-[12px] text-[var(--color-ink-secondary)]">
            {t('estimateLabel')}: &#8377;{new Intl.NumberFormat('en-IN').format(job.quoteTotal)}
          </span>
        )}
        <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--color-ink-muted)]">
          <Clock size={11} strokeWidth={1.5} />
          {t('lastUpdated', { days: daysSinceUpdate })}
        </span>
      </div>

      {/* Action */}
      <Link
        href={`/builds/${job.id}`}
        className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        {t('viewDetail')} →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BuildsListPage() {
  const t = useTranslations('portal.builds.list');
  const { customerId } = usePortalAuth();

  const myBuilds = React.useMemo(
    () =>
      buildJobs
        .filter((j) => j.customerId === customerId)
        .sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [customerId],
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
          {t('title')}
        </h1>
        <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* List */}
      <section
        className="px-6 md:px-12 lg:px-16 pb-16"
        aria-live="polite"
        aria-label="Custom build jobs"
      >
        {myBuilds.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[var(--color-line)]">
            <Hammer
              size={36}
              className="mx-auto mb-4 text-[var(--color-ink-muted)]"
              strokeWidth={1}
            />
            <p className="font-display text-xl italic text-[var(--color-ink-secondary)] mb-6">
              {t('empty')}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)]">
              {t('emptyCta')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myBuilds.map((job) => (
              <BuildJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
