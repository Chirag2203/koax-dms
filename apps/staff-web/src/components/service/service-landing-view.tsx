'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@dms/ui';
import { BayBoardTab } from './bay-board-tab';
import { AppointmentsTab } from './appointments-tab';
import { JobCardsTab } from './jobcards-tab';
import { WarrantyTab } from './warranty-tab';

// ─── Tab config ───────────────────────────────────────────────────────────────

type ServiceTab = 'bay-board' | 'appointments' | 'jobcards' | 'warranty';

const TABS: { id: ServiceTab; label: string }[] = [
  { id: 'bay-board', label: 'Bay Board' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'jobcards', label: 'Job Cards' },
  { id: 'warranty', label: 'Warranty Claims' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceLandingView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get('tab') as ServiceTab | null;
  const activeTab: ServiceTab =
    rawTab && TABS.some((t) => t.id === rawTab) ? rawTab : 'bay-board';

  const handleTabChange = useCallback(
    (tabId: ServiceTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabId);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            Service
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted leading-[1.5]">
            Operational floor — bays, appointments, job cards, warranty
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/service/warranty/new"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line',
              'bg-bg-surface text-sm font-medium text-ink-primary',
              'hover:bg-bg-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            Raise Warranty Claim
          </Link>
          <Link
            href="/service/appointments/new"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white',
              'text-sm font-medium hover:bg-accent-hover transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            New Appointment
          </Link>
        </div>
      </div>

      {/* ── Tabs row ─────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Service sections"
        className="flex items-end gap-0 border-b border-line px-6 shrink-0"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              activeTab === tab.id
                ? 'text-ink-primary'
                : 'text-ink-muted hover:text-ink-secondary',
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm bg-accent"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab panels ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            className="h-full"
          >
            {activeTab === tab.id && (
              <>
                {tab.id === 'bay-board' && <BayBoardTab />}
                {tab.id === 'appointments' && <AppointmentsTab />}
                {tab.id === 'jobcards' && <JobCardsTab />}
                {tab.id === 'warranty' && <WarrantyTab />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
