'use client';

/**
 * Integration detail view — SPEC-SETTINGS-001 §6.6
 * L5: secretMasked — last 4 chars visible, rest masked.
 * L11: Test connection stub — 800ms delay → "OK — mocked".
 * L14: Re-connect shows deferred notice per CLAUDE.md §10 item 15.
 * L16: Disconnect requires "DISCONNECT" type-to-confirm.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@dms/types';
import { INTEGRATION_DISPLAY } from '@/src/lib/settings/slices/integrations-slice';
import type { IntegrationProvider, IntegrationStatus } from '@dms/types';

const VALID_PROVIDERS: IntegrationProvider[] = [
  'whatsapp_bsp', 'dlt_sms', 'irp_einvoicing', 'aadhaar_sub_kua', 'razorpay', 'tally_prime',
];

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config: Record<IntegrationStatus, { label: string; classes: string }> = {
    connected: { label: 'Connected', classes: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]' },
    disconnected: { label: 'Disconnected', classes: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]' },
    error: { label: 'Error', classes: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]' },
  };
  const { label, classes } = config[status];
  return (
    <span aria-label={`Status: ${label}`} className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${classes}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

interface IntegrationDetailViewProps {
  provider: string;
}

export function IntegrationDetailView({ provider }: IntegrationDetailViewProps) {
  const t = useTranslations('staff.settings');
  const { credentials, testConnection, disconnectIntegration, hydrated } = useSettingsStore();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [testing, setTesting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider as IntegrationProvider)) {
    notFound();
  }

  const typedProvider = provider as IntegrationProvider;
  const display = INTEGRATION_DISPLAY[typedProvider];
  const cred = credentials[typedProvider];
  const canManage = user ? (hasRank(user.role, 'R02') || hasRank(user.role, 'R22')) : false;

  if (!hydrated) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-bg-subtle rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-bg-subtle rounded-md animate-pulse" />
          <div className="h-48 bg-bg-subtle rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  if (!cred) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.3)]">
          <p className="text-sm text-ink-primary">{t('integrations.notFound')}</p>
        </div>
      </div>
    );
  }

  const handleTest = async () => {
    if (!user) return;
    setTesting(true);
    try {
      // L11: 800ms stub — disabled during pending
      const result = await testConnection(typedProvider, { id: user.id, role: user.role });
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
      disconnectIntegration(typedProvider, { id: user.id, role: user.role });
      toast(t('integrations.disconnectedToast', { name: display.name }), 'success');
      setDisconnectOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('integrations.disconnectFailed'), 'error');
    }
  };

  // L14: Re-connect stub — deferred per spec S-S-14
  const handleReconnect = () => {
    toast(t('integrations.reconnectDeferred'), 'info');
    // No store action — per CLAUDE.md §10 item 15: deferred actions show explicit notice
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-ink-primary">{display.name}</h1>
              <StatusBadge status={cred.status} />
            </div>
            <p className="text-xs text-ink-muted mt-1">{display.doc13Ref}</p>
          </div>

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-2">
              {/* L11: Test connection */}
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {testing && (
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-ink-muted border-t-accent animate-spin" aria-hidden="true" />
                )}
                {testing ? t('integrations.testing') : t('integrations.testConnection')}
              </button>

              {/* L16: Disconnect */}
              {cred.status === 'connected' && (
                <button
                  type="button"
                  onClick={() => setDisconnectOpen(true)}
                  className="h-9 px-4 rounded-md text-sm font-medium border border-state-danger/40 text-state-danger hover:bg-state-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger"
                >
                  {t('integrations.disconnect')}
                </button>
              )}

              {/* L14: Re-connect stub */}
              {cred.status === 'disconnected' && (
                <button
                  type="button"
                  onClick={handleReconnect}
                  className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t('integrations.reconnect')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Credential card — L5: masked secret */}
          <Card title={t('integrations.detail.credentialCard')}>
            <dl className="grid grid-cols-1 gap-y-4">
              <Field
                label={t('integrations.detail.secret')}
                value={<span className="font-mono text-xs">{cred.secretMasked}</span>}
              />
              {cred.endpoint && (
                <Field
                  label={t('integrations.detail.endpoint')}
                  value={<span className="font-mono text-xs">{cred.endpoint}</span>}
                />
              )}
              <Field
                label={t('integrations.detail.connectedAt')}
                value={cred.connectedAt ? new Date(cred.connectedAt).toLocaleDateString('en-IN') : '—'}
              />
              <Field
                label={t('integrations.detail.lastTest')}
                value={
                  cred.connectionTestResult ? (
                    <span className={cred.connectionTestResult.ok ? 'text-[rgb(var(--state-listed))]' : 'text-[rgb(var(--state-overdue))]'}>
                      {cred.connectionTestResult.message}
                    </span>
                  ) : (
                    <span className="text-ink-muted">{t('integrations.detail.notTested')}</span>
                  )
                }
              />
              <Field
                label={t('integrations.detail.lastUsed')}
                value={cred.lastUsedAt ? new Date(cred.lastUsedAt).toLocaleDateString('en-IN') : '—'}
              />
            </dl>
          </Card>

          {/* Used by card */}
          <Card title={t('integrations.detail.usedBy')}>
            <ul className="space-y-2">
              {display.dependencies.map((dep) => (
                <li key={dep} className="flex items-center gap-2 text-sm text-ink-secondary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />
                  {dep}
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-muted mt-4">{t('integrations.detail.usedByNote')}</p>
          </Card>
        </div>
      </div>

      {/* L16: Disconnect confirmation */}
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
