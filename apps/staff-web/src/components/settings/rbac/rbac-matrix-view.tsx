'use client';

/**
 * RBAC Matrix View — SPEC-SETTINGS-001 §6.4
 * L4: Read-only in v1. No edit affordance.
 * L13: Grouped by domain. Sticky headers. Search + domain filter.
 * L17: Source is Doc 14 §§4-26 (encoded in rbac-matrix.ts).
 *
 * R20/R21 are external (customer/consignor) — noted in header.
 */

import { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Download, CheckCircle2, MinusCircle, HelpCircle, Users, User } from 'lucide-react';
import { cn } from '@dms/ui';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { Gate } from '@/src/components/primitives/gate';
import {
  RBAC_MATRIX_ROWS,
  RBAC_ROLE_COLUMNS,
  RBAC_DOMAIN_ORDER,
  ROLE_DISPLAY_NAMES,
  type RbacCell,
  type RbacDomain,
} from '@/src/lib/settings/rbac-matrix';

// ─── Cell renderer ────────────────────────────────────────────────────────────

function MatrixCell({ cell, condNote }: { cell: RbacCell | undefined; condNote?: string }) {
  const base = 'flex items-center justify-center w-8 h-6';

  if (!cell || cell === 'deny') {
    return (
      <div className={base} aria-label="Deny">
        <MinusCircle className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
      </div>
    );
  }
  if (cell === 'allow') {
    return (
      <div className={base} aria-label="Allow">
        <CheckCircle2 className="h-3.5 w-3.5 text-[rgb(var(--state-listed))]" aria-hidden="true" />
      </div>
    );
  }
  if (cell === 'conditional') {
    return (
      <div className={base} aria-label={condNote ?? 'Conditional'} title={condNote}>
        <HelpCircle className="h-3.5 w-3.5 text-[rgb(var(--state-stale))]" aria-hidden="true" />
      </div>
    );
  }
  if (cell === 'team') {
    return (
      <div className={base} aria-label={condNote ?? 'Team scope'} title={condNote}>
        <Users className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
      </div>
    );
  }
  if (cell === 'self') {
    return (
      <div className={base} aria-label="Self scope">
        <User className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
      </div>
    );
  }
  return null;
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function RbacMatrixView() {
  const t = useTranslations('staff.settings');
  const { logRbacViewed, logRbacExported } = useSettingsStore();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [search, setSearch] = useState('');
  const [activeDomains, setActiveDomains] = useState<Set<RbacDomain>>(new Set(RBAC_DOMAIN_ORDER));

  // L17: Log that RBAC matrix was viewed
  useEffect(() => {
    if (user) {
      logRbacViewed({ id: user.id, role: user.role });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDomain = (domain: RbacDomain) => {
    setActiveDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  // Filter rows by search and active domains
  const filteredRows = useMemo(() => {
    return RBAC_MATRIX_ROWS.filter((row) => {
      if (!activeDomains.has(row.action.domain)) return false;
      if (search.trim()) {
        return row.action.name.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [search, activeDomains]);

  // Group filtered rows by domain
  const rowsByDomain = useMemo(() => {
    const groups: Record<string, typeof filteredRows> = {};
    for (const row of filteredRows) {
      const d = row.action.domain;
      if (!groups[d]) groups[d] = [];
      groups[d]!.push(row);
    }
    return groups;
  }, [filteredRows]);

  const handleExportCsv = () => {
    if (!user) return;
    // Build CSV
    const header = ['Action', 'Domain', ...RBAC_ROLE_COLUMNS].join(',');
    const dataRows = RBAC_MATRIX_ROWS.map((row) => {
      const cells = RBAC_ROLE_COLUMNS.map((role) => {
        const cell = row.cells[role];
        return cell ?? 'deny';
      });
      return [
        `"${row.action.name}"`,
        `"${row.action.domain}"`,
        ...cells,
      ].join(',');
    });
    const csv = [header, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rbac-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logRbacExported({ id: user.id, role: user.role });
    toast(t('rbac.exportedToast'), 'success');
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-primary">{t('rbac.title')}</h1>
            <p className="text-sm text-ink-muted mt-1">{t('rbac.subtitle')}</p>
          </div>
          {/* Export — R12+ */}
          <Gate role="R12" fallback="hide">
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('rbac.exportCsv')}
            </button>
          </Gate>
        </div>

        {/* L4: Read-only banner */}
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-pending)/0.08)] border border-[rgb(var(--state-pending)/0.3)]">
          <p className="text-sm text-ink-primary">{t('rbac.readOnlyBanner')}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('rbac.searchPlaceholder')}
              className="h-9 w-full bg-bg-subtle border border-line rounded-md pl-9 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              aria-label={t('rbac.searchPlaceholder')}
            />
          </div>

          {/* Domain filter chips */}
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by domain">
            {RBAC_DOMAIN_ORDER.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => toggleDomain(domain)}
                aria-pressed={activeDomains.has(domain)}
                className={cn(
                  'h-7 px-2.5 rounded text-xs font-medium border transition-colors',
                  activeDomains.has(domain)
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-bg-subtle border-line text-ink-muted hover:text-ink-primary hover:border-ink-secondary',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {domain.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Matrix table */}
        <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              {/* Sticky header with role codes */}
              <thead className="bg-bg-subtle border-b border-line sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 bg-bg-subtle px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider min-w-[240px] z-20 border-r border-line">
                    Action
                  </th>
                  {RBAC_ROLE_COLUMNS.map((role) => (
                    <th
                      key={role}
                      className="px-1 py-3 text-xs font-semibold text-ink-muted text-center min-w-[36px]"
                      title={ROLE_DISPLAY_NAMES[role]}
                    >
                      {role}
                    </th>
                  ))}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-bg-subtle px-4 py-1 text-xs text-ink-muted border-r border-line">
                    R20/R21 are external (customer/consignor) — managed on customer-web
                  </td>
                  {RBAC_ROLE_COLUMNS.map((role) => (
                    <td key={role} className="px-1 py-1 text-xs text-ink-muted text-center truncate max-w-[36px]" title={ROLE_DISPLAY_NAMES[role]}>
                    </td>
                  ))}
                </tr>
              </thead>

              <tbody>
                {RBAC_DOMAIN_ORDER.filter((d) => activeDomains.has(d) && rowsByDomain[d]?.length).map((domain) => (
                  <>
                    {/* Domain heading row */}
                    <tr key={`heading-${domain}`} className="bg-bg-subtle">
                      <td
                        colSpan={RBAC_ROLE_COLUMNS.length + 1}
                        className="sticky left-0 px-4 py-2 text-xs font-semibold text-ink-secondary uppercase tracking-wider border-b border-t border-line"
                      >
                        {domain}
                      </td>
                    </tr>

                    {/* Action rows */}
                    {rowsByDomain[domain]?.map((row) => (
                      <tr
                        key={row.action.id}
                        className={cn(
                          'border-b border-line hover:bg-bg-hover transition-colors',
                          row.action.sensitive && 'bg-[rgb(var(--state-pending)/0.04)]',
                        )}
                      >
                        <td className="sticky left-0 bg-bg-surface px-4 py-2 text-sm text-ink-primary border-r border-line min-w-[240px]">
                          <span className={cn(row.action.sensitive && 'font-medium')}>
                            {row.action.name}
                          </span>
                          {row.action.sensitive && (
                            <span className="ml-2 font-mono text-xs text-[rgb(var(--state-pending))] uppercase tracking-wider">
                              sensitive
                            </span>
                          )}
                        </td>
                        {RBAC_ROLE_COLUMNS.map((role) => (
                          <td key={role} className="px-1 py-2 text-center">
                            <MatrixCell
                              cell={row.cells[role]}
                              condNote={row.condNotes?.[role]}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={RBAC_ROLE_COLUMNS.length + 1}
                      className="px-4 py-12 text-center text-sm text-ink-muted"
                    >
                      {t('rbac.noResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-ink-muted flex-wrap">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[rgb(var(--state-listed))]" aria-hidden="true" /> Allow</span>
          <span className="flex items-center gap-1.5"><MinusCircle className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" /> Deny</span>
          <span className="flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5 text-[rgb(var(--state-stale))]" aria-hidden="true" /> Conditional (hover for note)</span>
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Team scope</span>
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Self scope</span>
        </div>
      </div>
    </>
  );
}
