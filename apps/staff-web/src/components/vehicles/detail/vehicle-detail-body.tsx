'use client';

import { useState, useCallback } from 'react';
import { cn } from '@dms/ui';
import type { VehicleMaster } from '@dms/types';
import { OverviewTab } from './tabs/overview-tab';
import { OwnershipTab } from './tabs/ownership-tab';
import { ServiceTab } from './tabs/service-tab';
import { SalesTab } from './tabs/sales-tab';
import { DocumentsTab } from './tabs/documents-tab';
import { CostsTab } from './tabs/costs-tab';

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleTabId = 'overview' | 'ownership' | 'service' | 'sales' | 'documents' | 'costs';

export interface VehicleDetailBodyProps {
  vehicle: VehicleMaster;
  /** When embedded in a drawer, can restrict which tabs are shown */
  defaultTab?: VehicleTabId;
  hideHeader?: boolean;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: VehicleTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'ownership', label: 'Ownership' },
  { id: 'service', label: 'Service' },
  { id: 'sales', label: 'Sales' },
  { id: 'documents', label: 'Documents' },
  { id: 'costs', label: 'Costs' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleDetailBody({
  vehicle,
  defaultTab = 'overview',
}: VehicleDetailBodyProps) {
  const [activeTab, setActiveTab] = useState<VehicleTabId>(defaultTab);

  const handleTabChange = useCallback((id: VehicleTabId) => {
    setActiveTab(id);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Vehicle detail sections"
        className="flex items-end gap-0 border-b border-line mb-6"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`vtab-${tab.id}`}
            aria-controls={`vpanel-${tab.id}`}
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

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`vpanel-${activeTab}`}
        aria-labelledby={`vtab-${activeTab}`}
      >
        {activeTab === 'overview' && <OverviewTab vehicle={vehicle} />}
        {activeTab === 'ownership' && <OwnershipTab vehicle={vehicle} />}
        {activeTab === 'service' && <ServiceTab vehicle={vehicle} />}
        {activeTab === 'sales' && <SalesTab vehicle={vehicle} />}
        {activeTab === 'documents' && <DocumentsTab vehicle={vehicle} />}
        {activeTab === 'costs' && <CostsTab vehicle={vehicle} />}
      </div>
    </div>
  );
}
