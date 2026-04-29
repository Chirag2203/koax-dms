/**
 * Notification template detail page — SPEC-NOTIFICATIONS-001 §6.3
 * Route: /notifications/templates/[id]
 */

import { TemplateDetailView } from '@/src/components/notifications/templates/template-detail-view';
import { NotificationsStoreHydrator } from '@/src/lib/notifications/notifications-store-hydrator';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Actor } from '@dms/types';

// v1: stub actor — real auth wired in v1.1 via server session
const STUB_ACTOR: Actor = { id: 'staff-admin-001', name: 'Admin', role: 'R19' };

export default async function NotificationTemplateDetailPage({
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
            href="/notifications/templates"
            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Back to registry
          </Link>
        </div>
        <TemplateDetailView templateId={id} actor={STUB_ACTOR} />
      </div>
    </>
  );
}
