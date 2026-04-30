/**
 * computeLeadScore — pure score helper.
 *
 * SPEC-LEADS-001 §6, L3.
 *
 * Score is a display-only computed value — never stored on the Lead entity.
 * Called from useMemo in UI components.
 *
 * HOT:  ≥ 3 contact activities (call/whatsapp/note) AND last activity ≤ 3 days ago
 * WARM: ≥ 1 contact activity AND last activity ≤ 7 days ago
 * COLD: 0 contact activities OR last activity > 7 days ago
 */

import type { Lead, LeadActivity, LeadScore } from '@dms/types';

const CONTACT_KINDS = new Set(['call', 'whatsapp', 'note'] as const);

export function computeLeadScore(lead: Lead, activities: LeadActivity[]): LeadScore {
  const leadActivities = activities.filter((a) => a.leadId === lead.id);
  const contactActivities = leadActivities.filter((a) =>
    CONTACT_KINDS.has(a.kind as 'call' | 'whatsapp' | 'note'),
  );

  const daysSinceLastActivity =
    (Date.now() - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);

  if (contactActivities.length >= 3 && daysSinceLastActivity <= 3) return 'HOT';
  if (contactActivities.length >= 1 && daysSinceLastActivity <= 7) return 'WARM';
  return 'COLD';
}

/** Maps score to StateChip variant token (SPEC-LEADS-001 L14) */
export function scoreToChipVariant(score: LeadScore): 'default' | 'warning' | 'error' {
  switch (score) {
    case 'HOT':  return 'error';
    case 'WARM': return 'warning';
    case 'COLD': return 'default';
  }
}

/** Maps score to display label */
export function scoreLabel(score: LeadScore): string {
  switch (score) {
    case 'HOT':  return 'Hot';
    case 'WARM': return 'Warm';
    case 'COLD': return 'Cold';
  }
}
