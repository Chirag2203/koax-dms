/**
 * BuildJobListView — table view of all Build Jobs.
 *
 * Mirrors DealListView in the sales module. Columns: title, customer, vehicle,
 * stage, vendor, quote total, days-in-stage, last-activity.
 * Sortable by stage and last-activity. Row click → detail.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §5 (P1.1 view toggle)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@dms/ui';
import type { BuildJob, CustomBuildVendor } from '@dms/types';
import { BuildStageChip } from '../shared/build-stage-chip';
import { formatINR, daysSince } from '../shared/format-inr';

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = 'stage' | 'updatedAt' | 'quoteTotal' | 'createdAt';

const STAGE_ORDER: Record<string, number> = {
  ENQUIRY: 0,
  QUOTED: 1,
  APPROVED: 2,
  PARTS_ORDERING: 3,
  IN_PROGRESS: 4,
  QC: 5,
  QC_FAILED: 6,
  DELIVERED: 7,
  CANCELLED: 8,
};

function sortJobs(jobs: BuildJob[], key: SortKey, dir: 'asc' | 'desc'): BuildJob[] {
  return [...jobs].sort((a, b) => {
    let cmp = 0;
    if (key === 'stage') {
      cmp = (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99);
    } else if (key === 'quoteTotal') {
      cmp = (a.quoteTotal ?? 0) - (b.quoteTotal ?? 0);
    } else {
      cmp = new Date(a[key]).getTime() - new Date(b[key]).getTime();
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

function getCustomerLabel(customerId: string): string {
  return customerId
    .replace('cust-', '')
    .split('-')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BuildJobListViewProps {
  jobs: BuildJob[];
  vendors: CustomBuildVendor[];
}

export function BuildJobListView({ jobs, vendors }: BuildJobListViewProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = sortJobs(jobs, sortKey, sortDir);

  function SortButton({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col;
    return (
      <button
        type="button"
        onClick={() => handleSort(col)}
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors',
          active ? 'text-accent' : 'text-ink-muted hover:text-ink-secondary',
        )}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <ArrowUpDown size={10} aria-hidden="true" />
      </button>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[15px] font-medium text-ink-primary">No build jobs</p>
        <p className="text-[13px] text-ink-muted mt-1">Create the first one with the button above.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line overflow-hidden">
      <table className="w-full text-left" role="table">
        <thead className="bg-bg-subtle border-b border-line">
          <tr role="row">
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider">Job</th>
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider">Customer</th>
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider">VIN</th>
            <th className="px-4 py-3">
              <SortButton label="Stage" col="stage" />
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider">Vendor</th>
            <th className="px-4 py-3">
              <SortButton label="Quote" col="quoteTotal" />
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider text-right">Days</th>
            <th className="px-4 py-3">
              <div className="flex justify-end">
                <SortButton label="Last Activity" col="updatedAt" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((job) => {
            const vendor = job.vendorId ? vendors.find((v) => v.id === job.vendorId) : undefined;
            const daysInStage = daysSince(job.updatedAt);
            const daysColor =
              daysInStage >= 14
                ? 'text-[rgb(var(--state-overdue))]'
                : daysInStage >= 7
                  ? 'text-[rgb(var(--state-in-refurb))]'
                  : 'text-ink-muted';

            return (
              <tr
                key={job.id}
                className="border-b border-line hover:bg-bg-hover transition-colors cursor-pointer"
                onClick={() => router.push(`/custom-builds/${job.id}`)}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/custom-builds/${job.id}`)}
                aria-label={`View build job: ${job.title}`}
              >
                <td className="px-4 py-3">
                  <p className="text-[13px] font-medium text-ink-primary truncate max-w-[180px]">{job.title}</p>
                  <p className="font-mono text-[10px] text-ink-muted">{job.id}</p>
                </td>
                <td className="px-4 py-3 text-[12px] text-ink-secondary">
                  {getCustomerLabel(job.customerId)}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[10px] text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                    {job.vin.slice(-6)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <BuildStageChip stage={job.stage} />
                </td>
                <td className="px-4 py-3 text-[12px] text-ink-secondary">
                  {vendor?.name ?? <span className="text-ink-muted italic text-[11px]">—</span>}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-primary tabular-nums">
                  {job.quoteTotal ? formatINR(job.quoteTotal) : <span className="text-ink-muted italic text-[11px]">—</span>}
                </td>
                <td className={cn('px-4 py-3 font-mono text-[12px] tabular-nums text-right', daysColor)}>
                  {daysInStage}d
                </td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-ink-muted tabular-nums">
                  {new Date(job.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
