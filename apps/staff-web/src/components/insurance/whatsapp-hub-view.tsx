/**
 * WhatsAppHubView — Template management + Campaign list + Opt-out registry.
 *
 * Tab 1: Templates — list with status badges, create/edit/submit for DLT.
 * Tab 2: Campaigns — list with stats, new campaign CTA.
 * Tab 3: Opt-outs — registry of opted-out customers.
 *
 * Gate: R10+
 * L9: Only APPROVED templates usable in campaigns.
 * L13 / L14: Enforced at slice level.
 * L_P3_1: scheduled campaigns re-check opt-outs at dispatch.
 *
 * Spec reference: SPEC-INSURANCE-001 §5.5, §32
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, CheckCircle, Clock, FileText, Users, AlertCircle } from 'lucide-react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';
import type { WhatsAppTemplate, WhatsAppCampaign } from '@dms/types';

type Tab = 'templates' | 'campaigns' | 'optouts';

const STATUS_BADGE: Record<WhatsAppTemplate['status'], string> = {
  APPROVED: 'bg-success/15 text-success',
  PENDING_DLT: 'bg-warning/15 text-warning',
  DRAFT: 'bg-bg-subtle text-ink-muted',
  REJECTED: 'bg-error/15 text-error',
};

const CAMPAIGN_STATUS_BADGE: Record<WhatsAppCampaign['status'], string> = {
  completed: 'bg-success/15 text-success',
  sending: 'bg-accent/15 text-accent',
  scheduled: 'bg-warning/15 text-warning',
  draft: 'bg-bg-subtle text-ink-muted',
  cancelled: 'bg-error/15 text-error',
};

function TemplatesTab() {
  const templates = useInsuranceStore((s) => s.templates);
  const submitForDlt = useInsuranceStore((s) => s.submitForDlt);
  const markTemplateApproved = useInsuranceStore((s) => s.markTemplateApproved);
  const [dltInput, setDltInput] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-ink-muted">{templates.length} templates total</p>
        <Link
          href="/insurance/marketing/whatsapp/templates/new"
          className="inline-flex items-center gap-2 h-9 px-3 rounded bg-accent text-white text-[13px] hover:bg-accent/90 transition-colors"
        >
          <Plus size={14} aria-hidden="true" />
          New Template
        </Link>
      </div>

      {templates.length === 0 && (
        <div className="rounded-lg border border-line bg-bg-surface p-8 text-center">
          <FileText size={32} className="mx-auto mb-2 text-ink-faint" />
          <p className="text-[14px] text-ink-muted">No templates yet. Create a DLT-registered template first.</p>
        </div>
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <div
            key={t.templateId}
            className="rounded-lg border border-line bg-bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[14px] font-medium text-ink-primary truncate">{t.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[t.status]}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[12px] text-ink-muted truncate">{t.bodyText}</p>
                <p className="text-[11px] text-ink-faint mt-0.5">
                  Category: {t.category} · Variables: {t.variables.join(', ') || 'none'}
                </p>
                {t.dltTemplateId && (
                  <p className="text-[11px] text-success mt-0.5">DLT ID: {t.dltTemplateId}</p>
                )}
                {t.rejectionReason && (
                  <p className="text-[11px] text-error mt-0.5">Rejected: {t.rejectionReason}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {t.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => submitForDlt(t.templateId)}
                    className="text-[12px] h-7 px-2.5 rounded border border-line bg-bg-canvas text-ink-primary hover:bg-bg-hover transition-colors"
                  >
                    Submit for DLT
                  </button>
                )}
                {t.status === 'PENDING_DLT' && (
                  <div className="flex items-center gap-1.5">
                    {approving === t.templateId ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="DLT ID (e.g. DLT123...)"
                          value={dltInput[t.templateId] ?? ''}
                          onChange={(e) => setDltInput((p) => ({ ...p, [t.templateId]: e.target.value }))}
                          className="h-7 px-2 text-[12px] rounded border border-line bg-bg-canvas text-ink-primary w-40 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const id = dltInput[t.templateId];
                            if (id) {
                              markTemplateApproved(t.templateId, id);
                              setApproving(null);
                            }
                          }}
                          className="text-[12px] h-7 px-2.5 rounded bg-success/20 text-success hover:bg-success/30 transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setApproving(t.templateId)}
                        className="text-[12px] h-7 px-2.5 rounded border border-success/40 text-success hover:bg-success/10 transition-colors"
                      >
                        Enter DLT ID
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignsTab() {
  const campaigns = useInsuranceStore((s) => s.campaigns);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-ink-muted">{campaigns.length} campaigns</p>
        <Link
          href="/insurance/marketing/whatsapp/campaigns/new"
          className="inline-flex items-center gap-2 h-9 px-3 rounded bg-accent text-white text-[13px] hover:bg-accent/90 transition-colors"
        >
          <Plus size={14} aria-hidden="true" />
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 && (
        <div className="rounded-lg border border-line bg-bg-surface p-8 text-center">
          <Users size={32} className="mx-auto mb-2 text-ink-faint" />
          <p className="text-[14px] text-ink-muted">No campaigns yet. Create a template first.</p>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map((c) => (
          <Link
            key={c.campaignId}
            href={`/insurance/marketing/whatsapp/campaigns/${c.campaignId}`}
            className="block rounded-lg border border-line bg-bg-surface p-4 hover:border-line-strong hover:bg-bg-hover transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[14px] font-medium text-ink-primary">{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CAMPAIGN_STATUS_BADGE[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                {c.scheduledAt && (
                  <p className="text-[12px] text-ink-muted flex items-center gap-1">
                    <Clock size={11} aria-hidden="true" />
                    Scheduled: {new Date(c.scheduledAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              <div className="flex gap-3 text-[12px] text-ink-muted">
                <span>Targeted: <b className="text-ink-primary">{c.stats.targeted}</b></span>
                <span>Sent: <b className="text-ink-primary">{c.stats.sent}</b></span>
                <span>Read: <b className="text-ink-primary">{c.stats.read}</b></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function OptOutsTab() {
  const getOptOuts = useInsuranceStore((s) => s.getOptOuts);
  const recordOptOut = useInsuranceStore((s) => s.recordOptOut);
  const [newOptOut, setNewOptOut] = useState('');
  const optOuts = getOptOuts();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-ink-muted">
          {optOuts.length} opted-out customer{optOuts.length !== 1 ? 's' : ''} — permanently excluded from all campaigns
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Customer ID"
            value={newOptOut}
            onChange={(e) => setNewOptOut(e.target.value)}
            className="h-9 px-3 text-[13px] rounded border border-line bg-bg-canvas text-ink-primary w-40 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => {
              if (newOptOut.trim()) {
                recordOptOut(newOptOut.trim());
                setNewOptOut('');
              }
            }}
            className="h-9 px-3 rounded border border-line bg-bg-surface text-[13px] text-ink-primary hover:bg-bg-hover transition-colors"
          >
            Add Opt-out
          </button>
        </div>
      </div>

      {optOuts.length === 0 && (
        <div className="rounded-lg border border-line bg-bg-surface p-8 text-center">
          <CheckCircle size={32} className="mx-auto mb-2 text-success" />
          <p className="text-[14px] text-ink-muted">No opt-outs recorded.</p>
        </div>
      )}

      <div className="space-y-1.5">
        {optOuts.map((customerId) => (
          <div
            key={customerId}
            className="flex items-center justify-between rounded border border-line bg-bg-surface px-4 py-2.5"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-error shrink-0" aria-hidden="true" />
              <span className="text-[13px] text-ink-primary font-mono">{customerId}</span>
            </div>
            <span className="text-[11px] text-ink-muted">Permanently excluded · DPDP L14</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhatsAppHubView() {
  const [tab, setTab] = useState<Tab>('templates');

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-accent text-accent'
        : 'border-transparent text-ink-muted hover:text-ink-primary'
    }`;

  return (
    <Gate role="R10" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line shrink-0">
          <h1 className="text-[22px] font-semibold text-ink-primary">WhatsApp Marketing</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            DLT-registered templates · audience builder · campaign launcher
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 border-b border-line shrink-0">
          <button type="button" onClick={() => setTab('templates')} className={tabClass('templates')}>
            Templates
          </button>
          <button type="button" onClick={() => setTab('campaigns')} className={tabClass('campaigns')}>
            Campaigns
          </button>
          <button type="button" onClick={() => setTab('optouts')} className={tabClass('optouts')}>
            Opt-outs
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-6">
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'campaigns' && <CampaignsTab />}
          {tab === 'optouts' && <OptOutsTab />}
        </div>

        {/* DPDP notice */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-[11px] text-ink-muted">
            All campaigns require explicit marketing consent (DPDP Act 2023 §6). Opt-outs honored immediately per L14.
            DLT template IDs required for all WhatsApp sends (Telecom Regulatory Authority of India).
          </p>
        </div>
      </div>
    </Gate>
  );
}
