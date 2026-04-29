/**
 * New notification template page — SPEC-NOTIFICATIONS-001 §6.4
 * Route: /notifications/templates/new
 */

import { TemplateCreateForm } from '@/src/components/notifications/templates/template-create-form';
import { NotificationsStoreHydrator } from '@/src/lib/notifications/notifications-store-hydrator';
import { Gate } from '@/src/components/primitives/gate';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Actor } from '@dms/types';

const STUB_ACTOR: Actor = { id: 'staff-admin-001', name: 'Admin', role: 'R19' };

export default function NotificationTemplateNewPage() {
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
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">New Template</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Create a DRAFT template. Submit for DLT review when ready.
          </p>
        </div>
        <Gate permission="notifications:template:manage" fallback="disable">
          <TemplateCreateForm actor={STUB_ACTOR} />
        </Gate>
      </div>
    </>
  );
}
