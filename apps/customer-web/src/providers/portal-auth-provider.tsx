'use client';

/**
 * Portal auth provider — wraps the portal layout.
 *
 * Hard-codes MOCK_PORTAL_CUSTOMER_ID = 'cust-arjun-mehta' for P3 demo.
 * Role switcher deferred per SPEC §1.1.
 *
 * Exposes { customerId, isAuthenticated } via usePortalAuth() for portal
 * components that need to know the portal user's customer ID (separate from
 * useAuth().user.id which points to the auth session customer).
 *
 * DEF-PORTAL-1: On first portal auth, runs a one-time migration of
 *   R20Customer.notificationPrefs → ConsentEntry rows in the portal consent
 *   store (source: 'PORTAL_SIGNUP'). This is the L_PORTAL_2 gradual migration
 *   path — notificationPrefs is NOT removed from the schema in v1.1.
 *
 * Spec reference: SPEC-PORTAL-VEHICLES-001 §1.1, SPEC-CUSTOMER-PORTAL-001 §5.1
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { communicationPreferences, mockCustomer } from '@dms/mocks/fixtures';
import {
  usePortalConsentStore,
  PORTAL_PURPOSE_MAP,
} from '../lib/portal/portal-consent-bridge';

const MOCK_PORTAL_CUSTOMER_ID = 'cust-arjun-mehta';

interface PortalAuthContextValue {
  customerId: string;
  isAuthenticated: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

// ─── One-time notificationPrefs → ConsentEntry migration (DEF-PORTAL-1) ──────

/**
 * PortalConsentMigrator — side-effect component.
 *
 * Runs once on first portal auth load. Translates R20Customer.notificationPrefs
 * (CommunicationPreferences booleans) into ConsentEntry rows in the portal
 * consent store for any preference that is `true` AND has no existing
 * PORTAL_SIGNUP entry in the store.
 *
 * L_PORTAL_2: source is 'PORTAL_SIGNUP' for migrated entries (not 'IMPORT')
 * because these reflect the customer's explicit original opt-in state.
 * The capturedAt is set to the customer's memberSince date as the closest
 * available proxy for the original consent timestamp.
 */
function PortalConsentMigrator({ customerId }: { customerId: string }) {
  const migrationRan = useRef(false);

  useEffect(() => {
    if (migrationRan.current) return;
    migrationRan.current = true;

    const store = usePortalConsentStore.getState();
    const existingConsents = Object.values(store.consents);

    // Check whether the customer already has any PORTAL_* entries
    const hasPortalEntries = existingConsents.some(
      (c) =>
        c.customerId === customerId &&
        (c.source === 'PORTAL_SIGNUP'),
    );

    // If PORTAL_SIGNUP entries exist, migration already ran — skip.
    if (hasPortalEntries) return;

    // Translate each boolean pref that maps to a ConsentPurpose
    const prefs = communicationPreferences;
    const capturedAt = mockCustomer.memberSince
      ? `${mockCustomer.memberSince}T00:00:00.000Z`
      : new Date().toISOString();

    for (const [key, purpose] of Object.entries(PORTAL_PURPOSE_MAP)) {
      const isActive = prefs[key as keyof typeof prefs];
      if (isActive) {
        store.captureConsent({
          customerId,
          purpose,
          capturedAt,
          capturedBy: customerId,
          capturedByName: mockCustomer.name,
          source: 'PORTAL_SIGNUP',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  return (
    <PortalAuthContext.Provider
      value={{ customerId: MOCK_PORTAL_CUSTOMER_ID, isAuthenticated: true }}
    >
      {/* DEF-PORTAL-1: one-time migration of notificationPrefs → ConsentEntry */}
      <PortalConsentMigrator customerId={MOCK_PORTAL_CUSTOMER_ID} />
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth(): PortalAuthContextValue {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider');
  return ctx;
}
