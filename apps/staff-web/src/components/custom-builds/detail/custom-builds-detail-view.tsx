/**
 * CustomBuildsDetailView — 6-tab Build Job detail.
 *
 * Tabs: Overview | Parts & Estimate | Vendor & Schedule | Visualizer (P3) |
 *       Cost Ledger (stub P4, R12+) | Activity
 *
 * URL search param: ?tab=overview|parts-estimate|vendor-schedule|visualizer|cost-ledger|activity
 * Breadcrumb derives from URL via ROUTE_LABELS map in staff-top-bar.
 *
 * L45 (locked): WhatsApp + AI Call contact buttons in header, R09+ gated,
 *   logging to activity feed via addActivityNote.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6, P1.1 L19, L45
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives/gate';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { BuildStageChip } from '../shared/build-stage-chip';
import { formatINR } from '../shared/format-inr';
import { OverviewTab } from './tabs/overview-tab';
import { PartsEstimateTab } from './tabs/parts-estimate-tab';
import { VendorScheduleTab } from './tabs/vendor-schedule-tab';
import { ActivityTab } from './tabs/activity-tab';
import { VisualizerTab } from '../visualizer/visualizer-tab';
import { CostLedgerTab } from './tabs/cost-ledger-tab';
import {
  BuildWhatsAppDialog,
  BuildAiCallDialog,
} from '../dialogs/contact-customer-adapters';
import type { Interaction } from '@dms/types';

// ─── Customer directory (mirrors board fixture map) ───────────────────────────

const CUSTOMER_DIRECTORY: Record<string, { name: string; phone: string }> = {
  'cust-arjun-mehta':   { name: 'Arjun Mehta',   phone: '+919876001003' },
  'cust-priya-mehta':   { name: 'Priya Mehta',    phone: '+919876001004' },
  'cust-rohan-desai':   { name: 'Rohan Desai',    phone: '+919876001001' },
  'cust-vikram-singh':  { name: 'Vikram Singh',   phone: '+919876002001' },
  'cust-meera-iyer':    { name: 'Meera Iyer',     phone: '+919876002002' },
  'cust-sunita-reddy':  { name: 'Sunita Reddy',   phone: '+919876003001' },
  'cust-karan-shah':    { name: 'Karan Shah',     phone: '+919876003002' },
};

function resolveCustomer(customerId: string): { name: string; phone: string } {
  const known = CUSTOMER_DIRECTORY[customerId];
  if (known) return known;
  const name = customerId
    .replace('cust-', '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { name, phone: '' };
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'parts-estimate' | 'vendor-schedule' | 'visualizer' | 'cost-ledger' | 'activity';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'parts-estimate', label: 'Parts & Estimate' },
  { key: 'vendor-schedule', label: 'Vendor & Schedule' },
  { key: 'visualizer', label: 'Visualizer' },
  { key: 'cost-ledger', label: 'Cost Ledger' },
  { key: 'activity', label: 'Activity' },
];

// ─── Main component ───────────────────────────────────────────────────────────

interface CustomBuildsDetailViewProps {
  jobId: string;
  activeTab: string;
}

export function CustomBuildsDetailView({ jobId, activeTab }: CustomBuildsDetailViewProps) {
  // ─── ALL HOOKS FIRST (Rules of Hooks — no conditional returns above this block) ───
  const router = useRouter();
  const jobs = useCustomBuildsStore((s) => s.jobs);
  const vendors = useCustomBuildsStore((s) => s.vendors);
  const hydrated = useCustomBuildsStore((s) => s.hydrated);
  const addActivityNote = useCustomBuildsStore((s) => s.addActivityNote);
  const { user } = useStaffAuth();

  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [aiCallOpen, setAiCallOpen] = useState(false);

  // job may be undefined while hydrating or if id is bad — handlers tolerate that
  const job = jobs.find((j) => j.id === jobId);
  const jobIdResolved = job?.id ?? jobId;

  const handleWhatsAppSent = useCallback(
    async (interaction: Partial<Interaction>) => {
      if (!user) return;
      const actor = { id: user.id, name: user.name, role: user.role };
      addActivityNote(
        jobIdResolved,
        `WhatsApp sent: ${interaction.title ?? 'Message sent'} — ${interaction.body ?? ''}`.trim(),
        actor,
      );
    },
    [user, addActivityNote, jobIdResolved],
  );

  const handleCallLogged = useCallback(
    async (interaction: Partial<Interaction>) => {
      if (!user) return;
      const actor = { id: user.id, name: user.name, role: user.role };
      addActivityNote(
        jobIdResolved,
        `AI Call logged: ${interaction.title ?? 'Call completed'} — ${interaction.body ?? ''}`.trim(),
        actor,
      );
    },
    [user, addActivityNote, jobIdResolved],
  );

  // ─── Now safe to early-return ────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="flex flex-col h-full">
        {/* Breadcrumb skeleton */}
        <div className="px-6 py-3 border-b border-line">
          <div className="h-4 w-64 bg-bg-subtle rounded animate-pulse" />
        </div>
        {/* Header skeleton */}
        <div className="px-6 py-4 border-b border-line space-y-3">
          <div className="h-7 w-48 bg-bg-subtle rounded animate-pulse" />
          <div className="h-4 w-96 bg-bg-subtle rounded animate-pulse" />
          <div className="flex gap-4 mt-2">
            {TABS.map((t) => (
              <div key={t.key} className="h-8 w-24 bg-bg-subtle rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-48 bg-bg-subtle rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!job) notFound();

  const vendor = job.vendorId ? vendors.find((v) => v.id === job.vendorId) : undefined;
  const canViewCostLedger = user && hasRank(user.role, 'R12');

  const tab = TABS.some((t) => t.key === activeTab)
    ? (activeTab as TabKey)
    : 'overview';

  const handleTabChange = (key: TabKey) => {
    router.push(`/custom-builds/${jobId}?tab=${key}`);
  };

  const customer = resolveCustomer(job.customerId);
  const contactContext = {
    customerId: job.customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
    contextNote: `Re: Custom Build ${job.title}`,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Job header */}
      <div className="px-6 py-4 border-b border-line">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-semibold text-ink-primary">{job.title}</h1>
              <BuildStageChip stage={job.stage} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-ink-muted flex-wrap">
              <span>ID: <span className="font-mono text-ink-secondary">{job.id}</span></span>
              {job.quoteTotal && (
                <span>Quote: <span className="font-mono text-ink-primary">{formatINR(job.quoteTotal)}</span></span>
              )}
              {vendor && <span>Vendor: {vendor.name}</span>}
            </div>
          </div>

          {/* Contact buttons — R09+ gated (L45) — sales canonical pattern (L48) */}
          {customer.phone && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Gate role={['R09', 'R10', 'R11', 'R12', 'R16', 'R19', 'R22', 'R24']} fallback="hide">
                <button
                  type="button"
                  onClick={() => setWhatsAppOpen(true)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-[#25D366] hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  aria-label={`Send WhatsApp to ${customer.name}`}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </button>
              </Gate>
              <Gate role={['R09', 'R10', 'R11', 'R12', 'R16', 'R19', 'R22', 'R24']} fallback="hide">
                <button
                  type="button"
                  onClick={() => setAiCallOpen(true)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  aria-label={`AI Call ${customer.name}`}
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  AI Call
                </button>
              </Gate>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex items-end gap-0 mt-4 border-b border-line -mb-px overflow-x-auto" role="tablist">
          {TABS.map((t) => {
            const isCostLedger = t.key === 'cost-ledger';
            const isActive = tab === t.key;
            const inaccessible = isCostLedger && !canViewCostLedger;

            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${t.key}`}
                onClick={() => !inaccessible && handleTabChange(t.key)}
                className={cn(
                  'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-secondary hover:text-ink-primary',
                  inaccessible && 'opacity-40 cursor-not-allowed',
                )}
                disabled={inaccessible}
                title={inaccessible ? 'Requires Finance role (R12+)' : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels */}
      <div className="flex-1 overflow-y-auto">
        <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'overview' && <OverviewTab job={job} vendor={vendor} />}
          {tab === 'parts-estimate' && <PartsEstimateTab job={job} vendor={vendor} />}
          {tab === 'vendor-schedule' && <VendorScheduleTab job={job} vendor={vendor} />}
          {tab === 'visualizer' && <VisualizerTab job={job} />}
          {tab === 'cost-ledger' && (
            canViewCostLedger
              ? <CostLedgerTab job={job} vendor={vendor} />
              : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-[15px] font-medium text-ink-primary blur-sm select-none">Cost Ledger data</p>
                  <p className="text-[13px] text-ink-muted mt-2">Requires Finance role (R12+)</p>
                </div>
              )
          )}
          {tab === 'activity' && <ActivityTab job={job} />}
        </div>
      </div>

      {/* Contact dialogs (L45) */}
      <BuildWhatsAppDialog
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        context={contactContext}
        onMessageSent={handleWhatsAppSent}
      />
      <BuildAiCallDialog
        open={aiCallOpen}
        onClose={() => setAiCallOpen(false)}
        context={contactContext}
        onCallLogged={handleCallLogged}
      />
    </div>
  );
}
