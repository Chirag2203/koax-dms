'use client';

import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  initials: string;
  action: string;
  timestamp: string;
  /** Optional: mono reference in the action string */
  ref?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'act-01',
    initials: 'RK',
    action: 'Rahul posted an appraisal for',
    ref: 'WP0ZZZ97•••1234',
    timestamp: '2 min ago',
  },
  {
    id: 'act-02',
    initials: 'AD',
    action: 'Finance approved Deal #042',
    timestamp: '14 min ago',
  },
  {
    id: 'act-03',
    initials: 'SR',
    action: 'Sanjana marked JC-2341 as Ready for Sale',
    timestamp: '28 min ago',
  },
  {
    id: 'act-04',
    initials: 'PS',
    action: 'Priya created new service appointment',
    timestamp: '45 min ago',
  },
  {
    id: 'act-05',
    initials: 'AM',
    action: 'Arjun updated ask price on',
    ref: 'WP1ZZZ95•••8234',
    timestamp: '1 hr ago',
  },
  {
    id: 'act-06',
    initials: 'VS',
    action: 'Vikram approved GRN-2026-0089',
    timestamp: '2 hr ago',
  },
  {
    id: 'act-07',
    initials: 'MI',
    action: 'Meera reviewed Q1 revenue report',
    timestamp: '3 hr ago',
  },
  {
    id: 'act-08',
    initials: 'KS',
    action: 'Karan approved floor-plan interest allocation',
    timestamp: '4 hr ago',
  },
  {
    id: 'act-09',
    initials: 'RK',
    action: 'Rahul closed deal for',
    ref: 'WP0AB2A9•••7831',
    timestamp: '5 hr ago',
  },
  {
    id: 'act-10',
    initials: 'AD',
    action: 'Anita filed TCS return for March 2026',
    timestamp: '6 hr ago',
  },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-active text-ink-muted text-[10px] font-semibold uppercase select-none"
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityFeed() {
  return (
    <div className="bg-bg-surface border border-line rounded-md flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-line">
        <h2 className="text-lg font-semibold leading-snug text-ink-primary">
          Recent activity
        </h2>
      </div>

      {/* Timeline */}
      <ul className="flex-1 divide-y divide-line">
        {ACTIVITY_ITEMS.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors">
            <Avatar initials={item.initials} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-secondary leading-snug">
                {item.action}
                {item.ref && (
                  <>
                    {' '}
                    <span className="font-mono text-xs text-ink-primary">
                      {item.ref}
                    </span>
                  </>
                )}
              </p>
              <time className="text-[11px] text-ink-muted mt-0.5 block">
                {item.timestamp}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
