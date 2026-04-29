'use client';

/**
 * Feature flags list view — SPEC-SETTINGS-001 §6.7
 * L6: In-memory toggle only in v1 (DEF-SETTINGS-1).
 * L12: Reads exclusively from registry.
 * R02+ toggle; R12 read-only.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@dms/types';

export function FlagsListView() {
  const t = useTranslations('staff.settings');
  const { flags, toggleFlag, hydrated } = useSettingsStore();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const [confirmFlag, setConfirmFlag] = useState<{ key: string; newValue: boolean } | null>(null);

  const canToggle = user ? hasRank(user.role, 'R02') : false;
  const flagList = Object.values(flags).sort((a, b) => a.key.localeCompare(b.key));

  if (!hydrated) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-bg-subtle rounded-md animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-bg-subtle rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  const handleToggleRequest = (key: string, currentValue: boolean | string) => {
    // L6: Only boolean flags are togglable in v1
    if (typeof currentValue !== 'boolean') {
      toast(t('featureFlags.nonBooleanToggle'), 'info');
      return;
    }
    // Show confirmation for disabling flags (sensitive action per Doc 14 §28)
    setConfirmFlag({ key, newValue: !currentValue });
  };

  const handleToggleConfirm = () => {
    if (!user || !confirmFlag) return;
    try {
      toggleFlag(confirmFlag.key, confirmFlag.newValue, { id: user.id, role: user.role });
      const statusWord = confirmFlag.newValue ? 'ON' : 'OFF';
      // L6: in-memory only until v1.1
      toast(t('featureFlags.toggledToast', { key: confirmFlag.key, status: statusWord }), 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('featureFlags.toggleFailed'), 'error');
    } finally {
      setConfirmFlag(null);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{t('featureFlags.title')}</h1>
          <p className="text-sm text-ink-muted mt-1">{t('featureFlags.subtitle')}</p>
        </div>

        {/* L6: In-memory banner */}
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-pending)/0.08)] border border-[rgb(var(--state-pending)/0.3)]">
          <p className="text-sm text-ink-primary">{t('featureFlags.inMemoryBanner')}</p>
        </div>

        {/* Flag table */}
        <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-bg-subtle border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Key</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Default</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Owning Spec</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Scope</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Updated</th>
                  {/* R02+ only toggle column */}
                  {canToggle && (
                    <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Toggle</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {flagList.map((flag) => {
                  const isBoolValue = typeof flag.value === 'boolean';
                  const boolValue = isBoolValue ? (flag.value as boolean) : null;

                  return (
                    <tr key={flag.key} className="border-b border-line hover:bg-bg-hover transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-bg-subtle px-2 py-0.5 rounded-md border border-line text-ink-primary">
                          {flag.key}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isBoolValue ? (
                          <span
                            className={[
                              'inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest',
                              boolValue
                                ? 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]'
                                : 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
                            ].join(' ')}
                          >
                            {boolValue ? 'true' : 'false'}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-ink-secondary">{String(flag.value)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {String(flag.defaultValue)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-accent">
                        {flag.owningSpec}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-ink-muted uppercase">{flag.scope}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary max-w-xs">{flag.description}</td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {new Date(flag.updatedAt).toLocaleDateString('en-IN')}
                      </td>
                      {/* R02+ only toggle */}
                      {canToggle && (
                        <td className="px-4 py-3">
                          {isBoolValue ? (
                            <button
                              type="button"
                              onClick={() => handleToggleRequest(flag.key, flag.value)}
                              aria-label={`Toggle ${flag.key} — currently ${boolValue ? 'on' : 'off'}`}
                              className={[
                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                                boolValue ? 'bg-accent' : 'bg-bg-subtle border border-line',
                              ].join(' ')}
                            >
                              <span
                                className={[
                                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                                  boolValue ? 'translate-x-4' : 'translate-x-0.5',
                                ].join(' ')}
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-ink-muted">{t('featureFlags.nonBoolean')}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Toggle confirmation dialog — S-S-6 */}
      {confirmFlag && (
        <AlertDialog
          open={confirmFlag !== null}
          onClose={() => setConfirmFlag(null)}
          title={t('featureFlags.toggleDialog.title', {
            action: confirmFlag.newValue ? 'Enable' : 'Disable',
            key: confirmFlag.key,
          })}
          description={t('featureFlags.toggleDialog.description', {
            key: confirmFlag.key,
            owningSpec: flags[confirmFlag.key]?.owningSpec ?? '',
          })}
          confirmLabel={t('featureFlags.toggleDialog.confirm')}
          cancelLabel={t('common.cancel')}
          destructive={!confirmFlag.newValue}
          onConfirm={handleToggleConfirm}
        />
      )}
    </>
  );
}
