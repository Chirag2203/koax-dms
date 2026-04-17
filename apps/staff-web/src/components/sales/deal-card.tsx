'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

function formatINR(amount: number): string {
  return INR_FORMATTER.format(amount);
}

function maskPhone(phone: string): string {
  // Mask middle digits: +91 98765 43210 → +91 98··· ···10
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length >= 10) {
    const last2 = cleaned.slice(-2);
    const first5 = cleaned.slice(0, 5);
    return `${first5}···  ···${last2}`;
  }
  return phone;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealCardProps {
  deal: Deal;
  onDragStart?: (deal: Deal) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DealCard({ deal, onDragStart }: DealCardProps) {
  return (
    <Link href={`/sales/leads/${deal.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-deal-id', deal.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart?.(deal);
        }}
        className={cn(
          'bg-bg-surface border border-line rounded-md p-3',
          'hover:border-accent/40 cursor-grab active:cursor-grabbing',
          'transition-colors relative select-none',
        )}
      >
        {/* Priority dot */}
        {deal.priority === 'high' && (
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[rgb(var(--state-overdue))]"
            aria-label="High priority"
          />
        )}
        {deal.priority === 'medium' && (
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[rgb(var(--state-pending))]"
            aria-label="Medium priority"
          />
        )}

        {/* Customer + source */}
        <div className="flex items-start justify-between mb-1 gap-2 pr-3">
          <h3 className="text-sm font-medium text-ink-primary truncate">{deal.customerName}</h3>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
            {deal.source === 'walk-in' ? 'WALK-IN' : deal.source.toUpperCase()}
          </span>
        </div>

        {/* Phone masked */}
        <p className="font-mono text-xs text-ink-muted mb-2">{maskPhone(deal.customerPhone)}</p>

        {/* Vehicle */}
        {deal.vehicleName && (
          <p className="text-[13px] text-ink-secondary mb-2 line-clamp-1">{deal.vehicleName}</p>
        )}

        {/* Amount */}
        <p className="font-mono text-[15px] text-ink-primary mb-2 tabular-nums">
          {deal.amount > 0 ? (
            <>&#8377; {formatINR(deal.amount)}</>
          ) : (
            <span className="text-ink-muted text-sm">No amount</span>
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-ink-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {timeAgo(deal.lastActivityAt)}
          </span>
          {deal.microStatus && (
            <span className="bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))] px-1.5 py-0.5 rounded text-[10px] font-medium">
              {deal.microStatus}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
