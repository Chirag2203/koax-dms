'use client';

/**
 * Staff consent bridge — DPDP-C2 (2026-04-30)
 *
 * Single boundary layer between staff customer create/edit forms and the
 * customers-store consent ledger. Emits append-only ConsentEntry rows for
 * every communication-preference toggle change made by staff.
 *
 * Architecture decision (L_STAFF_CONSENT_1):
 *   Staff-web already has a full consent ledger in useCustomersStore.consents
 *   (captureConsent / withdrawConsent actions, audit events, seeded from fixture).
 *   This bridge does NOT create a separate store — it wraps the existing store
 *   actions to add the DPDP-C2 requirement: audit WHO (capturedByStaffId) captured
 *   the consent, not just that the customer gave it.
 *
 * Purpose map (mirrors PORTAL_PURPOSE_MAP in portal-consent-bridge.ts):
 *   whatsappUpdates   → WHATSAPP_MARKETING
 *   smsAlerts         → SMS_MARKETING
 *   emailNewsletter   → EMAIL_MARKETING
 *   callConsent       → CALL_MARKETING
 *   marketingConsent  → GENERAL_MARKETING
 *
 * CREATE semantics:
 *   Every toggle that is TRUE on create → write one GRANT ConsentEntry.
 *   Toggles that are FALSE on create → no row written (never-granted prefs
 *   do not need a revoke record; a DSR can safely answer "no consent was
 *   ever given for <purpose>" when no row exists).
 *
 * EDIT semantics:
 *   Compute old vs new diff. Each changed toggle:
 *     true  → captureConsent (grant)
 *     false → withdrawConsent on the latest active entry for that purpose
 *
 * DPDP §6 / §11: every row records capturedBy = staffId so the DSR handler
 * can answer "who captured this consent and when."
 *
 * Spec cross-reference:
 *   SPEC-CUSTOMERS-001 §3 (store shape + consent actions)
 *   SPEC-ARCH-UI-001    (L49 Gate primitive usage in caller components)
 */

import type { ConsentPurpose } from '@dms/types';
import { useCustomersStore } from './customers-store';
import type { Actor } from './customers-store';

// ─── Purpose map ──────────────────────────────────────────────────────────────

/**
 * Maps communication-preference field names to DPDP ConsentPurpose values.
 * L_STAFF_CONSENT_1: identical mapping to PORTAL_PURPOSE_MAP in portal-consent-bridge.ts;
 *   the extra channel purposes (SMS_MARKETING, CALL_MARKETING, GENERAL_MARKETING)
 *   were added to ConsentPurposeEnum in @dms/types as part of DPDP-C2.
 */
export const STAFF_PURPOSE_MAP: Record<string, ConsentPurpose> = {
  whatsappUpdates: 'WHATSAPP_MARKETING',
  smsAlerts: 'SMS_MARKETING',
  emailNewsletter: 'EMAIL_MARKETING',
  callConsent: 'CALL_MARKETING',
  marketingConsent: 'GENERAL_MARKETING',
};

// ─── Communication preferences shape ─────────────────────────────────────────

export interface CommunicationPrefsInput {
  whatsappUpdates: boolean;
  smsAlerts: boolean;
  emailNewsletter: boolean;
  callConsent: boolean;
  marketingConsent: boolean;
}

// ─── Helper: get latest active consent for purpose ───────────────────────────

function getLatestActiveConsent(customerId: string, purpose: ConsentPurpose) {
  const { consents } = useCustomersStore.getState();
  return Object.values(consents)
    .filter(
      (c) =>
        c.customerId === customerId &&
        c.purpose === purpose &&
        !c.revokedAt,
    )
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
}

// ─── Bridge: record a single grant/revoke ─────────────────────────────────────

/**
 * recordStaffConsentChange — DPDP-C2 bridge action.
 *
 * Called by staff create/edit handlers for each changed preference toggle.
 *
 * Grant (toggle → true):
 *   Calls captureConsent to create a new ConsentEntry.
 *   source = 'STAFF_FORM', capturedBy = capturedByStaffId.
 *   Prior revoked entries for the same purpose are untouched (append-only).
 *
 * Revoke (toggle → false):
 *   Finds the latest active entry for customerId + purpose and calls
 *   withdrawConsent. If no active entry exists, silently no-ops
 *   (toggle was already off or no prior grant).
 *
 * @param customerId         Customer being updated
 * @param customerName       Customer display name (for capturedByName on self-grants)
 * @param purpose            DPDP ConsentPurpose
 * @param granted            true = grant; false = revoke
 * @param capturedByStaffId  Staff member performing the action (DPDP §6 audit trail)
 * @param capturedByStaffName Staff display name
 */
export function recordStaffConsentChange(
  customerId: string,
  customerName: string,
  purpose: ConsentPurpose,
  granted: boolean,
  capturedByStaffId: string,
  capturedByStaffName: string,
): void {
  const store = useCustomersStore.getState();
  const actor: Actor = { id: capturedByStaffId, name: capturedByStaffName };

  if (granted) {
    // L_STAFF_CONSENT_1: append-only — create new entry; do NOT mutate prior revoked entries
    store.captureConsent(
      {
        customerId,
        purpose,
        capturedAt: new Date().toISOString(),
        capturedBy: capturedByStaffId,
        capturedByName: capturedByStaffName,
        source: 'STAFF_FORM',
      },
      actor,
    );
  } else {
    // Revoke: find the latest active entry and mark revokedAt
    const activeEntry = getLatestActiveConsent(customerId, purpose);
    if (!activeEntry) {
      // No active entry — toggle was already off or never granted; no-op
      return;
    }
    try {
      store.withdrawConsent(
        activeEntry.id,
        `Staff revoked via customer ${granted ? 'create' : 'edit'} form — ${customerName}`,
        actor,
      );
    } catch {
      // Already revoked between getLatestActiveConsent and withdrawConsent (race).
      // Silently absorb.
    }
  }
}

// ─── Bridge: emit consent entries for CREATE ──────────────────────────────────

/**
 * recordCreateConsentEntries — called by NewCustomerDialog on submit.
 *
 * CREATE semantics: every pref that is TRUE → GRANT row.
 * FALSE prefs → no row (never-granted prefs need no revocation record).
 *
 * @param customerId         Newly created customer id
 * @param customerName       Customer display name
 * @param prefs              Communication preferences from the create form
 * @param capturedByStaffId  Staff id performing the create
 * @param capturedByStaffName Staff display name
 */
export function recordCreateConsentEntries(
  customerId: string,
  customerName: string,
  prefs: CommunicationPrefsInput,
  capturedByStaffId: string,
  capturedByStaffName: string,
): void {
  for (const [key, purpose] of Object.entries(STAFF_PURPOSE_MAP)) {
    const granted = prefs[key as keyof CommunicationPrefsInput];
    if (granted) {
      recordStaffConsentChange(
        customerId,
        customerName,
        purpose,
        true,
        capturedByStaffId,
        capturedByStaffName,
      );
    }
    // false → no row needed (see CREATE semantics above)
  }
}

// ─── Bridge: diff old vs new prefs and emit changes ───────────────────────────

/**
 * recordEditConsentDiff — called by edit handlers when communication prefs change.
 *
 * Computes old vs new diff. For each changed field:
 *   true  → captureConsent (new grant)
 *   false → withdrawConsent on latest active entry
 *
 * Unchanged fields → no row emitted.
 *
 * @param customerId          Customer being edited
 * @param customerName        Customer display name
 * @param oldPrefs            Prefs before the edit
 * @param newPrefs            Prefs after the edit
 * @param capturedByStaffId   Staff id performing the edit
 * @param capturedByStaffName Staff display name
 */
export function recordEditConsentDiff(
  customerId: string,
  customerName: string,
  oldPrefs: CommunicationPrefsInput,
  newPrefs: CommunicationPrefsInput,
  capturedByStaffId: string,
  capturedByStaffName: string,
): void {
  for (const [key, purpose] of Object.entries(STAFF_PURPOSE_MAP)) {
    const prefKey = key as keyof CommunicationPrefsInput;
    const wasGranted = oldPrefs[prefKey];
    const isGranted = newPrefs[prefKey];

    if (wasGranted === isGranted) continue; // no change — no row

    recordStaffConsentChange(
      customerId,
      customerName,
      purpose,
      isGranted,
      capturedByStaffId,
      capturedByStaffName,
    );
  }
}

// ─── Consent check helper ─────────────────────────────────────────────────────

/**
 * isConsentActive — check whether a customer has an active (non-revoked) consent
 * for the given purpose via the staff consent store.
 *
 * Used by insurance audience builder and notification dispatch gate (SPEC-NOTIFICATIONS-001 L4).
 */
export function isConsentActive(customerId: string, purpose: ConsentPurpose): boolean {
  const active = getLatestActiveConsent(customerId, purpose);
  return active !== undefined;
}
