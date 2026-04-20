'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { Customer } from '@dms/types';
import { mockCustomer } from '@dms/mocks';

const STORAGE_KEY = 'bn-auth-user';

interface AuthContextValue {
  user: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signUp: (data: {
    name: string;
    email: string;
    phone: string;
    preferredCity: Customer['preferredCity'];
    preferredLanguage: Customer['preferredLanguage'];
  }) => Promise<void>;
  signOut: () => void;
  updateUser: (patch: Partial<Customer>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount; seed default mock customer if absent
  // so the portal demo auto-authenticates. Mirrors staff-web DEFAULT_STAFF_USER.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored) as Customer);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockCustomer));
        setUser(mockCustomer);
      }
    } catch {
      // ignore parse errors — fall back to default
      setUser(mockCustomer);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    const customer: Customer = { ...mockCustomer, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
    setUser(customer);
  }, []);

  const signUp = useCallback(
    async (data: {
      name: string;
      email: string;
      phone: string;
      preferredCity: Customer['preferredCity'];
      preferredLanguage: Customer['preferredLanguage'];
    }) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      const customer: Customer = {
        id: `cust-${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar: data.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        preferredCity: data.preferredCity,
        preferredLanguage: data.preferredLanguage,
        memberSince: new Date().toISOString().split('T')[0] ?? '',
        contactConfidential: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
      setUser(customer);
    },
    [],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<Customer>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
