/**
 * NotificationsFilterBar — URL-driven filter controls for the dispatch log.
 * SPEC-NOTIFICATIONS-001 L9, L13, L15
 *
 * L9: filter state lives exclusively in URL search params.
 * L15: ?recipient= contains only customerId — never raw phone.
 *
 * ≤160 LoC per spec §11
 */

'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { X } from 'lucide-react';
import type { NotificationModule, NotificationChannel, NotificationStatus } from '@dms/types';

const MODULES: Array<{ value: NotificationModule | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'SERVICE_BOOKING', label: 'Service' },
  { value: 'CUSTOM_BUILDS', label: 'Builds' },
  { value: 'CUSTOMERS', label: 'Customers' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'SALES', label: 'Sales' },
];

const CHANNELS: Array<{ value: NotificationChannel | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
];

const STATUSES: Array<{ value: NotificationStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
  { value: 'opted-out', label: 'Opted-out' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SELECT_CLASS =
  'h-9 bg-bg-subtle border border-line rounded-md px-2 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

export function NotificationsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const module = searchParams.get('module') ?? 'ALL';
  const channel = searchParams.get('channel') ?? 'ALL';
  const status = searchParams.get('status') ?? 'ALL';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const recipient = searchParams.get('recipient') ?? '';

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete('page'); // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const clearAll = () => router.push(pathname);

  const hasActiveFilters =
    module !== 'ALL' || channel !== 'ALL' || status !== 'ALL' || from || to || recipient;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Module */}
        <select
          value={module}
          onChange={(e) => updateParam('module', e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filter by module"
        >
          {MODULES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Channel */}
        <select
          value={channel}
          onChange={(e) => updateParam('channel', e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filter by channel"
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={from}
          onChange={(e) => updateParam('from', e.target.value)}
          className={SELECT_CLASS}
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => updateParam('to', e.target.value)}
          className={SELECT_CLASS}
          aria-label="To date"
        />

        {/* Recipient — customerId only (L9, L15) */}
        <input
          type="text"
          value={recipient}
          onChange={(e) => updateParam('recipient', e.target.value)}
          placeholder="Customer ID (e.g. cust-arjun-mehta)"
          className={`${SELECT_CLASS} min-w-52`}
          aria-label="Filter by customer ID (L15: no raw phone)"
        />

        {/* Clear all — L13 */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 h-9 px-3 rounded-md text-sm text-ink-muted border border-line hover:bg-bg-hover hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Clear all filters"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {module !== 'ALL' && (
            <ActiveChip label={`Module: ${module}`} onRemove={() => updateParam('module', '')} />
          )}
          {channel !== 'ALL' && (
            <ActiveChip
              label={`Channel: ${channel}`}
              onRemove={() => updateParam('channel', '')}
            />
          )}
          {status !== 'ALL' && (
            <ActiveChip label={`Status: ${status}`} onRemove={() => updateParam('status', '')} />
          )}
          {from && (
            <ActiveChip label={`From: ${from}`} onRemove={() => updateParam('from', '')} />
          )}
          {to && <ActiveChip label={`To: ${to}`} onRemove={() => updateParam('to', '')} />}
          {recipient && (
            <ActiveChip
              label={`Recipient: ${recipient}`}
              onRemove={() => updateParam('recipient', '')}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 bg-accent/10 text-accent font-mono text-[10px] uppercase tracking-widest">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-accent/70 transition-colors focus-visible:outline-none"
        aria-label={`Remove filter: ${label}`}
      >
        <X size={10} aria-hidden="true" />
      </button>
    </span>
  );
}
