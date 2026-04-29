/**
 * ProviderDetailView — per-provider detail page.
 *
 * Displays:
 *   - Commission %, claim settlement ratio, network garage count
 *   - Full addon catalog (available + unavailable)
 *   - Historical issued policies for this provider (count + total premium)
 *   - NCB slab table
 *
 * Gate: R09+
 * Spec reference: SPEC-INSURANCE-001 §12.1, §39, Task 3 (Provider details)
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Wrench, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';

interface Props {
  providerId: string;
}

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

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

export function ProviderDetailView({ providerId }: Props) {
  // Pull base arrays — derive filtered slices via useMemo to avoid infinite renders
  const allProviders = useInsuranceStore((s) => s.providers);
  const allPolicies = useInsuranceStore((s) => s.policies);
  const provider = useMemo(
    () => allProviders.find((p) => p.id === providerId),
    [allProviders, providerId],
  );
  const policies = useMemo(
    () => allPolicies.filter((p) => p.providerId === providerId),
    [allPolicies, providerId],
  );

  if (!provider) {
    return (
      <Gate role="R09" fallback="hide">
        <div className="flex flex-col h-full items-center justify-center bg-bg-canvas">
          <ShieldCheck size={40} className="text-ink-faint mb-4" aria-hidden="true" />
          <p className="text-sm text-ink-muted">Provider not found.</p>
          <Link href="/insurance/providers" className="mt-4 text-sm text-accent hover:underline">
            Back to providers
          </Link>
        </div>
      </Gate>
    );
  }

  const totalIssuedPremium = policies.reduce((sum, p) => sum + p.totalPremium, 0);
  const totalCommission = policies.reduce((sum, p) => sum + p.commissionEarned, 0);

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line shrink-0">
          <Link
            href="/insurance/providers"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary mb-3"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All Providers
          </Link>
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-20 h-12 rounded-md bg-bg-subtle flex items-center justify-center overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={provider.logoUrl} alt={`${provider.name} logo`} className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-ink-primary">{provider.name}</h1>
              <p className="text-sm text-ink-muted">
                IRDAI Reg No.{' '}
                <span className="font-mono text-ink-secondary">{provider.irdaiRegNo}</span>
                {!provider.active && (
                  <span className="ml-2 text-xs text-error bg-error/10 px-1.5 py-0.5 rounded-md">Inactive</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-md border border-line bg-bg-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-success" aria-hidden="true" />
                <span className="text-xs text-ink-muted uppercase tracking-wide">Claim Settlement</span>
              </div>
              <p className="text-2xl font-semibold text-ink-primary tabular-nums">{provider.claimSettlementRatio}%</p>
              <p className="text-xs text-ink-muted">FY24 (IRDAI Annual Report)</p>
            </div>
            <div className="rounded-md border border-line bg-bg-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wrench size={14} className="text-ink-muted" aria-hidden="true" />
                <span className="text-xs text-ink-muted uppercase tracking-wide">Network Garages</span>
              </div>
              <p className="text-2xl font-semibold text-ink-primary tabular-nums">
                {(provider.networkGaragesCount / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-ink-muted">Pan-India cashless network</p>
            </div>
            <div className="rounded-md border border-line bg-bg-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-accent" aria-hidden="true" />
                <span className="text-xs text-ink-muted uppercase tracking-wide">Commission Rate</span>
              </div>
              <p className="text-2xl font-semibold text-ink-primary tabular-nums">{provider.commissionPct}%</p>
              <p className="text-xs text-ink-muted">of total premium</p>
            </div>
            <div className="rounded-md border border-line bg-bg-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-info" aria-hidden="true" />
                <span className="text-xs text-ink-muted uppercase tracking-wide">Policies Issued</span>
              </div>
              <p className="text-2xl font-semibold text-ink-primary tabular-nums">{policies.length}</p>
              <p className="text-xs text-ink-muted">via BN Automobiles</p>
            </div>
          </div>

          {/* Revenue summary */}
          {policies.length > 0 && (
            <Card title="Revenue Summary (Issued Policies)">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field
                  label="Total Premium Collected"
                  value={<span className="font-mono text-lg font-semibold tabular-nums">{INR.format(totalIssuedPremium)}</span>}
                />
                <Field
                  label="Total Commission Earned"
                  value={<span className="font-mono text-lg font-semibold text-success tabular-nums">{INR.format(totalCommission)}</span>}
                />
              </dl>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Addon catalog */}
            <Card title="Addon Catalog">
              <div className="space-y-2">
                {provider.addonCatalog.map((addon) => (
                  <div key={addon.code} className="flex items-center justify-between py-1.5 border-b border-line last:border-0">
                    <div>
                      <p className="text-sm text-ink-primary">{addon.label}</p>
                      <p className="text-xs text-ink-muted font-mono">{addon.code} · {addon.premiumBasis}</p>
                    </div>
                    {addon.available ? (
                      <CheckCircle2 size={16} className="text-success" aria-label="Available" />
                    ) : (
                      <XCircle size={16} className="text-ink-faint" aria-label="Unavailable" />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* NCB slabs */}
            <Card title="NCB Discount Slabs">
              <table className="w-full text-sm" role="table" aria-label="NCB discount table">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="text-left py-2 font-semibold text-ink-secondary text-xs">
                      Years No-Claim
                    </th>
                    <th scope="col" className="text-right py-2 font-semibold text-ink-secondary text-xs">
                      Discount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {provider.ncbSlabs.map((slab, idx) => (
                    <tr key={idx} className="border-b border-line last:border-0">
                      <td className="py-2 text-ink-primary">{slab.yearsNoClaim} year{slab.yearsNoClaim !== 1 ? 's' : ''}</td>
                      <td className="py-2 text-right font-mono text-ink-primary tabular-nums">{slab.discountPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-ink-muted">
                IDV multiplier: <span className="font-mono text-ink-secondary">{provider.idvMultiplier}×</span>
              </p>
            </Card>
          </div>

          {/* Issued policies list — PENDING: pagination + filter */}
          {policies.length > 0 && (
            <div className="rounded-md border border-line bg-bg-surface">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-primary">
                  Issued Policies
                  <span className="ml-2 text-xs text-ink-muted font-normal">({policies.length})</span>
                </h2>
                <span className="text-xs text-ink-faint">PENDING: pagination + filter</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Issued policies">
                  <thead>
                    <tr className="bg-bg-subtle border-b border-line">
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold text-ink-secondary text-xs">Policy #</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold text-ink-secondary text-xs">VIN</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold text-ink-secondary text-xs">Type</th>
                      <th scope="col" className="text-right px-4 py-2.5 font-semibold text-ink-secondary text-xs">Premium</th>
                      <th scope="col" className="text-right px-4 py-2.5 font-semibold text-ink-secondary text-xs">Commission</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold text-ink-secondary text-xs">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.slice(0, 10).map((policy) => (
                      <tr key={policy.policyId} className="border-b border-line last:border-0 hover:bg-bg-hover transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-secondary">{policy.policyNumber}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">{policy.vin.slice(-7)}</td>
                        <td className="px-4 py-2.5 text-ink-primary capitalize">{policy.policyType}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink-primary">{INR.format(policy.totalPremium)}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-success">{INR.format(policy.commissionEarned)}</td>
                        <td className="px-4 py-2.5 text-xs text-ink-muted">
                          {policy.periodStart} — {policy.periodEnd}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {policies.length > 10 && (
                  <p className="px-4 py-2 text-xs text-ink-muted border-t border-line">
                    Showing 10 of {policies.length}. PENDING: pagination.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* IRDAI disclaimer */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-xs text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Claim settlement ratios sourced from IRDAI Annual Report FY24.
          </p>
        </div>
      </div>
    </Gate>
  );
}
