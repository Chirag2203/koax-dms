'use client';

import { useKeyboardShortcuts } from '@/src/hooks/use-keyboard-shortcuts';
import { CustomersStoreHydrator } from '@/src/lib/customers/customers-store-hydrator';
import { VehiclesStoreHydrator } from '@/src/lib/vehicles/vehicles-store-hydrator';
import { StaffStoreHydrator } from '@/src/lib/staff/staff-store-hydrator';
import { CustomBuildsStoreHydrator } from '@/src/lib/custom-builds/custom-builds-store-hydrator';
import { InsuranceStoreHydrator } from '@/src/lib/insurance/insurance-store-hydrator';
import { ServiceStoreHydrator } from '@/src/lib/service/service-store-hydrator';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';
import { NotificationsStoreHydrator } from '@/src/lib/notifications/notifications-store-hydrator';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';
import { ShootsStoreHydrator } from '@/src/lib/shoots/shoots-store-hydrator';
import { ReviewsStoreHydrator } from '@/src/lib/reviews/reviews-store-hydrator';
import { CommandPalette } from './command-palette';
import { StaffSidebar } from './staff-sidebar';
import { StaffTopBar } from './staff-top-bar';
import { MobileBlocker } from './mobile-blocker';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();

  return (
    <>
      {/*
        Below the `lg:` breakpoint (1024px) the staff DMS is unusable —
        keyboard-driven, multi-column dense, pointer-assumed. Show a
        full-screen "switch to laptop" notice instead. Customer-web is
        mobile-friendly; this gate is staff-web only.
      */}
      <MobileBlocker />

      <div className="hidden lg:flex min-h-screen bg-bg-canvas text-ink-primary">
        <StaffSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <StaffTopBar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Global hydrators — all module stores hydrate eagerly so cross-
            module readers (Reports, Finance, etc.) always have fresh data.
            Each hydrator is idempotent (useRef guard) so this is safe to
            combine with module-route layouts that also mount them. Stores
            do not hydrate when the mobile blocker is active (saves work
            on a screen the user can't use). */}
        <CustomersStoreHydrator />
        <VehiclesStoreHydrator />
        <StaffStoreHydrator />
        <CustomBuildsStoreHydrator />
        <InsuranceStoreHydrator />
        <ServiceStoreHydrator />
        <FinanceStoreHydrator />
        <NotificationsStoreHydrator />
        <SettingsStoreHydrator />
        <ShootsStoreHydrator />
        {/* Seam 28: Reviews store hoisted here so Reports hub can read NPS data */}
        <ReviewsStoreHydrator />

        {/* Command palette — portals into document.body */}
        <CommandPalette />
      </div>
    </>
  );
}
