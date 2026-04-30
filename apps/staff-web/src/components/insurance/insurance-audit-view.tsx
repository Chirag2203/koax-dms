/**
 * InsuranceAuditView — append-only audit log for insurance module actions.
 *
 * Events: lead created/closed, quote saved/shared, campaign sent,
 *         AI call dispatched, template DLT submitted/approved,
 *         commission reconciled.
 *
 * Gate: R12+
 * Spec reference: SPEC-INSURANCE-001 §39 Task 3, L_INT_1
 * DEF-INS-1: UI canon polish — canonical Card/Field/Button primitives,
 *   canonical text scale, state-* token chips (shipped 2026-04-30).
 */

'use client';

import { useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { cn } from '@dms/ui';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';
import type { InsuranceAuditEventKind } from '@dms/types';
import { labelForInsuranceAuditKind } from '@/src/lib/insurance/audit-event-labels';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps event kind to a state-* token chip class. */
function kindChipClass(kind: InsuranceAuditEventKind): string {
  if (kind === 'lead_closed_won' || kind === 'template_approved' || kind === 'commission_reconciled') {
    return 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]';
  }
  if (kind === 'lead_closed_lost') {
    return 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]';
  }
  if (kind === 'campaign_sent' || kind === 'ai_call_dispatched') {
    return 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]';
  }
  if (kind === 'quote_shared') {
    return 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]';
  }
  return 'bg-bg-subtle text-ink-muted';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InsuranceAuditView() {
  const getAuditEvents = useInsuranceStore((s) => s.getAuditEvents);
  const events = getAuditEvents();

  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState<InsuranceAuditEventKind | ''>('');

  const filtered = events.filter((e) => {
    const matchKind = filterKind === '' || e.kind === filterKind;
    const matchSearch = search === '' ||
      e.entityId.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.actorId.toLowerCase().includes(search.toLowerCase());
    return matchKind && matchSearch;
  });

  return (
    <Gate role="R12" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-accent" aria-hidden="true" />
            <div>
              <h1 className="text-xl font-semibold text-ink-primary">Insurance Audit Log</h1>
              <p className="mt-0.5 text-sm text-ink-muted">
                Append-only record of all significant insurance module actions. R12+ only.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-ink-muted bg-bg-subtle px-2 py-1 rounded-md">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-line shrink-0 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by entity ID, description, actor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-md border border-line bg-bg-surface text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label="Search audit events"
            />
          </div>
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value as InsuranceAuditEventKind | '')}
            className="h-9 px-3 rounded-md border border-line bg-bg-surface text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Filter by event kind"
          >
            <option value="">All event types</option>
            <option value="lead_created">Lead Created</option>
            <option value="lead_closed_won">Lead Won</option>
            <option value="lead_closed_lost">Lead Lost</option>
            <option value="lead_stage_advanced">Stage Advanced</option>
            <option value="quote_saved">Quote Saved</option>
            <option value="quote_shared">Quote Shared</option>
            <option value="campaign_sent">Campaign Sent</option>
            <option value="ai_call_dispatched">AI Call Dispatched</option>
            <option value="template_submitted_dlt">Template DLT</option>
            <option value="template_approved">Template Approved</option>
            <option value="commission_reconciled">Commission Reconciled</option>
          </select>
        </div>

        {/* Audit table */}
        <div className="flex-1 overflow-auto scrollbar-thin-dark">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Shield size={32} className="text-ink-faint mb-3" aria-hidden="true" />
              <p className="text-sm text-ink-muted">
                {events.length === 0
                  ? 'No audit events yet. Actions within this session will appear here.'
                  : 'No events match your filters.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm" role="table" aria-label="Insurance audit log">
              <thead className="sticky top-0 bg-bg-subtle border-b border-line">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink-secondary text-xs whitespace-nowrap">Time</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink-secondary text-xs">Event</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink-secondary text-xs">Entity</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink-secondary text-xs">Description</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink-secondary text-xs">Actor</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-ink-secondary text-xs">Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr key={event.auditId} className="border-b border-line hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                      {formatDateTime(event.occurredAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-md', kindChipClass(event.kind))}>
                        {labelForInsuranceAuditKind(event.kind)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="font-mono text-xs text-ink-secondary">{event.entityId}</p>
                        <p className="text-xs text-ink-faint">{event.entityType}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-ink-primary max-w-xs">
                      <p className="line-clamp-2">{event.description}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">
                      {event.actorId}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded-md font-mono">
                        {event.actorRole}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-xs text-ink-muted">
            Audit events are append-only and session-scoped in v0. Persistent audit log via backend in v0.2.
          </p>
        </div>
      </div>
    </Gate>
  );
}
