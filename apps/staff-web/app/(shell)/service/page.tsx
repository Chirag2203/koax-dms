'use client';

import { Suspense } from 'react';
import { ServiceLandingView } from '@/src/components/service/service-landing-view';

// Suspense boundary is required because ServiceLandingView uses useSearchParams()
export default function ServicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-bg-canvas px-6 py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      }
    >
      <ServiceLandingView />
    </Suspense>
  );
}
