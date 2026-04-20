'use client';

import { useState, useCallback } from 'react';
import { cn } from '@dms/ui';
import type { Customer } from '@dms/types';
import { Customer360Header } from './customer-360-header';
import { CustomerProfileTab } from './tabs/customer-profile-tab';
import { CustomerVehiclesTab } from './tabs/customer-vehicles-tab';
import { CustomerInteractionsTab } from './tabs/customer-interactions-tab';
import { CustomerCommsTab } from './tabs/customer-comms-tab';
import { CustomerConsentsTab } from './tabs/customer-consents-tab';

// ─── Types ────────────────────────────────────────────────────────────────────

type C360TabId = 'profile' | 'vehicles' | 'interactions' | 'comms' | 'consents';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: C360TabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'comms', label: 'Communications' },
  { id: 'consents', label: 'Consents' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface Customer360ViewProps {
  customer: Customer;
}

export function Customer360View({ customer }: Customer360ViewProps) {
  const [activeTab, setActiveTab] = useState<C360TabId>('profile');

  const handleTabChange = useCallback((id: C360TabId) => {
    setActiveTab(id);
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
      <Customer360Header customer={customer} />

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Customer 360 sections"
        className="flex items-end gap-0 border-b border-line mb-6"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`c360tab-${tab.id}`}
            aria-controls={`c360panel-${tab.id}`}
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

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`c360panel-${activeTab}`}
        aria-labelledby={`c360tab-${activeTab}`}
      >
        {activeTab === 'profile' && <CustomerProfileTab customer={customer} />}
        {activeTab === 'vehicles' && <CustomerVehiclesTab customer={customer} />}
        {activeTab === 'interactions' && <CustomerInteractionsTab customer={customer} />}
        {activeTab === 'comms' && <CustomerCommsTab customer={customer} />}
        {activeTab === 'consents' && <CustomerConsentsTab customer={customer} />}
      </div>
    </div>
  );
}
