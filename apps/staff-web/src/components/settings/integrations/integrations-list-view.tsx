'use client';

/**
 * Integrations list view — SPEC-SETTINGS-001 §6.5
 * L5: Credentials mocked. secretMasked shows last 4 chars only.
 * L11: Connection test stub — 800ms delay.
 * L16: Disconnect requires type-to-confirm "DISCONNECT".
 * R22+ or R02+ visibility.
 */

import Link from 'next/link';
import { Plug } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@dms/types';
import { INTEGRATION_DISPLAY } from '@/src/lib/settings/slices/integrations-slice';
import type { IntegrationProvider, IntegrationStatus } from '@dms/types';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { useState } from 'react';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config: Record<IntegrationStatus, { label: string; classes: string }> = {
    connected: {
      label: 'Connected',
      classes: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
    },
    disconnected: {
      label: 'Disconnected',
      classes: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
    },
    error: {
      label: 'Error',
      classes: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
    },
  };
  const { label, classes } = config[status];
  return (
    <span
      aria-label={`Status: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${classes}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── Integration card ─────────────────────────────────────────────────────────

function IntegrationCard({ provider }: { provider: IntegrationProvider }) {
  const t = useTranslations('staff.settings');
  const { credentials, testConnection, disconnectIntegration } = useSettingsStore();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [testing, setTesting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const cred = credentials[provider];
  const display = INTEGRATION_DISPLAY[provider];
  const canManage = user ? (hasRank(user.role, 'R02') || hasRank(user.role, 'R22')) : false;

  if (!cred) return null;

  const lastUsed = cred.lastUsedAt
    ? new Date(cred.lastUsedAt).toLocaleDateString('en-IN')
    : 'Never';

  const handleTest = async () => {
    if (!user) return;
    setTesting(true);
    try {
      // L11: 800ms stub
      const result = await testConnection(provider, { id: user.id, role: user.role });
      toast(`${display.name} — ${result.message}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('integrations.testFailed'), 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    if (!user) return;
    try {
      disconnectIntegration(provider, { id: user.id, role: user.role });
      toast(t('integrations.disconnectedToast', { name: display.name }), 'success');
      setDisconnectOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('integrations.disconnectFailed'), 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="rounded-md border border-line bg-bg-surface p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-subtle border border-line flex-shrink-0">
              <Plug className="h-5 w-5 text-ink-secondary" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink-primary">{display.name}</h3>
              <p className="text-xs text-ink-muted mt-0.5">{display.doc13Ref}</p>
            </div>
          </div>
          <StatusBadge status={cred.status} />
        </div>

        <div className="text-xs text-ink-muted">
          {t('integrations.lastUsed')}: <span className="text-ink-secondary">{lastUsed}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/settings/integrations/${provider}`}
            className="h-8 px-3 rounded-md text-xs font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('integrations.viewDetails')}
          </Link>

          {canManage && (
            <>
              {/* L11: Test connection stub */}
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="h-8 px-3 rounded-md text-xs font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {testing && (
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-ink-muted border-t-accent animate-spin" aria-hidden="true" />
                )}
                {testing ? t('integrations.testing') : t('integrations.testConnection')}
              </button>

              {/* L16: Disconnect with type-to-confirm */}
              {cred.status === 'connected' && (
                <button
                  type="button"
                  onClick={() => setDisconnectOpen(true)}
                  className="h-8 px-3 rounded-md text-xs font-medium border border-state-danger/40 text-state-danger hover:bg-state-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger"
                >
                  {t('integrations.disconnect')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* L16: Disconnect confirmation — requires "DISCONNECT" typed */}
      <AlertDialog
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        title={t('integrations.disconnectDialog.title', { name: display.name })}
        description={t('integrations.disconnectDialog.description', {
          name: display.name,
          deps: display.dependencies.join(', '),
        })}
        confirmLabel={t('integrations.disconnectDialog.confirm')}
        cancelLabel={t('common.cancel')}
        destructive
        requireTypeToConfirm="DISCONNECT"
        onConfirm={handleDisconnect}
      />
    </>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function IntegrationsListView() {
  const t = useTranslations('staff.settings');
  const { credentials, hydrated } = useSettingsStore();
  const { user } = useStaffAuth();

  const canSee = user ? (hasRank(user.role, 'R02') || hasRank(user.role, 'R22')) : false;

  if (!hydrated) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-md border border-line bg-bg-surface p-6 h-36 animate-pulse bg-bg-subtle" />
        ))}
      </div>
    );
  }

  if (!canSee) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-stale)/0.08)] border border-[rgb(var(--state-stale)/0.3)]">
          <p className="text-sm text-ink-primary">{t('integrations.restricted')}</p>
        </div>
      </div>
    );
  }

  const providers = Object.keys(credentials) as IntegrationProvider[];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-primary">{t('integrations.title')}</h1>
        <p className="text-sm text-ink-muted mt-1">{t('integrations.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <IntegrationCard key={provider} provider={provider} />
        ))}
      </div>
    </div>
  );
}
