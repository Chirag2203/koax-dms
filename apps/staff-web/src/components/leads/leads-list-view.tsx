/**
 * LeadsListView — tabular list view of leads.
 *
 * SPEC-LEADS-001 §9.1 (list view toggle)
 * text-xs/sm only, rounded-md, no arbitrary px.
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Lead, LeadActivity } from '@dms/types';
import { computeLeadScore } from '@/src/lib/leads/lead-score';
import { LeadScoreChip } from './lead-score-chip';
import { LeadStageChip } from './lead-stage-chip';

interface LeadsListViewProps {
  leads: Lead[];
  activities: LeadActivity[];
  customerNames: Record<string, string>;
  vehicleNames: Record<string, string>;
}

export function LeadsListView({ leads, activities, customerNames, vehicleNames }: LeadsListViewProps) {
  const router = useRouter();

  const leadsWithScore = useMemo(
    () => leads.map((l) => ({ lead: l, score: computeLeadScore(l, activities) })),
    [leads, activities],
  );

  if (leads.length === 0) {
    return <p className="text-sm text-ink-muted">No leads found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-muted uppercase tracking-wider">
            <th className="text-left pb-3 pr-4 font-medium">Lead</th>
            <th className="text-left pb-3 pr-4 font-medium">Customer</th>
            <th className="text-left pb-3 pr-4 font-medium">Vehicle</th>
            <th className="text-left pb-3 pr-4 font-medium">Stage</th>
            <th className="text-left pb-3 pr-4 font-medium">Score</th>
            <th className="text-left pb-3 pr-4 font-medium">Source</th>
            <th className="text-left pb-3 font-medium">Outlet</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/50">
          {leadsWithScore.map(({ lead, score }) => (
            <tr
              key={lead.id}
              className="hover:bg-bg-hover cursor-pointer transition-colors"
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <td className="py-3 pr-4">
                <span className="font-mono text-xs text-ink-muted">{lead.id}</span>
              </td>
              <td className="py-3 pr-4 font-medium text-ink-primary">
                {customerNames[lead.customerId] ?? lead.customerId}
              </td>
              <td className="py-3 pr-4 text-ink-secondary text-xs">
                {lead.vehicleInterestVin
                  ? (vehicleNames[lead.vehicleInterestVin] ?? lead.vehicleInterestVin)
                  : '—'}
              </td>
              <td className="py-3 pr-4">
                <LeadStageChip stage={lead.stage} />
              </td>
              <td className="py-3 pr-4">
                <LeadScoreChip score={score} />
              </td>
              <td className="py-3 pr-4 text-xs text-ink-muted capitalize">
                {lead.source.replace('-', ' ')}
              </td>
              <td className="py-3 text-xs text-ink-muted uppercase">
                {lead.outletId === 'bangalore' ? 'BLR' : lead.outletId === 'mumbai' ? 'MUM' : 'CHE'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
