'use client';

/**
 * Settings Hub View — SPEC-SETTINGS-001 §6.1
 * L15: Hub gated at R12+. Sidebar entry hidden for R10 and below.
 * Six section cards arranged in a grid.
 */

import Link from 'next/link';
import {
  MapPin,
  ShieldCheck,
  Plug,
  ToggleRight,
  ClipboardList,
  Lock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@dms/types';
import { Gate } from '@/src/components/primitives/gate';

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
  disabledNote?: string;
}

function SectionCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  disabled = false,
  disabledNote,
}: SectionCardProps) {
  if (disabled) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-6 opacity-50 cursor-not-allowed">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-subtle border border-line flex-shrink-0">
            <Icon className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
              {badge && (
                <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-subtle text-ink-muted border border-line">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-1">{disabledNote ?? description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-line bg-bg-surface p-6 hover:border-accent/50 hover:bg-bg-hover transition-colors block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-subtle border border-line flex-shrink-0 group-hover:bg-accent/10 group-hover:border-accent/30 transition-colors">
          <Icon className="h-5 w-5 text-ink-secondary group-hover:text-accent transition-colors" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
            {badge && (
              <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Hub view ─────────────────────────────────────────────────────────────────

export function SettingsHubView() {
  const t = useTranslations('staff.settings');
  const { user } = useStaffAuth();
  const { outlets, credentials, flags } = useSettingsStore();

  const activeOutlets = Object.values(outlets).filter((o) => o.active).length;
  const connectedIntegrations = Object.values(credentials).filter(
    (c) => c.status === 'connected',
  ).length;
  const activeFlagCount = Object.values(flags).filter((f) => f.value === true).length;

  // R22+ can see integrations card; below shows restricted fallback
  const canSeeIntegrations =
    user ? (hasRank(user.role, 'R02') || hasRank(user.role, 'R22')) : false;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-primary">{t('hub.title')}</h1>
        <p className="text-sm text-ink-muted mt-1">{t('hub.subtitle')}</p>
      </div>

      {/* Section grid — L15: hub visible to R12+ (gated at route level) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Outlets */}
        <SectionCard
          href="/settings/outlets"
          icon={MapPin}
          title={t('hub.sections.outlets.title')}
          description={t('hub.sections.outlets.description')}
          badge={`${activeOutlets} active`}
        />

        {/* RBAC Matrix — L4: read-only */}
        <SectionCard
          href="/settings/rbac"
          icon={ShieldCheck}
          title={t('hub.sections.rbac.title')}
          description={t('hub.sections.rbac.description')}
          badge="Read-only"
        />

        {/* Integrations — R22+ only, others see restricted card */}
        {canSeeIntegrations ? (
          <SectionCard
            href="/settings/integrations"
            icon={Plug}
            title={t('hub.sections.integrations.title')}
            description={t('hub.sections.integrations.description')}
            badge={`${connectedIntegrations} connected`}
          />
        ) : (
          <div className="rounded-md border border-line bg-bg-surface p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-subtle border border-line flex-shrink-0 opacity-50">
                <Plug className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink-primary">{t('hub.sections.integrations.title')}</h3>
                <p className="text-xs text-ink-muted mt-1">{t('hub.sections.integrations.restrictedNote')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Flags */}
        <SectionCard
          href="/settings/feature-flags"
          icon={ToggleRight}
          title={t('hub.sections.featureFlags.title')}
          description={t('hub.sections.featureFlags.description')}
          badge={`${activeFlagCount} active`}
        />

        {/* Audit Log */}
        <SectionCard
          href="/settings/audit"
          icon={ClipboardList}
          title={t('hub.sections.audit.title')}
          description={t('hub.sections.audit.description')}
        />

        {/* v2 placeholder — RBAC edit */}
        <SectionCard
          href="#"
          icon={Lock}
          title={t('hub.sections.rbacEdit.title')}
          description={t('hub.sections.rbacEdit.description')}
          badge="v2"
          disabled
          disabledNote={t('hub.sections.rbacEdit.comingSoon')}
        />

      </div>
    </div>
  );
}
