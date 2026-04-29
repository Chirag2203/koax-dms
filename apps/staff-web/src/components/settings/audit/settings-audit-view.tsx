'use client';

/**
 * Settings audit log view — SPEC-SETTINGS-001 §6.8
 * L7: Every mutation produces a SettingsAuditEvent.
 * L14: Retention 3 years. Retention notice at bottom.
 * Filters: date range, event kind, actor search.
 * S-S-11, S-S-12.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@dms/types';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import type { SettingsAuditEvent, SettingsAuditEventKind } from '@dms/types';

const EVENT_KIND_OPTIONS: SettingsAuditEventKind[] = [
  'outlet-edit',
  'outlet-deactivated',
  'outlet-reactivated',
  'integration-connected',
  'integration-disconnected',
  'integration-test',
  'feature-flag-toggled',
  'rbac-matrix-viewed',
  'rbac-matrix-exported',
];

function EventKindBadge({ kind }: { kind: SettingsAuditEventKind }) {
  const colorMap: Record<string, string> = {
    'outlet-edit': 'bg-accent/10 text-accent',
    'outlet-deactivated': 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
    'outlet-reactivated': 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
    'integration-connected': 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
    'integration-disconnected': 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
    'integration-test': 'bg-bg-subtle text-ink-muted',
    'feature-flag-toggled': 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
    'rbac-matrix-viewed': 'bg-bg-subtle text-ink-muted',
    'rbac-matrix-exported': 'bg-bg-subtle text-ink-muted',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${colorMap[kind] ?? 'bg-bg-subtle text-ink-muted'}`}>
      {kind}
    </span>
  );
}

function DiffRow({ label, before, after }: { label: string; before: unknown; after: unknown }) {
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  return (
    <div className={`grid grid-cols-3 gap-2 text-xs py-1 ${changed ? 'bg-[rgb(var(--state-pending)/0.06)] -mx-2 px-2 rounded' : ''}`}>
      <dt className="text-ink-muted font-mono">{label}</dt>
      <dd className="text-ink-secondary font-mono truncate">{JSON.stringify(before) ?? '—'}</dd>
      <dd className={`font-mono truncate ${changed ? 'text-[rgb(var(--state-pending))] font-medium' : 'text-ink-secondary'}`}>
        {JSON.stringify(after) ?? '—'}
      </dd>
    </div>
  );
}

function AuditRow({ event }: { event: SettingsAuditEvent }) {
  const [expanded, setExpanded] = useState(false);
  const { staffById } = useStaffStore();
  const actor = staffById[event.actorId];
  const actorName = actor?.name ?? event.actorId;

  const hasDiff = event.before && Object.keys(event.before).length > 0;

  return (
    <>
      <tr
        className="border-b border-line hover:bg-bg-hover transition-colors cursor-pointer"
        onClick={() => hasDiff && setExpanded((e) => !e)}
        aria-expanded={hasDiff ? expanded : undefined}
      >
        <td className="px-4 py-3 text-xs font-mono text-ink-muted whitespace-nowrap">
          {new Date(event.at).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3 text-sm text-ink-secondary whitespace-nowrap">
          {actorName}
          <span className="ml-1 font-mono text-[10px] text-ink-muted">{event.actorRole}</span>
        </td>
        <td className="px-4 py-3">
          <EventKindBadge kind={event.kind} />
        </td>
        <td className="px-4 py-3 font-mono text-xs text-ink-secondary">{event.subject}</td>
        <td className="px-4 py-3 text-xs text-ink-muted">
          {event.note ?? (
            hasDiff
              ? `${Object.keys(event.after ?? {}).join(', ')} changed`
              : event.kind
          )}
        </td>
        <td className="px-4 py-3">
          {hasDiff && (
            <button
              type="button"
              aria-label={expanded ? 'Collapse diff' : 'Expand diff'}
              className="text-ink-muted hover:text-ink-primary"
              onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr className="bg-bg-subtle border-b border-line">
          <td colSpan={6} className="px-6 py-3">
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-2 text-[10px] text-ink-muted uppercase tracking-wider mb-2">
                <span>Field</span>
                <span>Before</span>
                <span>After</span>
              </div>
              {Object.keys(event.after ?? {}).map((key) => (
                <DiffRow
                  key={key}
                  label={key}
                  before={event.before?.[key]}
                  after={event.after?.[key]}
                />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SettingsAuditView() {
  const t = useTranslations('staff.settings');
  const { auditLog, hydrated } = useSettingsStore();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const [kindFilter, setKindFilter] = useState<SettingsAuditEventKind | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [actorSearch, setActorSearch] = useState('');

  const { staffById } = useStaffStore();

  const filteredLog = useMemo(() => {
    return [...auditLog]
      .reverse()
      .filter((e) => {
        if (kindFilter && e.kind !== kindFilter) return false;
        if (fromDate && e.at < fromDate) return false;
        if (toDate && e.at > toDate + 'T23:59:59Z') return false;
        if (actorSearch.trim()) {
          const actor = staffById[e.actorId];
          const name = actor?.name?.toLowerCase() ?? e.actorId.toLowerCase();
          if (!name.includes(actorSearch.toLowerCase())) return false;
        }
        return true;
      });
  }, [auditLog, kindFilter, fromDate, toDate, actorSearch, staffById]);

  const handleExport = () => {
    if (!user) return;
    const header = ['Timestamp', 'Actor', 'Role', 'Kind', 'Subject', 'Summary'].join(',');
    const rows = filteredLog.map((e) => {
      const actor = staffById[e.actorId];
      return [
        e.at,
        actor?.name ?? e.actorId,
        e.actorRole,
        e.kind,
        e.subject,
        e.note ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header, ...rows].join('\n');
    // Watermark per L14 / Doc 14 §24
    const watermarked = `# BN Automobiles DMS — Settings Audit Export\n# Exported by: ${user.name} (${user.role}) at ${new Date().toISOString()}\n# Confidential — authorised personnel only\n\n${csv}`;
    const blob = new Blob([watermarked], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('audit.exportedToast'), 'success');
  };

  if (!hydrated) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-bg-subtle rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-primary">{t('audit.title')}</h1>
            <p className="text-sm text-ink-muted mt-1">{t('audit.subtitle')}</p>
          </div>
          {user && hasRank(user.role, 'R12') && (
            <button
              type="button"
              onClick={handleExport}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('audit.exportCsv')}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label={t('audit.filters.from')}
            className="h-9 bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <span className="text-ink-muted text-sm">→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label={t('audit.filters.to')}
            className="h-9 bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as SettingsAuditEventKind | '')}
            aria-label={t('audit.filters.kind')}
            className="h-9 bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          >
            <option value="">{t('audit.filters.allKinds')}</option>
            {EVENT_KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            type="search"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            placeholder={t('audit.filters.actorSearch')}
            aria-label={t('audit.filters.actorSearch')}
            className="h-9 bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 min-w-[180px]"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-bg-subtle border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{t('audit.columns.timestamp')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{t('audit.columns.actor')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{t('audit.columns.kind')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{t('audit.columns.subject')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{t('audit.columns.summary')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredLog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-muted">
                      {t('audit.empty')}
                    </td>
                  </tr>
                ) : (
                  filteredLog.map((event) => (
                    <AuditRow key={event.id} event={event} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* L14: Retention notice */}
        <p className="text-xs text-ink-muted">{t('audit.retentionNotice')}</p>
      </div>
    </>
  );
}
