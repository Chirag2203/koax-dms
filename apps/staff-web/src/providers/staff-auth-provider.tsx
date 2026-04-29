'use client';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { StaffProfile } from '@dms/types';
import { MOCK_STAFF_PROFILES } from '@dms/mocks/fixtures';

// ─── Re-export canonical profiles (SPEC-STAFF-001 §L3 / §16.1) ───────────────
// Canonical list lives in @dms/mocks. staff-auth-provider re-exports so existing
// consumers (sidebar role-switcher, etc.) do not need import-path changes.
export { MOCK_STAFF_PROFILES } from '@dms/mocks/fixtures';

// ─── StaffUser: backwards-compat type ────────────────────────────────────────
// StaffProfile is the canonical type. StaffUser is kept as an alias so older
// consumers (sidebar, hooks) compile without changes.
export type StaffUser = Pick<
  StaffProfile,
  'id' | 'name' | 'email' | 'avatar' | 'role' | 'roleName' | 'outlet' | 'permissions'
>;

const STORAGE_KEY = 'bn-staff-user-v2';

// Default mock user on first load — last profile is CEO (pan-India, all permissions)
const DEFAULT_STAFF_USER: StaffProfile =
  MOCK_STAFF_PROFILES[MOCK_STAFF_PROFILES.length - 1] as StaffProfile;

interface StaffAuthContextValue {
  user: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
  /** Dev tool — cycles through hardcoded staff profiles */
  switchRole: (roleCode: string) => void;
}

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount; seed default user if absent
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored) as StaffProfile);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STAFF_USER));
        setUser(DEFAULT_STAFF_USER);
      }
    } catch {
      setUser(DEFAULT_STAFF_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    const match = MOCK_STAFF_PROFILES.find((p) => p.email === email);
    const staffUser: StaffProfile = match
      ? { ...match }
      : { ...DEFAULT_STAFF_USER, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staffUser));
    setUser(staffUser);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const switchRole = useCallback((roleCode: string) => {
    const profile = MOCK_STAFF_PROFILES.find((p) => p.role === roleCode);
    if (!profile) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setUser({ ...profile });
  }, []);

  return (
    <StaffAuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        signIn,
        signOut,
        switchRole,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) {
    throw new Error('useStaffAuth must be used within StaffAuthProvider');
  }
  return ctx;
}
