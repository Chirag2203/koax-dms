'use client';

/**
 * ShootsQueueView — SPEC-SHOOTS-001 §6.1 (queue page)
 *
 * Stage-tabbed queue view: Pending / Scheduled / In Progress / Completed.
 * URL-driven tab state (?tab=pending|scheduled|in-progress|completed).
 *
 * PRE-FLIGHT UI CHECKLIST compliance:
 * - Card from custom-builds/shared/detail-card (not needed — list pattern)
 * - text-xs/sm/base/lg/xl/2xl only
 * - rounded-md only
 * - Gate primitive for RBAC where applicable
 * - i18n via useTranslations('shoots.*')
 */

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Camera, CalendarClock, Clock, CheckCircle2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useShootsStore } from '@/src/lib/shoots/shoots-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { hasRank } from '@dms/types';
import type { ShootStatus } from '@dms/types';
import type { Shoot } from '@dms/types';
import { ShootStatusChip } from './shoot-status-chip';
import { Button } from '@/src/components/primitives/button';
import { CreateShootDialog } from './create-shoot-dialog';

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabConfig = {
  key: ShootStatus;
  labelKey: string;
  icon: React.ElementType;
  emptyKey: string;
};

const TABS: TabConfig[] = [
  { key: 'pending',     labelKey: 'tabs.pending',    icon: Camera,        emptyKey: 'empty.pending' },
  { key: 'scheduled',   labelKey: 'tabs.scheduled',  icon: CalendarClock, emptyKey: 'empty.scheduled' },
  { key: 'in-progress', labelKey: 'tabs.inProgress', icon: Clock,         emptyKey: 'empty.inProgress' },
  { key: 'completed',   labelKey: 'tabs.completed',  icon: CheckCircle2,  emptyKey: 'empty.completed' },
];

const VALID_TABS: ShootStatus[] = ['pending', 'scheduled', 'in-progress', 'completed'];

// ─── Shoot row ────────────────────────────────────────────────────────────────

function ShootRow({ shoot }: { shoot: Shoot }) {
  const vinShort = shoot.vin.slice(-8);
  const vehicle = [shoot.vehicleYear, shoot.vehicleMake, shoot.vehicleModel]
    .filter(Boolean)
    .join(' ') || 'Vehicle';

  return (
    <Link
      href={`/shoots/${shoot.id}`}
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-md border border-line bg-bg-surface hover:bg-bg-hover transition-colors"
      aria-label={`View shoot detail: ${vehicle} — VIN ${shoot.vin}`}
    >
      {/* VIN + vehicle */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-primary truncate">{vehicle}</div>
        <div className="text-xs text-ink-muted font-mono mt-0.5 truncate">
          VIN …{vinShort}
        </div>
      </div>

      {/* Outlet */}
      <div className="hidden sm:block text-xs text-ink-muted font-mono w-14 text-center">
        {shoot.outletId}
      </div>

      {/* Photo count */}
      <div className="hidden md:flex items-center gap-1 text-xs text-ink-secondary w-24">
        <Camera size={13} aria-hidden="true" />
        <span className="tabular-nums">{shoot.assets.length}</span>
        <span className="text-ink-muted">/10 photos</span>
      </div>

      {/* Status chip */}
      <ShootStatusChip status={shoot.status} />

      {/* Scheduled date if any */}
      {shoot.scheduledAt && shoot.status !== 'completed' && (
        <div className="hidden lg:block text-xs text-ink-muted w-28 text-right">
          {new Date(shoot.scheduledAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          })}
        </div>
      )}
    </Link>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface ShootsQueueViewProps {
  activeTab: string;
}

export function ShootsQueueView({ activeTab }: ShootsQueueViewProps) {
  const t = useTranslations('shoots');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useStaffAuth();

  // All shoots from store — compute all tab counts upfront (Rules of Hooks)
  const allShoots = useShootsStore((s) => s.shoots);
  const [createOpen, setCreateOpen] = useState(false);

  // R11+ Marketing role can manually schedule a shoot
  const canSchedule = user ? hasRank(user.role, 'R11') : false;

  const currentTab: ShootStatus = VALID_TABS.includes(activeTab as ShootStatus)
    ? (activeTab as ShootStatus)
    : 'pending';

  // Compute per-status lists
  const shootsByStatus = useMemo(() => {
    const byStatus: Record<ShootStatus, Shoot[]> = {
      pending: [],
      scheduled: [],
      'in-progress': [],
      completed: [],
    };
    for (const shoot of Object.values(allShoots)) {
      byStatus[shoot.status].push(shoot);
    }
    // Sort each list by createdAt DESC
    for (const list of Object.values(byStatus)) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return byStatus;
  }, [allShoots]);

  const currentShoots = shootsByStatus[currentTab];

  function navigateTo(tab: ShootStatus) {
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.set('tab', tab);
    router.push(`/shoots?${next.toString()}`);
  }

  const currentTabConfig = TABS.find((tb) => tb.key === currentTab) ?? TABS[0]!;

  return (
    <div className="px-6 py-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">{t('title')}</h1>
          <p className="text-sm text-ink-muted mt-1">{t('description')}</p>
        </div>
        {canSchedule && (
          <Button
            variant="primary"
            onClick={() => setCreateOpen(true)}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            {t('scheduleShoot')}
          </Button>
        )}
      </div>

      {canSchedule && (
        <CreateShootDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      )}

      {/* ── Stage tabs ─────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Shoot stages"
        className="flex gap-1 border-b border-line"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = shootsByStatus[tab.key].length;
          const isActive = currentTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              onClick={() => navigateTo(tab.key)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
                isActive
                  ? 'border-accent text-ink-primary'
                  : 'border-transparent text-ink-muted hover:text-ink-secondary hover:border-line',
              ].join(' ')}
            >
              <Icon size={15} aria-hidden="true" />
              {t(tab.labelKey)}
              <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded-full bg-bg-subtle text-ink-muted ml-1">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content panel ──────────────────────────────────────────────────── */}
      <div
        id={`panel-${currentTab}`}
        role="tabpanel"
        aria-label={t(currentTabConfig.labelKey)}
      >
        {currentShoots.length === 0 ? (
          <div className="rounded-md border border-line bg-bg-surface px-6 py-12 text-center">
            <Camera
              size={32}
              className="mx-auto text-ink-muted mb-3"
              aria-hidden="true"
            />
            <p className="text-sm text-ink-muted">{t(currentTabConfig.emptyKey)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentShoots.map((shoot) => (
              <ShootRow key={shoot.id} shoot={shoot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
