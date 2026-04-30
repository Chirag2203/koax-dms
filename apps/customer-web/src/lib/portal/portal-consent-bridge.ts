'use client';

/**
 * Portal consent bridge — DEF-PORTAL-1 (SPEC-CUSTOMER-PORTAL-001 §5.1)
 *
 * Single boundary layer between the portal Preferences toggles and the
 * consent ledger. Writes append-only ConsentEntry rows to the portal-side
 * consent store (portalConsentStore) which mirrors the staff-web
 * customers-store.consents shape.
 *
 * Architecture note:
 *   In the mock phase, customer-web and staff-web are separate Next.js
 *   processes with separate Zustand store instances. The portal consent store
 *   in THIS file is the customer-web-local mirror. In production both surfaces
 *   would write to the same persistence layer; the interface is intentionally
 *   identical to staff-web's customers-store so the migration to a shared
 *   backend is a pure I/O swap.
 *
 * L_PORTAL_2 (proposed): Portal consent toggles write append-only ConsentEntry
 *   rows. Staff revocations and portal revocations share the same data model.
 *   notificationPrefs is a shadow field retained in v1.1 for migration only.
 *
 * Cross-reference: SPEC-CUSTOMERS-001 §4 (withdrawConsent, captureConsent),
 *   SPEC-INSURANCE-001 L14 (opt-out boundary check).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ConsentEntry, ConsentPurpose } from '@dms/types';

// ─── Source enum extension (PORTAL_TOGGLE is a portal-only source) ────────────
// ConsentSource in @dms/types is 'PORTAL_SIGNUP' | 'STAFF_FORM' | 'IMPORT'.
// For grant-via-portal we use 'PORTAL_SIGNUP' per spec §5.1.
// The ConsentSource type is not extended — 'PORTAL_SIGNUP' is the correct value.

export type ConsentSource = 'PORTAL_SIGNUP' | 'STAFF_FORM' | 'IMPORT';

// ─── Portal consent store ─────────────────────────────────────────────────────

interface PortalConsentState {
  /** Keyed by consentId — mirrors staff-web customers-store.consents. */
  consents: Record<string, ConsentEntry>;
}

interface PortalConsentActions {
  /** Seed consent entries (called by migration on first portal load). */
  hydrateConsents(entries: ConsentEntry[]): void;

  /** Append-only capture — creates new entry, never mutates existing. */
  captureConsent(entry: Omit<ConsentEntry, 'id'>): ConsentEntry;

  /**
   * Revoke the latest active entry for customer + purpose.
   * Sets revokedAt / revokedBy / revokedByName / revocationReason.
   * Throws if no active entry found.
   */
  withdrawConsent(
    customerId: string,
    purpose: ConsentPurpose,
    actor: { id: string; name: string },
    reason: string,
  ): void;

  /** Get all active (non-revoked) entries for a customer + purpose. */
  getActiveConsent(customerId: string, purpose: ConsentPurpose): ConsentEntry | undefined;
}

export type PortalConsentStore = PortalConsentState & PortalConsentActions;

function nextConsentId(): string {
  return `portal-consent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const usePortalConsentStore = create<PortalConsentStore>()(
  immer((set, get) => ({
    consents: {},

    hydrateConsents(entries) {
      set((state) => {
        for (const entry of entries) {
          state.consents[entry.id] = entry;
        }
      });
    },

    captureConsent(entryWithoutId) {
      const newEntry: ConsentEntry = {
        ...entryWithoutId,
        id: nextConsentId(),
      };
      set((state) => {
        state.consents[newEntry.id] = newEntry;
      });
      return newEntry;
    },

    withdrawConsent(customerId, purpose, actor, reason) {
      const state = get();
      // Find the latest active (non-revoked) entry for this customer + purpose
      const activeEntry = Object.values(state.consents)
        .filter(
          (c) =>
            c.customerId === customerId &&
            c.purpose === purpose &&
            !c.revokedAt,
        )
        .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];

      if (!activeEntry) {
        throw new Error(
          `No active consent found for customer=${customerId} purpose=${purpose}`,
        );
      }

      const now = new Date().toISOString();
      set((draft) => {
        const entry = draft.consents[activeEntry.id];
        if (!entry) return;
        entry.revokedAt = now;
        entry.revokedBy = actor.id;
        entry.revokedByName = actor.name;
        entry.revocationReason = reason;
      });
    },

    getActiveConsent(customerId, purpose) {
      return Object.values(get().consents).find(
        (c) =>
          c.customerId === customerId &&
          c.purpose === purpose &&
          !c.revokedAt,
      );
    },
  })),
);

// ─── Purpose mapping (portal keys → ConsentPurpose) ──────────────────────────

/**
 * Maps portal-level preference keys to DPDP ConsentPurpose values.
 * SPEC-CUSTOMER-PORTAL-001 §5.1 — purpose mapping table.
 */
export const PORTAL_PURPOSE_MAP: Record<string, ConsentPurpose> = {
  whatsappUpdates: 'WHATSAPP_MARKETING',
  emailNotifications: 'EMAIL_MARKETING',
  smsReminders: 'SERVICE_REMINDER',
  // quarterlyJournal intentionally omitted — no DPDP consent purpose defined yet.
};

// ─── Bridge action ────────────────────────────────────────────────────────────

/**
 * recordPortalConsentChange — DEF-PORTAL-1 bridge action.
 *
 * Called whenever a portal Preferences toggle changes.
 *
 * Grant (toggle ON):
 *   Writes a fresh ConsentEntry with source='PORTAL_SIGNUP', capturedBy=customerId.
 *   Prior revoked entries for the same purpose remain untouched (append-only ledger).
 *
 * Revoke (toggle OFF):
 *   Sets revokedAt/revokedBy/revokedByName/revocationReason on the latest
 *   active entry for this purpose via withdrawConsent.
 *
 * @param customerId     Portal customer id (R20, self-actor)
 * @param customerName   Portal customer display name
 * @param purpose        DPDP ConsentPurpose
 * @param granted        true = toggle ON (grant); false = toggle OFF (revoke)
 */
export function recordPortalConsentChange(
  customerId: string,
  customerName: string,
  purpose: ConsentPurpose,
  granted: boolean,
): void {
  const store = usePortalConsentStore.getState();

  if (granted) {
    // L_PORTAL_2: append-only — create new entry, do NOT touch prior revoked entries
    store.captureConsent({
      customerId,
      purpose,
      capturedAt: new Date().toISOString(),
      capturedBy: customerId,
      capturedByName: customerName,
      source: 'PORTAL_SIGNUP',
    });
  } else {
    // Revoke: set revokedAt on the latest active entry
    try {
      store.withdrawConsent(
        customerId,
        purpose,
        { id: customerId, name: customerName },
        'Customer self-revoke via portal',
      );
    } catch {
      // No active entry to revoke — toggle was OFF already or was never set.
      // Silently absorb: the UI state is already correct.
    }
  }
}

// ─── Consent check helper (for insurance audience exclusion) ─────────────────

/**
 * isConsentActive — checks whether the portal customer currently has an
 * active (non-revoked) consent for the given purpose.
 *
 * Called by the insurance audience builder (SPEC-INSURANCE-001 L14) to
 * exclude portal-revoked customers from WhatsApp campaigns.
 *
 * The portal consent store is the source of truth for consent state written
 * via the portal. In production this would query the shared DB instead.
 */
export function isConsentActive(customerId: string, purpose: ConsentPurpose): boolean {
  const active = usePortalConsentStore.getState().getActiveConsent(customerId, purpose);
  return active !== undefined;
}
