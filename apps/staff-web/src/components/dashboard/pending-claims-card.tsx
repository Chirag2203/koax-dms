/**
 * PendingClaimsCard — admin-dashboard surface for ownership-claim review.
 *
 * Mounts on /dashboard. R09+ only (Gate fallback="hide" — lower roles
 * see no card, no count, no list — per L6).
 *
 * Behavior:
 * - Reads PENDING claims via vehicles-store.selectPendingClaims (state-passing
 *   selector signature).
 * - Outlet-scoping is applied here at the UI per L15:
 *     R09–R10:  filter to claims whose vehicleMaster.firstTouchOutletId
 *               matches the viewer's outlet
 *     R19+:     pan-India (no filter)
 * - Both the count badge AND the list use the same scoped result — no
 *   count/list mismatch (per L15).
 * - Renders 3 most recent + "View all" link to /vehicles/ownership-queue.
 * - Each row: Review button opens existing ClaimReviewPanel (reuses queue UI).
 *
 * Spec: PLAN-VEHICLES-002 §5 + L6 + L15.
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ChevronRight } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { ROLE_RANK } from '@/src/lib/vehicles/state-machine';
import { ClaimReviewPanel } from '@/src/components/vehicles/ownership-queue/claim-review-panel';
import type { OwnershipClaim } from '@dms/types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Roles permitted to view + approve claims (R09 Service Advisor and above) */
const APPROVER_ROLES = ['R09', 'R12', 'R03', 'R19', 'R22', 'R24'] as const;

/** R19+ ranks see pan-India; below see same-outlet only */
const R19_RANK = ROLE_RANK['R19'] ?? 4;

const MAX_ROWS = 3;

// Map staff outlet → outletId used on VehicleMaster.firstTouchOutletId
const STAFF_OUTLET_TO_ID: Record<string, string> = {
  bangalore: 'BLR-01',
  mumbai: 'MUM-01',
  chennai: 'CHE-01',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeFromNow(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function maskedVin(vin: string): string {
  return vin.length > 6 ? `····${vin.slice(-6)}` : vin;
}

// ─── Component ───────────────────────────────────────────────────────────────

function PendingClaimsCardInner() {
  const { user } = useStaffAuth();
  const claims = useVehiclesStore((s) => s.claims);
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const customers = useCustomersStore((s) => s.customers);

  const [reviewClaim, setReviewClaim] = useState<OwnershipClaim | null>(null);

  const viewerRank = ROLE_RANK[user?.role ?? ''] ?? 0;
  const staffOutletId = STAFF_OUTLET_TO_ID[user?.outlet ?? ''];

  // Pull all PENDING claims, then outlet-scope per L15.
  const scopedPending = useMemo(() => {
    const pending = Object.values(claims).filter(
      (c): c is OwnershipClaim => c.state === 'PENDING',
    );
    if (viewerRank >= R19_RANK) return pending; // pan-India
    if (!staffOutletId) return [];
    return pending.filter((c) => {
      const v = vehicles[c.vin];
      return v?.firstTouchOutletId === staffOutletId;
    });
  }, [claims, vehicles, viewerRank, staffOutletId]);

  const sortedRecent = useMemo(() => {
    return [...scopedPending]
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      )
      .slice(0, MAX_ROWS);
  }, [scopedPending]);

  const totalCount = scopedPending.length;

  return (
    <>
      <section
        aria-labelledby="pending-claims-heading"
        className="rounded-md border border-line bg-bg-surface"
      >
        {/* Header */}
        <header className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <h3
              id="pending-claims-heading"
              className="text-[13px] font-semibold text-ink-primary"
            >
              Pending Ownership Claims
            </h3>
            {totalCount > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5',
                  'rounded-full bg-[rgb(var(--state-overdue)/0.15)] text-[rgb(var(--state-overdue))]',
                  'font-mono text-[11px] font-medium tabular-nums',
                )}
                aria-label={`${totalCount} pending claims`}
              >
                {totalCount}
              </span>
            )}
          </div>
          <Link
            href="/vehicles/ownership-queue"
            className="text-[12px] text-accent hover:underline"
          >
            View all →
          </Link>
        </header>

        {/* Body */}
        <div className="p-2">
          {totalCount === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-ink-muted">
              No pending claims.
            </p>
          ) : (
            <ul className="flex flex-col gap-1" role="list">
              {sortedRecent.map((claim) => {
                const claimant = customers[claim.claimantCustomerId];
                const vehicle = vehicles[claim.vin];
                return (
                  <li
                    key={claim.id}
                    className={cn(
                      'flex items-center justify-between gap-3 px-2 py-2 rounded',
                      'hover:bg-bg-subtle transition-colors',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink-primary truncate">
                        {claimant?.name ?? claim.claimantCustomerId}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted">
                        <span className="font-mono">{maskedVin(claim.vin)}</span>
                        <span>·</span>
                        <span>{relativeFromNow(claim.submittedAt)}</span>
                        {claim.autoMatchHit && (
                          <>
                            <span>·</span>
                            <span className="text-[rgb(var(--state-listed))]">
                              auto-match
                            </span>
                          </>
                        )}
                        {!vehicle && (
                          <>
                            <span>·</span>
                            <span className="text-[rgb(var(--state-overdue))]">
                              vehicle missing
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewClaim(claim)}
                      className={cn(
                        'inline-flex items-center gap-1 h-8 px-3 rounded',
                        'text-[12px] font-medium text-accent',
                        'hover:bg-accent/10 transition-colors shrink-0',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      )}
                    >
                      Review
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Reuse the canonical review panel from /vehicles/ownership-queue */}
      <ClaimReviewPanel
        open={reviewClaim !== null}
        claim={reviewClaim}
        onClose={() => setReviewClaim(null)}
      />
    </>
  );
}

export function PendingClaimsCard() {
  // Hide entirely for roles below R09 — fallback="hide" keeps R05/R10/R13
  // unaware that the queue exists per L6.
  return (
    <Gate role={[...APPROVER_ROLES]} fallback="hide">
      <PendingClaimsCardInner />
    </Gate>
  );
}
