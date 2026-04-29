/**
 * Notification dispatch detail page — SPEC-NOTIFICATIONS-001 §6.2
 * Route: /notifications/[id]
 */

import { NotificationDetailView } from '@/src/components/notifications/notification-detail-view';
import { NotificationsStoreHydrator } from '@/src/lib/notifications/notifications-store-hydrator';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <NotificationsStoreHydrator />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Back to dispatch log
          </Link>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">Dispatch Record</h1>
          <p className="text-xs text-ink-muted font-mono mt-0.5">{id}</p>
        </div>
        <NotificationDetailView dispatchId={id} />
      </div>
    </>
  );
}
