/**
 * BuildJobCard — Kanban card for a single Build Job.
 *
 * L43 (locked): Mirrors sales deal-card pattern:
 *   - customer name bold + priority dot
 *   - full vehicle name + full VIN (mono, copyable badge)
 *   - quote total large bold
 *   - time-ago chip with Clock icon
 *   - micro-status badge (stage-derived)
 *   - card width ~280px
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §5.1, L43
 */

'use client';

import Link from 'next/link';
import { Clock, Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@dms/ui';
import type { BuildJob, BuildJobStage } from '@dms/types';
import { BuildStageChip } from '../shared/build-stage-chip';
import { formatINR } from '../shared/format-inr';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length >= 10) {
    const last2 = cleaned.slice(-2);
    const first5 = cleaned.slice(0, 5);
    return `${first5}··· ···${last2}`;
  }
  return phone;
}

function getMicroStatus(stage: BuildJobStage, job: BuildJob): string {
  switch (stage) {
    case 'ENQUIRY': return 'New enquiry';
    case 'QUOTED': return job.quoteTotal ? 'Quote ready' : 'Awaiting quote';
    case 'APPROVED': return job.financeApprovalAt ? 'Finance approved' : 'Quote approved';
    case 'PARTS_ORDERING': return 'Parts sourcing';
    case 'IN_PROGRESS': return job.vendorId ? 'Vendor assigned' : 'Build in progress';
    case 'QC': return 'Quality check';
    case 'QC_FAILED': return 'QC failed — rework needed';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
    default: return '';
  }
}

function getMicroStatusClass(stage: BuildJobStage): string {
  switch (stage) {
    case 'ENQUIRY': return 'bg-bg-subtle text-ink-muted';
    case 'QUOTED': return 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]';
    case 'APPROVED': return 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]';
    case 'PARTS_ORDERING': return 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]';
    case 'IN_PROGRESS': return 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]';
    case 'QC': return 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]';
    case 'QC_FAILED': return 'bg-[rgb(var(--state-overdue)/0.12)] text-[rgb(var(--state-overdue))]';
    case 'DELIVERED': return 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]';
    case 'CANCELLED': return 'bg-bg-subtle text-ink-muted';
    default: return 'bg-bg-subtle text-ink-muted';
  }
}

// ─── VIN copy badge ───────────────────────────────────────────────────────────

function VinCopyBadge({ vin }: { vin: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void navigator.clipboard.writeText(vin).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [vin],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy VIN ${vin}`}
      className={cn(
        'inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded',
        'bg-bg-subtle text-ink-muted border border-line/60 transition-colors',
        'hover:bg-bg-hover hover:text-ink-secondary',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
      )}
    >
      {vin}
      {copied
        ? <Check size={9} className="text-accent" aria-hidden />
        : <Copy size={9} aria-hidden />}
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildJobCardProps {
  job: BuildJob;
  customerName: string;
  customerPhone?: string;
  vehicleName: string;
  vendorName?: string;
  isDragging?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BuildJobCard({
  job,
  customerName,
  customerPhone,
  vehicleName,
  vendorName,
  isDragging,
}: BuildJobCardProps) {
  const microStatus = getMicroStatus(job.stage, job);
  const microStatusClass = getMicroStatusClass(job.stage);

  // Priority dot: show for QC_FAILED (high urgency) and long-running jobs
  const isUrgent = job.stage === 'QC_FAILED';
  const priorityDotClass = isUrgent ? 'bg-[rgb(var(--state-overdue))]' : null;

  return (
    <Link
      href={`/custom-builds/${job.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
    >
      <div
        className={cn(
          'bg-bg-surface border border-line rounded-md p-3',
          'hover:border-accent/40 cursor-grab active:cursor-grabbing',
          'transition-colors relative select-none',
          isDragging && 'opacity-60 shadow-lg rotate-1',
        )}
        aria-label={`Build job ${job.title} for ${customerName}`}
      >
        {/* Priority dot */}
        {priorityDotClass && (
          <span
            className={cn('absolute top-2 right-2 w-2 h-2 rounded-full', priorityDotClass)}
            aria-label="Urgent — QC failed"
          />
        )}

        {/* Customer name + vendor badge (mirrors sales source badge position) */}
        <div className="flex items-start justify-between mb-1 gap-2 pr-3">
          <h3 className="text-sm font-medium text-ink-primary truncate">{customerName}</h3>
          {vendorName && (
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded truncate max-w-[90px]">
              {vendorName}
            </span>
          )}
        </div>

        {/* Phone masked */}
        {customerPhone && (
          <p className="font-mono text-xs text-ink-muted mb-2">
            {maskPhone(customerPhone)}
          </p>
        )}

        {/* Vehicle name */}
        <p className="text-[13px] text-ink-secondary mb-2 line-clamp-1">{vehicleName}</p>

        {/* VIN — copyable mono badge (custom-builds-specific, sits below vehicle name) */}
        <div className="mb-2">
          <VinCopyBadge vin={job.vin} />
        </div>

        {/* Quote total — mirrors sales amount styling exactly */}
        <p className="font-mono text-[15px] text-ink-primary mb-2 tabular-nums">
          {job.quoteTotal ? (
            <>&#8377; {formatINR(job.quoteTotal)}</>
          ) : (
            <span className="text-ink-muted text-sm font-normal">No quote</span>
          )}
        </p>

        {/* Footer: time-ago chip + micro-status badge */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-ink-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {timeAgo(job.updatedAt)}
          </span>
          {microStatus && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', microStatusClass)}>
              {microStatus}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
