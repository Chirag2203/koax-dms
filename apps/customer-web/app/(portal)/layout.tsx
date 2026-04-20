import { ReactNode } from 'react';
import { AuthGuard } from '@/src/components/portal/auth-guard';
import { PortalNav } from '@/src/components/portal/portal-nav';
import { PortalAuthProvider } from '@/src/providers/portal-auth-provider';
import { PortalVehiclesStoreHydrator } from '@/src/lib/vehicles/vehicles-store-hydrator';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <PortalAuthProvider>
        <PortalVehiclesStoreHydrator />
        <div className="flex min-h-screen bg-bg-paper">
          <PortalNav />
          <main className="flex-1 px-4 py-6 lg:px-10 lg:py-10 pb-24 lg:pb-10 min-w-0">
            {children}
          </main>
        </div>
      </PortalAuthProvider>
    </AuthGuard>
  );
}
