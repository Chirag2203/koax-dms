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
 * Spec reference: SPEC-PORTAL-VEHICLES-001 §1.1
 */

import { createContext, useContext, type ReactNode } from 'react';

const MOCK_PORTAL_CUSTOMER_ID = 'cust-arjun-mehta';

interface PortalAuthContextValue {
  customerId: string;
  isAuthenticated: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  return (
    <PortalAuthContext.Provider
      value={{ customerId: MOCK_PORTAL_CUSTOMER_ID, isAuthenticated: true }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth(): PortalAuthContextValue {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider');
  return ctx;
}
