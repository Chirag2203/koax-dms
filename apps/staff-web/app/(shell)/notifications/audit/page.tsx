/**
 * Notification audit log page — SPEC-NOTIFICATIONS-001 §6.5
 * Route: /notifications/audit
 *
 * R23-gated (DPO access only). Full PII — L3 exemption for R23.
 * L7: DSR export (DPDP Act 2023).
 */

import { AuditView } from '@/src/components/notifications/audit/audit-view';
import { NotificationsStoreHydrator } from '@/src/lib/notifications/notifications-store-hydrator';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NotificationAuditPage() {
  return (
    <>
      <NotificationsStoreHydrator />
      <div className="px-6 py-8 space-y-6">
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
          <h1 className="text-lg font-semibold text-ink-primary">Audit Log</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Full event log — R23 DPO access. DPDP Act 2023 DSR export available.
          </p>
        </div>
        <AuditView />
      </div>
    </>
  );
}
