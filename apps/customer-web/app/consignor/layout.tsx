import { ReactNode } from 'react';
import { AuthGuard } from '@/src/components/portal/auth-guard';
import { ConsignorNav } from '@/src/components/consignor/consignor-nav';

export default function ConsignorLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-bg-paper">
        <ConsignorNav />
        <main className="flex-1 px-4 py-6 lg:px-10 lg:py-10 pb-24 lg:pb-10 min-w-0">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
