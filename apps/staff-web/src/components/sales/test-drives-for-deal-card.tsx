'use client';

/**
 * TestDrivesForDealCard — shows test-drive bookings linked to a sales deal.
 *
 * Seam 44: reads useTestDriveStore (by customerName + vehicleVin match).
 * SPEC-TEST-DRIVE-001 cross-module integration.
 *
 * PRE-FLIGHT UI CHECKLIST (CLAUDE.md §17.1):
 * - Card/Field from custom-builds/shared/detail-card (canonical)
 * - text-xs / text-sm / text-base only (no text-[NNpx])
 * - rounded-md only (forbidden: rounded larger than md)
 * - Zustand selector returns base ref; filter in useMemo (avoids infinite-render)
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Deal } from '@dms/types';
import { useTestDriveStore } from '@/src/lib/test-drive/test-drive-store';
import { Card } from '@/src/components/custom-builds/shared/detail-card';
import { TestDriveStatusChip } from '@/src/components/test-drives/test-drive-status-chip';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const SLOT_LABEL: Record<string, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  FULL_DAY: 'Full Day',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  deal: Deal;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TestDrivesForDealCard({ deal }: Props) {
  const t = useTranslations('staff.enquiryDetail.testDrivesCard');

  // Seam 44: base ref selector — ONE per Zustand rule (no object-destructure)
  const bookings = useTestDriveStore((s) => s.bookings);

  // Filter in useMemo to avoid infinite-render bug (CLAUDE.md §17)
  const linked = useMemo(() => {
    return Object.values(bookings).filter(
      (b) =>
        b.customerName === deal.customerName &&
        deal.vehicleVin &&
        b.vehicleVin === deal.vehicleVin,
    );
  }, [bookings, deal.customerName, deal.vehicleVin]);

  const count = linked.length;

  return (
    <Card
      title={t('title')}
      rightSlot={
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="inline-flex items-center justify-center rounded-md bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent">
              {count}
            </span>
          )}
          <Link
            href={
              deal.vehicleVin
                ? `/test-drives/new?customerId=${encodeURIComponent(deal.customerName)}&vehicleVin=${encodeURIComponent(deal.vehicleVin)}`
                : `/test-drives/new?customerId=${encodeURIComponent(deal.customerName)}`
            }
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {t('bookNew')}
          </Link>
        </div>
      }
    >
      {count === 0 ? (
        <p className="text-sm text-ink-muted">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {linked.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line bg-bg-subtle p-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-ink-muted">
                    {formatDate(booking.requestedDate)}
                  </span>
                  <span className="text-ink-muted text-xs">·</span>
                  <span className="text-xs text-ink-muted">
                    {SLOT_LABEL[booking.confirmedSlot ?? booking.requestedSlot] ??
                      booking.requestedSlot}
                  </span>
                  {booking.assignedAdvisorName && (
                    <>
                      <span className="text-ink-muted text-xs">·</span>
                      <span className="text-xs text-ink-muted truncate">
                        {booking.assignedAdvisorName}
                      </span>
                    </>
                  )}
                </div>
                <TestDriveStatusChip status={booking.status} />
              </div>
              <Link
                href={`/test-drives/${booking.id}`}
                className="shrink-0 text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('view')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
