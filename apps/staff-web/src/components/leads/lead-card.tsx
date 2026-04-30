/**
 * LeadCard — Kanban card for a single lead.
 *
 * SPEC-LEADS-001 §9.1
 * Pre-flight: text-xs/sm only, rounded-md, no arbitrary px sizes, no inline hasRank.
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, User } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Lead, LeadActivity } from '@dms/types';
import { computeLeadScore } from '@/src/lib/leads/lead-score';
import { LeadScoreChip } from './lead-score-chip';

interface LeadCardProps {
  lead: Lead;
  activities: LeadActivity[];
  customerName: string;
  vehicleName?: string;
  advisorName?: string;
  isDragging?: boolean;
}

function formatNextAction(nextActionAt: string | undefined): { label: string; urgent: boolean } {
  if (!nextActionAt) return { label: '', urgent: false };
  const diff = new Date(nextActionAt).getTime() - Date.now();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 0) return { label: 'Overdue', urgent: true };
  if (hours < 24) return { label: `${Math.round(hours)}h`, urgent: true };
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  return { label: `${days}d`, urgent: false };
}

export function LeadCard({ lead, activities, customerName, vehicleName, advisorName, isDragging }: LeadCardProps) {
  const router = useRouter();

  const score = useMemo(() => computeLeadScore(lead, activities), [lead, activities]);
  const nextAction = useMemo(() => formatNextAction(lead.nextActionAt), [lead.nextActionAt]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Lead for ${customerName}`}
      onClick={() => router.push(`/leads/${lead.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/leads/${lead.id}`); }}
      className={cn(
        'rounded-md border border-line bg-bg-surface p-3 cursor-pointer',
        'hover:border-accent/40 hover:bg-bg-hover transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        isDragging && 'opacity-50',
      )}
    >
      {/* Customer name + score */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-ink-primary truncate">{customerName}</span>
        <LeadScoreChip score={score} />
      </div>

      {/* Vehicle interest */}
      {vehicleName && (
        <p className="text-xs text-ink-muted truncate mb-2">{vehicleName}</p>
      )}

      {/* Footer: advisor + next action */}
      <div className="flex items-center justify-between gap-2">
        {advisorName ? (
          <span className="flex items-center gap-1 text-xs text-ink-muted">
            <User size={11} aria-hidden="true" />
            <span className="truncate">{advisorName.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
          </span>
        ) : (
          <span className="text-xs text-ink-muted italic">Unassigned</span>
        )}
        {nextAction.label && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              nextAction.urgent ? 'text-state-error' : 'text-ink-muted',
            )}
          >
            <Clock size={11} aria-hidden="true" />
            {nextAction.label}
          </span>
        )}
      </div>

      {/* Lead ID + source */}
      <div className="mt-2 pt-2 border-t border-line/50 flex items-center justify-between">
        <span className="text-xs font-mono text-ink-muted">{lead.id}</span>
        <span className="text-xs text-ink-muted capitalize">{lead.source.replace('-', ' ')}</span>
      </div>
    </div>
  );
}
