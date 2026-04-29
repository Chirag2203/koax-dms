/**
 * TemplateRegistryView — filterable DLT template table.
 * SPEC-NOTIFICATIONS-001 §6.3
 *
 * Filter by channel / module / status. Link to detail. "New Template" CTA.
 * ≤180 LoC per spec §11
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink } from 'lucide-react';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';
import { ChannelBadge } from '../shared/channel-badge';
import { ModuleBadge } from '../shared/module-badge';
import { Gate } from '../../primitives/gate';
import type { NotificationChannel, NotificationModule } from '@dms/types';

type DltStatus = 'ALL' | 'DRAFT' | 'PENDING_DLT' | 'APPROVED' | 'REJECTED' | 'DEPRECATED';

const DLT_STATUS_OPTIONS: Array<{ value: DltStatus; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_DLT', label: 'Pending DLT' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DEPRECATED', label: 'Deprecated' },
];

const CHANNEL_OPTIONS: Array<{ value: NotificationChannel | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
];

const MODULE_OPTIONS: Array<{ value: NotificationModule | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'SERVICE_BOOKING', label: 'Service' },
  { value: 'CUSTOM_BUILDS', label: 'Builds' },
  { value: 'CUSTOMERS', label: 'Customers' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'SALES', label: 'Sales' },
];

const DLT_STATUS_CHIP: Record<string, string> = {
  DRAFT: 'bg-bg-subtle text-ink-muted',
  PENDING_DLT: 'bg-[rgb(var(--state-pending)/0.12)] text-[rgb(var(--state-pending))]',
  APPROVED: 'bg-[rgb(var(--state-active)/0.12)] text-[rgb(var(--state-active))]',
  REJECTED: 'bg-[rgb(var(--state-overdue)/0.12)] text-[rgb(var(--state-overdue))]',
  DEPRECATED: 'bg-bg-subtle text-ink-muted line-through',
};

const SELECT_CLASS =
  'h-9 bg-bg-subtle border border-line rounded-md px-2 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

function formatAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso));
  } catch { return iso; }
}

export function TemplateRegistryView() {
  const templates = useNotificationsStore((s) => s.templates);

  const [channel, setChannel] = useState<NotificationChannel | 'ALL'>('ALL');
  const [module, setModule] = useState<NotificationModule | 'ALL'>('ALL');
  const [status, setStatus] = useState<DltStatus>('ALL');

  const filtered = useMemo(
    () =>
      templates.filter(
        (t) =>
          (channel === 'ALL' || t.channel === channel) &&
          (module === 'ALL' || t.module === module) &&
          (status === 'ALL' || t.status === status),
      ),
    [templates, channel, module, status],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select value={channel} onChange={(e) => setChannel(e.target.value as NotificationChannel | 'ALL')} className={SELECT_CLASS} aria-label="Filter by channel">
            {CHANNEL_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
          <select value={module} onChange={(e) => setModule(e.target.value as NotificationModule | 'ALL')} className={SELECT_CLASS} aria-label="Filter by module">
            {MODULE_OPTIONS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as DltStatus)} className={SELECT_CLASS} aria-label="Filter by DLT status">
            {DLT_STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
        </div>
        <Gate permission="notifications:template:manage">
          <Link
            href="/notifications/templates/new"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus size={14} aria-hidden="true" />
            New Template
          </Link>
        </Gate>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm bg-bg-surface" role="grid" aria-label="Template registry">
          <thead>
            <tr className="border-b border-line bg-bg-subtle">
              {['Name', 'Channel', 'Module', 'DLT Status', 'DLT ID', 'Updated', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                  No templates match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-line hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-ink-primary">{t.name}</td>
                  <td className="px-4 py-3"><ChannelBadge channel={t.channel} /></td>
                  <td className="px-4 py-3"><ModuleBadge module={t.module} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${DLT_STATUS_CHIP[t.status] ?? 'bg-bg-subtle text-ink-muted'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {t.dltTemplateId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                    {formatAt(t.lastUpdatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/notifications/templates/${t.id}`}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    >
                      View
                      <ExternalLink size={10} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length} template{filtered.length !== 1 ? 's' : ''} shown
      </p>
    </div>
  );
}
