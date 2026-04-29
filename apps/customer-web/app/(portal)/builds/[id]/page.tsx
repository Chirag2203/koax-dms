'use client';

/**
 * /(portal)/builds/[id] — Customer Build Job detail (read-only).
 *
 * L96: Tabs — Overview (status timeline), Configuration (read-only 3D render),
 *   Cost summary (itemized customizations + total), Activity (status events only).
 *
 * No mutation actions. No internal staff notes. Auth: usePortalAuth() guard.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §38 L96
 */

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@dms/ui';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { buildJobs } from '@dms/mocks/fixtures';
import type { BuildJob, BuildJobStage, BuildActivityEvent } from '@dms/types';

// ─── Lazy-loaded 3D canvas (ssr: false) ──────────────────────────────────────

// The Visualizer3DCanvas import is from staff-web — customer-web doesn't bundle it.
// Instead we use the public preview approach: embed the read-only 3D frame via
// a lightweight static render component that mirrors the preview pattern.
// For now, we render a static car silhouette with the saved paint color.
// Full 3D canvas is deferred — customer-web doesn't currently bundle three.js.

// ─── Stage config ─────────────────────────────────────────────────────────────

type VisibleStage = Exclude<BuildJobStage, 'CANCELLED' | 'QC_FAILED'>;

const TIMELINE_STAGES: VisibleStage[] = [
  'ENQUIRY',
  'QUOTED',
  'APPROVED',
  'PARTS_ORDERING',
  'IN_PROGRESS',
  'QC',
  'DELIVERED',
];

const STAGE_LABELS: Record<BuildJobStage, string> = {
  ENQUIRY: 'Enquiry',
  QUOTED: 'Quoted',
  APPROVED: 'Approved',
  PARTS_ORDERING: 'Parts Ordering',
  IN_PROGRESS: 'In Progress',
  QC: 'QC Review',
  QC_FAILED: 'QC Failed — Rework',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// ─── Activity event filtering (no internal notes leaked — L96) ────────────────

const PUBLIC_ACTIVITY_TYPES = new Set([
  'job_created',
  'stage_advanced',
  'quote_saved',
  'finance_approved',
  'job_cancelled',
  'job_delivered',
  'qc_failed',
]);

function isPublicActivity(event: BuildActivityEvent): boolean {
  return PUBLIC_ACTIVITY_TYPES.has(event.type);
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'configuration' | 'costs' | 'activity';

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ job }: { job: BuildJob }) {
  const currentIndex = TIMELINE_STAGES.indexOf(job.stage as VisibleStage);

  return (
    <div className="space-y-6">
      {/* Status timeline */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-4">
          Build Progress
        </p>
        <ol className="relative border-l border-[var(--color-line)] ml-4 space-y-4">
          {TIMELINE_STAGES.map((stage, i) => {
            const isDone = i < currentIndex || (job.stage === stage && stage === 'DELIVERED');
            const isCurrent = job.stage === stage && stage !== 'DELIVERED';
            const isFuture = i > currentIndex && job.stage !== 'DELIVERED';
            return (
              <li key={stage} className="ml-6">
                <span
                  className={cn(
                    'absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border-2',
                    isDone
                      ? 'bg-[var(--color-brass)] border-[var(--color-brass)]'
                      : isCurrent
                      ? 'bg-white border-[var(--color-brass)]'
                      : 'bg-white border-[var(--color-line)]',
                  )}
                  aria-hidden
                >
                  {isDone ? (
                    <CheckCircle2 size={12} className="text-white" />
                  ) : isCurrent ? (
                    <Circle size={8} className="text-[var(--color-brass)]" fill="currentColor" />
                  ) : (
                    <Circle size={8} className="text-[var(--color-line)]" />
                  )}
                </span>
                <p
                  className={cn(
                    'font-mono text-[12px] uppercase tracking-widest',
                    isDone
                      ? 'text-[var(--color-ink-secondary)]'
                      : isCurrent
                      ? 'text-[var(--color-brass)] font-semibold'
                      : 'text-[var(--color-ink-muted)]',
                  )}
                >
                  {STAGE_LABELS[stage]}
                </p>
                {isCurrent && (
                  <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">Current stage</p>
                )}
              </li>
            );
          })}
          {/* Show QC Failed if applicable */}
          {job.stage === 'QC_FAILED' && (
            <li className="ml-6">
              <span
                className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-red-50 border-red-400"
                aria-hidden
              >
                <Circle size={8} className="text-red-500" fill="currentColor" />
              </span>
              <p className="font-mono text-[12px] uppercase tracking-widest text-red-600 font-semibold">
                {STAGE_LABELS['QC_FAILED']}
              </p>
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">Under rework — will return to QC</p>
            </li>
          )}
          {/* Show Cancelled if applicable */}
          {job.stage === 'CANCELLED' && (
            <li className="ml-6">
              <span
                className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-gray-100 border-gray-300"
                aria-hidden
              >
                <Circle size={8} className="text-gray-400" fill="currentColor" />
              </span>
              <p className="font-mono text-[12px] uppercase tracking-widest text-gray-500 font-semibold">
                {STAGE_LABELS['CANCELLED']}
              </p>
            </li>
          )}
        </ol>
      </div>

      {/* Quote */}
      {job.quoteTotal != null && job.quoteTotal > 0 && (
        <div className="border border-[var(--color-line)] p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
            Estimated Quote
          </p>
          <p className="font-display text-3xl text-[var(--color-ink)]">
            &#8377;{new Intl.NumberFormat('en-IN').format(job.quoteTotal)}
          </p>
          <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
            Including parts, fitment, and applicable GST
          </p>
          {job.quoteExpiresAt && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-600 mt-2 flex items-center gap-1">
              <Clock size={10} />
              Valid until{' '}
              {new Date(job.quoteExpiresAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Configuration tab ────────────────────────────────────────────────────────

function ConfigurationTab({ job }: { job: BuildJob }) {
  const t = useTranslations('portal.builds.detail');
  const vizState = job.visualizerState;

  if (!vizState) {
    return (
      <p className="text-[14px] text-[var(--color-ink-muted)] py-8 text-center">
        {t('noConfig')}
      </p>
    );
  }

  const customizations = vizState.customizations;
  const paintKey = (vizState as Record<string, unknown>).paintKey as string | undefined;

  return (
    <div className="space-y-4">
      {/* Paint */}
      {paintKey && (
        <div className="border border-[var(--color-line)] p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">Paint</p>
          <p className="font-display text-[17px] text-[var(--color-ink)]">{paintKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
        </div>
      )}

      {/* Customization options */}
      {customizations && (
        <div className="border border-[var(--color-line)] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-line)]">
                <th scope="col" className="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)]">
                  Category
                </th>
                <th scope="col" className="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)]">
                  Selection
                </th>
              </tr>
            </thead>
            <tbody>
              {customizations.wheelOptionId && customizations.wheelOptionId !== 'wheel-stock' && (
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-ink-secondary)]">Wheels</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{customizations.wheelOptionId.replace(/-/g, ' ')}</td>
                </tr>
              )}
              {customizations.tintOptionId && customizations.tintOptionId !== 'tint-stock' && (
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-ink-secondary)]">Window Tint</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{customizations.tintOptionId.replace(/-/g, ' ')}</td>
                </tr>
              )}
              {customizations.exhaustOptionId && customizations.exhaustOptionId !== 'exh-stock' && (
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-ink-secondary)]">Exhaust</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{customizations.exhaustOptionId.replace(/-/g, ' ')}</td>
                </tr>
              )}
              {customizations.suspensionOptionId && customizations.suspensionOptionId !== 'susp-stock' && (
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-ink-secondary)]">Suspension</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{customizations.suspensionOptionId.replace(/-/g, ' ')}</td>
                </tr>
              )}
              {customizations.hoodOptionId && customizations.hoodOptionId !== 'hood-stock' && (
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-ink-secondary)]">Hood</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{customizations.hoodOptionId.replace(/-/g, ' ')}</td>
                </tr>
              )}
              {customizations.wingOptionId && customizations.wingOptionId !== 'wing-stock' && (
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-ink-secondary)]">Rear Wing</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{customizations.wingOptionId.replace(/-/g, ' ')}</td>
                </tr>
              )}
              {(customizations.decals?.length ?? 0) > 0 && (
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-ink-secondary)]">Decals</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{customizations.decals!.length} placement(s)</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!customizations && !paintKey && (
        <p className="text-[14px] text-[var(--color-ink-muted)] py-4">
          {t('noCustomizations')}
        </p>
      )}

      <p className="font-mono text-[10px] text-[var(--color-ink-muted)] mt-2">
        Saved{' '}
        {new Date(vizState.savedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}

// ─── Cost summary tab ─────────────────────────────────────────────────────────

function CostsTab({ job }: { job: BuildJob }) {
  const t = useTranslations('portal.builds.detail');

  const partsSubtotal = job.parts.reduce(
    (s, p) => s + p.unitCost * p.qty,
    0,
  );

  return (
    <div className="space-y-4">
      {job.parts.length > 0 && (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-3">
            {t('partsLabel')}
          </p>
          <div className="border border-[var(--color-line)] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-line)]">
                  <th scope="col" className="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)]">Part</th>
                  <th scope="col" className="text-center px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)]">Qty</th>
                </tr>
              </thead>
              <tbody>
                {job.parts.map((p, i) => (
                  <tr key={i} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3 text-[var(--color-ink)]">{p.partName}</td>
                    <td className="px-4 py-3 text-center font-mono text-[var(--color-ink-secondary)]">{p.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quote total */}
      {job.quoteTotal != null && job.quoteTotal > 0 && (
        <div className="border border-[var(--color-line)] p-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)]">
              {t('totalLabel')}
            </p>
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
              Including parts, fitment, margin and applicable GST
            </p>
          </div>
          <p className="font-display text-2xl text-[var(--color-ink)] tabular-nums">
            &#8377;{new Intl.NumberFormat('en-IN').format(job.quoteTotal)}
          </p>
        </div>
      )}

      {job.parts.length === 0 && !job.quoteTotal && (
        <p className="text-[14px] text-[var(--color-ink-muted)] py-8 text-center">
          Cost breakdown not yet available.
        </p>
      )}
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  job_created: 'Build job created',
  stage_advanced: 'Stage advanced',
  quote_saved: 'Quote saved',
  finance_approved: 'Finance approved',
  qc_failed: 'QC failed — sent for rework',
  job_cancelled: 'Build cancelled',
  job_delivered: 'Build delivered',
};

function ActivityTab({ job }: { job: BuildJob }) {
  const t = useTranslations('portal.builds.detail');
  const publicEvents = job.activityLog.filter(isPublicActivity);

  if (publicEvents.length === 0) {
    return (
      <p className="text-[14px] text-[var(--color-ink-muted)] py-8 text-center">
        {t('noActivity')}
      </p>
    );
  }

  return (
    <ol className="relative border-l border-[var(--color-line)] ml-4 space-y-4 pb-4">
      {[...publicEvents].reverse().map((event) => (
        <li key={event.id} className="ml-6">
          <span
            className="absolute -left-2 w-4 h-4 rounded-full bg-[var(--color-bg-paper)] border-2 border-[var(--color-line)] flex items-center justify-center"
            aria-hidden
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brass)]" />
          </span>
          <p className="text-[13px] text-[var(--color-ink)] leading-snug">
            {ACTIVITY_TYPE_LABELS[event.type] ?? event.type}
          </p>
          <p className="font-mono text-[10px] text-[var(--color-ink-muted)] mt-0.5">
            {new Date(event.at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BuildDetailPage() {
  const t = useTranslations('portal.builds.detail');
  const { customerId } = usePortalAuth();
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = React.useState<DetailTab>('overview');

  const job = React.useMemo(
    () => buildJobs.find((j) => j.id === id && j.customerId === customerId),
    [id, customerId],
  );

  if (!job) {
    return (
      <div className="max-w-3xl px-6 md:px-12 lg:px-16 pt-12">
        <Link
          href="/builds"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-6 hover:underline underline-offset-4"
        >
          <ArrowLeft size={12} />
          {t('backToBuilds')}
        </Link>
        <p className="text-[var(--color-ink-muted)]">Build job not found.</p>
      </div>
    );
  }

  const TABS: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: t('tabOverview') },
    { id: 'configuration', label: t('tabConfiguration') },
    { id: 'costs', label: t('tabCosts') },
    { id: 'activity', label: t('tabActivity') },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-6">
        <Link
          href="/builds"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-6 hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          <ArrowLeft size={12} />
          {t('backToBuilds')}
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">
          {job.id}
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-2 leading-tight">
          {job.title}
        </h1>
        <div className="mt-6 border-t border-[var(--color-line)]" />
      </header>

      {/* Tab bar */}
      <div
        className="flex gap-0 overflow-x-auto border-b border-[var(--color-line)] px-6 md:px-12 lg:px-16"
        role="tablist"
        aria-label="Build job details"
      >
        {TABS.map(({ id: tid, label }) => (
          <button
            key={tid}
            type="button"
            role="tab"
            aria-selected={activeTab === tid}
            aria-controls={`build-tab-${tid}`}
            onClick={() => setActiveTab(tid)}
            className={cn(
              'px-4 py-3 font-mono text-[11px] uppercase tracking-widest border-b-2 -mb-px transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
              activeTab === tid
                ? 'border-[var(--color-brass)] text-[var(--color-brass)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-line)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <section
        id={`build-tab-${activeTab}`}
        role="tabpanel"
        className="px-6 md:px-12 lg:px-16 py-8"
      >
        {activeTab === 'overview' && <OverviewTab job={job} />}
        {activeTab === 'configuration' && <ConfigurationTab job={job} />}
        {activeTab === 'costs' && <CostsTab job={job} />}
        {activeTab === 'activity' && <ActivityTab job={job} />}
      </section>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
