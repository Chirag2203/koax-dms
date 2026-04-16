'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/providers/auth-provider';
import { PortalSkeleton } from '@/src/components/portal/portal-skeleton';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <PortalSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
