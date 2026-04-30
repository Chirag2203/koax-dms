'use client';

/**
 * Test-drive queue — staff hub view.
 *
 * PRE-FLIGHT UI CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 * 1. Card + Field from custom-builds/shared/detail-card — imported below.
 * 2. text-xs / sm / base / lg / xl / 2xl only — NO text-[NNpx].
 * 3. rounded-md only (no oversized radius classes).
 * 4. Gate for RBAC — Gate imported below.
 * 5. i18n via useTranslations('testDrives.*').
 * 6. Button from @/src/components/primitives/button.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S10 S13 S14
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarCheck, Car, MapPin } from 'lucide-react';
import { useTestDriveStore } from '@/src/lib/test-drive/test-drive-store';
import { TestDriveStoreHydrator } from '@/src/lib/test-drive/test-drive-store-hydrator';
import { TestDriveStatusChip } from './test-drive-status-chip';
import { Gate } from '@/src/components/primitives/gate';
import { Button } from '@/src/components/primitives/button';
import { useOutlet } from '@/src/providers/outlet-provider';
import type { TestDriveStatus, TestDriveBooking } from '@dms/types';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { key: TestDriveStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'EXECUTING', label: 'On Drive' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'NO_SHOW', label: 'No Show' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const OUTLET_LABEL: Record<string, string> = {
  bangalore: 'BLR',
  mumbai: 'MUM',
  chennai: 'CHE',
};

const SLOT_LABEL: Record<string, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  FULL_DAY: 'Full Day',
};

// ─── Booking row card ──────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: TestDriveBooking }) {
  const t = useTranslations('testDrives');

  const dateStr = booking.confirmedDate ?? booking.requestedDate;
  const slotStr = SLOT_LABEL[booking.confirmedSlot ?? booking.requestedSlot] ?? '';
  const outletCode = OUTLET_LABEL[booking.outletId] ?? booking.outletId.toUpperCase();

  return (
    <div className="border border-line bg-bg-surface p-4 hover:bg-bg-subtle transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-muted uppercase tracking-wider mb-0.5">
            {booking.id}
          </p>
          <p className="text-sm font-semibold text-ink-primary truncate">
            {booking.customerName}
          </p>
        </div>
        <TestDriveStatusChip status={booking.status} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        <span className="flex items-center gap-1 text-xs text-ink-secondary">
          <Car size={12} strokeWidth={1.5} aria-hidden="true" />
          {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}
        </span>
        <span className="flex items-center gap-1 text-xs text-ink-secondary">
          <CalendarCheck size={12} strokeWidth={1.5} aria-hidden="true" />
          {dateStr} · {slotStr}
        </span>
        <span className="flex items-center gap-1 text-xs text-ink-muted">
          <MapPin size={12} strokeWidth={1.5} aria-hidden="true" />
          {outletCode}
        </span>
      </div>

      {booking.assignedAdvisorName && (
        <p className="text-xs text-ink-muted mb-3">
          {t('advisorLabel')}: {booking.assignedAdvisorName}
        </p>
      )}

      <Link
        href={`/test-drives/${booking.id}`}
        className="text-xs font-mono uppercase tracking-widest text-accent hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t('viewDetail')} →
      </Link>
    </div>
  );
}

// ─── Queue view ───────────────────────────────────────────────────────────────

function QueueContent() {
  const t = useTranslations('testDrives');
  const { outlet } = useOutlet();
  const [activeTab, setActiveTab] = React.useState<TestDriveStatus>('PENDING');

  const selectByOutlet = useTestDriveStore((s) => s.selectByOutlet);

  const allBookings = React.useMemo(
    () => selectByOutlet(outlet),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outlet, selectByOutlet],
  );

  const tabCounts = React.useMemo(
    () => {
      const counts: Partial<Record<TestDriveStatus, number>> = {};
      for (const b of allBookings) {
        counts[b.status] = (counts[b.status] ?? 0) + 1;
      }
      return counts;
    },
    [allBookings],
  );

  const filtered = React.useMemo(
    () => allBookings
      .filter((b) => b.status === activeTab)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [allBookings, activeTab],
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{t('queueTitle')}</h1>
          <p className="text-sm text-ink-secondary mt-0.5">{t('queueSubtitle')}</p>
        </div>
        <Gate role={['R01', 'R03', 'R09', 'R19', 'R22', 'R24']} fallback="hide">
          <Button variant="primary" size="md">
            {t('noAction')}
          </Button>
        </Gate>
      </div>

      {/* Tab bar — S13 */}
      <div className="flex gap-1 border-b border-line mb-6 overflow-x-auto">
        {TABS.map(({ key, label }) => {
          const count = tabCounts[key] ?? 0;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 text-xs font-mono uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors -mb-px',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink-secondary',
              ].join(' ')}
              aria-selected={isActive}
              role="tab"
            >
              {label}
              {count > 0 && (
                <span className={[
                  'inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-xs font-mono tabular-nums',
                  isActive ? 'bg-accent text-white' : 'bg-bg-subtle text-ink-muted',
                ].join(' ')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List — S10 empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-line rounded-md text-center">
          <CalendarCheck size={36} className="text-ink-muted mb-4" strokeWidth={1} aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-secondary mb-1">
            {t('emptyState', { status: TABS.find((t) => t.key === activeTab)?.label ?? activeTab })}
          </p>
          {outlet !== 'all' && (
            <p className="text-xs text-ink-muted">{t('tryAllOutlets')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Test drive bookings">
          {filtered.map((b) => (
            <div key={b.id} role="listitem">
              <BookingCard booking={b} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TestDriveQueueView() {
  return (
    <TestDriveStoreHydrator>
      <QueueContent />
    </TestDriveStoreHydrator>
  );
}
