'use client';

import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SavedView = 'all' | 'listed' | 'in-refurb' | 'stale' | 'my-listings';

export interface SavedViewTabsProps {
  activeView: SavedView;
  onChange: (view: SavedView) => void;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: SavedView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'listed', label: 'Listed' },
  { id: 'in-refurb', label: 'In Refurb' },
  { id: 'stale', label: 'Stale (>60d)' },
  { id: 'my-listings', label: 'My Listings' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SavedViewTabs({ activeView, onChange }: SavedViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Saved inventory views"
      className="flex items-center gap-0 border-b border-line"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeView;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`inventory-view-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-[13px] font-medium whitespace-nowrap',
              'transition-colors focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
              isActive
                ? 'text-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent after:rounded-t'
                : 'text-ink-secondary hover:text-ink-primary',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
