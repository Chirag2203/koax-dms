/**
 * ProviderCatalogView — list all active insurance providers.
 *
 * Gate: R09+
 * Spec reference: SPEC-INSURANCE-001 §12.1
 */

'use client';

import { useMemo } from 'react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';
import { ShieldCheck, Wrench, TrendingUp } from 'lucide-react';

// ─── Card / Field primitives (matches staff-profile-tab + custom-builds overview-tab) ─

function Card({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-ink-primary mt-1">{value ?? '—'}</dd>
    </div>
  );
}

export function ProviderCatalogView() {
  const allProviders = useInsuranceStore((s) => s.providers);
  const providers = useMemo(() => allProviders.filter((p) => p.active), [allProviders]);

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="text-2xl font-semibold leading-snug text-ink-primary">Insurance Providers</h1>
            <p className="mt-0.5 text-sm text-ink-muted leading-relaxed">
              {providers.length} active providers in the BN Automobiles aggregator network
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-ink-muted">No providers found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {providers.map((provider) => {
                const availableAddons = provider.addonCatalog.filter((a) => a.available);
                return (
                  <Card
                    key={provider.id}
                    title={provider.name}
                    rightSlot={
                      <span className="text-xs font-mono text-ink-muted">{provider.irdaiRegNo}</span>
                    }
                  >
                    {/* Logo */}
                    <div className="w-16 h-10 rounded-md bg-bg-subtle flex items-center justify-center mb-4 overflow-hidden border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={provider.logoUrl} alt={`${provider.name} logo`} className="w-full h-full object-contain" />
                    </div>

                    {/* Key metrics row */}
                    <dl className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="bg-bg-subtle rounded-md p-2">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <TrendingUp size={10} className="text-success" aria-hidden="true" />
                          <dd className="text-sm font-semibold text-ink-primary tabular-nums">{provider.claimSettlementRatio}%</dd>
                        </div>
                        <dt className="text-xs text-ink-muted">CSR</dt>
                      </div>
                      <div className="bg-bg-subtle rounded-md p-2">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Wrench size={10} className="text-ink-muted" aria-hidden="true" />
                          <dd className="text-sm font-semibold text-ink-primary tabular-nums">{(provider.networkGaragesCount / 1000).toFixed(0)}K</dd>
                        </div>
                        <dt className="text-xs text-ink-muted">Garages</dt>
                      </div>
                      <div className="bg-bg-subtle rounded-md p-2">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <ShieldCheck size={10} className="text-accent" aria-hidden="true" />
                          <dd className="text-sm font-semibold text-ink-primary tabular-nums">{provider.commissionPct}%</dd>
                        </div>
                        <dt className="text-xs text-ink-muted">Commission</dt>
                      </div>
                    </dl>

                    {/* Addons */}
                    <div className="pt-3 border-t border-line">
                      <Field
                        label="Available Addons"
                        value={
                          <div className="flex flex-wrap gap-1 mt-1">
                            {availableAddons.slice(0, 4).map((addon) => (
                              <span key={addon.code} className="text-xs bg-bg-subtle text-ink-secondary px-1.5 py-0.5 rounded-md">
                                {addon.label}
                              </span>
                            ))}
                            {availableAddons.length > 4 && (
                              <span className="text-xs text-ink-muted">+{availableAddons.length - 4} more</span>
                            )}
                          </div>
                        }
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* IRDAI disclaimer */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-xs text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Insurance is the subject matter of solicitation.
          </p>
        </div>
      </div>
    </Gate>
  );
}
