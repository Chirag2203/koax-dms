'use client';

/**
 * Outlet list view — SPEC-SETTINGS-001 §6.2
 * L1: Always exactly 3 rows (BLR, MUM, CHE). No "Add Outlet" CTA.
 * L8: GSTIN and contact fields are not personal PII — displayed in full.
 * R12 read + R02+ edit.
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@dms/types';
import { Gate } from '@/src/components/primitives/gate';
import type { OutletConfig } from '@dms/types';

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      aria-label={`Status: ${active ? 'Active' : 'Inactive'}`}
      className={[
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs uppercase tracking-widest',
        active
          ? 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]'
          : 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-1.5 w-1.5 rounded-full',
          active ? 'bg-[rgb(var(--state-listed))]' : 'bg-[rgb(var(--state-stale))]',
        ].join(' ')}
        aria-hidden="true"
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Outlet row ───────────────────────────────────────────────────────────────

function OutletRow({
  outlet,
  canEdit,
  managerName,
}: {
  outlet: OutletConfig;
  canEdit: boolean;
  managerName: string;
}) {
  return (
    <tr className="border-b border-line hover:bg-bg-hover transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-accent uppercase tracking-widest bg-bg-subtle px-2 py-0.5 rounded-md border border-line">
          {outlet.code}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-ink-primary font-medium">{outlet.name}</td>
      <td className="px-4 py-3 text-sm text-ink-secondary">{outlet.address.city}</td>
      {/* L8: GSTIN is a business registration number — not personal PII */}
      <td className="px-4 py-3 font-mono text-xs text-ink-secondary">{outlet.gstin}</td>
      <td className="px-4 py-3 text-sm text-ink-secondary">
        {/* Seam 18: link to staff detail */}
        <Link
          href={`/staff/${outlet.managerId}`}
          className="text-accent hover:underline"
        >
          {managerName}
        </Link>
      </td>
      <td className="px-4 py-3">
        <StatusChip active={outlet.active} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Both buttons use the canonical secondary variant — visual parity */}
          <Link
            href={`/settings/outlets/${outlet.id.replace('outlet-', '')}`}
            className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-bg-surface text-ink-primary border border-line hover:bg-bg-subtle text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
          >
            View
          </Link>
          {canEdit && (
            <Link
              href={`/settings/outlets/${outlet.id.replace('outlet-', '')}?edit=1`}
              className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-accent text-white border border-accent hover:bg-accent/90 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
            >
              Edit
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function OutletListView() {
  const t = useTranslations('staff.settings');
  const { outlets, hydrated } = useSettingsStore();
  const { staffById } = useStaffStore();
  const { user } = useStaffAuth();

  const canEdit = user ? hasRank(user.role, 'R02') : false;

  const outletList = Object.values(outlets).sort((a, b) =>
    a.code.localeCompare(b.code),
  );

  if (!hydrated) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-bg-subtle rounded-md animate-pulse mb-6" />
        <div className="rounded-md border border-line bg-bg-surface">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border-b border-line px-4 flex items-center gap-4">
              <div className="h-5 w-12 bg-bg-subtle rounded-md animate-pulse" />
              <div className="h-4 w-48 bg-bg-subtle rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{t('outlets.title')}</h1>
          {/* L1: 3-outlet constraint — no "Add Outlet" CTA */}
          <p className="text-sm text-ink-muted mt-1">{t('outlets.subtitle')}</p>
        </div>
        {/* L1: No "+ Add Outlet" button — adding a 4th outlet is a v2 migration */}
      </div>

      <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-bg-subtle border-b border-line">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">City</th>
                {/* L8: GSTIN is a business number, not personal PII */}
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">GSTIN</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Manager</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outletList.map((outlet) => {
                const manager = staffById[outlet.managerId];
                return (
                  <OutletRow
                    key={outlet.id}
                    outlet={outlet}
                    canEdit={canEdit}
                    managerName={manager?.name ?? outlet.managerId}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
