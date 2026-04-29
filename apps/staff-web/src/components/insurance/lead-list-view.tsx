/**
 * LeadListView — sortable table view of insurance renewal leads.
 *
 * Mirrors BuildJobListView in the custom-builds module. Columns:
 * Customer · Vehicle · VIN · Stage · Priority · Best Premium · Days to Expiry · Last Activity.
 *
 * Sortable by stage, days-to-expiry (default desc), last-activity, premium.
 * Row click → /insurance/leads/[id].
 *
 * Spec reference: SPEC-INSURANCE-001 §35, L_P2_3
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Copy, Check } from 'lucide-react';
import { cn } from '@dms/ui';
import type { InsuranceLead, InsuranceLeadStage } from '@dms/types';
import { useCustomersStore } from '@/src/lib/customers/customers-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last2 = cleaned.slice(-2);
    const first5 = cleaned.startsWith('91') ? `+${cleaned.slice(0, 4)}` : `+91${cleaned.slice(0, 2)}`;
    return `${first5}···${last2}`;
  }
  return phone;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function daysUntilExpiry(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatINR(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
}

function getBestPremium(lead: InsuranceLead): number {
  return lead.quotes.reduce((max, q) => Math.max(max, q.totalPremium), 0);
}

/** §35: Expiry chip colour tier */
function expiryColorClass(days: number): string {
  if (days <= 7) return 'text-[rgb(var(--state-overdue))]';
  if (days <= 30) return 'text-warning';
  return 'text-ink-muted';
}

// ─── Stage config (colour-tiered) ─────────────────────────────────────────────

const STAGE_LABELS: Record<InsuranceLeadStage, string> = {
  'due-soon':    'Due Soon',
  'due':         'Due',
  'quoted':      'Quoted',
  'negotiating': 'Negotiating',
  'closed-won':  'Closed Won',
  'closed-lost': 'Closed Lost',
};

const STAGE_CHIP_CLASS: Record<InsuranceLeadStage, string> = {
  'due-soon':    'bg-[rgb(var(--state-pending)/0.08)] text-[rgb(var(--state-pending))]',
  'due':         'bg-[rgb(var(--state-overdue)/0.08)] text-warning',
  'quoted':      'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  'negotiating': 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  'closed-won':  'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  'closed-lost': 'bg-bg-subtle text-ink-muted',
};

const STAGE_ORDER: Record<InsuranceLeadStage, number> = {
  'due-soon':    0,
  'due':         1,
  'quoted':      2,
  'negotiating': 3,
  'closed-won':  4,
  'closed-lost': 5,
};

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = 'stage' | 'daysToExpiry' | 'updatedAt' | 'premium';

function sortLeads(leads: InsuranceLead[], key: SortKey, dir: 'asc' | 'desc'): InsuranceLead[] {
  return [...leads].sort((a, b) => {
    let cmp = 0;
    if (key === 'stage') {
      cmp = (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99);
    } else if (key === 'daysToExpiry') {
      const dA = a.expiresAt ? daysUntilExpiry(a.expiresAt) : 9999;
      const dB = b.expiresAt ? daysUntilExpiry(b.expiresAt) : 9999;
      cmp = dA - dB;
    } else if (key === 'premium') {
      cmp = getBestPremium(a) - getBestPremium(b);
    } else {
      // updatedAt
      cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

// ─── VIN copy badge ───────────────────────────────────────────────────────────

function VinCopyBadge({ vin }: { vin: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(vin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [vin]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy VIN ${vin}`}
      className={cn(
        'inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded',
        'bg-bg-subtle text-ink-muted border border-line/60 transition-colors',
        'hover:bg-bg-hover hover:text-ink-secondary',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
      )}
    >
      {vin.slice(-8)}
      {copied
        ? <Check size={9} className="text-accent" aria-hidden />
        : <Copy size={9} aria-hidden />}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface LeadListViewProps {
  leads: InsuranceLead[];
  vehicleMap: Record<string, { make: string; model: string; year: number }>;
}

export function LeadListView({ leads, vehicleMap }: LeadListViewProps) {
  const router = useRouter();
  const customers = useCustomersStore((s) => s.customers);

  // Memoized lookup: customerId → { name, phone }. Falls back to slug if not in store.
  const customerById = useMemo(() => {
    const map: Record<string, { name: string; phone: string }> = {};
    for (const [id, c] of Object.entries(customers)) {
      map[id] = { name: c.name, phone: c.phone ?? '' };
    }
    return map;
  }, [customers]);

  function resolveCustomer(customerId: string): { name: string; phone: string } {
    return customerById[customerId] ?? { name: 'Unknown customer', phone: '' };
  }

  // Default: days to expiry ascending (most urgent first)
  const [sortKey, setSortKey] = useState<SortKey>('daysToExpiry');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'daysToExpiry' ? 'asc' : 'desc');
    }
  };

  function SortButton({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col;
    return (
      <button
        type="button"
        onClick={() => handleSort(col)}
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors',
          active ? 'text-accent' : 'text-ink-muted hover:text-ink-secondary',
        )}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <ArrowUpDown size={10} aria-hidden="true" />
      </button>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[15px] font-medium text-ink-primary">No renewal leads</p>
        <p className="text-[13px] text-ink-muted mt-1">Refresh the expiry feed to populate leads.</p>
      </div>
    );
  }

  const sorted = sortLeads(leads, sortKey, sortDir);

  return (
    <div className="overflow-y-auto scrollbar-thin-dark rounded-lg border border-line">
      <table className="w-full text-left" role="table">
        <thead className="bg-bg-subtle border-b border-line sticky top-0 z-10">
          <tr role="row">
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider min-w-[160px]">
              Customer
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider min-w-[160px]">
              Vehicle
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider">
              VIN
            </th>
            <th className="px-4 py-3">
              <SortButton label="Stage" col="stage" />
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-ink-muted uppercase tracking-wider">
              Priority
            </th>
            <th className="px-4 py-3">
              <SortButton label="Best Premium" col="premium" />
            </th>
            <th className="px-4 py-3">
              <SortButton label="Days to Expiry" col="daysToExpiry" />
            </th>
            <th className="px-4 py-3 text-right">
              <div className="flex justify-end">
                <SortButton label="Last Activity" col="updatedAt" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => {
            const veh = vehicleMap[lead.vin];
            const vehicleName = veh ? `${veh.year} ${veh.make} ${veh.model}` : lead.vin;
            const customer = resolveCustomer(lead.customerId);
            const bestPremium = getBestPremium(lead);
            const daysLeft = lead.expiresAt ? daysUntilExpiry(lead.expiresAt) : null;
            const isUrgent = lead.priority === 'urgent';

            return (
              <tr
                key={lead.leadId}
                className="border-b border-line hover:bg-bg-hover transition-colors cursor-pointer"
                onClick={() => router.push(`/insurance/leads/${lead.leadId}`)}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/insurance/leads/${lead.leadId}`)}
                aria-label={`View insurance lead for ${customer.name}`}
              >
                {/* Customer */}
                <td className="px-4 py-3">
                  <p className="text-[13px] font-medium text-ink-primary truncate max-w-[160px]">
                    {customer.name}
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted mt-0.5">
                    {maskPhone(customer.phone)}
                  </p>
                </td>

                {/* Vehicle */}
                <td className="px-4 py-3">
                  <p className="text-[12px] text-ink-secondary truncate max-w-[160px]">{vehicleName}</p>
                </td>

                {/* VIN */}
                <td className="px-4 py-3">
                  <VinCopyBadge vin={lead.vin} />
                </td>

                {/* Stage */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-[10px] font-medium',
                      STAGE_CHIP_CLASS[lead.stage],
                    )}
                  >
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </td>

                {/* Priority */}
                <td className="px-4 py-3">
                  {isUrgent ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--state-overdue))] inline-block" />
                      Urgent
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-muted">Normal</span>
                  )}
                </td>

                {/* Best Premium */}
                <td className="px-4 py-3 font-mono text-[12px] text-ink-primary tabular-nums">
                  {bestPremium > 0 ? (
                    formatINR(bestPremium)
                  ) : (
                    <span className="text-ink-muted italic text-[11px]">No quote</span>
                  )}
                </td>

                {/* Days to Expiry */}
                <td className="px-4 py-3 font-mono text-[12px] tabular-nums">
                  {daysLeft !== null ? (
                    <span className={expiryColorClass(daysLeft)}>
                      {daysLeft}d
                    </span>
                  ) : (
                    <span className="text-ink-muted italic text-[11px]">—</span>
                  )}
                </td>

                {/* Last Activity */}
                <td className="px-4 py-3 text-right font-mono text-[11px] text-ink-muted tabular-nums">
                  {timeAgo(lead.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
