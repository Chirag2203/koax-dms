'use client';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// Local type until @dms/types exposes StaffUser
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  /** 2-letter initials */
  avatar: string;
  /** e.g. 'R05', 'R10' */
  role: string;
  /** e.g. "Sales Manager" */
  roleName: string;
  outlet: 'bangalore' | 'mumbai' | 'chennai' | 'all';
  permissions: string[];
}

const STORAGE_KEY = 'bn-staff-user-v2';

// 8 hardcoded staff profiles for dev role-switching (Doc 14 — 24 roles).
// Exported so the sidebar role switcher (PLAN-PARTS-007 §3) can list them
// without duplicating the fixture data.
export const MOCK_STAFF_PROFILES: StaffUser[] = [
  {
    id: 'staff-r05-001',
    name: 'Rahul Kumar',
    email: 'rahul.kumar@bnautomobiles.in',
    avatar: 'RK',
    role: 'R05',
    roleName: 'Sales Associate',
    outlet: 'bangalore',
    permissions: ['inventory.read', 'sales.read', 'customers.read'],
  },
  {
    id: 'staff-r09-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@bnautomobiles.in',
    avatar: 'PS',
    role: 'R09',
    roleName: 'Service Advisor',
    outlet: 'bangalore',
    permissions: ['service.read', 'service.write', 'customers.read', 'parts.read'],
  },
  {
    id: 'staff-r10-001',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@bnautomobiles.in',
    avatar: 'AM',
    role: 'R10',
    roleName: 'Sales Manager',
    outlet: 'mumbai',
    permissions: [
      'inventory.read',
      'inventory.write',
      'sales.read',
      'sales.write',
      'customers.read',
      'customers.write',
      'reports.read',
    ],
  },
  {
    id: 'staff-r12-001',
    name: 'Vikram Singh',
    email: 'vikram.singh@bnautomobiles.in',
    avatar: 'VS',
    role: 'R12',
    roleName: 'Parts Manager',
    outlet: 'chennai',
    permissions: ['parts.read', 'parts.write', 'inventory.read', 'reports.read'],
  },
  {
    id: 'staff-r16-001',
    name: 'Anita Desai',
    email: 'anita.desai@bnautomobiles.in',
    avatar: 'AD',
    role: 'R16',
    roleName: 'Finance Controller',
    outlet: 'bangalore',
    permissions: [
      'finance.read',
      'finance.write',
      'reports.read',
      'reports.finance',
      'customers.read',
    ],
  },
  {
    id: 'staff-r19-001',
    name: 'Sunita Reddy',
    email: 'sunita.reddy@bnautomobiles.in',
    avatar: 'SR',
    role: 'R19',
    roleName: 'General Manager',
    outlet: 'mumbai',
    permissions: [
      'inventory.read',
      'inventory.write',
      'sales.read',
      'sales.write',
      'service.read',
      'service.write',
      'parts.read',
      'parts.write',
      'finance.read',
      'customers.read',
      'customers.write',
      'reports.read',
      'reports.all',
    ],
  },
  {
    id: 'staff-r22-001',
    name: 'Karan Shah',
    email: 'karan.shah@bnautomobiles.in',
    avatar: 'KS',
    role: 'R22',
    roleName: 'CFO',
    outlet: 'all',
    permissions: [
      'finance.read',
      'finance.write',
      'finance.approve',
      'reports.read',
      'reports.all',
      'reports.finance',
      'inventory.read',
      'sales.read',
      'customers.read',
    ],
  },
  {
    id: 'staff-r24-001',
    name: 'Meera Iyer',
    email: 'meera.iyer@bnautomobiles.in',
    avatar: 'MI',
    role: 'R24',
    roleName: 'CEO',
    outlet: 'all',
    permissions: ['*'],
  },
];

// Default mock user on first load — R24 Meera Iyer, CEO (pan-India, all permissions)
const DEFAULT_STAFF_USER = MOCK_STAFF_PROFILES[7] as StaffUser;

interface StaffAuthContextValue {
  user: StaffUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
  /** Dev tool — cycles through 8 hardcoded staff profiles */
  switchRole: (roleCode: string) => void;
}

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount; seed default user if absent
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored) as StaffUser);
      } else {
        // Seed default mock user
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STAFF_USER));
        setUser(DEFAULT_STAFF_USER);
      }
    } catch {
      // ignore parse errors — fall back to default
      setUser(DEFAULT_STAFF_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string) => {
    // Mock sign-in: find profile by email or fall back to default
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    const match = MOCK_STAFF_PROFILES.find((p) => p.email === email);
    const staffUser: StaffUser = match
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
