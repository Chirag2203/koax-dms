/**
 * Consent bridge — SPEC-NOTIFICATIONS-001 L4, L18
 *
 * L4: Opt-out re-check at recordSent boundary. Before creating a dispatch
 *   record with status 'sent', re-check the ConsentEntry log for the recipient.
 *   If consent for the relevant purpose is revokedAt !== null, dispatch is
 *   logged with status 'opted-out' and the actual send is suppressed.
 *
 * L18: DPDP consent snapshot per dispatch — frozen at recordSent call time.
 *   This snapshot is the primary DSR evidence artefact (DPDP Act 2023 §11).
 *
 * Purpose mapping (OQ-4 resolution):
 *   WHATSAPP + INSURANCE      → WHATSAPP_MARKETING
 *   WHATSAPP/SMS + SERVICE_BOOKING → SERVICE_REMINDER
 *   WHATSAPP/SMS + CUSTOM_BUILDS   → DATA_PROCESSING
 *   WHATSAPP/SMS + CUSTOMERS       → DATA_PROCESSING
 *
 * Extends SPEC-INSURANCE-001 L14 to all modules.
 */

import type {
  NotificationChannel,
  NotificationModule,
  NotificationConsentSnapshot,
} from '@dms/types';
import { useCustomersStore } from '../customers/customers-store';

export type ConsentCheckResult =
  | { allowed: true; snapshot: NotificationConsentSnapshot }
  | { allowed: false; snapshot: NotificationConsentSnapshot };

/**
 * Map channel + module to ConsentPurpose.
 * OQ-4: Custom Builds uses DATA_PROCESSING as broadest lawful basis.
 */
export function getPurposeForDispatch(
  channel: NotificationChannel,
  module: NotificationModule,
): NotificationConsentSnapshot['purpose'] {
  if (channel === 'WHATSAPP' && module === 'INSURANCE') return 'WHATSAPP_MARKETING';
  if ((channel === 'WHATSAPP' || channel === 'SMS') && module === 'SERVICE_BOOKING') {
    return 'SERVICE_REMINDER';
  }
  if ((channel === 'WHATSAPP' || channel === 'SMS') && module === 'CUSTOM_BUILDS') {
    return 'DATA_PROCESSING';
  }
  if ((channel === 'WHATSAPP' || channel === 'SMS') && module === 'CUSTOMERS') {
    return 'DATA_PROCESSING';
  }
  // EMAIL and PUSH: use DATA_PROCESSING as default
  return 'DATA_PROCESSING';
}

/**
 * L4: Re-check consent at dispatch boundary.
 * Returns snapshot (frozen) and whether the dispatch is allowed.
 *
 * When no customerId is present (raw recipient), dispatch is allowed — we
 * cannot look up consent without a customerId.
 *
 * L18: Snapshot captures state at moment of call — not re-read later.
 */
export function checkConsentAtDispatch(
  customerId: string | undefined,
  providedSnapshot: NotificationConsentSnapshot,
): ConsentCheckResult {
  if (!customerId) {
    // No customerId — raw recipient; cannot check consent; allow
    return { allowed: true, snapshot: providedSnapshot };
  }

  // L4: re-check live consent store
  const consents = useCustomersStore.getState().consents;
  const purpose = providedSnapshot.purpose;

  // Find the active consent entry for this customer + purpose
  const entry = Object.values(consents).find(
    (c) => c.customerId === customerId && c.purpose === purpose,
  );

  // L18: build frozen snapshot from live entry (if found) or use provided
  const snapshot: NotificationConsentSnapshot = entry
    ? {
        purpose: entry.purpose,
        capturedAt: entry.capturedAt,
        capturedBy: entry.capturedBy,
        source: entry.source,
      }
    : providedSnapshot;

  // L4: if consent is revoked → opted-out
  if (entry && entry.revokedAt != null) {
    return { allowed: false, snapshot };
  }

  return { allowed: true, snapshot };
}
