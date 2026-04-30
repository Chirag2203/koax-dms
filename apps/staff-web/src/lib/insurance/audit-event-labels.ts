/**
 * Single source of truth for InsuranceAuditEventKind display labels.
 *
 * Using Record<InsuranceAuditEventKind, string> enforces compile-time
 * exhaustiveness — adding a new enum value without adding it here is a
 * typecheck error (DEF-INS-2).
 *
 * Spec reference: SPEC-INSURANCE-001 §20.1
 */

import type { InsuranceAuditEventKind } from '@dms/types';

export const INSURANCE_AUDIT_KIND_LABELS: Record<InsuranceAuditEventKind, string> = {
  lead_created:               'Lead Created',
  lead_closed_won:            'Lead Won',
  lead_closed_lost:           'Lead Lost',
  lead_stage_advanced:        'Stage Advanced',
  quote_saved:                'Quote Saved',
  quote_shared:               'Quote Shared',
  campaign_sent:              'Campaign Sent',
  ai_call_dispatched:         'AI Call Dispatched',
  template_submitted_dlt:     'Template → DLT',
  template_approved:          'Template Approved',
  commission_reconciled:      'Commission Reconciled',
  followup_outcome_recorded:  'Follow-up Outcome Recorded',
};

export function labelForInsuranceAuditKind(kind: InsuranceAuditEventKind): string {
  return INSURANCE_AUDIT_KIND_LABELS[kind] ?? kind;
}
