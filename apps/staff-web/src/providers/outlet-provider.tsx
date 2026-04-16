'use client';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useStaffAuth } from './staff-auth-provider';

export type OutletSlug = 'bangalore' | 'mumbai' | 'chennai' | 'all';

const STORAGE_KEY = 'bn-staff-outlet';
const COOKIE_KEY = 'bn-staff-outlet';

const VALID_OUTLETS: OutletSlug[] = ['bangalore', 'mumbai', 'chennai', 'all'];

const OUTLET_LABELS: Record<OutletSlug, string> = {
  bangalore: 'Bangalore',
  mumbai: 'Mumbai',
  chennai: 'Chennai',
  all: 'All Outlets',
};

// Roles R19+ (GM, CFO, CEO) get 'all' as their default scope
const CROSS_OUTLET_ROLES = ['R19', 'R20', 'R21', 'R22', 'R23', 'R24'];

export interface OutletContextValue {
  outlet: OutletSlug;
  setOutlet: (outlet: OutletSlug) => void;
  outletLabel: string;
}

export const OutletContext = createContext<OutletContextValue | null>(null);

function readStoredOutlet(): OutletSlug | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_OUTLETS.includes(stored as OutletSlug)) {
      return stored as OutletSlug;
    }
  } catch {
    // localStorage may be blocked in some environments
  }
  return null;
}

function persistOutlet(outlet: OutletSlug): void {
  try {
    localStorage.setItem(STORAGE_KEY, outlet);
  } catch {
    // localStorage may be blocked in some environments
  }
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_KEY}=${outlet}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

export function OutletProvider({ children }: { children: ReactNode }) {
  const { user } = useStaffAuth();
  const [outlet, setOutletState] = useState<OutletSlug>('all');

  // On mount: derive initial outlet from stored value or user's own outlet
  useEffect(() => {
    const stored = readStoredOutlet();
    if (stored) {
      setOutletState(stored);
      return;
    }

    // No stored value — derive from logged-in user
    if (user) {
      const initial: OutletSlug =
        user.outlet === 'all' || CROSS_OUTLET_ROLES.includes(user.role)
          ? 'all'
          : user.outlet;
      setOutletState(initial);
      persistOutlet(initial);
    }
  }, [user]);

  const setOutlet = useCallback((next: OutletSlug) => {
    setOutletState(next);
    persistOutlet(next);
  }, []);

  return (
    <OutletContext.Provider
      value={{
        outlet,
        setOutlet,
        outletLabel: OUTLET_LABELS[outlet],
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet(): OutletContextValue {
  const ctx = useContext(OutletContext);
  if (!ctx) {
    throw new Error('useOutlet must be used within OutletProvider');
  }
  return ctx;
}
