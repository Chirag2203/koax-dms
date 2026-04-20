'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import type { OwnershipClaim } from '@dms/types';
import { ClaimsTable } from './claims-table';
import { ClaimReviewPanel } from './claim-review-panel';

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipQueueView() {
  const [selectedClaim, setSelectedClaim] = useState<OwnershipClaim | null>(null);

  const claims = useVehiclesStore((s) => s.claims);
  const allClaims = Object.values(claims);
  const pendingClaims = allClaims.filter((c) => c.state === 'PENDING');

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted mb-2">
            <Link href="/vehicles" className="hover:text-ink-primary transition-colors">Vehicles</Link>
            <span aria-hidden="true">›</span>
            <span>Ownership Queue</span>
          </nav>
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            Ownership Queue
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {pendingClaims.length} pending claim{pendingClaims.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
      </div>

      {/* Tabs: Pending / All */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Pending section */}
          {pendingClaims.length > 0 && (
            <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-line">
                <h3 className="text-sm font-semibold text-ink-primary">
                  Pending Review ({pendingClaims.length})
                </h3>
              </div>
              <ClaimsTable claims={pendingClaims} onReview={setSelectedClaim} />
            </div>
          )}

          {/* All claims */}
          <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
            <div className="px-6 py-4 border-b border-line">
              <h3 className="text-sm font-semibold text-ink-primary">
                All Claims ({allClaims.length})
              </h3>
            </div>
            <ClaimsTable claims={allClaims} onReview={setSelectedClaim} />
          </div>
        </div>
      </div>

      {/* Review panel */}
      <ClaimReviewPanel
        open={selectedClaim !== null}
        claim={selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  );
}
