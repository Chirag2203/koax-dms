/**
 * Notifications store hydrator — SPEC-NOTIFICATIONS-001
 *
 * Seeds the notifications store with fixture data on first render.
 * Pattern matches insurance-store-hydrator and custom-builds-store-hydrator.
 */

'use client';

import { useEffect, useRef } from 'react';
import {
  notificationTemplates,
  notificationDispatches,
  notificationAuditEvents,
} from '@dms/mocks/fixtures';
import { useNotificationsStore } from './notifications-store';

export function NotificationsStoreHydrator({
  children,
}: {
  children?: React.ReactNode;
}) {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    useNotificationsStore
      .getState()
      ._seed(notificationTemplates, notificationDispatches, notificationAuditEvents);
  }, []);

  return <>{children}</>;
}
