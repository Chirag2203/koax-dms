'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { OwnedVehicleView, ServiceRecordView } from '@/src/lib/portal/portal-vehicle-adapter';
import type { Document, OwnershipChangeEvent } from '@dms/types';
import { GraceBanner } from './grace-banner';
import { SelfRevokeDialog } from './self-revoke-dialog';
import { OverviewTab } from './tabs/overview-tab';
import { ServiceTab } from './tabs/service-tab';
import { DocumentsTab } from './tabs/documents-tab';
import { TimelineTab } from './tabs/timeline-tab';
import { CpoTab } from './tabs/cpo-tab';

type TabId = 'overview' | 'service' | 'documents' | 'timeline' | 'cpo';

interface LifetimeVehicleViewProps {
  vehicle: OwnedVehicleView;
  serviceRecords: ServiceRecordView[];
  earlierServiceCount: number;
  documents: Document[];
  events: OwnershipChangeEvent[];
}

export function LifetimeVehicleView({
  vehicle,
  serviceRecords,
  earlierServiceCount,
  documents,
  events,
}: LifetimeVehicleViewProps) {
  const t = useTranslations('portal.vehicles');
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [showRevokeDialog, setShowRevokeDialog] = React.useState(false);
  const [hasRevoked, setHasRevoked] = React.useState(false);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: t('tabOverview') },
    { id: 'service', label: t('tabService') },
    { id: 'documents', label: t('tabDocuments') },
    { id: 'timeline', label: t('tabTimeline') },
    { id: 'cpo', label: t('tabCpo') },
  ];

  const showGraceBanner = vehicle.inGrace && vehicle.graceUntilAt;
  const showRevokeCta = vehicle.isCurrentlyOwned && !hasRevoked;

  return (
    <div className="max-w-5xl">
      {/* Grace banner */}
      {showGraceBanner && (
        <div className="px-6 md:px-12 lg:px-16 pt-6">
          <GraceBanner graceUntilAt={vehicle.graceUntilAt!} vin={vehicle.vin} />
        </div>
      )}

      {/* Tab bar */}
      <div className="px-6 md:px-12 lg:px-16 pt-8">
        <nav
          role="tablist"
          aria-label={t('vehicleTabs')}
          className="flex gap-0 border-b border-line overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-shrink-0 px-5 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
                activeTab === tab.id
                  ? 'text-ink-primary border-b-2 border-accent -mb-px'
                  : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="px-6 md:px-12 lg:px-16 py-10">
        <div
          id="tabpanel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          hidden={activeTab !== 'overview'}
        >
          {activeTab === 'overview' && <OverviewTab vehicle={vehicle} />}
        </div>
        <div
          id="tabpanel-service"
          role="tabpanel"
          aria-labelledby="tab-service"
          hidden={activeTab !== 'service'}
        >
          {activeTab === 'service' && (
            <ServiceTab records={serviceRecords} earlierCount={earlierServiceCount} />
          )}
        </div>
        <div
          id="tabpanel-documents"
          role="tabpanel"
          aria-labelledby="tab-documents"
          hidden={activeTab !== 'documents'}
        >
          {activeTab === 'documents' && <DocumentsTab documents={documents} />}
        </div>
        <div
          id="tabpanel-timeline"
          role="tabpanel"
          aria-labelledby="tab-timeline"
          hidden={activeTab !== 'timeline'}
        >
          {activeTab === 'timeline' && <TimelineTab vehicle={vehicle} events={events} />}
        </div>
        <div
          id="tabpanel-cpo"
          role="tabpanel"
          aria-labelledby="tab-cpo"
          hidden={activeTab !== 'cpo'}
        >
          {activeTab === 'cpo' && <CpoTab vehicle={vehicle} />}
        </div>
      </div>

      {/* Self-revoke CTA */}
      {showRevokeCta && (
        <div className="px-6 md:px-12 lg:px-16 pb-10 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setShowRevokeDialog(true)}
            className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-warning transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-warning"
          >
            {t('selfRevokeCta')}
          </button>
        </div>
      )}

      {/* Self-revoke dialog */}
      {showRevokeDialog && (
        <SelfRevokeDialog
          ownershipId={vehicle.ownershipId}
          vin={vehicle.vin}
          onClose={() => setShowRevokeDialog(false)}
          onRevoked={() => {
            setShowRevokeDialog(false);
            setHasRevoked(true);
          }}
        />
      )}

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
