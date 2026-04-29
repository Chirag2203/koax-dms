/**
 * InsuranceHubView — overview tiles + quick actions.
 *
 * Gate: R09+
 * Spec reference: SPEC-INSURANCE-001 §2, §13
 */

'use client';

import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';
import { ShieldCheck, Users, FileCheck, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { RenewalPipelineView } from './renewal-pipeline-view';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function InsuranceHubView() {
  const leads = useInsuranceStore((s) => s.leads);
  const policies = useInsuranceStore((s) => s.policies);

  const activeLeads = leads.filter((l) => l.stage !== 'closed-won' && l.stage !== 'closed-lost');
  const renewalsDue = leads.filter((l) => l.stage === 'due' || l.stage === 'due-soon');
  const issuedCount = policies.length;

  const commissionMtd = policies
    .filter((p) => {
      const issued = new Date(p.issuedAt);
      const now = new Date();
      return issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.commissionEarned, 0);

  const tiles = [
    { label: 'Active Leads', value: String(activeLeads.length), icon: Users, href: '/insurance/leads/new', color: 'text-accent' },
    { label: 'Renewals Due', value: String(renewalsDue.length), icon: ShieldCheck, href: '/insurance/quote/new', color: 'text-warning' },
    { label: 'Policies Issued', value: String(issuedCount), icon: FileCheck, href: '/insurance/providers', color: 'text-success' },
    { label: 'Commission MTD', value: fmt(commissionMtd), icon: ArrowRight, href: '#', color: 'text-ink-secondary' },
  ];

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">Insurance</h1>
            <p className="mt-0.5 text-[13px] text-ink-muted leading-[1.5]">
              Motor insurance aggregation — provider catalog, comparison, and pipeline
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/insurance/quote/new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <Plus size={16} aria-hidden="true" />
              Compare Quotes
            </Link>
            <Link
              href="/insurance/leads/new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <Plus size={16} aria-hidden="true" />
              New Lead
            </Link>
          </div>
        </div>

        {/* ── Summary tiles ── */}
        <div className="p-6 grid grid-cols-4 gap-4 shrink-0">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.label}
                href={tile.href}
                className="rounded-lg border border-line bg-bg-surface p-4 hover:border-line-strong hover:bg-bg-hover transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} className={tile.color} aria-hidden="true" />
                  <span className="text-[12px] text-ink-muted uppercase tracking-wide">{tile.label}</span>
                </div>
                <p className="text-[24px] font-semibold text-ink-primary leading-tight">{tile.value}</p>
              </Link>
            );
          })}
        </div>

        {/* ── Full Renewal Pipeline (Kanban + List view) embedded directly ── */}
        <div className="flex-1 min-h-0 overflow-auto">
          <RenewalPipelineView />
        </div>

        {/* ── IRDAI disclaimer ── */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-[11px] text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Insurance is the subject matter of solicitation.
          </p>
        </div>
      </div>
    </Gate>
  );
}
