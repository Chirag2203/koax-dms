/**
 * TemplateVersionChain — predecessor / successor version links.
 * SPEC-NOTIFICATIONS-001 §6.3, L6
 *
 * L6: APPROVED edit forks a new DRAFT; original → DEPRECATED with supersededBy.
 * Shows a linear chain: ancestor(s) → current → successor(s).
 *
 * ≤100 LoC per spec §11
 */

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { NotificationTemplate } from '@dms/types';

interface TemplateVersionChainProps {
  current: NotificationTemplate;
  allTemplates: NotificationTemplate[];
}

function buildChain(
  current: NotificationTemplate,
  all: NotificationTemplate[],
): NotificationTemplate[] {
  // Walk backwards to root (via supersedes = "this template supersedes that older one")
  const chain: NotificationTemplate[] = [current];
  let cursor = current;
  while (cursor.supersedes) {
    const prev = all.find((t) => t.id === cursor.supersedes);
    if (!prev) break;
    chain.unshift(prev);
    cursor = prev;
  }
  // Walk forwards to tip
  cursor = current;
  while (cursor.supersededBy) {
    const next = all.find((t) => t.id === cursor.supersededBy);
    if (!next) break;
    chain.push(next);
    cursor = next;
  }
  return chain;
}

const DLT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_DLT: 'Pending DLT',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DEPRECATED: 'Deprecated',
};

export function TemplateVersionChain({ current, allTemplates }: TemplateVersionChainProps) {
  const chain = buildChain(current, allTemplates);

  if (chain.length <= 1) {
    return <p className="text-xs text-ink-muted">No prior versions.</p>;
  }

  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label="Version chain">
      {chain.map((t, idx) => (
        <li key={t.id} className="flex items-center gap-1">
          {idx > 0 && <ChevronRight size={12} className="text-ink-muted" aria-hidden="true" />}
          <Link
            href={`/notifications/templates/${t.id}`}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              t.id === current.id
                ? 'border-accent bg-accent/10 text-accent font-semibold'
                : 'border-line bg-bg-subtle text-ink-secondary hover:text-ink-primary'
            }`}
            aria-current={t.id === current.id ? 'page' : undefined}
          >
            <span className="font-mono truncate max-w-[8ch]">{t.id.slice(-6)}</span>
            <span className="text-xs opacity-70">
              {DLT_STATUS_LABEL[t.status] ?? t.status}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
