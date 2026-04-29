/**
 * Notification template registry — SPEC-NOTIFICATIONS-001 §6.3
 * Route: /notifications/templates
 */

import { TemplateRegistryView } from '@/src/components/notifications/templates/template-registry-view';
import { NotificationsStoreHydrator } from '@/src/lib/notifications/notifications-store-hydrator';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NotificationTemplatesPage() {
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
          <h1 className="text-lg font-semibold text-ink-primary">Template Registry</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            DLT-registered templates for outbound SMS, WhatsApp, Email and Push
          </p>
        </div>
        <TemplateRegistryView />
      </div>
    </>
  );
}
