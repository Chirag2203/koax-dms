/**
 * Notifications hub page — SPEC-NOTIFICATIONS-001 §6.1
 * Route: /notifications
 *
 * L9: filter state lives in URL search params.
 * L12: 50 rows/page, sentAt DESC, ?page=N
 * L13: empty state when no results
 */

import { Suspense } from 'react';
import type { NotificationModule, NotificationChannel, NotificationStatus } from '@dms/types';
import { NotificationsHubView } from '@/src/components/notifications/notifications-hub-view';
import { NotificationsStoreHydrator } from '@/src/lib/notifications/notifications-store-hydrator';

interface SearchParams {
  page?: string;
  module?: string;
  channel?: string;
  status?: string;
  from?: string;
  to?: string;
  recipient?: string;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const filters = {
    page: params.page ? Math.max(1, parseInt(params.page, 10)) : 1,
    module: params.module as NotificationModule | undefined,
    channel: params.channel as NotificationChannel | undefined,
    status: params.status as NotificationStatus | undefined,
    from: params.from,
    to: params.to,
    recipient: params.recipient,
  };

  return (
    <>
      <NotificationsStoreHydrator />
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">Notifications</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Central dispatch log for all outbound communications
          </p>
        </div>
        <Suspense fallback={null}>
          <NotificationsHubView filters={filters} />
        </Suspense>
      </div>
    </>
  );
}
